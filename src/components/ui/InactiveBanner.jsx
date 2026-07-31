/**
 * Banner de estado inactivo — muy visible en consultas de operador / carnet.
 */
function InactiveBanner({
    title = 'INACTIVO',
    message = 'Este registro está desactivado.',
    compact = false
}) {
    if (compact) {
        return (
            <div
                role="status"
                className="inline-flex items-center gap-2 border-2 border-red-500 bg-red-950/90 px-3 py-1 text-[10px] font-tactical font-bold uppercase tracking-[0.14em] text-red-300 shadow-[0_0_20px_rgba(220,38,38,0.45)]"
            >
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
                {title}
            </div>
        )
    }

    return (
        <div
            role="alert"
            className="relative overflow-hidden border-2 border-red-500 bg-red-950/85 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_0_35px_rgba(220,38,38,0.35)]"
        >
            <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(220,38,38,0.35) 8px, rgba(220,38,38,0.35) 16px)'
                }}
            />
            <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <span className="inline-flex w-fit items-center gap-2 border border-red-400 bg-red-900/80 px-3 py-1.5 text-sm font-tactical font-bold uppercase tracking-[0.16em] text-red-100">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />
                    {title}
                </span>
                <p className="text-xs sm:text-sm font-tactical uppercase tracking-[0.08em] text-red-200/95 leading-relaxed">
                    {message}
                </p>
            </div>
        </div>
    )
}

export default InactiveBanner
