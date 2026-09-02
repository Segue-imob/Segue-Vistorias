import { useMemo, useState } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import { useVistorias } from '../hooks/useVistorias'
import { useAuth } from '../context/AuthContext'
import { canEditVistoria, canDeleteVistoria } from '../lib/permissions'
import VistoriaModal from '../components/VistoriaModal'
import VistoriaListView from '../components/VistoriaListView'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Vistorias() {
  const { profile, role } = useAuth()
  const { vistorias, loading, createVistoria, updateVistoria, removeVistoria } = useVistorias()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVistoria, setEditingVistoria] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const podeExcluir = canDeleteVistoria(role)

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

  const openCreate = () => {
    setEditingVistoria(null)
    setModalOpen(true)
  }

  const openEdit = (vistoria) => {
    setEditingVistoria(vistoria)
    setModalOpen(true)
  }

  const handleVistoriaSubmit = async (payload, id) => {
    if (id) {
      await updateVistoria(id, payload)
    } else {
      await createVistoria({ ...payload, criado_por: profile?.id })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await removeVistoria(deleteTarget.id)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">Vistorias</h1>
          <p className="text-sm text-slate-500">Gerencie todas as vistorias da imobiliária.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Agendar Vistoria
        </button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field !pl-9"
          placeholder="Buscar por código, endereço, inquilino ou proprietário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : (
        <VistoriaListView
          vistorias={filteredVistorias}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          canEdit={(v) => canEditVistoria(v, profile, role)}
          canDelete={podeExcluir}
        />
      )}

      <VistoriaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleVistoriaSubmit}
        vistoria={editingVistoria}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir vistoria"
        description="Tem certeza que deseja apagar esta vistoria? Todos os ambientes, itens e fotos associados serão excluídos permanentemente."
        confirmLabel="Excluir vistoria"
        danger
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
