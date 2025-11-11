import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserByCedula } from '../services/userService'
import { searchCardByCedula } from '../services/cardService'

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

function UserDetailView() {
    const { cedula: cedulaParam } = useParams()
    const cedula = decodeURIComponent(cedulaParam || '')
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [card, setCard] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        const fetchData = async () => {
            try {
                setLoading(true)
                const [userData, cardData] = await Promise.all([
                    getUserByCedula(cedula),
                    searchCardByCedula(cedula)
                ])

                if (!isMounted) {
                    return
                }

                if (!userData) {
                    setError('No se encontró información para esta cédula.')
                    return
                }

                setUser(userData)
                setCard(cardData)
            } catch (err) {
                console.error('Error cargando información del usuario:', err)
                if (isMounted) {
                    setError('No se pudo cargar la información del operador. Intenta nuevamente.')
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
    }, [cedula])

    const formatValue = (value) => {
        if (value === null || value === undefined) {
            return 'N/D'
        }

        if (typeof value.toDate === 'function') {
            return formatTimestamp(value)
        }

        if (value instanceof Date) {
            return formatTimestamp(value)
        }

        if (Array.isArray(value)) {
            return value.join(', ')
        }

        if (typeof value === 'object') {
            return JSON.stringify(value)
        }

        return value
    }

    const dataEntries = useMemo(() => {
        if (!user) {
            return []
        }

        const {
            foto,
            carnetId,
            carnetUpdatedAt,
            createdAt,
            updatedAt,
            userId,
            ...rest
        } = user

        return Object.entries(rest).map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
            const formattedValue = formatValue(value)

            return {
                label,
                value: formattedValue
            }
        })
    }, [user])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-widest">
                    Cargando perfil del operador...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-tactical-dark gap-6">
                <div className="text-red-500 font-tactical uppercase tracking-widest text-center px-6">
                    {error}
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                >
                    Regresar
                </button>
            </div>
        )
    }

    return (
        <div className="p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.35em]">
                        Informe Operador
                    </h1>
                    <p className="text-xs font-tactical text-tactical-brass/70 uppercase tracking-[0.4em] mt-2">
                        Cedula: {cedula}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/usuarios')}
                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                >
                    Regresar al panel
                </button>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-black/50 border border-tactical-border rounded-lg p-6 space-y-6">
                    <div>
                        <p className="text-xs text-tactical-brass/60 font-tactical uppercase tracking-[0.4em] mb-2">
                            Fotografía Operador
                        </p>
                        <div className="border border-tactical-border overflow-hidden aspect-[3/4] flex items-center justify-center bg-black">
                            {user.foto ? (
                                <img
                                    src={user.foto}
                                    alt={`Foto de ${user.nombre || cedula}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-tactical-brass/60 text-xs font-tactical uppercase tracking-[0.5em] text-center px-4">
                                    Sin fotografía registrada
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 text-[11px] font-tactical uppercase tracking-[0.3em]">
                        <p>
                            <span className="text-tactical-gold">Registrado:</span> {formatTimestamp(user.createdAt)}
                        </p>
                        <p>
                            <span className="text-tactical-gold">Actualizado:</span> {formatTimestamp(user.updatedAt)}
                        </p>
                        <p>
                            <span className="text-tactical-gold">Carnet ID:</span> {user.carnetId || 'N/D'}
                        </p>
                        <p>
                            <span className="text-tactical-gold">Última sincronización:</span> {formatTimestamp(user.carnetUpdatedAt)}
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-black/40 border border-tactical-border rounded-lg p-6">
                    <p className="text-xs text-tactical-brass/60 font-tactical uppercase tracking-[0.4em] mb-4">
                        Datos tácticos del operador
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dataEntries.map(({ label, value }) => (
                            <div
                                key={label}
                                className="border border-tactical-border/40 rounded-md px-4 py-3 bg-black/30 text-[11px] font-tactical uppercase tracking-[0.3em]"
                            >
                                <p className="text-tactical-brass/60 text-[9px] mb-1">{label}</p>
                                <p className="text-tactical-gold">{value || 'N/D'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {card && (
                <section className="bg-black/40 border border-tactical-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-tactical-brass/60 font-tactical uppercase tracking-[0.4em]">
                            Credencial Generada
                        </p>
                        <p className="text-[10px] text-tactical-brass/50 font-tactical uppercase tracking-[0.4em]">
                            Última actualización: {formatTimestamp(card.updatedAt)}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-tactical-border p-4 bg-black/60">
                            <p className="text-[10px] text-tactical-brass/70 font-tactical uppercase tracking-[0.4em] mb-3">
                                Cara frontal
                            </p>
                            {card.frontCardBase64 ? (
                                <div className="flex justify-center">
                                    <img
                                        src={card.frontCardBase64}
                                        alt="Carnet frontal"
                                        className="w-full max-w-xs rounded shadow-[0_0_20px_rgba(0,0,0,0.6)]"
                                    />
                                </div>
                            ) : (
                                <div className="h-40 flex items-center justify-center text-[10px] text-tactical-brass/50 font-tactical uppercase tracking-[0.4em] border border-dashed border-tactical-border">
                                    Sin imagen frontal
                                </div>
                            )}
                        </div>

                        <div className="border border-tactical-border p-4 bg-black/60">
                            <p className="text-[10px] text-tactical-brass/70 font-tactical uppercase tracking-[0.4em] mb-3">
                                Cara trasera
                            </p>
                            {card.backCardBase64 ? (
                                <div className="flex justify-center">
                                    <img
                                        src={card.backCardBase64}
                                        alt="Carnet trasero"
                                        className="w-full max-w-xs rounded shadow-[0_0_20px_rgba(0,0,0,0.6)]"
                                    />
                                </div>
                            ) : (
                                <div className="h-40 flex items-center justify-center text-[10px] text-tactical-brass/50 font-tactical uppercase tracking-[0.4em] border border-dashed border-tactical-border">
                                    Sin imagen trasera
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}

export default UserDetailView

