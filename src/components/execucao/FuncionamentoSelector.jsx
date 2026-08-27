import { FUNCIONAMENTO_OPCOES } from '../../lib/vistoriaExecucao'

export default function FuncionamentoSelector({ value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Funcionamento</p>
      <div className="grid grid-cols-2 gap-1.5">
        {FUNCIONAMENTO_OPCOES.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-transparent bg-brand-accent text-white'
                  : 'border-brand-border text-slate-500 hover:bg-brand-cream'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
