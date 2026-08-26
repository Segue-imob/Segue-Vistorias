import { Loader2 } from 'lucide-react'

export default function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-400">
      <Loader2 className="animate-spin" size={24} />
    </div>
  )
}
