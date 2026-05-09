import { useEffect, useState } from 'react'
import { useAuth } from 'contexts/AuthContext'
import { getDashboardProfe } from 'lib/supabase'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardProfe({ setPage }) {
  const { profile, org } = useAuth()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if(!org) return
    getDashboardProfe(org.id).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [org])

  if(loading) return <div className="loader"><div className="spinner"/>Cargando dashboard...</div>
  if(!data)   return <div className="empty"><div className="empty-title">Sin datos</div></div>

  const { alumnos, sesiones } = data

  // Sesiones por día (últimos 14 días)
  const sesionesChart = Array.from({length:14}, (_,i) => {
    const d = subDays(new Date(), 13-i)
    const key = format(d, 'yyyy-MM-dd')
    const count = sesiones.filter(s => s.fecha === key).length
    const comp  = sesiones.filter(s => s.fecha === key && s.completada).length
    return { dia: format(d,'dd/MM'), total:count, completadas:comp }
  })

  const activos = alumnos.filter(a => {
    const ultima = sesiones.find(s => s.alumno_id === a.id)
    if(!ultima) return false
    return (new Date() - new Date(ultima.fecha)) < 7*86400000
  }).length

  const sesCompletadas = sesiones.filter(s => s.completada).length
  const tasaCompletion = sesiones.length ? Math.round(sesCompletadas/sesiones.length*100) : 0

  // Top alumnos por sesiones
  const alumnoSesiones = alumnos.map(a => ({
    nombre: a.full_name.split(' ')[0],
    sesiones: sesiones.filter(s => s.alumno_id === a.id && s.completada).length
  })).sort((a,b) => b.sesiones - a.sesiones).slice(0,5)

  const isTrial = org?.plan_status === 'trialing'
  const trialDays = org?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at) - new Date()) / 86400000))
    : 0

  return (
    <div className="anim-fadeup">
      {/* Banner trial */}
      {isTrial && (
        <div style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:'var(--radius-md)', padding:'14px 20px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:'var(--warning)' }}>⏳ Período de prueba — {trialDays} días restantes</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>Activá tu plan para no perder acceso y seguir creciendo</div>
          </div>
          <button className="btn btn-sm" style={{ background:'var(--warning)', color:'var(--black)', fontWeight:600 }} onClick={() => setPage('planes')}>
            Ver planes
          </button>
        </div>
      )}

      <div className="page-title">DASHBOARD</div>
      <div className="page-sub">
        {format(new Date(), "EEEE d 'de' MMMM, yyyy", {locale:es}).replace(/^\w/, c => c.toUpperCase())}
      </div>

      {/* KPIs */}
      <div className="grid-4 stagger-1 anim-fadeup" style={{ marginBottom:24 }}>
        {[
          { label:'Alumnos totales',   value:alumnos.length,     sub:`${activos} activos esta semana`, color:'var(--lime)' },
          { label:'Sesiones (30d)',    value:sesiones.length,    sub:`${sesCompletadas} completadas`, color:'var(--info)' },
          { label:'Tasa de éxito',     value:`${tasaCompletion}%`, sub:'Sesiones completadas', color:'var(--success)' },
          { label:'Plan actual',       value:org?.plan_id?.toUpperCase() || 'STARTER', sub: isTrial ? `Trial: ${trialDays}d` : 'Activo', color:'var(--warning)' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom:24, alignItems:'start' }}>
        {/* Chart sesiones */}
        <div className="card stagger-2 anim-fadeup">
          <div style={{ fontSize:13, fontWeight:500, marginBottom:16, color:'var(--text-secondary)', letterSpacing:1, textTransform:'uppercase' }}>
            Actividad — últimas 2 semanas
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={sesionesChart}>
              <defs>
                <linearGradient id="gLime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c8f542" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#c8f542" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" tick={{fill:'#555',fontSize:10}}/>
              <YAxis tick={{fill:'#555',fontSize:10}} allowDecimals={false}/>
              <Tooltip contentStyle={{ background:'#1e1e1e', border:'1px solid #333', borderRadius:8, fontSize:12 }} labelStyle={{color:'#a0a0a0'}} />
              <Area type="monotone" dataKey="completadas" stroke="#c8f542" strokeWidth={2} fill="url(#gLime)" name="Completadas"/>
              <Area type="monotone" dataKey="total" stroke="#555" strokeWidth={1} fill="none" name="Iniciadas"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top alumnos */}
        <div className="card stagger-3 anim-fadeup">
          <div style={{ fontSize:13, fontWeight:500, marginBottom:16, color:'var(--text-secondary)', letterSpacing:1, textTransform:'uppercase' }}>
            Top alumnos (sesiones completadas)
          </div>
          {alumnoSesiones.length === 0 ? (
            <div className="empty" style={{ padding:'20px 0' }}>
              <div className="empty-sub">Aún no hay sesiones registradas</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={alumnoSesiones} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#555',fontSize:10}} allowDecimals={false}/>
                <YAxis type="category" dataKey="nombre" tick={{fill:'#a0a0a0',fontSize:12}} width={70}/>
                <Tooltip contentStyle={{ background:'#1e1e1e', border:'1px solid #333', borderRadius:8, fontSize:12 }} />
                <Bar dataKey="sesiones" fill="#c8f542" radius={[0,4,4,0]} name="Sesiones"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="card stagger-4 anim-fadeup">
        <div style={{ fontSize:13, fontWeight:500, marginBottom:16, color:'var(--text-secondary)', letterSpacing:1, textTransform:'uppercase' }}>
          Actividad reciente
        </div>
        {sesiones.slice(0,8).map((s,i) => (
          <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < 7 ? '1px solid var(--border-dim)' : 'none' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: s.completada ? 'var(--success)' : 'var(--border-hi)', flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:13, fontWeight:500 }}>{s.profiles?.full_name}</span>
              <span style={{ fontSize:12, color:'var(--text-secondary)', marginLeft:6 }}>{s.rutinas?.nombre}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              {new Date(s.fecha).toLocaleDateString('es-AR', {day:'numeric',month:'short'})}
            </div>
            <span className={`badge ${s.completada ? 'badge-series' : 'badge-warning'}`}>
              {s.completada ? 'Completada' : 'En progreso'}
            </span>
          </div>
        ))}
        {sesiones.length === 0 && (
          <div className="empty" style={{ padding:'20px 0' }}>
            <div className="empty-sub">Aún no hay actividad registrada</div>
          </div>
        )}
      </div>
    </div>
  )
}
