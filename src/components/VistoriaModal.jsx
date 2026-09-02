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

const emptyNovoImovel = {
  codigo_imovel: '',
  cep: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  destinacao: '',
  tipo_imovel: ''
}

const DESTINACAO_OPCOES = ['Residencial', 'Comercial']
const TIPO_IMOVEL_OPCOES = ['Apartamento', 'Casa', 'Loja', 'Sala', 'Cobertura', 'Garden', 'Lote', 'Galpão']

/** Aplica a máscara 00000-000 enquanto o usuário digita o CEP. */
function formatarCep(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 8)
  if (digitos.length <= 5) return digitos
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
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
  const [novoImovel, setNovoImovel] = useState(emptyNovoImovel)
  const [savingImovel, setSavingImovel] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cepErro, setCepErro] = useState('')

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
      setCepErro('')
      setShowNovoImovel(false)
    }
  }, [open, defaultDate, vistoria])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  /**
   * Busca automática por CEP (ViaCEP): assim que o CEP tiver os 8
   * dígitos completos, busca e autopreenche Endereço, Bairro e
   * Cidade — o usuário ainda pode editar os campos depois, a busca
   * só poupa digitação, nunca trava o formulário se falhar.
   */
  const handleCepChange = async (e) => {
    const cepFormatado = formatarCep(e.target.value)
    setNovoImovel((f) => ({ ...f, cep: cepFormatado }))
    setCepErro('')

    const digitos = cepFormatado.replace(/\D/g, '')
    if (digitos.length !== 8) return

    setBuscandoCep(true)
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
      const dados = await resposta.json()
      if (dados.erro) {
        setCepErro('CEP não encontrado — preencha o endereço manualmente.')
      } else {
        setNovoImovel((f) => ({
          ...f,
          endereco: dados.logradouro || f.endereco,
          bairro: dados.bairro || f.bairro,
          cidade: dados.localidade || f.cidade
        }))
      }
    } catch (err) {
      console.error('[VistoriaModal] Erro ao buscar CEP via ViaCEP:', err.message, err)
      setCepErro('Não foi possível buscar o CEP agora — preencha manualmente.')
    } finally {
      setBuscandoCep(false)
    }
  }

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
      setNovoImovel(emptyNovoImovel)
      setCepErro('')
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao cadastrar imóvel.')
    } finally {
      setSavingImovel(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Só 4 campos são realmente obrigatórios pra agendar: Imóvel
    // (que já carrega endereço + código junto, é o mesmo seletor),
    // Vistoriador responsável e Data. Tudo mais — Tipo de vistoria,
    // Hora, Observações — é opcional.
    if (!form.imovel_id || !form.vistoriador_id || !form.data) {
      setErrorMsg('Selecione o imóvel, o vistoriador responsável e a data da vistoria.')
      return
    }
    setSubmitting(true)
    setErrorMsg('')
    try {
      // Hora é opcional agora — sem ela, `new Date("...T")` seria uma
      // data inválida (a assinatura ISO exige um horário). 00:00
      // como padrão evita isso sem impedir o agendamento.
      const horaFinal = form.hora || '00:00'
      const payload = {
        imovel_id: form.imovel_id,
        tipo: form.tipo,
        vistoriador_id: form.vistoriador_id,
        observacoes: form.observacoes || null,
        data_agendamento: new Date(`${form.data}T${horaFinal}`).toISOString()
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
            <div className="mb-3 space-y-2 rounded-lg border border-dashed border-brand-border bg-brand-cream p-3">
              <input
                placeholder="Identificação / Código * (ex: CI 01 - Ed. Priory, apto. 100)"
                className="input-field"
                value={novoImovel.codigo_imovel}
                onChange={(e) => setNovoImovel((f) => ({ ...f, codigo_imovel: e.target.value }))}
              />

              <div>
                <div className="relative">
                  <input
                    placeholder="CEP (ex: 29000-000)"
                    className="input-field"
                    value={novoImovel.cep}
                    onChange={handleCepChange}
                    maxLength={9}
                    inputMode="numeric"
                  />
                  {buscandoCep && (
                    <Loader2
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                    />
                  )}
                </div>
                {cepErro && <p className="mt-1 text-xs font-medium text-amber-600">{cepErro}</p>}
              </div>

              <div className="grid grid-cols-[2fr_1fr] gap-2">
                <input
                  placeholder="Endereço / Rua *"
                  className="input-field"
                  value={novoImovel.endereco}
                  onChange={(e) => setNovoImovel((f) => ({ ...f, endereco: e.target.value }))}
                />
                <input
                  placeholder="Número"
                  className="input-field"
                  value={novoImovel.numero}
                  onChange={(e) => setNovoImovel((f) => ({ ...f, numero: e.target.value }))}
                />
              </div>

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

              <div className="grid grid-cols-2 gap-2">
                <select
                  className="input-field"
                  value={novoImovel.destinacao}
                  onChange={(e) => setNovoImovel((f) => ({ ...f, destinacao: e.target.value }))}
                >
                  <option value="">Destinação</option>
                  {DESTINACAO_OPCOES.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
                <select
                  className="input-field"
                  value={novoImovel.tipo_imovel}
                  onChange={(e) => setNovoImovel((f) => ({ ...f, tipo_imovel: e.target.value }))}
                >
                  <option value="">Tipo de imóvel</option>
                  {TIPO_IMOVEL_OPCOES.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </div>

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
          <label className="label-field">Tipo de vistoria</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_VISTORIA.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tipo }))}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  form.tipo === tipo
                    ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                    : 'border-brand-border text-slate-600 hover:bg-brand-cream'
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
            <label className="label-field">Hora</label>
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
