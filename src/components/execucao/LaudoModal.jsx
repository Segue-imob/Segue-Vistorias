import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, Loader2, X } from 'lucide-react'
import {
  buscarDadosParaLaudo,
  construirTodasFotosDoLaudo,
  filtrarAmbientesParaLaudo,
  salvarLaudoPdfAvulso
} from '../../lib/laudoData'
import { gerarLaudoPdfBlob } from '../../lib/laudoPdf'
import { montarNomeArquivoLaudo } from '../../lib/vistoriaExecucao'
import LaudoConteudo from './LaudoConteudo'
import PhotoLightbox from './PhotoLightbox'

/**
 * Modal fullscreen do laudo — usado pela lista de Vistorias
 * (`VistoriaListView.jsx`) no lugar de navegar pra `/vistorias/:id/laudo`
 * numa aba nova. Busca os próprios dados ao abrir (`vistoriaId`
 * controla isso: `null` = fechado). Fechar sempre volta exatamente
 * pra lista, porque não houve navegação nenhuma — é só um overlay por
 * cima da mesma página.
 */
export default function LaudoModal({ vistoriaId, onClose }) {
  const [vistoria, setVistoria] = useState(null)
  const [ambientes, setAmbientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [erroCarregar, setErroCarregar] = useState('')

  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [erroPdf, setErroPdf] = useState('')

  const [fotoAmpliada, setFotoAmpliada] = useState(null)

  useEffect(() => {
    if (!vistoriaId) return
    let cancelado = false
    async function carregar() {
      setLoading(true)
      setErroCarregar('')
      setVistoria(null)
      setAmbientes([])
      try {
        const dados = await buscarDadosParaLaudo(vistoriaId)
        if (!cancelado) {
          setVistoria(dados.vistoria)
          setAmbientes(dados.ambientes)
        }
      } catch (err) {
        console.error('[LaudoModal] Erro ao carregar dados do laudo:', err.message, err)
        if (!cancelado) setErroCarregar(err.message || 'Não foi possível carregar esta vistoria.')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [vistoriaId])

  // ESC fecha o modal, e trava o scroll da lista por trás enquanto
  // está aberto — igual ao PhotoLightbox.
  useEffect(() => {
    if (!vistoriaId) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [vistoriaId, onClose])

  const ambientesParaExibir = useMemo(() => filtrarAmbientesParaLaudo(ambientes), [ambientes])
  const todasFotos = useMemo(() => construirTodasFotosDoLaudo(ambientesParaExibir), [ambientesParaExibir])
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

      // Melhor esforço: salva a URL pra próxima abertura já vir com
      // o PDF pronto. Se falhar, o download acima já aconteceu.
      try {
        const urlSalva = await salvarLaudoPdfAvulso(vistoria.id, blob)
        setVistoria((v) => (v ? { ...v, laudo_pdf_url: urlSalva } : v))
      } catch (err) {
        console.warn('[LaudoModal] PDF baixado, mas não foi possível salvar a URL:', err.message)
      }
    } catch (err) {
      console.error('[LaudoModal] Erro ao gerar o PDF:', err.message, err)
      setErroPdf(err.message || 'Erro ao gerar o PDF do laudo.')
    } finally {
      setGerandoPdf(false)
    }
  }

  if (!vistoriaId) return null

  const imovel = vistoria?.imoveis || {}
  const titulo = vistoria
    ? `Laudo de Vistoria - ${vistoria.tipo || '—'} - CI ${imovel.codigo_imovel || '—'}`
    : 'Laudo de Vistoria'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-900/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col bg-white shadow-modal sm:my-4 sm:h-[calc(100%-2rem)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho fixo do modal */}
        <div className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-3 sm:rounded-t-2xl">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-brand-900">{titulo}</p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={gerandoPdf || !vistoria}
              className="btn-primary !py-1.5 text-xs"
            >
              {gerandoPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-brand-cream"
            >
              <X size={16} /> Fechar
            </button>
          </div>
        </div>

        {/* Corpo com rolagem própria — o resto do modal fica fixo */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : erroCarregar || !vistoria ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <AlertTriangle size={20} className="text-amber-500" />
              <p className="text-sm font-semibold text-slate-700">
                Não foi possível carregar o laudo desta vistoria.
              </p>
              {erroCarregar && <p className="max-w-md text-xs text-slate-400">Detalhe técnico: {erroCarregar}</p>}
            </div>
          ) : (
            <>
              {erroPdf && <p className="mb-3 text-xs font-medium text-red-500">{erroPdf}</p>}
              <LaudoConteudo
                vistoria={vistoria}
                ambientesParaExibir={ambientesParaExibir}
                totalFotos={todasFotos.length}
                onOpenFoto={setFotoAmpliada}
              />
            </>
          )}
        </div>
      </div>

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
