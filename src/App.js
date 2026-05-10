import './index.css'
import { useState } from 'react'
import { AuthProvider, useAuth } from 'contexts/AuthContext'
import AppLayout from 'components/layout/AppLayout'

// Pages
import LandingPage  from 'pages/LandingPage'
import LoginPage    from 'pages/auth/LoginPage'

import DashboardProfe from 'pages/profe/DashboardProfe'
import AlumnosPage    from 'pages/profe/AlumnosPage'
import RutinasPage    from 'pages/profe/RutinasPage'
import MetricasProfe  from 'pages/profe/MetricasProfe'
import ProgresoPage   from 'pages/profe/ProgresoPage'
import AdminPage      from 'pages/profe/AdminPage'

import InicioAlumno   from 'pages/alumno/InicioAlumno'
import EntrenarPage   from 'pages/alumno/EntrenarPage'
import MetricasAlumno from 'pages/alumno/MetricasAlumno'
import HistorialPage  from 'pages/alumno/HistorialPage'
import GoalsPage      from 'pages/alumno/GoalsPage'

import MensajesPage  from 'pages/MensajesPage'
import PlanesPage    from 'pages/PlanesPage'
import ConfigPage    from 'pages/ConfigPage'
import PlatformAdminDashboard from 'pages/admin/PlatformAdminDashboard'

// Detectar ruta actual
const PATH = window.location.pathname

function AppRouter() {
  const { user, profile, loading } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [selectedAlumno, setSelectedAlumno] = useState(null)

  // Loading spinner
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, background:'#060606' }}>
      <div style={{ fontFamily:'sans-serif', fontSize:60, letterSpacing:8, color:'#c8f542', fontWeight:900 }}>CALFIT</div>
      <div style={{ width:16, height:16, border:'2px solid #333', borderTopColor:'#c8f542', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // No logueado
  if (!user || !profile) {
    // Si está en /login → mostrar login
    // Si está en cualquier otra ruta → mostrar landing
    if (PATH === '/login' || PATH.startsWith('/login')) {
      return <LoginPage/>
    }
    return <LandingPage/>
  }

  // Admin de plataforma
  if (profile.role === 'admin') return <PlatformAdminDashboard/>

  const isProfe = profile.role === 'profe'

  function renderPage() {
    if (isProfe) {
      switch(page) {
        case 'dashboard': return <DashboardProfe setPage={setPage}/>
        case 'alumnos':   return <AlumnosPage setPage={setPage} setSelectedAlumno={setSelectedAlumno}/>
        case 'rutinas':   return <RutinasPage selectedAlumno={selectedAlumno} setSelectedAlumno={setSelectedAlumno}/>
        case 'mensajes':  return <MensajesPage/>
        case 'metricas':  return <MetricasProfe/>
        case 'progreso':  return <ProgresoPage/>
        case 'planes':    return <PlanesPage/>
        case 'admin':     return <AdminPage/>
        case 'config':    return <ConfigPage/>
        default:          return <DashboardProfe setPage={setPage}/>
      }
    } else {
      switch(page) {
        case 'inicio':    return <InicioAlumno setPage={setPage}/>
        case 'rutinas':   return <InicioAlumno setPage={setPage}/>
        case 'sesion':    return <EntrenarPage/>
        case 'mensajes':  return <MensajesPage/>
        case 'metricas':  return <MetricasAlumno/>
        case 'historial': return <HistorialPage/>
        case 'goals':     return <GoalsPage/>
        default:          return <InicioAlumno setPage={setPage}/>
      }
    }
  }

  return (
    <AppLayout page={page} setPage={setPage}>
      {renderPage()}
    </AppLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter/>
    </AuthProvider>
  )
}
