import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FOTOS_BUCKET, ITENS_PADRAO } from '../lib/vistoriaExecucao'

// IDs "locais" (fallback): usados quando o INSERT no Supabase falha em
// campo (sem conexão, coluna divergente, etc.) e ainda assim
// precisamos manter o vistoriador trabalhando. Nunca são UUIDs reais,
// então qualquer operação subsequente sobre eles (mudar estado,
// observação, apagar) fica só em memória — não há linha no banco
// pra atualizar.
function buildLocalId(prefix) {
  return `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
function isLocalId(id) {
  return typeof id === 'string' && id.startsWith('local-')
}

/**
 * Insere em `table` e, se o Supabase retornar erro, registra a
 * mensagem EXATA no console e devolve uma linha "local" construída
 * por `buildFallback()` em vez de lançar — a interface continua
 * funcional e o vistoriador não trava em campo. `persisted: false`
 * sinaliza pro chamador (e pra UI) que aquela linha não foi
 * confirmada no banco.
 */
async function insertResiliente(table, payload, buildFallback) {
  const { data, error } = await supabase.from(table).insert(payload).select('*').single()
  if (error) {
    console.error(`[useVistoriaExecucao] Erro do Supabase ao inserir em "${table}":`, error.message, error)
    return { row: { ...buildFallback(), _naoSincronizado: true }, persisted: false }
  }
  return { row: data, persisted: true }
}

/**
 * Carrega uma vistoria (com dados do imóvel) e o checklist em 2 níveis
 * (ambientes -> itens -> fotos), e expõe as operações usadas pela tela
 * de Execução de Vistoria do Vistoriador.
 *
 * Todas as consultas usam select('*') em vez de listar colunas — isso
 * evita que o carregamento quebre quando o banco tem colunas a mais/a
 * menos do que o código espera. Ambientes, itens e fotos são buscados
 * em 3 consultas separadas e remontados em memória: se uma tabela
 * ainda não existir, o resto do checklist continua funcionando.
 *
 * Gravações (`insert`) de ambiente e de item enviam o nome em DUAS
 * colunas possíveis (`nome`+`ambiente` / `nome`+`item`) e o estado em
 * duas colunas possíveis (`estado`+`status`), para tolerar variações
 * de schema entre projetos Supabase configurados de formas diferentes.
 * Se mesmo assim o INSERT falhar, a linha aparece na tela como
 * "não sincronizado" em vez de travar a operação — mas não fica
 * fingindo que um item foi avaliado: itens novos SEMPRE nascem com
 * estado nulo ("não avaliado"), nunca com um valor pré-preenchido tipo
 * "Bom" — isso falsificaria o laudo antes do vistoriador olhar o item.
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

  // Sincroniza um snapshot da estrutura completa em
  // `vistorias.laudo_preenchido` a cada alteração — melhor esforço,
  // nunca trava a UI.
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
   * 1) Insere o ambiente em `vistoria_ambientes` (enviando `nome` e
   * `ambiente` juntos), vinculado ao vistoria_id.
   * 2) Insere os 12 itens padrão em `vistoria_itens` (enviando `nome`
   * e `item`; `estado`/`status` começam nulos — "não avaliado").
   * Se qualquer uma das duas gravações falhar, a mensagem exata do
   * Supabase vai pro console e o ambiente/itens aparecem na tela
   * marcados como não sincronizados, sem travar o vistoriador.
   */
  const addAmbiente = useCallback(
    async (nome) => {
      const { row: ambienteRow, persisted: ambientePersistido } = await insertResiliente(
        'vistoria_ambientes',
        { vistoria_id: vistoriaId, nome, ambiente: nome },
        () => ({
          id: buildLocalId('amb'),
          vistoria_id: vistoriaId,
          nome,
          ambiente: nome,
          created_at: new Date().toISOString()
        })
      )

      const linhasItens = ITENS_PADRAO.map((item) => ({
        ambiente_id: ambienteRow.id,
        nome: item,
        item,
        estado: null,
        status: null
      }))

      let itensFinal
      if (!ambientePersistido) {
        // Ambiente já não foi salvo — nem tenta inserir os itens no
        // banco (o ambiente_id nem existe lá); monta tudo localmente.
        itensFinal = linhasItens.map((linha) => ({
          id: buildLocalId('item'),
          ...linha,
          observacao: null,
          created_at: new Date().toISOString(),
          vistoria_fotos: [],
          _naoSincronizado: true
        }))
      } else {
        const { data: itensData, error: itensErr } = await supabase
          .from('vistoria_itens')
          .insert(linhasItens)
          .select('*')
        if (itensErr) {
          console.error(
            '[useVistoriaExecucao] Erro do Supabase ao inserir itens padrão:',
            itensErr.message,
            itensErr
          )
          itensFinal = linhasItens.map((linha) => ({
            id: buildLocalId('item'),
            ...linha,
            observacao: null,
            created_at: new Date().toISOString(),
            vistoria_fotos: [],
            _naoSincronizado: true
          }))
        } else {
          itensFinal = (itensData || []).map((it) => ({ ...it, vistoria_fotos: [] }))
        }
      }

      const novoAmbiente = {
        ...ambienteRow,
        _naoSincronizado: !ambientePersistido,
        vistoria_itens: itensFinal
      }
      setAmbientes((prev) => [...prev, novoAmbiente])
      return novoAmbiente
    },
    [vistoriaId]
  )

  const removeAmbiente = useCallback(async (ambienteId) => {
    if (!isLocalId(ambienteId)) {
      const { error } = await supabase.from('vistoria_ambientes').delete().eq('id', ambienteId)
      if (error) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao remover ambiente:', error.message, error)
      }
    }
    setAmbientes((prev) => prev.filter((a) => a.id !== ambienteId))
  }, [])

  /** "+ Adicionar Outro Item": cria um item personalizado no ambiente. */
  const addItemCustom = useCallback(async (ambienteId, nomeItem) => {
    const buildFallback = () => ({
      id: buildLocalId('item'),
      ambiente_id: ambienteId,
      nome: nomeItem,
      item: nomeItem,
      estado: null,
      status: null,
      observacao: null
    })

    let novoItem
    if (isLocalId(ambienteId)) {
      novoItem = { ...buildFallback(), vistoria_fotos: [], _naoSincronizado: true }
    } else {
      const { row, persisted } = await insertResiliente(
        'vistoria_itens',
        { ambiente_id: ambienteId, nome: nomeItem, item: nomeItem, estado: null, status: null },
        buildFallback
      )
      novoItem = { ...row, vistoria_fotos: [], _naoSincronizado: !persisted }
    }

    setAmbientes((prev) =>
      prev.map((a) => (a.id === ambienteId ? { ...a, vistoria_itens: [...(a.vistoria_itens || []), novoItem] } : a))
    )
    return novoItem
  }, [])

  const removeItem = useCallback(async (ambienteId, itemId) => {
    if (!isLocalId(itemId)) {
      const { error } = await supabase.from('vistoria_itens').delete().eq('id', itemId)
      if (error) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao remover item:', error.message, error)
      }
    }
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambienteId
          ? { ...a, vistoria_itens: (a.vistoria_itens || []).filter((it) => it.id !== itemId) }
          : a
      )
    )
  }, [])

  const patchItem = useCallback((ambienteId, itemId, patch) => {
    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === ambienteId
          ? { ...a, vistoria_itens: (a.vistoria_itens || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
          : a
      )
    )
  }, [])

  /** Estado real escolhido pelo vistoriador — grava em `estado` e `status` juntos. */
  const setItemEstado = useCallback(
    async (ambienteId, itemId, estado) => {
      if (isLocalId(itemId)) {
        patchItem(ambienteId, itemId, { estado, status: estado })
        return
      }
      const { data, error } = await supabase
        .from('vistoria_itens')
        .update({ estado, status: estado })
        .eq('id', itemId)
        .select('*')
        .single()
      if (error) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao salvar estado do item:', error.message, error)
        patchItem(ambienteId, itemId, { estado, status: estado, _naoSincronizado: true })
        return
      }
      patchItem(ambienteId, itemId, { ...data, _naoSincronizado: false })
    },
    [patchItem]
  )

  const updateItemObservacao = useCallback(
    async (ambienteId, itemId, observacao) => {
      if (isLocalId(itemId)) {
        patchItem(ambienteId, itemId, { observacao })
        return
      }
      const { data, error } = await supabase
        .from('vistoria_itens')
        .update({ observacao })
        .eq('id', itemId)
        .select('*')
        .single()
      if (error) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao salvar observação:', error.message, error)
        patchItem(ambienteId, itemId, { observacao, _naoSincronizado: true })
        return
      }
      patchItem(ambienteId, itemId, { ...data, _naoSincronizado: false })
    },
    [patchItem]
  )

  /** Funcionamento (Sim/Não) — independente da condição, útil para eletros/eletrônicos. */
  const setItemFuncionamento = useCallback(
    async (ambienteId, itemId, funcionamento) => {
      if (isLocalId(itemId)) {
        patchItem(ambienteId, itemId, { funcionamento })
        return
      }
      const { data, error } = await supabase
        .from('vistoria_itens')
        .update({ funcionamento })
        .eq('id', itemId)
        .select('*')
        .single()
      if (error) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao salvar funcionamento:', error.message, error)
        patchItem(ambienteId, itemId, { funcionamento, _naoSincronizado: true })
        return
      }
      patchItem(ambienteId, itemId, { ...data, _naoSincronizado: false })
    },
    [patchItem]
  )

  // Fotos exigem um arquivo de verdade enviado ao Storage — não há
  // como "fingir" localmente um upload que nunca aconteceu, então
  // aqui o erro continua sendo lançado (o FotoUploader já mostra a
  // mensagem inline) em vez de fabricar uma foto que não existe.
  const addFotoItem = useCallback(
    async (ambienteId, itemId, file) => {
      const path = `${vistoriaId}/${ambienteId}/${itemId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file)
      if (upErr) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao enviar foto:', upErr.message, upErr)
        throw upErr
      }

      const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)

      const { data, error } = await supabase
        .from('vistoria_fotos')
        .insert({ ambiente_id: ambienteId, item_id: itemId, url: pub.publicUrl })
        .select()
        .single()
      if (error) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao salvar registro da foto:', error.message, error)
        throw error
      }

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
    if (error) {
      console.error('[useVistoriaExecucao] Erro do Supabase ao remover foto:', error.message, error)
    }
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
    setItemFuncionamento,
    updateItemObservacao,
    addFotoItem,
    removeFotoItem,
    aceitarVistoria,
    finalizarVistoria
  }
}
