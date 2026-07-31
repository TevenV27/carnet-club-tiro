import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getMenus } from '../services/menuService'
import { useAuthProfile } from '../context/AuthProfileContext'

const linkClass = ({ isActive }) =>
    [
        'flex items-center gap-2 rounded px-3 py-1.5 font-tactical text-[10px] uppercase transition-colors duration-150 border border-transparent text-theme-secondary',
        isActive
            ? 'border-tactical-gold text-tactical-gold bg-surface-active'
            : 'hover:text-tactical-gold hover:bg-surface-hover hover:border-tactical-gold'
    ].join(' ')

const topLinkClass = ({ isActive }) =>
    [
        'group flex items-center gap-2 rounded px-3 py-2 font-tactical text-xs uppercase transition-colors duration-150 border border-transparent text-theme-secondary',
        isActive
            ? 'border-tactical-gold text-tactical-gold bg-surface-active'
            : 'hover:text-tactical-gold hover:bg-surface-hover hover:border-tactical-gold'
    ].join(' ')

const mobileLinkClass = ({ isActive }) =>
    [
        'block rounded px-4 py-2 font-tactical text-[10px] sm:text-[11px] uppercase tracking-[0.04em] transition-colors duration-150 border border-transparent text-theme-secondary',
        isActive
            ? 'border-tactical-gold text-tactical-gold bg-surface-active'
            : 'hover:text-tactical-gold hover:bg-surface-hover hover:border-tactical-gold'
    ].join(' ')

/** Estructura fija del menú admin: común / airsoft / traumático / sistema */
const ADMIN_SECTIONS = [
    {
        id: 'general',
        title: 'General',
        items: [{ id: 'usuarios', label: 'Usuarios', path: '/usuarios' }]
    },
    {
        id: 'airsoft',
        title: 'Airsoft',
        items: [
            { id: 'equipos', label: 'Equipos', path: '/equipos' },
            { id: 'torneos', label: 'Torneos', path: '/torneos' },
            { id: 'ranking', label: 'Ranking', path: '/ranking' },
            { id: 'generador', label: 'Generador', path: '/generador' },
            { id: 'carnets', label: 'Carnets', path: '/carnets' }
        ],
        catalogs: [
            { label: 'Niveles', path: '/gestion/niveles' },
            { label: 'Roles', path: '/gestion/roles' },
            { label: 'Especialidades', path: '/gestion/especialidades' },
            { label: 'Puntajes', path: '/gestion/puntajes' }
        ]
    },
    {
        id: 'traumatico',
        title: 'Traumático',
        items: [
            { id: 'traumatico-torneos', label: 'Torneos', path: '/traumatico/torneos' },
            { id: 'traumatico-ranking', label: 'Ranking', path: '/traumatico/ranking' },
            { id: 'traumatico-generador', label: 'Generador', path: '/traumatico/generador' },
            { id: 'traumatico-carnets', label: 'Carnets', path: '/traumatico/carnets' }
        ]
    },
    {
        id: 'sistema',
        title: 'Sistema',
        items: [
            { id: 'vigencias', label: 'Vigencias', path: '/gestion/vigencias' },
            { id: 'administracion', label: 'Administración', path: '/administracion' },
            { id: 'logs', label: 'Logs', path: '/logs' },
            { id: 'perfil', label: 'Mi perfil', path: '/perfil' }
        ]
    }
]

const OPERATOR_SECTIONS = [
    {
        id: 'operacion',
        title: 'Operación',
        items: [
            { id: 'equipos', label: 'Equipos', path: '/equipos' },
            { id: 'torneos', label: 'Torneos', path: '/torneos' },
            { id: 'ranking', label: 'Ranking', path: '/ranking' },
            { id: 'perfil', label: 'Mi perfil', path: '/perfil' }
        ]
    }
]

function sectionMatchesPath(section, pathname) {
    const paths = [
        ...section.items.map((i) => i.path),
        ...(section.catalogs || []).map((c) => c.path)
    ]
    return paths.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
}

function CollapsibleSection({
    section,
    open,
    onToggle,
    location,
    onNavigate,
    mobile = false,
    onAfterNavigate
}) {
    const active = sectionMatchesPath(section, location.pathname)

    if (mobile) {
        return (
            <li>
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex w-full items-center justify-between rounded px-4 py-2.5 font-tactical text-xs sm:text-sm uppercase tracking-[0.06em] text-theme-secondary border border-dashed border-theme/40"
                    aria-expanded={open}
                >
                    <span className={`font-semibold ${active ? 'text-tactical-gold' : ''}`}>{section.title}</span>
                    <span className="text-theme-muted text-xs">{open ? '▾' : '▸'}</span>
                </button>
                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        open ? 'max-h-[600px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                    }`}
                >
                    <div className="ml-3 space-y-1 pb-1">
                        {section.items.map((item) => (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                className={mobileLinkClass}
                                onClick={() => {
                                    onNavigate(item.path)
                                    onAfterNavigate?.()
                                }}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                        {section.catalogs ? (
                            <CatalogSubmenu
                                catalogs={section.catalogs}
                                location={location}
                                mobile
                                onNavigate={(path) => {
                                    onNavigate(path)
                                    onAfterNavigate?.()
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            </li>
        )
    }

    return (
        <li className="mb-1">
            <button
                type="button"
                onClick={onToggle}
                className={[
                    'flex w-full items-center justify-between gap-2 px-3 py-2.5 rounded font-tactical text-xs uppercase tracking-[0.1em] transition-colors duration-150',
                    active
                        ? 'text-tactical-gold'
                        : 'text-theme-secondary hover:text-tactical-gold'
                ].join(' ')}
                aria-expanded={open}
            >
                <span className="font-semibold">{section.title}</span>
                <span className="text-[11px] opacity-80">{open ? '▾' : '▸'}</span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <ul className="space-y-1 pb-2">
                    {section.items.map((item) => (
                        <li key={item.id}>
                            <NavLink
                                to={item.path}
                                className={topLinkClass}
                                onClick={() => onNavigate(item.path)}
                            >
                                <span className="h-6 w-[2px] rounded-full bg-tactical-gold/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                <span className="flex-1 font-semibold tracking-[0.03em] text-[11px] whitespace-normal break-words">
                                    {item.label}
                                </span>
                            </NavLink>
                        </li>
                    ))}
                    {section.catalogs ? (
                        <li>
                            <CatalogSubmenu
                                catalogs={section.catalogs}
                                location={location}
                                onNavigate={onNavigate}
                            />
                        </li>
                    ) : null}
                </ul>
            </div>
        </li>
    )
}

function CatalogSubmenu({ catalogs, location, onNavigate, mobile = false }) {
    const isOpen = location.pathname.startsWith('/gestion') &&
        !location.pathname.startsWith('/gestion/vigencias')

    if (mobile) {
        return (
            <div className="ml-2 mt-1 space-y-1 border-l border-theme/30 pl-2">
                <span className="block px-2 py-1 text-[9px] uppercase tracking-[0.1em] text-theme-muted">
                    Catálogos
                </span>
                {catalogs.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={mobileLinkClass}
                        onClick={() => onNavigate?.(item.path)}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </div>
        )
    }

    return (
        <div className="relative group ml-1">
            <button
                type="button"
                onClick={() => onNavigate?.(catalogs[0]?.path)}
                className={[
                    'group flex items-center gap-2 w-full text-left rounded px-3 py-2 font-tactical text-xs uppercase transition-colors duration-150 border border-transparent text-theme-secondary',
                    isOpen
                        ? 'border-tactical-gold text-tactical-gold bg-surface-active'
                        : 'hover:text-tactical-gold hover:bg-surface-hover hover:border-tactical-gold'
                ].join(' ')}
            >
                <span className="h-6 w-[2px] rounded-full bg-tactical-gold/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <span className="flex-1 font-semibold tracking-[0.03em] text-[11px]">Catálogos</span>
            </button>
            <div
                className={`mt-1 ml-5 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen
                        ? 'max-h-[400px] opacity-100'
                        : 'max-h-0 opacity-0 group-hover:max-h-[400px] group-hover:opacity-100'
                }`}
            >
                {catalogs.map((item) => (
                    <NavLink key={item.path} to={item.path} className={linkClass}>
                        <span className="h-4 w-[2px] rounded-full bg-tactical-gold/65" />
                        <span className="flex-1 tracking-[0.03em]">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    )
}

function SidebarLayout({ onSignOut }) {
    const { isAdmin } = useAuthProfile()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()
    const location = useLocation()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [openSections, setOpenSections] = useState(() => {
        try {
            const raw = sessionStorage.getItem('sidebar-open-sections')
            if (raw) return JSON.parse(raw)
        } catch {
            /* ignore */
        }
        return null
    })

    useEffect(() => {
        let isMounted = true
        const fetchMenus = async () => {
            try {
                setLoading(true)
                await getMenus()
            } catch (err) {
                console.error('Error cargando menús:', err)
                if (isMounted) {
                    setError('No se pudieron cargar los menús. Usando configuración por defecto.')
                }
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchMenus()
        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        setMobileMenuOpen(false)
    }, [location.pathname])

    const sections = useMemo(
        () => (isAdmin ? ADMIN_SECTIONS : OPERATOR_SECTIONS),
        [isAdmin]
    )

    // Estado inicial / sincronizar: abrir el grupo de la ruta actual
    useEffect(() => {
        setOpenSections((prev) => {
            const next = { ...(prev || {}) }
            let changed = false
            sections.forEach((section) => {
                if (prev == null) {
                    next[section.id] = sectionMatchesPath(section, location.pathname)
                    changed = true
                } else if (sectionMatchesPath(section, location.pathname) && !next[section.id]) {
                    next[section.id] = true
                    changed = true
                }
            })
            return changed || prev == null ? next : prev
        })
    }, [sections, location.pathname])

    useEffect(() => {
        if (!openSections) return
        try {
            sessionStorage.setItem('sidebar-open-sections', JSON.stringify(openSections))
        } catch {
            /* ignore */
        }
    }, [openSections])

    const toggleSection = (id) => {
        setOpenSections((prev) => ({
            ...(prev || {}),
            [id]: !prev?.[id]
        }))
    }

    const handleMenuClick = (path) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`
        navigate(normalizedPath)
    }

    const isOpen = (id) => Boolean(openSections?.[id])

    const renderDesktopNav = () => (
        <ul className="space-y-0.5">
            {sections.map((section) => (
                <CollapsibleSection
                    key={section.id}
                    section={section}
                    open={isOpen(section.id)}
                    onToggle={() => toggleSection(section.id)}
                    location={location}
                    onNavigate={handleMenuClick}
                />
            ))}
        </ul>
    )

    const renderMobileNav = () => (
        <ul className="space-y-2">
            {sections.map((section) => (
                <CollapsibleSection
                    key={section.id}
                    section={section}
                    open={isOpen(section.id)}
                    onToggle={() => toggleSection(section.id)}
                    location={location}
                    onNavigate={handleMenuClick}
                    mobile
                    onAfterNavigate={() => setMobileMenuOpen(false)}
                />
            ))}
        </ul>
    )

    return (
        <div className="h-screen flex flex-col md:flex-row bg-app text-theme-primary">
            <header className="md:hidden bg-sidebar border-b border-theme px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase text-theme-muted">Centro de mando</p>
                        <h1 className="text-xl font-tactical text-tactical-gold uppercase">Panel Club Tiro</h1>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        type="button"
                        className="border border-theme px-3 py-2 text-theme-secondary"
                        aria-label={mobileMenuOpen ? 'Ocultar menú' : 'Mostrar menú'}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            )}
                        </svg>
                    </button>
                </div>
            </header>

            {mobileMenuOpen && (
                <div className="md:hidden bg-sidebar border-b border-theme">
                    <nav className="px-4 py-4">{renderMobileNav()}</nav>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                <aside
                    className="hidden md:flex w-64 h-full flex-col border-r border-theme bg-sidebar"
                    style={{ letterSpacing: '0.18em' }}
                >
                    <div className="px-6 pt-7 pb-5 border-b border-theme">
                        <div className="space-y-2">
                            <p className="text-[10px] uppercase text-theme-muted">Centro de mando</p>
                            <h1 className="text-xl font-tactical text-tactical-gold uppercase">Panel Club Tiro</h1>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[9px] uppercase text-theme-muted">
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            </span>
                            Estatus operativo
                        </div>
                    </div>

                    <nav className="flex-1 overflow-y-auto">
                        <div className="px-3 py-3">{renderDesktopNav()}</div>
                    </nav>

                    <div className="px-6 py-5 border-t border-theme text-[10px] uppercase text-theme-muted">
                        <div className="mb-4">
                            Última sincronización
                            <span className="block text-tactical-gold mt-1">Hace 5 minutos</span>
                        </div>
                        <button
                            onClick={onSignOut}
                            className="w-full bg-transparent hover:bg-surface-hover text-theme-secondary hover:text-tactical-gold font-semibold py-2.5 px-4 border border-theme hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.04em] transition-colors duration-200"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                    {error && (
                        <div className="bg-red-900 text-white p-3 text-sm">{error}</div>
                    )}

                    <div className="flex-1 min-h-0 min-w-0 overflow-auto bg-surface">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-tactical-gold font-tactical uppercase tracking-[0.08em]">
                                    Cargando menús...
                                </div>
                            </div>
                        ) : (
                            <Outlet context={{ onSignOut }} />
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default SidebarLayout
