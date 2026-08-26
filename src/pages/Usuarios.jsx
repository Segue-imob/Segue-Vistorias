import { useEffect, useRef, useState } from 'react'
import { Plus, Loader2, MoreVertical, Pencil, KeyRound, Search } from 'lucide-react'
import { useProfiles } from '../hooks/useProfiles'
import UsuarioModal from '../components/UsuarioModal'
import ResetPasswordModal from '../components/ResetPasswordModal'
import SuccessBanner from '../components/SuccessBanner'
import WarningBanner from '../components/WarningBanner'
import { getRoleLabel } from '../lib/permissions'

export default function Usuarios() {
  const { profiles, loading, createUserWithAuth, updateProfile, resetUserPassword, toggleAtivo } = useProfiles()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetUser, setResetUser] = useState(null)

  const [openMenuId, setOpenMenuId] = useState(null)
  const [search, setSearch] = useState('')

  const [successMsg, setSuccessMsg] = useState('')
  const [warningMsg, setWarningMsg] = useState('')
  const [pageErrorMsg, setPageErrorMsg] = useState('')
  const bannerTimeoutRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(bannerTimeoutRef.current)
  }, [])

  const showSuccess = (message) => {
    setWarningMsg('')
    setSuccessMsg(message)
    clearTimeout(bannerTimeoutRef.current)
    bannerTimeoutRef.current = setTimeout(() => setSuccessMsg(''), 4000)
  }

  // Aviso "sucesso parcial": o perfil foi salvo, mas não foi possível
  // criar o login em Supabase Auth (ver createUserWithAuth). Fica mais
  // tempo na tela porque exige uma ação manual do Administrador depois.
  const showWarning = (message) => {
    setSuccessMsg('')
    setWarningMsg(message)
    clearTimeout(bannerTimeoutRef.current)
    bannerTimeoutRef.current = setTimeout(() => setWarningMsg(''), 10000)
  }

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
      showSuccess('Perfil atualizado com sucesso!')
    } else {
      const result = await createUserWithAuth(form)
      if (result.authCreated) {
        showSuccess('Usuário cadastrado com sucesso!')
      } else {
        showWarning(
          `O perfil de "${form.nome}" foi salvo, mas não foi possível criar o login automaticamente. ` +
            'Crie a conta desta pessoa em Authentication > Users no Supabase, usando o mesmo e-mail, ' +
            `e defina o ID dela como ${result.id} — só assim ela conseguirá entrar no sistema.`
        )
      }
    }
  }

  const handleResetPassword = async (userId, password) => {
    await resetUserPassword(userId, password)
    showSuccess('Senha atualizada com sucesso!')
  }

  const handleToggleAtivo = async (user) => {
    setPageErrorMsg('')
    try {
      await toggleAtivo(user.id, !user.ativo)
    } catch (err) {
      setPageErrorMsg(err.message || 'Erro ao atualizar status do usuário.')
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

  const openResetPassword = (user) => {
    setResetUser(user)
    setResetModalOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">Usuários</h1>
          <p className="text-sm text-slate-500">Gerencie a equipe com acesso ao SEGUE Vistorias.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      <SuccessBanner message={successMsg} />
      <WarningBanner message={warningMsg} />
      {pageErrorMsg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{pageErrorMsg}</p>
      )}

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
              <tr className="border-b border-brand-border/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-brand-border/50 last:border-0 hover:bg-brand-cream/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent/10 text-xs font-bold text-brand-accent">
                        {user.nome?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-brand-900">{user.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-cream px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(user)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        user.ativo ? 'bg-[#4CAF50]/10 text-[#2E7D32]' : 'bg-brand-cream text-slate-500'
                      }`}
                    >
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-brand-cream hover:text-slate-700"
                      title="Ações"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === user.id && (
                      <div className="absolute right-4 z-10 mt-1 w-48 rounded-lg border border-brand-border/70 bg-white py-1 shadow-modal">
                        <button
                          type="button"
                          onClick={() => {
                            openEdit(user)
                            setOpenMenuId(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-brand-cream"
                        >
                          <Pencil size={13} /> Editar perfil
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            openResetPassword(user)
                            setOpenMenuId(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-brand-cream"
                        >
                          <KeyRound size={13} /> Alterar senha
                        </button>
                      </div>
                    )}
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
      <ResetPasswordModal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        usuario={resetUser}
        onSubmit={handleResetPassword}
      />
    </div>
  )
}
