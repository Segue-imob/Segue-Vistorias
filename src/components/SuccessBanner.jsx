import { CheckCircle2 } from 'lucide-react'

export default function SuccessBanner({ message }) {
  if (!message) return null

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#4CAF50]/10 px-3 py-2 text-sm font-medium text-[#2E7D32]">
      <CheckCircle2 size={15} className="shrink-0" />
      {message}
    </div>
  )
}
