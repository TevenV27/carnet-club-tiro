import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { generateFrontCard, generateBackCard } from '../utils/cardGenerator'
import { saveCard } from '../services/cardService'
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
  const [formData, setFormData] = useState({
    // Datos del frente
    nombre: '',
    nivel: '',
    numeroMembresia: '',
    emision: '',
    vigencia: '',
    nombreClub: 'CLUB DE TIRO DEPORTIVO DEL VALLE',
    rh: '',
    contacto: '',
    cedula: '',

    // Datos del reverso
    identificador: '',
    especialidad: '',
    equipoTactico: '',
    pistola: '',
    fusil: '',
    bbs: '',
    rango: '',
    precision: '',
    habilidades: '',
    foto: null,
  })

  const [frontCardUrl, setFrontCardUrl] = useState(null)
  const [backCardUrl, setBackCardUrl] = useState(null)
  const [frontCardBlob, setFrontCardBlob] = useState(null)
  const [backCardBlob, setBackCardBlob] = useState(null)
  const [frontCardTransform, setFrontCardTransform] = useState({ rotateX: 0, rotateY: 0 })
  const [backCardTransform, setBackCardTransform] = useState({ rotateX: 0, rotateY: 0 })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
      // Generar tarjeta frontal
      const frontBlob = await generateFrontCard(formData)
      const frontUrl = URL.createObjectURL(frontBlob)
      setFrontCardUrl(frontUrl)
      setFrontCardBlob(frontBlob)

      // Generar tarjeta trasera
      const backBlob = await generateBackCard(formData)
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

      // Guardar en Firebase (actualizará si ya existe, creará si es nuevo)
      const result = await saveCard(formData, frontCardBlob, backCardBlob, user.uid)

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

      {/* Barra superior de navegación */}
      <div className="bg-black border-b border-tactical-border py-3 px-8 relative z-10 flex-shrink-0"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate('/buscar-carnet')}
            className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-brass font-tactical text-xs uppercase tracking-wider transition-all duration-200"
            style={{
              boxShadow: 'none',
              textShadow: 'none'
            }}
          >
            [BUSCAR CARNET]
          </button>

          {user && (
            <div className="text-tactical-brass font-tactical text-xs uppercase tracking-wider opacity-70"
              style={{ textShadow: 'none' }}>
              {user.email}
            </div>
          )}

          <button
            onClick={onSignOut}
            className="bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-brass font-tactical text-xs uppercase tracking-wider transition-all duration-200"
            style={{
              boxShadow: 'none',
              textShadow: 'none'
            }}
          >
            [SALIR]
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-[5px] md:px-4 pt-[5px] md:pt-4 pb-[5px] md:pb-6 relative z-10 flex flex-col lg:overflow-hidden flex-1 lg:min-h-0">
        {/* Header táctico */}
        <div className="mb-4 text-center border-b border-tactical-border pb-3 relative flex-shrink-0"
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
            [CLASIFICADO] GENERADOR DE CARNETS
          </h1>
          <p className="text-tactical-brass text-xs font-tactical uppercase tracking-wider opacity-80"
            style={{ letterSpacing: '0.08em', textShadow: 'none' }}>
            CLUB DE TIRO DEPORTIVO DEL VALLE - OPERACIONES ESPECIALES
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch lg:flex-1 lg:min-h-0">
          {/* Formulario */}
          <div className="hud-border p-[5px] md:p-1 flex flex-col lg:overflow-hidden">
            <div className="bg-black p-[5px] md:p-4 flex flex-col lg:flex-1 lg:overflow-hidden" style={{
              background: '#0a0a0a',
              boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
            }}>
              <h2 className="text-lg font-semibold text-tactical-gold mb-3 font-tactical border-b border-tactical-border pb-1 uppercase tracking-wider flex-shrink-0"
                style={{
                  textShadow: 'none',
                  letterSpacing: '0.08em',
                  fontWeight: '500'
                }}>
                &gt; MÓDULO DE ENTRADA DE DATOS
              </h2>

              <div className="space-y-2 lg:flex-1 lg:overflow-y-auto" style={{ paddingRight: '12px' }}>
                {/* Sección Frente */}
                <div className="border-b border-tactical-border pb-2 mb-2">
                  <h3 className="text-sm font-medium text-tactical-brass mb-2 font-tactical uppercase tracking-wider"
                    style={{ textShadow: 'none' }}>
                    &gt; DATOS CARA FRONTAL
                  </h3>

                  <div className="mb-2">
                    <label className="block text-tactical-gold mb-2 font-tactical text-xs uppercase tracking-wider"
                      style={{ textShadow: 'none' }}>
                      &gt; NOMBRE COMPLETO
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: JUAN TENORIO"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; CÉDULA</label>
                    <input
                      type="text"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: 1234567890"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; CONTACTO</label>
                    <input
                      type="text"
                      name="contacto"
                      value={formData.contacto}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: 3001234567"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; RH</label>
                    <input
                      type="text"
                      name="rh"
                      value={formData.rh}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: O+"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>





                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; NIVEL/OPERADOR</label>
                    <input
                      type="text"
                      name="nivel"
                      value={formData.nivel}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: OPERADOR NIVEL 3"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; NÚMERO DE MEMBRESÍA</label>
                    <input
                      type="text"
                      name="numeroMembresia"
                      value={formData.numeroMembresia}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: CTDV-0125"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                        style={{ textShadow: 'none' }}>
                        &gt; EMISIÓN (MM/YYYY)</label>
                      <input
                        type="text"
                        name="emision"
                        value={formData.emision}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                        placeholder="EJ: 11/2025"
                        style={{
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                          background: '#0a0a0a'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                        style={{ textShadow: 'none' }}>
                        &gt; VIGENCIA</label>
                      <input
                        type="text"
                        name="vigencia"
                        value={formData.vigencia}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                        placeholder="EJ: T-01"
                        style={{
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                          background: '#0a0a0a'
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; NOMBRE DEL CLUB</label>
                    <input
                      type="text"
                      name="nombreClub"
                      value={formData.nombreClub}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>
                </div>

                {/* Sección Reverso */}
                <div className="border-b border-tactical-border pb-2 mb-2">
                  <h3 className="text-sm font-medium text-tactical-brass mb-2 font-tactical uppercase tracking-wider"
                    style={{ textShadow: 'none' }}>
                    &gt; DATOS CARA TRASERA
                  </h3>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; IDENTIFICADOR</label>
                    <input
                      type="text"
                      name="identificador"
                      value={formData.identificador}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: RAVEN-09"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; FOTO DEL MIEMBRO</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; ESPECIALIDAD</label>
                    <input
                      type="text"
                      name="especialidad"
                      value={formData.especialidad}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: FUSILERO"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  {/* <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; EQUIPO TÁCTICO</label>
                    <input
                      type="text"
                      name="equipoTactico"
                      value={formData.equipoTactico}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div> */}

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; PISTOLA</label>
                    <input
                      type="text"
                      name="pistola"
                      value={formData.pistola}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: GLOCK 17"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; FUSIL</label>
                    <input
                      type="text"
                      name="fusil"
                      value={formData.fusil}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: AR15 BLACK RAIN"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                        style={{ textShadow: 'none' }}>
                        &gt; BBS 0.28</label>
                      <input
                        type="text"
                        name="bbs"
                        value={formData.bbs}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                        placeholder="EJ: 9.2"
                        style={{
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                          background: '#0a0a0a'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                        style={{ textShadow: 'none' }}>
                        &gt; RANGO</label>
                      <input
                        type="text"
                        name="rango"
                        value={formData.rango}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                        placeholder="EJ: 25M"
                        style={{
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                          background: '#0a0a0a'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                        style={{ textShadow: 'none' }}>
                        &gt; PRECISIÓN</label>
                      <input
                        type="text"
                        name="precision"
                        value={formData.precision}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                        placeholder="EJ: AAA"
                        style={{
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                          background: '#0a0a0a'
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="block text-tactical-brass mb-1 font-tactical text-xs uppercase tracking-wider opacity-80"
                      style={{ textShadow: 'none' }}>
                      &gt; HABILIDADES (SEPARADAS POR COMAS)</label>
                    <input
                      type="text"
                      name="habilidades"
                      value={formData.habilidades}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-tactical-gray text-tactical-brass rounded-none border border-tactical-border focus:border-tactical-gold focus:outline-none font-tactical text-sm"
                      placeholder="EJ: INSTRUCTOR DE TIRO, PARAMEDICO, ESTRATEGA"
                      style={{
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                        background: '#0a0a0a'
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  className="w-full bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                  style={{
                    boxShadow: 'none',
                    textShadow: 'none',
                    letterSpacing: '0.1em'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(26, 26, 26, 0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent'
                  }}
                >
                  [GENERAR CARNET]
                </button>
              </div>
            </div>
          </div>

          {/* Vista previa y descarga */}
          <div className="hud-border p-[5px] md:p-1 flex flex-col ">
            <div className="flex flex-col gap-2 bg-black p-[5px] md:p-4 lg:flex-1 " style={{
              background: '#0a0a0a',
              boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8)'
            }}>
              <h2 className="text-lg font-semibold text-tactical-gold mb-3 font-tactical border-b border-tactical-border pb-1 uppercase tracking-wider flex-shrink-0"
                style={{
                  textShadow: 'none',
                  letterSpacing: '0.08em',
                  fontWeight: '500'
                }}>
                &gt; MÓDULO DE VISTA PREVIA
              </h2>
              <div className="lg:flex-1">
                <div className="grid grid-cols-2 gap-4">

                  {frontCardUrl && (
                    <div>
                      <h3 className="text-sm font-medium text-tactical-brass mb-2 font-tactical text-center uppercase tracking-wider opacity-80"
                        style={{ textShadow: 'none' }}>&gt; CARA FRONTAL</h3>
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
                          className="w-full bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                          style={{
                            boxShadow: 'none',
                            textShadow: 'none'
                          }}
                        >
                          [DESCARGAR]
                        </button>
                      </div>
                    </div>
                  )}

                  {backCardUrl && (
                    <div>
                      <h3 className="text-sm font-medium text-tactical-brass mb-2 font-tactical text-center uppercase tracking-wider opacity-80"
                        style={{ textShadow: 'none' }}>&gt; CARA TRASERA</h3>
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
                          className="w-full bg-transparent hover:bg-tactical-gray text-tactical-brass font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200"
                          style={{
                            boxShadow: 'none',
                            textShadow: 'none'
                          }}
                        >
                          [DESCARGAR]
                        </button>
                      </div>
                    </div>
                  )}

                  {frontCardUrl && backCardUrl && (
                    <div className="w-full mt-2 col-span-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-transparent hover:bg-tactical-gray text-tactical-gold font-semibold py-2 px-4 border border-tactical-border hover:border-tactical-gold font-tactical text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          boxShadow: 'none',
                          textShadow: 'none',
                          letterSpacing: '0.08em'
                        }}
                      >
                        {saving ? '[GUARDANDO...]' : '[GUARDAR EN BASE DE DATOS]'}
                      </button>
                    </div>
                  )}

                  {!frontCardUrl && !backCardUrl && (
                    <div className="col-span-2 text-tactical-brass text-center py-12 font-tactical border-2 border-dashed border-tactical-border rounded p-8" style={{ borderColor: '#af9974' }}>
                      <p className="text-lg mb-2">[ESTADO: ESPERANDO ENTRADA]</p>
                      <p className="text-sm">Complete el formulario y haga clic en [GENERAR CARNET] para ver la vista previa</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateCard
