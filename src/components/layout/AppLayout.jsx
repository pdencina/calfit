import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { signOut, getNotificaciones, marcarLeidasAll } from '../../lib/supabase'
import { useEffect } from 'react'

const PROFE_NAV = [
  { section: null },
  { key:'dashboard',  icon:'⚡', label:'Dashboard' },
  { key:'alumnos',    icon:'👥', label:'Mis Alumnos' },
  { key:'rutinas',    icon:'📋', label:'Rutinas' },
  { key:'mensajes',   icon:'💬', label:'Mensajes', badge:'unread' },
  { section:'Seguimiento' },
  { key:'metricas',   icon:'📊', label:'Métricas' },
  { key:'progreso',   icon:'📈', label:'Progreso' },
  { section:'Cuenta' },
  { key:'planes',     icon:'💳', label:'Mi Plan' },
  { key:'config',     icon:'⚙️', label:'Configuración' },
]

const ALUMNO_NAV = [
  { section: null },
  { key:'inicio',     icon:'🏠', label:'Inicio' },
  { key:'rutinas',    icon:'💪', label:'Mis Rutinas' },
  { key:'sesion',     icon:'▶', label:'Entrenar' },
  { key:'mensajes',   icon:'💬', label:'Mensajes', badge:'unread' },
  { section:'Mi progreso' },
  { key:'metricas',   icon:'📊', label:'Métricas' },
  { key:'historial',  icon:'📆', label:'Historial' },
  { key:'goals',      icon:'🎯', label:'Mis Objetivos' },
]

export default function AppLayout({ page, setPage, children }) {
  const { profile, org } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isProfe = profile?.role === 'profe'
  const nav = isProfe ? PROFE_NAV : ALUMNO_NAV
  const unread = notifs.filter(n => !n.leida).length

  useEffect(() => {
    if(!profile) return
    getNotificaciones(profile.id).then(setNotifs).catch(()=>{})
  }, [profile])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
    : '?'

  async function handleLogout() {
    await signOut()
  }

  async function handleOpenNotifs() {
    setShowNotifs(!showNotifs)
    if(!showNotifs && unread > 0) {
      await marcarLeidasAll(profile.id)
      setNotifs(prev => prev.map(n => ({ ...n, leida:true })))
    }
  }

  const planLabel = org?.plan_id ? org.plan_id.toUpperCase() : ''
  const trialDays = org?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at) - new Date()) / 86400000))
    : 0
  const isTrial = org?.plan_status === 'trialing'

  return (
    <div className="app-shell">
      {/* Overlay mobile */}
      {mobileOpen && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:190 }}
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-logo">CALFIT</span>
          {isProfe && <span className={`badge badge-plan-${org?.plan_id || 'starter'}`} style={{ fontSize:10 }}>
            {planLabel}
          </span>}
        </div>

        {isTrial && trialDays > 0 && (
          <div style={{ margin:'12px 16px', padding:'10px 12px', background:' rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--warning)' }}>
            ⏳ Trial: {trialDays} días restantes
            <button className="btn btn-sm" style={{ display:'block', marginTop:6, width:'100%', background:'var(--warning)', color:'var(--black)', fontSize:11 }}
              onClick={() => setPage('planes')}>
              Activar plan
            </button>
          </div>
        )}

        {/* Org name */}
        {isProfe && org && (
          <div style={{ padding:'8px 20px 0', fontSize:12, color:'var(--text-secondary)', fontWeight:500, letterSpacing:0.5 }}>
            {org.name}
          </div>
        )}

        <nav className="sidebar-nav">
          {nav.map((item, i) => {
            if(item.section !== undefined && item.section !== null) {
              return <div key={i} className="sidebar-section-label">{item.section}</div>
            }
            if(item.section === null) return null
            return (
              <div
                key={item.key}
                className={`nav-link ${page === item.key ? 'active' : ''}`}
                onClick={() => { setPage(item.key); setMobileOpen(false) }}
              >
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
                {item.badge === 'unread' && unread > 0 && (
                  <span className="nav-badge">{unread}</span>
                )}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div className="avatar avatar-sm">{initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.full_name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{isProfe ? 'Profesor' : 'Alumno'}</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width:'100%', fontSize:12 }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="btn btn-icon btn-surface" style={{ display:'none' }} onClick={() => setMobileOpen(true)}>
              ☰
            </button>
            <span className="page-heading" style={{ textTransform:'capitalize', letterSpacing:1 }}>
              {page}
            </span>
          </div>
          <div className="topbar-right">
            {/* Notificaciones */}
            <div style={{ position:'relative' }}>
              <button className="btn btn-icon btn-surface" onClick={handleOpenNotifs}>
                🔔
                {unread > 0 && (
                  <span style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:'var(--lime)', display:'block' }} />
                )}
              </button>
              {showNotifs && (
                <div style={{ position:'absolute', right:0, top:'110%', width:300, background:'var(--surface-1)', border:'1px solid var(--border-mid)', borderRadius:'var(--radius-md)', overflow:'hidden', zIndex:300 }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-dim)', fontSize:13, fontWeight:500 }}>Notificaciones</div>
                  {notifs.length === 0 ? (
                    <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Sin notificaciones</div>
                  ) : notifs.slice(0,8).map(n => (
                    <div key={n.id} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-dim)', background: n.leida ? 'transparent' : 'rgba(200,245,66,0.03)' }}>
                      <div style={{ fontSize:13, fontWeight: n.leida ? 400 : 500 }}>{n.titulo}</div>
                      {n.cuerpo && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{n.cuerpo}</div>}
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{new Date(n.created_at).toLocaleDateString('es')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="avatar avatar-sm">{initials}</div>
          </div>
        </header>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
