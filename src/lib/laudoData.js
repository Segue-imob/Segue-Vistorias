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
 * quanto no cabeçalho do lightbox.
 */
export function construirTodasFotosDoLaudo(ambientesFiltrados) {
  const lista = []
  ;(ambientesFiltrados || []).forEach((amb) => {
    const nomeAmbiente = amb.ambiente || amb.nome
    ;(amb.vistoria_itens || []).forEach((item) => {
      const nomeItem = item.item || item.nome
      ;(item.vistoria_fotos || []).forEach((foto) => {
        lista.push({ ...foto, ambienteNome: nomeAmbiente, itemNome: nomeItem })
      })
    })
  })
  return lista
}
