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
 *
 * IMPORTANTE: isto é o visualizador do APP web, não do arquivo PDF
 * exportado. Um PDF estático não tem como abrir um modal React — um
 * link clicável dentro de um PDF sempre navega pra URL (em qualquer
 * leitor: Chrome, Adobe, etc.), isso não é algo que dê pra trocar por
 * software. Esta é a experiência interativa real, aqui no app.
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
    // Trava o scroll da tela por trás enquanto o modal está aberto —
    // fechar ou navegar entre fotos nunca move nem altera o estado da
    // tela de execução por baixo (é tudo estado local deste componente).
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose, onPrev, onNext, hasPrev, hasNext])

  if (!open || !foto) return null

  const dataEnvio = formatarDataHora(foto.created_at)
  const contexto = [foto.ambienteNome, foto.itemNome].filter(Boolean).join(' · ')
  const titulo = `Visualizador de Fotos do Laudo${contexto ? ` - ${contexto}` : ''}`

  return (
    // Overlay escuro semi-transparente com desfoque — a tela por trás
    // (checklist) continua levemente visível, só borrada. Clicar em
    // qualquer parte do overlay fecha o modal; clicar em conteúdo
    // interno (header, footer, setas, a própria foto) não propaga.
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm" onClick={onClose}>
      {/* Header: título centralizado + botão de fechar no canto direito */}
      <div className="relative flex items-center justify-center px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <p className="max-w-[70%] truncate text-center text-sm font-semibold text-white">{titulo}</p>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
          title="Fechar"
        >
          <X size={16} /> <span className="hidden sm:inline">Voltar para o Laudo</span>
        </button>
      </div>

      {/* Imagem + setas grandes de navegação lateral */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-2" onClick={onClose}>
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPrev?.()
            }}
            className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-white/10 px-3 py-3 text-white transition hover:bg-white/20 sm:left-4 sm:px-4"
            title="Foto anterior"
          >
            <ChevronLeft size={26} />
            <span className="hidden text-sm font-semibold sm:inline">Anterior</span>
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
            className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-white/10 px-3 py-3 text-white transition hover:bg-white/20 sm:right-4 sm:px-4"
            title="Próxima foto"
          >
            <span className="hidden text-sm font-semibold sm:inline">Próxima</span>
            <ChevronRight size={26} />
          </button>
        )}
      </div>

      {/* Footer: data de envio · contador "Foto X de Y" centralizado · remover */}
      <div
        className="flex flex-col items-center gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="order-2 text-xs text-white/70 sm:order-1 sm:flex-1">
          {dataEnvio ? `Enviada em ${dataEnvio}` : 'Data de envio indisponível'}
        </p>
        <p className="order-1 text-sm font-semibold text-white sm:order-2">
          {total > 0 ? `Foto ${indice + 1} de ${total}` : ''}
        </p>
        <div className="order-3 sm:flex-1 sm:text-right">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
            >
              <Trash2 size={14} /> Remover foto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
