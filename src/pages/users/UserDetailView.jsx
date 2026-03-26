import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserByCedula } from '../../services/userService'
import { searchCardByCedula } from '../../services/cardService'
import CarnetPreview from '../../components/carnet/CarnetPreview'

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
            // Campos a excluir
            bbs,
            equipoLogo,
            rango,
            precision,
            habilidades,
            team, // Excluir campo "team"
            ...rest
        } = user

        // Orden de importancia y contexto
        const fieldOrder = [
            // Información personal básica
            'nombre',
            'cedula',
            'contacto',
            'contactoEmergencia',
            'rh',
            // Información del carnet
            'numeroMembresia',
            'emision',
            'vigencia',
            'identificador',
            // Información operativa
            'nivel',
            'especialidad',
            'disciplina',
            // Información del equipo
            'equipoTactico',
            'rolEnEquipo',
            // Información de armas
            'pistola',
            'fusil',
            // Información del club
            'nombreClub'
        ]

        // Crear mapa de campos ordenados
        const orderedFields = []
        const remainingFields = new Map()

        // Agregar campos en el orden especificado
        fieldOrder.forEach(key => {
            if (rest.hasOwnProperty(key)) {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
                const formattedValue = formatValue(rest[key])
                orderedFields.push({ key, label, value: formattedValue })
            }
        })

        // Agregar campos restantes que no están en la lista de orden
        Object.entries(rest).forEach(([key, value]) => {
            if (!fieldOrder.includes(key)) {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
                const formattedValue = formatValue(value)
                remainingFields.set(key, { key, label, value: formattedValue })
            }
        })

        // Combinar campos ordenados con los restantes
        return [...orderedFields, ...Array.from(remainingFields.values())]
    }, [user])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-tactical-dark">
                <div className="text-tactical-gold font-tactical uppercase tracking-wide">
                    Cargando perfil del operador...
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-tactical-dark gap-6">
                <div className="text-red-500 font-tactical uppercase tracking-wide text-center px-6">
                    {error}
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                >
                    Regresar
                </button>
            </div>
        )
    }

    return (
        <div className="p-3 md:p-8 bg-tactical-dark min-h-0 h-auto text-tactical-brass space-y-6 overflow-hidden md:overflow-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.06em]">
                        Informe Operador
                    </h1>
                    <p className="text-xs font-tactical text-tactical-brass uppercase tracking-[0.08em] mt-2">
                        Cedula: {cedula}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/usuarios')}
                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
                >
                    Regresar al panel
                </button>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-black/50 border border-tactical-border rounded-lg p-[10px] md:p-6 space-y-6">
                    <div>
                        <p className="text-xs text-tactical-brass/90 font-tactical uppercase tracking-[0.08em] mb-2">
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
                                <div className="text-tactical-brass/90 text-xs font-tactical uppercase tracking-[0.12em] text-center px-4">
                                    Sin fotografía registrada
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 text-[11px] font-tactical uppercase tracking-[0.05em]">
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

                <div className="lg:col-span-2 bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6">
                    <p className="text-xs text-tactical-brass/90 font-tactical uppercase tracking-[0.08em] mb-4">
                        Datos tácticos del operador
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dataEntries.map(({ label, value }) => (
                            <div
                                key={label}
                                className="border border-tactical-border/40 rounded-md px-4 py-3 bg-black/30 text-[11px] font-tactical uppercase tracking-[0.05em]"
                            >
                                <p className="text-tactical-brass/90 text-[9px] mb-1">{label}</p>
                                <p className="text-tactical-gold">{value || 'N/D'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {card && (
                <section className="bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-tactical-brass/90 font-tactical uppercase tracking-[0.08em]">
                            Credencial Generada
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <p className="text-[10px] text-tactical-brass font-tactical uppercase tracking-[0.08em]">
                                Última actualización: {formatTimestamp(card.updatedAt)}
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(`/usuarios/${encodeURIComponent(cedula)}/editar-carnet`)
                                }
                                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.06em] transition-all duration-200 whitespace-nowrap"
                            >
                                Editar carnet
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-tactical-border p-4 bg-black/60">
                            <p className="text-[10px] text-tactical-brass font-tactical uppercase tracking-[0.08em] mb-3">
                                Cara frontal
                            </p>
                            <CarnetPreview
                                src={card.frontCardBase64}
                                alt="Carnet frontal"
                                placeholder="Sin imagen frontal"
                            />
                        </div>

                        <div className="border border-tactical-border p-4 bg-black/60">
                            <p className="text-[10px] text-tactical-brass font-tactical uppercase tracking-[0.08em] mb-3">
                                Cara trasera
                            </p>
                            <CarnetPreview
                                src={card.backCardBase64}
                                alt="Carnet trasero"
                                placeholder="Sin imagen trasera"
                            />
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}

export default UserDetailView

