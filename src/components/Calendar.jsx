import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getStatusMeta } from '../lib/constants'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function Calendar({ currentMonth, onMonthChange, vistorias, selectedDay, onSelectDay }) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const vistoriasByDay = (day) =>
    vistorias.filter((v) => v.data_agendamento && isSameDay(new Date(v.data_agendamento), day))

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold capitalize text-slate-900">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(new Date())}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayVistorias = vistoriasByDay(day)
          const inMonth = isSameMonth(day, currentMonth)
          const selected = isSameDay(day, selectedDay)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`flex min-h-[92px] flex-col items-start rounded-lg border p-1.5 text-left align-top transition ${
                selected
                  ? 'border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent'
                  : 'border-transparent hover:bg-slate-50'
              } ${!inMonth ? 'opacity-40' : ''}`}
            >
              <span
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday(day) ? 'bg-brand-accent text-white' : 'text-slate-600'
                }`}
              >
                {format(day, 'd')}
              </span>

              <div className="flex w-full flex-col gap-1">
                {dayVistorias.slice(0, 3).map((v) => {
                  const meta = getStatusMeta(v.status)
                  return (
                    <span
                      key={v.id}
                      className="truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: meta.color }}
                      title={`${v.imoveis?.codigo_imovel || ''} · ${meta.label}`}
                    >
                      {format(new Date(v.data_agendamento), 'HH:mm')} {v.imoveis?.codigo_imovel || 'Imóvel'}
                    </span>
                  )
                })}
                {dayVistorias.length > 3 && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    +{dayVistorias.length - 3} mais
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
