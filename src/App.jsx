import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RequireAuth from './components/RequireAuth'
import FullscreenLoader from './components/FullscreenLoader'
import Login from './pages/Login'
import Agenda from './pages/Agenda'
import Vistorias from './pages/Vistorias'
import MinhasVistorias from './pages/MinhasVistorias'
import VistoriaExecucao from './pages/VistoriaExecucao'
import Usuarios from './pages/Usuarios'
import SemAcesso from './pages/SemAcesso'
import { useAuth } from './context/AuthContext'
import { getHomeRouteForRole } from './lib/permissions'

// Home varia por perfil: Administrador/Gestão caem na Agenda,
// Vistoriador cai em "Minhas Vistorias", e quem não tem role
// reconhecido em profiles.role cai em /sem-acesso.
function HomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={getHomeRouteForRole(role)} replace />
}

export default function App() {
  const { loading } = useAuth()

  // Sessão/perfil ainda carregando — evita "piscar" a tela errada
  // (login vs. app) enquanto o Supabase resolve a sessão.
  if (loading) return <FullscreenLoader />

  return (
    <Routes>
      {/* Rota pública — tela de login split-screen */}
      <Route path="/login" element={<Login />} />

      <Route
        path="/sem-acesso"
        element={
          <RequireAuth>
            <SemAcesso />
          </RequireAuth>
        }
      />

      {/* Todo o app protegido por sessão válida; sem sessão -> /login */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />

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
          path="/minhas-vistorias/:id"
          element={
            <ProtectedRoute permission="viewMinhasVistorias">
              <VistoriaExecucao />
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

        <Route path="*" element={<HomeRedirect />} />
      </Route>
    </Routes>
  )
}
