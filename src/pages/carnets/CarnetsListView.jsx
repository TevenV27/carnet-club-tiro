import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllCarnets, regenerateAllCarnets } from '../../services/cardService'
import { buildCarnetsZipBlob } from '../../utils/carnetZip'
import TiltCarnetFace from '../../components/carnet/TiltCarnetFace'
import InactiveBanner from '../../components/ui/InactiveBanner'
import { isActivo } from '../../utils/activoStatus'

const getCedula = (card) => card.cedula || card.id

/** Nombre, cédula y dos caras en fila; tilt como en el generador. Contenedor simple, sin marcos decorativos. */
function FifaOperatorCard({ card }) {
    const cedula = getCedula(card)
    const front = card.frontCardBase64
    const back = card.backCardBase64
    const isTraumatico = card.tipoCarnet === 'traumatico'
    const active = isActivo(card)
    const extra = [
        isTraumatico ? (card.disciplina || 'BAJA LETALIDAD') : card.nivel,
        isTraumatico && card.rolCarnet === 'instructor'
            ? 'INSTRUCTOR DE TIRO'
            : card.numeroMembresia
    ].filter(Boolean).join(' · ')

    return (
        <article
            className={`w-full max-w-[min(100%,52rem)] mx-auto bg-black/35 px-4 pt-5 pb-10 sm:px-6 md:pt-6 md:pb-12 rounded-lg overflow-visible isolate border ${
                active ? 'border-transparent' : 'border-red-500/80'
            }`}
        >
            {!active && (
                <div className="mb-4">
                    <InactiveBanner
                        title="CARNET INACTIVO"
                        message="Esta credencial está desactivada y no debe considerarse vigente."
                    />
                </div>
            )}
            <div className={`text-center mb-5 space-y-1 ${!active ? 'opacity-55 grayscale' : ''}`}>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
                    <h3 className="text-base md:text-lg font-tactical font-bold uppercase tracking-[0.06em] text-tactical-gold leading-snug line-clamp-2">
                        {card.nombre || 'Sin nombre'}
                    </h3>
                    {!active && <InactiveBanner compact title="INACTIVO" />}
                </div>
                <p className="text-[11px] font-tactical uppercase tracking-[0.12em] text-tactical-brass">
                    CC {cedula}
                </p>
                {extra ? (
                    <p className="text-[10px] font-tactical uppercase tracking-[0.1em] text-tactical-brass/70">
                        {extra}
                    </p>
                ) : null}
            </div>

            {/* Dos columnas: ancho fluido (proporción 6×9 cm) */}
            <div className={`grid grid-cols-2 gap-x-3 sm:gap-x-6 md:gap-x-8 w-full min-w-0 items-start ${!active ? 'opacity-45 grayscale' : ''}`}>
                <div className="flex flex-col items-center gap-2 w-full min-w-0 max-w-full py-1 [contain:layout]">
                    <span className="text-[9px] font-tactical uppercase tracking-[0.16em] text-tactical-brass/80 w-full text-center">
                        Frente
                    </span>
                    <div className="w-full flex justify-center min-w-0">
                    <TiltCarnetFace
                        src={front}
                        alt={`Frente ${cedula}`}
                        placeholder="Sin frente"
                        compactWide
                    />
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2 w-full min-w-0 max-w-full py-1 [contain:layout]">
                    <span className="text-[9px] font-tactical uppercase tracking-[0.16em] text-tactical-brass/80 w-full text-center">
                        Reverso
                    </span>
                    <div className="w-full flex justify-center min-w-0">
                    <TiltCarnetFace
                        src={back}
                        alt={`Reverso ${cedula}`}
                        placeholder="Sin reverso"
                        compactWide
                    />
                    </div>
                </div>
            </div>
        </article>
    )
}

function CarnetsListView({ tipoCarnet = 'airsoft' }) {
    const [carnets, setCarnets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [downloading, setDownloading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [updateProgress, setUpdateProgress] = useState(null)
    const isTraumatico = tipoCarnet === 'traumatico'

    const loadCarnets = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getAllCarnets(tipoCarnet)
            setCarnets(data)
        } catch (err) {
            console.error('Error cargando carnets:', err)
            setError('No se pudieron cargar los carnets.')
        } finally {
            setLoading(false)
        }
    }, [tipoCarnet])

    useEffect(() => {
        let isMounted = true

        const load = async () => {
            try {
                setLoading(true)
                const data = await getAllCarnets(tipoCarnet)
                if (isMounted) {
                    setCarnets(data)
                }
            } catch (err) {
                console.error('Error cargando carnets:', err)
                if (isMounted) {
                    setError('No se pudieron cargar los carnets.')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        load()
        return () => {
            isMounted = false
        }
    }, [tipoCarnet])

    const filtered = useMemo(() => {
        if (!searchTerm.trim()) {
            return carnets
        }
        const term = searchTerm.trim().toLowerCase()
        return carnets.filter((c) => {
            const nombre = (c.nombre || '').toLowerCase()
            const ced = String(getCedula(c) || '').toLowerCase()
            return nombre.includes(term) || ced.includes(term)
        })
    }, [carnets, searchTerm])

    const handleDownloadZip = useCallback(async () => {
        if (carnets.length === 0) {
            return
        }
        try {
            setDownloading(true)
            const blob = await buildCarnetsZipBlob(carnets)
            const date = new Date().toISOString().slice(0, 10)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = isTraumatico
                ? `carnets-traumatico-${date}.zip`
                : `carnets-operadores-${date}.zip`

            a.rel = 'noopener'
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Error generando ZIP:', err)
            alert('No se pudo generar el archivo ZIP. Intenta de nuevo.')
        } finally {
            setDownloading(false)
        }
    }, [carnets, isTraumatico])

    const handleUpdateAllCarnets = useCallback(async () => {
        if (carnets.length === 0 || updating) return

        const okConfirm = window.confirm(
            `Se regenerarán ${carnets.length} carnet(es) con el diseño actual y se guardarán en la base de datos.\n\n` +
                'Esto puede tardar varios minutos. ¿Continuar?'
        )
        if (!okConfirm) return

        setUpdating(true)
        setUpdateProgress({ current: 0, total: carnets.length })

        try {
            const result = await regenerateAllCarnets(tipoCarnet, {
                onProgress: ({ current, total }) => {
                    setUpdateProgress({ current, total })
                }
            })

            await loadCarnets()

            if (result.errors.length === 0) {
                alert(`Listo: se actualizaron ${result.ok.length} carnet(es).`)
            } else {
                const sample = result.errors
                    .slice(0, 5)
                    .map((e) => `• ${e.nombre || e.cedula}: ${e.error}`)
                    .join('\n')
                alert(
                    `Actualizados: ${result.ok.length} de ${result.total}.\n` +
                        `Fallidos: ${result.errors.length}.\n\n${sample}` +
                        (result.errors.length > 5 ? '\n…' : '')
                )
            }
        } catch (err) {
            console.error('Error actualizando carnets:', err)
            alert(
                `No se pudo completar la actualización: ${err?.message || 'error desconocido'}`
            )
        } finally {
            setUpdating(false)
            setUpdateProgress(null)
        }
    }, [carnets.length, updating, tipoCarnet, loadCarnets])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-wide">
                    Cargando carnets...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-red-500 font-tactical uppercase tracking-wide">{error}</div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 pb-16 bg-tactical-dark min-h-0 w-full min-w-0 max-w-full text-tactical-brass min-h-full box-border">
            <section className="mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent pointer-events-none" />
                <div className="relative z-10 border border-tactical-border p-[10px] md:p-6 bg-black/30 backdrop-blur-sm shadow-[0_0_25px_rgba(0,0,0,0.6)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-1 bg-tactical-gold shadow-[0_0_20px_rgba(175,153,116,0.9)]" />
                            <div>
                                <h2 className="text-2xl lg:text-3xl font-tactical text-tactical-gold uppercase tracking-[0.05em] drop-shadow-md">
                                    {isTraumatico ? 'Carnets traumáticos' : 'Colección de carnets'}
                                </h2>
                                <p className="text-xs lg:text-sm font-tactical text-tactical-brass opacity-80 tracking-[0.08em] uppercase mt-2">
                                    {isTraumatico
                                        ? 'Baja letalidad · CTV-T · frente y reverso'
                                        : 'Frente y reverso en fila · mueve el cursor sobre cada cara para el efecto 3D'}
                                </p>
                                {updating && updateProgress ? (
                                    <p className="text-[11px] font-tactical text-tactical-gold tracking-[0.08em] uppercase mt-3">
                                        Actualizando {updateProgress.current} / {updateProgress.total}…
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleUpdateAllCarnets}
                                disabled={updating || downloading || carnets.length === 0}
                                className="border border-tactical-gold/80 bg-tactical-gold/10 px-5 py-3 text-xs font-tactical uppercase tracking-[0.1em] text-tactical-gold hover:bg-tactical-gold/20 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                                {updating
                                    ? updateProgress
                                        ? `Actualizando ${updateProgress.current}/${updateProgress.total}…`
                                        : 'Actualizando…'
                                    : 'Actualizar carnets'}
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadZip}
                                disabled={downloading || updating || carnets.length === 0}
                                className="border border-tactical-gold/80 bg-tactical-gold/10 px-5 py-3 text-xs font-tactical uppercase tracking-[0.1em] text-tactical-gold hover:bg-tactical-gold/20 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                                {downloading ? 'Generando ZIP…' : 'Descargar carnets'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border border-tactical-border bg-black/40 backdrop-blur-sm px-[10px] py-[10px] md:px-5 md:py-4 shadow-[0_0_25px_rgba(0,0,0,0.5)]">
                    <div>
                        <p className="text-xs font-tactical text-tactical-brass uppercase tracking-[0.08em]">
                            Buscar por nombre o cédula
                        </p>
                        <p className="text-[10px] font-tactical text-tactical-brass/90 uppercase tracking-[0.12em] mt-1">
                            {filtered.length} en la colección
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/60 border border-tactical-border px-3 py-2 rounded-md w-full lg:w-96 shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
                        <span className="text-tactical-gold text-xs font-tactical uppercase tracking-[0.08em]">
                            Scan
                        </span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Ej: nombre o cédula"
                            className="flex-1 bg-transparent border-0 text-tactical-brass text-sm font-tactical uppercase tracking-[0.05em] placeholder:text-tactical-brass/75 focus:outline-none"
                        />
                    </div>
                </div>
            </section>

            {carnets.length === 0 ? (
                <div className="bg-black border border-dashed border-tactical-border p-6 rounded text-center font-tactical text-sm uppercase">
                    No hay carnets registrados.
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-black border border-tactical-border p-6 rounded text-center font-tactical text-sm uppercase tracking-[0.08em] text-tactical-brass">
                    Sin coincidencias para &quot;{searchTerm}&quot;
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-x-6 gap-y-12 lg:gap-x-10 lg:gap-y-14 justify-items-stretch w-full min-w-0 max-w-7xl mx-auto">
                    {filtered.map((card) => (
                        <FifaOperatorCard key={card.id} card={card} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default CarnetsListView
