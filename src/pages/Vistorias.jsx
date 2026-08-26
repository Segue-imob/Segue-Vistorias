import { useMemo, useState } from 'react'
import { LayoutList, LayoutGrid, Search, Plus, Loader2 } from 'lucide-react'
import { useVistorias } from '../hooks/useVistorias'
import VistoriaModal from '../components/VistoriaModal'
import VistoriaListView from '../components/VistoriaListView'
import KanbanBoard from '../components/KanbanBoard'

export default function Vistorias() {
  const { vistorias, loading, createVistoria, updateStatus } = useVistorias()
  const [view, setView] = useState('lista') // 'lista' | 'kanban'
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filteredVistorias = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return vistorias
    return vistorias.filter((v) => {
      const codigo = v.imoveis?.codigo_imovel?.toLowerCase() || ''
      const endereco = v.imoveis?.endereco?.toLowerCase() || ''
      const bairro = v.imoveis?.bairro?.toLowerCase() || ''
      const cidade = v.imoveis?.cidade?.toLowerCase() || ''
      const inquilino = v.imoveis?.inquilino_nome?.toLowerCase() || ''
      const proprietario = v.imoveis?.proprietario_nome?.toLowerCase() || ''
      return (
        codigo.includes(term) ||
        endereco.includes(term) ||
        bairro.includes(term) ||
        cidade.includes(term) ||
        inquilino.includes(term) ||
        proprietario.includes(term)
      )
    })
  }, [vistorias, search])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vistorias</h1>
          <p className="text-sm text-slate-500">Gerencie todas as vistorias da imobiliária.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Agendar Vistoria
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field !pl-9"
            placeholder="Buscar por código, endereço, inquilino ou proprietário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView('lista')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              view === 'lista' ? 'bg-brand-accent text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <LayoutList size={14} /> Lista
          </button>
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              view === 'kanban' ? 'bg-brand-accent text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={14} /> Kanban
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : view === 'lista' ? (
        <VistoriaListView vistorias={filteredVistorias} onChangeStatus={updateStatus} />
      ) : (
        <KanbanBoard vistorias={filteredVistorias} onChangeStatus={updateStatus} />
      )}

      <VistoriaModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={createVistoria} />
    </div>
  )
}
