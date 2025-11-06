import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase/config'
import Login from './components/Login'
import CreateCard from './components/CreateCard'
import SearchCard from './components/SearchCard'
import CredencialView from './components/CredencialView'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error cerrando sesión:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tactical-dark flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
        <div className="text-tactical-gold font-tactical">Cargando...</div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/crear-carnet"
          element={
            <ProtectedRoute>
              <CreateCard onSignOut={handleSignOut} />
            </ProtectedRoute>
          }
        />
        <Route path="/buscar-carnet" element={<SearchCard />} />
        <Route path="/credencial/:cedula" element={<CredencialView />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App

