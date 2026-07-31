import { useOutletContext } from 'react-router-dom'
import CreateCard from './CreateCard'

function TraumaticoGeneratorView() {
  const outletContext = useOutletContext()
  const onSignOut = outletContext?.onSignOut

  return <CreateCard onSignOut={onSignOut} variant="traumatico" />
}

export default TraumaticoGeneratorView
