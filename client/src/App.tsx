import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import CriticalPage from './pages/CriticalPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/critical" replace />} />
          <Route path="/critical" element={<CriticalPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
