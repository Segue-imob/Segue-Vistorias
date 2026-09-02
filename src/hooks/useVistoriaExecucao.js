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
  const [vistoriaEntradaRef, setVistoriaEntradaRef] = useState(null)
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
        imoveis:imovel_id ( * ),
        vistoriador:vistoriador_id ( id, nome, email )
      `
      )
      .eq('id', vid)
      .maybeSingle()

    setVistoria(vistoriaData || null)

    if (vErr || !vistoriaData) {
      setError(vErr || null)
      setAmbientes([])
      setVistoriaEntradaRef(null)
      setLoading(false)
      return
    }

    // Entrada -> Saída: se esta vistoria é uma "Saída" e o imóvel tem
    // uma "Entrada" finalizada anterior, guarda essa referência —
    // VistoriaExecucao.jsx usa isso pra oferecer o modal de
    // reaproveitar ambientes/fotos como ponto de partida.
    if (vistoriaData.tipo === 'Saída' && vistoriaData.imovel_id) {
      const { data: entradaCandidata } = await supabase
        .from('vistorias')
        .select('id, data_agendamento, finalizada_em')
        .eq('imovel_id', vistoriaData.imovel_id)
        .eq('tipo', 'Entrada')
        .eq('status', 'finalizada')
        .neq('id', vid)
        .order('finalizada_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      setVistoriaEntradaRef(entradaCandidata || null)
    } else {
      setVistoriaEntradaRef(null)
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
  // como "fingir" localmente um upload que nunca aconteceu. Exceção:
  // se o ITEM em si ainda não foi sincronizado (id local, "local-..."),
  // nem tenta gravar em vistoria_fotos (a FK pra um item que não
  // existe no banco falharia) — só guarda uma prévia local da foto,
  // marcada como não sincronizada, igual ao resto do fluxo.
  const addFotoItem = useCallback(
    async (ambienteId, itemId, file) => {
      if (isLocalId(itemId)) {
        const urlLocal = URL.createObjectURL(file)
        const fotoLocal = {
          id: buildLocalId('foto'),
          ambiente_id: ambienteId,
          item_id: itemId,
          url: urlLocal,
          created_at: new Date().toISOString(),
          _naoSincronizado: true
        }
        setAmbientes((prev) =>
          prev.map((a) =>
            a.id === ambienteId
              ? {
                  ...a,
                  vistoria_itens: (a.vistoria_itens || []).map((it) =>
                    it.id === itemId ? { ...it, vistoria_fotos: [...(it.vistoria_fotos || []), fotoLocal] } : it
                  )
                }
              : a
          )
        )
        return fotoLocal
      }

      const path = `${vistoriaId}/${ambienteId}/${itemId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage
        .from(FOTOS_BUCKET)
        .upload(path, file, { contentType: file.type || 'image/jpeg' })
      if (upErr) {
        // Aqui sim é um erro de verdade sem saída: se o arquivo nem
        // chegou a subir pro Storage, não existe URL nenhuma pra
        // salvar em lugar nenhum — não tem como "não perder a foto".
        console.error('[useVistoriaExecucao] Erro do Supabase ao enviar foto:', upErr.message, upErr)
        throw upErr
      }

      const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)
      const url = pub.publicUrl

      // Registra em vistoria_fotos com o payload completo (retrocompat:
      // vistoria_id, ambiente_id, item_id, foto_url E url, todos
      // apontando pra mesma URL). Se esse INSERT falhar, a foto NÃO se
      // perde — ela já está no Storage — então cai no fallback abaixo
      // em vez de lançar erro.
      const { data: fotoInserida, error: fotoErr } = await supabase
        .from('vistoria_fotos')
        .insert({
          vistoria_id: vistoriaId,
          ambiente_id: ambienteId,
          item_id: itemId,
          foto_url: url,
          url
        })
        .select()
        .single()

      let fotoFinal
      if (fotoErr) {
        console.error(
          '[useVistoriaExecucao] Erro do Supabase ao salvar registro em vistoria_fotos — a foto já está no ' +
            'Storage e NÃO será perdida, só o registro na tabela falhou (veja fotos_urls como rede de segurança):',
          fotoErr.message,
          fotoErr
        )
        fotoFinal = {
          id: buildLocalId('foto'),
          vistoria_id: vistoriaId,
          ambiente_id: ambienteId,
          item_id: itemId,
          foto_url: url,
          url,
          created_at: new Date().toISOString(),
          _naoSincronizado: true
        }
      } else {
        fotoFinal = fotoInserida
      }

      // Espelha a URL em vistoria_itens.fotos_urls — SEMPRE tenta,
      // mesmo quando o insert acima falhou: é a rede de segurança do
      // item 3, garantindo que a URL sobrevive em algum lugar do banco
      // mesmo se o registro em vistoria_fotos não tiver ido adiante.
      const itemAtual = ambientes
        .find((a) => a.id === ambienteId)
        ?.vistoria_itens?.find((it) => it.id === itemId)
      const urlsAtuais = Array.isArray(itemAtual?.fotos_urls) ? itemAtual.fotos_urls : []
      const novasUrls = [...urlsAtuais, url]

      const { error: arrErr } = await supabase.from('vistoria_itens').update({ fotos_urls: novasUrls }).eq('id', itemId)
      if (arrErr) {
        console.warn(
          '[useVistoriaExecucao] Não foi possível atualizar vistoria_itens.fotos_urls (a coluna existe?):',
          arrErr.message
        )
      }

      // Exibe a miniatura na hora, independente do resultado das duas
      // gravações acima — a foto nunca fica invisível pro vistoriador.
      setAmbientes((prev) =>
        prev.map((a) =>
          a.id === ambienteId
            ? {
                ...a,
                vistoria_itens: (a.vistoria_itens || []).map((it) =>
                  it.id === itemId
                    ? { ...it, vistoria_fotos: [...(it.vistoria_fotos || []), fotoFinal], fotos_urls: novasUrls }
                    : it
                )
              }
            : a
        )
      )
      return fotoFinal
    },
    [vistoriaId, ambientes]
  )

  const removeFotoItem = useCallback(
    async (ambienteId, itemId, fotoId) => {
      // Acha a foto/URL atuais no estado local — usados pra manter
      // fotos_urls sincronizado e pra decidir se vale a pena chamar
      // o Supabase (item/foto locais nunca tiveram nada persistido).
      const ambienteAtual = ambientes.find((a) => a.id === ambienteId)
      const itemAtual = ambienteAtual?.vistoria_itens?.find((it) => it.id === itemId)
      const fotoAtual = itemAtual?.vistoria_fotos?.find((f) => f.id === fotoId)

      if (!isLocalId(itemId)) {
        if (!isLocalId(fotoId)) {
          const { error } = await supabase.from('vistoria_fotos').delete().eq('id', fotoId)
          if (error) {
            console.error('[useVistoriaExecucao] Erro do Supabase ao remover foto:', error.message, error)
          }
        }

        if (fotoAtual?.url) {
          const urlsAtuais = Array.isArray(itemAtual?.fotos_urls) ? itemAtual.fotos_urls : []
          const novasUrls = urlsAtuais.filter((u) => u !== fotoAtual.url)
          const { error: arrErr } = await supabase
            .from('vistoria_itens')
            .update({ fotos_urls: novasUrls })
            .eq('id', itemId)
          if (arrErr) {
            console.warn(
              '[useVistoriaExecucao] Não foi possível atualizar fotos_urls ao remover foto:',
              arrErr.message
            )
          }
        }
      }

      setAmbientes((prev) =>
        prev.map((a) =>
          a.id === ambienteId
            ? {
                ...a,
                vistoria_itens: (a.vistoria_itens || []).map((it) =>
                  it.id === itemId
                    ? {
                        ...it,
                        vistoria_fotos: (it.vistoria_fotos || []).filter((f) => f.id !== fotoId),
                        fotos_urls: Array.isArray(it.fotos_urls)
                          ? it.fotos_urls.filter((u) => u !== fotoAtual?.url)
                          : it.fotos_urls
                      }
                    : it
                )
              }
            : a
        )
      )
    },
    [ambientes]
  )

  /**
   * Grava um campo de "Informações Gerais do Imóvel" (estado_limpeza,
   * energia, agua ou gas) direto em `vistorias`. São campos da
   * vistoria como um todo, não de um ambiente/item — por isso vivem
   * direto no hook, sem passar por ambienteId/itemId.
   */
  const updateInfoGeral = useCallback(
    async (campo, valor) => {
      const { error } = await supabase.from('vistorias').update({ [campo]: valor }).eq('id', vistoriaId)
      if (error) {
        console.error(`[useVistoriaExecucao] Erro do Supabase ao salvar ${campo}:`, error.message, error)
        throw error
      }
      setVistoria((v) => (v ? { ...v, [campo]: valor } : v))
    },
    [vistoriaId]
  )

  const aceitarVistoria = useCallback(async () => {
    const { error } = await supabase.from('vistorias').update({ status: 'aceita' }).eq('id', vistoriaId)
    if (error) throw error
    setVistoria((v) => (v ? { ...v, status: 'aceita' } : v))
  }, [vistoriaId])

  /**
   * Envia a assinatura (Blob PNG) para o Storage e finaliza a vistoria.
   *
   * Sobre `status`: mantive `'finalizada'` (não `'Concluída'`) de
   * propósito — é o valor que toda a aplicação já usa pra decidir o
   * que é "vistoria encerrada" (aba Concluídas, cores do Kanban,
   * badge de status, a própria checagem `isEncerrada` desta tela).
   * Trocar o valor faria a vistoria "sumir" de todos esses lugares,
   * já que nenhum filtro reconheceria o novo texto. `finalizada_em`
   * e `concluida_em` são gravados juntos (mesmo timestamp) por
   * retrocompatibilidade de nome de coluna, como já fazemos em
   * outros pares (ambiente/nome, item/nome, estado/status).
   */
  const finalizarVistoria = useCallback(
    async (assinaturaBlob, observacoesFinais) => {
      const path = `${vistoriaId}/assinatura/${Date.now()}.png`
      const { error: upErr } = await supabase.storage
        .from(FOTOS_BUCKET)
        .upload(path, assinaturaBlob, { contentType: 'image/png' })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)
      const agora = new Date().toISOString()

      const { error } = await supabase
        .from('vistorias')
        .update({
          status: 'finalizada',
          finalizada_em: agora,
          concluida_em: agora,
          assinatura_url: pub.publicUrl,
          observacoes_finais: observacoesFinais || null,
          laudo_preenchido: JSON.stringify(ambientes)
        })
        .eq('id', vistoriaId)
      if (error) throw error

      setVistoria((v) =>
        v
          ? {
              ...v,
              status: 'finalizada',
              finalizada_em: agora,
              concluida_em: agora,
              assinatura_url: pub.publicUrl,
              observacoes_finais: observacoesFinais || null
            }
          : v
      )
    },
    [vistoriaId, ambientes]
  )

  /**
   * Gera o PDF do laudo (ver src/lib/laudoPdf.jsx), sobe pro Storage e
   * grava a URL em `vistorias.laudo_pdf_url` — melhor esforço: nunca
   * lança, só avisa no console se algo falhar (o download do PDF pro
   * dispositivo do vistoriador já aconteceu antes de chamar isto,
   * então uma falha aqui não faz o laudo "sumir" pra ele).
   */
  const salvarLaudoPdf = useCallback(
    async (blob) => {
      const path = `${vistoriaId}/laudo/${Date.now()}.pdf`
      const { error: upErr } = await supabase.storage
        .from(FOTOS_BUCKET)
        .upload(path, blob, { contentType: 'application/pdf' })
      if (upErr) {
        console.warn('[useVistoriaExecucao] Não foi possível salvar o laudo em PDF no Storage:', upErr.message)
        return null
      }

      const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)

      const { error: updErr } = await supabase
        .from('vistorias')
        .update({ laudo_pdf_url: pub.publicUrl })
        .eq('id', vistoriaId)
      if (updErr) {
        console.warn('[useVistoriaExecucao] Não foi possível gravar laudo_pdf_url:', updErr.message)
        return null
      }

      setVistoria((v) => (v ? { ...v, laudo_pdf_url: pub.publicUrl } : v))
      return pub.publicUrl
    },
    [vistoriaId]
  )

  /**
   * Entrada -> Saída: copia ambientes, itens e fotos de uma vistoria
   * de Entrada finalizada pra esta vistoria de Saída, como ponto de
   * partida/referência de comparação.
   *
   * Decisão de integridade de dados: a Condição e o Funcionamento de
   * cada item NÃO são copiados — cada item novo nasce com
   * `estado`/`funcionamento` em branco, exatamente como um item
   * criado do zero. Copiar a avaliação antiga faria o vistoriador
   * poder "esquecer" de reavaliar um item e a Saída acabar herdando
   * silenciosamente uma condição que era da Entrada — a mesma lógica
   * por trás de nunca pré-preencher um item novo como "Bom" (ver
   * README). O que É copiado — nome do ambiente/item, a observação
   * antiga (como referência, prefixada) e as fotos antigas — é
   * material de referência, não uma avaliação already-feita.
   */
  const importarDeVistoriaEntrada = useCallback(
    async (vistoriaEntradaId) => {
      const { data: ambientesEntrada, error: aErr } = await supabase
        .from('vistoria_ambientes')
        .select('*')
        .eq('vistoria_id', vistoriaEntradaId)
        .order('created_at', { ascending: true })
      if (aErr) throw aErr

      const ambienteIdsEntrada = (ambientesEntrada || []).map((a) => a.id)

      let itensEntrada = []
      if (ambienteIdsEntrada.length > 0) {
        const { data, error } = await supabase
          .from('vistoria_itens')
          .select('*')
          .in('ambiente_id', ambienteIdsEntrada)
          .order('created_at', { ascending: true })
        if (error) throw error
        itensEntrada = data || []
      }

      const itemIdsEntrada = itensEntrada.map((it) => it.id)

      let fotosEntrada = []
      if (itemIdsEntrada.length > 0) {
        const { data, error } = await supabase.from('vistoria_fotos').select('*').in('item_id', itemIdsEntrada)
        if (error) throw error
        fotosEntrada = data || []
      }

      for (const ambienteEntrada of ambientesEntrada || []) {
        const nomeAmbiente = ambienteEntrada.ambiente || ambienteEntrada.nome
        const { data: novoAmbiente, error: novoAmbErr } = await supabase
          .from('vistoria_ambientes')
          .insert({ vistoria_id: vistoriaId, ambiente: nomeAmbiente, nome: nomeAmbiente })
          .select()
          .single()
        if (novoAmbErr) throw novoAmbErr

        const itensDoAmbiente = itensEntrada.filter((it) => it.ambiente_id === ambienteEntrada.id)

        for (const itemEntrada of itensDoAmbiente) {
          const nomeItem = itemEntrada.item || itemEntrada.nome
          const observacaoReferencia = itemEntrada.observacao
            ? `Referência (Vistoria de Entrada): ${itemEntrada.observacao}`
            : null

          const { data: novoItem, error: novoItemErr } = await supabase
            .from('vistoria_itens')
            .insert({
              ambiente_id: novoAmbiente.id,
              item: nomeItem,
              nome: nomeItem,
              estado: null,
              status: null,
              funcionamento: null,
              observacao: observacaoReferencia
            })
            .select()
            .single()
          if (novoItemErr) throw novoItemErr

          const fotosDoItem = fotosEntrada.filter((f) => f.item_id === itemEntrada.id)
          for (const foto of fotosDoItem) {
            const urlFoto = foto.url || foto.foto_url
            if (!urlFoto) continue
            const { error: novaFotoErr } = await supabase.from('vistoria_fotos').insert({
              vistoria_id: vistoriaId,
              ambiente_id: novoAmbiente.id,
              item_id: novoItem.id,
              foto_url: urlFoto,
              url: urlFoto
            })
            if (novaFotoErr) {
              console.warn(
                '[useVistoriaExecucao] Falha ao copiar uma foto de referência da Vistoria de Entrada:',
                novaFotoErr.message
              )
            }
          }
        }
      }

      await fetchAll()
    },
    [vistoriaId, fetchAll]
  )

  /**
   * "Sincronizar Vistoria" — ação do vistoriador que libera o laudo
   * pro Solicitante: gera o PDF (feito por quem chama, via
   * gerarLaudoPdfBlob), sobe pro Storage, grava `laudo_pdf_url`,
   * marca `sincronizado: true` **e** garante `status: 'finalizada'`
   * explicitamente (rede de segurança — na prática o status já
   * estava assim antes de chegar aqui, já que o botão só existe numa
   * vistoria já finalizada, mas fixar isso deixa a função correta
   * por si só, independente de quem a chama). Ao contrário de
   * `salvarLaudoPdf` (melhor esforço, nunca lança), esta função
   * LANÇA em caso de erro — é a ação principal do botão, então uma
   * falha precisa aparecer de verdade pro vistoriador, não ser
   * engolida silenciosamente.
   *
   * Não usei `status: 'Concluída'` de propósito — é a mesma razão já
   * documentada em `finalizarVistoria`: essa string quebraria toda a
   * filtragem por status do app (aba Concluídas, Kanban, badge). O
   * campo `sincronizado` (booleano, coluna própria) já resolve a
   * necessidade real sem tocar no valor de `status`.
   */
  const sincronizarVistoria = useCallback(
    async (blob) => {
      const path = `${vistoriaId}/laudo/${Date.now()}.pdf`
      const { error: upErr } = await supabase.storage
        .from(FOTOS_BUCKET)
        .upload(path, blob, { contentType: 'application/pdf' })
      if (upErr) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao subir o laudo pro Storage:', upErr.message, upErr)
        throw upErr
      }

      const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)

      const { error: updErr } = await supabase
        .from('vistorias')
        .update({ status: 'finalizada', laudo_pdf_url: pub.publicUrl, sincronizado: true })
        .eq('id', vistoriaId)
      if (updErr) {
        console.error('[useVistoriaExecucao] Erro do Supabase ao sincronizar a vistoria:', updErr.message, updErr)
        throw updErr
      }

      setVistoria((v) => (v ? { ...v, status: 'finalizada', laudo_pdf_url: pub.publicUrl, sincronizado: true } : v))
      return pub.publicUrl
    },
    [vistoriaId]
  )

  return {
    vistoria,
    ambientes,
    loading,
    error,
    vistoriaEntradaRef,
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
    finalizarVistoria,
    salvarLaudoPdf,
    sincronizarVistoria,
    updateInfoGeral,
    importarDeVistoriaEntrada
  }
}
