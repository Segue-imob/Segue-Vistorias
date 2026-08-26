import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Modal from './Modal'
import { TIPOS_VISTORIA } from '../lib/constants'
import { useImoveis } from '../hooks/useImoveis'
import { useProfiles } from '../hooks/useProfiles'
import { Loader2, Plus } from 'lucide-react'

const emptyForm = {
  imovel_id: '',
  tipo: TIPOS_VISTORIA[0],
  data: '',
  hora: '',
  vistoriador_id: '',
  observacoes: ''
}

/**
 * Modal de agendamento E edição de vistoria. Passe `vistoria` (a linha
 * atual, vinda de useVistorias) para abrir em modo edição — os campos
 * vêm pré-preenchidos e o envio chama `onSubmit(payload, vistoria.id)`
 * em vez de `onSubmit(payload)`, para a página decidir entre
 * createVistoria/updateVistoria.
 */
export default function VistoriaModal({ open, onClose, onSubmit, defaultDate, vistoria }) {
  const isEdit = Boolean(vistoria)
  const { imoveis, createImovel } = useImoveis()
  const { vistoriadores } = useProfiles()
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showNovoImovel, setShowNovoImovel] = useState(false)
  const [novoImovel, setNovoImovel] = useState({
    codigo_imovel: '',
    endereco: '',
    bairro: '',
    cidade: '',
    inquilino_nome: '',
    proprietario_nome: ''
  })
  const [savingImovel, setSavingImovel] = useState(false)

  useEffect(() => {
    if (open) {
      if (vistoria) {
        const dt = vistoria.data_agendamento ? new Date(vistoria.data_agendamento) : null
        setForm({
          imovel_id: vistoria.imovel_id || '',
          tipo: vistoria.tipo || TIPOS_VISTORIA[0],
          data: dt ? format(dt, 'yyyy-MM-dd') : '',
          hora: dt ? format(dt, 'HH:mm') : '',
          vistoriador_id: vistoria.vistoriador_id || '',
          observacoes: vistoria.observacoes || ''
        })
      } else {
        setForm({ ...emptyForm, data: defaultDate || '' })
      }
      setErrorMsg('')
      setShowNovoImovel(false)
    }
  }, [open, defaultDate, vistoria])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleCreateImovel = async () => {
    if (!novoImovel.codigo_imovel || !novoImovel.endereco) return
    setSavingImovel(true)
    try {
      const data = await createImovel(novoImovel)
      const created = data?.[0]
      if (created) {
        setForm((f) => ({ ...f, imovel_id: created.id }))
      }
      setShowNovoImovel(false)
      setNovoImovel({
        codigo_imovel: '',
        endereco: '',
        bairro: '',
        cidade: '',
        inquilino_nome: '',
        proprietario_nome: ''
      })
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao cadastrar imóvel.')
    } finally {
      setSavingImovel(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.imovel_id || !form.tipo || !form.data || !form.hora || !form.vistoriador_id) {
      setErrorMsg('Preencha todos os campos obrigatórios.')
      return
    }
    setSubmitting(true)
    setErrorMsg('')
    try {
      const payload = {
        imovel_id: form.imovel_id,
        tipo: form.tipo,
        vistoriador_id: form.vistoriador_id,
        observacoes: form.observacoes || null,
        data_agendamento: new Date(`${form.data}T${form.hora}`).toISOString()
      }
      // Só define status "agendada" ao criar — editar não deve mexer
      // no status atual da vistoria (isso é feito no Kanban/menu).
      if (!isEdit) {
        payload.status = 'agendada'
      }
      await onSubmit(payload, vistoria?.id)
      onClose()
    } catch (err) {
      setErrorMsg(err.message || (isEdit ? 'Erro ao salvar alterações.' : 'Erro ao agendar vistoria.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar vistoria' : 'Agendar vistoria'}
      subtitle={isEdit ? 'Atualize os dados da vistoria' : 'Preencha os dados do imóvel e da visita'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label-field !mb-0">Imóvel *</label>
            {!isEdit && (
              <button
                type="button"
                onClick={() => setShowNovoImovel((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline"
              >
                <Plus size={13} /> Novo imóvel
              </button>
            )}
          </div>

          {showNovoImovel && !isEdit && (
            <div className="mb-3 space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Código *"
                  className="input-field"
                  value={novoImovel.codigo_imovel}
                  onChange={(e) => setNovoImovel((f) => ({ ...f, codigo_imovel: e.target.value }))}
                />
                <input
                  placeholder="Proprietário"
                  className="input-field"
                  value={novoImovel.proprietario_nome}
                  onChange={(e) => setNovoImovel((f) => ({ ...f, proprietario_nome: e.target.value }))}
                />
              </div>
              <input
                placeholder="Endereço *"
                className="input-field"
                value={novoImovel.endereco}
                onChange={(e) => setNovoImovel((f) => ({ ...f, endereco: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Bairro"
                  className="input-field"
                  value={novoImovel.bairro}
                  onChange={(e) => setNovoImovel((f) => ({ ...f, bairro: e.target.value }))}
                />
                <input
                  placeholder="Cidade"
                  className="input-field"
                  value={novoImovel.cidade}
                  onChange={(e) => setNovoImovel((f) => ({ ...f, cidade: e.target.value }))}
                />
              </div>
              <input
                placeholder="Inquilino"
                className="input-field"
                value={novoImovel.inquilino_nome}
                onChange={(e) => setNovoImovel((f) => ({ ...f, inquilino_nome: e.target.value }))}
              />
              <button
                type="button"
                onClick={handleCreateImovel}
                disabled={savingImovel}
                className="btn-secondary w-full justify-center !py-2"
              >
                {savingImovel ? <Loader2 size={14} className="animate-spin" /> : 'Salvar imóvel'}
              </button>
            </div>
          )}

          <select
            className="input-field"
            value={form.imovel_id}
            onChange={handleChange('imovel_id')}
            disabled={isEdit}
          >
            <option value="">Selecione um imóvel</option>
            {imoveis.map((im) => (
              <option key={im.id} value={im.id}>
                {im.codigo_imovel} — {im.endereco}
              </option>
            ))}
          </select>
          {isEdit && <p className="mt-1 text-xs text-slate-400">O imóvel não pode ser alterado após o agendamento.</p>}
        </div>

        <div>
          <label className="label-field">Tipo de vistoria *</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_VISTORIA.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tipo }))}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  form.tipo === tipo
                    ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Data *</label>
            <input type="date" className="input-field" value={form.data} onChange={handleChange('data')} />
          </div>
          <div>
            <label className="label-field">Hora *</label>
            <input type="time" className="input-field" value={form.hora} onChange={handleChange('hora')} />
          </div>
        </div>

        <div>
          <label className="label-field">Vistoriador responsável *</label>
          <select className="input-field" value={form.vistoriador_id} onChange={handleChange('vistoriador_id')}>
            <option value="">Selecione um vistoriador</option>
            {vistoriadores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-field">Observações</label>
          <textarea
            rows={3}
            className="input-field resize-none"
            placeholder="Detalhes adicionais da vistoria (opcional)"
            value={form.observacoes}
            onChange={handleChange('observacoes')}
          />
        </div>

        {errorMsg && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {isEdit ? 'Salvar alterações' : 'Agendar vistoria'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
