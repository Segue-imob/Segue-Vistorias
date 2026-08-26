import { ShieldAlert, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function AccessMessage({ title, description, showSignOut = false }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <ShieldAlert size={22} />
      </div>
      <h1 className="text-lg font-bold text-brand-900">{title}</h1>
      <p className="max-w-sm text-sm text-slate-500">{description}</p>
      {showSignOut && (
        <button type="button" onClick={() => supabase.auth.signOut()} className="btn-secondary mt-2">
          <LogOut size={14} /> Sair
        </button>
      )}
    </div>
  )
}
