import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfiles()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProfiles])

  // Vistoriadores = usuários ativos com role "Vistoriador" (usado nos filtros/agenda)
  const vistoriadores = profiles.filter((p) => p.role === 'Vistoriador' && p.ativo)

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
