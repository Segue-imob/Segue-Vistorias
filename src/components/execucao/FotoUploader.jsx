import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import CameraCaptureModal from './CameraCaptureModal'
import { MAX_FOTOS_POR_ITEM } from '../../lib/vistoriaExecucao'
import { processarArquivoParaUpload } from '../../lib/imageProcessing'

export default function FotoUploader({ fotos, onUpload, onRemove }) {
  const inputRef = useRef(null)
  const [cameraAberta, setCameraAberta] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progresso, setProgresso] = useState(null) // { atual, total } durante upload em lote
  const [errorMsg, setErrorMsg] = useState('')

  const totalFotos = fotos.length
  const atingiuLimite = totalFotos >= MAX_FOTOS_POR_ITEM

  const enviarArquivos = async (files) => {
    if (files.length === 0) return
    setUploading(true)
    setErrorMsg('')
    setProgresso({ atual: 0, total: files.length })
    try {
      for (let i = 0; i < files.length; i++) {
        // Respeita o limite mesmo que a câmera tenha capturado mais
        // fotos do que o espaço restante permitia (proteção extra,
        // além do que o próprio modal de câmera já impede).
        if (totalFotos + i >= MAX_FOTOS_POR_ITEM) {
          setErrorMsg(`Limite de ${MAX_FOTOS_POR_ITEM} fotos por item atingido — nem todas as fotos foram enviadas.`)
          break
        }
        // Marca d'água de data/hora + redimensiona (máx. 1280px) +
        // comprime (WebP/JPEG a 70%) ANTES de subir pro Storage —
        // nunca lança erro: se o processamento falhar, cai pra foto
        // original sem tratamento em vez de travar o upload.
        const arquivoProcessado = await processarArquivoParaUpload(files[i])
        await onUpload(arquivoProcessado)
        setProgresso({ atual: i + 1, total: files.length })
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao enviar foto.')
    } finally {
      setUploading(false)
      setProgresso(null)
    }
  }

  // Fallback (input nativo) — usado só quando a câmera WebRTC não
  // está disponível (navegador sem suporte, permissão negada, etc.)
  // ou quando o vistoriador prefere anexar fotos já existentes.
  const handleFilesGaleria = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    await enviarArquivos(files)
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400">
          {totalFotos}/{MAX_FOTOS_POR_ITEM} fotos
        </span>
        {progresso && (
          <span className="text-[11px] font-medium text-brand-accent">
            Enviando {progresso.atual}/{progresso.total}...
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {fotos.map((foto) => (
          <div
            key={foto.id}
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-brand-border"
          >
            <img src={foto.url} alt="Foto do item" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(foto.id)}
              className="absolute right-0.5 top-0.5 rounded-full bg-brand-900/70 p-0.5 text-white transition hover:bg-red-600"
              title="Remover foto"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setCameraAberta(true)}
          disabled={uploading || atingiuLimite}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-brand-border text-slate-400 transition hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-50"
          title={atingiuLimite ? `Limite de ${MAX_FOTOS_POR_ITEM} fotos atingido` : 'Tirar foto'}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          <span className="text-[9px] font-semibold">Foto</span>
        </button>
      </div>

      {atingiuLimite && (
        <p className="mt-1.5 text-xs font-medium text-slate-400">Limite de {MAX_FOTOS_POR_ITEM} fotos atingido.</p>
      )}
      {errorMsg && <p className="mt-1.5 text-xs font-medium text-red-500">{errorMsg}</p>}

      <CameraCaptureModal
        open={cameraAberta}
        onClose={() => setCameraAberta(false)}
        onConcluir={(arquivos) => {
          setCameraAberta(false)
          enviarArquivos(arquivos)
        }}
        maxFotos={MAX_FOTOS_POR_ITEM}
        fotosAtuais={totalFotos}
        onUsarGaleria={() => inputRef.current?.click()}
      />

      {/* Fallback de galeria — só acionado quando a câmera WebRTC falha */}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesGaleria} />
    </div>
  )
}
