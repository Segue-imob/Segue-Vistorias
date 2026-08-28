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
// Ótima -> Boa -> Regular -> Ruim. Paleta oficial de condição (usada
// tanto no seletor do checklist quanto nas bolinhas/badges do laudo
// em PDF) — propositalmente diferente da paleta de STATUS da
// vistoria (src/lib/constants.js) para não confundir "condição do
// item" com "status da vistoria".
export const ESTADOS_ITEM = {
  otima: {
    value: 'otima',
    label: 'Ótima',
    color: '#2563EB',
    bg: 'bg-[#2563EB]/10',
    text: 'text-[#2563EB]'
  },
  boa: {
    value: 'boa',
    label: 'Boa',
    color: '#16A34A',
    bg: 'bg-[#16A34A]/10',
    text: 'text-[#16A34A]'
  },
  regular: {
    value: 'regular',
    label: 'Regular',
    color: '#CA8A04',
    bg: 'bg-[#CA8A04]/10',
    text: 'text-[#CA8A04]'
  },
  ruim: {
    value: 'ruim',
    label: 'Ruim',
    color: '#DC2626',
    bg: 'bg-[#DC2626]/10',
    text: 'text-[#DC2626]'
  }
}

export const ESTADOS_ITEM_ORDER = ['otima', 'boa', 'regular', 'ruim']

// Funcionamento (para eletros/eletrônicos) — independente da condição.
export const FUNCIONAMENTO_OPCOES = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' }
]

// ------------------------------------------------------------------
// Informações Gerais do Imóvel — campo único por vistoria (não por
// ambiente/item), gravado direto em `vistorias`.
// ------------------------------------------------------------------
export const ESTADO_LIMPEZA_OPCOES = [
  { value: 'limpo', label: 'Limpo' },
  { value: 'empoeirado', label: 'Empoeirado' },
  { value: 'sujo', label: 'Sujo' }
]

export const ENERGIA_OPCOES = [
  { value: 'ligada', label: 'Ligada' },
  { value: 'desligada', label: 'Desligada' }
]

export const AGUA_OPCOES = [
  { value: 'ligada', label: 'Ligada' },
  { value: 'desligada', label: 'Desligada' }
]

export const GAS_OPCOES = [
  { value: 'ligado', label: 'Ligado' },
  { value: 'desligado', label: 'Desligado' }
]

/** Acha o rótulo em português de um valor dentro de uma lista de opções. */
export function getLabelOpcao(opcoes, valor) {
  return opcoes.find((o) => o.value === valor)?.label || '—'
}

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
