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

  const createProfile = useCallback(async (payload) => {
    const { data, error } = await supabase.from('profiles').insert(payload).select()
    if (error) throw error
    return data
  }, [])

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

  return {
    profiles,
    vistoriadores,
    loading,
    error,
    refetch: fetchProfiles,
    createProfile,
    updateProfile,
    toggleAtivo
  }
}
