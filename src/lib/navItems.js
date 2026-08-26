import { CalendarDays, ClipboardList, ClipboardCheck, Users2 } from 'lucide-react'

// `permission` referencia uma chave de PERMISSIONS (src/lib/permissions.js).
// Sidebar.jsx e Layout.jsx (menu mobile) filtram esta lista pelo role do
// usuário logado, então adicionar um item aqui já o deixa protegido nos
// dois lugares.
export const NAV_ITEMS = [
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, permission: 'viewAgenda' },
  { to: '/vistorias', label: 'Vistorias', icon: ClipboardList, permission: 'viewVistorias' },
  { to: '/minhas-vistorias', label: 'Minhas Vistorias', icon: ClipboardCheck, permission: 'viewMinhasVistorias' },
  { to: '/usuarios', label: 'Usuários', icon: Users2, permission: 'viewUsuarios' }
]
