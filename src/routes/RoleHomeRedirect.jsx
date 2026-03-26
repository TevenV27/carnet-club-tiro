import { Navigate } from 'react-router-dom'
import { useAuthProfile } from '../context/AuthProfileContext'

function RoleHomeRedirect() {
  const { loading, isAdmin } = useAuthProfile()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-tactical-dark">
        <div className="text-tactical-gold font-tactical uppercase tracking-[0.08em]">Cargando...</div>
      </div>
    )
  }

  return <Navigate to={isAdmin ? '/usuarios' : '/torneos'} replace />
}

export default RoleHomeRedirect