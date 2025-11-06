import { useState } from 'react'
import { searchCardByCedula } from '../services/cardService'
import { useNavigate } from 'react-router-dom'

function SearchCard() {
    const [cedula, setCedula] = useState('')
    const [card, setCard] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!cedula.trim()) {
            setError('Por favor, ingresa un número de cédula')
            return
        }

        setLoading(true)
        setError('')
        setCard(null)

        try {
            const foundCard = await searchCardByCedula(cedula.trim())
            if (foundCard) {
                // Convertir base64 a URLs si es necesario
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

    const [frontCardTransform, setFrontCardTransform] = useState({ rotateX: 0, rotateY: 0 })
    const [backCardTransform, setBackCardTransform] = useState({ rotateX: 0, rotateY: 0 })

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
                        [CLASIFICADO] CONSULTA DE CARNETS
                    </h1>
                    <p className="text-tactical-brass text-xs font-tactical uppercase tracking-wider opacity-80"
                        style={{ letterSpacing: '0.08em', textShadow: 'none' }}>
                        CLUB DE TIRO DEPORTIVO DEL VALLE - OPERACIONES ESPECIALES
                    </p>
                </div>

                {/* Barra de búsqueda */}
                <div className="hud-border p-1 mb-4">
                    <div className="bg-black p-4" style={{
                        background: 'linear-gradient(135deg, rgba(20, 15, 0, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%)',
                        boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                    }}>
                        <h2 className="text-lg font-semibold text-tactical-gold mb-3 font-tactical border-b border-tactical-border pb-1 uppercase tracking-wider"
                            style={{
                                textShadow: 'none',
                                letterSpacing: '0.08em',
                                fontWeight: '500'
                            }}>
                            &gt; MÓDULO DE BÚSQUEDA
                        </h2>

                        <form onSubmit={handleSearch} className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                                    style={{ textShadow: 'none' }}>
                                    &gt; NÚMERO DE CÉDULA
                                </label>
                                <input
                                    type="text"
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                                    placeholder="EJ: 1234567890"
                                    style={{
                                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                                        background: '#0a0a0a'
                                    }}
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-1.5 px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        boxShadow: 'none',
                                        textShadow: 'none',
                                        letterSpacing: '0.08em'
                                    }}
                                >
                                    {loading ? '[BUSCANDO...]' : '[BUSCAR]'}
                                </button>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-3 p-3 bg-black border border-red-500 text-red-400 font-tactical text-xs"
                                style={{
                                    boxShadow: '0 0 10px rgba(255, 0, 0, 0.3), inset 0 0 10px rgba(0, 0, 0, 0.8)',
                                    textShadow: 'none'
                                }}>
                                &gt; ERROR: {error}
                            </div>
                        )}

                        <div className="mt-3 text-center">
                            <button
                                onClick={() => navigate('/crear-carnet')}
                                className="text-tactical-brass hover:text-tactical-gold font-tactical text-xs transition-colors uppercase tracking-wider opacity-70"
                                style={{ textShadow: 'none' }}
                            >
                                &gt; Volver al inicio
                            </button>
                        </div>
                    </div>
                </div>

                {/* Resultado de búsqueda */}
                {card && (
                    <div className="hud-border p-1">
                        <div className="bg-black p-4" style={{
                            background: 'linear-gradient(135deg, rgba(20, 15, 0, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%)',
                            boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)',
                            paddingRight: '12px'
                        }}>
                            <h2 className="text-lg font-semibold text-tactical-gold mb-3 font-tactical border-b border-tactical-border pb-1 uppercase tracking-wider"
                                style={{
                                    textShadow: 'none',
                                    letterSpacing: '0.08em',
                                    fontWeight: '500'
                                }}>
                                &gt; RESULTADO DE BÚSQUEDA
                            </h2>

                            <div className="mb-3 p-3 bg-tactical-gray border border-tactical-border">
                                <h3 className="text-sm font-medium text-tactical-gold mb-2 font-tactical uppercase tracking-wider"
                                    style={{ textShadow: 'none' }}>
                                    &gt; INFORMACIÓN DEL MIEMBRO
                                </h3>
                                <div className="grid grid-cols-2 gap-2 text-tactical-brass font-tactical text-xs">
                                    <div>
                                        <span className="text-tactical-gold opacity-80">Nombre: </span>
                                        {card.nombre}
                                    </div>
                                    <div>
                                        <span className="text-tactical-gold opacity-80">Cédula: </span>
                                        {card.cedula}
                                    </div>
                                    <div>
                                        <span className="text-tactical-gold opacity-80">RH: </span>
                                        {card.rh}
                                    </div>
                                    <div>
                                        <span className="text-tactical-gold opacity-80">Contacto: </span>
                                        {card.contacto}
                                    </div>
                                    <div>
                                        <span className="text-tactical-gold opacity-80">Número de Membresía: </span>
                                        {card.numeroMembresia}
                                    </div>
                                    <div>
                                        <span className="text-tactical-gold opacity-80">Vigencia: </span>
                                        {card.vigencia}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Cara Frontal */}
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
                                            src={card.frontCardBase64 || card.frontCardUrl}
                                            alt="Carnet Frontal"
                                            className="rounded"
                                            style={{
                                                width: '100%',
                                                maxWidth: '200px',
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

                                {/* Cara Trasera */}
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
                                            src={card.backCardBase64 || card.backCardUrl}
                                            alt="Carnet Trasero"
                                            className="rounded"
                                            style={{
                                                width: '100%',
                                                maxWidth: '200px',
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
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SearchCard

