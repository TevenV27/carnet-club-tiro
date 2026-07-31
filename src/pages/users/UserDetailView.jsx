import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserByCedula, setUserActivo } from '../../services/userService'
import { searchCardByCedula, setCarnetActivo } from '../../services/cardService'
import CarnetPreview from '../../components/carnet/CarnetPreview'
import InactiveBanner from '../../components/ui/InactiveBanner'
import { isActivo } from '../../utils/activoStatus'

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
    const [cardTraumatico, setCardTraumatico] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [toggling, setToggling] = useState(null)

    useEffect(() => {
        let isMounted = true

        const fetchData = async () => {
            try {
                setLoading(true)
                const [userData, cardData, cardT] = await Promise.all([
                    getUserByCedula(cedula),
                    searchCardByCedula(cedula, 'airsoft'),
                    searchCardByCedula(cedula, 'traumatico')
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
                setCardTraumatico(cardT)
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
            bbs,
            equipoLogo,
            rango,
            precision,
            habilidades,
            team,
            activo,
            puntos,
            puntosTraumatico,
            rankingUpdatedAt,
            authUid,
            carnetIdTraumatico,
            carnetTraumaticoUpdatedAt,
            ...rest
        } = user

        const fieldOrder = [
            'nombre',
            'cedula',
            'contacto',
            'contactoEmergencia',
            'rh',
            'numeroMembresia',
            'numeroMembresiaTraumatico',
            'emision',
            'vigencia',
            'identificador',
            'nivel',
            'especialidad',
            'disciplina',
            'equipoTactico',
            'rolEnEquipo',
            'pistola',
            'fusil',
            'nombreClub'
        ]

        const orderedFields = []
        const remainingFields = new Map()

        fieldOrder.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(rest, key)) {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
                orderedFields.push({ key, label, value: formatValue(rest[key]) })
            }
        })

        Object.entries(rest).forEach(([key, value]) => {
            if (!fieldOrder.includes(key)) {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
                remainingFields.set(key, { key, label, value: formatValue(value) })
            }
        })

        return [...orderedFields, ...Array.from(remainingFields.values())]
    }, [user])

    const userActive = isActivo(user)
    const airsoftActive = isActivo(card)
    const traumaticoActive = isActivo(cardTraumatico)

    const handleToggleUser = async () => {
        if (!user) return
        const next = !userActive
        const ok = window.confirm(
            next
                ? '¿Activar este operador? Podrá iniciar sesión de nuevo. Sus carnets se reactivan por separado si hace falta.'
                : '¿Desactivar este operador? No podrá iniciar sesión y sus carnets también quedarán inactivos (muy visible al consultarlos).'
        )
        if (!ok) return
        try {
            setToggling('user')
            await setUserActivo(cedula, next)
            setUser((prev) => ({ ...prev, activo: next }))
            if (!next) {
                setCard((prev) => (prev ? { ...prev, activo: false } : prev))
                setCardTraumatico((prev) => (prev ? { ...prev, activo: false } : prev))
            }
        } catch (err) {
            console.error(err)
            alert('No se pudo actualizar el estado del operador.')
        } finally {
            setToggling(null)
        }
    }

    const handleToggleCarnet = async (tipo) => {
        const target = tipo === 'traumatico' ? cardTraumatico : card
        if (!target?.id) return
        const currentlyActive = isActivo(target)
        const next = !currentlyActive
        const label = tipo === 'traumatico' ? 'traumático' : 'airsoft'
        const ok = window.confirm(
            next
                ? `¿Activar el carnet ${label}?`
                : `¿Desactivar el carnet ${label}? Al consultarlo se mostrará claramente como INACTIVO.`
        )
        if (!ok) return
        try {
            setToggling(tipo)
            await setCarnetActivo(target.id, next)
            const updater = (prev) => (prev ? { ...prev, activo: next } : prev)
            if (tipo === 'traumatico') setCardTraumatico(updater)
            else setCard(updater)
        } catch (err) {
            console.error(err)
            alert('No se pudo actualizar el estado del carnet.')
        } finally {
            setToggling(null)
        }
    }

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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                    <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.06em]">
                        Informe Operador
                    </h1>
                    <p className="text-xs font-tactical text-tactical-brass uppercase tracking-[0.08em] mt-2">
                        Cédula: {cedula}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/usuarios')}
                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200 w-full sm:w-auto"
                >
                    Regresar al panel
                </button>
            </div>

            {!userActive && (
                <InactiveBanner
                    title="OPERADOR INACTIVO"
                    message="Este operador está desactivado. No puede iniciar sesión y cualquier consulta debe tratarse como no vigente."
                />
            )}

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                    className={`lg:col-span-1 bg-black/50 border rounded-lg p-[10px] md:p-6 space-y-4 ${
                        userActive ? 'border-tactical-border' : 'border-red-500/80'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-tactical-brass/90 font-tactical uppercase tracking-[0.08em]">
                            Operador
                        </p>
                        {!userActive ? (
                            <InactiveBanner compact title="INACTIVO" />
                        ) : (
                            <span className="text-[9px] font-tactical uppercase tracking-[0.12em] text-emerald-400 border border-emerald-500/50 px-2 py-0.5">
                                Activo
                            </span>
                        )}
                    </div>

                    <div className={`grid grid-cols-[auto,_1fr] gap-4 items-start ${!userActive ? 'opacity-60 grayscale' : ''}`}>
                        <div className="border border-tactical-border overflow-hidden bg-black w-24 h-32 sm:w-28 sm:h-36 flex items-center justify-center">
                            {user.foto ? (
                                <img
                                    src={user.foto}
                                    alt={`Foto de ${user.nombre || cedula}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-tactical-brass/90 text-[10px] font-tactical uppercase tracking-[0.12em] text-center px-2">
                                    Sin foto
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 space-y-2 text-[10px] sm:text-[11px] font-tactical uppercase tracking-[0.05em]">
                            <p className="text-tactical-gold text-sm sm:text-base tracking-[0.06em] break-words">
                                {user.nombre || 'Sin nombre'}
                            </p>
                            <p className="text-tactical-brass/90 break-words">
                                <span className="text-tactical-gold">Registrado:</span> {formatTimestamp(user.createdAt)}
                            </p>
                            <p className="text-tactical-brass/90 break-words">
                                <span className="text-tactical-gold">Actualizado:</span> {formatTimestamp(user.updatedAt)}
                            </p>
                            <p className="text-tactical-brass/90 break-words">
                                <span className="text-tactical-gold">Última sincronización:</span>{' '}
                                {formatTimestamp(user.carnetUpdatedAt)}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleToggleUser}
                        disabled={toggling === 'user'}
                        className={`w-full font-semibold py-2.5 px-4 border font-tactical text-xs uppercase tracking-[0.06em] transition-all duration-200 disabled:opacity-50 ${
                            userActive
                                ? 'bg-red-950/40 text-red-300 border-red-600 hover:bg-red-900/50 hover:border-red-400'
                                : 'bg-emerald-950/40 text-emerald-300 border-emerald-600 hover:bg-emerald-900/50 hover:border-emerald-400'
                        }`}
                    >
                        {toggling === 'user'
                            ? 'Guardando...'
                            : userActive
                              ? 'Desactivar operador'
                              : 'Activar operador'}
                    </button>
                </div>

                <div className="lg:col-span-2 bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6">
                    <p className="text-xs text-tactical-brass/90 font-tactical uppercase tracking-[0.08em] mb-4">
                        Datos tácticos del operador
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                        {dataEntries.map(({ label, value }) => (
                            <div
                                key={label}
                                className="border border-tactical-border/40 rounded-md px-3 py-2 sm:px-4 sm:py-3 bg-black/30 text-[10px] sm:text-[11px] font-tactical uppercase tracking-[0.05em] min-w-0"
                            >
                                <p className="text-tactical-brass/90 text-[9px] mb-1 truncate">{label}</p>
                                <p className="text-tactical-gold break-words">{value || 'N/D'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {card && (
                <section
                    className={`bg-black/40 border rounded-lg p-[10px] md:p-6 space-y-4 ${
                        airsoftActive && userActive ? 'border-tactical-border' : 'border-red-500/80'
                    }`}
                >
                    {(!airsoftActive || !userActive) && (
                        <InactiveBanner
                            title={!userActive ? 'OPERADOR INACTIVO' : 'CARNET AIRSOFT INACTIVO'}
                            message={
                                !userActive
                                    ? 'El operador está desactivado; esta credencial no debe considerarse vigente.'
                                    : 'Este carnet airsoft está desactivado. Al escanearlo o consultarlo debe verse como no válido.'
                            }
                        />
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-tactical-brass/90 font-tactical uppercase tracking-[0.08em]">
                                Credencial Airsoft
                            </p>
                            {!airsoftActive && <InactiveBanner compact title="CARNET INACTIVO" />}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <p className="text-[10px] text-tactical-brass font-tactical uppercase tracking-[0.08em]">
                                Última actualización: {formatTimestamp(card.updatedAt)}
                            </p>
                            <button
                                type="button"
                                onClick={() => handleToggleCarnet('airsoft')}
                                disabled={toggling === 'airsoft'}
                                className={`font-semibold py-2 px-4 border font-tactical text-xs uppercase tracking-[0.06em] transition-all duration-200 whitespace-nowrap disabled:opacity-50 ${
                                    airsoftActive
                                        ? 'bg-red-950/40 text-red-300 border-red-600 hover:border-red-400'
                                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-600 hover:border-emerald-400'
                                }`}
                            >
                                {toggling === 'airsoft'
                                    ? 'Guardando...'
                                    : airsoftActive
                                      ? 'Desactivar carnet'
                                      : 'Activar carnet'}
                            </button>
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

                    <div
                        className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
                            !airsoftActive || !userActive ? 'opacity-50 grayscale' : ''
                        }`}
                    >
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

            {cardTraumatico && (
                <section
                    className={`bg-black/40 border rounded-lg p-[10px] md:p-6 space-y-4 ${
                        traumaticoActive && userActive ? 'border-tactical-border' : 'border-red-500/80'
                    }`}
                >
                    {(!traumaticoActive || !userActive) && (
                        <InactiveBanner
                            title={!userActive ? 'OPERADOR INACTIVO' : 'CARNET TRAUMÁTICO INACTIVO'}
                            message={
                                !userActive
                                    ? 'El operador está desactivado; esta credencial no debe considerarse vigente.'
                                    : 'Este carnet traumático está desactivado. Al consultarlo debe verse como no válido.'
                            }
                        />
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-tactical-brass/90 font-tactical uppercase tracking-[0.08em]">
                                Credencial Traumático · {cardTraumatico.numeroMembresia || 'CTV-T'}
                            </p>
                            {!traumaticoActive && <InactiveBanner compact title="CARNET INACTIVO" />}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <p className="text-[10px] text-tactical-brass font-tactical uppercase tracking-[0.08em]">
                                Última actualización: {formatTimestamp(cardTraumatico.updatedAt)}
                            </p>
                            <button
                                type="button"
                                onClick={() => handleToggleCarnet('traumatico')}
                                disabled={toggling === 'traumatico'}
                                className={`font-semibold py-2 px-4 border font-tactical text-xs uppercase tracking-[0.06em] transition-all duration-200 whitespace-nowrap disabled:opacity-50 ${
                                    traumaticoActive
                                        ? 'bg-red-950/40 text-red-300 border-red-600 hover:border-red-400'
                                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-600 hover:border-emerald-400'
                                }`}
                            >
                                {toggling === 'traumatico'
                                    ? 'Guardando...'
                                    : traumaticoActive
                                      ? 'Desactivar carnet'
                                      : 'Activar carnet'}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/usuarios/${encodeURIComponent(cedula)}/editar-carnet-traumatico`
                                    )
                                }
                                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.06em] transition-all duration-200 whitespace-nowrap"
                            >
                                Editar traumático
                            </button>
                        </div>
                    </div>

                    <div
                        className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
                            !traumaticoActive || !userActive ? 'opacity-50 grayscale' : ''
                        }`}
                    >
                        <div className="border border-tactical-border p-4 bg-black/60">
                            <p className="text-[10px] text-tactical-brass font-tactical uppercase tracking-[0.08em] mb-3">
                                Cara frontal
                            </p>
                            <CarnetPreview
                                src={cardTraumatico.frontCardBase64}
                                alt="Carnet traumático frontal"
                                placeholder="Sin imagen frontal"
                            />
                        </div>

                        <div className="border border-tactical-border p-4 bg-black/60">
                            <p className="text-[10px] text-tactical-brass font-tactical uppercase tracking-[0.08em] mb-3">
                                Cara trasera
                            </p>
                            <CarnetPreview
                                src={cardTraumatico.backCardBase64}
                                alt="Carnet traumático trasero"
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
