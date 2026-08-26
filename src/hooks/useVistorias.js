import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Hook central de vistorias. Faz join com `imoveis` e `profiles` (vistoriador)
// e mantém a lista sincronizada via Supabase Realtime.
export function useVistorias() {
  const [vistorias, setVistorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchVistorias = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vistorias')
      .select(
        `
        id,
        tipo,
        status,
        data_hora,
        observacoes,
        created_at,
        imovel_id,
        vistoriador_id,
        imoveis:imovel_id ( id, codigo, endereco, inquilino, proprietario ),
        vistoriador:vistoriador_id ( id, nome, email )
      `
      )
      .order('data_hora', { ascending: true })

    if (error) {
      setError(error)
    } else {
      setVistorias(data || [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVistorias()

    // Realtime: qualquer INSERT/UPDATE/DELETE na tabela reflete no estado
    const channel = supabase
      .channel('vistorias-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vistorias' },
        () => {
          fetchVistorias()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchVistorias])

  const createVistoria = useCallback(async (payload) => {
    const { data, error } = await supabase.from('vistorias').insert(payload).select()
    if (error) throw error
    return data
  }, [])

  const updateVistoria = useCallback(async (id, payload) => {
    const { data, error } = await supabase.from('vistorias').update(payload).eq('id', id).select()
    if (error) throw error
    return data
  }, [])

  const updateStatus = useCallback(async (id, status) => {
    const { data, error } = await supabase
      .from('vistorias')
      .update({ status })
      .eq('id', id)
      .select()
    if (error) throw error
    return data
  }, [])

  const deleteVistoria = useCallback(async (id) => {
    // Regra de negócio: "deletar" = mover para status cancelada,
    // preservando o histórico (compatível com o card vermelho "Cancelada").
    const { error } = await supabase.from('vistorias').update({ status: 'cancelada' }).eq('id', id)
    if (error) throw error
  }, [])

  return {
    vistorias,
    loading,
    error,
    refetch: fetchVistorias,
    createVistoria,
    updateVistoria,
    updateStatus,
    deleteVistoria
  }
}
