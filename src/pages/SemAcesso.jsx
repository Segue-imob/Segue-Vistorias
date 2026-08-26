import AccessMessage from '../components/AccessMessage'
import { useAuth } from '../context/AuthContext'
import { getRoleLabel } from '../lib/permissions'

export default function SemAcesso() {
  const { profile } = useAuth()

  return (
    <AccessMessage
      title="Sem acesso a esta área"
      description={
        profile
          ? `Seu perfil (${getRoleLabel(profile.role)}) não tem permissão para acessar esta página. Fale com um administrador se acha que isso é um engano.`
          : 'Não encontramos um perfil vinculado à sua conta em profiles. Fale com um administrador para liberar seu acesso.'
      }
      showSignOut
    />
  )
}
