import './index.css'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import ProfesorDashboard from './pages/ProfesorDashboard'
import AlumnoDashboard from './pages/AlumnoDashboard'

function AppRouter() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 48, letterSpacing: 6, color: 'var(--lime, #c8f542)' }}>CALFIT</div>
        <div style={{ fontSize: 12, letterSpacing: 3, color: 'var(--muted, #777)', textTransform: 'uppercase' }}>Cargando...</div>
      </div>
    )
  }

  if (!user || !profile) return <LoginPage />
  if (profile.role === 'profe') return <ProfesorDashboard />
  return <AlumnoDashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
