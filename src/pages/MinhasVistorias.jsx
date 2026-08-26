import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronRight, ClipboardCheck, ClipboardList, Loader2, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useVistorias } from '../hooks/useVistorias'
import StatusBadge from '../components/StatusBadge'
import { buildMapsUrl } from '../lib/vistoriaExecucao'

const TABS = [
  { key: 'novas', label: 'Novas', statuses: ['agendada'] },
  { key: 'andamento', label: 'Em Andamento', statuses: ['aceita'] },
  { key: 'concluidas', label: 'Concluídas', statuses: ['finalizada', 'cancelada'] }
]

function VistoriaCard({ vistoria, tab, onAceitar, aceitando }) {
  const navigate = useNavigate()
  const mapsUrl = buildMapsUrl(vistoria.imoveis)
  const isNavigable = tab === 'andamento' || tab === 'concluidas'

  const abrirChecklist = () => navigate(`/minhas-vistorias/${vistoria.id}`)

  return (
    <div
      className={`card flex flex-col gap-3 p-4 ${isNavigable ? 'cursor-pointer active:bg-slate-50' : ''}`}
      onClick={isNavigable ? abrirChecklist : undefined}
    >
      <div className="flex items-start justify-between gap-2">
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
        {isNavigable && <ChevronRight size={18} className="mt-1 shrink-0 text-slate-300" />}
      </div>

      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-1.5 text-xs">
            <MapPin size={13} /> Abrir no Mapa
          </a>
        )}
        {tab === 'novas' && (
          <button
            type="button"
            disabled={aceitando}
            onClick={() => onAceitar(vistoria.id)}
            className="btn-primary !py-1.5 text-xs"
          >
            {aceitando ? <Loader2 size={13} className="animate-spin" /> : <ClipboardCheck size={13} />}
            Aceitar Vistoria
          </button>
        )}
        {tab === 'andamento' && (
          <button type="button" onClick={abrirChecklist} className="btn-primary !py-1.5 text-xs">
            <ClipboardList size={13} /> Continuar Vistoria
          </button>
        )}
      </div>
    </div>
  )
}

export default function MinhasVistorias() {
  const { profile } = useAuth()
  const { vistorias, loading, updateStatus } = useVistorias({ vistoriadorId: profile?.id })
  const [activeTab, setActiveTab] = useState('novas')
  const [updatingId, setUpdatingId] = useState(null)

  const grouped = useMemo(() => {
    const map = {}
    TABS.forEach((tab) => {
      map[tab.key] = vistorias.filter((v) => tab.statuses.includes(v.status))
    })
    return map
  }, [vistorias])

  const handleAceitar = async (id) => {
    setUpdatingId(id)
    try {
      // Agendada -> Em Andamento (armazenado como status "aceita" no banco,
      // mesmo valor usado no crachá amarelo "Aceita" em toda a aplicação).
      await updateStatus(id, 'aceita')
    } finally {
      setUpdatingId(null)
    }
  }

  const currentList = grouped[activeTab] || []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Minhas vistorias</h1>
        <p className="text-sm text-slate-500">
          Vistorias atribuídas a você{profile?.nome ? `, ${profile.nome}` : ''}.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold transition sm:text-sm ${
              activeTab === tab.key ? 'bg-brand-accent text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={activeTab === tab.key ? 'ml-1.5 text-white/80' : 'ml-1.5 text-slate-400'}>
              {grouped[tab.key]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : currentList.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-slate-500">Nenhuma vistoria nesta aba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((v) => (
            <VistoriaCard
              key={v.id}
              vistoria={v}
              tab={activeTab}
              onAceitar={handleAceitar}
              aceitando={updatingId === v.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
