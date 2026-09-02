import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileDown, History, Loader2, MapPin, Plus, RefreshCw } from 'lucide-react'
import { useVistoriaExecucao } from '../hooks/useVistoriaExecucao'
import { useAuth } from '../context/AuthContext'
import { isAdmin } from '../lib/permissions'
import AmbienteSummaryCard from '../components/execucao/AmbienteSummaryCard'
import ItemCard from '../components/execucao/ItemCard'
import InformacoesGeraisCard from '../components/execucao/InformacoesGeraisCard'
import FinalizarVistoriaModal from '../components/execucao/FinalizarVistoriaModal'
import PhotoLightbox from '../components/execucao/PhotoLightbox'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import SuccessBanner from '../components/SuccessBanner'
import { AMBIENTE_PERSONALIZADO, AMBIENTES_GRUPOS, AMBIENTES_PADRAO, buildMapsUrl, getCatalogoItensDoAmbiente, montarNomeArquivoLaudo } from '../lib/vistoriaExecucao'
import { gerarLaudoPdfBlob } from '../lib/laudoPdf'

export default function VistoriaExecucao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()

  const {
    vistoria,
    ambientes,
    loading,
    error,
    vistoriaEntradaRef,
    addAmbiente,
    removeAmbiente,
    addItemCustom,
    removeItem,
    setItemEstado,
    setItemFuncionamento,
    updateItemObservacao,
    addFotoItem,
    removeFotoItem,
    aceitarVistoria,
    finalizarVistoria,
    salvarLaudoPdf,
    sincronizarVistoria,
    updateInfoGeral,
    importarDeVistoriaEntrada
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
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [pdfErrorMsg, setPdfErrorMsg] = useState('')
  const [sincronizando, setSincronizando] = useState(false)
  const [sincronizarSucesso, setSincronizarSucesso] = useState('')
  const [sincronizarErro, setSincronizarErro] = useState('')
  const [respondeuImportacao, setRespondeuImportacao] = useState(false)
  const [importando, setImportando] = useState(false)
  const [importarErro, setImportarErro] = useState('')
  const [infoGeralError, setInfoGeralError] = useState('')

  // Lightbox global de fotos — navega por TODAS as fotos da vistoria
  // (não só as de um item), por isso mora aqui no topo, não dentro do
  // FotoUploader de cada item.
  const [fotoAmpliadaId, setFotoAmpliadaId] = useState(null)
  const [fotoParaExcluirGlobal, setFotoParaExcluirGlobal] = useState(null)

  const activeAmbiente = useMemo(
    () => ambientes.find((a) => a.id === activeAmbienteId) || null,
    [ambientes, activeAmbienteId]
  )

  // Sugestões do catálogo pro "Pesquise aqui" de Adicionar Item: pega
  // o catálogo específico deste ambiente, tira quem já foi adicionado,
  // e filtra pelo texto digitado (se houver).
  const sugestoesItens = useMemo(() => {
    if (!activeAmbiente) return []
    const catalogo = getCatalogoItensDoAmbiente(activeAmbiente.ambiente || activeAmbiente.nome)
    const nomesExistentes = new Set(
      (activeAmbiente.vistoria_itens || []).map((it) => (it.item || it.nome || '').trim().toLowerCase())
    )
    const termo = novoItemNome.trim().toLowerCase()
    return catalogo.filter((nomeItem) => {
      if (nomesExistentes.has(nomeItem.trim().toLowerCase())) return false
      if (!termo) return true
      return nomeItem.toLowerCase().includes(termo)
    })
  }, [activeAmbiente, novoItemNome])

  // Lista achatada, em ordem, de todas as fotos de todos os
  // ambientes/itens — cada foto carrega de onde veio (ambienteId,
  // itemId, nomes) pra navegação e remoção funcionarem sem precisar
  // fechar e reabrir o modal.
  const todasFotos = useMemo(() => {
    const lista = []
    ambientes.forEach((amb) => {
      const nomeAmbiente = amb.ambiente || amb.nome
      ;(amb.vistoria_itens || []).forEach((item) => {
        const nomeItem = item.item || item.nome
        ;(item.vistoria_fotos || []).forEach((foto) => {
          lista.push({
            ...foto,
            ambienteId: amb.id,
            itemId: item.id,
            ambienteNome: nomeAmbiente,
            itemNome: nomeItem
          })
        })
      })
    })
    return lista
  }, [ambientes])

  const indiceFotoAmpliada = todasFotos.findIndex((f) => f.id === fotoAmpliadaId)
  const fotoAmpliada = indiceFotoAmpliada >= 0 ? todasFotos[indiceFotoAmpliada] : null

  // Automação de status: assim que o VISTORIADOR (não o Administrador
  // navegando/conferindo) abre uma vistoria ainda "agendada", ela
  // passa pra "aceita" sozinha — não existe mais troca manual de
  // status em lugar nenhum do app; cada valor só muda por uma ação
  // real do sistema (criação -> agendada, abrir em campo -> aceita,
  // finalizar -> finalizada). `jaTentouAceitar` evita repetir a
  // chamada a cada re-render depois da primeira tentativa.
  const jaTentouAceitar = useRef(false)
  useEffect(() => {
    if (!vistoria || isAdmin(role)) return
    if (vistoria.status !== 'agendada') return
    if (jaTentouAceitar.current) return
    jaTentouAceitar.current = true
    aceitarVistoria().catch((err) => {
      console.error('[VistoriaExecucao] Erro ao aceitar automaticamente a vistoria:', err.message, err)
    })
  }, [vistoria, role, aceitarVistoria])

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

  // Entrada -> Saída: oferece importar ambientes/fotos da Entrada
  // anterior só antes do vistoriador ter criado qualquer ambiente
  // manualmente (senão a pergunta apareceria em cima de um checklist
  // já em andamento) e só uma vez por sessão (`respondeuImportacao`).
  const podeOferecerImportacao =
    Boolean(vistoriaEntradaRef) && ambientes.length === 0 && !isEncerrada && !respondeuImportacao

  const handleAceitarImportacao = async () => {
    setImportando(true)
    setImportarErro('')
    try {
      await importarDeVistoriaEntrada(vistoriaEntradaRef.id)
      setRespondeuImportacao(true)
    } catch (err) {
      console.error('[VistoriaExecucao] Erro ao importar dados da Vistoria de Entrada:', err.message, err)
      setImportarErro(err.message || 'Erro ao importar os dados da Vistoria de Entrada.')
    } finally {
      setImportando(false)
    }
  }

  const handleRecusarImportacao = () => {
    setRespondeuImportacao(true)
  }

  const handleAddAmbiente = async () => {
    const nome = novoAmbiente === AMBIENTE_PERSONALIZADO ? customAmbiente.trim() : novoAmbiente
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

  /** Adiciona diretamente um item sugerido do catálogo (clique no "+" da pílula). */
  const handleAddItemDoCatalogo = async (nomeItem) => {
    setAddItemError('')
    setAddingItem(true)
    try {
      await addItemCustom(activeAmbienteId, nomeItem)
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

  const handleFinalizarConfirm = async (signatureBlob, observacoesFinais) => {
    await finalizarVistoria(signatureBlob, observacoesFinais)
    setFinalizarOpen(false)
    // Fica na própria tela (agora em modo somente leitura) em vez de
    // navegar embora — é aqui que mora o botão de gerar o laudo em PDF.
  }

  const handleUpdateInfoGeral = async (campo, valor) => {
    setInfoGeralError('')
    try {
      await updateInfoGeral(campo, valor)
    } catch (err) {
      setInfoGeralError(err.message || 'Erro ao salvar informação do imóvel.')
    }
  }

  const handleGerarLaudo = async () => {
    setGerandoPdf(true)
    setPdfErrorMsg('')
    try {
      const blob = await gerarLaudoPdfBlob(vistoria, ambientes)

      // Dispara o download direto no dispositivo do vistoriador.
      const nomeArquivo = montarNomeArquivoLaudo(vistoria)
      const urlObjeto = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = urlObjeto
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(urlObjeto)

      // Sobe o mesmo PDF pro Storage e grava laudo_pdf_url — melhor
      // esforço: se falhar, o download acima já aconteceu, então o
      // vistoriador não fica sem o arquivo por causa disso.
      await salvarLaudoPdf(blob)
    } catch (err) {
      console.error('[VistoriaExecucao] Erro ao gerar o laudo em PDF:', err.message, err)
      setPdfErrorMsg(err.message || 'Erro ao gerar o PDF do laudo.')
    } finally {
      setGerandoPdf(false)
    }
  }

  const handleSincronizar = async () => {
    setSincronizando(true)
    setSincronizarErro('')
    setSincronizarSucesso('')
    try {
      const blob = await gerarLaudoPdfBlob(vistoria, ambientes)
      await sincronizarVistoria(blob)
      setSincronizarSucesso('Vistoria sincronizada com sucesso! O laudo já está disponível para o solicitante.')
    } catch (err) {
      console.error('[VistoriaExecucao] Erro ao sincronizar a vistoria:', err.message, err)
      setSincronizarErro(err.message || 'Erro ao sincronizar a vistoria.')
    } finally {
      setSincronizando(false)
    }
  }

  // ---- Lightbox global de fotos ----
  const handleAbrirFoto = (foto) => setFotoAmpliadaId(foto.id)
  const handleFecharLightbox = () => setFotoAmpliadaId(null)
  const handleFotoAnterior = () => {
    if (indiceFotoAmpliada > 0) setFotoAmpliadaId(todasFotos[indiceFotoAmpliada - 1].id)
  }
  const handleFotoProxima = () => {
    if (indiceFotoAmpliada >= 0 && indiceFotoAmpliada < todasFotos.length - 1) {
      setFotoAmpliadaId(todasFotos[indiceFotoAmpliada + 1].id)
    }
  }
  const handlePedirRemocaoGlobal = () => {
    if (!fotoAmpliada) return
    setFotoAmpliadaId(null)
    setFotoParaExcluirGlobal(fotoAmpliada)
  }
  const handleConfirmarRemocaoGlobal = async () => {
    if (!fotoParaExcluirGlobal) return
    await removeFotoItem(fotoParaExcluirGlobal.ambienteId, fotoParaExcluirGlobal.itemId, fotoParaExcluirGlobal.id)
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
            {activeAmbiente ? activeAmbiente.ambiente || activeAmbiente.nome : vistoria.imoveis?.codigo_imovel}
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
            {(activeAmbiente.vistoria_itens || []).length === 0 && (
              <div className="card p-6 text-center text-sm text-slate-500">
                Nenhum item adicionado ainda neste ambiente.
                {!isEncerrada && ' Use a busca abaixo para escolher ou digitar o primeiro item.'}
              </div>
            )}
            {(activeAmbiente.vistoria_itens || []).map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                readOnly={isEncerrada}
                onSetEstado={(estado) => setItemEstado(activeAmbiente.id, item.id, estado)}
                onSetFuncionamento={(funcionamento) => setItemFuncionamento(activeAmbiente.id, item.id, funcionamento)}
                onUpdateObservacao={(observacao) => updateItemObservacao(activeAmbiente.id, item.id, observacao)}
                onUploadFoto={(file) => addFotoItem(activeAmbiente.id, item.id, file)}
                onRemoveFoto={(fotoId) => removeFotoItem(activeAmbiente.id, item.id, fotoId)}
                onRemoveItem={() => removeItem(activeAmbiente.id, item.id)}
                onOpenFoto={handleAbrirFoto}
              />
            ))}
          </div>

          {!isEncerrada && (
            <div className="card space-y-2 p-4">
              <p className="label-field !mb-0">Adicionar item</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="input-field"
                  placeholder="Pesquise aqui... (ou digite um item personalizado)"
                  value={novoItemNome}
                  onChange={(e) => setNovoItemNome(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddItemCustom}
                  disabled={addingItem || !novoItemNome.trim()}
                  className="btn-primary shrink-0"
                >
                  {addingItem ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Adicionar
                </button>
              </div>
              {addItemError && <p className="text-xs font-medium text-red-500">{addItemError}</p>}

              {sugestoesItens.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sugestoesItens.map((nomeItem) => (
                    <button
                      key={nomeItem}
                      type="button"
                      onClick={() => handleAddItemDoCatalogo(nomeItem)}
                      disabled={addingItem}
                      className="flex items-center gap-1 rounded-full border border-brand-border px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-brand-cream disabled:opacity-50"
                    >
                      <Plus size={11} /> {nomeItem}
                    </button>
                  ))}
                </div>
              )}
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

          <InformacoesGeraisCard
            vistoria={vistoria}
            readOnly={isEncerrada}
            onUpdateCampo={handleUpdateInfoGeral}
            errorMsg={infoGeralError}
          />

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
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGerarLaudo}
                  disabled={gerandoPdf}
                  className="btn-primary !py-2 text-xs"
                >
                  {gerandoPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  Imprimir / Baixar Laudo PDF
                </button>
                <button
                  type="button"
                  onClick={handleSincronizar}
                  disabled={sincronizando}
                  className="btn-secondary !py-2 text-xs"
                  title="Gera o laudo, envia pro Storage e libera o acesso para o Solicitante"
                >
                  {sincronizando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Sincronizar Vistoria
                </button>
              </div>
              {pdfErrorMsg && <p className="mt-2 text-xs font-medium text-red-500">{pdfErrorMsg}</p>}
              {sincronizarErro && <p className="mt-2 text-xs font-medium text-red-500">{sincronizarErro}</p>}
              {sincronizarSucesso && (
                <div className="mt-2">
                  <SuccessBanner message={sincronizarSucesso} />
                </div>
              )}
              {vistoria.sincronizado && !sincronizarSucesso && (
                <p className="mt-2 text-xs font-medium text-[#2E7D32]">
                  ✓ Esta vistoria já foi sincronizada — o laudo está disponível para o solicitante.
                </p>
              )}
            </div>
          )}

          {!isEncerrada && (
            <div className="card space-y-2 p-4">
              <p className="label-field !mb-0">Adicionar ambiente</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  className="input-field sm:max-w-[260px]"
                  value={novoAmbiente}
                  onChange={(e) => setNovoAmbiente(e.target.value)}
                >
                  {AMBIENTES_GRUPOS.map((grupo) => (
                    <optgroup key={grupo.grupo} label={grupo.grupo}>
                      {grupo.ambientes.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {novoAmbiente === AMBIENTE_PERSONALIZADO && (
                  <input
                    className="input-field"
                    placeholder="Nome do ambiente (ex: Quarto 3, Adega...)"
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

      <PhotoLightbox
        open={Boolean(fotoAmpliada)}
        foto={fotoAmpliada}
        onClose={handleFecharLightbox}
        onPrev={handleFotoAnterior}
        onNext={handleFotoProxima}
        hasPrev={indiceFotoAmpliada > 0}
        hasNext={indiceFotoAmpliada >= 0 && indiceFotoAmpliada < todasFotos.length - 1}
        indice={indiceFotoAmpliada}
        total={todasFotos.length}
        onDelete={isEncerrada ? undefined : handlePedirRemocaoGlobal}
      />

      <ConfirmDialog
        open={Boolean(fotoParaExcluirGlobal)}
        onClose={() => setFotoParaExcluirGlobal(null)}
        title="Remover foto"
        description="Deseja excluir esta foto?"
        confirmLabel="Excluir foto"
        danger
        onConfirm={handleConfirmarRemocaoGlobal}
      />

      <Modal
        open={podeOferecerImportacao}
        onClose={handleRecusarImportacao}
        title="Vistoria de Entrada encontrada"
        subtitle="Identificamos uma Vistoria de Entrada anterior para este imóvel."
      >
        <div className="flex items-start gap-3">
          <History size={20} className="mt-0.5 shrink-0 text-brand-accent" />
          <p className="text-sm text-slate-600">
            Deseja aproveitar os ambientes e as fotos como referência para esta Vistoria de Saída? Os itens
            entram sem condição avaliada — você reavalia cada um em campo, comparando com o que foi registrado
            na Entrada. As observações antigas ficam marcadas como referência, e você pode acrescentar novas
            fotos de comparação a qualquer momento.
          </p>
        </div>

        {importarErro && <p className="mt-3 text-xs font-medium text-red-500">{importarErro}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleRecusarImportacao}
            disabled={importando}
            className="btn-secondary justify-center"
          >
            Começar em branco
          </button>
          <button
            type="button"
            onClick={handleAceitarImportacao}
            disabled={importando}
            className="btn-primary justify-center"
          >
            {importando && <Loader2 size={15} className="animate-spin" />}
            Aproveitar como referência
          </button>
        </div>
      </Modal>
    </div>
  )
}
