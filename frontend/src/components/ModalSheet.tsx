import { X } from 'lucide-react'
import type { PropsWithChildren } from 'react'

export function ModalSheet({
  open,
  title,
  onClose,
  children,
}: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) {
  if (!open) return null
  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <span className="modal-sheet__handle" />
        <header>
          <h2 id="sheet-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
