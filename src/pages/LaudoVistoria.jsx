import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, FileDown, Loader2 } from 'lucide-react'
import {
  buscarDadosParaLaudo,
  construirTodasFotosDoLaudo,
  filtrarAmbientesParaLaudo,
  salvarLaudoPdfAvulso
} from '../lib/laudoData'
import { gerarLaudoPdfBlob } from '../lib/laudoPdf'
import LaudoConteudo from '../components/execucao/LaudoConteudo'
import PhotoLightbox from '../components/execucao/PhotoLightbox'
import { montarNomeArquivoLaudo } from '../lib/vistoriaExecucao'

/**
 * Página `/vistorias/:id/laudo` — rota de verdade (URL navegável),
 * útil pra link direto/favoritar. Na lista de Vistorias, a mesma
 * visualização abre como `LaudoModal` (overlay, sem trocar de rota) —
 * os dois reaproveitam `LaudoConteudo` pra não duplicar a
 * renderização do laudo em dois lugares.
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
            <p className="text-base font-bold text-brand-900">Laudo — {imovel.codigo_imovel || 'Imóvel'}</p>
            <p className="text-xs text-slate-500">{vistoria.tipo || '—'}</p>
          </div>
        </div>
        <button type="button" onClick={handleBaixarPdf} disabled={gerandoPdf} className="btn-primary !py-2 text-xs">
          {gerandoPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          Baixar PDF
        </button>
      </div>
      {erroPdf && <p className="text-xs font-medium text-red-500">{erroPdf}</p>}

      <LaudoConteudo
        vistoria={vistoria}
        ambientesParaExibir={ambientesParaExibir}
        totalFotos={todasFotos.length}
        onOpenFoto={setFotoAmpliada}
      />

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
