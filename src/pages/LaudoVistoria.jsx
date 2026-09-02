import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, ArrowLeft, ExternalLink, FileDown, Loader2 } from 'lucide-react'
import { buscarDadosParaLaudo, salvarLaudoPdfAvulso } from '../lib/laudoData'
import { gerarLaudoPdfBlob } from '../lib/laudoPdf'
import PhotoLightbox from '../components/execucao/PhotoLightbox'
import {
  AGUA_OPCOES,
  ENERGIA_OPCOES,
  ESTADO_LIMPEZA_OPCOES,
  FUNCIONAMENTO_OPCOES,
  GAS_OPCOES,
  getEstadoItemMeta,
  getLabelOpcao,
  montarNomeArquivoLaudo
} from '../lib/vistoriaExecucao'

function formatarDataHora(iso) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '—'
  }
}

/** Carimbo sobreposto na miniatura — com segundos, formato exato pedido. */
function formatarCarimboFoto(iso) {
  if (!iso) return null
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
  } catch {
    return null
  }
}

function labelFuncionamento(valor) {
  return FUNCIONAMENTO_OPCOES.find((f) => f.value === valor)?.label
}

/**
 * Página `/vistorias/:id/laudo` — rota de verdade (URL navegável),
 * não um blob: aberto numa aba em branco (padrão frágil, quebrava em
 * vários navegadores). Duas situações:
 *
 * 1. `vistoria.laudo_pdf_url` já existe -> mostra o PDF já gerado
 *    (iframe + link "abrir em nova aba").
 * 2. Não existe ainda -> renderiza o laudo em HTML/React direto
 *    nesta tela, buscando os dados ao vivo em `vistorias`,
 *    `vistoria_ambientes`, `vistoria_itens` e `vistoria_fotos` — sem
 *    depender de um PDF já ter sido gerado.
 *
 * Em qualquer um dos dois casos, o botão "Baixar PDF" gera uma
 * versão fresca na hora e salva a URL (melhor esforço).
 */
export default function LaudoVistoria() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [vistoria, setVistoria] = useState(null)
  const [ambientes, setAmbientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [erroCarregar, setErroCarregar] = useState('')

  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [erroPdf, setErroPdf] = useState('')

  const [fotoAmpliada, setFotoAmpliada] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      setLoading(true)
      setErroCarregar('')
      try {
        const dados = await buscarDadosParaLaudo(id)
        if (!cancelado) {
          setVistoria(dados.vistoria)
          setAmbientes(dados.ambientes)
        }
      } catch (err) {
        console.error('[LaudoVistoria] Erro ao carregar dados do laudo:', err.message, err)
        if (!cancelado) setErroCarregar(err.message || 'Não foi possível carregar esta vistoria.')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [id])

  // Mesmo filtro estrito usado no PDF: só ambientes com pelo menos um
  // item avaliado, só itens com condição preenchida.
  const ambientesParaExibir = useMemo(() => {
    return ambientes
      .map((amb) => ({ ...amb, vistoria_itens: (amb.vistoria_itens || []).filter((it) => it.estado) }))
      .filter((amb) => amb.vistoria_itens.length > 0)
  }, [ambientes])

  const todasFotos = useMemo(() => {
    const lista = []
    ambientesParaExibir.forEach((amb) => {
      const nomeAmbiente = amb.ambiente || amb.nome
      ;(amb.vistoria_itens || []).forEach((item) => {
        const nomeItem = item.item || item.nome
        ;(item.vistoria_fotos || []).forEach((foto) => {
          lista.push({ ...foto, ambienteNome: nomeAmbiente, itemNome: nomeItem })
        })
      })
    })
    return lista
  }, [ambientesParaExibir])

  const indiceFotoAmpliada = todasFotos.findIndex((f) => f.id === fotoAmpliada?.id)

  const handleBaixarPdf = async () => {
    if (!vistoria) return
    setGerandoPdf(true)
    setErroPdf('')
    try {
      const blob = await gerarLaudoPdfBlob(vistoria, ambientes)
      const nomeArquivo = montarNomeArquivoLaudo(vistoria)
      const urlObjeto = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = urlObjeto
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(urlObjeto)

      // Melhor esforço: salva a URL pra próxima visita já vir com o
      // PDF pronto, sem regenerar. Se falhar, o download acima já
      // aconteceu, então não é um erro que precise travar a tela.
      try {
        const urlSalva = await salvarLaudoPdfAvulso(vistoria.id, blob)
        setVistoria((v) => (v ? { ...v, laudo_pdf_url: urlSalva } : v))
      } catch (err) {
        console.warn('[LaudoVistoria] PDF baixado, mas não foi possível salvar a URL:', err.message)
      }
    } catch (err) {
      console.error('[LaudoVistoria] Erro ao gerar o PDF:', err.message, err)
      setErroPdf(err.message || 'Erro ao gerar o PDF do laudo.')
    } finally {
      setGerandoPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    )
  }

  if (erroCarregar || !vistoria) {
    return (
      <div className="card flex flex-col items-center gap-2 p-6 text-center">
        <AlertTriangle size={20} className="text-amber-500" />
        <p className="text-sm font-semibold text-slate-700">Não foi possível carregar o laudo desta vistoria.</p>
        {erroCarregar && <p className="max-w-md text-xs text-slate-400">Detalhe técnico: {erroCarregar}</p>}
        <button type="button" onClick={() => navigate('/vistorias')} className="btn-secondary mt-2">
          <ArrowLeft size={14} /> Voltar para Vistorias
        </button>
      </div>
    )
  }

  const imovel = vistoria.imoveis || {}
  const endereco = [imovel.endereco, imovel.bairro, imovel.cidade].filter(Boolean).join(', ')

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/vistorias')}
            className="rounded-lg p-2 text-slate-500 hover:bg-brand-cream"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-base font-bold text-brand-900">
              Laudo — {imovel.codigo_imovel || 'Imóvel'}
            </p>
            <p className="text-xs text-slate-500">{endereco || '—'}</p>
          </div>
        </div>
        <button type="button" onClick={handleBaixarPdf} disabled={gerandoPdf} className="btn-primary !py-2 text-xs">
          {gerandoPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          Baixar PDF
        </button>
      </div>
      {erroPdf && <p className="text-xs font-medium text-red-500">{erroPdf}</p>}

      {vistoria.laudo_pdf_url ? (
        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-brand-900">PDF já sincronizado</p>
            <a
              href={vistoria.laudo_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
            >
              <ExternalLink size={13} /> Abrir em nova aba
            </a>
          </div>
          <iframe
            src={vistoria.laudo_pdf_url}
            title="Laudo em PDF"
            className="h-[75vh] w-full rounded-lg border border-brand-border"
          />
          <p className="text-xs text-slate-400">
            Se o PDF não aparecer acima (alguns navegadores bloqueiam a pré-visualização), use "Abrir em nova
            aba".
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            Esta vistoria ainda não tem um PDF salvo — exibindo o laudo montado na hora, direto dos dados
            atuais.
          </p>

          {/* ---- Cabeçalho ---- */}
          <div className="card space-y-3 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Endereço completo</p>
            <p className="text-lg font-bold text-brand-900">{endereco || '—'}</p>
            <div className="grid grid-cols-1 gap-3 border-t border-brand-border pt-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Tipo de vistoria
                </p>
                <p className="text-sm font-semibold text-brand-900">{vistoria.tipo || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Data/hora de início
                </p>
                <p className="text-sm font-semibold text-brand-900">{formatarDataHora(vistoria.data_agendamento)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Data/hora de finalização
                </p>
                <p className="text-sm font-semibold text-brand-900">
                  {formatarDataHora(vistoria.finalizada_em || vistoria.concluida_em)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 border-t border-brand-border pt-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Vistoriador responsável
                </p>
                <p className="text-sm font-semibold text-brand-900">{vistoria.vistoriador?.nome || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total de fotos</p>
                <p className="text-sm font-semibold text-brand-900">{todasFotos.length}</p>
              </div>
            </div>
          </div>

          {/* ---- Informações do imóvel ---- */}
          {(() => {
            const badges = [
              { rotulo: 'Estado de limpeza', bruto: vistoria.estado_limpeza, opcoes: ESTADO_LIMPEZA_OPCOES },
              { rotulo: 'Energia', bruto: vistoria.energia, opcoes: ENERGIA_OPCOES },
              { rotulo: 'Água', bruto: vistoria.agua, opcoes: AGUA_OPCOES },
              { rotulo: 'Gás', bruto: vistoria.gas, opcoes: GAS_OPCOES }
            ]
              .filter((c) => c.bruto)
              .map((c) => ({ rotulo: c.rotulo, valor: getLabelOpcao(c.opcoes, c.bruto) }))
            if (badges.length === 0) return null
            return (
              <div className="card p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Informações do imóvel
                </p>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span key={b.rotulo} className="rounded-full bg-brand-cream px-3 py-1.5 text-xs">
                      <span className="font-semibold text-brand-700">{b.rotulo}:</span>{' '}
                      <span className="font-bold text-brand-900">{b.valor}</span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ---- Ambientes / itens / fotos ---- */}
          {ambientesParaExibir.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-500">
              Nenhum item avaliado nesta vistoria até o momento.
            </div>
          ) : (
            ambientesParaExibir.map((ambiente, ambIndex) => (
              <div key={ambiente.id} className="card space-y-4 p-4">
                <p className="rounded-md bg-brand-900 px-3 py-1.5 text-sm font-bold text-white">
                  {ambIndex + 1}. {ambiente.ambiente || ambiente.nome}
                </p>
                {(ambiente.vistoria_itens || []).map((item, itemIndex) => {
                  const meta = getEstadoItemMeta(item.estado)
                  const nomeItem = item.item || item.nome
                  const funcLabel = labelFuncionamento(item.funcionamento)
                  return (
                    <div key={item.id} className="border-b border-brand-border/60 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-bold text-brand-900">
                        {ambIndex + 1}.{itemIndex + 1} {nomeItem}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-brand-900">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: meta ? meta.color : '#bfb8ae' }}
                        />
                        {meta ? `Condição: ${meta.label}` : 'Não avaliado'}
                        {funcLabel && <span className="text-slate-500">· Funcionamento: {funcLabel}</span>}
                      </div>
                      {item.observacao && <p className="mt-1 pl-4 text-xs text-slate-500">{item.observacao}</p>}
                      {(item.vistoria_fotos || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 pl-4">
                          {(item.vistoria_fotos || []).map((foto) => (
                            <button
                              key={foto.id}
                              type="button"
                              onClick={() => setFotoAmpliada({ ...foto, ambienteNome: ambiente.ambiente || ambiente.nome, itemNome: nomeItem })}
                              className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-brand-border"
                            >
                              <img src={foto.url} alt="Foto do item" className="h-full w-full object-cover" />
                              {foto.created_at && (
                                <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-slate-900 shadow-sm">
                                  {formatarCarimboFoto(foto.created_at)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}

          {/* ---- Encerramento ---- */}
          {(vistoria.observacoes_finais || vistoria.assinatura_url) && (
            <div className="card space-y-3 p-4">
              {vistoria.observacoes_finais && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Observações finais
                  </p>
                  <p className="text-sm text-slate-700">{vistoria.observacoes_finais}</p>
                </div>
              )}
              {vistoria.assinatura_url && (
                <div className="border-t border-brand-border pt-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Assinatura do vistoriador
                  </p>
                  <img src={vistoria.assinatura_url} alt="Assinatura do vistoriador" className="h-20 object-contain" />
                  <p className="mt-1 text-xs text-slate-500">
                    Vistoria concluída em: {formatarDataHora(vistoria.finalizada_em || vistoria.concluida_em)}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <PhotoLightbox
        open={Boolean(fotoAmpliada)}
        foto={fotoAmpliada}
        onClose={() => setFotoAmpliada(null)}
        onPrev={() => indiceFotoAmpliada > 0 && setFotoAmpliada(todasFotos[indiceFotoAmpliada - 1])}
        onNext={
          () =>
            indiceFotoAmpliada >= 0 &&
            indiceFotoAmpliada < todasFotos.length - 1 &&
            setFotoAmpliada(todasFotos[indiceFotoAmpliada + 1])
        }
        hasPrev={indiceFotoAmpliada > 0}
        hasNext={indiceFotoAmpliada >= 0 && indiceFotoAmpliada < todasFotos.length - 1}
        indice={indiceFotoAmpliada}
        total={todasFotos.length}
      />
    </div>
  )
}
