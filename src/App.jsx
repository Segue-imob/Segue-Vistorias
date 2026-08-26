import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import FullscreenLoader from './components/FullscreenLoader'
import AccessMessage from './components/AccessMessage'
import Agenda from './pages/Agenda'
import Vistorias from './pages/Vistorias'
import MinhasVistorias from './pages/MinhasVistorias'
import Usuarios from './pages/Usuarios'
import SemAcesso from './pages/SemAcesso'
import { useAuth } from './context/AuthContext'
import { getHomeRouteForRole } from './lib/permissions'

export default function App() {
  const { session, role, loading } = useAuth()

  // Sessão/perfil ainda carregando — evita "piscar" a tela errada.
  if (loading) return <FullscreenLoader />

  // Sem sessão do Supabase Auth: este pacote não inclui a tela de login,
  // ela deve rodar antes do usuário chegar aqui (veja README).
  if (!session) {
    return (
      <AccessMessage
        title="Sessão não encontrada"
        description="Faça login para acessar o SEGUE Vistorias."
      />
    )
  }

  // Home varia por perfil: Administrador/Gestão caem na Agenda,
  // Vistoriador cai em "Minhas Vistorias", e quem não tem role
  // reconhecido em profiles.role cai em /sem-acesso.
  const homeRoute = getHomeRouteForRole(role)

  return (
    <Routes>
      <Route path="/sem-acesso" element={<SemAcesso />} />

      <Route element={<Layout />}>
        <Route index element={<Navigate to={homeRoute} replace />} />

        <Route
          path="/agenda"
          element={
            <ProtectedRoute permission="viewAgenda">
              <Agenda />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vistorias"
          element={
            <ProtectedRoute permission="viewVistorias">
              <Vistorias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/minhas-vistorias"
          element={
            <ProtectedRoute permission="viewMinhasVistorias">
              <MinhasVistorias />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute permission="viewUsuarios">
              <Usuarios />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={homeRoute} replace />} />
      </Route>
    </Routes>
  )
}
