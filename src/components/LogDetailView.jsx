import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLogsByDate } from '../services/logService'

function LogDetailView() {
    const { date } = useParams()
    const navigate = useNavigate()
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        const fetchLogs = async () => {
            try {
                setLoading(true)
                const data = await getLogsByDate(date)
                if (isMounted) {
                    setLogs(data)
                }
            } catch (err) {
                console.error('Error cargando logs del día:', err)
                if (isMounted) {
                    setError('No se pudieron cargar los logs del día. Intenta nuevamente más tarde.')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        if (date) {
            fetchLogs()
        }
        return () => {
            isMounted = false
        }
    }, [date])

    const formatDate = (dateKey) => {
        try {
            const [year, month, day] = dateKey.split('-')
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            return dateObj.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        } catch (error) {
            return dateKey
        }
    }

    const formatTime = (timestamp) => {
        try {
            const date = timestamp?.toDate?.() ?? new Date(timestamp)
            return date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        } catch (error) {
            return 'N/D'
        }
    }

    const getActionColor = (action) => {
        switch (action) {
            case 'crear':
                return 'text-green-400'
            case 'actualizar':
                return 'text-yellow-400'
            case 'eliminar':
                return 'text-red-400'
            default:
                return 'text-tactical-gray'
        }
    }

    const getActionLabel = (action) => {
        switch (action) {
            case 'crear':
                return 'CREAR'
            case 'actualizar':
                return 'ACTUALIZAR'
            case 'eliminar':
                return 'ELIMINAR'
            default:
                return action.toUpperCase()
        }
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-widest">
                    Cargando logs...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-red-500 font-tactical uppercase tracking-widest">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
            <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-1 bg-tactical-gold shadow-[0_0_20px_rgba(175,153,116,0.9)]" />
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => navigate('/logs')}
                                className="text-tactical-gold hover:text-tactical-gold/80 transition-colors font-tactical text-xs uppercase tracking-[0.3em] border border-tactical-border/60 px-3 py-1 hover:border-tactical-gold bg-black/40"
                            >
                                ← Volver
                            </button>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-tactical text-tactical-gold uppercase tracking-[0.3em] drop-shadow-md">
                            Logs - {formatDate(date)}
                        </h1>
                        <p className="text-xs lg:text-sm font-tactical text-tactical-brass opacity-80 tracking-[0.4em] uppercase mt-2">
                            Registro detallado | Auditoría | {date}
                        </p>
                    </div>
                </div>
            </header>

            {logs.length === 0 ? (
                <div className="bg-black/40 border border-dashed border-tactical-border p-6 rounded text-center font-tactical text-sm uppercase tracking-[0.4em] text-tactical-brass/70">
                    No hay registros de actividad para este día.
                </div>
            ) : (
                <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden p-[10px] md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                                Consola de Actividades
                            </h2>
                            <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                                Historial completo de operaciones realizadas
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/60 border border-tactical-border/60 p-4 md:p-6 font-mono text-[11px] uppercase tracking-[0.25em] overflow-x-auto">
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 flex-wrap border-b border-tactical-border/20 pb-2 last:border-0">
                                    <span className="text-tactical-brass/60 flex-shrink-0 font-tactical">
                                        [{formatTime(log.timestamp)}]
                                    </span>
                                    <span className={`font-semibold flex-shrink-0 font-tactical ${getActionColor(log.action)}`}>
                                        {getActionLabel(log.action)}
                                    </span>
                                    <span className="text-tactical-brass/50 flex-shrink-0 font-tactical">
                                        [{log.collection}]
                                    </span>
                                    <span className="text-tactical-gold flex-1 font-tactical">
                                        {log.description}
                                    </span>
                                    <span className="text-tactical-brass/70 flex-shrink-0 font-tactical text-[10px]">
                                        Usuario: {log.userName || log.userEmail || 'N/A'}
                                    </span>
                                    {log.documentId && (
                                        <span className="text-tactical-brass/40 text-[10px] flex-shrink-0 font-tactical">
                                            ID: {log.documentId.substring(0, 8)}...
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}

export default LogDetailView

