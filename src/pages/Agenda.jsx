import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import Calendar from '../components/Calendar'
import DayAgendaPanel from '../components/DayAgendaPanel'
import VistoriaModal from '../components/VistoriaModal'
import { useVistorias } from '../hooks/useVistorias'
import { useProfiles } from '../hooks/useProfiles'
import { useAuth } from '../context/AuthContext'
import { PERMISSIONS } from '../lib/permissions'
import { TIPOS_VISTORIA } from '../lib/constants'
import { Filter, Plus } from 'lucide-react'

export default function Agenda() {
  const { role } = useAuth()
  const canSchedule = PERMISSIONS.scheduleVistoria(role)

  const { vistorias, createVistoria } = useVistorias()
  const { vistoriadores } = useProfiles()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [filtroVistoriador, setFiltroVistoriador] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const filteredVistorias = useMemo(() => {
    return vistorias.filter((v) => {
      if (filtroVistoriador && v.vistoriador_id !== filtroVistoriador) return false
      if (filtroTipo && v.tipo !== filtroTipo) return false
      return true
    })
  }, [vistorias, filtroVistoriador, filtroTipo])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">Visualize e organize as vistorias por dia.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter size={14} />
          </div>
          <select
            className="input-field !w-auto !py-2 text-sm"
            value={filtroVistoriador}
            onChange={(e) => setFiltroVistoriador(e.target.value)}
          >
            <option value="">Todos os vistoriadores</option>
            {vistoriadores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
          <select
            className="input-field !w-auto !py-2 text-sm"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {TIPOS_VISTORIA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {canSchedule && (
            <button type="button" onClick={() => setModalOpen(true)} className="btn-primary !py-2">
              <Plus size={15} /> Agendar Vistoria
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Calendar
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          vistorias={filteredVistorias}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
        <DayAgendaPanel
          day={selectedDay}
          vistorias={filteredVistorias}
          onAddClick={canSchedule ? () => setModalOpen(true) : null}
        />
      </div>

      {canSchedule && (
        <VistoriaModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={createVistoria}
          defaultDate={format(selectedDay, 'yyyy-MM-dd')}
        />
      )}
    </div>
  )
}
