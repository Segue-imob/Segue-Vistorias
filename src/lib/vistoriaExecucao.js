// ------------------------------------------------------------------
// Constantes do checklist de execução de vistoria (perfil Vistoriador).
// ------------------------------------------------------------------

// Última opção ("Outro") libera um campo de texto livre na UI, para
// nomear ambientes repetidos (ex.: "Quarto 1", "Quarto 2").
export const AMBIENTES_PADRAO = ['Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Varanda', 'Outro']

// Itens padrão carregados automaticamente ao criar um ambiente. O
// vistoriador ainda pode adicionar itens personalizados por cima
// desses com "+ Adicionar Outro Item".
export const ITENS_PADRAO = [
  'Piso',
  'Rodapé',
  'Parede',
  'Teto',
  'Porta',
  'Janela',
  'Interruptores e Tomadas',
  'Luminária',
  'Armário',
  'Bancada da Pia',
  'Torneira',
  'Tanque'
]

// Bucket de Storage onde ficam as fotos do checklist e a assinatura
// digital de encerramento.
export const FOTOS_BUCKET = 'vistorias-fotos'

// Limite de fotos por item (exibido como contador "X/30" no upload).
export const MAX_FOTOS_POR_ITEM = 30

// Condição de cada item vistoriado, na ordem exata pedida:
// Ótima -> Boa -> Regular -> Ruim. Cores propositalmente diferentes
// da paleta de STATUS da vistoria (src/lib/constants.js) para não
// confundir "condição do item" com "status da vistoria".
export const ESTADOS_ITEM = {
  otima: {
    value: 'otima',
    label: 'Ótima',
    color: '#16A34A',
    bg: 'bg-[#16A34A]/10',
    text: 'text-[#15803D]'
  },
  boa: {
    value: 'boa',
    label: 'Boa',
    color: '#65A30D',
    bg: 'bg-[#65A30D]/10',
    text: 'text-[#4D7C0F]'
  },
  regular: {
    value: 'regular',
    label: 'Regular',
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#B45309]'
  },
  ruim: {
    value: 'ruim',
    label: 'Ruim',
    color: '#DC2626',
    bg: 'bg-[#DC2626]/10',
    text: 'text-[#B91C1C]'
  }
}

export const ESTADOS_ITEM_ORDER = ['otima', 'boa', 'regular', 'ruim']

// Funcionamento (para eletros/eletrônicos) — independente da condição.
export const FUNCIONAMENTO_OPCOES = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' }
]

export function getEstadoItemMeta(estado) {
  return ESTADOS_ITEM[estado] || null
}

/** Monta a URL de busca do Google Maps a partir dos dados do imóvel. */
export function buildMapsUrl(imovel) {
  if (!imovel) return null
  const partes = [imovel.endereco, imovel.bairro, imovel.cidade].filter(Boolean)
  if (partes.length === 0) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(', '))}`
}
