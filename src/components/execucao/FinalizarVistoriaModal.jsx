import { useRef, useState } from 'react'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import Modal from '../Modal'
import SignatureCanvas from './SignatureCanvas'
import { ESTADOS_ITEM } from '../../lib/vistoriaExecucao'

export default function FinalizarVistoriaModal({ open, onClose, ambientes, onConfirm }) {
  const signatureRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const totalFotos = ambientes.reduce((sum, a) => sum + (a.vistoria_fotos?.length || 0), 0)

  const handleConfirm = async () => {
    setErrorMsg('')

    if (signatureRef.current?.isEmpty()) {
      setErrorMsg('Colete a assinatura antes de finalizar a vistoria.')
      return
    }

    setSubmitting(true)
    try {
      const blob = await signatureRef.current.toBlob()
      await onConfirm(blob)
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao finalizar a vistoria. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Encerrar vistoria"
      subtitle="Confira o resumo abaixo e colete a assinatura"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-slate-100 p-3">
          {ambientes.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum ambiente vistoriado ainda.</p>
          ) : (
            ambientes.map((a) => (
              <div key={a.id} className="border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-slate-800">{a.ambiente}</p>

                <div className="mt-1 flex flex-wrap gap-1">
                  {(a.vistoria_itens || []).map((it) => {
                    const meta = ESTADOS_ITEM[it.estado]
                    if (!meta) return null
                    return (
                      <span
                        key={it.id}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.text}`}
                      >
                        {it.item}: {meta.label}
                      </span>
                    )
                  })}
                </div>

                {a.observacao && <p className="mt-1 text-xs text-slate-500">{a.observacao}</p>}

                {(a.vistoria_fotos?.length || 0) > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                    <ImageIcon size={11} /> {a.vistoria_fotos.length} foto(s)
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {ambientes.length} ambiente(s) · {totalFotos} foto(s) no total
        </p>

        <div>
          <label className="label-field">Assinatura do vistoriador</label>
          <SignatureCanvas ref={signatureRef} />
        </div>

        {errorMsg && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} disabled={submitting} className="btn-primary">
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Finalizar e Salvar Vistoria
          </button>
        </div>
      </div>
    </Modal>
  )
}
