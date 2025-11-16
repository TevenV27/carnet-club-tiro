import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLogDays } from '../services/logService'

function LogsView() {
    const [logDays, setLogDays] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        let isMounted = true

        const fetchLogDays = async () => {
            try {
                setLoading(true)
                const data = await getLogDays()
                if (isMounted) {
                    setLogDays(data)
                }
            } catch (err) {
                console.error('Error cargando días de logs:', err)
                if (isMounted) {
                    setError('No se pudieron cargar los logs. Intenta nuevamente más tarde.')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchLogDays()
        return () => {
            isMounted = false
        }
    }, [])

    const formatDate = (dateKey) => {
        try {
            const [year, month, day] = dateKey.split('-')
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            return date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        } catch (error) {
            return dateKey
        }
    }

    const handleRowDoubleClick = (dateKey) => {
        navigate(`/logs/${dateKey}`)
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
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-tactical text-tactical-gold uppercase tracking-[0.3em] drop-shadow-md">
                            Registro de Actividades
                        </h1>
                        <p className="text-xs lg:text-sm font-tactical text-tactical-brass opacity-80 tracking-[0.4em] uppercase mt-2">
                            Auditoría | Historial | Acceso Restringido
                        </p>
                    </div>
                </div>
            </header>

            {logDays.length === 0 ? (
                <div className="bg-black/40 border border-dashed border-tactical-border p-6 rounded text-center font-tactical text-sm uppercase tracking-[0.4em] text-tactical-brass/70">
                    No hay registros de actividad aún.
                </div>
            ) : (
                <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden p-[10px] md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                                Días con actividad
                            </h2>
                            <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                                Haz doble clic en una fila para ver los detalles del día
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-tactical-border/40">
                        <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.35em] text-tactical-brass bg-black/40">
                            <thead className="bg-black/60 text-tactical-brass/70">
                                <tr>
                                    <th className="px-4 py-3 text-left">Fecha</th>
                                    <th className="px-4 py-3 text-left">Actividades</th>
                                    <th className="px-4 py-3 text-left">Última Actividad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tactical-border/40">
                                {logDays.map((day) => (
                                    <tr
                                        key={day.dateKey}
                                        onDoubleClick={() => handleRowDoubleClick(day.dateKey)}
                                        className="hover:bg-black/50 cursor-pointer transition-colors duration-150"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="text-tactical-gold font-semibold">
                                                {formatDate(day.dateKey)}
                                            </div>
                                            <div className="text-[10px] text-tactical-brass/60 tracking-[0.3em] mt-1">
                                                {day.dateKey}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-3 py-1 border border-tactical-border/60 bg-tactical-gold/20 text-tactical-gold text-[10px] tracking-[0.3em]">
                                                {day.count} {day.count === 1 ? 'actividad' : 'actividades'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-tactical-brass/80">
                                            {day.lastActivity?.toDate
                                                ? day.lastActivity.toDate().toLocaleTimeString('es-ES', {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                      second: '2-digit'
                                                  })
                                                : 'N/D'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    )
}

export default LogsView

