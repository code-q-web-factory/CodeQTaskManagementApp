import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import CriticalPage from './pages/CriticalPage'
import SettingsPage from './pages/SettingsPage'
import FocusedWorkPage from './pages/FocusedWorkPage'
import WaitingForPage from './pages/WaitingForPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/critical" replace />} />
          <Route path="/critical" element={<CriticalPage />} />
          <Route path="/focused" element={<FocusedWorkPage />} />
          <Route path="/waiting" element={<WaitingForPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
