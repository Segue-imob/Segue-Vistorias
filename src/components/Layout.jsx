import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Search, Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { NAV_ITEMS } from '../lib/navItems'
import { useAuth } from '../context/AuthContext'
import { PERMISSIONS } from '../lib/permissions'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role } = useAuth()
  const visibleItems = NAV_ITEMS.filter((item) => PERMISSIONS[item.permission](role))

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Topbar mobile */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-border bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent">
            <Search size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-bold text-brand-900">SEGUE Vistorias</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-2 text-slate-600 hover:bg-brand-cream"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {mobileOpen && (
        <div className="border-b border-brand-border bg-white px-3 py-2 md:hidden">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-brand-accent/10 text-brand-accent' : 'text-slate-600'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
