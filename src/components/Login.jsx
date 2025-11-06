import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useNavigate } from 'react-router-dom'

function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Si el usuario no ingresó un @, agregar automáticamente el dominio
            let emailToUse = email.trim()
            if (!emailToUse.includes('@')) {
                emailToUse = emailToUse + '@campo-tiro-valle.com'
            }

            await signInWithEmailAndPassword(auth, emailToUse, password)
            console.log('Usuario autenticado exitosamente')
            navigate('/crear-carnet')
        } catch (error) {
            console.error('Error en autenticación:', error)
            if (error.code === 'auth/user-not-found') {
                setError('Usuario no encontrado. Verifica que el usuario haya sido creado en Firebase.')
            } else if (error.code === 'auth/wrong-password') {
                setError('Contraseña incorrecta')
            } else if (error.code === 'auth/invalid-email') {
                setError('Email inválido')
            } else if (error.code === 'auth/operation-not-allowed') {
                setError('Email/Password no está habilitado. Ve a Firebase Console > Authentication > Sign-in method y habilítalo.')
            } else {
                setError(`Error al iniciar sesión: ${error.message}`)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-tactical-dark flex items-center justify-center p-8 relative">

            <div className="max-w-md w-full relative z-10">
                {/* HUD Border superior */}
                <div className="hud-border mb-0 p-1">
                    <div className="bg-tactical-gray p-8" style={{
                        background: 'linear-gradient(135deg, rgba(20, 15, 0, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%)',
                        boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
                    }}>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-semibold text-tactical-gold mb-2 font-tactical tracking-wider"
                                style={{
                                    textShadow: 'none',
                                    letterSpacing: '0.15em',
                                    fontWeight: '600'
                                }}>
                                [CLASIFICADO]
                            </h1>
                            <h2 className="text-2xl font-medium text-tactical-brass mb-2 font-tactical tracking-wider"
                                style={{
                                    textShadow: 'none',
                                    letterSpacing: '0.1em'
                                }}>
                                SISTEMA DE IDENTIFICACIÓN
                            </h2>
                            <p className="text-tactical-brass text-xs font-tactical mt-4" style={{ letterSpacing: '0.15em' }}>
                                CLUB DE TIRO DEPORTIVO DEL VALLE
                            </p>
                            <p className="text-tactical-brass text-xs font-tactical mt-1" style={{ letterSpacing: '0.1em' }}>
                                OPERACIONES ESPECIALES
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-tactical-brass mb-2 font-tactical text-xs uppercase tracking-wider opacity-80"
                                    style={{ textShadow: 'none' }}>
                                    &gt; USUARIO
                                </label>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical"
                                    placeholder="clubtirovalle2025"
                                    required
                                    style={{
                                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                                        background: '#0a0a0a'
                                    }}
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-tactical-brass mb-2 font-tactical text-xs uppercase tracking-wider opacity-80"
                                    style={{ textShadow: 'none' }}>
                                    &gt; CONTRASEÑA
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-black text-tactical-gold rounded-none border-2 border-tactical-brass focus:border-tactical-gold focus:outline-none font-tactical"
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 5px rgba(212, 175, 55, 0.2)',
                                        background: '#000000'
                                    }}
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-black border-2 border-red-500 text-red-400 font-tactical text-xs"
                                    style={{
                                        boxShadow: '0 0 10px rgba(255, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.8)',
                                        textShadow: '0 0 5px rgba(255, 0, 0, 0.8)'
                                    }}>
                                    &gt; ERROR: {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-4 px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    boxShadow: 'none',
                                    textShadow: 'none',
                                    letterSpacing: '0.1em'
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.target.style.backgroundColor = 'rgba(26, 26, 26, 0.5)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.target.style.backgroundColor = 'transparent'
                                    }
                                }}
                            >
                                {loading ? '[AUTENTICANDO...]' : '[INICIAR SESIÓN]'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => navigate('/buscar-carnet')}
                                className="text-tactical-brass hover:text-tactical-gold font-tactical text-xs transition-colors uppercase tracking-wider opacity-70"
                                style={{ textShadow: 'none' }}
                            >
                                &gt; Buscar credencial existente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
