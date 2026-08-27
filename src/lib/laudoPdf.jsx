// ------------------------------------------------------------------
// Geração do laudo em PDF, 100% no navegador (sem servidor), via
// @react-pdf/renderer. As fotos aqui já chegam com a marca d'água de
// data/hora "queimada" nos pixels (ver src/lib/imageProcessing.js) —
// então exibi-las no laudo já satisfaz o requisito de marca d'água,
// sem precisar redesenhar nada.
// ------------------------------------------------------------------
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getEstadoItemMeta } from './vistoriaExecucao'

const CORES = {
  accent: '#a64324',
  brand900: '#261912',
  brand700: '#593825',
  cream: '#f1ede5',
  border: '#bfb8ae'
}

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: CORES.brand900 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: CORES.accent,
    paddingBottom: 8,
    marginBottom: 14
  },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: CORES.accent },
  brandSub: { fontSize: 8, color: CORES.brand700, marginTop: 1 },
  imovelInfo: { fontSize: 8, textAlign: 'right', maxWidth: 260 },
  imovelLinha: { marginBottom: 1 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    color: CORES.brand900
  },
  table: { borderWidth: 1, borderColor: CORES.border, marginBottom: 6 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: CORES.border },
  trLast: { borderBottomWidth: 0 },
  thCell: {
    flex: 1,
    padding: 4,
    backgroundColor: CORES.cream,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8
  },
  tdCell: { flex: 1, padding: 4, fontSize: 8 },
  colItem: { flex: 1.6 },
  colObs: { flex: 2.2 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2, marginBottom: 10 },
  photoBox: { width: 96, height: 72, margin: 3 },
  photo: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 },
  observacoesFinaisBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: CORES.border,
    borderRadius: 3,
    padding: 8,
    backgroundColor: CORES.cream
  },
  signatureBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: CORES.border, paddingTop: 10 },
  signatureLabel: { fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  signatureImg: { width: 180, height: 70, objectFit: 'contain', marginBottom: 4 },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 30,
    right: 30,
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

function LaudoDocument({ vistoria, ambientes }) {
  const imovel = vistoria.imoveis || {}
  const nomeImovel = imovel.codigo_imovel || 'Imóvel'
  const endereco = [imovel.endereco, imovel.bairro, imovel.cidade].filter(Boolean).join(', ')

  return (
    <Document title={`Laudo de vistoria — ${nomeImovel}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBar} fixed>
          <View>
            <Text style={styles.brand}>SEGUE Vistorias</Text>
            <Text style={styles.brandSub}>Laudo de vistoria — SEGUE Imobiliária</Text>
          </View>
          <View style={styles.imovelInfo}>
            <Text style={styles.imovelLinha}>
              {nomeImovel} {endereco ? `— ${endereco}` : ''}
            </Text>
            <Text style={styles.imovelLinha}>Tipo de vistoria: {vistoria.tipo || '—'}</Text>
            <Text style={styles.imovelLinha}>Data agendada: {formatarData(vistoria.data_agendamento)}</Text>
            {(imovel.inquilino_nome || imovel.proprietario_nome) && (
              <Text style={styles.imovelLinha}>
                {imovel.inquilino_nome ? `Inquilino: ${imovel.inquilino_nome}` : ''}
                {imovel.inquilino_nome && imovel.proprietario_nome ? ' · ' : ''}
                {imovel.proprietario_nome ? `Proprietário: ${imovel.proprietario_nome}` : ''}
              </Text>
            )}
          </View>
        </View>

        {ambientes.length === 0 && <Text>Nenhum ambiente registrado nesta vistoria.</Text>}

        {ambientes.map((ambiente) => {
          const itens = ambiente.vistoria_itens || []
          const fotosDoAmbiente = itens.flatMap((it) => it.vistoria_fotos || [])

          return (
            <View key={ambiente.id} wrap={false}>
              <Text style={styles.sectionTitle}>{ambiente.ambiente || ambiente.nome}</Text>

              <View style={styles.table}>
                <View style={styles.tr}>
                  <Text style={[styles.thCell, styles.colItem]}>Item</Text>
                  <Text style={styles.thCell}>Condição</Text>
                  <Text style={styles.thCell}>Funcionamento</Text>
                  <Text style={[styles.thCell, styles.colObs]}>Observações</Text>
                </View>
                {itens.map((item, index) => {
                  const meta = getEstadoItemMeta(item.estado)
                  const funcionamentoLabel =
                    item.funcionamento === 'sim' ? 'Sim' : item.funcionamento === 'nao' ? 'Não' : '—'
                  const isLast = index === itens.length - 1
                  return (
                    <View key={item.id} style={[styles.tr, isLast ? styles.trLast : null]}>
                      <Text style={[styles.tdCell, styles.colItem]}>{item.item || item.nome}</Text>
                      <Text style={styles.tdCell}>{meta ? meta.label : 'Não avaliado'}</Text>
                      <Text style={styles.tdCell}>{funcionamentoLabel}</Text>
                      <Text style={[styles.tdCell, styles.colObs]}>{item.observacao || '—'}</Text>
                    </View>
                  )
                })}
              </View>

              {fotosDoAmbiente.length > 0 && (
                <View style={styles.photosGrid}>
                  {fotosDoAmbiente.map((foto) => (
                    <View key={foto.id} style={styles.photoBox}>
                      <Image src={foto.url} style={styles.photo} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}

        {vistoria.observacoes_finais && (
          <View style={styles.observacoesFinaisBox} wrap={false}>
            <Text style={styles.signatureLabel}>Observações finais</Text>
            <Text>{vistoria.observacoes_finais}</Text>
          </View>
        )}

        <View style={styles.signatureBox} wrap={false}>
          <Text style={styles.signatureLabel}>Assinatura do vistoriador</Text>
          {vistoria.assinatura_url && <Image src={vistoria.assinatura_url} style={styles.signatureImg} />}
          <Text>Vistoria encerrada em: {formatarData(vistoria.finalizada_em || vistoria.concluida_em)}</Text>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `SEGUE Vistorias · Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}

/** Gera o Blob do PDF pronto pra download/upload. */
export async function gerarLaudoPdfBlob(vistoria, ambientes) {
  const instancia = pdf(<LaudoDocument vistoria={vistoria} ambientes={ambientes} />)
  return await instancia.toBlob()
}
