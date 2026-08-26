import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AMBIENTE_SELECT = `
  id,
  ambiente,
  observacao,
  created_at,
  vistoria_itens ( id, item, estado ),
  vistoria_fotos ( id, url )
`

/**
 * Carrega uma vistoria (com dados do imóvel) e o checklist completo
 * (ambientes -> itens + fotos), e expõe as operações usadas pela tela
 * de Execução de Vistoria do Vistoriador.
 */
export function useVistoriaExecucao(vistoriaId) {
  const [vistoria, setVistoria] = useState(null)
  const [ambientes, setAmbientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!vistoriaId) {
      setVistoria(null)
      setAmbientes([])
      setError(new Error('ID da vistoria ausente na URL.'))
      setLoading(false)
      return
    }
    setLoading(true)

    // .maybeSingle() em vez de .single(): 0 linhas vira { data: null, error: null }
    // em vez de lançar um erro genérico — assim dá pra distinguir "vistoria
    // realmente não existe / RLS bloqueou" (data null, sem error) de um erro
    // de verdade (rede, sintaxe da query etc.), e mostrar a mensagem certa.
    const [{ data: vistoriaData, error: vErr }, { data: ambientesData, error: aErr }] = await Promise.all([
      supabase
        .from('vistorias')
        .select(
          `
          id, tipo, status, data_agendamento, observacoes, imovel_id, vistoriador_id,
          assinatura_url, finalizada_em,
          imoveis:imovel_id ( id, codigo_imovel, endereco, bairro, cidade, inquilino_nome, proprietario_nome )
        `
        )
        .eq('id', String(vistoriaId).trim())
        .maybeSingle(),
      supabase
        .from('vistoria_ambientes')
        .select(AMBIENTE_SELECT)
        .eq('vistoria_id', String(vistoriaId).trim())
        .order('created_at', { ascending: true })
    ])

    setError(vErr || aErr || null)
    setVistoria(vistoriaData || null)
    setAmbientes(aErr ? [] : ambientesData || [])
    setLoading(false)
  }, [vistoriaId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const addAmbiente = useCallback(
    async (nome) => {
      const { data, error } = await supabase
        .from('vistoria_ambientes')
        .insert({ vistoria_id: vistoriaId, ambiente: nome, observacao: '' })
        .select(AMBIENTE_SELECT)
        .single()
      if (error) throw error
      setAmbientes((prev) => [...prev, data])
      return data
    },
    [vistoriaId]
  )

  const removeAmbiente = useCallback(async (ambienteId) => {
    const { error } = await supabase.from('vistoria_ambientes').delete().eq('id', ambienteId)
    if (error) throw error
    setAmbientes((prev) => prev.filter((a) => a.id !== ambienteId))
  }, [])

  const updateObservacao = useCallback(async (ambienteId, observacao) => {
    const { error } = await supabase.from('vistoria_ambientes').update({ observacao }).eq('id', ambienteId)
    if (error) throw error
    setAmbientes((prev) => prev.map((a) => (a.id === ambienteId ? { ...a, observacao } : a)))
  }, [])

  const setItemEstado = useCallback(async (ambienteId, item, estado) => {
    const { data, error } = await supabase
      .from('vistoria_itens')
      .upsert({ ambiente_id: ambienteId, item, estado }, { onConflict: 'ambiente_id,item' })
      .select()
      .single()
    if (error) throw error
    setAmbientes((prev) =>
      prev.map((a) => {
        if (a.id !== ambienteId) return a
        const outros = (a.vistoria_itens || []).filter((it) => it.item !== item)
        return { ...a, vistoria_itens: [...outros, data] }
      })
    )
  }, [])

  const addFoto = useCallback(
    async (ambienteId, file) => {
      const path = `${vistoriaId}/${ambienteId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('vistoria-fotos').upload(path, file)
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('vistoria-fotos').getPublicUrl(path)

      const { data, error } = await supabase
        .from('vistoria_fotos')
        .insert({ ambiente_id: ambienteId, url: pub.publicUrl })
        .select()
        .single()
      if (error) throw error

      setAmbientes((prev) =>
        prev.map((a) =>
          a.id === ambienteId ? { ...a, vistoria_fotos: [...(a.vistoria_fotos || []), data] } : a
        )
      )
      return data
    },
    [vistoriaId]
  )

  const removeFoto = useCallback(async (ambienteId, fotoId) => {
    const { error } = await supabase.from('vistoria_fotos').delete().eq('id', fotoId)
    if (error) throw error
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambienteId
          ? { ...a, vistoria_fotos: (a.vistoria_fotos || []).filter((f) => f.id !== fotoId) }
          : a
      )
    )
  }, [])

  const aceitarVistoria = useCallback(async () => {
    const { error } = await supabase.from('vistorias').update({ status: 'aceita' }).eq('id', vistoriaId)
    if (error) throw error
    setVistoria((v) => (v ? { ...v, status: 'aceita' } : v))
  }, [vistoriaId])

  /** Envia a assinatura (Blob PNG) para o Storage e finaliza a vistoria. */
  const finalizarVistoria = useCallback(
    async (assinaturaBlob) => {
      const path = `${vistoriaId}/assinatura/${Date.now()}.png`
      const { error: upErr } = await supabase.storage
        .from('vistoria-fotos')
        .upload(path, assinaturaBlob, { contentType: 'image/png' })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('vistoria-fotos').getPublicUrl(path)

      const { error } = await supabase
        .from('vistorias')
        .update({
          status: 'finalizada',
          assinatura_url: pub.publicUrl,
          finalizada_em: new Date().toISOString()
        })
        .eq('id', vistoriaId)
      if (error) throw error

      setVistoria((v) =>
        v ? { ...v, status: 'finalizada', assinatura_url: pub.publicUrl } : v
      )
    },
    [vistoriaId]
  )

  return {
    vistoria,
    ambientes,
    loading,
    error,
    refetch: fetchAll,
    addAmbiente,
    removeAmbiente,
    updateObservacao,
    setItemEstado,
    addFoto,
    removeFoto,
    aceitarVistoria,
    finalizarVistoria
  }
}
