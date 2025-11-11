import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import { getTeams, createTeam } from '../services/teamService'
import { getAllUsers } from '../services/userService'

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

function TeamsView() {
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  const [formData, setFormData] = useState({
    nombre: '',
    departamento: '',
    ciudad: ''
  })
  const [selectedCaptainCedula, setSelectedCaptainCedula] = useState('')
  const [captainSearch, setCaptainSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        const [teamsData, usersData] = await Promise.all([
          getTeams(),
          getAllUsers()
        ])

        if (!isMounted) return

        setTeams(teamsData)
        setUsers(usersData)

        if (teamsData.length === 0) {
          setSelectedCaptainCedula('')
        }
      } catch (err) {
        console.error('Error cargando equipos:', err)
        if (isMounted) {
          setError('No se pudo cargar la información de equipos. Intenta nuevamente.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  const capitanOptions = useMemo(
    () =>
      users.map((user) => ({
        cedula: user.cedula || user.id,
        nombre: user.nombre || 'Operador',
        contacto: user.contacto || user.celular || '',
        foto: user.foto || null
      })),
    [users]
  )

  const filteredCapitanOptions = useMemo(() => {
    if (!captainSearch.trim()) {
      return capitanOptions
    }

    const term = captainSearch.trim().toLowerCase()
    return capitanOptions.filter((option) => {
      const nombre = option.nombre?.toLowerCase() || ''
      const cedula = option.cedula?.toLowerCase() || ''
      return nombre.includes(term) || cedula.includes(term)
    })
  }, [capitanOptions, captainSearch])

  const selectedCapitan = useMemo(
    () => capitanOptions.find((option) => option.cedula === selectedCaptainCedula) || null,
    [capitanOptions, selectedCaptainCedula]
  )

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
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
      setFormError('No se pudo leer el logo. Intenta con otro archivo.')
    }
  }

  const handleCreateTeam = async (event) => {
    event?.preventDefault()
    setFormError(null)

    try {
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del equipo es obligatorio.')
      }
      if (!selectedCaptainCedula) {
        throw new Error('Selecciona el capitán del equipo.')
      }

      setSaving(true)

      const capitanInfo = capitanOptions.find((option) => option.cedula === selectedCaptainCedula)

      const teamData = await createTeam({
        nombre: formData.nombre,
        departamento: formData.departamento,
        ciudad: formData.ciudad,
        logoBase64: logoPreview,
        capitan: capitanInfo
      })

      setTeams((prev) => [...prev, teamData])
      setFormData({
        nombre: '',
        departamento: '',
        ciudad: ''
      })
      setSelectedCaptainCedula('')
      setCaptainSearch('')
      setLogoPreview(null)
      setCreateModalOpen(false)
    } catch (err) {
      console.error('Error creando equipo:', err)
      setFormError(err.message || 'No se pudo crear el equipo. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-tactical-dark">
        <div className="text-tactical-gold font-tactical uppercase tracking-[0.4em]">
          Cargando equipos...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-tactical-dark text-center px-6">
        <div className="text-red-500 font-tactical uppercase tracking-[0.4em]">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
      <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
        <div>
          <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
            Equipos registrados
          </h1>
          <p className="text-xs font-tactical text-tactical-brass/70 uppercase tracking-[0.45em]">
            Administración de escuadras y capitanes
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => {
              setFormError(null)
              setFormData({
                nombre: '',
                departamento: '',
                ciudad: ''
              })
              setSelectedCaptainCedula('')
              setCaptainSearch('')
              setLogoPreview(null)
              setCreateModalOpen(true)
            }}
            className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 md:px-6 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
          >
            Registrar equipo
          </button>
        </div>
      </header>

      <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
        <header className="px-[10px] md:px-6 py-[10px] md:py-4 border-b border-tactical-border/60">
          <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em]">
            Tabla de equipos
          </h2>
          <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
            Consulta la información principal de cada escuadra registrada
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-tactical-border/60 font-tactical text-[11px] uppercase tracking-[0.35em] text-tactical-brass">
            <thead className="bg-black/60 text-tactical-brass/70">
              <tr>
                <th className="px-4 py-3 text-left">Logo</th>
                <th className="px-4 py-3 text-left">Equipo</th>
                <th className="px-4 py-3 text-left">Departamento</th>
                <th className="px-4 py-3 text-left">Ciudad</th>
                <th className="px-4 py-3 text-left">Capitán</th>
                <th className="px-4 py-3 text-left">Celular</th>
                <th className="px-4 py-3 text-left">Cédula</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tactical-border/40">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[10px] text-tactical-brass/60 tracking-[0.45em]">
                    Aún no se han registrado equipos.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr
                    key={team.id}
                    className="hover:bg-black/50 transition-colors duration-150 cursor-pointer"
                    onDoubleClick={() => navigate(`/equipos/${team.id}`)}
                    title="Doble clic para ver detalle de equipo"
                  >
                    <td className="px-4 py-3">
                      <div className="w-16 h-16 border border-tactical-border overflow-hidden bg-black flex items-center justify-center">
                        {team.logo ? (
                          <img src={team.logo} alt={team.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-tactical-brass/50 tracking-[0.45em]">Sin logo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-tactical-gold">{team.nombre}</td>
                    <td className="px-4 py-3 text-tactical-brass/70">{team.departamento || 'N/D'}</td>
                    <td className="px-4 py-3 text-tactical-brass/70">{team.ciudad || 'N/D'}</td>
                    <td className="px-4 py-3 text-tactical-gold">{team.capitanNombre || 'N/D'}</td>
                    <td className="px-4 py-3 text-tactical-brass/70">{team.capitanContacto || 'N/D'}</td>
                    <td className="px-4 py-3 text-tactical-brass/70">{team.capitanCedula || 'N/D'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {createModalOpen && (
        <Modal
          title="Registrar nuevo equipo"
          onClose={() => {
            if (!saving) {
              setCreateModalOpen(false)
            }
          }}
          footer={(
            <>
              <button
                onClick={() => !saving && setCreateModalOpen(false)}
                className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duración-200"
                type="button"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTeam}
                className="bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duración-200 disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Registrar equipo'}
              </button>
            </>
          )}
        >
          <form className="space-y-4" onSubmit={handleCreateTeam}>
            {formError && (
              <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 text-sm font-tactical uppercase tracking-[0.4em]">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                  Nombre del equipo
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                  placeholder="Ej: Escuadrón Centinela"
                />
              </div>

              <div>
                <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                  Departamento
                </label>
                <input
                  type="text"
                  name="departamento"
                  value={formData.departamento}
                  onChange={handleInputChange}
                  className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                  placeholder="Ej: Valle del Cauca"
                />
              </div>

              <div>
                <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleInputChange}
                  className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                  placeholder="Ej: Cali"
                />
              </div>

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
                {logoPreview && (
                  <div className="mt-2 w-32 h-32 border border-tactical-border overflow-hidden">
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-3">
                  Selecciona capitán del equipo
                </label>
                <input
                  type="text"
                  value={captainSearch}
                  onChange={(event) => setCaptainSearch(event.target.value)}
                  placeholder="Buscar por nombre o cédula"
                  className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold mb-3"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {filteredCapitanOptions.length === 0 ? (
                    <div className="col-span-2 text-[9px] text-center text-tactical-brass/60 tracking-[0.4em]">
                      No se encontraron operadores con ese criterio.
                    </div>
                  ) : (
                    filteredCapitanOptions.map((option) => {
                      const isSelected = option.cedula === selectedCaptainCedula

                      return (
                        <button
                          key={option.cedula}
                          type="button"
                          onClick={() => setSelectedCaptainCedula(option.cedula)}
                          className={`flex items-center gap-3 bg-black/60 border px-3 py-2 transition-all duration-200 text-left ${
                            isSelected
                              ? 'border-tactical-gold shadow-[0_0_18px_rgba(234,179,8,0.35)]'
                              : 'border-tactical-border hover:border-tactical-gold/60'
                          }`}
                        >
                          <div className="w-12 h-12 border border-tactical-border overflow-hidden bg-black flex items-center justify-center">
                            {option.foto ? (
                              <img src={option.foto} alt={option.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] text-tactical-brass/50 tracking-[0.45em]">Sin foto</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-tactical-gold font-tactical uppercase tracking-[0.35em]">
                              {option.nombre}
                            </p>
                            <p className="text-[9px] text-tactical-brass/70 font-tactical uppercase tracking-[0.4em]">
                              Cédula: {option.cedula}
                            </p>
                            <p className="text-[9px] text-tactical-brass/50 font-tactical uppercase tracking-[0.4em]">
                              {option.contacto || 'Sin contacto'}
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
            </div>

            {selectedCapitan && (
              <div className="bg-black/40 border border-tactical-border px-4 py-3 text-[10px] text-tactical-brass/60 font-tactical uppercase tracking-[0.4em]">
                Capitán seleccionado: <span className="text-tactical-gold">{selectedCapitan.nombre}</span> — Cédula:{' '}
                {selectedCapitan.cedula}
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}

export default TeamsView

