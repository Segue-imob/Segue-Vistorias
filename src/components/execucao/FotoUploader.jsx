import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'

export default function FotoUploader({ fotos, onUpload, onRemove }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    setUploading(true)
    setErrorMsg('')
    try {
      for (const file of files) {
        await onUpload(file)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {fotos.map((foto) => (
          <div
            key={foto.id}
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200"
          >
            <img src={foto.url} alt="Foto do ambiente" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(foto.id)}
              className="absolute right-0.5 top-0.5 rounded-full bg-slate-900/70 p-0.5 text-white transition hover:bg-red-600"
              title="Remover foto"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:bg-slate-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          <span className="text-[9px] font-semibold">Foto</span>
        </button>
      </div>

      {errorMsg && <p className="mt-1.5 text-xs font-medium text-red-500">{errorMsg}</p>}

      {/* capture="environment" abre a câmera traseira direto em navegadores mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  )
}
