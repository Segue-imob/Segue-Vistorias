// ------------------------------------------------------------------
// Geração do Laudo de Vistoria em PDF, 100% no navegador (sem
// servidor), via @react-pdf/renderer. Estrutura baseada num modelo de
// laudo real de mercado, adaptada à identidade e aos dados da SEGUE
// Vistorias:
//   1. Cabeçalho com marca + quadro de dados do imóvel/vistoria
//   2. Caixa "Informações do Imóvel" (limpeza, energia, água, gás)
//   3. Introdução + legenda dos parâmetros de condição (Ótimo/Bom/
//      Regular/Ruim), com as cores oficiais de cada um
//   4. Resumo executivo (progresso + condições gerais)
//   5. Detalhamento por ambiente: para cada item, nessa ordem exata —
//      nome do item, linha de status (bolinha colorida de condição +
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
import { Document, Page, Text, View, Image, Link, StyleSheet, pdf } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AGUA_OPCOES,
  ENERGIA_OPCOES,
  ESTADO_LIMPEZA_OPCOES,
  ESTADOS_ITEM_ORDER,
  GAS_OPCOES,
  getEstadoItemMeta,
  getLabelOpcao
} from './vistoriaExecucao'

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
  brandMarkText: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 13 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: CORES.brand900 },
  brandSub: { fontSize: 8, color: CORES.accent, fontFamily: 'Helvetica-Bold' },
  headerRight: { alignItems: 'flex-end' },
  laudoTitulo: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: CORES.brand900 },
  laudoCodigo: { fontSize: 8, color: CORES.brand700, marginTop: 1 },

  // ---- Quadro de informações do imóvel/vistoria ----
  infoBox: {
    borderWidth: 1,
    borderColor: CORES.border,
    borderRadius: 3,
    marginBottom: 14
  },
  infoRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: CORES.border },
  infoRowLast: { borderBottomWidth: 0 },
  infoCell: { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: CORES.border },
  infoCellLast: { borderRightWidth: 0 },
  infoLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: CORES.brand700, marginBottom: 2 },
  infoValue: { fontSize: 9, color: CORES.brand900 },

  // ---- Caixa "Informações do Imóvel" (limpeza/energia/água/gás) ----
  infoImovelBox: {
    borderWidth: 1,
    borderColor: CORES.border,
    borderRadius: 3,
    marginBottom: 14,
    padding: 8
  },
  infoImovelTitulo: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: CORES.brand700,
    marginBottom: 6,
    letterSpacing: 0.5
  },
  infoImovelRow: { flexDirection: 'row' },
  infoImovelCell: { flex: 1, paddingRight: 10, borderRightWidth: 1, borderRightColor: CORES.border },
  infoImovelCellLast: { borderRightWidth: 0, paddingRight: 0 },

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
    backgroundColor: CORES.brand900,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 2
  },
  itemBlocoComFotos: { marginBottom: 12 },
  itemNome: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: CORES.brand900, marginBottom: 2 },
  itemCondicaoRow: { flexDirection: 'row', alignItems: 'center' },
  itemDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  itemCondicaoTexto: { fontSize: 8.5, color: CORES.brand900 },
  itemObservacao: { fontSize: 8, color: CORES.brand700, marginTop: 2, marginLeft: 12, lineHeight: 1.4 },

  // ---- Grade de fotos (até 3 por linha), agora exibida logo abaixo
  // de cada item, com as fotos exclusivas daquele item ----
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  photoBox: { width: 158, marginRight: 8, marginBottom: 8 },
  photo: { width: 158, height: 118, objectFit: 'cover', borderRadius: 2, borderWidth: 1, borderColor: CORES.border },
  photoIndisponivel: {
    width: 158,
    height: 118,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: CORES.border,
    backgroundColor: CORES.cream,
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoIndisponivelTexto: { fontSize: 6, color: CORES.brand700, textAlign: 'center', paddingHorizontal: 6 },

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
 * Combina as fotos vindas de `vistoria_fotos` (join já feito no hook)
 * com quaisquer URLs presentes só em `item.fotos_urls` — cobre o caso
 * de uma foto ter sido salva como rede de segurança em fotos_urls
 * (ver useVistoriaExecucao.addFotoItem) sem uma linha correspondente
 * em vistoria_fotos, o que faria essa foto nunca aparecer no laudo se
 * só olhássemos pra vistoria_fotos.
 */
function coletarFotosDoItem(item) {
  const doJoin = Array.isArray(item.vistoria_fotos) ? item.vistoria_fotos : []
  const urlsJaPresentes = new Set(doJoin.map((f) => f.url))
  const extrasDeFotosUrls = (Array.isArray(item.fotos_urls) ? item.fotos_urls : [])
    .filter((url) => url && !urlsJaPresentes.has(url))
    .map((url, index) => ({ id: `fotos_urls-${item.id}-${index}`, url, created_at: null }))
  return [...doJoin, ...extrasDeFotosUrls]
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

function Cabecalho({ vistoria }) {
  const imovel = vistoria.imoveis || {}
  const endereco = [imovel.endereco, imovel.bairro, imovel.cidade].filter(Boolean).join(', ')

  return (
    <>
      <View style={styles.headerBar} fixed>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>S</Text>
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

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <View style={[styles.infoCell, { flex: 2 }]}>
            <Text style={styles.infoLabel}>ENDEREÇO COMPLETO</Text>
            <Text style={styles.infoValue}>{endereco || '—'}</Text>
          </View>
          <View style={[styles.infoCell, styles.infoCellLast]}>
            <Text style={styles.infoLabel}>TIPO DE VISTORIA</Text>
            <Text style={styles.infoValue}>{vistoria.tipo || '—'}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>DATA/HORA DE INÍCIO</Text>
            <Text style={styles.infoValue}>{formatarData(vistoria.data_agendamento)}</Text>
          </View>
          <View style={[styles.infoCell, styles.infoCellLast]}>
            <Text style={styles.infoLabel}>DATA/HORA DE FINALIZAÇÃO</Text>
            <Text style={styles.infoValue}>{formatarData(vistoria.finalizada_em || vistoria.concluida_em)}</Text>
          </View>
        </View>
        <View style={[styles.infoRow, styles.infoRowLast]}>
          <View style={[styles.infoCell, styles.infoCellLast, { flex: 1 }]}>
            <Text style={styles.infoLabel}>VISTORIADOR RESPONSÁVEL</Text>
            <Text style={styles.infoValue}>{vistoria.vistoriador?.nome || '—'}</Text>
          </View>
        </View>
      </View>
    </>
  )
}

function InformacoesImovel({ vistoria }) {
  return (
    <View style={styles.infoImovelBox} wrap={false}>
      <Text style={styles.infoImovelTitulo}>INFORMAÇÕES DO IMÓVEL</Text>
      <View style={styles.infoImovelRow}>
        <View style={styles.infoImovelCell}>
          <Text style={styles.infoLabel}>ESTADO DE LIMPEZA</Text>
          <Text style={styles.infoValue}>{getLabelOpcao(ESTADO_LIMPEZA_OPCOES, vistoria.estado_limpeza)}</Text>
        </View>
        <View style={styles.infoImovelCell}>
          <Text style={styles.infoLabel}>ENERGIA</Text>
          <Text style={styles.infoValue}>{getLabelOpcao(ENERGIA_OPCOES, vistoria.energia)}</Text>
        </View>
        <View style={styles.infoImovelCell}>
          <Text style={styles.infoLabel}>ÁGUA</Text>
          <Text style={styles.infoValue}>{getLabelOpcao(AGUA_OPCOES, vistoria.agua)}</Text>
        </View>
        <View style={[styles.infoImovelCell, styles.infoImovelCellLast]}>
          <Text style={styles.infoLabel}>GÁS</Text>
          <Text style={styles.infoValue}>{getLabelOpcao(GAS_OPCOES, vistoria.gas)}</Text>
        </View>
      </View>
    </View>
  )
}

// Legenda de condição usada só na Introdução — os títulos aqui usam a
// forma masculina (ÓTIMO/BOM/REGULAR/RUIM, referindo-se a "o item"),
// como pedido explicitamente para este bloco; o resto do laudo e do
// app continua usando ESTADOS_ITEM.label ("Ótima/Boa/Regular/Ruim").
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

function AmbienteSecao({ ambiente }) {
  const itens = ambiente.vistoria_itens || []

  return (
    <View>
      <Text style={styles.ambienteTitulo}>{ambiente.ambiente || ambiente.nome}</Text>

      {itens.map((item) => {
        const meta = getEstadoItemMeta(item.estado)
        const nomeItem = item.item || item.nome || 'Item'
        const fotosDoItem = item._fotosParaPdf || []

        return (
          <View key={item.id} style={styles.itemBlocoComFotos} wrap={false}>
            <Text style={styles.itemNome}>{nomeItem}</Text>
            <View style={styles.itemCondicaoRow}>
              <View style={[styles.itemDot, { backgroundColor: meta ? meta.color : CORES.border }]} />
              <Text style={styles.itemCondicaoTexto}>
                {meta ? `Condição: ${meta.label}` : 'Não avaliado'}
                {item.funcionamento ? `   ·   Funcionamento: ${labelFuncionamento(item.funcionamento)}` : ''}
              </Text>
            </View>
            {item.observacao && <Text style={styles.itemObservacao}>{item.observacao}</Text>}

            {/* Fotos EXCLUSIVAS deste item, logo em seguida — se não
                houver nenhuma, só a descrição acima e segue pro
                próximo item (sem grade vazia, sem espaço reservado). */}
            {fotosDoItem.length > 0 && (
              <View style={styles.photosGrid}>
                {fotosDoItem.map((foto) => (
                  <View key={foto.id} style={styles.photoBox} wrap={false}>
                    {foto._pdfSrc ? (
                      <Link src={foto.url}>
                        <Image src={foto._pdfSrc} style={styles.photo} />
                      </Link>
                    ) : (
                      <Link src={foto.url}>
                        <View style={styles.photoIndisponivel}>
                          <Text style={styles.photoIndisponivelTexto}>Foto indisponível — abrir original</Text>
                        </View>
                      </Link>
                    )}
                  </View>
                ))}
              </View>
            )}
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

  return (
    <Document title={`Laudo de vistoria — ${imovel.codigo_imovel || 'imóvel'}`}>
      <Page size="A4" style={styles.page} wrap>
        <Cabecalho vistoria={vistoria} />
        <InformacoesImovel vistoria={vistoria} />
        <Introducao />
        <ResumoExecutivo vistoria={vistoria} ambientes={ambientes} />

        {ambientes.length === 0 ? (
          <Text>Nenhum ambiente registrado nesta vistoria.</Text>
        ) : (
          ambientes.map((ambiente) => <AmbienteSecao key={ambiente.id} ambiente={ambiente} />)
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
