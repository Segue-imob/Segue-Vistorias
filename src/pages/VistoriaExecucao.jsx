import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, MapPin, Plus } from 'lucide-react'
import { useVistoriaExecucao } from '../hooks/useVistoriaExecucao'
import { useAuth } from '../context/AuthContext'
import { isAdmin } from '../lib/permissions'
import AmbienteSummaryCard from '../components/execucao/AmbienteSummaryCard'
import ItemCard from '../components/execucao/ItemCard'
import FinalizarVistoriaModal from '../components/execucao/FinalizarVistoriaModal'
import StatusBadge from '../components/StatusBadge'
import { AMBIENTES_PADRAO, buildMapsUrl } from '../lib/vistoriaExecucao'

export default function VistoriaExecucao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()

  const {
    vistoria,
    ambientes,
    loading,
    error,
    addAmbiente,
    removeAmbiente,
    addItemCustom,
    removeItem,
    setItemEstado,
    updateItemObservacao,
    addFotoItem,
    removeFotoItem,
    finalizarVistoria
  } = useVistoriaExecucao(id)

  // Nível 1 = null (lista de ambientes) · Nível 2 = id do ambiente aberto
  const [activeAmbienteId, setActiveAmbienteId] = useState(null)

  const [novoAmbiente, setNovoAmbiente] = useState(AMBIENTES_PADRAO[0])
  const [customAmbiente, setCustomAmbiente] = useState('')
  const [addingAmbiente, setAddingAmbiente] = useState(false)
  const [addAmbienteError, setAddAmbienteError] = useState('')

  const [novoItemNome, setNovoItemNome] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [addItemError, setAddItemError] = useState('')

  const [finalizarOpen, setFinalizarOpen] = useState(false)

  const activeAmbiente = useMemo(
    () => ambientes.find((a) => a.id === activeAmbienteId) || null,
    [ambientes, activeAmbienteId]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    )
  }

  if (!vistoria) {
    return (
      <div className="card flex flex-col items-center gap-2 p-6 text-center">
        <AlertTriangle size={20} className="text-amber-500" />
        <p className="text-sm font-semibold text-slate-700">
          Vistoria não encontrada ou você não tem acesso a ela.
        </p>
        {error && (
          <p className="max-w-md text-xs text-slate-400">
            Detalhe técnico: {error.message || String(error)}
          </p>
        )}
        <button type="button" onClick={() => navigate('/minhas-vistorias')} className="btn-secondary mt-2">
          <ArrowLeft size={14} /> Voltar para Minhas Vistorias
        </button>
      </div>
    )
  }

  const mapsUrl = buildMapsUrl(vistoria.imoveis)
  const isEncerrada = vistoria.status === 'finalizada' || vistoria.status === 'cancelada'
  const visualizandoComoAdmin = isAdmin(role)

  const handleAddAmbiente = async () => {
    const nome = novoAmbiente === 'Outro' ? customAmbiente.trim() : novoAmbiente
    if (!nome) {
      setAddAmbienteError('Informe o nome do ambiente.')
      return
    }
    setAddAmbienteError('')
    setAddingAmbiente(true)
    try {
      await addAmbiente(nome)
      setCustomAmbiente('')
    } catch (err) {
      setAddAmbienteError(err.message || 'Erro ao adicionar ambiente.')
    } finally {
      setAddingAmbiente(false)
    }
  }

  const handleAddItemCustom = async () => {
    const nome = novoItemNome.trim()
    if (!nome) {
      setAddItemError('Informe o nome do item.')
      return
    }
    setAddItemError('')
    setAddingItem(true)
    try {
      await addItemCustom(activeAmbienteId, nome)
      setNovoItemNome('')
    } catch (err) {
      setAddItemError(err.message || 'Erro ao adicionar item.')
    } finally {
      setAddingItem(false)
    }
  }

  const handleRemoveAmbiente = async (ambienteId) => {
    await removeAmbiente(ambienteId)
    if (activeAmbienteId === ambienteId) setActiveAmbienteId(null)
  }

  const handleFinalizarConfirm = async (signatureBlob) => {
    await finalizarVistoria(signatureBlob)
    setFinalizarOpen(false)
    navigate('/minhas-vistorias')
  }

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (activeAmbiente ? setActiveAmbienteId(null) : navigate('/minhas-vistorias'))}
          className="rounded-lg p-2 text-slate-500 hover:bg-brand-cream"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-brand-900">
            {activeAmbiente ? activeAmbiente.ambiente : vistoria.imoveis?.codigo_imovel}
          </p>
          <p className="truncate text-xs text-slate-500">
            {activeAmbiente
              ? vistoria.imoveis?.codigo_imovel
              : `${vistoria.imoveis?.endereco || ''}${vistoria.imoveis?.bairro ? `, ${vistoria.imoveis.bairro}` : ''}`}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* NÍVEL 2 — itens do ambiente selecionado                     */}
      {/* ---------------------------------------------------------- */}
      {activeAmbiente ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setActiveAmbienteId(null)}
            className="btn-secondary !py-2 text-xs"
          >
            <ArrowLeft size={14} /> Voltar para Lista de Ambientes
          </button>

          <div className="space-y-3">
            {(activeAmbiente.vistoria_itens || []).map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                readOnly={isEncerrada}
                onSetEstado={(estado) => setItemEstado(activeAmbiente.id, item.id, estado)}
                onUpdateObservacao={(observacao) => updateItemObservacao(activeAmbiente.id, item.id, observacao)}
                onUploadFoto={(file) => addFotoItem(activeAmbiente.id, item.id, file)}
                onRemoveFoto={(fotoId) => removeFotoItem(activeAmbiente.id, item.id, fotoId)}
                onRemoveItem={() => removeItem(activeAmbiente.id, item.id)}
              />
            ))}
          </div>

          {!isEncerrada && (
            <div className="card space-y-2 p-4">
              <p className="label-field !mb-0">Adicionar outro item</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="input-field"
                  placeholder="Ex: Box do banheiro, Persiana..."
                  value={novoItemNome}
                  onChange={(e) => setNovoItemNome(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddItemCustom}
                  disabled={addingItem}
                  className="btn-primary shrink-0"
                >
                  {addingItem ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Adicionar Outro Item
                </button>
              </div>
              {addItemError && <p className="text-xs font-medium text-red-500">{addItemError}</p>}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* -------------------------------------------------------- */}
          {/* NÍVEL 1 — lista de ambientes                              */}
          {/* -------------------------------------------------------- */}
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{vistoria.tipo}</p>
              <StatusBadge status={vistoria.status} />
            </div>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2 text-xs">
                <MapPin size={14} /> Abrir no Mapa
              </a>
            )}
          </div>

          {visualizandoComoAdmin && (
            <div className="card border-l-4 border-l-brand-accent p-3 text-xs text-slate-500">
              Você está vendo esta vistoria como <strong>Administrador</strong> — o checklist normalmente é
              preenchido pelo vistoriador responsável.
            </div>
          )}

          {isEncerrada && (
            <div className="card border-l-4 border-l-[#4CAF50] p-4">
              <p className="text-sm font-semibold text-brand-900">Esta vistoria já foi encerrada.</p>
              <p className="mt-0.5 text-xs text-slate-500">O checklist abaixo está em modo somente leitura.</p>
            </div>
          )}

          {!isEncerrada && (
            <div className="card space-y-2 p-4">
              <p className="label-field !mb-0">Adicionar ambiente</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  className="input-field sm:max-w-[220px]"
                  value={novoAmbiente}
                  onChange={(e) => setNovoAmbiente(e.target.value)}
                >
                  {AMBIENTES_PADRAO.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                {novoAmbiente === 'Outro' && (
                  <input
                    className="input-field"
                    placeholder="Nome do ambiente (ex: Quarto 2)"
                    value={customAmbiente}
                    onChange={(e) => setCustomAmbiente(e.target.value)}
                  />
                )}
                <button
                  type="button"
                  onClick={handleAddAmbiente}
                  disabled={addingAmbiente}
                  className="btn-primary shrink-0"
                >
                  {addingAmbiente ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Adicionar
                </button>
              </div>
              {addAmbienteError && <p className="text-xs font-medium text-red-500">{addAmbienteError}</p>}
            </div>
          )}

          <div className="space-y-3">
            {ambientes.length === 0 ? (
              <div className="card p-6 text-center text-sm text-slate-500">
                Nenhum ambiente adicionado ainda.
                {!isEncerrada && ' Use o seletor acima para começar o checklist.'}
              </div>
            ) : (
              ambientes.map((ambiente) => (
                <AmbienteSummaryCard
                  key={ambiente.id}
                  ambiente={ambiente}
                  readOnly={isEncerrada}
                  onVistoriar={() => setActiveAmbienteId(ambiente.id)}
                  onRemove={isEncerrada ? null : () => handleRemoveAmbiente(ambiente.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {!isEncerrada && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-border bg-white p-3 md:pl-64">
          <div className="mx-auto max-w-[1400px]">
            <button
              type="button"
              onClick={() => setFinalizarOpen(true)}
              disabled={ambientes.length === 0}
              className="btn-primary w-full justify-center !py-3"
            >
              <CheckCircle2 size={16} /> Finalizar Vistoria
            </button>
          </div>
        </div>
      )}

      <FinalizarVistoriaModal
        open={finalizarOpen}
        onClose={() => setFinalizarOpen(false)}
        ambientes={ambientes}
        onConfirm={handleFinalizarConfirm}
      />
    </div>
  )
}
