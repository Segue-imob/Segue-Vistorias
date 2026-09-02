// ------------------------------------------------------------------
// Constantes do checklist de execução de vistoria (perfil Vistoriador).
// ------------------------------------------------------------------

// Última opção de cada grupo relevante ("Outro Ambiente
// (Personalizado)") libera um campo de texto livre na UI, para
// nomear ambientes que não estão na lista (ex.: "Quarto 3", um nome
// bem específico do imóvel).
export const AMBIENTE_PERSONALIZADO = 'Outro Ambiente (Personalizado)'

// Ambientes agrupados por categoria — usado pra montar o <select> com
// <optgroup> no formulário "Adicionar ambiente". Nenhum agrupamento
// dentro do catálogo de itens em si: cada ambiente individual tem seu
// próprio catálogo em ITENS_POR_AMBIENTE, mesmo dois ambientes do
// mesmo grupo (ex. "Banheiro Social" e "Banheiro Suíte") tendo listas
// parecidas mas não idênticas.
export const AMBIENTES_GRUPOS = [
  {
    grupo: 'Ambientes Sociais',
    ambientes: ['Sala de Estar', 'Sala de Jantar', 'Sala de TV', 'Hall de Entrada', 'Lavabo', 'Circulação / Corredor']
  },
  {
    grupo: 'Ambientes Privativos',
    ambientes: ['Quarto', 'Suíte', 'Closet', 'Escritório', 'Quarto de Hóspedes']
  },
  {
    grupo: 'Cozinha e Serviços',
    ambientes: [
      'Cozinha',
      'Copa',
      'Despensa',
      'Área de Serviço',
      'Lavanderia',
      'Banheiro de Serviço',
      'Quarto de Serviço'
    ]
  },
  {
    grupo: 'Banheiros',
    ambientes: ['Banheiro Social', 'Banheiro Suíte', 'Banheiro Externo']
  },
  {
    grupo: 'Áreas Externas e Lazer',
    ambientes: [
      'Varanda',
      'Varanda Gourmet',
      'Sacada',
      'Terraço',
      'Quintal',
      'Jardim',
      'Piscina',
      'Área de Churrasqueira',
      'Garagem',
      'Vaga de Garagem'
    ]
  },
  {
    grupo: 'Comerciais e Apoio',
    ambientes: ['Recepção', 'Sala de Reunião', 'Galpão', 'Loja', 'Mezanino', 'Depósito / Box', AMBIENTE_PERSONALIZADO]
  }
]

// Lista achatada (todos os ambientes, na ordem dos grupos acima) —
// usada onde só interessa "todos os nomes", sem a estrutura de grupo
// (ex.: valor inicial do seletor).
export const AMBIENTES_PADRAO = AMBIENTES_GRUPOS.flatMap((g) => g.ambientes)

// Catálogo de itens específico de cada ambiente individual — cada
// ambiente tem sua própria lista, sem reaproveitar um catálogo
// genérico único pra tudo (ex.: "Varanda" e "Varanda Gourmet" são
// listas completamente diferentes, mesmo os dois sendo áreas
// externas).
export const ITENS_POR_AMBIENTE = {
  // ---- Ambientes Sociais ----
  'Sala de Estar': [
    'Piso',
    'Rodapé',
    'Parede',
    'Teto',
    'Porta',
    'Janela',
    'Interruptores e Tomadas',
    'Luminária',
    'Ponto de TV/Internet'
  ],
  'Sala de Jantar': ['Piso', 'Rodapé', 'Parede', 'Teto', 'Porta', 'Janela', 'Interruptores e Tomadas', 'Luminária'],
  'Sala de TV': [
    'Piso',
    'Rodapé',
    'Parede',
    'Teto',
    'Porta',
    'Janela',
    'Interruptores e Tomadas',
    'Luminária',
    'Ponto de TV/Internet'
  ],
  'Hall de Entrada': ['Piso', 'Rodapé', 'Parede', 'Teto', 'Porta de Entrada', 'Interfone', 'Interruptores e Tomadas', 'Luminária'],
  Lavabo: ['Piso', 'Parede', 'Teto', 'Porta', 'Vaso Sanitário', 'Pia', 'Torneira', 'Espelho', 'Luminária', 'Ventilação'],
  'Circulação / Corredor': ['Piso', 'Rodapé', 'Parede', 'Teto', 'Interruptores e Tomadas', 'Luminária'],

  // ---- Ambientes Privativos ----
  Quarto: [
    'Piso',
    'Rodapé',
    'Parede',
    'Teto',
    'Porta',
    'Janela',
    'Interruptores e Tomadas',
    'Luminária',
    'Armário Embutido'
  ],
  Suíte: [
    'Piso',
    'Rodapé',
    'Parede',
    'Teto',
    'Porta',
    'Janela',
    'Interruptores e Tomadas',
    'Luminária',
    'Armário Embutido',
    'Ar-condicionado'
  ],
  Closet: ['Piso', 'Parede', 'Teto', 'Porta', 'Prateleiras/Cabideiros', 'Iluminação', 'Interruptores e Tomadas'],
  Escritório: [
    'Piso',
    'Rodapé',
    'Parede',
    'Teto',
    'Porta',
    'Janela',
    'Interruptores e Tomadas',
    'Luminária',
    'Ponto de Internet'
  ],
  'Quarto de Hóspedes': [
    'Piso',
    'Rodapé',
    'Parede',
    'Teto',
    'Porta',
    'Janela',
    'Interruptores e Tomadas',
    'Luminária',
    'Armário'
  ],

  // ---- Cozinha e Serviços ----
  Cozinha: [
    'Piso',
    'Parede/Revestimento',
    'Teto',
    'Porta',
    'Janela',
    'Bancada',
    'Pia',
    'Torneira',
    'Armários',
    'Interruptores e Tomadas',
    'Luminária',
    'Coifa/Exaustor'
  ],
  Copa: ['Piso', 'Parede', 'Teto', 'Porta', 'Bancada', 'Armários', 'Interruptores e Tomadas', 'Luminária'],
  Despensa: ['Piso', 'Parede', 'Teto', 'Porta', 'Prateleiras', 'Iluminação'],
  'Área de Serviço': [
    'Piso',
    'Parede',
    'Teto',
    'Tanque',
    'Torneira',
    'Ponto para Máquina de Lavar',
    'Varal',
    'Interruptores e Tomadas',
    'Luminária'
  ],
  Lavanderia: [
    'Piso',
    'Parede',
    'Teto',
    'Bancada',
    'Tanque',
    'Torneira',
    'Ponto para Máquina de Lavar',
    'Interruptores e Tomadas',
    'Luminária'
  ],
  'Banheiro de Serviço': [
    'Piso',
    'Parede',
    'Teto',
    'Porta',
    'Vaso Sanitário',
    'Pia',
    'Torneira',
    'Chuveiro',
    'Luminária',
    'Ventilação'
  ],
  'Quarto de Serviço': ['Piso', 'Rodapé', 'Parede', 'Teto', 'Porta', 'Janela', 'Interruptores e Tomadas', 'Luminária'],

  // ---- Banheiros ----
  'Banheiro Social': [
    'Piso',
    'Parede/Revestimento',
    'Teto',
    'Porta',
    'Vaso Sanitário',
    'Pia',
    'Torneira',
    'Box/Chuveiro',
    'Espelho',
    'Luminária',
    'Ventilação'
  ],
  'Banheiro Suíte': [
    'Piso',
    'Parede/Revestimento',
    'Teto',
    'Porta',
    'Vaso Sanitário',
    'Pia',
    'Torneira',
    'Box/Chuveiro',
    'Espelho',
    'Luminária',
    'Ventilação',
    'Registro de Água Quente'
  ],
  'Banheiro Externo': ['Piso', 'Parede', 'Teto', 'Porta', 'Vaso Sanitário', 'Pia', 'Torneira', 'Chuveiro', 'Luminária'],

  // ---- Áreas Externas e Lazer ----
  Varanda: ['Piso', 'Guarda-Corpo', 'Fechamento de Vidro', 'Teto/Cobertura', 'Iluminação', 'Interruptores e Tomadas'],
  'Varanda Gourmet': ['Bancada', 'Churrasqueira', 'Pia', 'Coifa', 'Piso', 'Iluminação'],
  Sacada: ['Piso', 'Guarda-Corpo', 'Iluminação'],
  Terraço: ['Piso', 'Guarda-Corpo', 'Cobertura', 'Iluminação', 'Ralo'],
  Quintal: ['Portão', 'Gramado', 'Muro', 'Iluminação Externa'],
  Jardim: ['Gramado', 'Sistema de Irrigação', 'Iluminação Externa', 'Muro/Cerca'],
  Piscina: ['Revestimento', 'Borda', 'Filtro/Bomba', 'Iluminação', 'Portão de Segurança'],
  'Área de Churrasqueira': ['Churrasqueira', 'Bancada', 'Piso', 'Iluminação', 'Coifa/Exaustor'],
  Garagem: ['Piso', 'Portão', 'Iluminação', 'Interruptores e Tomadas', 'Teto/Cobertura'],
  'Vaga de Garagem': ['Piso', 'Demarcação', 'Iluminação'],

  // ---- Comerciais e Apoio ----
  Recepção: ['Piso', 'Parede', 'Teto', 'Porta', 'Balcão', 'Iluminação', 'Interruptores e Tomadas', 'Ponto de Internet'],
  'Sala de Reunião': [
    'Piso',
    'Parede',
    'Teto',
    'Porta',
    'Janela',
    'Iluminação',
    'Interruptores e Tomadas',
    'Ponto de Internet/TV'
  ],
  Galpão: ['Piso', 'Portão', 'Estrutura/Telhado', 'Iluminação', 'Instalação Elétrica', 'Ventilação'],
  Loja: ['Piso', 'Vitrine', 'Porta', 'Iluminação', 'Interruptores e Tomadas', 'Teto'],
  Mezanino: ['Piso', 'Guarda-Corpo', 'Escada de Acesso', 'Iluminação'],
  'Depósito / Box': ['Piso', 'Porta/Portão', 'Prateleiras', 'Iluminação']
}

// Catálogo genérico — usado como ponto de partida quando o ambiente
// escolhido é "Outro Ambiente (Personalizado)" ou quando o nome
// digitado não bate com nenhuma chave de ITENS_POR_AMBIENTE (ex.:
// "Quarto 2", variação de um nome já existente).
export const ITENS_PADRAO_GENERICO = [
  'Piso',
  'Rodapé',
  'Parede',
  'Teto',
  'Porta',
  'Janela',
  'Interruptores e Tomadas',
  'Luminária'
]

/** Catálogo de itens de um ambiente específico, com fallback genérico. */
export function getCatalogoItensDoAmbiente(nomeAmbiente) {
  return ITENS_POR_AMBIENTE[nomeAmbiente] || ITENS_PADRAO_GENERICO
}

// Bucket de Storage onde ficam as fotos do checklist e a assinatura
// digital de encerramento.
export const FOTOS_BUCKET = 'vistorias-fotos'

// Limite de fotos por item (exibido como contador "X/30" no upload).
export const MAX_FOTOS_POR_ITEM = 30

// Condição de cada item vistoriado, na ordem exata pedida:
// Ótimo -> Bom -> Regular -> Ruim (nomenclatura padronizada no
// masculino em todo o sistema). Paleta oficial de condição (usada
// tanto no seletor do checklist quanto nas bolinhas/badges do laudo
// em PDF) — propositalmente diferente da paleta de STATUS da
// vistoria (src/lib/constants.js) para não confundir "condição do
// item" com "status da vistoria".
export const ESTADOS_ITEM = {
  otima: {
    value: 'otima',
    label: 'Ótimo',
    color: '#2563EB',
    bg: 'bg-[#2563EB]/10',
    text: 'text-[#2563EB]'
  },
  boa: {
    value: 'boa',
    label: 'Bom',
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

function removerAcentos(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Remove caracteres inválidos em nome de arquivo em qualquer sistema operacional. */
function sanitizarNomeArquivo(texto) {
  return texto.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Monta o nome do arquivo do laudo: "Vistoria {Tipo} - CI {Código} -
 * {Nome do Edifício}.pdf" (ex.: "Vistoria Saida - CI 99 - Ed.
 * Nautilus.pdf"). Sem acento de propósito (bate com o exemplo dado:
 * "Saida", não "Saída") — evita problemas de nome de arquivo em
 * downloads/anexos de e-mail em alguns sistemas.
 *
 * IMPORTANTE: não existe uma coluna própria de "nome do edifício" em
 * `imoveis` (só `endereco`, `bairro`, `cidade`, `codigo_imovel`) — o
 * endereço completo é usado no lugar. Se quiser o nome curto do
 * prédio (tipo "Ed. Nautilus") de verdade no nome do arquivo, é
 * preciso cadastrar isso em algum campo próprio.
 */
export function montarNomeArquivoLaudo(vistoria) {
  const imovel = vistoria?.imoveis || {}
  const tipo = vistoria?.tipo || 'Vistoria'
  const codigo = imovel.codigo_imovel || '—'
  const nomeImovel = imovel.endereco || 'Imóvel'

  const nome = `Vistoria ${tipo} - CI ${codigo} - ${nomeImovel}`
  return `${sanitizarNomeArquivo(removerAcentos(nome))}.pdf`
}
