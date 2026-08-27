// ------------------------------------------------------------------
// Geração do Laudo de Vistoria em PDF, 100% no navegador (sem
// servidor), via @react-pdf/renderer. Estrutura baseada num modelo de
// laudo real de mercado, adaptada à identidade e aos dados da SEGUE
// Vistorias:
//   1. Cabeçalho com marca + quadro de dados do imóvel/vistoria
//   2. Resumo executivo (progresso + condições gerais)
//   3. Detalhamento por ambiente (tabela Item/Condição/Funcionamento/Obs.)
//   4. Galeria de fotos de cada ambiente, logo após a respectiva tabela
//      (as fotos já saem do upload com a marca d'água de data/hora
//      queimada nos próprios pixels — ver src/lib/imageProcessing.js)
//   5. Encerramento: observações finais, termo de responsabilidade e
//      assinatura digital com data de conclusão
// ------------------------------------------------------------------
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ESTADOS_ITEM_ORDER, getEstadoItemMeta } from './vistoriaExecucao'

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

  // ---- Ambiente: título + tabela ----
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
  table: { borderWidth: 1, borderColor: CORES.border, marginBottom: 6 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: CORES.border },
  trLast: { borderBottomWidth: 0 },
  thCell: {
    flex: 1,
    padding: 4,
    backgroundColor: CORES.cream,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: CORES.brand900
  },
  tdCell: { flex: 1, padding: 4, fontSize: 8 },
  colItem: { flex: 1.6 },
  colObs: { flex: 2.2 },

  // ---- Galeria de fotos ----
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2, marginBottom: 12 },
  photoBox: { width: 158, marginRight: 8, marginBottom: 8 },
  photoLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: CORES.brand700, marginBottom: 2 },
  photo: { width: 158, height: 118, objectFit: 'cover', borderRadius: 2, borderWidth: 1, borderColor: CORES.border },

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
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>VISTORIADOR RESPONSÁVEL</Text>
            <Text style={styles.infoValue}>{vistoria.vistoriador?.nome || '—'}</Text>
          </View>
          <View style={[styles.infoCell, styles.infoCellLast]}>
            <Text style={styles.infoLabel}>SOLICITANTE</Text>
            <Text style={styles.infoValue}>{vistoria.solicitante?.nome || '—'}</Text>
          </View>
        </View>
      </View>
    </>
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
  const fotos = itens.flatMap((it) => (it.vistoria_fotos || []).map((foto) => ({ foto, item: it })))

  return (
    <View>
      <Text style={styles.ambienteTitulo}>{ambiente.ambiente || ambiente.nome}</Text>

      <View style={styles.table} wrap={false}>
        <View style={styles.tr}>
          <Text style={[styles.thCell, styles.colItem]}>Item</Text>
          <Text style={styles.thCell}>Condição</Text>
          <Text style={styles.thCell}>Funcionamento</Text>
          <Text style={[styles.thCell, styles.colObs]}>Observações</Text>
        </View>
        {itens.map((item, index) => {
          const meta = getEstadoItemMeta(item.estado)
          const isLast = index === itens.length - 1
          return (
            <View key={item.id} style={[styles.tr, isLast ? styles.trLast : null]}>
              <Text style={[styles.tdCell, styles.colItem]}>{item.item || item.nome}</Text>
              <Text style={styles.tdCell}>{meta ? meta.label : 'Não avaliado'}</Text>
              <Text style={styles.tdCell}>{labelFuncionamento(item.funcionamento)}</Text>
              <Text style={[styles.tdCell, styles.colObs]}>{item.observacao || '—'}</Text>
            </View>
          )
        })}
      </View>

      {fotos.length > 0 && (
        <View style={styles.photosGrid}>
          {fotos.map(({ foto, item }) => (
            <View key={foto.id} style={styles.photoBox}>
              <Text style={styles.photoLabel}>{item.item || item.nome}</Text>
              <Image src={foto.url} style={styles.photo} />
            </View>
          ))}
        </View>
      )}
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
        {vistoria.assinatura_url && <Image src={vistoria.assinatura_url} style={styles.signatureImg} />}
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

/** Gera o Blob do PDF pronto pra download/upload. */
export async function gerarLaudoPdfBlob(vistoria, ambientes) {
  const instancia = pdf(<LaudoDocument vistoria={vistoria} ambientes={ambientes} />)
  return await instancia.toBlob()
}
