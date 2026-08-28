import { AGUA_OPCOES, ENERGIA_OPCOES, ESTADO_LIMPEZA_OPCOES, GAS_OPCOES, getLabelOpcao } from '../../lib/vistoriaExecucao'

function SeletorSimples({ opcoes, value, onChange, readOnly }) {
  if (readOnly) {
    return <p className="text-sm text-slate-600">{getLabelOpcao(opcoes, value)}</p>
  }
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}>
      {opcoes.map((opcao) => {
        const active = value === opcao.value
        return (
          <button
            key={opcao.value}
            type="button"
            onClick={() => onChange(opcao.value)}
            className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
              active
                ? 'border-transparent bg-brand-accent text-white'
                : 'border-brand-border text-slate-500 hover:bg-brand-cream'
            }`}
          >
            {opcao.label}
          </button>
        )
      })}
    </div>
  )
}

export default function InformacoesGeraisCard({ vistoria, readOnly, onUpdateCampo, errorMsg }) {
  return (
    <div className="card space-y-4 p-4">
      <p className="text-sm font-bold text-brand-900">Informações Gerais do Imóvel</p>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado de Limpeza</p>
        <SeletorSimples
          opcoes={ESTADO_LIMPEZA_OPCOES}
          value={vistoria.estado_limpeza}
          onChange={(valor) => onUpdateCampo('estado_limpeza', valor)}
          readOnly={readOnly}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Energia Elétrica</p>
          <SeletorSimples
            opcoes={ENERGIA_OPCOES}
            value={vistoria.energia}
            onChange={(valor) => onUpdateCampo('energia', valor)}
            readOnly={readOnly}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Água</p>
          <SeletorSimples
            opcoes={AGUA_OPCOES}
            value={vistoria.agua}
            onChange={(valor) => onUpdateCampo('agua', valor)}
            readOnly={readOnly}
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Gás</p>
          <SeletorSimples
            opcoes={GAS_OPCOES}
            value={vistoria.gas}
            onChange={(valor) => onUpdateCampo('gas', valor)}
            readOnly={readOnly}
          />
        </div>
      </div>

      {errorMsg && <p className="text-xs font-medium text-red-500">{errorMsg}</p>}
    </div>
  )
}
