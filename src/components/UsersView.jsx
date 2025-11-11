import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllUsers } from '../services/userService'

const formatTimestamp = (value) => {
    if (!value) {
        return 'N/D'
    }

    if (typeof value.toDate === 'function') {
        return value.toDate().toLocaleString('es-ES')
    }

    if (value instanceof Date) {
        return value.toLocaleString('es-ES')
    }

    return String(value)
}

function UsersView() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        let isMounted = true

        const fetchUsers = async () => {
            try {
                setLoading(true)
                const data = await getAllUsers()
                if (isMounted) {
                    setUsers(data)
                }
            } catch (err) {
                console.error('Error cargando usuarios:', err)
                if (isMounted) {
                    setError('No se pudieron cargar los usuarios. Intenta nuevamente más tarde.')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchUsers()

        return () => {
            isMounted = false
        }
    }, [])

    const filteredUsers = useMemo(() => {
        if (!searchTerm.trim()) {
            return users
        }

        const term = searchTerm.trim().toLowerCase()
        return users.filter((user) => {
            const nombre = (user.nombre || '').toLowerCase()
            const cedula = (user.cedula || '').toLowerCase()
            return nombre.includes(term) || cedula.includes(term)
        })
    }, [users, searchTerm])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-widest">
                    Cargando usuarios...
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
        <div className="p-8 bg-tactical-dark min-h-full h-full text-tactical-brass">
            <section className="mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent pointer-events-none" />
                <div className="relative z-10 border border-tactical-border p-6 bg-black/30 backdrop-blur-sm shadow-[0_0_25px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-1 bg-tactical-gold shadow-[0_0_20px_rgba(175,153,116,0.9)]" />
                        <div>
                            <h2 className="text-3xl lg:text-4xl font-tactical text-tactical-gold uppercase tracking-[0.3em] drop-shadow-md">
                                Panel de Operadores
                            </h2>
                            <p className="text-xs lg:text-sm font-tactical text-tactical-brass opacity-80 tracking-[0.4em] uppercase mt-2">
                                Inteligencia | Estado de Fuerza | Acceso Restringido
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="mb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border border-tactical-border bg-black/40 backdrop-blur-sm px-5 py-4 shadow-[0_0_25px_rgba(0,0,0,0.5)]">
                    <div>
                        <p className="text-xs font-tactical text-tactical-brass/80 uppercase tracking-[0.4em]">
                            Buscar operadores por nombre o cédula
                        </p>
                        <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.5em] mt-1">
                            {filteredUsers.length} resultados activos
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/60 border border-tactical-border px-3 py-2 rounded-md w-full lg:w-96 shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
                        <span className="text-tactical-gold text-xs font-tactical uppercase tracking-[0.4em]">Scan</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Ej: Carlos | 1234567890"
                            className="flex-1 bg-transparent border-0 text-tactical-brass text-sm font-tactical uppercase tracking-[0.3em] placeholder:text-tactical-brass/40 focus:outline-none"
                        />
                    </div>
                </div>
            </section>

            {users.length === 0 ? (
                <div className="bg-black border border-dashed border-tactical-border p-6 rounded text-center font-tactical text-sm uppercase">
                    No hay usuarios registrados todavía.
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="bg-black border border-tactical-border p-6 rounded text-center font-tactical text-sm uppercase tracking-[0.4em] text-tactical-brass/70">
                    Sin coincidencias para "{searchTerm}"
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredUsers.map((user) => {
                        const cedula = user.cedula || user.id

                        return (
                            <article
                                key={user.id}
                                className="relative bg-[radial-gradient(circle_at_top,_#1c1c1c_0%,_#080808_70%)] border border-tactical-border px-6 py-7 rounded-lg overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.6)] hover:shadow-[0_0_40px_rgba(0,0,0,0.9)] transition-all duration-200 cursor-pointer select-none min-w-[300px]"
                                onDoubleClick={() => navigate(`/usuarios/${encodeURIComponent(cedula)}`)}
                                title="Doble clic para ver el informe completo"
                            >
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 border border-tactical-border/60 rounded-lg" />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-black/15" />
                                    <div className="absolute -top-1 -left-1 w-24 h-24 border border-tactical-border/20 rounded-full blur-lg" />
                                    <div className="absolute top-5 right-5 text-[10px] font-tactical uppercase tracking-[0.3em] text-tactical-brass/80 bg-black/70 px-3 py-1 border border-tactical-border/40 rounded-full">
                                        {user.nivel || 'Operador'}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-tactical-border/30 to-transparent opacity-40" />
                                </div>

                                <div className="grid gap-5 md:grid-cols-[auto,_1fr] relative z-10">
                                    <div className="relative mx-auto md:mx-0">
                                        <div className="absolute -top-2 -left-2 w-7 h-7 border-tactical-gold border-t-2 border-l-2 opacity-60" />
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 border-tactical-border/70 border-b-2 border-r-2 opacity-60" />
                                        {user.foto ? (
                                            <div className="w-32 h-40 border border-tactical-border overflow-hidden shadow-[0_0_18px_rgba(0,0,0,0.55)] relative">
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                                <img
                                                    src={user.foto}
                                                    alt={`Foto de ${user.nombre || user.id}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-32 h-40 flex items-center justify-center border border-dashed border-tactical-border text-[10px] font-tactical uppercase tracking-widest opacity-60 text-center break-words">
                                                Sin fotografía
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-3 font-tactical text-[11px] uppercase tracking-[0.3em] leading-relaxed pb-6 break-words">
                                        <div className="flex flex-col border-b border-tactical-border/60 pb-3 gap-1 break-words">
                                            <p className="text-tactical-gold text-base break-words">
                                                {user.nombre || 'Sin nombre'}
                                            </p>
                                            <span className="text-[9px] text-tactical-brass/70 break-words">
                                                ID: {cedula}
                                            </span>
                                        </div>

                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 break-words">
                                            {user.contacto && (
                                                <div className="space-y-1">
                                                    <dt className="text-[9px] text-tactical-brass/60">Contacto</dt>
                                                    <dd className="text-tactical-gold break-words">{user.contacto}</dd>
                                                </div>
                                            )}
                                            {user.numeroMembresia && (
                                                <div className="space-y-1">
                                                    <dt className="text-[9px] text-tactical-brass/60">Membresía</dt>
                                                    <dd className="text-tactical-gold break-words">{user.numeroMembresia}</dd>
                                                </div>
                                            )}
                                            {user.rh && (
                                                <div className="space-y-1">
                                                    <dt className="text-[9px] text-tactical-brass/60">RH</dt>
                                                    <dd className="text-tactical-gold break-words">{user.rh}</dd>
                                                </div>
                                            )}
                                            {user.vigencia && (
                                                <div className="space-y-1">
                                                    <dt className="text-[9px] text-tactical-brass/60">Vigencia</dt>
                                                    <dd className="text-tactical-gold break-words">{user.vigencia}</dd>
                                                </div>
                                            )}
                                        </dl>

                                        <div className="border border-tactical-border/40 rounded-md px-3 py-2 bg-black/30 text-xs tracking-[0.4em] break-words">
                                            Carnet: <span className="text-tactical-gold">{user.carnetId || 'No asignado'}</span>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] tracking-[0.55em] text-tactical-brass/60 gap-2">
                                            <span className="break-words">Actualizado {formatTimestamp(user.updatedAt)}</span>
                                            <span className="text-tactical-gold/80 whitespace-nowrap">Status: Verificado</span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default UsersView

