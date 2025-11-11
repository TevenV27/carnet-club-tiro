import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getMenus } from '../services/menuService'
import { useTheme } from '../context/ThemeContext'

function SidebarLayout({ onSignOut }) {
    const [menus, setMenus] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()

    useEffect(() => {
        let isMounted = true

        const fetchMenus = async () => {
            try {
                setLoading(true)
                const menuItems = await getMenus()
                if (isMounted) {
                    setMenus(menuItems)
                }
            } catch (err) {
                console.error('Error cargando menús:', err)
                if (isMounted) {
                    setError('No se pudieron cargar los menús. Usando configuración por defecto.')
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchMenus()

        return () => {
            isMounted = false
        }
    }, [])

    const handleMenuClick = (path) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`
        navigate(normalizedPath)
    }

    return (
        <div className="h-screen flex overflow-hidden bg-app text-theme-primary">
            <aside className="w-64 h-full flex flex-col border-r border-theme bg-sidebar" style={{ letterSpacing: '0.18em' }}>
                <div className="px-6 pt-7 pb-5 border-b border-theme">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <p className="text-[10px] uppercase text-theme-muted">Centro de mando</p>
                            <h1 className="text-xl font-tactical text-tactical-gold uppercase">Panel Club Tiro</h1>
                        </div>
                        <div />
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[9px] uppercase text-theme-muted">
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </span>
                        Estatus operativo
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto">
                    <div className="px-4 py-4">
                        <p className="text-[10px] uppercase text-theme-muted mb-2">Navegación</p>
                        <ul className="space-y-1.5">
                            {menus.map((menu) => (
                                <li key={menu.id}>
                                    <NavLink
                                        to={menu.path.startsWith('/') ? menu.path : `/${menu.path}`}
                                        className={({ isActive }) =>
                                            [
                                                'group flex items-center gap-2 rounded px-3 py-2 font-tactical text-xs uppercase transition-colors duration-150 border border-transparent text-theme-secondary',
                                                isActive
                                                    ? 'border-tactical-gold text-tactical-gold bg-surface-active'
                                                    : 'hover:text-tactical-gold hover:bg-surface-hover hover:border-tactical-gold/40'
                                            ].join(' ')
                                        }
                                        onClick={() => handleMenuClick(menu.path)}
                                    >
                                        <span className="h-6 w-[2px] rounded-full bg-tactical-gold/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                        <span className="flex-1 font-semibold tracking-[0.2em] text-[11px]">{menu.label}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                <div className="px-6 py-5 border-t border-theme text-[10px] uppercase text-theme-muted">
                    <div className="mb-4">
                        Última sincronización
                        <span className="block text-tactical-gold mt-1">Hace 5 minutos</span>
                    </div>
                    <button
                        onClick={onSignOut}
                        className="w-full bg-transparent hover:bg-surface-hover text-theme-secondary hover:text-tactical-gold font-semibold py-2.5 px-4 border border-theme hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.25em] transition-colors duration-200"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {error && (
                    <div className="bg-red-900 text-white p-3 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto bg-surface">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-tactical-gold font-tactical uppercase tracking-[0.4em]">
                                Cargando menús...
                            </div>
                        </div>
                    ) : (
                        <Outlet context={{ onSignOut }} />
                    )}
                </div>
            </main>
        </div>
    )
}

export default SidebarLayout

