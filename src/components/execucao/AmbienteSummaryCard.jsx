import { AlertTriangle, ChevronRight, Trash2 } from 'lucide-react'

export default function AmbienteSummaryCard({ ambiente, onVistoriar, onRemove, readOnly = false }) {
  const nomeAmbiente = ambiente.ambiente || ambiente.nome || 'Ambiente'
  const itens = ambiente.vistoria_itens || []
  const total = itens.length
  const avaliados = itens.filter((it) => it.estado).length
  const progresso = total > 0 ? (avaliados / total) * 100 : 0

  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <button type="button" onClick={onVistoriar} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-bold text-brand-900">{nomeAmbiente}</p>
          {ambiente._naoSincronizado && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600"
              title="Ainda não confirmado no servidor — continue trabalhando, tentaremos de novo quando a conexão voltar."
            >
              <AlertTriangle size={10} /> não sincronizado
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          {avaliados}/{total} itens avaliados
        </p>
        <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-brand-cream">
          <div
            className="h-full rounded-full bg-brand-accent transition-all"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {!readOnly && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
            title="Remover ambiente"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button type="button" onClick={onVistoriar} className="btn-primary !py-2 text-xs">
          Vistoriar Ambiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
