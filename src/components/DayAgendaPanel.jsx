import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, MapPin, User, Plus } from 'lucide-react'
import StatusBadge from './StatusBadge'

export default function DayAgendaPanel({ day, vistorias, onAddClick }) {
  const dayVistorias = vistorias
    .filter((v) => v.data_agendamento && isSameDay(new Date(v.data_agendamento), day))
    .sort((a, b) => new Date(a.data_agendamento) - new Date(b.data_agendamento))

  return (
    <div className="card flex h-full flex-col p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vistorias do dia</p>
          <h3 className="text-base font-bold capitalize text-slate-900">
            {format(day, "d 'de' MMMM", { locale: ptBR })}
          </h3>
        </div>
        <button
          type="button"
          onClick={onAddClick}
          className="rounded-lg bg-brand-accent/10 p-2 text-brand-accent hover:bg-brand-accent/20"
          title="Agendar vistoria neste dia"
        >
          <Plus size={16} />
        </button>
      </div>

      {dayVistorias.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-medium text-slate-500">Nenhuma vistoria agendada</p>
          <p className="mt-1 text-xs text-slate-400">Clique no + para agendar uma vistoria neste dia.</p>
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto">
          {dayVistorias.map((v) => (
            <li key={v.id} className="rounded-xl border border-slate-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Clock size={13} />
                  {format(new Date(v.data_agendamento), 'HH:mm')}
                </span>
                <StatusBadge status={v.status} size="sm" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {v.imoveis?.codigo_imovel} · {v.tipo}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={12} /> {v.imoveis?.endereco}
                {v.imoveis?.bairro ? `, ${v.imoveis.bairro}` : ''}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <User size={12} /> {v.vistoriador?.nome || 'Sem vistoriador'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
