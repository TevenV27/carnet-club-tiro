function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-4xl bg-tactical-dark border border-tactical-border shadow-[0_0_35px_rgba(0,0,0,0.6)]">
        <header className="flex items-center justify-between border-b border-tactical-border px-6 py-4">
          <h3 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-tactical-brass/60 hover:text-tactical-gold transition-colors duration-150 font-tactical text-sm uppercase tracking-[0.3em]"
          >
            Cerrar
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <footer className="border-t border-tactical-border px-6 py-4 flex justify-end gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

export default Modal

