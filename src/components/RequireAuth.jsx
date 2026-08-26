import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Envolve rotas que exigem sessão do Supabase Auth. Sem sessão válida,
 * manda para /login e guarda a rota de origem em location.state.from,
 * para o Login poder devolver o usuário de onde ele veio.
 */
export default function RequireAuth({ children }) {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
