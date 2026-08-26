import { ESTADOS_ITEM, ESTADOS_ITEM_ORDER } from '../../lib/vistoriaExecucao'

export default function ItemEstadoSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {ESTADOS_ITEM_ORDER.map((key) => {
        const meta = ESTADOS_ITEM[key]
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`rounded-md border px-1.5 py-1.5 text-[11px] font-semibold transition ${
              active ? 'border-transparent text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            style={active ? { backgroundColor: meta.color } : undefined}
          >
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
