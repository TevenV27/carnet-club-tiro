import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    addActivityToTournament,
    addTournamentEvidence,
    getTournamentById,
    cancelTournament,
    finalizeTournament,
    updateTournamentParticipantScores
} from '../services/tournamentService'
import { incrementUserPoints, getAllUsers } from '../services/userService'
import { getScores } from '../services/scoresService'

const formatDateTime = (value) => {
    if (!value) {
        return 'N/D'
    }

    if (typeof value.toDate === 'function') {
        return value.toDate().toLocaleString('es-ES')
    }

    if (value instanceof Date) {
        return value.toLocaleString('es-ES')
    }

    return new Date(value).toLocaleString('es-ES')
}

const calculateTotal = (scores = {}) =>
    Object.values(scores).reduce((acc, current) => acc + (Number(current) || 0), 0)

function TournamentDetailView() {
    const { torneoId } = useParams()
    const navigate = useNavigate()

    const [tournament, setTournament] = useState(null)
    const [scores, setScores] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [savingScores, setSavingScores] = useState(false)
    const [addingActivity, setAddingActivity] = useState(false)
    const [activityForm, setActivityForm] = useState({ nombre: '', descripcion: '', puntajeMaximo: '' })
    const [userPhotos, setUserPhotos] = useState({})
    const [galleryExpanded, setGalleryExpanded] = useState(false)
    const [uploadingEvidence, setUploadingEvidence] = useState(false)
    const [evidenceError, setEvidenceError] = useState(null)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [scoresConfig, setScoresConfig] = useState({
        primerPuesto: 50,
        segundoPuesto: 30,
        tercerPuesto: 20,
        participacion: 10,
        noAsistencia: -10
    })

    // Cargar configuración de puntajes desde la BD
    useEffect(() => {
        const loadScoresConfig = async () => {
            try {
                const scoresData = await getScores()
                const config = {
                    primerPuesto: 50,
                    segundoPuesto: 30,
                    tercerPuesto: 20,
                    participacion: 10,
                    noAsistencia: -10
                }

                // Buscar cada tipo de puntaje por nombre
                scoresData.forEach((score) => {
                    const nombreUpper = score.nombre.toUpperCase()
                    if (nombreUpper.includes('PRIMER PUESTO')) {
                        config.primerPuesto = Number(score.valor) || 50
                    } else if (nombreUpper.includes('SEGUNDO PUESTO')) {
                        config.segundoPuesto = Number(score.valor) || 30
                    } else if (nombreUpper.includes('TERCER PUESTO')) {
                        config.tercerPuesto = Number(score.valor) || 20
                    } else if (nombreUpper.includes('PARTICIPACIÓN') || nombreUpper.includes('PARTICIPACION')) {
                        config.participacion = Number(score.valor) || 10
                    } else if (nombreUpper.includes('NO ASISTENCIA') || nombreUpper.includes('NOASISTENCIA')) {
                        config.noAsistencia = Number(score.valor) || -10
                    }
                })

                setScoresConfig(config)
            } catch (error) {
                console.error('Error cargando configuración de puntajes:', error)
                // Mantener valores por defecto si hay error
            }
        }

        loadScoresConfig()
    }, [])

    useEffect(() => {
        let isMounted = true

        const fetchTournament = async () => {
            try {
                setLoading(true)
                const [data, usersList] = await Promise.all([
                    getTournamentById(torneoId),
                    getAllUsers()
                ])

                if (!isMounted) {
                    return
                }

                if (!data) {
                    setError('No se encontró el torneo solicitado.')
                    return
                }

                const photosMap = {}
                usersList.forEach((user) => {
                    const key = user.cedula || user.id
                    if (key) {
                        photosMap[key] = user.foto || null
                    }
                })
                setUserPhotos(photosMap)

                setTournament(data)

                const initialScores = {}
                    ; (data.participantes || []).forEach((participant) => {
                        initialScores[participant.cedula] = {
                            ...(participant.activityScores || {})
                        }
                    })
                setScores(initialScores)
            } catch (err) {
                console.error('Error cargando torneo:', err)
                if (isMounted) {
                    setError('No se pudo cargar la información del torneo.')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchTournament()

        return () => {
            isMounted = false
        }
    }, [torneoId])

    const activities = useMemo(() => tournament?.actividades || [], [tournament])
    const participants = useMemo(() => tournament?.participantes || [], [tournament])
    const galleryItems = useMemo(() => tournament?.galeria || [], [tournament])
    const isFinalizado = tournament?.estado === 'finalizado'
    const isCancelado = tournament?.estado === 'cancelado'
    const tournamentClosed = isFinalizado || isCancelado

    // Calcular posiciones del torneo basadas en los puntos del torneo
    const tournamentRankings = useMemo(() => {
        if (!participants || participants.length === 0) {
            return []
        }

        const rankings = participants.map((participant) => {
            const cedula = participant.cedula
            const participantScores = scores[cedula] || participant.activityScores || {}
            const total = calculateTotal(participantScores)
            return {
                cedula,
                nombre: participant.nombre,
                foto: participant.foto ?? userPhotos[cedula] ?? null,
                total
            }
        })

        // Ordenar por puntos descendente
        rankings.sort((a, b) => b.total - a.total)

        return rankings
    }, [participants, scores, userPhotos])

    const fileToDataUrl = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const handleScoreChange = (cedula, activityId, value) => {
        const numericValue = Number(value)
        setScores((prev) => ({
            ...prev,
            [cedula]: {
                ...prev[cedula],
                [activityId]: Number.isFinite(numericValue) ? numericValue : 0
            }
        }))
    }

    const handleAddActivity = async (event) => {
        event.preventDefault()

        if (tournamentClosed) {
            setError('El torneo está cerrado. No se pueden agregar más actividades.')
            return
        }

        if (!activityForm.nombre.trim()) {
            setError('El nombre de la actividad es obligatorio.')
            return
        }

        if (!activityForm.puntajeMaximo || Number(activityForm.puntajeMaximo) <= 0) {
            setError('Ingresa un puntaje máximo mayor a 0.')
            return
        }

        try {
            setAddingActivity(true)
            setError(null)

            const updatedTournament = await addActivityToTournament(torneoId, {
                nombre: activityForm.nombre.trim(),
                descripcion: activityForm.descripcion.trim(),
                puntajeMaximo: Number(activityForm.puntajeMaximo)
            })

            setTournament(updatedTournament)
            setActivityForm({ nombre: '', descripcion: '', puntajeMaximo: '' })

            // Inicializar puntajes para la nueva actividad
            setScores((prev) => {
                const nextScores = { ...prev }
                const updatedParticipants = updatedTournament.participantes || []
                const newActivity = updatedTournament.actividades.at(-1)

                if (newActivity) {
                    updatedParticipants.forEach((participant) => {
                        const cedula = participant.cedula
                        if (!nextScores[cedula]) {
                            nextScores[cedula] = {}
                        }
                        nextScores[cedula][newActivity.id] = nextScores[cedula][newActivity.id] ?? 0
                    })
                }

                return nextScores
            })
        } catch (err) {
            console.error('Error agregando actividad:', err)
            setError(err.message || 'No se pudo agregar la actividad.')
        } finally {
            setAddingActivity(false)
        }
    }

    const handleEvidenceUpload = async (event) => {
        const files = Array.from(event.target.files || [])
        if (files.length === 0) {
            return
        }

        try {
            setUploadingEvidence(true)
            setEvidenceError(null)

            const base64Images = await Promise.all(files.map(fileToDataUrl))
            const updatedTournament = await addTournamentEvidence(torneoId, base64Images)

            if (updatedTournament) {
                setTournament(updatedTournament)
            }
        } catch (err) {
            console.error('Error subiendo evidencias:', err)
            setEvidenceError(err.message || 'No se pudieron subir las evidencias. Intenta nuevamente.')
        } finally {
            setUploadingEvidence(false)
            if (event.target) {
                event.target.value = ''
            }
        }
    }

    const handleSaveScores = async () => {
        if (tournamentClosed) {
            return
        }

        if (!tournament) {
            return
        }

        try {
            setSavingScores(true)
            setError(null)

            const participantUpdates = {}

            participants.forEach((participant) => {
                const cedula = participant.cedula
                const participantScores = scores[cedula] || {}
                const total = calculateTotal(participantScores)

                participantUpdates[cedula] = {
                    activityScores: participantScores,
                    newAppliedScore: total,
                    rankingDelta: 0
                }
            })

            const updatedTournament = await updateTournamentParticipantScores(torneoId, participantUpdates)
            setTournament(updatedTournament)

            // Actualizar los scores locales con los datos guardados para que la tabla de posiciones se actualice
            const updatedScores = {}
            updatedTournament.participantes.forEach((participant) => {
                updatedScores[participant.cedula] = participant.activityScores || {}
            })
            setScores(updatedScores)
        } catch (err) {
            console.error('Error guardando puntuaciones:', err)
            setError(err.message || 'No se pudieron guardar las puntuaciones. Intenta nuevamente.')
        } finally {
            setSavingScores(false)
        }
    }

    const handleUpdateStatus = async (nextStatus) => {
        if (!tournament || updatingStatus) return

        const confirmationMessage =
            nextStatus === 'finalizado'
                ? '¿Deseas marcar este torneo como FINALIZADO? Esto asignará puntos al ranking general según las posiciones.'
                : '¿Deseas CANCELAR este torneo?'

        const confirmed = window.confirm(confirmationMessage)
        if (!confirmed) return

        try {
            setUpdatingStatus(true)
            let updatedTournament
            if (nextStatus === 'finalizado') {
                // Calcular posiciones del torneo antes de finalizar
                const tournamentParticipants = participants.map((participant) => {
                    const cedula = participant.cedula
                    const participantScores = scores[cedula] || participant.activityScores || {}
                    const total = calculateTotal(participantScores)
                    return {
                        cedula,
                        nombre: participant.nombre,
                        foto: participant.foto,
                        total
                    }
                })

                // Ordenar por puntos descendente
                tournamentParticipants.sort((a, b) => b.total - a.total)

                // Separar participantes: los que participaron (puntos > 0) y los que no (puntos = 0)
                const participantsWithPoints = tournamentParticipants.filter((p) => p.total > 0)
                const participantsWithoutPoints = tournamentParticipants.filter((p) => p.total === 0)

                // Asignar puntos al ranking general según posiciones
                // Usar valores de la configuración cargada desde la BD
                const pointsToAssign = {}
                participantsWithPoints.forEach((participant, index) => {
                    let positionPoints = 0
                    if (index === 0) {
                        // Primer puesto: puntos desde BD
                        positionPoints = scoresConfig.primerPuesto
                    } else if (index === 1) {
                        // Segundo puesto: puntos desde BD
                        positionPoints = scoresConfig.segundoPuesto
                    } else if (index === 2) {
                        // Tercer puesto: puntos desde BD
                        positionPoints = scoresConfig.tercerPuesto
                    }
                    // Todos los participantes con puntos > 0 reciben puntos por participación desde BD
                    const participationPoints = scoresConfig.participacion
                    // Total = puntos por posición + puntos por participación
                    pointsToAssign[participant.cedula] = positionPoints + participationPoints
                })

                // A los participantes sin puntos (no participaron) se les resta puntos desde BD
                participantsWithoutPoints.forEach((participant) => {
                    pointsToAssign[participant.cedula] = scoresConfig.noAsistencia
                })

                // Aplicar puntos al ranking general
                await Promise.all(
                    Object.entries(pointsToAssign).map(([cedula, points]) =>
                        incrementUserPoints(cedula, points)
                    )
                )

                updatedTournament = await finalizeTournament(tournament.id)
            } else {
                updatedTournament = await cancelTournament(tournament.id)
            }

            if (updatedTournament) {
                setTournament(updatedTournament)
            }
        } catch (err) {
            console.error('Error actualizando estado del torneo:', err)
            alert('No se pudo actualizar el estado del torneo. Intenta nuevamente.')
        } finally {
            setUpdatingStatus(false)
        }
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-[0.4em]">
                    Cargando torneo...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-tactical-dark gap-6 px-6 text-center">
                <div className="text-red-500 font-tactical uppercase tracking-[0.4em]">
                    {error}
                </div>
                <button
                    onClick={() => navigate('/torneos')}
                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duración-200"
                >
                    Volver al listado de torneos
                </button>
            </div>
        )
    }

    if (!tournament) {
        return null
    }

    return (
        <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
            <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                        {tournament.nombre}
                    </h1>
                    <p className="text-xs font-tactical text-tactical-brass/70 uppercase tracking-[0.45em]">
                        Inicio: {formatDateTime(tournament.fechaInicio)}
                    </p>
                    <p
                        className={`text-[10px] font-tactical uppercase tracking-[0.45em] ${isCancelado ? 'text-red-400' : isFinalizado ? 'text-tactical-gold' : 'text-tactical-brass/70'
                            }`}
                    >
                        Estado actual: {isCancelado ? 'Cancelado' : isFinalizado ? 'Finalizado' : 'En progreso'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-end">
                    {!tournamentClosed && (
                        <>
                            <button
                                onClick={() => handleUpdateStatus('finalizado')}
                                disabled={updatingStatus}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duración-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {updatingStatus ? 'Actualizando...' : 'Finalizar torneo'}
                            </button>
                            <button
                                onClick={() => handleUpdateStatus('cancelado')}
                                disabled={updatingStatus}
                                className="bg-transparent hover:bg-red-900/40 text-red-400 font-semibold py-2 px-4 border border-red-600 font-tactical text-xs uppercase tracking-wider transition-all duración-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {updatingStatus ? 'Actualizando...' : 'Cancelar torneo'}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => navigate('/torneos')}
                        className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transición-all duración-200"
                    >
                        Volver al panel
                    </button>
                </div>
            </header>

            <section className="flex flex-col gap-6">
                <div className="bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6 space-y-4">
                    <header className="px-6 py-4 border-b border-tactical-border/60">
                        <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                            Registrar actividad
                        </h2>
                        <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                            Añade las misiones o pruebas que componen el torneo
                        </p>
                    </header>

                    <form className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleAddActivity}>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                                Nombre de la actividad
                            </label>
                            <input
                                type="text"
                                value={activityForm.nombre}
                                onChange={(event) => setActivityForm((prev) => ({ ...prev, nombre: event.target.value }))}
                                className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                                placeholder="Ej: Tiro de precisión"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                                Descripción
                            </label>
                            <input
                                type="text"
                                value={activityForm.descripcion}
                                onChange={(event) => setActivityForm((prev) => ({ ...prev, descripcion: event.target.value }))}
                                className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                                placeholder="Detalle opcional"
                            />
                        </div>
                        <div className="flex items-end justify-end gap-4">
                            <div className="md:col-span-1 w-full">
                                <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                                    Puntaje máximo
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={activityForm.puntajeMaximo}
                                    onChange={(event) => setActivityForm((prev) => ({ ...prev, puntajeMaximo: event.target.value }))}
                                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                                    placeholder="Ej: 100"
                                />
                            </div>
                            <div className="flex items-end justify-end md:col-span-1">
                                <button
                                    type="submit"
                                    disabled={addingActivity || tournamentClosed}
                                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-1 px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duración-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {addingActivity ? 'Agregando...' : 'Agregar actividad'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                                Tabla de puntuaciones
                            </h2>
                            <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                                Doble clic en un campo para editar el puntaje
                            </p>
                        </div>
                        <button
                            onClick={handleSaveScores}
                            disabled={savingScores || tournamentClosed}
                            className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duración-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {savingScores ? 'Guardando...' : 'Guardar puntuaciones'}
                        </button>
                    </div>
                    <div className="overflow-x-auto border border-tactical-border/40">
                        <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[10px] uppercase tracking-[0.35em] text-tactical-brass bg-black/40">
                            <thead className="bg-black/60 text-tactical-brass/70">
                                <tr>
                                    <th className="px-4 py-3 text-left">Actividad</th>
                                    <th className="px-4 py-3 text-left">Descripción</th>
                                    <th className="px-4 py-3 text-left">Puntaje máximo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tactical-border/40">
                                {activities.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-4 text-center text-[10px] text-tactical-brass/50 tracking-[0.45em]">
                                            Aún no se han registrado actividades para este torneo.
                                        </td>
                                    </tr>
                                ) : (
                                    activities.map((activity) => (
                                        <tr key={activity.id}>
                                            <td className="px-4 py-3 text-tactical-gold">
                                                {activity.nombre}
                                            </td>
                                            <td className="px-4 py-3 text-tactical-brass">
                                                {activity.descripcion || 'Sin descripción'}
                                            </td>
                                            <td className="px-4 py-3 text-tactical-gold">
                                                {activity.puntajeMaximo ?? 'N/D'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.35em] text-tactical-brass">
                            <thead className="bg-black/60 text-tactical-brass/70">
                                <tr>
                                    <th className="px-4 py-3 text-left">#</th>
                                    <th className="px-4 py-3 text-left">Participante</th>
                                    {activities.map((activity) => (
                                        <th key={activity.id} className="px-4 py-3 text-left">
                                            {activity.nombre}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-left">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tactical-border/40">
                                {participants.map((participant, index) => {
                                    const cedula = participant.cedula
                                    const participantScores = scores[cedula] || participant.activityScores || {}
                                    const total = calculateTotal(participantScores)
                                    const participantPhoto = participant.foto ?? userPhotos[cedula] ?? null

                                    return (
                                        <tr key={cedula} className="hover:bg-black/50 transition-colors duration-150">
                                            <td className="px-4 py-3 text-tactical-brass/60">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-tactical-gold">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 border border-tactical-border overflow-hidden">
                                                        {participantPhoto ? (
                                                            <img
                                                                src={participantPhoto}
                                                                alt={participant.nombre || cedula}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-black flex items-center justify-center text-[8px] text-tactical-brass/50 tracking-[0.4em]">
                                                                Sin foto
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p>{participant.nombre}</p>
                                                        <p className="text-[9px] text-tactical-brass/50 tracking-[0.5em]">
                                                            {cedula}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {activities.map((activity) => (
                                                <td key={activity.id} className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={participantScores[activity.id] ?? ''}
                                                        onChange={(event) =>
                                                            handleScoreChange(cedula, activity.id, event.target.value)
                                                        }
                                                        className="w-24 bg-black/60 border border-tactical-border px-2 py-1 text-tactical-gold focus:outline-none focus:border-tactical-gold transition-colors duration-150 disabled:opacity-60"
                                                        placeholder="0"
                                                        disabled={tournamentClosed}
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-tactical-gold text-lg">
                                                {total}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                            Posiciones del Torneo
                        </h2>
                        <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                            Clasificación según puntos acumulados en este torneo
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.35em] text-tactical-brass">
                            <thead className="bg-black/60 text-tactical-brass/70">
                                <tr>
                                    <th className="px-4 py-3 text-left">Posición</th>
                                    <th className="px-4 py-3 text-left">Participante</th>
                                    <th className="px-4 py-3 text-left">Puntos del Torneo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tactical-border/40">
                                {tournamentRankings.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-4 text-center text-[10px] text-tactical-brass/50 tracking-[0.45em]">
                                            No hay participantes en este torneo.
                                        </td>
                                    </tr>
                                ) : (
                                    tournamentRankings.map((ranking, index) => {
                                        const participantPhoto = ranking.foto

                                        return (
                                            <tr key={ranking.cedula} className="hover:bg-black/50 transition-colors duration-150">
                                                <td className="px-4 py-3 text-tactical-gold">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 text-tactical-gold">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 border border-tactical-border overflow-hidden">
                                                            {participantPhoto ? (
                                                                <img
                                                                    src={participantPhoto}
                                                                    alt={ranking.nombre || ranking.cedula}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-black flex items-center justify-center text-[8px] text-tactical-brass/50 tracking-[0.4em]">
                                                                    Sin foto
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p>{ranking.nombre}</p>
                                                            <p className="text-[9px] text-tactical-brass/50 tracking-[0.5em]">
                                                                {ranking.cedula}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-tactical-gold text-lg">
                                                    {ranking.total}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden p-[10px] md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                            Galería del torneo
                        </h2>
                        <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                            Evidencias fotográficas opcionales de la jornada
                        </p>
                    </div>
                    <button
                        onClick={() => setGalleryExpanded((prev) => !prev)}
                        className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duración-200"
                        type="button"
                    >
                        {galleryExpanded ? '[Ocultar galería]' : '[Mostrar galería]'}
                    </button>
                </div>

                {galleryExpanded && (
                    <div className="space-y-4">
                        {evidenceError && (
                            <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.4em]">
                                {evidenceError}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="inline-flex items-center gap-3 bg-black/40 border border-tactical-border px-4 py-2 cursor-pointer hover:border-tactical-gold transition-colors duración-150">
                                <span className="text-[10px] font-tactical uppercase tracking-[0.4em] text-tactical-gold">
                                    Seleccionar imágenes
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleEvidenceUpload}
                                    className="hidden"
                                />
                            </label>
                            {uploadingEvidence && (
                                <span className="text-[10px] font-tactical uppercase tracking-[0.4em] text-tactical-brass/70">
                                    Subiendo evidencias...
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-[repeat(auto-fit,_minmax(160px,_1fr))] gap-4">
                            {galleryItems.length === 0 ? (
                                <div className="col-span-full text-center text-[10px] font-tactical uppercase tracking-[0.45em] text-tactical-brass/50 bg-black/40 border border-dashed border-tactical-border px-4 py-6">
                                    Aún no hay evidencias registradas para este torneo.
                                </div>
                            ) : (
                                galleryItems.map((item) => (
                                    <figure
                                        key={item.id}
                                        className="bg-black/40 border border-tactical-border p-2 flex flex-col gap-2"
                                    >
                                        <div className="w-full aspect-[4/3] overflow-hidden border border-tactical-border/40">
                                            <img
                                                src={item.src}
                                                alt={`Evidencia ${item.id}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <figcaption className="text-[9px] text-tactical-brass/60 font-tactical uppercase tracking-[0.4em]">
                                            {formatDateTime(item.uploadedAt)}
                                        </figcaption>
                                    </figure>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    )
}

export default TournamentDetailView

