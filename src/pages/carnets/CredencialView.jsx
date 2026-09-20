import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { searchCardsByCedula } from '../../services/cardService'
import { getUserByCedula } from '../../services/userService'
import CarnetPreview from '../../components/carnet/CarnetPreview'
import InactiveBanner from '../../components/ui/InactiveBanner'
import { isActivo } from '../../utils/activoStatus'

const withUrls = (card) => ({
    ...card,
    frontCardUrl: card.frontCardBase64 || card.frontCardUrl,
    backCardUrl: card.backCardBase64 || card.backCardUrl
})

const tipoLabel = (card) =>
    card?.tipoCarnet === 'traumatico' ? 'Traumático' : 'Airsoft'

function CredencialView() {
    const { cedula: cedulaParam } = useParams()
    const [searchParams] = useSearchParams()
    const tipoParam = searchParams.get('tipo')
    const cedula = decodeURIComponent(cedulaParam || '').trim()

    const [cards, setCards] = useState([])
    const [operator, setOperator] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [frontCardTransform, setFrontCardTransform] = useState({ rotateX: 0, rotateY: 0 })
    const [backCardTransform, setBackCardTransform] = useState({ rotateX: 0, rotateY: 0 })

    useEffect(() => {
        const loadCard = async () => {
            if (!cedula) {
                setError('Cédula no proporcionada')
                setLoading(false)
                return
            }

            setLoading(true)
            setError('')
            setCards([])
            setOperator(null)

            try {
                const foundCards = await searchCardsByCedula(cedula)
                if (!foundCards.length) {
                    setError('No se encontró ningún carnet con esa cédula')
                    return
                }
                setCards(foundCards.map(withUrls))

                // Operador es opcional: en público a veces no hay permiso a `usuarios`
                try {
                    const userData = await getUserByCedula(cedula)
                    setOperator(userData)
                } catch (userErr) {
                    console.warn('No se pudo cargar el operador (consulta pública):', userErr)
                    setOperator(null)
                }
            } catch (err) {
                console.error('Error buscando carnet:', err)
                setError('Error al buscar el carnet. Por favor, intenta nuevamente.')
            } finally {
                setLoading(false)
            }
        }

        loadCard()
    }, [cedula])

    const selectedCards = useMemo(() => {
        if (!cards.length) return []
        if (tipoParam === 'traumatico' || tipoParam === 'airsoft') {
            const match =
                tipoParam === 'traumatico'
                    ? cards.filter((c) => c.tipoCarnet === 'traumatico')
                    : cards.filter((c) => !c.tipoCarnet || c.tipoCarnet === 'airsoft')
            return match.length ? match : cards
        }
        return cards
    }, [cards, tipoParam])

    const operatorActive = isActivo(operator)
    const anyCarnetInactive = selectedCards.some((c) => !isActivo(c))
    const allSelectedInactive =
        selectedCards.length > 0 && selectedCards.every((c) => !isActivo(c))
    const showOperatorInactive = operator && !operatorActive
    const showInactiveBanner = showOperatorInactive || anyCarnetInactive

    const handleMouseMove = (e, cardType) => {
        const el = e.currentTarget
        const rect = el.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const centerX = rect.width / 2
        const centerY = rect.height / 2

        const rotateX = ((y - centerY) / centerY) * -10
        const rotateY = ((x - centerX) / centerX) * 10

        if (cardType === 'front') {
            setFrontCardTransform({ rotateX, rotateY })
        } else {
            setBackCardTransform({ rotateX, rotateY })
        }
    }

    const handleMouseLeave = (cardType) => {
        if (cardType === 'front') {
            setFrontCardTransform({ rotateX: 0, rotateY: 0 })
        } else {
            setBackCardTransform({ rotateX: 0, rotateY: 0 })
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-tactical-dark flex items-center justify-center p-4">
                <div className="text-tactical-gold font-tactical text-xl uppercase tracking-normal">
                    [CARGANDO CREDENCIAL...]
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-tactical-dark flex items-center justify-center p-8">
                <div className="max-w-md w-full hud-border p-1">
                    <div
                        className="bg-black p-8 text-center"
                        style={{
                            background: '#0c0d11',
                            boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                        }}
                    >
                        <h2 className="text-2xl font-bold text-red-500 mb-4 font-tactical uppercase tracking-normal">
                            [ERROR]
                        </h2>
                        <p className="text-tactical-brass mb-6 font-tactical">{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!selectedCards.length) {
        return null
    }

    const primary = selectedCards[0]
    const inactiveTitle = showOperatorInactive
        ? 'OPERADOR INACTIVO'
        : allSelectedInactive
          ? 'CARNET INACTIVO'
          : 'CREDENCIAL CON ESTADO INACTIVO'
    const inactiveMessage = showOperatorInactive
        ? 'Este operador está desactivado. La credencial no es válida.'
        : allSelectedInactive
          ? 'Este carnet está desactivado y no debe considerarse vigente.'
          : 'Al menos una credencial de este operador está desactivada. Revisa el estado de cada carnet abajo.'

    const frontTransformStyle = {
        transform: `perspective(1000px) rotateX(${frontCardTransform.rotateX}deg) rotateY(${frontCardTransform.rotateY}deg) scale3d(${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '1.12' : '1'}, ${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '1.12' : '1'}, 1) translateZ(${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '25px' : '0px'})`,
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
        cursor: 'pointer'
    }

    const backTransformStyle = {
        transform: `perspective(1000px) rotateX(${backCardTransform.rotateX}deg) rotateY(${backCardTransform.rotateY}deg) scale3d(${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '1.12' : '1'}, ${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '1.12' : '1'}, 1) translateZ(${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '25px' : '0px'})`,
        transition: 'transform 0.1s ease-out',
        transformStyle: 'preserve-3d',
        cursor: 'pointer'
    }

    return (
        <div className="min-h-screen bg-tactical-dark p-[10px] md:p-4">
            <div className="max-w-6xl mx-auto space-y-4">
                <div
                    className="mb-2 text-center border-b border-tactical-border pb-3 relative"
                    style={{ borderStyle: 'solid', borderWidth: '1px', boxShadow: 'none' }}
                >
                    <h1
                        className="text-2xl font-bold text-tactical-gold mb-1 font-tactical tracking-normal"
                        style={{ textShadow: 'none', letterSpacing: '0.1em', fontWeight: '600' }}
                    >
                        [CLASIFICADO] CREDENCIAL DE OPERADOR
                    </h1>
                    <p
                        className="text-tactical-brass text-xs font-tactical uppercase tracking-normal opacity-80"
                        style={{ letterSpacing: '0.08em', textShadow: 'none' }}
                    >
                        CLUB DE TIRO DEPORTIVO DEL VALLE - OPERACIONES ESPECIALES
                    </p>
                </div>

                {showInactiveBanner && (
                    <InactiveBanner title={inactiveTitle} message={inactiveMessage} />
                )}

                <div className={`hud-border p-1 ${showInactiveBanner ? 'border-red-500' : ''}`}>
                    <div
                        className={`bg-black p-4 ${showInactiveBanner ? 'opacity-90' : ''}`}
                        style={{
                            background: showInactiveBanner ? '#1a0505' : '#0c0d11',
                            boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                        }}
                    >
                        <h2
                            className="text-lg font-semibold text-tactical-gold mb-3 font-tactical border-b border-tactical-border pb-1 uppercase tracking-normal"
                            style={{ textShadow: 'none', letterSpacing: '0.08em', fontWeight: '500' }}
                        >
                            &gt; INFORMACIÓN DEL OPERADOR
                            {showOperatorInactive || allSelectedInactive ? ' — INACTIVO' : ''}
                        </h2>
                        <div className="grid grid-cols-2 gap-2 text-tactical-brass font-tactical text-xs">
                            <div>
                                <span className="text-tactical-gold opacity-80">Nombre: </span>
                                {primary.nombre}
                            </div>
                            <div>
                                <span className="text-tactical-gold opacity-80">Cédula: </span>
                                {primary.cedula || cedula}
                            </div>
                            {primary.rh && (
                                <div>
                                    <span className="text-tactical-gold opacity-80">RH: </span>
                                    {primary.rh}
                                </div>
                            )}
                            {primary.contacto && (
                                <div>
                                    <span className="text-tactical-gold opacity-80">Contacto: </span>
                                    {primary.contacto}
                                </div>
                            )}
                            <div>
                                <span className="text-tactical-gold opacity-80">Estado operador: </span>
                                {operator ? (operatorActive ? 'ACTIVO' : 'INACTIVO') : 'N/D'}
                            </div>
                        </div>
                    </div>
                </div>

                {selectedCards.map((card) => {
                    const cardActive = isActivo(card)
                    const inactive = showOperatorInactive || !cardActive
                    return (
                        <div
                            key={card.id || `${card.tipoCarnet}-${card.numeroMembresia}`}
                            className={`hud-border p-1 ${inactive ? 'border-red-500' : ''}`}
                        >
                            <div
                                className="bg-black p-4"
                                style={{
                                    background: inactive ? '#1a0505' : '#0c0d11',
                                    boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                                }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 border-b border-tactical-border pb-2">
                                    <h2
                                        className="text-lg font-semibold text-tactical-gold font-tactical uppercase tracking-normal"
                                        style={{
                                            textShadow: 'none',
                                            letterSpacing: '0.08em',
                                            fontWeight: '500'
                                        }}
                                    >
                                        &gt; {tipoLabel(card).toUpperCase()}
                                        {card.tipoCarnet === 'traumatico' && card.rolCarnet === 'instructor'
                                            ? ' · INSTRUCTOR DE TIRO'
                                            : card.numeroMembresia
                                                ? ` · ${card.numeroMembresia}`
                                                : ''}
                                    </h2>
                                    {inactive ? (
                                        <InactiveBanner
                                            compact
                                            title={
                                                showOperatorInactive && cardActive
                                                    ? 'OPERADOR INACTIVO'
                                                    : 'CARNET INACTIVO'
                                            }
                                        />
                                    ) : (
                                        <span className="text-[10px] font-tactical uppercase tracking-[0.12em] text-emerald-400 border border-emerald-500/50 px-2 py-1 w-fit">
                                            Vigente
                                        </span>
                                    )}
                                </div>

                                {inactive && (
                                    <div className="mb-4">
                                        <InactiveBanner
                                            title={
                                                !cardActive
                                                    ? 'CARNET INACTIVO'
                                                    : 'OPERADOR INACTIVO'
                                            }
                                            message={
                                                !cardActive
                                                    ? 'Esta credencial está desactivada y no debe considerarse vigente.'
                                                    : 'El operador está desactivado; esta credencial no es válida.'
                                            }
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 text-tactical-brass font-tactical text-xs mb-4">
                                    {card.tipoCarnet === 'traumatico' && card.rolCarnet === 'instructor' ? (
                                        <div>
                                            <span className="text-tactical-gold opacity-80">
                                                Rol:{' '}
                                            </span>
                                            INSTRUCTOR DE TIRO
                                        </div>
                                    ) : card.numeroMembresia ? (
                                        <div>
                                            <span className="text-tactical-gold opacity-80">
                                                Membresía:{' '}
                                            </span>
                                            {card.numeroMembresia}
                                        </div>
                                    ) : null}
                                    {card.nivel && (
                                        <div>
                                            <span className="text-tactical-gold opacity-80">Nivel: </span>
                                            {card.nivel}
                                        </div>
                                    )}
                                    {card.disciplina && (
                                        <div>
                                            <span className="text-tactical-gold opacity-80">
                                                Disciplina:{' '}
                                            </span>
                                            {card.disciplina}
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-tactical-gold opacity-80">Estado: </span>
                                        <span className={inactive ? 'text-red-400 font-bold' : ''}>
                                            {inactive ? 'INACTIVO' : 'ACTIVO'}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
                                        inactive ? 'grayscale opacity-50' : ''
                                    }`}
                                >
                                    {card.frontCardUrl && (
                                        <div>
                                            <h3
                                                className="text-sm font-medium text-tactical-brass mb-2 font-tactical text-center uppercase tracking-normal opacity-80"
                                                style={{ textShadow: 'none' }}
                                            >
                                                &gt; CARA FRONTAL
                                            </h3>
                                            <CarnetPreview
                                                src={card.frontCardUrl}
                                                alt={`Carnet ${tipoLabel(card)} frontal`}
                                                placeholder="Sin imagen frontal"
                                                interactive
                                                imageStyle={frontTransformStyle}
                                                onMouseMove={(e) => handleMouseMove(e, 'front')}
                                                onMouseLeave={() => handleMouseLeave('front')}
                                            />
                                        </div>
                                    )}
                                    {card.backCardUrl && (
                                        <div>
                                            <h3
                                                className="text-sm font-medium text-tactical-brass mb-2 font-tactical text-center uppercase tracking-normal opacity-80"
                                                style={{ textShadow: 'none' }}
                                            >
                                                &gt; CARA TRASERA
                                            </h3>
                                            <CarnetPreview
                                                src={card.backCardUrl}
                                                alt={`Carnet ${tipoLabel(card)} trasero`}
                                                placeholder="Sin imagen trasera"
                                                interactive
                                                imageStyle={backTransformStyle}
                                                onMouseMove={(e) => handleMouseMove(e, 'back')}
                                                onMouseLeave={() => handleMouseLeave('back')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default CredencialView
