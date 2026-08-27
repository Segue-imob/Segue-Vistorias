import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import ItemEstadoSelector from './ItemEstadoSelector'
import FotoUploader from './FotoUploader'
import { getEstadoItemMeta } from '../../lib/vistoriaExecucao'

export default function ItemCard({
  item,
  readOnly = false,
  onSetEstado,
  onUpdateObservacao,
  onUploadFoto,
  onRemoveFoto,
  onRemoveItem
}) {
  const [observacaoLocal, setObservacaoLocal] = useState(item.observacao || '')
  const nomeItem = item.item || item.nome || 'Item'
  const estadoMeta = getEstadoItemMeta(item.estado)

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-bold text-brand-900">{nomeItem}</p>
          {item._naoSincronizado && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600"
              title="Ainda não confirmado no servidor — continue trabalhando, tentaremos de novo quando a conexão voltar."
            >
              <AlertTriangle size={10} /> não sincronizado
            </span>
          )}
        </div>
        {!readOnly && onRemoveItem && (
          <button
            type="button"
            onClick={onRemoveItem}
            className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
            title="Remover item"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {readOnly ? (
        <span
          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
            estadoMeta ? `${estadoMeta.bg} ${estadoMeta.text}` : 'bg-brand-cream text-slate-400'
          }`}
        >
          {estadoMeta ? estadoMeta.label : 'Não avaliado'}
        </span>
      ) : (
        <ItemEstadoSelector value={item.estado} onChange={onSetEstado} />
      )}

      <div>
        <label className="label-field">Observações</label>
        {readOnly ? (
          <p className="text-sm text-slate-600">{item.observacao || 'Sem observações.'}</p>
        ) : (
          <textarea
            rows={2}
            className="input-field resize-none"
            placeholder="Detalhes sobre este item (opcional)"
            value={observacaoLocal}
            onChange={(e) => setObservacaoLocal(e.target.value)}
            onBlur={() => {
              if (observacaoLocal !== (item.observacao || '')) onUpdateObservacao(observacaoLocal)
            }}
          />
        )}
      </div>

      <div>
        <label className="label-field">Fotos</label>
        {readOnly ? (
          <div className="flex flex-wrap gap-2">
            {(item.vistoria_fotos || []).length === 0 && (
              <p className="text-xs text-slate-400">Nenhuma foto anexada.</p>
            )}
            {(item.vistoria_fotos || []).map((foto) => (
              <img
                key={foto.id}
                src={foto.url}
                alt={`Foto de ${nomeItem}`}
                className="h-16 w-16 rounded-lg border border-brand-border object-cover"
              />
            ))}
          </div>
        ) : (
          <FotoUploader fotos={item.vistoria_fotos || []} onUpload={onUploadFoto} onRemove={onRemoveFoto} />
        )}
      </div>
    </div>
  )
}
