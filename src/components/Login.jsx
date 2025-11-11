import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import logoImage from '../assets/logo.png'

function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { theme, toggleTheme } = useTheme()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            let emailToUse = email.trim()
            if (!emailToUse.includes('@')) {
                emailToUse = `${emailToUse}@campo-tiro-valle.com`
            }

            await signInWithEmailAndPassword(auth, emailToUse, password)
            navigate('/usuarios')
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
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-app">
            <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--login-grid-color) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            <div className="absolute inset-0" style={{ background: 'var(--login-overlay)' }} />


            <div className="relative w-full max-w-5xl mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-surface border border-theme shadow-[0_0_55px_rgba(0,0,0,0.35)] backdrop-blur-xl overflow-hidden">
                    <section className="relative hidden lg:flex flex-col justify-between p-10 border-r border-theme text-theme-secondary" style={{ background: 'var(--panel-gradient)' }}>
                        <div className="space-y-6 text-center">
                            <div className="flex justify-center">
                                <img
                                    src={logoImage}
                                    alt="Club de Tiro del Valle"
                                    className="h-20 w-auto"
                                />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[11px] uppercase tracking-[0.45em] text-tactical-brass/60">Control táctico</p>
                                <h1 className="mt-4 text-4xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                                    Club de Tiro del Valle
                                </h1>
                                <p className="mt-3 text-[12px] uppercase tracking-[0.45em] text-tactical-brass/60">
                                    Sistema de identificación y credenciales
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.4em]">
                                <span className="text-tactical-brass/50">Nivel de seguridad</span>
                                <span className="text-tactical-gold">Alpha</span>
                            </div>
                            <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.4em]">
                                <span className="text-tactical-brass/50">Estado del sistema</span>
                                <span className="flex items-center gap-2 text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Operativo
                                </span>
                            </div>
                            <div className="pt-4 border-t border-tactical-border/40">
                                <p className="text-[11px] uppercase tracking-[0.45em] text-tactical-brass/60">
                                    Credenciales requeridas para acceso autorizado.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="relative p-8 md:p-12 bg-surface text-theme-primary">
                        <div className="absolute top-0 right-0 h-full w-[1px] bg-gradient-to-b from-transparent via-tactical-gold/30 to-transparent" />
                        <div className="mb-10">
                            <h2 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
                                Inicio de sesión
                            </h2>
                            <p className="mt-2 text-[12px] uppercase tracking-[0.45em] text-tactical-brass/60">
                                Autenticación autorizada
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-[11px] uppercase tracking-[0.45em] text-tactical-brass/50 mb-3">
                                    Identificación operativa
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-surface border border-theme focus:border-tactical-gold/80 text-theme-secondary font-tactical uppercase tracking-[0.35em] px-4 py-3 transition-colors duration-200"
                                        placeholder="usuario"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase tracking-[0.45em] text-tactical-brass/50 mb-3">
                                    Clave de acceso
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-surface border border-theme focus:border-tactical-gold/80 text-theme-secondary font-tactical uppercase tracking-[0.35em] px-4 py-3 transition-colors duration-200"
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <div className="border border-red-600/80 bg-red-900/20 text-red-400 px-4 py-3 text-[11px] uppercase tracking-[0.4em]">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full text-tactical-gold font-tactical text-sm uppercase tracking-[0.45em] border border-theme hover:border-tactical-gold hover:bg-surface-hover transition-all duration-200 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(90deg, rgba(var(--color-text-secondary), 0.16) 0%, rgba(var(--color-border), 0.28) 50%, rgba(var(--color-text-secondary), 0.16) 100%)'
                                }}
                            >
                                {loading ? 'Autenticando...' : 'Ingresar al sistema'}
                            </button>
                        </form>

                        <div className="mt-10 pt-5 border-t border-tactical-border/40 text-center">
                            <button
                                onClick={() => navigate('/buscar-carnet')}
                                className="text-theme-secondary hover:text-tactical-gold font-tactical text-[11px] uppercase tracking-[0.45em] transition-colors"
                            >
                                Buscar credencial existente
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}

export default Login
