import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllUsers } from '../services/userService'
import {
    createTournament,
    getTournaments
} from '../services/tournamentService'
import Modal from './Modal'

const formatDate = (timestamp) => {
    if (!timestamp) {
        return 'Fecha no registrada'
    }

    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    return new Date(timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function TournamentsView() {
    const [tournaments, setTournaments] = useState([])
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [formError, setFormError] = useState(null)
    const [saving, setSaving] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [participantSearch, setParticipantSearch] = useState('')
    const [selectedParticipants, setSelectedParticipants] = useState([])
    const [formData, setFormData] = useState({
        nombre: '',
        fechaInicio: ''
    })

    const navigate = useNavigate()

    useEffect(() => {
        let isMounted = true

        const fetchData = async () => {
            try {
                setLoading(true)
                const [tournamentsData, usersData] = await Promise.all([
                    getTournaments(),
                    getAllUsers()
                ])

                if (!isMounted) {
                    return
                }

                setTournaments(tournamentsData)
                setUsers(usersData)
            } catch (err) {
                console.error('Error cargando torneos:', err)
                if (isMounted) {
                    setError('No se pudo cargar la información de torneos. Intenta nuevamente.')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchData()

        return () => {
            isMounted = false
        }
    }, [])

    const activos = useMemo(
        () => tournaments.filter((torneo) => torneo.estado === 'activo'),
        [tournaments]
    )
    const finalizados = useMemo(
        () => tournaments.filter((torneo) => torneo.estado === 'finalizado'),
        [tournaments]
    )
    const handleFormChange = (event) => {
        const { name, value } = event.target
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    const filteredUsers = useMemo(() => {
        const term = participantSearch.trim().toLowerCase()
        if (!term) {
            return users
        }

        return users.filter((user) => {
            const nombre = (user.nombre || '').toLowerCase()
            const cedula = (user.cedula || user.id || '').toLowerCase()
            return nombre.includes(term) || cedula.includes(term)
        })
    }, [participantSearch, users])

    const handleAddParticipant = (user) => {
        const cedula = user.cedula || user.id
        if (selectedParticipants.some((participant) => participant.cedula === cedula)) {
            return
        }
        setSelectedParticipants((prev) => [
            ...prev,
            {
                cedula,
                nombre: user.nombre || 'Operador',
                foto: user.foto ?? null
            }
        ])
    }

    const handleRemoveParticipant = (cedula) => {
        setSelectedParticipants((prev) =>
            prev.filter((participant) => participant.cedula !== cedula)
        )
    }

    const handleCreateTournament = async (event) => {
        event?.preventDefault()
        setFormError(null)

        try {
            if (!formData.nombre.trim()) {
                throw new Error('El nombre del torneo es obligatorio.')
            }

            if (!formData.fechaInicio) {
                throw new Error('La fecha de inicio es obligatoria.')
            }

            if (selectedParticipants.length === 0) {
                throw new Error('Selecciona al menos un participante para el torneo.')
            }

            setSaving(true)

            const nuevoTorneo = await createTournament({
                nombre: formData.nombre.trim(),
                fechaInicio: formData.fechaInicio,
                participantes: selectedParticipants.map((participant) => ({
                    cedula: participant.cedula || participant.id,
                    nombre: participant.nombre || 'Operador',
                    foto: participant.foto ?? null
                }))
            })

            setTournaments((prev) => [...prev, nuevoTorneo])
            setFormData({ nombre: '', fechaInicio: '' })
            setSelectedParticipants([])
            setParticipantSearch('')
            setIsCreateModalOpen(false)
        } catch (err) {
            console.error('Error creando torneo:', err)
            setFormError(err.message || 'No se pudo crear el torneo. Intenta nuevamente.')
        } finally {
            setSaving(false)
        }
    }

    const renderTournamentCard = (torneo, variant = 'activo') => {
        const participants = torneo.participantes?.length ?? 0
        const statusMeta = {
            activo: {
                label: 'Operación activa',
                accent: 'border-tactical-gold text-tactical-gold'
            },
            finalizado: {
                label: 'Operación cerrada',
                accent: 'border-theme text-theme-muted'
            },
            cancelado: {
                label: 'Operación cancelada',
                accent: 'border-red-600/60 text-red-400'
            }
        }

        const meta = statusMeta[variant] || statusMeta.activo

        return (
            <article
                key={torneo.id}
                onDoubleClick={() => navigate(`/torneos/${torneo.id}`)}
                className="relative border border-theme bg-surface px-[10px] md:px-6 py-[10px] md:py-5 rounded-lg overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:shadow-[0_16px_38px_rgba(0,0,0,0.6)] transition-transform duration-200 cursor-pointer select-none hover:-translate-y-1"
                title="Doble clic para ver detalles del torneo"
            >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-tactical-gold/40 to-transparent" />
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-theme pb-4 font-tactical uppercase tracking-[0.3em]">
                    <div className="space-y-2">
                        <span className={`inline-flex items-center text-[9px] px-3 py-1 border ${meta.accent}`}>
                            {meta.label}
                        </span>
                        <h3 className="text-xl text-tactical-gold tracking-[0.25em]">{torneo.nombre}</h3>
                    </div>
                    <dl className="flex flex-wrap gap-3 text-[9px] text-theme-muted">
                        <div className="px-3 py-1 border border-theme bg-surface-hover/60">
                            <dt className="sr-only">Fecha de inicio</dt>
                            <dd>Inicio: {formatDate(torneo.fechaInicio)}</dd>
                        </div>
                        <div className="px-3 py-1 border border-theme bg-surface-hover/60">
                            <dt className="sr-only">Participantes</dt>
                            <dd>Operadores: {participants}</dd>
                        </div>
                    </dl>
                </header>
                <section className="mt-4 grid gap-4 sm:grid-cols-3 font-tactical uppercase tracking-[0.28em] text-theme-secondary text-[10px]">
                    <div className="bg-surface-hover/40 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                        <p className="text-theme-muted mb-1">Zona</p>
                        <p>{torneo.zona || 'Pendiente asignación'}</p>
                    </div>
                    <div className="bg-surface-hover/40 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                        <p className="text-theme-muted mb-1">Objetivo</p>
                        <p>{torneo.objetivo || 'Clasificado'}</p>
                    </div>
                    <div className="bg-surface-hover/40 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                        <p className="text-theme-muted mb-1">Última actualización</p>
                        <p>{formatDate(torneo.actualizadoEn || torneo.fechaInicio)}</p>
                    </div>
                </section>
                <footer className="mt-4 flex flex-wrap items-center gap-3 text-[9px] text-theme-muted uppercase tracking-[0.3em]">
                    <span className="px-3 py-1 border border-theme bg-surface-hover/40">Doble clic para abrir reporte</span>
                    <span className="px-3 py-1 border border-theme bg-surface-hover/40">
                        ID Operación: {torneo.codigo || torneo.id}
                    </span>
                </footer>
            </article>
        )
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-[0.4em]">
                    Cargando torneos...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-red-500 font-tactical uppercase tracking-[0.4em] text-center px-6">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
            <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
                <div>
                    <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                        Centro de Torneos
                    </h1>
                    <p className="text-xs font-tactical text-tactical-brass/70 uppercase tracking-[0.45em]">
                        Gestiona competiciones, participantes y puntuaciones tácticas
                    </p>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={() => {
                            setFormError(null)
                            setFormData({ nombre: '', fechaInicio: '' })
                            setSelectedParticipants([])
                            setParticipantSearch('')
                            setIsCreateModalOpen(true)
                        }}
                        className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 md:px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duración-200"
                    >
                        Crear torneo
                    </button>
                </div>
            </header>

            <section className="space-y-6">
                <div>
                    <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em] mb-3">
                        Torneos activos
                    </h2>
                    {activos.length === 0 ? (
                        <div className="bg-black/40 border border-tactical-border px-4 py-6 text-center font-tactical text-sm uppercase tracking-[0.4em] text-tactical-brass/70">
                            No hay torneos activos actualmente.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {activos.map((torneo) => renderTournamentCard(torneo, 'activo'))}
                        </div>
                    )}
                </div>

                <div>
                    <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em] mb-3">
                        Torneos finalizados
                    </h2>
                    {finalizados.length === 0 ? (
                        <div className="bg-black/40 border border-tactical-border px-4 py-6 text-center font-tactical text-sm uppercase tracking-[0.4em] text-tactical-brass/70">
                            No hay torneos finalizados registrados.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {finalizados.map((torneo) => renderTournamentCard(torneo, 'finalizado'))}
                        </div>
                    )}
                </div>

            </section>

            {isCreateModalOpen && (
                <Modal
                    title="Crear nuevo torneo"
                    onClose={() => {
                        if (!saving) {
                            setIsCreateModalOpen(false)
                        }
                    }}
                    footer={(
                        <>
                            <button
                                onClick={() => !saving && setIsCreateModalOpen(false)}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                                type="button"
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateTournament}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                type="button"
                                disabled={saving}
                            >
                                {saving ? 'Creando...' : 'Guardar torneo'}
                            </button>
                        </>
                    )}
                >
                    <form className="space-y-4" onSubmit={handleCreateTournament}>
                        {formError && (
                            <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.4em]">
                                {formError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                                    Nombre del torneo
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleFormChange}
                                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                                    placeholder="Ej: Operación Centinela"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                                    Fecha de inicio
                                </label>
                                <input
                                    type="date"
                                    name="fechaInicio"
                                    value={formData.fechaInicio}
                                    onChange={handleFormChange}
                                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <label className="text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em]">
                                    Participantes seleccionados ({selectedParticipants.length})
                                </label>
                                <input
                                    type="text"
                                    value={participantSearch}
                                    onChange={(event) => setParticipantSearch(event.target.value)}
                                    className="w-full md:w-64 bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                                    placeholder="Buscar operador..."
                                />
                            </div>

                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1 border border-tactical-border/40 bg-black/40">
                                    <div className="border-b border-tactical-border/40 px-3 py-2 text-[10px] font-tactical uppercase tracking-[0.45em] text-tactical-brass/70">
                                        Operadores disponibles ({filteredUsers.length})
                                    </div>
                                    <div className="max-h-72 overflow-y-auto divide-y divide-tactical-border/30">
                                        {filteredUsers.map((user) => {
                                            const cedula = user.cedula || user.id
                                            const alreadySelected = selectedParticipants.some(
                                                (participant) => participant.cedula === cedula
                                            )
                                            return (
                                                <div
                                                    key={cedula}
                                                    className="flex items-center justify-between px-3 py-2 text-[10px] font-tactical uppercase tracking-[0.35em] text-tactical-brass gap-3"
                                                >
                                                    <div className="flex items-center gap-3 pr-3">
                                                        <div className="w-10 h-10 border border-tactical-border overflow-hidden">
                                                            {user.foto ? (
                                                                <img
                                                                    src={user.foto}
                                                                    alt={user.nombre || cedula}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-black flex items-center justify-center text-[8px] text-tactical-brass/50 tracking-[0.4em]">
                                                                    Sin foto
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p>{user.nombre || 'Operador'}</p>
                                                        <p className="text-[9px] text-tactical-brass/50 tracking-[0.5em]">
                                                            {cedula}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddParticipant(user)}
                                                        disabled={alreadySelected}
                                                        className="text-xs uppercase font-tactical tracking-[0.4em] px-3 py-1 border border-tactical-border text-tactical-gold hover:border-tactical-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        Añadir
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex-1 border border-tactical-border/40 bg-black/40">
                                    <div className="border-b border-tactical-border/40 px-3 py-2 text-[10px] font-tactical uppercase tracking-[0.45em] text-tactical-brass/70">
                                        Seleccionados ({selectedParticipants.length})
                                    </div>
                                    <div className="max-h-72 overflow-y-auto divide-y divide-tactical-border/30">
                                        {selectedParticipants.length === 0 ? (
                                            <div className="px-3 py-4 text-center text-[10px] text-tactical-brass/40 uppercase tracking-[0.4em]">
                                                No hay participantes seleccionados
                                            </div>
                                        ) : (
                                            selectedParticipants.map((participant) => {
                                                const cedula = participant.cedula
                                                return (
                                                    <div
                                                        key={cedula}
                                                        className="flex items-center justify-between px-3 py-2 text-[10px] font-tactical uppercase tracking-[0.35em] text-tactical-brass gap-3"
                                                    >
                                                        <div className="flex items-center gap-3 pr-3">
                                                            <div className="w-10 h-10 border border-tactical-border overflow-hidden">
                                                                {participant.foto ? (
                                                                    <img
                                                                        src={participant.foto}
                                                                        alt={participant.nombre || cedula}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-black flex items-center justify-center text-[8px] text-tactical-brass/50 tracking-[0.4em]">
                                                                        Sin foto
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p>{participant.nombre || 'Operador'}</p>
                                                            <p className="text-[9px] text-tactical-brass/50 tracking-[0.5em]">
                                                                {cedula}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveParticipant(cedula)}
                                                            className="text-xs uppercase font-tactical tracking-[0.4em] px-3 py-1 border border-red-600 text-red-400 hover:bg-red-900/30 transition-colors"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}

export default TournamentsView

