import { supabase } from './supabaseClient'
import { FOTOS_BUCKET } from './vistoriaExecucao'

/**
 * Busca vistoria + ambientes/itens/fotos prontos pra gerar o laudo em
 * PDF, de forma avulsa — sem precisar montar o hook
 * useVistoriaExecucao inteiro (que é pensado pra uma tela só, presa a
 * um `useState`/ciclo de vida de componente). Usado pelo botão
 * "Visualizar / Baixar Laudo" na listagem de Vistorias do
 * Administrador, onde cada linha busca os dados completos só quando
 * o botão é clicado, sob demanda — não faz sentido pré-carregar o
 * checklist inteiro de toda vistoria da lista de uma vez.
 *
 * Reproduz a mesma consulta em 3 passos de useVistoriaExecucao
 * (vistoria -> ambientes -> itens -> fotos), mas como função pura
 * (sem estado de React), então pode ser chamada de qualquer lugar.
 */
export async function buscarDadosParaLaudo(vistoriaId) {
  const vid = String(vistoriaId).trim()

  const { data: vistoria, error: vErr } = await supabase
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

  if (vErr) throw vErr
  if (!vistoria) throw new Error('Vistoria não encontrada.')

  const { data: ambientesData, error: aErr } = await supabase
    .from('vistoria_ambientes')
    .select('*')
    .eq('vistoria_id', vid)
    .order('created_at', { ascending: true })
  if (aErr) throw aErr

  const ambienteIds = (ambientesData || []).map((a) => a.id)

  let itensData = []
  if (ambienteIds.length > 0) {
    const { data, error } = await supabase
      .from('vistoria_itens')
      .select('*')
      .in('ambiente_id', ambienteIds)
      .order('created_at', { ascending: true })
    if (error) throw error
    itensData = data || []
  }

  const itemIds = itensData.map((it) => it.id)

  let fotosData = []
  if (itemIds.length > 0) {
    const { data, error } = await supabase.from('vistoria_fotos').select('*').in('item_id', itemIds)
    if (error) throw error
    fotosData = data || []
  }

  const ambientes = (ambientesData || []).map((amb) => ({
    ...amb,
    vistoria_itens: itensData
      .filter((it) => it.ambiente_id === amb.id)
      .map((it) => ({
        ...it,
        vistoria_fotos: fotosData.filter((f) => f.item_id === it.id)
      }))
  }))

  return { vistoria, ambientes }
}

/**
 * Sobe um PDF de laudo já gerado (Blob) pro Storage e grava a URL em
 * `vistorias.laudo_pdf_url` — versão avulsa de `salvarLaudoPdf` (que
 * vive dentro de `useVistoriaExecucao`, preso ao ciclo de vida
 * daquela tela). Usada pela página `/vistorias/:id/laudo`, que
 * precisa gerar/salvar o PDF sem estar dentro do hook de execução.
 * Lança em caso de erro — diferente da versão do hook (melhor
 * esforço), aqui quem chama decide como avisar o usuário.
 */
export async function salvarLaudoPdfAvulso(vistoriaId, blob) {
  const path = `${vistoriaId}/laudo/${Date.now()}.pdf`
  const { error: upErr } = await supabase.storage
    .from(FOTOS_BUCKET)
    .upload(path, blob, { contentType: 'application/pdf' })
  if (upErr) throw upErr

  const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)

  const { error: updErr } = await supabase
    .from('vistorias')
    .update({ laudo_pdf_url: pub.publicUrl })
    .eq('id', vistoriaId)
  if (updErr) throw updErr

  return pub.publicUrl
}

/**
 * Normaliza uma entrada de `vistoria_itens.fotos_urls` — pode ser a
 * URL solta em texto (formato antigo, sem `created_at`) ou um objeto
 * `{ url, created_at }` (formato atual, gravado por
 * `useVistoriaExecucao.addFotoItem`). Sempre devolve o formato objeto.
 */
function normalizarEntradaFotoUrl(entrada) {
  if (typeof entrada === 'string') return { url: entrada, created_at: null }
  return { url: entrada?.url || null, created_at: entrada?.created_at || null }
}

/**
 * Combina as fotos vindas de `vistoria_fotos` (join já feito na
 * consulta) com quaisquer URLs presentes só em `item.fotos_urls` sem
 * uma linha correspondente em `vistoria_fotos` — cobre o caso de uma
 * foto ter sido salva como rede de segurança (o `insert` na tabela
 * falhou, mas a URL sobrevive no array). Função única, compartilhada
 * entre o gerador de PDF, o laudo em HTML e a lista achatada do
 * lightbox — antes cada um tinha sua própria cópia dessa lógica (ou,
 * no caso do HTML, nem tinha: fotos só-em-fotos_urls simplesmente não
 * apareciam ali).
 */
export function coletarFotosDoItem(item) {
  const doJoin = Array.isArray(item.vistoria_fotos) ? item.vistoria_fotos : []
  const urlsJaPresentes = new Set(doJoin.map((f) => f.url))
  const extrasDeFotosUrls = (Array.isArray(item.fotos_urls) ? item.fotos_urls : [])
    .map(normalizarEntradaFotoUrl)
    .filter((entrada) => entrada.url && !urlsJaPresentes.has(entrada.url))
    .map((entrada, index) => ({
      id: `fotos_urls-${item.id}-${index}`,
      url: entrada.url,
      created_at: entrada.created_at
    }))
  return [...doJoin, ...extrasDeFotosUrls]
}

/**
 * Mesmo filtro estrito usado no PDF (ver laudoPdf.jsx): só ambientes
 * com pelo menos um item efetivamente avaliado aparecem no laudo, e
 * dentro deles só os itens com condição preenchida. Compartilhada
 * entre a página `/vistorias/:id/laudo` e o modal da lista, pra não
 * duplicar essa regra em dois lugares.
 */
export function filtrarAmbientesParaLaudo(ambientes) {
  return (ambientes || [])
    .map((amb) => ({ ...amb, vistoria_itens: (amb.vistoria_itens || []).filter((it) => it.estado) }))
    .filter((amb) => amb.vistoria_itens.length > 0)
}

/**
 * Lista achatada, em ordem, de todas as fotos de um conjunto de
 * ambientes já filtrado (ver `filtrarAmbientesParaLaudo`) — cada foto
 * carrega o nome do ambiente/item de origem, usado tanto na exibição
 * quanto no cabeçalho do lightbox. Já usa `coletarFotosDoItem`, então
 * inclui as fotos que só existem em `fotos_urls`.
 */
export function construirTodasFotosDoLaudo(ambientesFiltrados) {
  const lista = []
  ;(ambientesFiltrados || []).forEach((amb) => {
    const nomeAmbiente = amb.ambiente || amb.nome
    ;(amb.vistoria_itens || []).forEach((item) => {
      const nomeItem = item.item || item.nome
      coletarFotosDoItem(item).forEach((foto) => {
        lista.push({ ...foto, ambienteNome: nomeAmbiente, itemNome: nomeItem })
      })
    })
  })
  return lista
}
