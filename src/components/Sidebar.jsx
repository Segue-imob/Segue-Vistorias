import { NavLink } from 'react-router-dom'
import { CalendarDays, ClipboardList, Users2, Building2, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/vistorias', label: 'Vistorias', icon: ClipboardList },
  { to: '/usuarios', label: 'Usuários', icon: Users2 }
]

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 text-slate-200 md:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-accent">
          <Building2 size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-white">SEGUE</p>
          <p className="text-[11px] font-medium text-slate-400">Vistorias</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-accent text-white shadow-sm'
                  : 'text-slate-400 hover:bg-brand-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-brand-800 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3.5 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accentLight/20 text-xs font-bold text-brand-accentLight">
            SV
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">SEGUE Imobiliária</p>
            <p className="truncate text-xs text-slate-500">Painel de vistorias</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-brand-800 hover:text-white"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
