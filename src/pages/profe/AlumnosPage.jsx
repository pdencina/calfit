import { useState, useEffect } from 'react'
import { useAuth } from 'contexts/AuthContext'
import { getAlumnos, addAlumnoToOrg, getMetricasAlumno, getSesionesAlumno, insertMetrica } from 'lib/supabase'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

function Sparkline({ data, dataKey, color='#c8f542' }) {
  if(!data || data.length < 2) return <div style={{ height:40, display:'flex', alignItems:'center', color:'var(--text-muted)', fontSize:11 }}>Sin datos</div>
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false}/>
        <Tooltip contentStyle={{ background:'#1e1e1e', border:'1px solid #333', borderRadius:6, fontSize:11 }} labelStyle={{display:'none'}}/>
      </LineChart>
    </ResponsiveContainer>
  )
}

function MetricaModal({ alumno, orgId, onClose, onSaved }) {
  const [form, setForm] = useState({ peso_kg:'', grasa_pct:'', musculo_pct:'', cintura_cm:'', pecho_cm:'', notas:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { user_id:alumno.id, org_id:orgId }
      Object.entries(form).forEach(([k,v]) => { if(v !== '') payload[k] = parseFloat(v) || v })
      await insertMetrica(payload)
      onSaved()
    } catch(err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div className="card" style={{ width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-display)',fontSize:22,letterSpacing:2 }}>NUEVA MÉTRICA</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:16 }}>Alumno: <strong>{alumno.full_name}</strong></div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Peso (kg)</label><input type="number" step="0.1" value={form.peso_kg} onChange={e => setForm(p=>({...p,peso_kg:e.target.value}))} placeholder="75.5"/></div>
            <div className="form-group"><label>% Grasa</label><input type="number" step="0.1" value={form.grasa_pct} onChange={e => setForm(p=>({...p,grasa_pct:e.target.value}))} placeholder="18.5"/></div>
            <div className="form-group"><label>% Músculo</label><input type="number" step="0.1" value={form.musculo_pct} onChange={e => setForm(p=>({...p,musculo_pct:e.target.value}))} placeholder="42"/></div>
            <div className="form-group"><label>Cintura (cm)</label><input type="number" step="0.1" value={form.cintura_cm} onChange={e => setForm(p=>({...p,cintura_cm:e.target.value}))} placeholder="82"/></div>
            <div className="form-group"><label>Pecho (cm)</label><input type="number" step="0.1" value={form.pecho_cm} onChange={e => setForm(p=>({...p,pecho_cm:e.target.value}))} placeholder="96"/></div>
          </div>
          <div className="form-group"><label>Notas</label><textarea value={form.notas} onChange={e => setForm(p=>({...p,notas:e.target.value}))} placeholder="Observaciones del profe..."/></div>
          <div style={{ display:'flex',gap:8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar métricas'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AlumnosPage({ setPage, setSelectedAlumno }) {
  const { profile, org } = useAuth()
  const [alumnos, setAlumnos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteErr, setInviteErr] = useState('')
  const [inviteOk, setInviteOk]  = useState('')
  const [metricaFor, setMetricaFor] = useState(null)
  const [alumnoData, setAlumnoData] = useState({}) // { [uid]: {metrics, sesiones} }

  useEffect(() => { if(org) load() }, [org])

  async function load() {
    setLoading(true)
    const data = await getAlumnos(org.id).catch(()=>[])
    setAlumnos(data)
    // cargar datos de cada alumno en paralelo
    const entries = await Promise.all(data.map(async a => {
      const [metrics, sesiones] = await Promise.all([
        getMetricasAlumno(a.id, 10).catch(()=>[]),
        getSesionesAlumno(a.id, 30).catch(()=>[]),
      ])
      return [a.id, { metrics: metrics.reverse(), sesiones }]
    }))
    setAlumnoData(Object.fromEntries(entries))
    setLoading(false)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviting(true); setInviteErr(''); setInviteOk('')
    try {
      await addAlumnoToOrg(org.id, inviteEmail, profile.id)
      setInviteOk(`✓ ${inviteEmail} agregado correctamente`)
      setInviteEmail('')
      await load()
    } catch(err) { setInviteErr(err.message) }
    finally { setInviting(false) }
  }

  const filtered = alumnos.filter(a => a.full_name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()))

  const maxAlumnos = org?.plans?.max_alumnos || 10

  return (
    <div className="anim-fadeup">
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:24 }}>
        <div>
          <div className="page-title">MIS ALUMNOS</div>
          <div className="page-sub">{alumnos.length} de {maxAlumnos} alumnos en tu plan</div>
        </div>
      </div>

      {/* Invite */}
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ fontSize:13,fontWeight:500,marginBottom:12,color:'var(--text-secondary)',letterSpacing:1,textTransform:'uppercase' }}>
          Agregar alumno
        </div>
        {inviteErr && <div className="alert alert-error">{inviteErr}</div>}
        {inviteOk  && <div className="alert alert-success">{inviteOk}</div>}
        <form onSubmit={handleInvite} style={{ display:'flex',gap:10,alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <label>Email del alumno</label>
            <input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="alumno@email.com" required/>
          </div>
          <button type="submit" className="btn btn-primary" disabled={inviting || alumnos.length >= maxAlumnos}>
            {alumnos.length >= maxAlumnos ? 'Límite alcanzado' : inviting ? 'Agregando...' : 'Agregar'}
          </button>
        </form>
        {alumnos.length >= maxAlumnos && (
          <div style={{ fontSize:12,color:'var(--warning)',marginTop:8 }}>
            Llegaste al límite de tu plan. <button className="btn btn-sm" style={{ color:'var(--warning)',textDecoration:'underline',background:'none',border:'none',padding:0 }} onClick={()=>setPage('planes')}>Mejorar plan →</button>
          </div>
        )}
      </div>

      {/* Buscador */}
      <div style={{ marginBottom:20 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar alumno..." style={{ maxWidth:320 }}/>
      </div>

      {loading && <div className="loader"><div className="spinner"/>Cargando alumnos...</div>}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">👥</div>
          <div className="empty-title">SIN ALUMNOS</div>
          <div className="empty-sub">Agregá tu primer alumno arriba</div>
        </div>
      )}

      {/* Cards alumnos */}
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {filtered.map(a => {
          const d = alumnoData[a.id] || {}
          const metrics = d.metrics || []
          const sesiones = d.sesiones || []
          const ultimaMet = metrics[metrics.length-1]
          const sesComp = sesiones.filter(s=>s.completada).length
          const tasa = sesiones.length ? Math.round(sesComp/sesiones.length*100) : 0
          const initials = a.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
          const ultimaSesion = sesiones[0]
          const diasSinEntrenar = ultimaSesion
            ? Math.floor((new Date() - new Date(ultimaSesion.fecha)) / 86400000)
            : null

          return (
            <div key={a.id} className="card card-hover" style={{ display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:16,alignItems:'center' }}>
              <div className="avatar avatar-lg">{initials}</div>

              <div>
                <div style={{ fontSize:15,fontWeight:600 }}>{a.full_name}</div>
                <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>{a.email}</div>
                <div style={{ display:'flex',gap:8,marginTop:6,flexWrap:'wrap' }}>
                  {ultimaMet?.peso_kg && <span className="badge badge-lime">⚖️ {ultimaMet.peso_kg} kg</span>}
                  {ultimaMet?.grasa_pct && <span className="badge badge-warning">🔥 {ultimaMet.grasa_pct}% grasa</span>}
                  {diasSinEntrenar !== null && (
                    <span className={`badge ${diasSinEntrenar > 7 ? 'badge-fallo' : 'badge-series'}`}>
                      {diasSinEntrenar === 0 ? '✓ Entrenó hoy' : `${diasSinEntrenar}d sin entrenar`}
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline peso */}
              <div style={{ width:120 }}>
                <div style={{ fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:2 }}>Peso</div>
                <Sparkline data={metrics} dataKey="peso_kg"/>
              </div>

              {/* Stats */}
              <div style={{ display:'flex',gap:20,alignItems:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)',fontSize:28,color:'var(--lime)',lineHeight:1 }}>{sesComp}</div>
                  <div style={{ fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1 }}>sesiones</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-display)',fontSize:28,color: tasa >= 70 ? 'var(--success)' : tasa >= 40 ? 'var(--warning)' : 'var(--danger)',lineHeight:1 }}>{tasa}%</div>
                  <div style={{ fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1 }}>tasa</div>
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                  <button className="btn btn-sm btn-surface" onClick={() => setMetricaFor(a)}>📊 Métrica</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setSelectedAlumno(a); setPage('rutinas') }}>📋 Rutinas</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {metricaFor && (
        <MetricaModal
          alumno={metricaFor}
          orgId={org.id}
          onClose={() => setMetricaFor(null)}
          onSaved={() => { setMetricaFor(null); load() }}
        />
      )}
    </div>
  )
}
