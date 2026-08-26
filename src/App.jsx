import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Agenda from './pages/Agenda'
import Vistorias from './pages/Vistorias'
import Usuarios from './pages/Usuarios'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/agenda" replace />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/vistorias" element={<Vistorias />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="*" element={<Navigate to="/agenda" replace />} />
      </Route>
    </Routes>
  )
}
