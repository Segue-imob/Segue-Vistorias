import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FOTOS_BUCKET, ITENS_PADRAO } from '../lib/vistoriaExecucao'

/**
 * Carrega uma vistoria (com dados do imóvel) e o checklist em 2 níveis
 * (ambientes -> itens -> fotos), e expõe as operações usadas pela tela
 * de Execução de Vistoria do Vistoriador.
 *
 * Todas as consultas usam select('*') em vez de listar colunas — isso
 * evita que o carregamento quebre quando o banco tem colunas a mais/a
 * menos do que o código espera (ex.: uma tabela criada manualmente
 * com um script à parte). Ambientes, itens e fotos são buscados em
 * 3 consultas separadas (não um único select aninhado) e remontados em
 * memória: se `vistoria_fotos` ainda não existir no seu banco, por
 * exemplo, o checklist de ambientes/itens continua funcionando —
 * só fica sem fotos até a tabela ser criada, em vez de travar a
 * página inteira.
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
    const vid = String(vistoriaId).trim()

    // 1) A vistoria em si (com o imóvel embutido) — se isso falhar, não
    // há como montar a tela, então interrompe aqui.
    const { data: vistoriaData, error: vErr } = await supabase
      .from('vistorias')
      .select(
        `
        *,
        imoveis:imovel_id ( id, codigo_imovel, endereco, bairro, cidade, inquilino_nome, proprietario_nome )
      `
      )
      .eq('id', vid)
      .maybeSingle()

    setVistoria(vistoriaData || null)

    if (vErr || !vistoriaData) {
      setError(vErr || null)
      setAmbientes([])
      setLoading(false)
      return
    }

    // 2) Ambientes desta vistoria.
    const { data: ambientesData, error: aErr } = await supabase
      .from('vistoria_ambientes')
      .select('*')
      .eq('vistoria_id', vid)
      .order('created_at', { ascending: true })

    if (aErr) {
      setError(aErr)
      setAmbientes([])
      setLoading(false)
      return
    }

    const ambienteIds = (ambientesData || []).map((a) => a.id)

    // 3) Itens de todos os ambientes de uma vez — melhor esforço: se a
    // tabela/coluna ainda não existir, os ambientes continuam
    // aparecendo (só sem os itens) em vez de travar a página.
    let itensData = []
    if (ambienteIds.length > 0) {
      const { data, error: iErr } = await supabase
        .from('vistoria_itens')
        .select('*')
        .in('ambiente_id', ambienteIds)
        .order('created_at', { ascending: true })
      if (iErr) {
        console.warn('[useVistoriaExecucao] Não foi possível carregar itens:', iErr.message)
      } else {
        itensData = data || []
      }
    }

    const itemIds = itensData.map((it) => it.id)

    // 4) Fotos de todos os itens — mesmo tratamento de melhor esforço.
    let fotosData = []
    if (itemIds.length > 0) {
      const { data, error: fErr } = await supabase.from('vistoria_fotos').select('*').in('item_id', itemIds)
      if (fErr) {
        console.warn(
          '[useVistoriaExecucao] Não foi possível carregar fotos (a tabela vistoria_fotos existe?):',
          fErr.message
        )
      } else {
        fotosData = data || []
      }
    }

    // Remonta a árvore ambiente -> itens -> fotos em memória.
    const montado = (ambientesData || []).map((amb) => ({
      ...amb,
      vistoria_itens: itensData
        .filter((it) => it.ambiente_id === amb.id)
        .map((it) => ({
          ...it,
          vistoria_fotos: fotosData.filter((f) => f.item_id === it.id)
        }))
    }))

    setAmbientes(montado)
    setError(null)
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
   * 1) Insere o ambiente em `vistoria_ambientes`, vinculado ao
   * vistoria_id. 2) Assim que criado, insere automaticamente os 12
   * itens padrão em `vistoria_itens` (estado começa null = "não
   * avaliado"), o que já deixa o card do Nível 1 mostrando "0/12
   * itens avaliados" antes mesmo de entrar no ambiente.
   */
  const addAmbiente = useCallback(
    async (nome) => {
      const { data: ambienteRow, error: ambErr } = await supabase
        .from('vistoria_ambientes')
        .insert({ vistoria_id: vistoriaId, ambiente: nome })
        .select('*')
        .single()
      if (ambErr) throw ambErr

      const linhasItens = ITENS_PADRAO.map((item) => ({ ambiente_id: ambienteRow.id, item, estado: null }))
      const { data: itensData, error: itensErr } = await supabase
        .from('vistoria_itens')
        .insert(linhasItens)
        .select('*')
      if (itensErr) throw itensErr

      const novoAmbiente = {
        ...ambienteRow,
        vistoria_itens: (itensData || []).map((it) => ({ ...it, vistoria_fotos: [] }))
      }
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

  /** "+ Adicionar Outro Item" ("Outros"): cria um item personalizado no ambiente. */
  const addItemCustom = useCallback(async (ambienteId, nomeItem) => {
    const { data, error } = await supabase
      .from('vistoria_itens')
      .insert({ ambiente_id: ambienteId, item: nomeItem, estado: null })
      .select('*')
      .single()
    if (error) throw error
    const novoItem = { ...data, vistoria_fotos: [] }
    setAmbientes((prev) =>
      prev.map((a) => (a.id === ambienteId ? { ...a, vistoria_itens: [...(a.vistoria_itens || []), novoItem] } : a))
    )
    return novoItem
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

  // Faz merge (não substitui) — assim os campos que não vieram na
  // resposta do UPDATE (ex.: vistoria_fotos, que não é mais buscada
  // via embed) continuam preservados no item local.
  const patchItem = useCallback((ambienteId, itemId, patch) => {
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambienteId
          ? { ...a, vistoria_itens: (a.vistoria_itens || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
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
        .select('*')
        .single()
      if (error) throw error
      patchItem(ambienteId, itemId, data)
    },
    [patchItem]
  )

  const updateItemObservacao = useCallback(
    async (ambienteId, itemId, observacao) => {
      const { data, error } = await supabase
        .from('vistoria_itens')
        .update({ observacao })
        .eq('id', itemId)
        .select('*')
        .single()
      if (error) throw error
      patchItem(ambienteId, itemId, data)
    },
    [patchItem]
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
