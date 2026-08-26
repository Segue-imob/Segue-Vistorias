import { useState } from 'react'
import { Plus, Loader2, Pencil, Search } from 'lucide-react'
import { useProfiles } from '../hooks/useProfiles'
import UsuarioModal from '../components/UsuarioModal'
import { getRoleLabel } from '../lib/permissions'

export default function Usuarios() {
  const { profiles, loading, createProfile, updateProfile, toggleAtivo } = useProfiles()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = profiles.filter((p) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return p.nome?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term)
  })

  const handleSubmit = async (form, id) => {
    if (id) {
      await updateProfile(id, {
        nome: form.nome,
        telefone: form.telefone,
        role: form.role,
        ativo: form.ativo
      })
    } else {
      await createProfile(form)
    }
  }

  const openCreate = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-500">Gerencie a equipe com acesso ao SEGUE Vistorias.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field !pl-9"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent/10 text-xs font-bold text-brand-accent">
                        {user.nome?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800">{user.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleAtivo(user.id, !user.ativo)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        user.ativo ? 'bg-[#4CAF50]/10 text-[#2E7D32]' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(user)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Editar usuário"
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <UsuarioModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} usuario={editingUser} />
    </div>
  )
}
