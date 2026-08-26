import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PERMISSIONS } from '../lib/permissions'

/**
 * Envolve uma página e só a renderiza se o role do usuário logado
 * atender à permissão informada. Caso contrário, redireciona para
 * /sem-acesso — usado tanto para digitação direta de URL quanto
 * para navegação via Sidebar (que já esconde o item, mas isso é
 * só a camada de UI; a rota é a barreira real).
 */
export default function ProtectedRoute({ permission, children }) {
  const { role } = useAuth()
  const check = PERMISSIONS[permission]

  if (check && !check(role)) {
    return <Navigate to="/sem-acesso" replace />
  }

  return children
}
