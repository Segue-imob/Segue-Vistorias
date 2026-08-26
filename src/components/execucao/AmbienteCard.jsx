import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import ItemEstadoSelector from './ItemEstadoSelector'
import FotoUploader from './FotoUploader'
import { ITENS_PADRAO, getEstadoItemMeta } from '../../lib/vistoriaExecucao'

export default function AmbienteCard({
  ambiente,
  readOnly = false,
  onSetItemEstado,
  onUpdateObservacao,
  onUploadFoto,
  onRemoveFoto,
  onRemoveAmbiente
}) {
  const [expanded, setExpanded] = useState(true)
  const [observacaoLocal, setObservacaoLocal] = useState(ambiente.observacao || '')

  const getEstado = (item) => ambiente.vistoria_itens?.find((it) => it.item === item)?.estado
  const itensPreenchidos = ITENS_PADRAO.filter((item) => getEstado(item)).length

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2 text-left">
          <p className="text-sm font-bold text-slate-900">{ambiente.ambiente}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {itensPreenchidos}/{ITENS_PADRAO.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          <div className="space-y-3">
            {ITENS_PADRAO.map((item) => (
              <div key={item}>
                <p className="mb-1 text-xs font-semibold text-slate-600">{item}</p>
                {readOnly ? (
                  <p className="text-xs text-slate-400">
                    {getEstado(item) ? getEstadoItemMeta(getEstado(item))?.label : 'Não avaliado'}
                  </p>
                ) : (
                  <ItemEstadoSelector
                    value={getEstado(item)}
                    onChange={(estado) => onSetItemEstado(ambiente.id, item, estado)}
                  />
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="label-field">Observações do ambiente</label>
            {readOnly ? (
              <p className="text-sm text-slate-600">{ambiente.observacao || 'Sem observações.'}</p>
            ) : (
              <textarea
                rows={2}
                className="input-field resize-none"
                placeholder="Detalhes adicionais deste ambiente (opcional)"
                value={observacaoLocal}
                onChange={(e) => setObservacaoLocal(e.target.value)}
                onBlur={() => {
                  if (observacaoLocal !== (ambiente.observacao || '')) {
                    onUpdateObservacao(ambiente.id, observacaoLocal)
                  }
                }}
              />
            )}
          </div>

          <div>
            <label className="label-field">Fotos do ambiente</label>
            {readOnly ? (
              <div className="flex flex-wrap gap-2">
                {(ambiente.vistoria_fotos || []).length === 0 && (
                  <p className="text-xs text-slate-400">Nenhuma foto anexada.</p>
                )}
                {(ambiente.vistoria_fotos || []).map((foto) => (
                  <img
                    key={foto.id}
                    src={foto.url}
                    alt="Foto do ambiente"
                    className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                  />
                ))}
              </div>
            ) : (
              <FotoUploader
                fotos={ambiente.vistoria_fotos || []}
                onUpload={(file) => onUploadFoto(ambiente.id, file)}
                onRemove={(fotoId) => onRemoveFoto(ambiente.id, fotoId)}
              />
            )}
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => onRemoveAmbiente(ambiente.id)}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline"
            >
              <Trash2 size={13} /> Remover ambiente
            </button>
          )}
        </div>
      )}
    </div>
  )
}
