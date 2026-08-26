// ------------------------------------------------------------------
// Constantes do checklist de execução de vistoria (perfil Vistoriador).
// ------------------------------------------------------------------

// Última opção ("Outro") libera um campo de texto livre na UI, para
// nomear ambientes repetidos (ex.: "Quarto 1", "Quarto 2").
export const AMBIENTES_PADRAO = ['Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Varanda', 'Outro']

export const ITENS_PADRAO = ['Piso', 'Parede', 'Teto', 'Portas', 'Janelas', 'Tomadas/Interruptores']

// Estados possíveis para cada item vistoriado. Cores propositalmente
// diferentes da paleta de STATUS da vistoria (src/lib/constants.js)
// para não confundir "estado do item" com "status da vistoria".
export const ESTADOS_ITEM = {
  bom: {
    value: 'bom',
    label: 'Bom',
    color: '#22C55E',
    bg: 'bg-[#22C55E]/10',
    text: 'text-[#15803D]'
  },
  regular: {
    value: 'regular',
    label: 'Regular',
    color: '#F59E0B',
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#B45309]'
  },
  avariado: {
    value: 'avariado',
    label: 'Avariado',
    color: '#EF4444',
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#B91C1C]'
  },
  ausente: {
    value: 'ausente',
    label: 'Ausente',
    color: '#64748B',
    bg: 'bg-[#64748B]/10',
    text: 'text-[#334155]'
  }
}

export const ESTADOS_ITEM_ORDER = ['bom', 'regular', 'avariado', 'ausente']

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
