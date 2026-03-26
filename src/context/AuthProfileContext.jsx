import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getUserByAuthUid, getUserByEmail } from '../services/userService'

const PROFILE_FETCH_MS = 20000

async function fetchProfileForUser(u) {
  const byEmail = await getUserByEmail(u.email)
  if (byEmail) return byEmail
  if (u.uid) {
    const byUid = await getUserByAuthUid(u.uid)
    if (byUid) return byUid
  }
  return null
}

const AuthProfileContext = createContext({
  profile: null,
  loading: true,
  isAdmin: true,
  isOperator: false,
  canEdit: true
})

export function AuthProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u?.email) {
        setProfile(null)
        setLoading(false)
        return
      }
      // No bloquear la UI con "Cargando permisos..." hasta que Firestore responda.
      setLoading(false)
      void (async () => {
        try {
          const docUser = await Promise.race([
            fetchProfileForUser(u),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('PROFILE_FETCH_TIMEOUT')), PROFILE_FETCH_MS)
            })
          ])
          setProfile(docUser)
        } catch (err) {
          console.error('Error cargando perfil de usuario:', err)
          setProfile(null)
        }
      })()
    })
    return () => unsub()
  }, [])

  const value = useMemo(() => {
    const isOperator = profile?.rol === 'operador'
    const isAdmin = !isOperator
    return {
      profile,
      loading,
      isAdmin,
      isOperator,
      canEdit: isAdmin
    }
  }, [profile, loading])

  return <AuthProfileContext.Provider value={value}>{children}</AuthProfileContext.Provider>
}

export function useAuthProfile() {
  return useContext(AuthProfileContext)
}
