import { supabase } from './supabaseClient'

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
      imoveis:imovel_id ( id, codigo_imovel, endereco, numero, bairro, cidade, inquilino_nome, proprietario_nome ),
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
