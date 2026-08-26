import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subscribeToTable } from '../lib/realtimeChannel'
import { isAdmin, isVistoriador } from '../lib/permissions'

export function useProfiles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, telefone, role, ativo, created_at')
      .order('nome', { ascending: true })

    if (error) {
      setError(error)
    } else {
      setProfiles(data || [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfiles()

    // Ouve o canal Realtime único e compartilhado (src/lib/realtimeChannel.js)
    // em vez de criar um novo canal por instância do hook — evita o erro
    // "cannot add postgres_changes callbacks ... after subscribe()" quando
    // useProfiles() é usado em mais de um componente montado ao mesmo tempo.
    const unsubscribe = subscribeToTable('profiles', () => {
      fetchProfiles()
    })

    return unsubscribe
  }, [fetchProfiles])

  // Podem ser selecionados como "vistoriador responsável" ao agendar:
  // usuários ativos com role Vistoriador ou Administrador.
  const vistoriadores = profiles.filter((p) => p.ativo && (isVistoriador(p.role) || isAdmin(p.role)))

  const updateProfile = useCallback(async (id, payload) => {
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', id).select()
    if (error) throw error
    return data
  }, [])

  const toggleAtivo = useCallback(
    async (id, ativo) => {
      return updateProfile(id, { ativo })
    },
    [updateProfile]
  )

  /**
   * Cadastro completo de usuário: cria o registro em Supabase Auth
   * (com senha) e a linha correspondente em `profiles`, via Edge
   * Function (admin-create-user) — roda no servidor com a
   * service_role key, sem derrubar a sessão do Administrador logado
   * e sem expor essa chave no navegador.
   */
  const createUserWithAuth = useCallback(async (payload) => {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        nome: payload.nome,
        email: payload.email,
        telefone: payload.telefone || null,
        role: payload.role,
        ativo: payload.ativo,
        password: payload.password
      }
    })

    if (error) throw new Error(await extractFunctionError(error))
    if (data?.error) throw new Error(data.error)
    return data
  }, [])

  /**
   * Redefine a senha de um usuário existente, via Edge Function
   * (admin-reset-password) — mesma lógica de segurança acima.
   */
  const resetUserPassword = useCallback(async (userId, password) => {
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId, password }
    })

    if (error) throw new Error(await extractFunctionError(error))
    if (data?.error) throw new Error(data.error)
    return data
  }, [])

  return {
    profiles,
    vistoriadores,
    loading,
    error,
    refetch: fetchProfiles,
    createUserWithAuth,
    updateProfile,
    resetUserPassword,
    toggleAtivo
  }
}

/**
 * supabase-js expõe o corpo JSON de erro das Edge Functions em
 * `error.context` (a Response bruta) em vez de `error.message` — essa
 * função tenta ler a mensagem específica que a function retornou
 * (ex.: "Este e-mail já está cadastrado.") e cai para uma mensagem
 * genérica se não conseguir.
 */
async function extractFunctionError(error) {
  try {
    const body = await error.context?.json()
    if (body?.error) return body.error
  } catch {
    // corpo não era JSON — usa a mensagem padrão abaixo
  }
  return error.message || 'Erro ao comunicar com o servidor.'
}
