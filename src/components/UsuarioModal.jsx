import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import PasswordField from './PasswordField'
import { PERFIS_USUARIO } from '../lib/constants'
import { normalizeRole } from '../lib/permissions'

const emptyForm = {
  nome: '',
  email: '',
  telefone: '',
  role: 'vistoriador',
  ativo: true,
  password: '',
  confirmPassword: ''
}

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
              // Normaliza para o valor canônico ('admin'/'gestao'/'vistoriador')
              // caso o registro tenha sido salvo com o rótulo em português.
              role: normalizeRole(usuario.role) || 'vistoriador',
              ativo: usuario.ativo,
              password: '',
              confirmPassword: ''
            }
          : emptyForm
      )
      setErrorMsg('')
    }
  }, [open, usuario])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!form.nome || !form.email || !form.role) {
      setErrorMsg('Preencha nome, e-mail e perfil.')
      return
    }

    // Senha só é exigida no cadastro — para trocar a senha de um usuário
    // existente, use "Alterar senha" no menu de ações da lista.
    if (!isEdit) {
      if (!form.password || !form.confirmPassword) {
        setErrorMsg('Informe a senha de acesso e a confirmação.')
        return
      }
      if (form.password.length < 6) {
        setErrorMsg('A senha precisa ter pelo menos 6 caracteres.')
        return
      }
      if (form.password !== form.confirmPassword) {
        setErrorMsg('As senhas não coincidem.')
        return
      }
    }

    setSubmitting(true)
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
          <input
            className="input-field"
            value={form.nome}
            onChange={handleChange('nome')}
            placeholder="Ex: Ana Souza"
          />
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
          {isEdit && (
            <p className="mt-1 text-xs text-slate-400">O e-mail não pode ser alterado após o cadastro.</p>
          )}
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
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {!isEdit && (
          <>
            <PasswordField
              id="novo-usuario-senha"
              label="Senha de acesso *"
              value={form.password}
              onChange={handleChange('password')}
            />
            <PasswordField
              id="novo-usuario-confirmar-senha"
              label="Confirmar senha *"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
            />
          </>
        )}

        {isEdit && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Para alterar a senha deste usuário, use a opção <strong>Alterar senha</strong> no menu de ações
            da lista.
          </p>
        )}

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
