import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Modal from './Modal'
import { getTeamById, updateTeamInfo } from '../services/teamService'
import { getAllUsers } from '../services/userService'

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

function TeamDetailView() {
  const { teamId } = useParams()
  const navigate = useNavigate()

  const [team, setTeam] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [selectedCaptainCedula, setSelectedCaptainCedula] = useState('')
  const [captainSearch, setCaptainSearch] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        const [teamData, usersData] = await Promise.all([
          getTeamById(teamId),
          getAllUsers()
        ])

        if (!isMounted) {
          return
        }

        if (!teamData) {
          setError('No se encontró la información del equipo solicitado.')
          return
        }

        setTeam(teamData)
        setUsers(usersData)
      } catch (err) {
        console.error('Error cargando equipo:', err)
        if (isMounted) {
          setError('No se pudo cargar la información del equipo. Intenta nuevamente.')
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
  }, [teamId])

  const miembrosConDatos = useMemo(() => {
    if (!team) return []

    const normalizedTeamName = (team.nombre || '').trim().toLowerCase()

    const usuariosDelEquipo = users.filter((user) => {
      const userTeam = (user.team || '').trim().toLowerCase()
      return normalizedTeamName && userTeam === normalizedTeamName
    })

    const mappedUsers = usuariosDelEquipo.map((user) => {
      const cedula = user.cedula || user.id || 'N/D'
      const esCapitan = cedula === team.capitanCedula

      return {
        cedula,
        nombre: user.nombre || 'Operador sin nombre',
        contacto: user.contacto || user.celular || 'N/D',
        foto: user.foto || null,
        rol: esCapitan ? 'Capitán' : 'Operador'
      }
    })

    if (mappedUsers.length > 0) {
      const capitanEntry = mappedUsers.find((miembro) => miembro.rol === 'Capitán')
      const otrosMiembros = mappedUsers.filter((miembro) => miembro.rol !== 'Capitán')

      return capitanEntry ? [capitanEntry, ...otrosMiembros] : mappedUsers
    }

    return [
      {
        cedula: team.capitanCedula || 'N/D',
        nombre: team.capitanNombre || 'Sin nombre',
        contacto: team.capitanContacto || 'N/D',
        foto: null,
        rol: 'Capitán'
      }
    ]
  }, [team, users])

  const miembrosFiltrados = useMemo(() => {
    if (!captainSearch.trim()) {
      return miembrosConDatos
    }

    const term = captainSearch.trim().toLowerCase()
    return miembrosConDatos.filter((miembro) => {
      const nombre = miembro.nombre?.toLowerCase() || ''
      const cedula = miembro.cedula?.toLowerCase() || ''
      return nombre.includes(term) || cedula.includes(term)
    })
  }, [captainSearch, miembrosConDatos])

  const handleOpenEditModal = () => {
    if (!team) return
    setFormError(null)
    setLogoPreview(team.logo || null)
    setSelectedCaptainCedula(team.capitanCedula || '')
    setCaptainSearch('')
    setEditModalOpen(true)
  }

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setLogoPreview(null)
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setLogoPreview(base64)
    } catch (err) {
      console.error('Error leyendo logo:', err)
      setFormError('No se pudo leer el logo seleccionado. Intenta con otro archivo.')
    }
  }

  const handleSaveEdit = async (event) => {
    event?.preventDefault()

    if (!team) return

    try {
      setSaving(true)
      setFormError(null)

      const nuevoCapitan = miembrosConDatos.find((miembro) => miembro.cedula === selectedCaptainCedula) || {
        cedula: team.capitanCedula,
        nombre: team.capitanNombre,
        contacto: team.capitanContacto
      }

      const payload = {}

      if (logoPreview !== team.logo) {
        payload.logoBase64 = logoPreview || null
      }

      if (nuevoCapitan.cedula !== team.capitanCedula) {
        payload.capitan = {
          cedula: nuevoCapitan.cedula,
          nombre: nuevoCapitan.nombre,
          contacto: nuevoCapitan.contacto
        }
      }

      if (Object.keys(payload).length === 0) {
        setEditModalOpen(false)
        return
      }

      const updatedTeam = await updateTeamInfo(team.id, payload)
      setTeam(updatedTeam)
      setEditModalOpen(false)
    } catch (err) {
      console.error('Error actualizando equipo:', err)
      setFormError(err.message || 'No se pudo actualizar el equipo. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-tactical-dark">
        <div className="text-tactical-gold font-tactical uppercase tracking-[0.4em]">
          Cargando equipo...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-tactical-dark gap-4 text-center px-6">
        <div className="text-red-500 font-tactical uppercase tracking-[0.4em]">
          {error}
        </div>
        <button
          onClick={() => navigate('/equipos')}
          className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
        >
          Volver al listado de equipos
        </button>
      </div>
    )
  }

  if (!team) {
    return null
  }

  return (
    <div className="p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between border border-tactical-border bg-black/40 backdrop-blur-sm p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] gap-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 border border-tactical-border overflow-hidden bg-black flex items-center justify-center">
            {team.logo ? (
              <img src={team.logo} alt={team.nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-tactical-brass/50 tracking-[0.45em]">Sin logo</span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
              {team.nombre}
            </h1>
            <p className="text-xs font-tactical text-tactical-brass/70 uppercase tracking-[0.45em] mt-2">
              {team.departamento || 'Departamento N/D'} — {team.ciudad || 'Ciudad N/D'}
            </p>
            <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em] mt-1">
              Capitán: <span className="text-tactical-gold">{team.capitanNombre || 'N/D'}</span> —{' '}
              Cédula: {team.capitanCedula || 'N/D'} — Celular: {team.capitanContacto || 'N/D'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenEditModal}
            className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
          >
            Editar equipo
          </button>
          <button
            onClick={() => navigate('/equipos')}
            className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
          >
            Volver al panel de equipos
          </button>
        </div>
      </header>

      <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
              Miembros del equipo
            </h2>
            <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
              Operadores registrados en la escuadra
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.35em] text-tactical-brass">
            <thead className="bg-black/60 text-tactical-brass/70">
              <tr>
                <th className="px-4 py-3 text-left">Foto</th>
                <th className="px-4 py-3 text-left">Operador</th>
                <th className="px-4 py-3 text-left">Cédula</th>
                <th className="px-4 py-3 text-left">Contacto</th>
                <th className="px-4 py-3 text-left">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tactical-border/40">
              {miembrosConDatos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[10px] text-tactical-brass/60 tracking-[0.45em]">
                    Este equipo aún no tiene operadores asignados.
                  </td>
                </tr>
              ) : (
                miembrosConDatos.map((miembro) => (
                  <tr
                    key={miembro.cedula}
                    className="hover:bg-black/50 transition-colors duration-150 cursor-pointer"
                    onDoubleClick={() => navigate(`/usuarios/${encodeURIComponent(miembro.cedula)}`)}
                    title="Doble clic para ver perfil del operador"
                  >
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 border border-tactical-border overflow-hidden bg-black flex items-center justify-center">
                        {miembro.foto ? (
                          <img src={miembro.foto} alt={miembro.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-tactical-brass/50 tracking-[0.45em]">Sin foto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-tactical-gold">{miembro.nombre}</td>
                    <td className="px-4 py-3 text-tactical-brass/70">{miembro.cedula}</td>
                    <td className="px-4 py-3 text-tactical-brass/70">{miembro.contacto}</td>
                    <td className="px-4 py-3 text-tactical-brass/70">{miembro.rol}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editModalOpen && (
        <Modal
          title="Editar información del equipo"
          onClose={() => {
            if (!saving) {
              setEditModalOpen(false)
            }
          }}
          footer={(
            <>
              <button
                onClick={() => !saving && setEditModalOpen(false)}
                className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                type="button"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          )}
        >
          <form className="space-y-4" onSubmit={handleSaveEdit}>
            {formError && (
              <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.4em]">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                Logotipo del equipo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
              />
              <div className="mt-3 w-32 h-32 border border-tactical-border overflow-hidden bg-black flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Previsualización logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] text-tactical-brass/50 tracking-[0.45em]">Sin logo</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-3">
                Selecciona nuevo capitán
              </label>
              <input
                type="text"
                value={captainSearch}
                onChange={(event) => setCaptainSearch(event.target.value)}
                placeholder="Buscar por nombre o cédula"
                className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold mb-3"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {miembrosFiltrados.length === 0 ? (
                  <div className="col-span-2 text-[9px] text-center text-tactical-brass/60 tracking-[0.4em]">
                    No se encontraron operadores con ese criterio.
                  </div>
                ) : (
                  miembrosFiltrados.map((miembro) => {
                    const isSelected = miembro.cedula === selectedCaptainCedula

                    return (
                      <button
                        key={miembro.cedula}
                        type="button"
                        onClick={() => setSelectedCaptainCedula(miembro.cedula)}
                        className={`flex items-center gap-3 bg-black/60 border px-3 py-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-tactical-gold shadow-[0_0_18px_rgba(234,179,8,0.35)]'
                            : 'border-tactical-border hover:border-tactical-gold/60'
                        }`}
                      >
                        <div className="w-12 h-12 border border-tactical-border overflow-hidden bg-black flex items-center justify-center">
                          {miembro.foto ? (
                            <img src={miembro.foto} alt={miembro.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] text-tactical-brass/50 tracking-[0.45em]">Sin foto</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-tactical-gold font-tactical uppercase tracking-[0.35em]">
                            {miembro.nombre}
                          </p>
                          <p className="text-[9px] text-tactical-brass/70 font-tactical uppercase tracking-[0.4em]">
                            Cédula: {miembro.cedula}
                          </p>
                          <p className="text-[9px] text-tactical-brass/50 font-tactical uppercase tracking-[0.4em]">
                            {miembro.rol}
                          </p>
                        </div>
                        <div
                          className={`w-3 h-3 border border-tactical-border ${
                            isSelected ? 'bg-tactical-gold shadow-[0_0_10px_rgba(234,179,8,0.6)]' : 'bg-transparent'
                          }`}
                        />
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default TeamDetailView

