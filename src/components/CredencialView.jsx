import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { searchCardByCedula } from '../services/cardService'

function CredencialView() {
    const { cedula } = useParams()
    const navigate = useNavigate()
    const [card, setCard] = useState(null)
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
            setCard(null)

            try {
                const foundCard = await searchCardByCedula(cedula)
                if (foundCard) {
                    const cardWithUrls = {
                        ...foundCard,
                        frontCardUrl: foundCard.frontCardBase64 || foundCard.frontCardUrl,
                        backCardUrl: foundCard.backCardBase64 || foundCard.backCardUrl
                    }
                    setCard(cardWithUrls)
                } else {
                    setError('No se encontró ningún carnet con esa cédula')
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

    const handleMouseMove = (e, cardType) => {
        const card = e.currentTarget
        const rect = card.getBoundingClientRect()
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
                <div className="text-tactical-gold font-tactical text-xl uppercase tracking-wider">[CARGANDO CREDENCIAL...]</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-tactical-dark flex items-center justify-center p-8">
                <div className="max-w-md w-full hud-border p-1">
                    <div className="bg-black p-8 text-center" style={{
                        background: '#0a0a0a',
                        boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                    }}>
                        <h2 className="text-2xl font-bold text-red-500 mb-4 font-tactical uppercase tracking-wider">[ERROR]</h2>
                        <p className="text-tactical-brass mb-6 font-tactical">{error}</p>
                        <button
                            onClick={() => navigate('/buscar-carnet')}
                            className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                            style={{
                                boxShadow: 'none',
                                textShadow: 'none'
                            }}
                        >
                            [VOLVER A BÚSQUEDA]
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!card) {
        return null
    }

    return (
        <div className="min-h-screen bg-tactical-dark p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-4 text-center border-b border-tactical-border pb-3 relative"
                    style={{
                        borderStyle: 'solid',
                        borderWidth: '1px',
                        boxShadow: 'none'
                    }}>
                    <h1 className="text-2xl font-bold text-tactical-gold mb-1 font-tactical tracking-wider"
                        style={{
                            textShadow: 'none',
                            letterSpacing: '0.1em',
                            fontWeight: '600'
                        }}>
                        [CLASIFICADO] CREDENCIAL DE OPERADOR
                    </h1>
                    <p className="text-tactical-brass text-xs font-tactical uppercase tracking-wider opacity-80"
                        style={{ letterSpacing: '0.08em', textShadow: 'none' }}>
                        CLUB DE TIRO DEPORTIVO DEL VALLE - OPERACIONES ESPECIALES
                    </p>
                </div>

                {/* Información del miembro */}
                <div className="hud-border p-1 mb-4">
                    <div className="bg-black p-4" style={{
                        background: '#0a0a0a',
                        boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                    }}>
                        <h2 className="text-lg font-semibold text-tactical-gold mb-3 font-tactical border-b border-tactical-border pb-1 uppercase tracking-wider"
                            style={{
                                textShadow: 'none',
                                letterSpacing: '0.08em',
                                fontWeight: '500'
                            }}>
                            &gt; INFORMACIÓN DEL OPERADOR
                        </h2>
                        <div className="grid grid-cols-2 gap-2 text-tactical-brass font-tactical text-xs">
                            <div>
                                <span className="text-tactical-gold opacity-80">Nombre: </span>
                                {card.nombre}
                            </div>
                            <div>
                                <span className="text-tactical-gold opacity-80">Cédula: </span>
                                {card.cedula}
                            </div>
                            {card.rh && (
                                <div>
                                    <span className="text-tactical-gold opacity-80">RH: </span>
                                    {card.rh}
                                </div>
                            )}
                            {card.contacto && (
                                <div>
                                    <span className="text-tactical-gold opacity-80">Contacto: </span>
                                    {card.contacto}
                                </div>
                            )}
                            {card.numeroMembresia && (
                                <div>
                                    <span className="text-tactical-gold opacity-80">Número de Membresía: </span>
                                    {card.numeroMembresia}
                                </div>
                            )}
                            {card.nivel && (
                                <div>
                                    <span className="text-tactical-gold opacity-80">Nivel: </span>
                                    {card.nivel}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Previsualización de carnets */}
                <div className="hud-border p-1">
                    <div className="bg-black p-4" style={{
                        background: '#0a0a0a',
                        boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                    }}>
                        <h2 className="text-lg font-semibold text-tactical-gold mb-3 font-tactical border-b border-tactical-border pb-1 uppercase tracking-wider"
                            style={{
                                textShadow: 'none',
                                letterSpacing: '0.08em',
                                fontWeight: '500'
                            }}>
                            &gt; VISTA PREVIA DE CREDENCIAL
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Cara Frontal */}
                            {card.frontCardUrl && (
                                <div>
                                    <h3 className="text-sm font-medium text-tactical-brass mb-2 font-tactical text-center uppercase tracking-wider opacity-80"
                                        style={{ textShadow: 'none' }}>&gt; CARA FRONTAL</h3>
                                    <div
                                        className="flex justify-center mb-2 border border-tactical-border p-2"
                                        style={{
                                            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8)',
                                            perspective: '1000px'
                                        }}
                                        onMouseMove={(e) => handleMouseMove(e, 'front')}
                                        onMouseLeave={() => handleMouseLeave('front')}
                                    >
                                        <img
                                            src={card.frontCardUrl}
                                            alt="Carnet Frontal"
                                            className="rounded"
                                            style={{
                                                width: '100%',
                                                maxWidth: '250px',
                                                height: 'auto',
                                                aspectRatio: '650/1004',
                                                objectFit: 'contain',
                                                display: 'block',
                                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.8)',
                                                transform: `perspective(1000px) rotateX(${frontCardTransform.rotateX}deg) rotateY(${frontCardTransform.rotateY}deg) scale3d(${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '1.12' : '1'}, ${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '1.12' : '1'}, 1) translateZ(${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '25px' : '0px'})`,
                                                transition: 'transform 0.1s ease-out',
                                                transformStyle: 'preserve-3d',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Cara Trasera */}
                            {card.backCardUrl && (
                                <div>
                                    <h3 className="text-sm font-medium text-tactical-brass mb-2 font-tactical text-center uppercase tracking-wider opacity-80"
                                        style={{ textShadow: 'none' }}>&gt; CARA TRASERA</h3>
                                    <div
                                        className="flex justify-center mb-2 border border-tactical-border p-2"
                                        style={{
                                            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8)',
                                            perspective: '1000px'
                                        }}
                                        onMouseMove={(e) => handleMouseMove(e, 'back')}
                                        onMouseLeave={() => handleMouseLeave('back')}
                                    >
                                        <img
                                            src={card.backCardUrl}
                                            alt="Carnet Trasero"
                                            className="rounded"
                                            style={{
                                                width: '100%',
                                                maxWidth: '250px',
                                                height: 'auto',
                                                aspectRatio: '650/1004',
                                                objectFit: 'contain',
                                                display: 'block',
                                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.8)',
                                                transform: `perspective(1000px) rotateX(${backCardTransform.rotateX}deg) rotateY(${backCardTransform.rotateY}deg) scale3d(${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '1.12' : '1'}, ${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '1.12' : '1'}, 1) translateZ(${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '25px' : '0px'})`,
                                                transition: 'transform 0.1s ease-out',
                                                transformStyle: 'preserve-3d',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-center">
                            <button
                                onClick={() => navigate('/buscar-carnet')}
                                className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                                style={{
                                    boxShadow: 'none',
                                    textShadow: 'none'
                                }}
                            >
                                [VOLVER A BÚSQUEDA]
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CredencialView

