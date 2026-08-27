import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Check, Zap, ZapOff, Image as ImageIcon } from 'lucide-react'

const ZOOM_LEVELS = [1, 2, 3]

/**
 * Câmera nativa em tela cheia, aberta pelo botão "Foto" do checklist.
 * Usa navigator.mediaDevices.getUserMedia (WebRTC) para exibir o
 * stream ao vivo — nada de <input type="file" capture="..."> aqui,
 * que só delega pro app de câmera do sistema e não permite disparo
 * contínuo, zoom nem controle de flash.
 *
 * Disparo consecutivo: cada toque no botão de captura desenha o
 * frame atual do <video> num <canvas> oculto, gera um Blob e empilha
 * na lista local — a câmera continua aberta até o vistoriador tocar
 * em "Concluir", quando todas as fotos capturadas na sessão são
 * devolvidas de uma vez pro componente pai (que faz o upload).
 *
 * Zoom: tenta a constraint nativa da câmera (track.applyConstraints
 * com `zoom`) quando o hardware/navegador suporta; sempre aplica
 * também um scale() no <video> como zoom digital — funciona em
 * qualquer dispositivo, mesmo sem suporte a zoom nativo.
 *
 * Flash/lanterna: usa a constraint `torch`; o botão só aparece se o
 * dispositivo relatar suporte (a maioria dos notebooks/desktops não
 * tem, então é comum o botão ficar oculto fora de celular).
 */
export default function CameraCaptureModal({ open, onClose, onConcluir, maxFotos, fotosAtuais, onUsarGaleria }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const trackRef = useRef(null)

  const [capturadas, setCapturadas] = useState([])
  const [zoom, setZoom] = useState(1)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSuportado, setTorchSuportado] = useState(false)
  const [erro, setErro] = useState('')
  const [iniciando, setIniciando] = useState(true)

  const restantes = Math.max(maxFotos - fotosAtuais - capturadas.length, 0)

  const pararStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    trackRef.current = null
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelado = false

    async function iniciarCamera() {
      setIniciando(true)
      setErro('')
      setZoom(1)
      setTorchOn(false)

      if (!navigator.mediaDevices?.getUserMedia) {
        setErro('Este navegador não suporta acesso à câmera (WebRTC).')
        setIniciando(false)
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        })
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const track = stream.getVideoTracks()[0]
        trackRef.current = track
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        const capabilities = track.getCapabilities?.() || {}
        setTorchSuportado(Boolean(capabilities.torch))
      } catch (err) {
        console.error('[CameraCaptureModal] Erro ao acessar a câmera:', err.message, err)
        setErro('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
      } finally {
        if (!cancelado) setIniciando(false)
      }
    }

    iniciarCamera()

    return () => {
      cancelado = true
      pararStream()
    }
  }, [open, pararStream])

  const handleSetZoom = useCallback(async (nivel) => {
    setZoom(nivel)
    const track = trackRef.current
    if (!track) return
    const capabilities = track.getCapabilities?.() || {}
    if (capabilities.zoom) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: nivel }] })
      } catch (err) {
        console.warn('[CameraCaptureModal] Zoom nativo indisponível, usando zoom digital (CSS):', err.message)
      }
    }
  }, [])

  const handleToggleTorch = useCallback(async () => {
    const track = trackRef.current
    if (!track || !torchSuportado) return
    const novoEstado = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: novoEstado }] })
      setTorchOn(novoEstado)
    } catch (err) {
      console.warn('[CameraCaptureModal] Não foi possível controlar o flash:', err.message)
    }
  }, [torchOn, torchSuportado])

  const handleCapturar = useCallback(() => {
    if (restantes <= 0) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.videoWidth === 0) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        setCapturadas((prev) => [
          ...prev,
          { blob, url, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
        ])
      },
      'image/jpeg',
      0.9
    )
  }, [restantes])

  const handleRemoverCapturada = (id) => {
    setCapturadas((prev) => {
      const alvo = prev.find((c) => c.id === id)
      if (alvo) URL.revokeObjectURL(alvo.url)
      return prev.filter((c) => c.id !== id)
    })
  }

  const limparCapturadasLocais = () => {
    capturadas.forEach((c) => URL.revokeObjectURL(c.url))
    setCapturadas([])
  }

  const handleConcluir = () => {
    const arquivos = capturadas.map(
      (c, i) => new File([c.blob], `foto-${Date.now()}-${i}.jpg`, { type: 'image/jpeg' })
    )
    limparCapturadasLocais()
    pararStream()
    onConcluir(arquivos)
  }

  const handleFechar = () => {
    limparCapturadasLocais()
    pararStream()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button type="button" onClick={handleFechar} className="rounded-full p-2 hover:bg-white/10" title="Fechar">
          <X size={20} />
        </button>
        <span className="text-sm font-semibold">
          {capturadas.length} foto{capturadas.length === 1 ? '' : 's'} · {restantes} restante
          {restantes === 1 ? '' : 's'}
        </span>
        {torchSuportado ? (
          <button
            type="button"
            onClick={handleToggleTorch}
            className={`rounded-full p-2 transition ${torchOn ? 'bg-brand-accent' : 'hover:bg-white/10'}`}
            title={torchOn ? 'Desligar flash' : 'Ligar flash'}
          >
            {torchOn ? <Zap size={20} /> : <ZapOff size={20} />}
          </button>
        ) : (
          <span className="w-9" />
        )}
      </div>

      <div className="relative flex-1 overflow-hidden bg-black">
        {erro ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white">
            <p>{erro}</p>
            {onUsarGaleria && (
              <button
                type="button"
                onClick={() => {
                  handleFechar()
                  onUsarGaleria()
                }}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                <ImageIcon size={16} /> Escolher da galeria
              </button>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover transition-transform duration-150"
            style={{ transform: `scale(${zoom})` }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {iniciando && !erro && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white">
            Abrindo câmera...
          </div>
        )}
      </div>

      {capturadas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto bg-black/80 px-4 py-2">
          {capturadas.map((c) => (
            <div key={c.id} className="relative h-14 w-14 shrink-0">
              <img src={c.url} alt="Foto capturada" className="h-full w-full rounded-md object-cover" />
              <button
                type="button"
                onClick={() => handleRemoverCapturada(c.id)}
                className="absolute -right-1 -top-1 rounded-full bg-black/80 p-0.5 text-white"
                title="Remover"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!erro && (
        <div className="flex flex-col items-center gap-4 bg-black px-4 py-5">
          <div className="flex items-center gap-2">
            {ZOOM_LEVELS.map((nivel) => (
              <button
                key={nivel}
                type="button"
                onClick={() => handleSetZoom(nivel)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  zoom === nivel ? 'bg-brand-accent text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {nivel}x
              </button>
            ))}
          </div>

          <div className="flex w-full items-center justify-between px-6">
            <button
              type="button"
              onClick={handleConcluir}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              <Check size={16} className="-mt-0.5 mr-1 inline" /> Concluir
            </button>

            <button
              type="button"
              onClick={handleCapturar}
              disabled={restantes <= 0 || iniciando}
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition active:scale-95 disabled:opacity-40"
              title="Capturar foto"
            >
              <span className="h-12 w-12 rounded-full bg-white" />
            </button>

            <div className="w-[92px]" />
          </div>
        </div>
      )}
    </div>
  )
}
