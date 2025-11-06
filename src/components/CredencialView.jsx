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
            <div className="min-h-screen bg-tactical-dark flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
                <div className="text-tactical-gold font-tactical text-xl">Cargando credencial...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-tactical-dark flex items-center justify-center p-8"
                style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
                <div className="max-w-md w-full bg-tactical-gray rounded border-2 border-tactical-gold p-8 shadow-tactical text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4 font-tactical">Error</h2>
                    <p className="text-tactical-brass mb-6 font-tactical">{error}</p>
                </div>
            </div>
        )
    }

    if (!card) {
        return null
    }

    return (
        <div className="min-h-screen bg-tactical-dark p-8" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center border-b-2 border-tactical-gold pb-4" style={{ borderStyle: 'double', borderWidth: '4px' }}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold text-tactical-gold mb-2 font-tactical tracking-wider" style={{ textShadow: '0 0 10px rgba(212, 175, 55, 0.5)' }}>
                                [CREDENCIAL DE OPERADOR]
                            </h1>
                            <p className="text-tactical-brass text-sm font-tactical">CLUB DE TIRO DEPORTIVO DEL VALLE - SISTEMA OPERATIVO</p>
                        </div>
                    </div>
                </div>

                {/* Información del miembro */}
                <div className="bg-tactical-gray rounded border-2 border-tactical-gold p-6 shadow-tactical mb-8"
                    style={{ boxShadow: '0 0 15px rgba(212, 175, 55, 0.2), inset 0 0 20px rgba(0, 0, 0, 0.8)' }}>
                    <h2 className="text-2xl font-bold text-tactical-gold mb-4 font-tactical border-b border-tactical-brass pb-2">
                        [INFORMACIÓN DEL OPERADOR]
                    </h2>
                    <div className="grid grid-cols-2 gap-4 text-tactical-brass font-tactical">
                        <div>
                            <span className="text-tactical-gold">Nombre: </span>
                            {card.nombre}
                        </div>
                        <div>
                            <span className="text-tactical-gold">Cédula: </span>
                            {card.cedula}
                        </div>
                        {card.rh && (
                            <div>
                                <span className="text-tactical-gold">RH: </span>
                                {card.rh}
                            </div>
                        )}
                        {card.contacto && (
                            <div>
                                <span className="text-tactical-gold">Contacto: </span>
                                {card.contacto}
                            </div>
                        )}
                        {card.numeroMembresia && (
                            <div>
                                <span className="text-tactical-gold">Número de Membresía: </span>
                                {card.numeroMembresia}
                            </div>
                        )}
                        {card.nivel && (
                            <div>
                                <span className="text-tactical-gold">Nivel: </span>
                                {card.nivel}
                            </div>
                        )}
                    </div>
                </div>

                {/* Previsualización de carnets */}
                <div className="flex justify-center gap-6 flex-wrap">
                    {/* Cara Frontal */}
                    {card.frontCardUrl && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-tactical-brass mb-3 font-tactical text-center">[CARA FRONTAL]</h3>
                            <div
                                className="flex justify-center mb-3 border-2 border-tactical-brass p-2"
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
                                        width: '300px',
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
                            <h3 className="text-lg font-semibold text-tactical-brass mb-3 font-tactical text-center">[CARA TRASERA]</h3>
                            <div
                                className="flex justify-center mb-3 border-2 border-tactical-brass p-2"
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
                                        width: '300px',
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
            </div>
        </div>
    )
}

export default CredencialView

