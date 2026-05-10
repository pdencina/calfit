import { useState, useEffect } from 'react'
import { signOut } from 'lib/supabase'
import {
  getPlatformKPIs, getOrgsOverview, getGrowthData,
  getAllUsers, cambiarPlanOrg, suspenderOrg, getRecentActivity
} from 'lib/platform'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

// ─── Helpers ────────────────────────────────────────────────────
const fmtUSD  = n => `$${Number(n || 0).toLocaleString('en-US')}`
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'
const mesLabel = d => new Date(d).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
const initials = (n = '') => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const diasDesde = d => d ? Math.floor((Date.now() - new Date(d)) / 86400000) : '—'

const PLAN_COLORS  = { starter: '#888', pro: '#c8f542', elite: '#fbbf24' }
const STATUS_COLORS = {
  trialing: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', label: 'Trial' },
  active:   { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', label: 'Activo' },
  past_due: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', label: 'Vencido' },
  canceled: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Cancelado' },
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.canceled
  return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 500 }}>{s.label}</span>
}

function PlanBadge({ plan }) {
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, letterSpacing: 1,
      background: plan === 'elite' ? 'rgba(251,191,36,0.1)' : plan === 'pro' ? 'rgba(200,245,66,0.1)' : 'rgba(255,255,255,0.05)',
      color: PLAN_COLORS[plan] || '#888' }}>
      {plan?.toUpperCase()}
    </span>
  )
}

function KPI({ label, value, sub, color = 'var(--lime)', icon }) {
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
      <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ─── Secciones ───────────────────────────────────────────────────

function SeccionOverview({ kpis, growth }) {
  const chartData = (growth || []).map(r => ({
    mes: mesLabel(r.mes),
    nuevas: Number(r.nuevas_orgs),
    activas: Number(r.orgs_activas),
  }))

  const mrr = Number(kpis?.mrr_plataforma_usd || 0)
  const arr  = mrr * 12

  return (
    <div className="anim-fadeup">
      <div className="page-title">PLATAFORMA</div>
      <div className="page-sub">Vista global de CALFIT PRO</div>

      {/* KPIs principales */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <KPI label="MRR plataforma"  value={fmtUSD(mrr)} sub={`ARR ${fmtUSD(arr)}`}             icon="💰" color="var(--lime)" />
        <KPI label="Profes activos"  value={kpis?.orgs_activas || 0} sub={`${kpis?.orgs_trial || 0} en trial`} icon="👨‍🏫" color="var(--info)" />
        <KPI label="Alumnos totales" value={kpis?.total_alumnos || 0} sub="En toda la plataforma"         icon="🏋️" color="var(--warning)" />
        <KPI label="Sesiones / 30d"  value={kpis?.sesiones_30d || 0} sub={`${kpis?.sesiones_comp_30d || 0} completadas`} icon="⚡" color="var(--success)" />
      </div>

      {/* Distribución planes */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { plan: 'starter', n: kpis?.orgs_starter || 0, price: 19 },
          { plan: 'pro',     n: kpis?.orgs_pro     || 0, price: 39 },
          { plan: 'elite',   n: kpis?.orgs_elite   || 0, price: 69 },
        ].map(({ plan, n, price }) => (
          <div key={plan} style={{ background: 'var(--surface-1)', border: `1px solid ${PLAN_COLORS[plan]}30`, borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <PlanBadge plan={plan} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>${price}/mes</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, color: PLAN_COLORS[plan], lineHeight: 1, margin: '10px 0 4px' }}>{n}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>organizaciones</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{fmtUSD(n * price)}/mes</div>
          </div>
        ))}
      </div>

      {/* Gráfico crecimiento */}
      {chartData.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Crecimiento de organizaciones
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c8f542" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c8f542" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fill: '#555', fontSize: 11 }} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="nuevas"  stroke="#c8f542" strokeWidth={2} fill="url(#gNew)" name="Nuevas" />
              <Area type="monotone" dataKey="activas" stroke="#4ade80" strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="Activas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function SeccionProfes({ onRefresh }) {
  const [orgs, setOrgs]         = useState([])
  const [filtro, setFiltro]     = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading]   = useState(true)
  const [accion, setAccion]     = useState(null) // { org, tipo }

  useEffect(() => {
    setLoading(true)
    getOrgsOverview(filtro).then(setOrgs).catch(() => setOrgs([])).finally(() => setLoading(false))
  }, [filtro])

  const filtrados = busqueda
    ? orgs.filter(o => o.org_name?.toLowerCase().includes(busqueda.toLowerCase()) || o.owner_email?.toLowerCase().includes(busqueda.toLowerCase()))
    : orgs

  async function handleCambiarPlan(org, plan) {
    await cambiarPlanOrg(org.org_id, plan)
    setOrgs(prev => prev.map(o => o.org_id === org.org_id ? { ...o, plan_id: plan, plan_status: 'active' } : o))
    setAccion(null)
    onRefresh()
  }

  async function handleSuspender(org) {
    if (!window.confirm(`¿Suspender la cuenta de ${org.owner_name}?`)) return
    await suspenderOrg(org.org_id)
    setOrgs(prev => prev.map(o => o.org_id === org.org_id ? { ...o, plan_status: 'canceled' } : o))
    onRefresh()
  }

  return (
    <div className="anim-fadeup">
      <div className="page-title">PROFESORES</div>
      <div className="page-sub">Todas las organizaciones en la plataforma</div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar por nombre o email..." style={{ maxWidth: 280 }} />
        {['', 'trial', 'active', 'canceled', 'starter', 'pro', 'elite'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} className={`btn btn-sm ${filtro === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11 }}>
            {f === '' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="loader"><div className="spinner" /></div>}

      {/* Tabla */}
      {!loading && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-dim)' }}>
                  {['Profesor', 'Plan', 'Estado', 'Alumnos', 'Sesiones 30d', 'Última activ.', 'Registrado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 400, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((o, i) => (
                  <tr key={o.org_id} style={{ borderBottom: i < filtrados.length - 1 ? '1px solid var(--border-dim)' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>{initials(o.owner_name)}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{o.owner_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.owner_email}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>{o.org_name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}><PlanBadge plan={o.plan_id} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={o.plan_status} />
                      {o.plan_status === 'trialing' && o.trial_ends_at && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                          {diasDesde(o.trial_ends_at) < 0 ? `${Math.abs(diasDesde(o.trial_ends_at))}d restantes` : 'Expirado'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--lime)' }}>{o.total_alumnos}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{o.sesiones_30d}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(o.ultima_sesion)}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(o.created_at)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => setAccion({ org: o, tipo: 'plan' })} title="Cambiar plan">📋</button>
                        {o.plan_status !== 'canceled' && (
                          <button className="btn btn-sm" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--danger)', border: 'none', borderRadius: 6, fontSize: 11, padding: '5px 8px' }}
                            onClick={() => handleSuspender(o)} title="Suspender">✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal cambiar plan */}
      {accion?.tipo === 'plan' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, marginBottom: 6 }}>CAMBIAR PLAN</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{accion.org.owner_name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {['starter', 'pro', 'elite'].map(plan => (
                <button key={plan} onClick={() => handleCambiarPlan(accion.org, plan)}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'space-between', borderColor: accion.org.plan_id === plan ? PLAN_COLORS[plan] : undefined, color: accion.org.plan_id === plan ? PLAN_COLORS[plan] : undefined }}>
                  <PlanBadge plan={plan} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {plan === 'starter' ? '$19' : plan === 'pro' ? '$39' : '$69'}/mes
                  </span>
                  {accion.org.plan_id === plan && <span style={{ fontSize: 11, color: PLAN_COLORS[plan] }}>✓ actual</span>}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setAccion(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SeccionUsuarios() {
  const [users, setUsers]     = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [filtroRol, setFiltroRol] = useState('')

  useEffect(() => {
    getAllUsers(busqueda).then(setUsers).catch(() => setUsers([])).finally(() => setLoading(false))
  }, [busqueda])

  const filtrados = filtroRol ? users.filter(u => u.role === filtroRol) : users

  const ROL_COLORS = {
    admin:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    profe:  { color: '#c8f542', bg: 'rgba(200,245,66,0.1)' },
    alumno: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  }

  return (
    <div className="anim-fadeup">
      <div className="page-title">USUARIOS</div>
      <div className="page-sub">Todos los registrados en la plataforma</div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar..." style={{ maxWidth: 280 }} />
        {['', 'admin', 'profe', 'alumno'].map(r => (
          <button key={r} onClick={() => setFiltroRol(r)} className={`btn btn-sm ${filtroRol === r ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11 }}>
            {r === '' ? 'Todos' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="loader"><div className="spinner" /></div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-dim)' }}>
                {['Usuario', 'Rol', 'Registrado', 'ID'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u, i) => {
                const rc = ROL_COLORS[u.role] || ROL_COLORS.alumno
                return (
                  <tr key={u.id} style={{ borderBottom: i < filtrados.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar avatar-sm" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(u.full_name)}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: rc.bg, color: rc.color, fontWeight: 500 }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}>{u.id?.slice(0, 8)}…</td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && !loading && (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SeccionActividad() {
  const [actividad, setActividad] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getRecentActivity().then(setActividad).catch(() => setActividad([])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="anim-fadeup">
      <div className="page-title">ACTIVIDAD</div>
      <div className="page-sub">Últimas sesiones en toda la plataforma</div>

      {loading && <div className="loader"><div className="spinner" /></div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {actividad.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < actividad.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.completada ? 'var(--success)' : 'var(--border-hi)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.alumno?.full_name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 6px' }}>en</span>
              <span style={{ fontSize: 12, color: 'var(--lime)' }}>{s.org?.name}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(s.created_at)}</div>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: s.completada ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.08)',
              color: s.completada ? 'var(--success)' : 'var(--warning)' }}>
              {s.completada ? '✓ Completada' : 'En progreso'}
            </span>
          </div>
        ))}
        {actividad.length === 0 && !loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sin actividad reciente</div>
        )}
      </div>
    </div>
  )
}

// ─── Layout Admin ────────────────────────────────────────────────
const TABS = [
  { key: 'overview',  icon: '⚡', label: 'Overview' },
  { key: 'profes',    icon: '👨‍🏫', label: 'Profesores' },
  { key: 'usuarios',  icon: '👥', label: 'Usuarios' },
  { key: 'actividad', icon: '📡', label: 'Actividad' },
]

export default function PlatformAdminDashboard() {
  const [tab, setTab]     = useState('overview')
  const [kpis, setKpis]   = useState({})
  const [growth, setGrowth] = useState([])

  useEffect(() => { loadBase() }, [])

  async function loadBase() {
    const [k, g] = await Promise.all([getPlatformKPIs(), getGrowthData()])
    setKpis(k || {})
    setGrowth(g || [])
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>

      {/* Topbar */}
      <header style={{ height: 'var(--topbar-h)', background: 'var(--surface-0)', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: 4, color: 'var(--lime)' }}>CALFIT</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(251,191,36,0.1)', color: 'var(--warning)', letterSpacing: 1, fontWeight: 600 }}>ADMIN</span>
        </div>
        <button onClick={signOut} style={{ background: 'none', border: '1px solid var(--border-mid)', color: 'var(--text-muted)', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Salir
        </button>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>

        {/* Sub-nav */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border-dim)', overflowX: 'auto', paddingBottom: 1 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none', padding: '10px 18px', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 500 : 400,
              color: tab === t.key ? 'var(--lime)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${tab === t.key ? 'var(--lime)' : 'transparent'}`,
              whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview'  && <SeccionOverview kpis={kpis} growth={growth} />}
        {tab === 'profes'    && <SeccionProfes onRefresh={loadBase} />}
        {tab === 'usuarios'  && <SeccionUsuarios />}
        {tab === 'actividad' && <SeccionActividad />}
      </div>
    </div>
  )
}
