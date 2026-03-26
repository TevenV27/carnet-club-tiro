import { Navigate, Outlet } from 'react-router-dom'
import { useAuthProfile } from '../context/AuthProfileContext'

function AdminRoute() {
  const { loading, isAdmin } = useAuthProfile()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-tactical-dark">
        <div className="text-tactical-gold font-tactical uppercase tracking-[0.08em]">Cargando permisos...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/perfil" replace />
  }

  return <Outlet />
}

export default AdminRoute
