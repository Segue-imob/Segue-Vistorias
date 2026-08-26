import { useState } from 'react'
import { format } from 'date-fns'
import { MapPin, User, GripVertical } from 'lucide-react'
import { KANBAN_COLUMNS, getStatusMeta } from '../lib/constants'

function KanbanCard({ vistoria, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, vistoria.id)}
      className="cursor-grab rounded-xl border border-slate-100 bg-white p-3 shadow-card transition hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">{vistoria.imoveis?.codigo_imovel}</span>
        <GripVertical size={14} className="text-slate-300" />
      </div>
      <p className="mb-2 text-xs font-medium text-brand-accent">{vistoria.tipo}</p>
      <p className="flex items-center gap-1 text-[11px] text-slate-500">
        <MapPin size={11} /> <span className="truncate">{vistoria.imoveis?.endereco}</span>
      </p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
        <User size={11} /> {vistoria.vistoriador?.nome || 'Sem vistoriador'}
      </p>
      {vistoria.data_agendamento && (
        <p className="mt-2 text-[11px] font-semibold text-slate-400">
          {format(new Date(vistoria.data_agendamento), 'dd/MM/yyyy HH:mm')}
        </p>
      )}
    </div>
  )
}

export default function KanbanBoard({ vistorias, onChangeStatus }) {
  const [dragOverCol, setDragOverCol] = useState(null)

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/vistoria-id', id)
  }

  const handleDrop = (e, status) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/vistoria-id')
    if (id) onChangeStatus(id, status)
    setDragOverCol(null)
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KANBAN_COLUMNS.map((col) => {
        const meta = getStatusMeta(col.status)
        const items = vistorias.filter((v) => v.status === col.status)

        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverCol(col.status)
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => handleDrop(e, col.status)}
            className={`flex flex-col rounded-xl2 border bg-slate-50/60 p-3 transition ${
              dragOverCol === col.status ? 'border-brand-accent bg-brand-accent/5' : 'border-slate-200'
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <h3 className="text-sm font-bold text-slate-800">{col.title}</h3>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500 shadow-sm">
                {items.length}
              </span>
            </div>

            <div className="flex min-h-[120px] flex-1 flex-col gap-2.5">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-xs text-slate-400">
                  Arraste vistorias para cá
                </div>
              ) : (
                items.map((v) => <KanbanCard key={v.id} vistoria={v} onDragStart={handleDragStart} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
