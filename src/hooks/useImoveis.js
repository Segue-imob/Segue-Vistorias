import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subscribeToTable } from '../lib/realtimeChannel'

export function useImoveis() {
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchImoveis = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('imoveis')
      .select(
        'id, codigo_imovel, cep, endereco, numero, bairro, cidade, destinacao, tipo_imovel, proprietario_nome, inquilino_nome'
      )
      .order('codigo_imovel', { ascending: true })

    if (!error) setImoveis(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchImoveis()

    // Ouve o canal Realtime único e compartilhado (src/lib/realtimeChannel.js)
    const unsubscribe = subscribeToTable('imoveis', () => {
      fetchImoveis()
    })

    return unsubscribe
  }, [fetchImoveis])

  const createImovel = useCallback(async (payload) => {
    const { data, error } = await supabase.from('imoveis').insert(payload).select()
    if (error) throw error
    await fetchImoveis()
    return data
  }, [fetchImoveis])

  return { imoveis, loading, refetch: fetchImoveis, createImovel }
}
