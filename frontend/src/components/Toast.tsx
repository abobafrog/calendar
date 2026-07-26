import { CheckCircle2, X } from 'lucide-react'

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Закрыть">
        <X size={17} />
      </button>
    </div>
  )
}
