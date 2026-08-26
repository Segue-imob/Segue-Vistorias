import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subscribeToTable } from '../lib/realtimeChannel'

// Hook central de vistorias. Faz join com `imoveis` e `profiles` (vistoriador)
// e mantém a lista sincronizada via Supabase Realtime.
// Passe { vistoriadorId } para restringir a consulta às vistorias de um
// vistoriador específico (usado na tela "Minhas Vistorias").
export function useVistorias({ vistoriadorId } = {}) {
  const [vistorias, setVistorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchVistorias = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('vistorias')
      .select(
        `
        id,
        tipo,
        status,
        data_agendamento,
        observacoes,
        imovel_id,
        vistoriador_id,
        imoveis:imovel_id ( id, codigo_imovel, endereco, bairro, cidade, inquilino_nome, proprietario_nome ),
        vistoriador:vistoriador_id ( id, nome, email )
      `
      )
      .order('data_agendamento', { ascending: true })

    if (vistoriadorId) {
      query = query.eq('vistoriador_id', vistoriadorId)
    }

    const { data, error } = await query

    if (error) {
      setError(error)
    } else {
      setVistorias(data || [])
      setError(null)
    }
    setLoading(false)
  }, [vistoriadorId])

  useEffect(() => {
    fetchVistorias()

    // Ouve o canal Realtime único e compartilhado (src/lib/realtimeChannel.js)
    // em vez de criar um novo canal por instância do hook.
    const unsubscribe = subscribeToTable('vistorias', () => {
      fetchVistorias()
    })

    return unsubscribe
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
