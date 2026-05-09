import { useState, useEffect, useCallback } from 'react'
import { useAuth } from 'contexts/AuthContext'
import { getAlumnos } from 'lib/supabase'
import {
  getKPIsAdmin, getCuotas, getDeudores, getServicios,
  getContratos, createContrato, createCuota, marcarPagada,
  generarCuotasMensuales, getResumenFinanciero,
  getTurnosSemana, createTurno, updateTurno,
  crearPreferenciaMercadoPago
} from 'lib/admin'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

// ─── Helpers ────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'
const mesLabel = (iso) => new Date(iso).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const ESTADO_COLORS = {
  pagado:    { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', label: 'Pagado' },
  pendiente: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', label: 'Pendiente' },
  vencido:   { bg: 'rgba(248,113,113,0.1)', color: '#f87171', label: 'Vencido' },
  cancelado: { bg: 'rgba(100,100,100,0.1)', color: '#888',    label: 'Cancelado' },
}

// ─── Sub-componentes ─────────────────────────────────────────────

function KPICard({ label, value, sub, color = 'var(--lime)', icon }) {
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 22, opacity: 0.4 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color, lineHeight: 1, marginTop: 10 }}>{value}</div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function EstadoBadge({ estado }) {
  const s = ESTADO_COLORS[estado] || ESTADO_COLORS.cancelado
  return <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 500 }}>{s.label}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Secciones ───────────────────────────────────────────────────

function SeccionResumen({ orgId }) {
  const [kpis, setKpis]   = useState({})
  const [chart, setChart] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getKPIsAdmin(orgId), getResumenFinanciero(orgId)])
      .then(([k, r]) => {
        setKpis(k)
        setChart((r || []).reverse().map(row => ({
          mes: mesLabel(row.mes),
          cobrado: Number(row.total_cobrado || 0),
          pendiente: Number(row.total_por_cobrar || 0),
        })))
      }).catch(console.error).finally(() => setLoading(false))
  }, [orgId])

  if (loading) return <div className="loader"><div className="spinner" />Cargando...</div>

  return (
    <div className="anim-fadeup">
      <div className="page-title">ADMINISTRACIÓN</div>
      <div className="page-sub">Resumen financiero de tu negocio</div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <KPICard label="Ingresos del mes"    value={fmt(kpis.ingresosDelMes)}  icon="💰" color="var(--lime)" sub="Cuotas cobradas" />
        <KPICard label="Por cobrar"          value={fmt(kpis.porCobrarDelMes)} icon="⏳" color="var(--warning)" sub="Cuotas pendientes" />
        <KPICard label="Alumnos activos"     value={kpis.alumnosActivos || 0}  icon="👥" color="var(--info)" sub="Con contrato vigente" />
        <KPICard label="Deuda total"         value={fmt(kpis.totalDeuda)}      icon="⚠️" color="var(--danger)" sub={`${kpis.cantDeudores || 0} alumnos`} />
      </div>

      {chart.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>Ingresos últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c8f542" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c8f542" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fill: '#555', fontSize: 11 }} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="cobrado"   stroke="#c8f542" strokeWidth={2} fill="url(#gc)" name="Cobrado" />
              <Area type="monotone" dataKey="pendiente" stroke="#fbbf24" strokeWidth={1.5} fill="none"  name="Pendiente" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function SeccionCuotas({ orgId }) {
  const [cuotas, setCuotas]   = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroMes, setFiltroMes]       = useState('')
  const [loading, setLoading]           = useState(true)
  const [generando, setGenerando]       = useState(false)
  const [pagoModal, setPagoModal]       = useState(null)
  const [metodoPago, setMetodoPago]     = useState('transferencia')
  const [guardando, setGuardando]       = useState(false)
  const [msg, setMsg]                   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getCuotas(orgId, {
      estado: filtroEstado || undefined,
      mes: filtroMes || undefined,
    }).catch(() => [])
    setCuotas(data)
    setLoading(false)
  }, [orgId, filtroEstado, filtroMes])

  useEffect(() => { load() }, [load])

  async function handleGenerarCuotas() {
    if (!window.confirm('¿Generar cuotas del próximo mes para todos los contratos activos?')) return
    setGenerando(true)
    try {
      const gen = await generarCuotasMensuales(orgId)
      setMsg(`✓ ${gen.length} cuotas generadas`)
      load()
    } catch (e) { setMsg('Error: ' + e.message) }
    finally { setGenerando(false) }
  }

  async function handleMarcarPagada() {
    if (!pagoModal) return
    setGuardando(true)
    try {
      await marcarPagada(pagoModal.id, metodoPago)
      setMsg('✓ Cuota marcada como pagada')
      setPagoModal(null)
      load()
    } catch (e) { setMsg('Error: ' + e.message) }
    finally { setGuardando(false) }
  }

  async function handleMercadoPago(cuota) {
    try {
      const { init_point } = await crearPreferenciaMercadoPago(cuota.id, cuota.alumno?.email, cuota.monto, cuota.concepto)
      window.open(init_point, '_blank')
    } catch (e) {
      alert('Para activar Mercado Pago necesitás configurar la Edge Function mp-create-preference. Ver GUIA_MERCADOPAGO.md')
    }
  }

  const mesActual = new Date().toISOString().slice(0, 7)
  if (!filtroMes && !filtroEstado) {
    // filtro por defecto = mes actual
  }

  return (
    <div className="anim-fadeup">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div className="page-title">CUOTAS</div>
          <div className="page-sub">Gestión de cobros</div>
        </div>
        <button className="btn btn-primary" onClick={handleGenerarCuotas} disabled={generando}>
          {generando ? 'Generando...' : '⚡ Generar cuotas del mes'}
        </button>
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="vencido">Vencido</option>
          <option value="pagado">Pagado</option>
        </select>
        <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ width: 'auto' }} />
        <button className="btn btn-ghost btn-sm" onClick={() => { setFiltroEstado(''); setFiltroMes('') }}>Limpiar</button>
      </div>

      {loading && <div className="loader"><div className="spinner" /></div>}

      {!loading && cuotas.length === 0 && (
        <div className="empty"><div className="empty-icon">💳</div><div className="empty-title">SIN CUOTAS</div><div className="empty-sub">Generá las cuotas del mes para empezar</div></div>
      )}

      {/* Tabla cuotas */}
      {!loading && cuotas.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--surface-2)' }}>
                  {['Alumno', 'Concepto', 'Monto', 'Vencimiento', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cuotas.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < cuotas.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar avatar-sm" style={{ width: 28, height: 28, fontSize: 10 }}>{initials(c.alumno?.full_name)}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{c.alumno?.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.alumno?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{c.concepto}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--lime)' }}>{fmt(c.monto)}</td>
                    <td style={{ padding: '12px 16px', color: c.estado === 'vencido' ? 'var(--danger)' : 'var(--text-secondary)' }}>{fmtDate(c.fecha_vencimiento)}</td>
                    <td style={{ padding: '12px 16px' }}><EstadoBadge estado={c.estado} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.estado !== 'pagado' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-ghost" onClick={() => setPagoModal(c)} title="Marcar pagada manualmente">✓ Cobrado</button>
                          <button className="btn btn-sm" style={{ background: '#009ee3', color: '#fff', fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none' }}
                            onClick={() => handleMercadoPago(c)} title="Enviar link de pago MP">
                            MP 💳
                          </button>
                        </div>
                      )}
                      {c.estado === 'pagado' && <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ {fmtDate(c.fecha_pago)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagoModal && (
        <Modal title="REGISTRAR PAGO" onClose={() => setPagoModal(null)}>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{pagoModal.alumno?.full_name}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--lime)', marginTop: 4 }}>{fmt(pagoModal.monto)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pagoModal.concepto}</div>
          </div>
          <div className="form-group">
            <label>Método de pago</label>
            <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="efectivo">Efectivo</option>
              <option value="mercadopago">Mercado Pago (manual)</option>
              <option value="stripe">Stripe (manual)</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleMarcarPagada} disabled={guardando} style={{ flex: 1 }}>
              {guardando ? 'Guardando...' : '✓ Confirmar pago'}
            </button>
            <button className="btn btn-ghost" onClick={() => setPagoModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SeccionDeudores({ orgId }) {
  const [deudores, setDeudores] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getDeudores(orgId).then(setDeudores).catch(() => setDeudores([])).finally(() => setLoading(false))
  }, [orgId])

  const totalDeuda = deudores.reduce((s, d) => s + Number(d.deuda_total), 0)

  return (
    <div className="anim-fadeup">
      <div className="page-title">DEUDORES</div>
      <div className="page-sub">{deudores.length} alumnos con cuotas vencidas · Deuda total {fmt(totalDeuda)}</div>

      {loading && <div className="loader"><div className="spinner" /></div>}

      {!loading && deudores.length === 0 && (
        <div className="empty"><div className="empty-icon">🎉</div><div className="empty-title">SIN DEUDORES</div><div className="empty-sub">Todos los alumnos están al día</div></div>
      )}

      {deudores.map((d, i) => (
        <div key={d.alumno_id} className={`card anim-fadeup stagger-${Math.min(i + 1, 4)}`}
          style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, borderColor: Number(d.deuda_total) > 10000 ? 'rgba(248,113,113,0.3)' : undefined }}>
          <div className="avatar avatar-md">{initials(d.full_name)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{d.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{d.email}</div>
            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
              Desde {fmtDate(d.vencimiento_mas_antiguo)} · {d.cuotas_adeudadas} cuota{d.cuotas_adeudadas > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--danger)', lineHeight: 1 }}>{fmt(d.deuda_total)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>deuda total</div>
          </div>
          <button className="btn btn-sm" style={{ background: '#009ee3', color: '#fff', border: 'none', borderRadius: 6 }}
            onClick={() => alert(`Enviá el link de pago a ${d.email} desde la sección Cuotas`)}>
            Cobrar MP
          </button>
        </div>
      ))}
    </div>
  )
}

function SeccionAgenda({ orgId, profeId }) {
  const [semana, setSemana]   = useState(() => {
    const hoy = new Date()
    hoy.setDate(hoy.getDate() - hoy.getDay() + 1) // lunes
    return hoy.toISOString().split('T')[0]
  })
  const [turnos, setTurnos]   = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({ alumno_id: '', fecha: '', hora_inicio: '08:00', hora_fin: '09:00', tipo: 'individual', notas: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    Promise.all([getTurnosSemana(orgId, semana), getAlumnos(orgId)])
      .then(([t, a]) => { setTurnos(t || []); setAlumnos(a || []) })
      .catch(console.error).finally(() => setLoading(false))
  }, [orgId, semana])

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  function navSemana(dir) {
    const d = new Date(semana + 'T12:00:00')
    d.setDate(d.getDate() + dir * 7)
    setSemana(d.toISOString().split('T')[0])
  }

  async function handleCrearTurno(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const t = await createTurno(orgId, profeId, { ...form })
      const alumno = alumnos.find(a => a.id === form.alumno_id)
      setTurnos(prev => [...prev, { ...t, alumno }])
      setModal(false)
      setForm({ alumno_id: '', fecha: '', hora_inicio: '08:00', hora_fin: '09:00', tipo: 'individual', notas: '' })
    } catch (e) { alert(e.message) }
    finally { setGuardando(false) }
  }

  async function handleCancelar(id) {
    await updateTurno(id, { estado: 'cancelado' })
    setTurnos(prev => prev.map(t => t.id === id ? { ...t, estado: 'cancelado' } : t))
  }

  const TIPO_COLORS = { individual: '#c8f542', grupal: '#60a5fa', online: '#a78bfa' }

  return (
    <div className="anim-fadeup">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">AGENDA</div>
          <div className="page-sub">Turnos y clases</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo turno</button>
      </div>

      {/* Navegación semana */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navSemana(-1)}>← Anterior</button>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1, textAlign: 'center' }}>
          {new Date(semana + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} —
          {new Date(diasSemana[6] + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => navSemana(1)}>Siguiente →</button>
      </div>

      {loading && <div className="loader"><div className="spinner" /></div>}

      {/* Grid semanal */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {diasSemana.map(fecha => {
            const d = new Date(fecha + 'T12:00:00')
            const esFin = d.getDay() === 0 || d.getDay() === 6
            const esHoy = fecha === new Date().toISOString().split('T')[0]
            const turnosDia = turnos.filter(t => t.fecha === fecha && t.estado !== 'cancelado')
            return (
              <div key={fecha} style={{ minHeight: 120, background: esFin ? 'rgba(255,255,255,0.02)' : 'var(--surface-1)', border: `1px solid ${esHoy ? 'rgba(200,245,66,0.4)' : 'var(--border-dim)'}`, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: esHoy ? 'var(--lime)' : 'var(--text-muted)', marginBottom: 6, fontWeight: esHoy ? 600 : 400 }}>
                  {DIAS[d.getDay()]} {d.getDate()}
                </div>
                {turnosDia.map(t => (
                  <div key={t.id} style={{ background: `${TIPO_COLORS[t.tipo]}15`, border: `1px solid ${TIPO_COLORS[t.tipo]}40`, borderRadius: 6, padding: '4px 6px', marginBottom: 4, cursor: 'pointer' }}
                    onClick={() => { if (window.confirm(`Cancelar turno de ${t.alumno?.full_name}?`)) handleCancelar(t.id) }}>
                    <div style={{ fontSize: 10, color: TIPO_COLORS[t.tipo], fontWeight: 500 }}>{t.hora_inicio?.slice(0, 5)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.alumno?.full_name?.split(' ')[0]}</div>
                  </div>
                ))}
                {turnosDia.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12, opacity: 0.4 }}>libre</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title="NUEVO TURNO" onClose={() => setModal(false)}>
          <form onSubmit={handleCrearTurno}>
            <div className="form-group">
              <label>Alumno</label>
              <select value={form.alumno_id} onChange={e => setForm(p => ({ ...p, alumno_id: e.target.value }))} required>
                <option value="">Seleccioná un alumno</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Fecha</label><input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} required /></div>
              <div className="form-group"><label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="individual">Individual</option>
                  <option value="grupal">Grupal</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="form-group"><label>Inicio</label><input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))} required /></div>
              <div className="form-group"><label>Fin</label><input type="time" value={form.hora_fin} onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))} required /></div>
            </div>
            <div className="form-group"><label>Notas (opcional)</label><input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Objetivo de la clase..." /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={guardando} style={{ flex: 1 }}>
                {guardando ? 'Guardando...' : 'Crear turno'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function SeccionContratos({ orgId, profeId }) {
  const [contratos, setContratos] = useState([])
  const [servicios, setServicios] = useState([])
  const [alumnos, setAlumnos]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({ alumno_id: '', servicio_id: '', precio_acordado: '', descuento_pct: 0, fecha_inicio: new Date().toISOString().split('T')[0], notas: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    Promise.all([getContratos(orgId), getServicios(orgId), getAlumnos(orgId)])
      .then(([c, s, a]) => { setContratos(c || []); setServicios(s || []); setAlumnos(a || []) })
      .catch(console.error).finally(() => setLoading(false))
  }, [orgId])

  function onServicioChange(sid) {
    const serv = servicios.find(s => s.id === parseInt(sid))
    setForm(p => ({ ...p, servicio_id: sid, precio_acordado: serv ? serv.precio : '' }))
  }

  async function handleCrear(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const c = await createContrato(orgId, form.alumno_id, parseInt(form.servicio_id), {
        precio_acordado: parseFloat(form.precio_acordado),
        descuento_pct: parseInt(form.descuento_pct),
        fecha_inicio: form.fecha_inicio,
        notas: form.notas,
      })
      setContratos(prev => [c, ...prev])
      setModal(false)
    } catch (e) { alert(e.message) }
    finally { setGuardando(false) }
  }

  const TIPO_LABEL = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual', pack: 'Pack', unico: 'Único' }
  const ESTADO_C = { activo: { color: 'var(--success)', bg: 'rgba(74,222,128,0.1)' }, pausado: { color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)' }, cancelado: { color: 'var(--danger)', bg: 'rgba(248,113,113,0.1)' } }

  return (
    <div className="anim-fadeup">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div><div className="page-title">CONTRATOS</div><div className="page-sub">Alumno · Servicio · Precio acordado</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo contrato</button>
      </div>

      {loading && <div className="loader"><div className="spinner" /></div>}

      {!loading && contratos.length === 0 && (
        <div className="empty"><div className="empty-icon">📄</div><div className="empty-title">SIN CONTRATOS</div><div className="empty-sub">Creá el primer contrato para un alumno</div></div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contratos.map((c, i) => {
          const est = ESTADO_C[c.estado] || ESTADO_C.cancelado
          return (
            <div key={c.id} className={`card stagger-${Math.min(i + 1, 4)} anim-fadeup`} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar avatar-md">{initials(c.alumno?.full_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{c.alumno?.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {c.servicio?.nombre} · {TIPO_LABEL[c.servicio?.tipo]} · desde {fmtDate(c.fecha_inicio)}
                </div>
              </div>
              {c.descuento_pct > 0 && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(200,245,66,0.1)', color: 'var(--lime)' }}>-{c.descuento_pct}%</span>
              )}
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--lime)' }}>{fmt(c.precio_acordado)}</div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: est.bg, color: est.color, fontWeight: 500 }}>{c.estado}</span>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title="NUEVO CONTRATO" onClose={() => setModal(false)}>
          <form onSubmit={handleCrear}>
            <div className="form-group">
              <label>Alumno</label>
              <select value={form.alumno_id} onChange={e => setForm(p => ({ ...p, alumno_id: e.target.value }))} required>
                <option value="">Seleccioná un alumno</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Servicio</label>
              <select value={form.servicio_id} onChange={e => onServicioChange(e.target.value)} required>
                <option value="">Seleccioná un servicio</option>
                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} — {fmt(s.precio)}/{s.tipo}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Precio acordado ($)</label><input type="number" step="0.01" value={form.precio_acordado} onChange={e => setForm(p => ({ ...p, precio_acordado: e.target.value }))} required /></div>
              <div className="form-group"><label>Descuento (%)</label><input type="number" min="0" max="100" value={form.descuento_pct} onChange={e => setForm(p => ({ ...p, descuento_pct: e.target.value }))} /></div>
              <div className="form-group"><label>Inicio</label><input type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} required /></div>
            </div>
            <div className="form-group"><label>Notas</label><textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Observaciones del acuerdo..." /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={guardando} style={{ flex: 1 }}>
                {guardando ? 'Guardando...' : 'Crear contrato'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────
const TABS_ADMIN = [
  { key: 'resumen',   icon: '📊', label: 'Resumen' },
  { key: 'cuotas',    icon: '💳', label: 'Cuotas' },
  { key: 'deudores',  icon: '⚠️', label: 'Deudores' },
  { key: 'contratos', icon: '📄', label: 'Contratos' },
  { key: 'agenda',    icon: '📅', label: 'Agenda' },
]

export default function AdminPage() {
  const { profile, org } = useAuth()
  const [tab, setTab] = useState('resumen')

  if (!org) return (
    <div className="empty"><div className="empty-title">SIN ORGANIZACIÓN</div><div className="empty-sub">Completá tu registro como profesor primero</div></div>
  )

  return (
    <div>
      {/* Sub-navegación */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border-dim)', overflowX: 'auto', paddingBottom: 1 }}>
        {TABS_ADMIN.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 500 : 400,
            color: tab === t.key ? 'var(--lime)' : 'var(--text-secondary)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--lime)' : 'transparent'}`,
            whiteSpace: 'nowrap', transition: 'all 0.15s',
            fontFamily: 'var(--font-body)',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen'   && <SeccionResumen   orgId={org.id} />}
      {tab === 'cuotas'    && <SeccionCuotas    orgId={org.id} />}
      {tab === 'deudores'  && <SeccionDeudores  orgId={org.id} />}
      {tab === 'contratos' && <SeccionContratos orgId={org.id} profeId={profile?.id} />}
      {tab === 'agenda'    && <SeccionAgenda    orgId={org.id} profeId={profile?.id} />}
    </div>
  )
}
