import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useImoveis() {
  const [imoveis, setImoveis] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchImoveis = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('imoveis')
      .select('id, codigo, endereco, inquilino, proprietario')
      .order('codigo', { ascending: true })

    if (!error) setImoveis(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchImoveis()
  }, [fetchImoveis])

  const createImovel = useCallback(async (payload) => {
    const { data, error } = await supabase.from('imoveis').insert(payload).select()
    if (error) throw error
    await fetchImoveis()
    return data
  }, [fetchImoveis])

  return { imoveis, loading, refetch: fetchImoveis, createImovel }
}
