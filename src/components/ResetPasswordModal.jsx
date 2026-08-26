import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import PasswordField from './PasswordField'

export default function ResetPasswordModal({ open, onClose, usuario, onSubmit }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirmPassword('')
      setErrorMsg('')
    }
  }, [open, usuario])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!password || !confirmPassword) {
      setErrorMsg('Informe a nova senha e a confirmação.')
      return
    }
    if (password.length < 6) {
      setErrorMsg('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(usuario.id, password)
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao redefinir a senha.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alterar senha"
      subtitle={usuario ? `Definir nova senha para ${usuario.nome}` : ''}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="reset-nova-senha"
          label="Nova senha *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          id="reset-confirmar-senha"
          label="Confirmar nova senha *"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {errorMsg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{errorMsg}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Salvar nova senha
          </button>
        </div>
      </form>
    </Modal>
  )
}
