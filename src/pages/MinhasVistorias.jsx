import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, MapPin, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useVistorias } from '../hooks/useVistorias'
import StatusBadge from '../components/StatusBadge'

function VistoriaCard({ vistoria, onAction, updating, readOnly }) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{vistoria.imoveis?.codigo_imovel}</p>
          <StatusBadge status={vistoria.status} size="sm" />
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin size={12} /> {vistoria.imoveis?.endereco}
          {vistoria.imoveis?.bairro ? `, ${vistoria.imoveis.bairro}` : ''}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-600">
          {vistoria.tipo} ·{' '}
          {vistoria.data_agendamento
            ? format(new Date(vistoria.data_agendamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
            : '—'}
        </p>
      </div>

      {!readOnly && (
        <div className="flex shrink-0 gap-2">
          {vistoria.status === 'agendada' && (
            <button
              type="button"
              disabled={updating}
              onClick={() => onAction(vistoria.id, 'aceita')}
              className="btn-primary !py-2"
            >
              {updating ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
              Aceitar vistoria
            </button>
          )}
          {vistoria.status === 'aceita' && (
            <button
              type="button"
              disabled={updating}
              onClick={() => onAction(vistoria.id, 'finalizada')}
              className="btn-secondary !py-2"
            >
              {updating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Finalizar vistoria
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function MinhasVistorias() {
  const { profile } = useAuth()
  const { vistorias, loading, updateStatus } = useVistorias({ vistoriadorId: profile?.id })
  const [updatingId, setUpdatingId] = useState(null)

  const handleAction = async (id, nextStatus) => {
    setUpdatingId(id)
    try {
      await updateStatus(id, nextStatus)
    } finally {
      setUpdatingId(null)
    }
  }

  const pendentes = vistorias.filter((v) => v.status === 'agendada' || v.status === 'aceita')
  const historico = vistorias.filter((v) => v.status === 'finalizada' || v.status === 'cancelada')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Minhas vistorias</h1>
        <p className="text-sm text-slate-500">
          Vistorias atribuídas a você{profile?.nome ? `, ${profile.nome}` : ''}. Aceite e finalize por aqui.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : vistorias.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-slate-500">Nenhuma vistoria atribuída a você ainda.</p>
          <p className="mt-1 text-xs text-slate-400">Quando alguém agendar uma vistoria em seu nome, ela aparece aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendentes.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma vistoria pendente no momento.</p>
          )}
          {pendentes.map((v) => (
            <VistoriaCard key={v.id} vistoria={v} onAction={handleAction} updating={updatingId === v.id} />
          ))}

          {historico.length > 0 && (
            <>
              <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Histórico</p>
              {historico.map((v) => (
                <VistoriaCard key={v.id} vistoria={v} onAction={handleAction} updating={false} readOnly />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
