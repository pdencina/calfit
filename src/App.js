import './index.css'
import { useState } from 'react'
import { AuthProvider, useAuth } from 'contexts/AuthContext'
import AppLayout from 'components/layout/AppLayout'

// Auth
import LoginPage from 'pages/auth/LoginPage'

// Profe pages
import DashboardProfe from 'pages/profe/DashboardProfe'
import AlumnosPage    from 'pages/profe/AlumnosPage'
import RutinasPage    from 'pages/profe/RutinasPage'
import MetricasProfe  from 'pages/profe/MetricasProfe'
import ProgresoPage   from 'pages/profe/ProgresoPage'

// Alumno pages
import InicioAlumno   from 'pages/alumno/InicioAlumno'
import EntrenarPage   from 'pages/alumno/EntrenarPage'
import MetricasAlumno from 'pages/alumno/MetricasAlumno'
import HistorialPage  from 'pages/alumno/HistorialPage'
import GoalsPage      from 'pages/alumno/GoalsPage'

// Shared
import MensajesPage   from 'pages/MensajesPage'
import PlanesPage     from 'pages/PlanesPage'
import ConfigPage     from 'pages/ConfigPage'
import AdminPage      from 'pages/profe/AdminPage'

function AppRouter() {
  const { user, profile, loading } = useAuth()
  const [page, setPage]             = useState(profile?.role === 'profe' ? 'dashboard' : 'inicio')
  const [selectedAlumno, setSelectedAlumno] = useState(null)

  if(loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ fontFamily:'var(--font-display, sans-serif)', fontSize:60, letterSpacing:8, color:'var(--lime,#c8f542)' }}>CALFIT</div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <div style={{ width:16, height:16, border:'2px solid #333', borderTopColor:'#c8f542', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <span style={{ fontSize:11, letterSpacing:3, color:'#555', textTransform:'uppercase' }}>Cargando...</span>
      </div>
    </div>
  )

  if(!user || !profile) return <LoginPage/>

  const isProfe = profile.role === 'profe'

  function renderPage() {
    if(isProfe) {
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
