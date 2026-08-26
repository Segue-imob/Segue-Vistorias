// Fonte única de verdade para status de vistoria, cores oficiais e tipos.
// Os valores (value) devem bater exatamente com os dados salvos na coluna
// `status` da tabela `vistorias` no Supabase.

export const STATUS = {
  agendada: {
    value: 'agendada',
    label: 'Agendada',
    color: '#2196F3',
    bg: 'bg-[#2196F3]',
    bgSoft: 'bg-[#2196F3]/10',
    text: 'text-[#2196F3]',
    ring: 'ring-[#2196F3]/30'
  },
  aceita: {
    value: 'aceita',
    label: 'Aceita',
    color: '#FFC107',
    bg: 'bg-[#FFC107]',
    bgSoft: 'bg-[#FFC107]/10',
    text: 'text-[#B98600]',
    ring: 'ring-[#FFC107]/30'
  },
  finalizada: {
    value: 'finalizada',
    label: 'Finalizada',
    color: '#4CAF50',
    bg: 'bg-[#4CAF50]',
    bgSoft: 'bg-[#4CAF50]/10',
    text: 'text-[#2E7D32]',
    ring: 'ring-[#4CAF50]/30'
  },
  cancelada: {
    value: 'cancelada',
    label: 'Cancelada',
    color: '#F44336',
    bg: 'bg-[#F44336]',
    bgSoft: 'bg-[#F44336]/10',
    text: 'text-[#C62828]',
    ring: 'ring-[#F44336]/30'
  }
}

export const STATUS_ORDER = ['agendada', 'aceita', 'finalizada', 'cancelada']

export const KANBAN_COLUMNS = [
  { status: 'agendada', title: 'Agendadas' },
  { status: 'aceita', title: 'Aceitas' },
  { status: 'finalizada', title: 'Finalizadas' },
  { status: 'cancelada', title: 'Canceladas' }
]

export const TIPOS_VISTORIA = ['Entrada', 'Saída', 'Conferência']

// Valores canônicos gravados na coluna `role` de profiles + rótulo em
// português exibido na UI. Veja src/lib/permissions.js para a lógica
// de normalização (aceita também o rótulo em português já salvo no banco).
export const PERFIS_USUARIO = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestao', label: 'Gestão' },
  { value: 'vistoriador', label: 'Vistoriador' }
]

export function getStatusMeta(status) {
  return STATUS[status] || STATUS.agendada
}
