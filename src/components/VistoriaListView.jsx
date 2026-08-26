import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreVertical, MapPin } from 'lucide-react'
import { useState } from 'react'
import StatusBadge from './StatusBadge'
import { STATUS_ORDER, getStatusMeta } from '../lib/constants'

export default function VistoriaListView({ vistorias, onChangeStatus }) {
  const [openMenuId, setOpenMenuId] = useState(null)

  if (vistorias.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-slate-500">Nenhuma vistoria encontrada</p>
        <p className="mt-1 text-xs text-slate-400">Ajuste a busca ou agende uma nova vistoria.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3">Imóvel</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Data / hora</th>
            <th className="px-4 py-3">Vistoriador</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {vistorias.map((v) => (
            <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{v.imoveis?.codigo}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={11} /> {v.imoveis?.endereco}
                </p>
              </td>
              <td className="px-4 py-3 text-slate-700">{v.tipo}</td>
              <td className="px-4 py-3 text-slate-700">
                {v.data_hora ? format(new Date(v.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
              </td>
              <td className="px-4 py-3 text-slate-700">{v.vistoriador?.nome || '—'}</td>
              <td className="px-4 py-3">
                <StatusBadge status={v.status} />
              </td>
              <td className="relative px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === v.id ? null : v.id)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <MoreVertical size={16} />
                </button>
                {openMenuId === v.id && (
                  <div className="absolute right-4 z-10 mt-1 w-44 rounded-lg border border-slate-100 bg-white py-1 shadow-modal">
                    {STATUS_ORDER.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          onChangeStatus(v.id, status)
                          setOpenMenuId(null)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getStatusMeta(status).color }}
                        />
                        Mover para {getStatusMeta(status).label}
                      </button>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
