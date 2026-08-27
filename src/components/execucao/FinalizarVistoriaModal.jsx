import { useRef, useState } from 'react'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import Modal from '../Modal'
import SignatureCanvas from './SignatureCanvas'
import { ESTADOS_ITEM } from '../../lib/vistoriaExecucao'

export default function FinalizarVistoriaModal({ open, onClose, ambientes, onConfirm }) {
  const signatureRef = useRef(null)
  const [observacoesFinais, setObservacoesFinais] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const totalFotos = ambientes.reduce(
    (sum, a) => sum + (a.vistoria_itens || []).reduce((s, it) => s + (it.vistoria_fotos?.length || 0), 0),
    0
  )
  const totalItensAvaliados = ambientes.reduce(
    (sum, a) => sum + (a.vistoria_itens || []).filter((it) => it.estado).length,
    0
  )
  const totalItens = ambientes.reduce((sum, a) => sum + (a.vistoria_itens || []).length, 0)

  const handleConfirm = async () => {
    setErrorMsg('')

    if (signatureRef.current?.isEmpty()) {
      setErrorMsg('Colete a assinatura antes de finalizar a vistoria.')
      return
    }

    setSubmitting(true)
    try {
      const blob = await signatureRef.current.toBlob()
      await onConfirm(blob, observacoesFinais)
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
        <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-brand-border/70 p-3">
          {ambientes.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum ambiente vistoriado ainda.</p>
          ) : (
            ambientes.map((a) => (
              <div key={a.id} className="border-b border-brand-border/50 pb-2 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-brand-900">{a.ambiente || a.nome}</p>

                <div className="mt-1.5 space-y-1.5">
                  {(a.vistoria_itens || []).map((it) => {
                    const meta = ESTADOS_ITEM[it.estado]
                    const fotosCount = it.vistoria_fotos?.length || 0
                    return (
                      <div key={it.id} className="flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-600">{it.item || it.nome}</span>
                          {it.funcionamento && (
                            <span className="ml-1.5 text-[10px] text-slate-400">
                              · Funciona: {it.funcionamento === 'sim' ? 'Sim' : 'Não'}
                            </span>
                          )}
                          {it.observacao && (
                            <p className="truncate text-[11px] text-slate-400">{it.observacao}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {fotosCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <ImageIcon size={10} /> {fotosCount}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              meta ? `${meta.bg} ${meta.text}` : 'bg-brand-cream text-slate-400'
                            }`}
                          >
                            {meta ? meta.label : 'Não avaliado'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {ambientes.length} ambiente(s) · {totalItensAvaliados}/{totalItens} itens avaliados · {totalFotos} foto(s)
        </p>

        <div>
          <label className="label-field">Observações finais</label>
          <textarea
            rows={2}
            className="input-field resize-none"
            placeholder="Considerações gerais sobre a vistoria (opcional)"
            value={observacoesFinais}
            onChange={(e) => setObservacoesFinais(e.target.value)}
          />
        </div>

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
