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
   * Cadastro completo de usuário — SEM Edge Function: cria a conta em
   * Supabase Auth via `auth.signUp()` (client-side) e a linha
   * correspondente em `profiles` na sequência.
   *
   * Cuidados que isso exige (documentados aqui porque não são óbvios):
   *
   * 1) `signUp()` chamado com uma sessão já ativa no navegador TROCA a
   *    sessão atual para a do usuário recém-criado. Para o Administrador
   *    não ser deslogado no meio do cadastro, guardamos a sessão dele
   *    ANTES de chamar signUp() e a restauramos com `setSession()` logo
   *    depois — antes até de gravar o `profiles`, já que a policy de
   *    INSERT em profiles exige que quem está logado no momento seja
   *    Administrador.
   * 2) Se a confirmação de e-mail estiver ligada no projeto (Authentication
   *    > Providers > Email > "Confirm email"), o usuário criado não
   *    consegue logar até clicar no link de confirmação — o client-side
   *    signUp() não tem o equivalente do `email_confirm: true` da API
   *    admin. Desligue essa opção no Supabase se quiser que contas
   *    criadas pelo Administrador já entrem direto.
   * 3) Fallback: se o signUp() falhar por qualquer motivo que não seja
   *    e-mail duplicado (ex.: problema de sessão), salvamos mesmo assim
   *    o perfil em `profiles` com um UUID gerado localmente
   *    (`crypto.randomUUID()`), para o Administrador não perder os dados
   *    já digitados. Esse fallback NÃO cria login em Auth — a pessoa só
   *    consegue entrar depois que alguém criar a conta dela em
   *    Authentication > Users usando esse mesmo UUID como ID.
   */
  const createUserWithAuth = useCallback(async (payload) => {
    const {
      data: { session: adminSession }
    } = await supabase.auth.getSession()

    const restoreAdminSession = async () => {
      if (!adminSession) return
      try {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token
        })
      } catch {
        // Melhor esforço: se a restauração falhar, o erro principal do
        // cadastro (lançado logo abaixo) já avisa o Administrador.
      }
    }

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password
      })

      if (signUpError) throw signUpError

      const newUserId = signUpData?.user?.id
      if (!newUserId) throw new Error('Não foi possível obter o ID do novo usuário.')

      // Restaura a sessão do Administrador ANTES de gravar o profile,
      // pois a policy de INSERT em `profiles` exige role Administrador
      // na sessão ativa no momento da chamada.
      await restoreAdminSession()

      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: newUserId,
        nome: payload.nome,
        email: payload.email,
        telefone: payload.telefone || null,
        role: payload.role,
        ativo: payload.ativo
      })
      if (profileErr) throw profileErr

      return { id: newUserId, authCreated: true }
    } catch (err) {
      await restoreAdminSession()

      const msg = (err.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        throw new Error('Este e-mail já está cadastrado.')
      }

      // Fallback do item 3: salva só o perfil, com UUID próprio, sem
      // conta de Auth vinculada.
      const fallbackId = crypto.randomUUID()
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: fallbackId,
        nome: payload.nome,
        email: payload.email,
        telefone: payload.telefone || null,
        role: payload.role,
        ativo: payload.ativo
      })

      if (profileErr) {
        throw new Error(profileErr.message || err.message || 'Erro ao cadastrar usuário.')
      }

      return { id: fallbackId, authCreated: false }
    }
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
