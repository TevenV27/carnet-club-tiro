import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllUsers, updateUserPoints } from '../../services/userService'
import { useAuthProfile } from '../../context/AuthProfileContext'

const getCedula = (user) => user.cedula || user.id

const formatNumber = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return '0'
    }
    return new Intl.NumberFormat('es-ES').format(value)
}

function RankingView() {
    const { canEdit } = useAuthProfile()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pointsDraft, setPointsDraft] = useState({})
    const [saving, setSaving] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        let isMounted = true

        const fetchRanking = async () => {
            try {
                setLoading(true)
                const data = await getAllUsers()
                if (!isMounted) {
                    return
                }

                setUsers(data)
                const draft = {}
                data.forEach((user) => {
                    draft[getCedula(user)] = user.puntos ?? 0
                })
                setPointsDraft(draft)
            } catch (err) {
                console.error('Error cargando ranking:', err)
                if (isMounted) {
                    setError('No se pudo cargar el ranking de operadores. Intenta nuevamente.')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchRanking()

        return () => {
            isMounted = false
        }
    }, [])

    const sortedUsers = useMemo(() => {
        return [...users].sort((a, b) => {
            const puntosA = a.puntos ?? 0
            const puntosB = b.puntos ?? 0
            if (puntosA === puntosB) {
                const nombreA = (a.nombre || '').toLowerCase()
                const nombreB = (b.nombre || '').toLowerCase()
                return nombreA.localeCompare(nombreB)
            }
            return puntosB - puntosA
        })
    }, [users])

    const topOperators = useMemo(() => sortedUsers.slice(0, 3), [sortedUsers])

    const handlePointsChange = (cedula, value) => {
        const numeric = Number(value)
        setPointsDraft((prev) => ({
            ...prev,
            [cedula]: Number.isNaN(numeric) ? '' : numeric
        }))
    }

    const handleUpdatePoints = async (user) => {
        const cedula = getCedula(user)
        const newPoints = Number(pointsDraft[cedula])

        if (!Number.isFinite(newPoints)) {
            alert('Por favor ingresa un valor numérico válido para los puntos.')
            return
        }

        try {
            setSaving(cedula)
            await updateUserPoints(cedula, newPoints)
            setUsers((prev) =>
                prev.map((item) =>
                    getCedula(item) === cedula ? { ...item, puntos: newPoints } : item
                )
            )
        } catch (err) {
            console.error('Error actualizando puntos:', err)
            alert('No fue posible actualizar los puntos. Intenta nuevamente.')
        } finally {
            setSaving(null)
        }
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-[0.08em]">
                    Calculando ranking...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-red-500 font-tactical uppercase tracking-[0.08em] text-center px-6">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8">
            <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
                <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.08em]">
                    Ranking de Operadores
                </h1>
                <p className="text-xs font-tactical text-tactical-brass uppercase tracking-[0.1em]">
                    Clasificación dinámica basada en puntos tácticos
                </p>
            </header>

            <section className="flex flex-col gap-6">
                <div className="bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.5)] overflow-x-auto">
                    <div className="flex gap-3 min-w-max">
                        {topOperators.map((operator, idx) => (
                            <div
                                key={getCedula(operator)}
                                className="bg-red/50 border border-tactical-border rounded-lg p-3 sm:p-5 shadow-[0_0_25px_rgba(0,0,0,0.4)] flex flex-col gap-3 sm:gap-4 w-[260px] sm:w-full"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] sm:text-sm font-tactical text-tactical-gold uppercase tracking-[0.12em]">
                                        Top {idx + 1}
                                    </span>
                                    <span className="text-[10px] sm:text-xs font-tactical text-tactical-brass/90 uppercase tracking-[0.08em]">
                                        {operator.nivel || 'Operador'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 border border-tactical-border overflow-hidden flex-shrink-0">
                                        {operator.foto ? (
                                            <img
                                                src={operator.foto}
                                                alt={operator.nombre || getCedula(operator)}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-black flex items-center justify-center text-[9px] text-tactical-brass font-tactical uppercase tracking-[0.12em]">
                                                Sin foto
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1 font-tactical uppercase">
                                        <p className="text-tactical-gold text-[11px] sm:text-sm tracking-[0.06em]">
                                            {operator.nombre || 'Operador sin nombre'}
                                        </p>
                                        <p className="text-[9px] sm:text-[10px] text-tactical-brass/90 tracking-[0.08em]">
                                            Cédula: {getCedula(operator)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between font-tactical uppercase tracking-[0.08em]">
                                    <span className="text-[10px] sm:text-[11px] text-tactical-brass/90">Puntos</span>
                                    <span className="text-base sm:text-lg text-tactical-gold">{formatNumber(operator.puntos ?? 0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-black/30 border border-tactical-border rounded-lg p-[10px] md:p-6 shadow-[0_0_20px_rgba(0,0,0,0.45)]">
                    <header className="px-6 py-4 border-b border-tactical-border/60 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.08em]">
                                Tabla de clasificación
                            </h2>
                            <p className="text-[10px] font-tactical text-tactical-brass/90 uppercase tracking-[0.1em]">
                                {sortedUsers.length} operadores activos
                            </p>
                        </div>
                    </header>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.06em]">
                            <thead className="bg-black/60 text-tactical-brass">
                                <tr>
                                    <th className="px-4 py-3 text-left">Posición</th>
                                    <th className="px-4 py-3 text-left">Operador</th>
                                    <th className="px-4 py-3 text-left">Nivel</th>
                                    <th className="px-4 py-3 text-left">Puntos</th>
                                    {canEdit ? (
                                        <th className="px-4 py-3 text-left">Actualizar puntuación</th>
                                    ) : null}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tactical-border/40">
                                {sortedUsers.map((user, index) => {
                                    const cedula = getCedula(user)
                                    const isSaving = saving === cedula
                                    return (
                                        <tr
                                            key={cedula}
                                            className={`hover:bg-black/50 transition-colors duration-150 select-none ${canEdit ? 'cursor-pointer' : ''}`}
                                            onDoubleClick={() => {
                                                if (canEdit) {
                                                    navigate(`/usuarios/${encodeURIComponent(cedula)}`)
                                                }
                                            }}
                                            title={canEdit ? 'Doble clic para ver perfil detallado' : undefined}
                                        >
                                            <td className="px-4 py-3 text-tactical-gold">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 border border-tactical-border overflow-hidden flex-shrink-0">
                                                        {user.foto ? (
                                                            <img
                                                                src={user.foto}
                                                                alt={user.nombre || cedula}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-black flex items-center justify-center text-[9px] text-tactical-brass">
                                                                Sin foto
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-tactical-gold">{user.nombre || 'Sin nombre'}</p>
                                                        <p className="text-[9px] text-tactical-brass tracking-[0.12em]">
                                                            Cédula: {cedula}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-tactical-brass text-[10px]">
                                                {user.nivel || 'Operador'}
                                            </td>
                                            <td className="px-4 py-3 text-tactical-gold">{formatNumber(user.puntos ?? 0)}</td>
                                            {canEdit ? (
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            className="w-24 bg-black/60 border border-tactical-border px-2 py-1 text-tactical-brass focus:outline-none focus:border-tactical-gold transition-colors duration-150"
                                                            value={pointsDraft[cedula] ?? ''}
                                                            onChange={(event) => handlePointsChange(cedula, event.target.value)}
                                                        />
                                                        <button
                                                            onClick={() => handleUpdatePoints(user)}
                                                            disabled={isSaving}
                                                            className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-1.5 px-4 border border-tactical-border hover:border-tactical-gold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                                        >
                                                            {isSaving ? 'Guardando...' : 'Actualizar'}
                                                        </button>
                                                    </div>
                                                </td>
                                            ) : null}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default RankingView

