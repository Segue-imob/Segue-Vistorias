import { useEffect } from 'react'
import { Trash2, X } from 'lucide-react'

function formatarDataHora(isoString) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return null
  }
}

export default function PhotoLightbox({ open, foto, onClose, onDelete }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !foto) return null

  const dataEnvio = formatarDataHora(foto.created_at)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-medium text-white/60">
          {foto._naoSincronizado ? 'Ainda não sincronizada' : 'Foto do item'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <X size={16} /> Fechar
        </button>
      </div>

      {/* Clicar fora da foto fecha o lightbox; clicar na própria
          imagem não propaga o clique (evita fechar sem querer). */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4 py-2" onClick={onClose}>
        <img
          src={foto.url}
          alt="Foto ampliada do item"
          className="max-h-full max-w-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <p className="text-xs text-white/70">
          {dataEnvio ? `Enviada em ${dataEnvio}` : 'Data de envio indisponível'}
        </p>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
          >
            <Trash2 size={14} /> Remover foto
          </button>
        )}
      </div>
    </div>
  )
}
