// ------------------------------------------------------------------
// Geração do Laudo de Vistoria em PDF, 100% no navegador (sem
// servidor), via @react-pdf/renderer. Estrutura baseada num modelo de
// laudo real de mercado, adaptada à identidade e aos dados da SEGUE
// Vistorias:
//   1. Cabeçalho com marca, endereço em destaque, dados gerais em
//      cards de fundo suave (sem tabela de bordas rígidas) e o total
//      de fotos ao lado do vistoriador responsável
//   2. Caixa "Informações do Imóvel" — linha de tags/badges com fundo
//      suave (limpeza, energia, água, gás), também sem borda pesada
//   3. Introdução + legenda dos parâmetros de condição (Ótimo/Bom/
//      Regular/Ruim), com as cores oficiais de cada um
//   4. Resumo executivo (progresso + condições gerais)
//   5. Detalhamento por ambiente: numeração hierárquica sequencial
//      ("1. Sala", "1.1 Piso", "1.2 Parede"...) — só ambientes com
//      pelo menos um item avaliado aparecem, e dentro deles só os
//      itens com condição efetivamente preenchida ("Não avaliado"
//      nunca aparece no corpo do laudo; o Resumo Executivo é que
//      continua contando tudo, avaliado ou não, pra mostrar
//      progresso). Pra cada item, nessa ordem exata — título
//      numerado, linha de status (bolinha colorida de condição +
//      funcionamento + observação) e, logo em seguida, a grade com
//      as fotos EXCLUSIVAS daquele item (até 3 por linha; item sem
//      fotos não reserva espaço nenhum). Nada de galeria global ao
//      final do ambiente/documento — cada item carrega suas próprias
//      fotos coladas nele. (Fotos já saem do upload com a marca
//      d'água de data/hora queimada nos próprios pixels — ver
//      src/lib/imageProcessing.js.)
//   6. Encerramento: observações finais, termo de responsabilidade e
//      assinatura digital com data de conclusão
//
// SOBRE AS FOTOS EM BRANCO: nossas fotos são comprimidas em WebP
// (imageProcessing.js) quando o navegador suporta — mas o
// @react-pdf/renderer só decodifica PNG/JPEG nativamente, então
// qualquer imagem .webp vira uma caixa em branco no PDF, mesmo com a
// URL correta e sem nenhum problema de CORS. A correção é pré-converter
// cada foto pra um data: URI em PNG usando um <canvas> (o navegador
// decodifica WebP perfeitamente pra exibição; nós só reaproveitamos
// esse decode e reembalamos como PNG) ANTES de montar o documento —
// isso também elimina qualquer fetch assíncrono durante a própria
// renderização do PDF, evitando timing/CORS de outra natureza.
// ------------------------------------------------------------------
import { Document, Page, Text, View, Image, Link, StyleSheet, pdf, Svg, Circle, Line } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AGUA_OPCOES,
  ENERGIA_OPCOES,
  ESTADO_LIMPEZA_OPCOES,
  ESTADOS_ITEM_ORDER,
  GAS_OPCOES,
  getEstadoItemMeta,
  getLabelOpcao,
  montarEnderecoCompleto
} from './vistoriaExecucao'
import { coletarFotosDoItem } from './laudoData'

const CORES = {
  accent: '#a64324',
  brand900: '#261912',
  brand700: '#593825',
  cream: '#f1ede5',
  border: '#bfb8ae'
}

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 46, fontSize: 9, fontFamily: 'Helvetica', color: CORES.brand900 },

  // ---- Cabeçalho ----
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: CORES.accent,
    paddingBottom: 10,
    marginBottom: 12
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: CORES.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: CORES.brand900 },
  brandSub: { fontSize: 8, color: CORES.accent, fontFamily: 'Helvetica-Bold' },
  headerRight: { alignItems: 'flex-end' },
  laudoTitulo: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: CORES.brand900 },
  laudoCodigo: { fontSize: 8, color: CORES.brand700, marginTop: 1 },

  // ---- Cards espelhados: "Dados Gerais da Vistoria" e "Informações
  // do Imóvel" compartilham exatamente o mesmo card (fundo suave,
  // borda sutil, cantos arredondados, mesmo espaçamento interno) —
  // só o conteúdo interno muda. Rótulos sempre em caixa alta/pequenos
  // na cor suave (brand700); valores sempre em negrito na cor
  // principal (brand900).
  seccaoCard: {
    backgroundColor: CORES.cream,
    borderWidth: 1,
    borderColor: CORES.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 14
  },
  seccaoCardTitulo: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: CORES.brand700,
    marginBottom: 8,
    letterSpacing: 0.5
  },
  seccaoDivisoria: { borderTopWidth: 1, borderTopColor: CORES.border, marginVertical: 8 },
  seccaoColunasRow: { flexDirection: 'row' },
  seccaoColuna: { flex: 1, paddingRight: 12 },
  seccaoColunaComDivisor: { borderRightWidth: 1, borderRightColor: CORES.border, marginRight: 12 },
  seccaoColunaLast: { paddingRight: 0 },
  seccaoLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: CORES.brand700, marginBottom: 3, letterSpacing: 0.4 },
  seccaoValor: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: CORES.brand900 },
  enderecoDestaque: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: CORES.brand900, marginBottom: 2 },

  // ---- Introdução + legenda de condição ----
  introTexto: { fontSize: 8.5, color: CORES.brand900, lineHeight: 1.5, marginBottom: 10, textAlign: 'justify' },
  introSubtitulo: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: CORES.brand900, marginBottom: 6 },
  legendaBox: { borderWidth: 1, borderColor: CORES.border, borderRadius: 3, padding: 8, marginBottom: 14 },
  legendaLinha: { flexDirection: 'row', marginBottom: 5 },
  legendaDot: { marginTop: 2 },
  legendaTitulo: { fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  legendaTexto: { fontSize: 8.5, color: CORES.brand900, flex: 1, lineHeight: 1.4 },

  // ---- Resumo executivo ----
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    marginBottom: 8,
    color: CORES.brand900,
    borderBottomWidth: 1,
    borderBottomColor: CORES.border,
    paddingBottom: 4
  },
  resumoRow: { flexDirection: 'row', marginBottom: 14 },
  resumoCard: {
    flex: 1,
    marginRight: 6,
    borderWidth: 1,
    borderColor: CORES.border,
    borderRadius: 3,
    padding: 8,
    alignItems: 'center'
  },
  resumoCardLast: { marginRight: 0 },
  resumoNumero: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: CORES.brand900 },
  resumoLabel: { fontSize: 7, color: CORES.brand700, marginTop: 2, textAlign: 'center' },

  // ---- Ambiente: título + itens agrupados (item + status + fotos do item) ----
  ambienteTitulo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    color: '#ffffff',
    backgroundColor: '#2b1e1a',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  itemBlocoComFotos: { marginBottom: 12 },
  itemDivisoria: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginTop: 10 },
  itemNome: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: CORES.brand900, marginBottom: 3 },
  itemCondicaoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  itemDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  itemCondicaoTexto: { fontSize: 10.5, color: CORES.brand900 },
  itemCondicaoStatus: { fontFamily: 'Helvetica-Bold' },
  itemFuncionamentoTexto: { fontSize: 10.5, color: CORES.brand700, marginLeft: 8 },
  itemObservacao: { fontSize: 9.5, color: CORES.brand700, marginTop: 3, marginLeft: 13, lineHeight: 1.45 },

  // ---- Grade de fotos, em linhas explícitas de até 3, cada linha
  // com sua própria proteção contra quebra de página ----
  photosRow: { flexDirection: 'row', marginTop: 5, marginBottom: 4 },
  photoBox: { width: 160, marginRight: 8 },
  photoFrame: { position: 'relative', width: 160, height: 120 },
  photo: { width: 160, height: 120, objectFit: 'cover', borderRadius: 6, borderWidth: 1, borderColor: CORES.border },
  photoLegenda: { fontSize: 8, color: CORES.brand900, textAlign: 'center', marginTop: 4 },
  photoIndisponivel: {
    width: 160,
    height: 120,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CORES.border,
    backgroundColor: CORES.cream,
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoIndisponivelTexto: { fontSize: 6, color: CORES.brand700, textAlign: 'center', paddingHorizontal: 6 },
  // Carimbo de data/hora sobreposto no canto superior esquerdo de
  // cada miniatura — fundo branco sólido com borda fina, texto
  // escuro, sempre por cima da imagem (zIndex).
  carimboDataHora: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5
  },
  carimboDataHoraTexto: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },

  // ---- Encerramento ----
  observacoesFinaisBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: CORES.border,
    borderRadius: 3,
    padding: 8,
    backgroundColor: CORES.cream
  },
  termoBox: { marginTop: 14, fontSize: 8, lineHeight: 1.5, color: CORES.brand700 },
  signatureBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: CORES.border, paddingTop: 10 },
  signatureLabel: { fontFamily: 'Helvetica-Bold', marginBottom: 6, fontSize: 9, color: CORES.brand900 },
  signatureImg: { width: 180, height: 70, objectFit: 'contain', marginBottom: 4 },

  footer: {
    position: 'absolute',
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 7,
    color: CORES.brand700,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: CORES.border,
    paddingTop: 4
  }
})

function formatarData(iso) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '—'
  }
}

/** Carimbo da miniatura da foto — com segundos, formato exato pedido. */
function formatarCarimboFoto(iso) {
  if (!iso) return null
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
  } catch {
    return null
  }
}

/**
 * Exibição estritamente condicional: só considera "preenchido" se o
 * vistoriador de fato tocou em Sim ou Não no seletor. Qualquer outro
 * valor — null, undefined, string vazia, ou até um valor inesperado
 * que não seja exatamente 'sim'/'nao' — conta como "não selecionado"
 * e a linha de Funcionamento nem aparece (nunca cai no fallback
 * "N/A" de labelFuncionamento, que só serve pra uso interno).
 */
/**
 * Agrupa um array em sub-arrays de até `tamanho` itens — usado pra
 * transformar a lista de fotos de um item em LINHAS explícitas (ver
 * nota em AmbienteSecao sobre por que isso é necessário no PDF).
 */
function agruparEmLinhas(itens, tamanho) {
  const linhas = []
  for (let i = 0; i < itens.length; i += tamanho) {
    linhas.push(itens.slice(i, i + tamanho))
  }
  return linhas
}

function funcionamentoFoiSelecionado(valor) {
  return valor === 'sim' || valor === 'nao'
}

function labelFuncionamento(valor) {
  if (valor === 'sim') return 'Sim'
  if (valor === 'nao') return 'Não'
  return 'N/A'
}

/**
 * Busca uma imagem pela URL pública e a reembala como PNG puro em
 * data: URI, via <canvas> — contorna a falta de suporte a WebP do
 * @react-pdf/renderer (ver nota no topo do arquivo). Nunca lança:
 * se a conversão falhar por qualquer motivo (rede, CORS, formato
 * exótico), devolve null e quem chamar decide o que fazer — nunca
 * trava a geração do laudo inteiro por causa de uma foto só.
 */
async function converterImagemParaPngDataUrl(url) {
  if (!url) return null
  try {
    const resposta = await fetch(url, { mode: 'cors' })
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
    const blob = await resposta.blob()

    let bitmap
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(blob)
    } else {
      bitmap = await new Promise((resolve, reject) => {
        const img = new window.Image()
        const objectUrl = URL.createObjectURL(blob)
        img.onload = () => {
          URL.revokeObjectURL(objectUrl)
          resolve(img)
        }
        img.onerror = (err) => {
          URL.revokeObjectURL(objectUrl)
          reject(err)
        }
        img.src = objectUrl
      })
    }

    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0)
    if (typeof bitmap.close === 'function') bitmap.close()

    return canvas.toDataURL('image/png')
  } catch (err) {
    console.warn('[laudoPdf] Falha ao converter imagem para o PDF, usando URL original como último recurso:', url, err.message)
    return null
  }
}

/**
 * Prepara uma cópia de `vistoria`/`ambientes` pronta pro PDF: cada
 * foto ganha `_pdfSrc` (PNG embutido, o que de fato é desenhado na
 * página) mantendo `url` intacta (usada no link clicável pra foto
 * original). Roda as conversões em paralelo por ambiente/item.
 */
async function prepararDadosParaPdf(vistoria, ambientes) {
  const assinaturaPdfSrc = vistoria.assinatura_url
    ? (await converterImagemParaPngDataUrl(vistoria.assinatura_url)) || vistoria.assinatura_url
    : null

  const ambientesPreparados = await Promise.all(
    ambientes.map(async (ambiente) => {
      const itensPreparados = await Promise.all(
        (ambiente.vistoria_itens || []).map(async (item) => {
          const fotosCombinadas = coletarFotosDoItem(item)
          const fotosPreparadas = await Promise.all(
            fotosCombinadas.map(async (foto) => ({
              ...foto,
              _pdfSrc: (await converterImagemParaPngDataUrl(foto.url)) || null
            }))
          )
          return { ...item, _fotosParaPdf: fotosPreparadas }
        })
      )
      return { ...ambiente, vistoria_itens: itensPreparados }
    })
  )

  return {
    vistoria: { ...vistoria, _assinaturaPdfSrc: assinaturaPdfSrc },
    ambientes: ambientesPreparados
  }
}

/**
 * Ícone de lupa (mesmo desenho do ícone "Search" da lucide-react
 * usado na interface do app) desenhado em SVG puro — o
 * @react-pdf/renderer não tem acesso a bibliotecas de ícones, então
 * reproduzimos a forma manualmente: um círculo + uma linha diagonal
 * (o cabo da lupa), traço branco, sem preenchimento.
 */
function IconeLupaPdf({ tamanho = 16 }) {
  return (
    <Svg viewBox="0 0 24 24" width={tamanho} height={tamanho}>
      <Circle cx="11" cy="11" r="8" stroke="#ffffff" strokeWidth={2.2} fill="none" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  )
}

function Cabecalho({ vistoria, totalFotos }) {
  const imovel = vistoria.imoveis || {}
  const endereco = montarEnderecoCompleto(imovel)

  return (
    <>
      <View style={styles.headerBar} fixed>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <IconeLupaPdf tamanho={16} />
          </View>
          <View>
            <Text style={styles.brand}>SEGUE Vistorias</Text>
            <Text style={styles.brandSub}>SEGUE IMOBILIÁRIA</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.laudoTitulo}>Laudo de Vistoria de {vistoria.tipo || '—'}</Text>
          <Text style={styles.laudoCodigo}>Código: {imovel.codigo_imovel || '—'}</Text>
        </View>
      </View>

      <View style={styles.seccaoCard} wrap={false}>
        <Text style={styles.seccaoLabel}>ENDEREÇO COMPLETO</Text>
        <Text style={styles.enderecoDestaque}>{endereco || '—'}</Text>

        <View style={styles.seccaoDivisoria} />

        <View style={styles.seccaoColunasRow}>
          <View style={[styles.seccaoColuna, styles.seccaoColunaComDivisor]}>
            <Text style={styles.seccaoLabel}>TIPO DE VISTORIA</Text>
            <Text style={styles.seccaoValor}>{vistoria.tipo || '—'}</Text>
          </View>
          <View style={[styles.seccaoColuna, styles.seccaoColunaComDivisor]}>
            <Text style={styles.seccaoLabel}>DATA/HORA DE INÍCIO</Text>
            <Text style={styles.seccaoValor}>{formatarData(vistoria.data_agendamento)}</Text>
          </View>
          <View style={[styles.seccaoColuna, styles.seccaoColunaLast]}>
            <Text style={styles.seccaoLabel}>DATA/HORA DE FINALIZAÇÃO</Text>
            <Text style={styles.seccaoValor}>{formatarData(vistoria.finalizada_em || vistoria.concluida_em)}</Text>
          </View>
        </View>

        <View style={styles.seccaoDivisoria} />

        <View style={styles.seccaoColunasRow}>
          <View style={[styles.seccaoColuna, styles.seccaoColunaComDivisor]}>
            <Text style={styles.seccaoLabel}>VISTORIADOR RESPONSÁVEL</Text>
            <Text style={styles.seccaoValor}>{vistoria.vistoriador?.nome || '—'}</Text>
          </View>
          <View style={[styles.seccaoColuna, styles.seccaoColunaLast]}>
            <Text style={styles.seccaoLabel}>TOTAL DE FOTOS</Text>
            <Text style={styles.seccaoValor}>
              {totalFotos} foto{totalFotos === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>
    </>
  )
}

function InformacoesImovel({ vistoria }) {
  // Exibição estritamente condicional: só entra na lista (e portanto
  // só aparece no laudo) o campo que o vistoriador de fato preencheu.
  // Se os quatro estiverem vazios, o card inteiro some (nada pra
  // mostrar).
  const campos = [
    { rotulo: 'ESTADO DE LIMPEZA', bruto: vistoria.estado_limpeza, opcoes: ESTADO_LIMPEZA_OPCOES },
    { rotulo: 'ENERGIA', bruto: vistoria.energia, opcoes: ENERGIA_OPCOES },
    { rotulo: 'ÁGUA', bruto: vistoria.agua, opcoes: AGUA_OPCOES },
    { rotulo: 'GÁS', bruto: vistoria.gas, opcoes: GAS_OPCOES }
  ]
    .filter((campo) => campo.bruto)
    .map((campo) => ({ rotulo: campo.rotulo, valor: getLabelOpcao(campo.opcoes, campo.bruto) }))

  if (campos.length === 0) return null

  return (
    <View style={styles.seccaoCard} wrap={false}>
      <Text style={styles.seccaoCardTitulo}>INFORMAÇÕES DO IMÓVEL</Text>
      <View style={styles.seccaoColunasRow}>
        {campos.map((campo, index) => {
          const isLast = index === campos.length - 1
          return (
            <View
              key={campo.rotulo}
              style={[styles.seccaoColuna, isLast ? styles.seccaoColunaLast : styles.seccaoColunaComDivisor]}
            >
              <Text style={styles.seccaoLabel}>{campo.rotulo}</Text>
              <Text style={styles.seccaoValor}>{campo.valor}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// Legenda de condição usada na Introdução — mesma nomenclatura
// masculina (ÓTIMO/BOM/REGULAR/RUIM) já usada em ESTADOS_ITEM.label
// em todo o resto do sistema (checklist, badges, resumo executivo,
// texto do item no laudo). Mantida como lista própria (não reaproveita
// meta.label diretamente) só porque a legenda também carrega a
// descrição de cada condição, que não existe em ESTADOS_ITEM.
const LEGENDA_CONDICAO = [
  { chave: 'otima', titulo: 'ÓTIMO', descricao: 'Item sem marcas de uso ou recém-instalado/novo.' },
  { chave: 'boa', titulo: 'BOM', descricao: 'Apresenta pouco desgaste decorrente de uso normal.' },
  {
    chave: 'regular',
    titulo: 'REGULAR',
    descricao: 'Apresenta sinais de desgastes aparentes ou pequenas avarias funcionais/estéticas.'
  },
  {
    chave: 'ruim',
    titulo: 'RUIM',
    descricao: 'Apresenta grandes sinais de deterioração, avarias graves ou ausência de funcionalidade.'
  }
]

function Introducao() {
  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>Introdução</Text>
      <Text style={styles.introTexto}>
        As informações constantes neste relatório trazem uma descrição fiel do atual estado do imóvel
        vistoriado. Além das informações escritas, as fotos anexas servem como provas da vistoria realizada e
        da condição do imóvel. Certifique-se de ter recebido as fotos; se porventura não as tenha recebido,
        faça a solicitação.
      </Text>

      <Text style={styles.introSubtitulo}>Parâmetros de Avaliação / Condição dos Itens</Text>
      <View style={styles.legendaBox}>
        {LEGENDA_CONDICAO.map((item) => {
          const meta = getEstadoItemMeta(item.chave)
          return (
            <View key={item.chave} style={styles.legendaLinha}>
              <View style={[styles.itemDot, styles.legendaDot, { backgroundColor: meta.color }]} />
              <Text style={styles.legendaTexto}>
                <Text style={[styles.legendaTitulo, { color: meta.color }]}>{item.titulo}: </Text>
                {item.descricao}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function ResumoExecutivo({ vistoria, ambientes }) {
  const todosItens = ambientes.flatMap((a) => a.vistoria_itens || [])
  const totalItens = todosItens.length
  const totalAvaliados = todosItens.filter((it) => it.estado).length

  const contagemPorEstado = ESTADOS_ITEM_ORDER.reduce((acc, chave) => {
    acc[chave] = todosItens.filter((it) => it.estado === chave).length
    return acc
  }, {})

  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>Resumo Executivo</Text>

      <View style={styles.resumoRow}>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoNumero}>{ambientes.length}</Text>
          <Text style={styles.resumoLabel}>Ambiente(s) vistoriado(s)</Text>
        </View>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoNumero}>
            {totalAvaliados}/{totalItens}
          </Text>
          <Text style={styles.resumoLabel}>Itens avaliados</Text>
        </View>
        {ESTADOS_ITEM_ORDER.map((chave, index) => {
          const meta = getEstadoItemMeta(chave)
          const isLast = index === ESTADOS_ITEM_ORDER.length - 1
          return (
            <View key={chave} style={[styles.resumoCard, isLast ? styles.resumoCardLast : null]}>
              <Text style={[styles.resumoNumero, { color: meta.color }]}>{contagemPorEstado[chave]}</Text>
              <Text style={styles.resumoLabel}>{meta.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function AmbienteSecao({ ambiente, numero }) {
  const itens = ambiente.vistoria_itens || []
  const nomeAmbiente = ambiente.ambiente || ambiente.nome

  return (
    <View>
      {itens.map((item, index) => {
        const meta = getEstadoItemMeta(item.estado)
        const nomeItem = item.item || item.nome || 'Item'
        const numeroItem = `${numero}.${index + 1}`
        const fotosDoItem = item._fotosParaPdf || []
        const primeiroItem = index === 0

        return (
          <View key={item.id} style={styles.itemBlocoComFotos}>
            {/* Bloco de TEXTO (título do ambiente, só no primeiro item
                + nome do item + condição/funcionamento + observação)
                nunca quebra de página — react-pdf empurra o bloco
                inteiro pra página seguinte se não couber, em vez de
                cortar no meio. As fotos ficam FORA desse wrap={false},
                de propósito: só elas podem fluir pra página seguinte
                se não houver espaço, sem arrastar o texto junto. */}
            <View wrap={false}>
              {primeiroItem && (
                <Text style={styles.ambienteTitulo} minPresenceAhead={40}>
                  {numero}. {nomeAmbiente}
                </Text>
              )}
              <Text style={styles.itemNome} minPresenceAhead={20}>
                {numeroItem} {nomeItem}
              </Text>
              <View style={styles.itemCondicaoRow}>
                <View style={[styles.itemDot, { backgroundColor: meta ? meta.color : CORES.border }]} />
                {/* Texto de Condição e o de Funcionamento como <Text>
                    IRMÃOS, não um aninhado dentro do outro — texto
                    aninhado ("rich text") é um ponto conhecido de
                    imprecisão no cálculo de altura do
                    @react-pdf/renderer, e foi exatamente isso que
                    causava o item pular pra outra página mesmo
                    sobrando espaço em branco na atual. */}
                <Text
                  style={
                    meta
                      ? [styles.itemCondicaoTexto, styles.itemCondicaoStatus, { color: meta.color }]
                      : styles.itemCondicaoTexto
                  }
                >
                  {meta ? `Condição: ${meta.label}` : 'Não avaliado'}
                </Text>
                {funcionamentoFoiSelecionado(item.funcionamento) && (
                  <Text style={styles.itemFuncionamentoTexto}>
                    · Funcionamento: {labelFuncionamento(item.funcionamento)}
                  </Text>
                )}
              </View>
              {item.observacao && <Text style={styles.itemObservacao}>{item.observacao}</Text>}
            </View>

            {/* Fotos EXCLUSIVAS deste item, logo em seguida — se não
                houver nenhuma, só a descrição acima e segue pro
                próximo item (sem grade vazia, sem espaço reservado).
                Agrupadas em LINHAS explícitas de 3 (em vez de deixar
                o flexWrap decidir sozinho onde cada foto cai) — cada
                linha é seu próprio wrap={false}. Isso é necessário
                porque wrap={false} só na foto individual, dentro de
                uma grade com flexWrap, não é suficiente pro
                react-pdf: ele ainda cortava fotos ao meio bem na
                margem inferior da página, porque a decisão de quebra
                não enxergava a "linha" como unidade — só via fotos
                soltas. */}
            {fotosDoItem.length > 0 && (
              <View>
                {agruparEmLinhas(fotosDoItem, 3).map((linha, linhaIndex) => (
                  <View key={linhaIndex} style={styles.photosRow} wrap={false}>
                    {linha.map((foto) => {
                      const carimbo = formatarCarimboFoto(foto.created_at)
                      return (
                        <View key={foto.id} style={styles.photoBox}>
                          <View style={styles.photoFrame}>
                            {foto._pdfSrc ? (
                              <Link src={foto.url}>
                                <Image src={foto._pdfSrc} style={styles.photo} />
                              </Link>
                            ) : (
                              <Link src={foto.url}>
                                <View style={styles.photoIndisponivel}>
                                  <Text style={styles.photoIndisponivelTexto}>
                                    Foto indisponível — abrir original
                                  </Text>
                                </View>
                              </Link>
                            )}
                            {carimbo && (
                              <View style={styles.carimboDataHora}>
                                <Text style={styles.carimboDataHoraTexto}>{carimbo}</Text>
                              </View>
                            )}
                          </View>
                          {/* Legenda centralizada com o nome do item —
                              repetida em cada foto de propósito: ajuda
                              a identificar de qual item é a foto mesmo
                              se ela acabar isolada (impressa solta,
                              recortada, etc.). */}
                          <Text style={styles.photoLegenda}>{nomeItem}</Text>
                        </View>
                      )
                    })}
                  </View>
                ))}
              </View>
            )}

            {/* Divisória fina entre itens — participa do fluxo normal
                (não é wrap={false}), então não interfere com a grade
                de fotos podendo atravessar página. */}
            <View style={styles.itemDivisoria} />
          </View>
        )
      })}
    </View>
  )
}

function Encerramento({ vistoria }) {
  return (
    <View>
      {vistoria.observacoes_finais && (
        <View style={styles.observacoesFinaisBox} wrap={false}>
          <Text style={styles.signatureLabel}>Observações finais</Text>
          <Text>{vistoria.observacoes_finais}</Text>
        </View>
      )}

      <View style={styles.termoBox} wrap={false}>
        <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4, color: CORES.brand900 }}>
          Termo de encerramento da vistoria
        </Text>
        <Text>
          Este laudo registra as condições do imóvel constatadas pelo vistoriador responsável na data e horário
          acima, por meio de checklist item a item, com registro fotográfico correspondente. As condições aqui
          descritas refletem o estado do imóvel exclusivamente no momento da vistoria — alterações posteriores à
          finalização não estão cobertas por este documento.
        </Text>
      </View>

      <View style={styles.signatureBox} wrap={false}>
        <Text style={styles.signatureLabel}>Assinatura do vistoriador</Text>
        {vistoria._assinaturaPdfSrc && <Image src={vistoria._assinaturaPdfSrc} style={styles.signatureImg} />}
        <Text>Vistoria concluída em: {formatarData(vistoria.finalizada_em || vistoria.concluida_em)}</Text>
      </View>
    </View>
  )
}

function LaudoDocument({ vistoria, ambientes }) {
  const imovel = vistoria.imoveis || {}

  // Filtro estrito (item 1): só itens com condição efetivamente
  // preenchida (estado != null) entram no corpo do laudo — "Não
  // avaliado" nunca aparece no documento final. Ambientes que ficam
  // sem nenhum item avaliado depois desse filtro somem da lista
  // também, pra não sobrar um título de ambiente vazio. A numeração
  // hierárquica (item 2) é calculada em cima dessa lista já
  // filtrada, então nunca fica com buraco na sequência (ex.: não
  // pula do "1." pro "3." se o "2." tiver sumido por falta de item
  // avaliado).
  const ambientesParaLaudo = ambientes
    .map((amb) => ({
      ...amb,
      vistoria_itens: (amb.vistoria_itens || []).filter((it) => it.estado)
    }))
    .filter((amb) => amb.vistoria_itens.length > 0)

  // Total de fotos = soma de todas as imagens que de fato aparecem no
  // corpo do laudo (ou seja, dos itens avaliados que sobraram depois
  // do filtro acima) — não conta fotos de itens "Não avaliado", já
  // que essas não aparecem em lugar nenhum do documento.
  const totalFotos = ambientesParaLaudo.reduce(
    (soma, amb) =>
      soma + (amb.vistoria_itens || []).reduce((s, it) => s + (it._fotosParaPdf?.length || 0), 0),
    0
  )

  return (
    <Document title={`Laudo de vistoria — ${imovel.codigo_imovel || 'imóvel'}`}>
      <Page size="A4" style={styles.page} wrap>
        <Cabecalho vistoria={vistoria} totalFotos={totalFotos} />
        <InformacoesImovel vistoria={vistoria} />
        <Introducao />
        {/* Resumo executivo continua contando TODOS os itens (avaliados
            ou não) — ele existe pra revelar progresso/pendências, então
            filtrar aqui esconderia justamente o que ele deveria mostrar. */}
        <ResumoExecutivo vistoria={vistoria} ambientes={ambientes} />

        {ambientesParaLaudo.length === 0 ? (
          <Text>Nenhum item avaliado nesta vistoria até o momento.</Text>
        ) : (
          ambientesParaLaudo.map((ambiente, index) => (
            <AmbienteSecao key={ambiente.id} ambiente={ambiente} numero={index + 1} />
          ))
        )}

        <Encerramento vistoria={vistoria} />

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `SEGUE Vistorias · Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}

/**
 * Gera o Blob do PDF pronto pra download/upload. Antes de montar o
 * documento, converte todas as fotos (e a assinatura) pra PNG
 * embutido — ver prepararDadosParaPdf e a nota no topo do arquivo
 * sobre por que isso é necessário (WebP não é suportado pelo
 * renderizador de PDF).
 */
export async function gerarLaudoPdfBlob(vistoria, ambientes) {
  const dados = await prepararDadosParaPdf(vistoria, ambientes)
  const instancia = pdf(<LaudoDocument vistoria={dados.vistoria} ambientes={dados.ambientes} />)
  return await instancia.toBlob()
}
