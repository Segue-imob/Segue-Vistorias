import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import { PERFIS_USUARIO } from '../lib/constants'

const emptyForm = { nome: '', email: '', telefone: '', role: PERFIS_USUARIO[0], ativo: true }

export default function UsuarioModal({ open, onClose, onSubmit, usuario }) {
  const isEdit = Boolean(usuario)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      setForm(
        usuario
          ? {
              nome: usuario.nome || '',
              email: usuario.email || '',
              telefone: usuario.telefone || '',
              role: usuario.role,
              ativo: usuario.ativo
            }
          : emptyForm
      )
      setErrorMsg('')
    }
  }, [open, usuario])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome || !form.email || !form.role) {
      setErrorMsg('Preencha nome, e-mail e perfil.')
      return
    }
    setSubmitting(true)
    setErrorMsg('')
    try {
      await onSubmit(form, usuario?.id)
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar usuário.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar usuário' : 'Cadastrar usuário'}
      subtitle={isEdit ? usuario?.email : 'Adicione um novo membro à equipe'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-field">Nome completo *</label>
          <input className="input-field" value={form.nome} onChange={handleChange('nome')} placeholder="Ex: Ana Souza" />
        </div>

        <div>
          <label className="label-field">E-mail *</label>
          <input
            type="email"
            className="input-field"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="ana.souza@segueimoveis.com.br"
            disabled={isEdit}
          />
          {isEdit && <p className="mt-1 text-xs text-slate-400">O e-mail não pode ser alterado após o cadastro.</p>}
        </div>

        <div>
          <label className="label-field">Telefone</label>
          <input
            className="input-field"
            value={form.telefone}
            onChange={handleChange('telefone')}
            placeholder="(11) 99999-0000"
          />
        </div>

        <div>
          <label className="label-field">Perfil / Função *</label>
          <select className="input-field" value={form.role} onChange={handleChange('role')}>
            {PERFIS_USUARIO.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-700">Usuário ativo</p>
            <p className="text-xs text-slate-400">Usuários inativos não aparecem nos filtros de agenda.</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, ativo: !f.ativo }))}
            className={`relative h-6 w-11 rounded-full transition ${form.ativo ? 'bg-brand-accent' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                form.ativo ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {errorMsg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{errorMsg}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {isEdit ? 'Salvar alterações' : 'Cadastrar usuário'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
