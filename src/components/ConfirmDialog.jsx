import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm
}) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleConfirm = async () => {
    setErrorMsg('')
    setSubmitting(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao executar a ação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {danger && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle size={18} />
            </div>
          )}
          <p className="text-sm text-slate-600">{description}</p>
        </div>

        {errorMsg && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-accent hover:bg-brand-accentDark'
            }`}
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
