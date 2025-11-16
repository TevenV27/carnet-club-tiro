import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { generateFrontCard, generateBackCard } from '../utils/cardGenerator'
import { saveCard, getNextMembershipNumber } from '../services/cardService'
import { getVigencias } from '../services/vigenciasService'
import { getSpecialties } from '../services/specialtiesService'
import { getTeams } from '../services/teamService'
import { getLevels } from '../services/levelsService'
import '../App.css'
import CarnetPreview from './CarnetPreview'

function CreateCard({ onSignOut }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (!currentUser) {
        navigate('/login')
      }
    })
    return () => unsubscribe()
  }, [navigate])

  // Cargar vigencias, especialidades, equipos y niveles al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true)
        const [vigenciasData, especialidadesData, equiposData, nivelesData] = await Promise.all([
          getVigencias(),
          getSpecialties(),
          getTeams(),
          getLevels()
        ])
        setVigencias(vigenciasData)
        setEspecialidades(especialidadesData)
        setEquipos(equiposData)
        setNiveles(nivelesData)
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [])
  const [formData, setFormData] = useState({
    // Datos del frente
    nombre: '',
    nivel: '',
    numeroMembresia: '',
    emision: '',
    vigencia: '',
    nombreClub: 'CLUB DE TIRO DEPORTIVO DEL VALLE', // Siempre el mismo, no se muestra en input
    rh: '',
    contacto: '',
    contactoEmergencia: '',
    cedula: '',

    // Datos del reverso
    identificador: '',
    especialidad: '',
    equipoTactico: '',
    equipoLogo: null, // Logo del equipo seleccionado
    rolEnEquipo: '',
    pistola: '',
    fusil: '',
    foto: null,
  })

  const [vigencias, setVigencias] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [equipos, setEquipos] = useState([])
  const [niveles, setNiveles] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const [frontCardUrl, setFrontCardUrl] = useState(null)
  const [backCardUrl, setBackCardUrl] = useState(null)
  const [frontCardBlob, setFrontCardBlob] = useState(null)
  const [backCardBlob, setBackCardBlob] = useState(null)
  const [frontCardTransform, setFrontCardTransform] = useState({ rotateX: 0, rotateY: 0 })
  const [backCardTransform, setBackCardTransform] = useState({ rotateX: 0, rotateY: 0 })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Si se selecciona un equipo, cargar su logo
    if (name === 'equipoTactico') {
      const equipoSeleccionado = equipos.find(eq => eq.nombre === value)
      setFormData(prev => ({
        ...prev,
        [name]: value,
        equipoLogo: equipoSeleccionado?.logo || null
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        foto: file
      }))
    }
  }

  const [saving, setSaving] = useState(false)

  const handleGenerate = async () => {
    try {
      // Auto-calcular número de membresía si no existe
      if (!formData.numeroMembresia) {
        const nextMembership = await getNextMembershipNumber()
        setFormData(prev => ({ ...prev, numeroMembresia: nextMembership }))
      }

      // Auto-calcular fecha de emisión (MM/YYYY)
      if (!formData.emision) {
        const now = new Date()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const year = now.getFullYear()
        const emision = `${month}/${year}`
        setFormData(prev => ({ ...prev, emision }))
      }

      // Preparar datos con valores automáticos
      const dataToGenerate = {
        ...formData,
        nombreClub: 'CLUB DE TIRO DEPORTIVO DEL VALLE', // Siempre el mismo
        numeroMembresia: formData.numeroMembresia || await getNextMembershipNumber(),
        emision: formData.emision || (() => {
          const now = new Date()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const year = now.getFullYear()
          return `${month}/${year}`
        })(),
        // equipoLogo ya está en formData desde que se seleccionó el equipo
      }

      // Generar tarjeta frontal
      const frontBlob = await generateFrontCard(dataToGenerate)
      const frontUrl = URL.createObjectURL(frontBlob)
      setFrontCardUrl(frontUrl)
      setFrontCardBlob(frontBlob)

      // Generar tarjeta trasera
      const backBlob = await generateBackCard(dataToGenerate)
      const backUrl = URL.createObjectURL(backBlob)
      setBackCardUrl(backUrl)
      setBackCardBlob(backBlob)
    } catch (error) {
      console.error('Error generando las tarjetas:', error)
      alert('Error al generar los carnets. Por favor, verifica que todos los campos estén completos.')
    }
  }

  const handleSave = async () => {
    if (!frontCardBlob || !backCardBlob) {
      alert('Primero debes generar los carnets')
      return
    }

    if (!formData.cedula.trim()) {
      alert('Por favor, ingresa el número de cédula')
      return
    }

    // Verificar autenticación
    if (!user || !user.uid) {
      alert('Error: No estás autenticado. Por favor, inicia sesión nuevamente.')
      navigate('/login')
      return
    }

    console.log('Usuario autenticado:', user.email, 'UID:', user.uid)
    console.log('Token de autenticación disponible:', user.accessToken ? 'Sí' : 'No')

    setSaving(true)
    try {
      // Verificar token de autenticación
      const token = await user.getIdToken()
      console.log('Token de autenticación obtenido:', token ? 'Sí' : 'No')

      // Asegurar que los valores automáticos estén presentes
      const dataToSave = {
        ...formData,
        nombreClub: 'CLUB DE TIRO DEPORTIVO DEL VALLE', // Siempre el mismo
        numeroMembresia: formData.numeroMembresia || await getNextMembershipNumber(),
        emision: formData.emision || (() => {
          const now = new Date()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const year = now.getFullYear()
          return `${month}/${year}`
        })()
      }

      // Guardar en Firebase (actualizará si ya existe, creará si es nuevo)
      const result = await saveCard(dataToSave, frontCardBlob, backCardBlob, user.uid)

      // El servicio retorna _wasUpdated para indicar si fue actualización
      if (result._wasUpdated) {
        alert('Carnet actualizado exitosamente (ya existía un carnet con esta cédula)')
      } else {
        alert('Carnet guardado exitosamente')
      }
    } catch (error) {
      console.error('Error guardando carnet:', error)
      console.error('Código de error:', error.code)
      console.error('Mensaje de error:', error.message)
      console.error('Stack trace:', error.stack)

      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        const errorMessage = `
Error de permisos en Firestore.

Por favor, verifica:
1. Ve a: https://console.firebase.google.com/
2. Selecciona el proyecto: campo-tiro-valle
3. Ve a Firestore Database > Rules
4. Asegúrate de tener estas reglas:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /carnets/{cardId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
  }
}

5. Haz clic en "Publish"
6. Espera 10 segundos y vuelve a intentar

Revisa la consola del navegador para más detalles.
        `
        alert(errorMessage)
      } else {
        alert(`Error al guardar el carnet: ${error.message}. Por favor, intenta nuevamente.`)
      }
    } finally {
      setSaving(false)
    }
  }

  const downloadCard = (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleMouseMove = (e, cardType) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -10  // Máximo 10 grados
    const rotateY = ((x - centerX) / centerX) * 10   // Máximo 10 grados

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

  const frontTransformStyle = {
    transform: `perspective(1000px) rotateX(${frontCardTransform.rotateX}deg) rotateY(${frontCardTransform.rotateY}deg) scale3d(${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '1.12' : '1'}, ${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '1.12' : '1'}, 1) translateZ(${frontCardTransform.rotateX !== 0 || frontCardTransform.rotateY !== 0 ? '25px' : '0px'})`,
    transition: 'transform 0.1s ease-out',
    transformStyle: 'preserve-3d',
    cursor: 'pointer'
  }

  const backTransformStyle = {
    transform: `perspective(1000px) rotateX(${backCardTransform.rotateX}deg) rotateY(${backCardTransform.rotateY}deg) scale3d(${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '1.12' : '1'}, ${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '1.12' : '1'}, 1) translateZ(${backCardTransform.rotateX !== 0 || backCardTransform.rotateY !== 0 ? '25px' : '0px'})`,
    transition: 'transform 0.1s ease-out',
    transformStyle: 'preserve-3d',
    cursor: 'pointer'
  }

  return (
    <div className="min-h-screen lg:h-screen bg-tactical-dark relative flex flex-col lg:overflow-hidden">

      <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
        {/* Header */}
        <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)] space-y-4">
          <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.4em]">
            Generador de Carnets
          </h1>
          <p className="text-xs font-tactical text-tactical-brass/70 uppercase tracking-[0.45em]">
            Crea y gestiona los carnets de identificación de los operadores
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Formulario */}
          <section className="bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6 space-y-4 flex flex-col max-h-[calc(100vh-200px)]">
            <div className="flex-shrink-0">
              <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em] mb-2">
                Datos del Carnet
              </h2>
              <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                Completa la información para generar el carnet
              </p>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {/* Sección Frente */}
              <div className="border-b border-tactical-border pb-4 mb-4">
                <h3 className="text-sm font-tactical text-tactical-gold uppercase tracking-[0.3em] mb-4">
                  Datos Cara Frontal
                </h3>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    placeholder="EJ: JUAN TENORIO"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Cédula
                  </label>
                  <input
                    type="text"
                    name="cedula"
                    value={formData.cedula}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    placeholder="EJ: 1234567890"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Contacto
                  </label>
                  <input
                    type="text"
                    name="contacto"
                    value={formData.contacto}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    placeholder="EJ: 3001234567"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Contacto de Emergencia
                  </label>
                  <input
                    type="text"
                    name="contactoEmergencia"
                    value={formData.contactoEmergencia}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    placeholder="EJ: 3009876543"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    RH
                  </label>
                  <input
                    type="text"
                    name="rh"
                    value={formData.rh}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    placeholder="EJ: O+"
                  />
                </div>





                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Nivel/Operador
                  </label>
                  <select
                    name="nivel"
                    value={formData.nivel}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    disabled={loadingData}
                  >
                    <option value="">Seleccione un nivel</option>
                    {niveles.map((nivel) => (
                      <option key={nivel.id} value={nivel.nombre}>
                        {nivel.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Vigencia
                  </label>
                  <select
                    name="vigencia"
                    value={formData.vigencia}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    disabled={loadingData}
                  >
                    <option value="">Seleccione una vigencia</option>
                    {vigencias.map((vigencia) => (
                      <option key={vigencia.id} value={vigencia.nombre}>
                        {vigencia.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sección Reverso */}
              <div className="border-b border-tactical-border pb-4 mb-4">
                <h3 className="text-sm font-tactical text-tactical-gold uppercase tracking-[0.3em] mb-4">
                  Datos Cara Trasera
                </h3>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Identificador
                  </label>
                  <input
                    type="text"
                    name="identificador"
                    value={formData.identificador}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    placeholder="EJ: RAVEN-09"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Foto del Miembro
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-tactical file:uppercase file:tracking-[0.3em] file:bg-tactical-gray file:text-tactical-brass file:border file:border-tactical-border hover:file:bg-tactical-gray/80"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Especialidad
                  </label>
                  <select
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    disabled={loadingData}
                  >
                    <option value="">Seleccione una especialidad</option>
                    {especialidades.map((especialidad) => (
                      <option key={especialidad.id} value={especialidad.nombre}>
                        {especialidad.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Equipo Táctico
                  </label>
                  <select
                    name="equipoTactico"
                    value={formData.equipoTactico}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    disabled={loadingData}
                  >
                    <option value="">Seleccione un equipo</option>
                    {equipos.map((equipo) => (
                      <option key={equipo.id} value={equipo.nombre}>
                        {equipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Rol en el Equipo
                  </label>
                  <select
                    name="rolEnEquipo"
                    value={formData.rolEnEquipo}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    disabled={!formData.equipoTactico}
                  >
                    <option value="">Seleccione un rol</option>
                    <option value="Capitán">Capitán</option>
                    <option value="Operador">Operador</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Pistola
                  </label>
                  <input
                    type="text"
                    name="pistola"
                    value={formData.pistola}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    placeholder="EJ: GLOCK 17"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] text-tactical-brass/60 uppercase tracking-[0.45em] mb-2">
                    Fusil
                  </label>
                  <input
                    type="text"
                    name="fusil"
                    value={formData.fusil}
                    onChange={handleInputChange}
                    className="w-full bg-black/60 border border-tactical-border px-4 py-2 text-tactical-gold font-tactical uppercase tracking-[0.3em] focus:outline-none focus:border-tactical-gold"
                    placeholder="EJ: AR15 BLACK RAIN"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.35em] transition-all duration-200"
              >
                Generar Carnet
              </button>
            </div>
          </section>

          {/* Vista previa y descarga */}
          <section className="bg-black/40 border border-tactical-border rounded-lg p-[10px] md:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-tactical text-tactical-gold uppercase tracking-[0.4em] mb-2">
                Vista Previa
              </h2>
              <p className="text-[10px] font-tactical text-tactical-brass/60 uppercase tracking-[0.45em]">
                Visualiza las caras del carnet generado
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="lg:flex-1">
                <div className="grid grid-cols-2 gap-4">

                  {frontCardUrl && (
                    <div>
                      <h3 className="text-xs font-tactical text-tactical-gold mb-2 text-center uppercase tracking-[0.3em]">
                        Cara Frontal
                      </h3>
                      <CarnetPreview
                        src={frontCardUrl}
                        alt="Carnet Frontal"
                        placeholder="Sin imagen frontal"
                        interactive
                        imageStyle={frontTransformStyle}
                        onMouseMove={(e) => handleMouseMove(e, 'front')}
                        onMouseLeave={() => handleMouseLeave('front')}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => downloadCard(frontCardUrl, 'carnet-frontal.png')}
                          className="w-full bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.35em] transition-all duration-200"
                        >
                          Descargar
                        </button>
                      </div>
                    </div>
                  )}

                  {backCardUrl && (
                    <div>
                      <h3 className="text-xs font-tactical text-tactical-gold mb-2 text-center uppercase tracking-[0.3em]">
                        Cara Trasera
                      </h3>
                      <CarnetPreview
                        src={backCardUrl}
                        alt="Carnet Trasero"
                        placeholder="Sin imagen trasera"
                        interactive
                        imageStyle={backTransformStyle}
                        onMouseMove={(e) => handleMouseMove(e, 'back')}
                        onMouseLeave={() => handleMouseLeave('back')}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => downloadCard(backCardUrl, 'carnet-trasero.png')}
                          className="w-full bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.35em] transition-all duration-200"
                        >
                          Descargar
                        </button>
                      </div>
                    </div>
                  )}

                  {frontCardUrl && backCardUrl && (
                    <div className="w-full mt-4 col-span-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-[0.35em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Guardando...' : 'Guardar en Base de Datos'}
                      </button>
                    </div>
                  )}

                  {!frontCardUrl && !backCardUrl && (
                    <div className="col-span-2 text-tactical-brass/60 text-center py-12 font-tactical border-2 border-dashed border-tactical-border rounded p-8">
                      <p className="text-sm mb-2 uppercase tracking-[0.3em]">Estado: Esperando entrada</p>
                      <p className="text-[10px] uppercase tracking-[0.3em]">Complete el formulario y haga clic en "Generar Carnet" para ver la vista previa</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default CreateCard
