import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase/config'
import Login from './components/Login'
import SearchCard from './components/SearchCard'
import CredencialView from './components/CredencialView'
import ProtectedRoute from './components/ProtectedRoute'
import SidebarLayout from './components/SidebarLayout'
import UsersView from './components/UsersView'
import UserDetailView from './components/UserDetailView'
import TeamsView from './components/TeamsView'
import TournamentsView from './components/TournamentsView'
import TournamentDetailView from './components/TournamentDetailView'
import RankingView from './components/RankingView'
import GeneratorView from './components/GeneratorView'
import TeamDetailView from './components/TeamDetailView'

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
          element={
            <ProtectedRoute>
              <SidebarLayout onSignOut={handleSignOut} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="usuarios" replace />} />
          <Route path="usuarios" element={<UsersView />} />
          <Route path="usuarios/:cedula" element={<UserDetailView />} />
          <Route path="equipos" element={<TeamsView />} />
          <Route path="equipos/:teamId" element={<TeamDetailView />} />
          <Route path="torneos" element={<TournamentsView />} />
          <Route path="torneos/:torneoId" element={<TournamentDetailView />} />
          <Route path="ranking" element={<RankingView />} />
          <Route path="generador" element={<GeneratorView />} />
          <Route path="buscar-carnet" element={<SearchCard />} />
          <Route path="credencial/:cedula" element={<CredencialView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App

