import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FOTOS_BUCKET, ITENS_PADRAO } from '../lib/vistoriaExecucao'

// Ambiente -> itens -> fotos de cada item. Observação e fotos vivem no
// ITEM (não mais no ambiente) — cada linha de `vistoria_itens` é criada
// de verdade assim que o ambiente é adicionado (estado começa null,
// "não avaliado ainda"), o que permite mostrar "0/12 itens avaliados"
// no card antes mesmo de entrar no ambiente.
const AMBIENTE_SELECT = `
  id,
  ambiente,
  created_at,
  vistoria_itens (
    id, item, estado, observacao, created_at,
    vistoria_fotos ( id, url )
  )
`
const ITEM_SELECT = `id, item, estado, observacao, created_at, vistoria_fotos ( id, url )`

/**
 * Carrega uma vistoria (com dados do imóvel) e o checklist em 2 níveis
 * (ambientes -> itens -> fotos), e expõe as operações usadas pela tela
 * de Execução de Vistoria do Vistoriador.
 */
export function useVistoriaExecucao(vistoriaId) {
  const [vistoria, setVistoria] = useState(null)
  const [ambientes, setAmbientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const primeiroCarregamento = useRef(true)

  const fetchAll = useCallback(async () => {
    if (!vistoriaId) {
      setVistoria(null)
      setAmbientes([])
      setError(new Error('ID da vistoria ausente na URL.'))
      setLoading(false)
      return
    }
    setLoading(true)

    // select('*') na vistoria: evita quebrar a página se uma coluna
    // opcional (assinatura_url, finalizada_em, laudo_preenchido, ...)
    // ainda não existir ou não tiver sido recarregada no cache do
    // PostgREST — traz o que existir de fato na tabela.
    const [{ data: vistoriaData, error: vErr }, { data: ambientesData, error: aErr }] = await Promise.all([
      supabase
        .from('vistorias')
        .select(
          `
          *,
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
    primeiroCarregamento.current = true
  }, [vistoriaId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Sincroniza uma cópia da estrutura completa (ambientes -> itens ->
  // fotos) em `vistorias.laudo_preenchido` a cada alteração — não
  // bloqueia a UI nem lança erro: é um "melhor esforço" para permitir
  // consultar/exportar o laudo direto da coluna sem recompor os joins.
  useEffect(() => {
    if (!vistoriaId || loading) return
    if (primeiroCarregamento.current) {
      // Não regrava no exato momento em que os dados acabaram de vir
      // do fetch inicial — só a partir da primeira mudança de verdade.
      primeiroCarregamento.current = false
      return
    }
    supabase
      .from('vistorias')
      .update({ laudo_preenchido: JSON.stringify(ambientes) })
      .eq('id', vistoriaId)
      .then(({ error: laudoErr }) => {
        if (laudoErr) {
          console.warn('[useVistoriaExecucao] Falha ao sincronizar laudo_preenchido:', laudoErr.message)
        }
      })
  }, [ambientes, vistoriaId, loading])

  /**
   * Cria o ambiente E já carrega os itens padrão (ITENS_PADRAO) como
   * linhas reais na tabela, com estado null ("não avaliado"). É isso
   * que permite o card do Nível 1 já nascer mostrando "0/12 itens
   * avaliados" assim que o ambiente é adicionado.
   */
  const addAmbiente = useCallback(
    async (nome) => {
      const { data: ambienteRow, error: ambErr } = await supabase
        .from('vistoria_ambientes')
        .insert({ vistoria_id: vistoriaId, ambiente: nome })
        .select('id, ambiente, created_at')
        .single()
      if (ambErr) throw ambErr

      const linhasItens = ITENS_PADRAO.map((item) => ({ ambiente_id: ambienteRow.id, item, estado: null }))
      const { data: itensData, error: itensErr } = await supabase
        .from('vistoria_itens')
        .insert(linhasItens)
        .select(ITEM_SELECT)
      if (itensErr) throw itensErr

      const novoAmbiente = { ...ambienteRow, vistoria_itens: itensData || [] }
      setAmbientes((prev) => [...prev, novoAmbiente])
      return novoAmbiente
    },
    [vistoriaId]
  )

  const removeAmbiente = useCallback(async (ambienteId) => {
    const { error } = await supabase.from('vistoria_ambientes').delete().eq('id', ambienteId)
    if (error) throw error
    setAmbientes((prev) => prev.filter((a) => a.id !== ambienteId))
  }, [])

  /** "+ Adicionar Outro Item": cria um item personalizado no ambiente. */
  const addItemCustom = useCallback(async (ambienteId, nomeItem) => {
    const { data, error } = await supabase
      .from('vistoria_itens')
      .insert({ ambiente_id: ambienteId, item: nomeItem, estado: null })
      .select(ITEM_SELECT)
      .single()
    if (error) throw error
    setAmbientes((prev) =>
      prev.map((a) => (a.id === ambienteId ? { ...a, vistoria_itens: [...(a.vistoria_itens || []), data] } : a))
    )
    return data
  }, [])

  const removeItem = useCallback(async (ambienteId, itemId) => {
    const { error } = await supabase.from('vistoria_itens').delete().eq('id', itemId)
    if (error) throw error
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambienteId
          ? { ...a, vistoria_itens: (a.vistoria_itens || []).filter((it) => it.id !== itemId) }
          : a
      )
    )
  }, [])

  const updateItem = useCallback((ambienteId, itemId, updated) => {
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambienteId
          ? { ...a, vistoria_itens: (a.vistoria_itens || []).map((it) => (it.id === itemId ? updated : it)) }
          : a
      )
    )
  }, [])

  const setItemEstado = useCallback(
    async (ambienteId, itemId, estado) => {
      const { data, error } = await supabase
        .from('vistoria_itens')
        .update({ estado })
        .eq('id', itemId)
        .select(ITEM_SELECT)
        .single()
      if (error) throw error
      updateItem(ambienteId, itemId, data)
    },
    [updateItem]
  )

  const updateItemObservacao = useCallback(
    async (ambienteId, itemId, observacao) => {
      const { data, error } = await supabase
        .from('vistoria_itens')
        .update({ observacao })
        .eq('id', itemId)
        .select(ITEM_SELECT)
        .single()
      if (error) throw error
      updateItem(ambienteId, itemId, data)
    },
    [updateItem]
  )

  const addFotoItem = useCallback(
    async (ambienteId, itemId, file) => {
      const path = `${vistoriaId}/${ambienteId}/${itemId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file)
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)

      const { data, error } = await supabase
        .from('vistoria_fotos')
        .insert({ ambiente_id: ambienteId, item_id: itemId, url: pub.publicUrl })
        .select()
        .single()
      if (error) throw error

      setAmbientes((prev) =>
        prev.map((a) =>
          a.id === ambienteId
            ? {
                ...a,
                vistoria_itens: (a.vistoria_itens || []).map((it) =>
                  it.id === itemId ? { ...it, vistoria_fotos: [...(it.vistoria_fotos || []), data] } : it
                )
              }
            : a
        )
      )
      return data
    },
    [vistoriaId]
  )

  const removeFotoItem = useCallback(async (ambienteId, itemId, fotoId) => {
    const { error } = await supabase.from('vistoria_fotos').delete().eq('id', fotoId)
    if (error) throw error
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambienteId
          ? {
              ...a,
              vistoria_itens: (a.vistoria_itens || []).map((it) =>
                it.id === itemId
                  ? { ...it, vistoria_fotos: (it.vistoria_fotos || []).filter((f) => f.id !== fotoId) }
                  : it
              )
            }
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
        .from(FOTOS_BUCKET)
        .upload(path, assinaturaBlob, { contentType: 'image/png' })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)

      const { error } = await supabase
        .from('vistorias')
        .update({
          status: 'finalizada',
          assinatura_url: pub.publicUrl,
          finalizada_em: new Date().toISOString(),
          laudo_preenchido: JSON.stringify(ambientes)
        })
        .eq('id', vistoriaId)
      if (error) throw error

      setVistoria((v) => (v ? { ...v, status: 'finalizada', assinatura_url: pub.publicUrl } : v))
    },
    [vistoriaId, ambientes]
  )

  return {
    vistoria,
    ambientes,
    loading,
    error,
    refetch: fetchAll,
    addAmbiente,
    removeAmbiente,
    addItemCustom,
    removeItem,
    setItemEstado,
    updateItemObservacao,
    addFotoItem,
    removeFotoItem,
    aceitarVistoria,
    finalizarVistoria
  }
}
