import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAuthProfile } from '../../context/AuthProfileContext'

const labelRol = (rol) => {
  if (rol === 'admin') return 'Administrador'
  if (rol === 'operador') return 'Operador'
  return 'Sin rol en base de datos'
}

function ProfileView() {
  const { profile } = useAuthProfile()
  const [authUser, setAuthUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u)
    })
    return () => unsub()
  }, [])

  const cedula = profile?.cedula || profile?.id || '—'
  const nombre = profile?.nombre || authUser?.displayName || '—'

  return (
    <div className="p-[10px] md:p-8 bg-tactical-dark min-h-full h-full text-tactical-brass space-y-8 overflow-auto">
      <header className="border border-tactical-border bg-black/40 backdrop-blur-sm p-[10px] md:p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)]">
        <h1 className="text-3xl font-tactical text-tactical-gold uppercase tracking-[0.08em]">
          Mi perfil
        </h1>
        <p className="text-xs font-tactical text-tactical-brass uppercase tracking-[0.1em] mt-2">
          Datos de tu cuenta y ficha en el club
        </p>
      </header>

      <section className="bg-black/35 border border-tactical-border rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden p-[10px] md:p-8 space-y-6 max-w-3xl">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-32 h-32 border border-tactical-border overflow-hidden bg-black flex-shrink-0 flex items-center justify-center">
            {profile?.foto ? (
              <img src={profile.foto} alt={nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-tactical-brass tracking-[0.1em] text-center px-2">
                Sin foto
              </span>
            )}
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <h2 className="text-xl font-tactical text-tactical-gold uppercase tracking-[0.06em] break-words">
              {nombre}
            </h2>
            <p className="text-[11px] font-tactical uppercase tracking-[0.1em] text-tactical-brass">
              Cédula: <span className="text-tactical-gold">{cedula}</span>
            </p>
            <p className="text-[11px] font-tactical uppercase tracking-[0.1em] text-tactical-brass">
              Rol en el sistema:{' '}
              <span className="text-tactical-gold">{labelRol(profile?.rol)}</span>
            </p>
          </div>
        </div>

        <div className="border-t border-tactical-border/60 pt-6 space-y-4">
          <h3 className="text-sm font-tactical text-tactical-gold uppercase tracking-[0.08em]">
            Acceso (Firebase Authentication)
          </h3>
          <dl className="grid grid-cols-1 gap-3 text-[11px] font-tactical uppercase tracking-[0.06em]">
            <div>
              <dt className="text-tactical-brass/90 mb-1">Correo de inicio de sesión</dt>
              <dd className="text-tactical-gold break-all normal-case tracking-normal">
                {authUser?.email || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-tactical-brass/90 mb-1">UID</dt>
              <dd className="text-tactical-brass/80 break-all font-mono text-[10px] normal-case">
                {authUser?.uid || '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-tactical-border/60 pt-6 space-y-4">
          <h3 className="text-sm font-tactical text-tactical-gold uppercase tracking-[0.08em]">
            Ficha en Firestore
          </h3>
          {!profile ? (
            <p className="text-[11px] text-tactical-brass/90 leading-relaxed normal-case tracking-normal">
              No hay un registro vinculado a tu correo o UID en la colección de usuarios. Si acabas de
              darte de alta, espera unos segundos o contacta a un administrador.
            </p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] font-tactical uppercase tracking-[0.06em]">
              <div>
                <dt className="text-tactical-brass/90 mb-1">Correo en ficha</dt>
                <dd className="text-tactical-gold break-all normal-case tracking-normal">
                  {profile.email || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-tactical-brass/90 mb-1">Nivel</dt>
                <dd className="text-tactical-gold">{profile.nivel || '—'}</dd>
              </div>
              <div>
                <dt className="text-tactical-brass/90 mb-1">Puntos</dt>
                <dd className="text-tactical-gold">
                  {profile.puntos != null ? String(profile.puntos) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-tactical-brass/90 mb-1">Contacto</dt>
                <dd className="text-tactical-gold normal-case tracking-normal">
                  {profile.contacto || '—'}
                </dd>
              </div>
              {profile.especialidad ? (
                <div className="sm:col-span-2">
                  <dt className="text-tactical-brass/90 mb-1">Especialidad</dt>
                  <dd className="text-tactical-gold normal-case tracking-normal">{profile.especialidad}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      </section>
    </div>
  )
}

export default ProfileView
