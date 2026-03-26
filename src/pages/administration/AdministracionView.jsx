import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../../components/ui/Modal'
import { getAllUsers, setUserRol } from '../../services/userService'

const getCedula = (u) => u.cedula || u.id

function AdministracionView() {
  const [admins, setAdmins] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const all = await getAllUsers()
      setAllUsers(all)
      const adminsData = all.filter((u) => u.rol === 'admin')
      setAdmins(adminsData.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')))
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar la administración.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const adminCedulas = useMemo(() => new Set(admins.map((a) => getCedula(a))), [admins])

  const candidatos = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allUsers.filter((u) => {
      if (u.rol === 'admin') return false
      if (adminCedulas.has(getCedula(u))) return false
      const puedePromover = u.rol === 'operador' || u.rol === undefined || u.rol === null || u.rol === ''
      if (!puedePromover) return false
      if (!term) return true
      const nombre = (u.nombre || '').toLowerCase()
      const ced = (getCedula(u) || '').toLowerCase()
      return nombre.includes(term) || ced.includes(term)
    })
  }, [allUsers, adminCedulas, search])

  const handlePromote = async (cedula) => {
    if (!cedula) return
    try {
      setSaving(cedula)
      await setUserRol(cedula, 'admin')
      await load()
      setModalOpen(false)
      setSearch('')
    } catch (err) {
      console.error(err)
      alert('No se pudo asignar el rol de administrador.')
    } finally {
      setSaving(null)
    }
  }

  const handleDemote = async (cedula) => {
    if (!cedula) return
    if (admins.length <= 1) {
      alert('Debe existir al menos un administrador en el sistema.')
      return
    }
    if (!window.confirm('¿Quitar rol de administrador a este usuario? Pasará a operador.')) return
    try {
      setSaving(cedula)
      await setUserRol(cedula, 'operador')
      await load()
    } catch (err) {
      console.error(err)
      alert('No se pudo actualizar el rol.')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-tactical-dark">
        <div className="text-tactical-gold font-tactical uppercase tracking-[0.08em]">Cargando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-red-400 font-tactical uppercase tracking-[0.08em]">
        {error}
      </div>
    )
  }

  return (
    <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full text-tactical-brass space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-tactical-border bg-black/40 p-6">
        <div>
          <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.08em]">
            Administración
          </h1>
          <p className="text-[10px] font-tactical text-tactical-brass/90 uppercase tracking-[0.1em] mt-2">
            Administradores del sistema (acceso completo al panel)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-normal transition-all duration-200"
        >
          Nuevo administrador
        </button>
      </header>

      <div className="border border-tactical-border bg-black/40 overflow-x-auto">
        <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.06em]">
          <thead className="bg-black/60 text-tactical-brass">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Cédula</th>
              <th className="px-4 py-3 text-left">Correo</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left" />
            </tr>
          </thead>
          <tbody className="divide-y divide-tactical-border/40">
            {admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-tactical-brass text-[10px] uppercase tracking-[0.08em]">
                  Ningún usuario tiene rol &quot;admin&quot; explícito. Usuarios sin rol conservan acceso completo
                  (legacy). Promueve operadores desde &quot;Nuevo administrador&quot;.
                </td>
              </tr>
            ) : (
              admins.map((row) => {
                const ced = getCedula(row)
                return (
                  <tr key={ced}>
                    <td className="px-4 py-3 text-tactical-gold">{row.nombre || '—'}</td>
                    <td className="px-4 py-3 text-tactical-brass">{ced}</td>
                    <td className="px-4 py-3 text-tactical-brass lowercase">{row.email || '—'}</td>
                    <td className="px-4 py-3 text-tactical-gold">admin</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={saving === ced}
                        onClick={() => handleDemote(ced)}
                        className="text-[10px] uppercase tracking-normal text-red-400 border border-red-600/60 px-3 py-1 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        Quitar admin
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title="Seleccionar operador" onClose={() => !saving && setModalOpen(false)}>
          <div className="space-y-4 max-h-[70vh] flex flex-col">
            <p className="text-[10px] text-tactical-brass/90 uppercase tracking-[0.1em]">
              Busca por nombre o cédula y asigna como administrador
            </p>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre o cédula..."
              className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-theme-primary font-tactical tracking-[0.05em] focus:outline-none focus:border-tactical-gold"
            />
            <div className="overflow-y-auto flex-1 space-y-2 border border-tactical-border/40 rounded p-2 min-h-[200px]">
              {candidatos.length === 0 ? (
                <p className="text-[10px] text-tactical-brass text-center py-8 uppercase tracking-[0.1em]">
                  No hay operadores disponibles o ya son administradores
                </p>
              ) : (
                candidatos.map((u) => {
                  const ced = getCedula(u)
                  return (
                    <div
                      key={ced}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-tactical-border/30 rounded px-3 py-2"
                    >
                      <div>
                        <p className="text-tactical-gold text-sm">{u.nombre || 'Sin nombre'}</p>
                        <p className="text-[10px] text-tactical-brass">{ced}</p>
                        {u.email ? (
                          <p className="text-[10px] text-tactical-brass/80 lowercase">{u.email}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={saving === ced}
                        onClick={() => handlePromote(ced)}
                        className="shrink-0 bg-transparent hover:bg-tactical-gray text-tactical-gold text-[10px] font-semibold py-2 px-3 border border-tactical-border hover:border-tactical-gold uppercase tracking-normal disabled:opacity-50"
                      >
                        {saving === ced ? 'Guardando...' : 'Seleccionar'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AdministracionView
