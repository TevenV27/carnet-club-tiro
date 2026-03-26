import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import Login from '../pages/auth/Login'
import SearchCard from '../pages/carnets/SearchCard'
import CredencialView from '../pages/carnets/CredencialView'
import ProtectedRoute from '../routes/ProtectedRoute'
import SidebarLayout from '../layouts/SidebarLayout'
import UsersView from '../pages/users/UsersView'
import UserDetailView from '../pages/users/UserDetailView'
import TeamsView from '../pages/teams/TeamsView'
import TournamentsView from '../pages/tournaments/TournamentsView'
import TournamentDetailView from '../pages/tournaments/TournamentDetailView'
import RankingView from '../pages/ranking/RankingView'
import GeneratorView from '../pages/carnets/GeneratorView'
import EditCarnetView from '../pages/carnets/EditCarnetView'
import TeamDetailView from '../pages/teams/TeamDetailView'
import RolesView from '../pages/management/RolesView'
import LevelsView from '../pages/management/LevelsView'
import ScoresView from '../pages/management/ScoresView'
import SpecialtiesView from '../pages/management/SpecialtiesView'
import VigenciasView from '../pages/management/VigenciasView'
import LogsView from '../pages/logs/LogsView'
import LogDetailView from '../pages/logs/LogDetailView'

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
        style={{ background: 'linear-gradient(135deg, #0c0d11 0%, #1c2028 100%)' }}>
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
          <Route path="usuarios/:cedula/editar-carnet" element={<EditCarnetView />} />
          <Route path="usuarios/:cedula" element={<UserDetailView />} />
          <Route path="equipos" element={<TeamsView />} />
          <Route path="equipos/:teamId" element={<TeamDetailView />} />
          <Route path="torneos" element={<TournamentsView />} />
          <Route path="torneos/:torneoId" element={<TournamentDetailView />} />
          <Route path="ranking" element={<RankingView />} />
          <Route path="gestion/niveles" element={<LevelsView />} />
          <Route path="gestion/roles" element={<RolesView />} />
          <Route path="gestion/puntajes" element={<ScoresView />} />
          <Route path="gestion/especialidades" element={<SpecialtiesView />} />
          <Route path="gestion/vigencias" element={<VigenciasView />} />
          <Route path="logs" element={<LogsView />} />
          <Route path="logs/:date" element={<LogDetailView />} />
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

