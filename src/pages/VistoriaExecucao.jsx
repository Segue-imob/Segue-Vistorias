import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Plus } from 'lucide-react'
import { useVistoriaExecucao } from '../hooks/useVistoriaExecucao'
import AmbienteCard from '../components/execucao/AmbienteCard'
import FinalizarVistoriaModal from '../components/execucao/FinalizarVistoriaModal'
import StatusBadge from '../components/StatusBadge'
import { AMBIENTES_PADRAO, buildMapsUrl } from '../lib/vistoriaExecucao'

export default function VistoriaExecucao() {
  const { id } = useParams()
  const navigate = useNavigate()

  const {
    vistoria,
    ambientes,
    loading,
    addAmbiente,
    removeAmbiente,
    updateObservacao,
    setItemEstado,
    addFoto,
    removeFoto,
    finalizarVistoria
  } = useVistoriaExecucao(id)

  const [novoAmbiente, setNovoAmbiente] = useState(AMBIENTES_PADRAO[0])
  const [customAmbiente, setCustomAmbiente] = useState('')
  const [addingAmbiente, setAddingAmbiente] = useState(false)
  const [addAmbienteError, setAddAmbienteError] = useState('')
  const [finalizarOpen, setFinalizarOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    )
  }

  if (!vistoria) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500">
        Vistoria não encontrada ou você não tem acesso a ela.
      </div>
    )
  }

  const mapsUrl = buildMapsUrl(vistoria.imoveis)
  const isEncerrada = vistoria.status === 'finalizada' || vistoria.status === 'cancelada'

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
          onClick={() => navigate('/minhas-vistorias')}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{vistoria.imoveis?.codigo_imovel}</p>
          <p className="truncate text-xs text-slate-500">
            {vistoria.imoveis?.endereco}
            {vistoria.imoveis?.bairro ? `, ${vistoria.imoveis.bairro}` : ''}
          </p>
        </div>
      </div>

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

      {isEncerrada && (
        <div className="card border-l-4 border-l-[#4CAF50] p-4">
          <p className="text-sm font-semibold text-slate-800">Esta vistoria já foi encerrada.</p>
          <p className="mt-0.5 text-xs text-slate-500">
            O checklist abaixo está em modo somente leitura.
          </p>
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
            <AmbienteCard
              key={ambiente.id}
              ambiente={ambiente}
              readOnly={isEncerrada}
              onSetItemEstado={setItemEstado}
              onUpdateObservacao={updateObservacao}
              onUploadFoto={addFoto}
              onRemoveFoto={removeFoto}
              onRemoveAmbiente={removeAmbiente}
            />
          ))
        )}
      </div>

      {!isEncerrada && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 md:pl-64">
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
