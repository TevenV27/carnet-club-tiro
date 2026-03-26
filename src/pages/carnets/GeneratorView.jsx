import { useOutletContext } from 'react-router-dom'
import CreateCard from './CreateCard'

function GeneratorView() {
  const outletContext = useOutletContext()
  const onSignOut = outletContext?.onSignOut

  return <CreateCard onSignOut={onSignOut} />
}

export default GeneratorView

