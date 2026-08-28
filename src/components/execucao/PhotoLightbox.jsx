import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'

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

/**
 * Lightbox global (uma instância só, montada no topo da tela de
 * execução) — navega por TODAS as fotos da vistoria, não só as de
 * um item. `foto` já vem enriquecida com `ambienteNome`/`itemNome`
 * (ver montagem de `todasFotos` em VistoriaExecucao.jsx).
 */
export default function PhotoLightbox({ open, foto, onClose, onDelete, onPrev, onNext, hasPrev, hasNext, indice, total }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && hasNext) onNext?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose, onPrev, onNext, hasPrev, hasNext])

  if (!open || !foto) return null

  const dataEnvio = formatarDataHora(foto.created_at)
  const contexto = [foto.ambienteNome, foto.itemNome].filter(Boolean).join(' · ')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <span className="block truncate text-xs font-medium text-white/60">
            {contexto || (foto._naoSincronizado ? 'Ainda não sincronizada' : 'Foto da vistoria')}
          </span>
          {total > 1 && (
            <span className="text-[11px] text-white/40">
              {indice + 1} de {total}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
          title="Fechar"
        >
          <X size={16} /> Fechar
        </button>
      </div>

      {/* Clicar fora da foto (ou nas setas) fecha/navega; clicar na
          própria imagem não propaga o clique (evita fechar sem querer). */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-2" onClick={onClose}>
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPrev?.()
            }}
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
            title="Foto anterior"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <img
          src={foto.url}
          alt="Foto ampliada da vistoria"
          className="max-h-full max-w-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNext?.()
            }}
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
            title="Próxima foto"
          >
            <ChevronRight size={22} />
          </button>
        )}
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
