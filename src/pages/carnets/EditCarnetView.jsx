import { useOutletContext, useParams } from 'react-router-dom'
import CreateCard from './CreateCard'

function EditCarnetView() {
  const { cedula: cedulaParam } = useParams()
  const cedula = decodeURIComponent(cedulaParam || '')
  const outletContext = useOutletContext()

  return (
    <CreateCard
      editCedula={cedula}
      returnPath={`/usuarios/${encodeURIComponent(cedula)}`}
      onSignOut={outletContext?.onSignOut}
    />
  )
}

export default EditCarnetView
