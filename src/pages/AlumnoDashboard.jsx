import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import Topbar from '../components/Topbar'
import {
  getRutinasAlumno,
  getSesionesAlumno,
  createSesion,
  completarSesion,
  guardarSesionEjercicio,
  getEstadisticasAlumno
} from '../lib/supabase'

const TIPOS_LABEL = { al_fallo: 'Al fallo', series: 'Por series', tiempo: 'Por tiempo' }
const TIPOS_TAG   = { al_fallo: 'fallo', series: 'series', tiempo: 'tiempo' }

export default function AlumnoDashboard() {
  const { profile } = useAuth()
  const [tab, setTab]           = useState('hoy')
  const [rutinas, setRutinas]   = useState([])
  const [sesiones, setSesiones] = useState([])
  const [stats, setStats]       = useState({})
  const [loading, setLoading]   = useState(true)

  // Estado sesión activa
  const [sesionActiva, setSesionActiva]   = useState(null)
  const [rutinaActiva, setRutinaActiva]   = useState(null)
  const [completados, setCompletados]     = useState({})
  const [timerStart, setTimerStart]       = useState(null)
  const [elapsed, setElapsed]             = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!profile) return
    Promise.all([
      getRutinasAlumno(profile.id),
      getSesionesAlumno(profile.id, 15),
      getEstadisticasAlumno(profile.id)
    ]).then(([r, s, st]) => {
      setRutinas(r || [])
      setSesiones(s || [])
      setStats(st || {})
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [profile])

  // Timer
  useEffect(() => {
    if (sesionActiva && timerStart) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStart) / 1000))
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [sesionActiva, timerStart])

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const ss = s % 60
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  async function iniciarSesion(rutina) {
    try {
      const sesion = await createSesion(profile.id, rutina.id)
      setSesionActiva(sesion)
      setRutinaActiva(rutina)
      setCompletados({})
      setTimerStart(Date.now())
      setElapsed(0)
      setTab('sesion')
    } catch (e) { console.error(e) }
  }

  async function toggleEjercicio(ejId) {
    const nuevo = !completados[ejId]
    setCompletados(prev => ({ ...prev, [ejId]: nuevo }))
    try {
      await guardarSesionEjercicio(sesionActiva.id, ejId, nuevo, '')
    } catch (e) { console.error(e) }
  }

  async function finalizarSesion() {
    const duracion = Math.round(elapsed / 60)
    try {
      await completarSesion(sesionActiva.id, duracion)
      const newStats = await getEstadisticasAlumno(profile.id)
      const newSesiones = await getSesionesAlumno(profile.id, 15)
      setStats(newStats)
      setSesiones(newSesiones)
    } catch (e) { console.error(e) }
    setSesionActiva(null)
    setRutinaActiva(null)
    setTimerStart(null)
    setElapsed(0)
    setTab('historial')
  }

  const totalEj    = rutinaActiva ? rutinaActiva.ejercicios?.length || 0 : 0
  const doneEj     = Object.values(completados).filter(Boolean).length
  const progPct    = totalEj ? Math.round(doneEj / totalEj * 100) : 0

  const sidebarItems = [
    { key: 'hoy',      icon: '💪', label: 'Mis rutinas' },
    { key: 'sesion',   icon: '▶', label: 'Sesión activa', disabled: !sesionActiva },
    { key: 'historial',icon: '📆', label: 'Historial' },
    { key: 'stats',    icon: '📊', label: 'Mis estadísticas' },
  ]

  return (
    <div className="app-shell">
      <Topbar />
      <div className="layout-with-sidebar">
        <nav className="sidebar">
          {sidebarItems.map(item => (
            <div
              key={item.key}
              className={`sidebar-link ${tab === item.key ? 'active' : ''}`}
              onClick={() => !item.disabled && setTab(item.key)}
              style={{ opacity: item.disabled ? 0.35 : 1 }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
              {item.key === 'sesion' && sesionActiva && (
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--lime)' }}>
                  {formatTime(elapsed)}
                </span>
              )}
            </div>
          ))}
        </nav>

        <main className="page-body">

          {/* ── MIS RUTINAS ── */}
          {tab === 'hoy' && (
            <div className="fade-up">
              <div className="page-title">MIS RUTINAS</div>
              <div className="page-sub">Elegí la rutina de hoy y comenzá la sesión</div>

              {loading && <div className="loader">Cargando rutinas...</div>}

              {!loading && rutinas.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">SIN RUTINAS</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>Tu profesor aún no cargó rutinas. ¡Ya viene!</div>
                </div>
              )}

              {rutinas.map((rutina, ri) => (
                <div key={rutina.id} className={`card fade-up fade-up-${Math.min(ri + 1, 4)}`} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: 2, color: 'var(--lime)' }}>{rutina.nombre}</div>
                      {rutina.descripcion && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{rutina.descripcion}</div>}
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{rutina.ejercicios?.length || 0} ejercicios</div>
                    </div>
                    <button
                      className="btn btn-lime"
                      style={{ fontSize: 16, padding: '10px 22px' }}
                      onClick={() => iniciarSesion(rutina)}
                      disabled={!!sesionActiva}
                    >
                      {sesionActiva ? 'Sesión en curso' : '▶ Iniciar'}
                    </button>
                  </div>

                  {rutina.ejercicios?.sort((a, b) => a.orden - b.orden).map((ej, i) => (
                    <div key={ej.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--dark)', borderRadius: 8, marginBottom: 6 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--muted)', width: 24, textAlign: 'center' }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{ej.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {ej.series} series{ej.reps ? ` · ${ej.reps}` : ''}
                        </div>
                      </div>
                      <span className={`tag tag-${TIPOS_TAG[ej.tipo] || 'series'}`}>{TIPOS_LABEL[ej.tipo]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── SESIÓN ACTIVA ── */}
          {tab === 'sesion' && sesionActiva && rutinaActiva && (
            <div className="fade-up">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="page-title">{rutinaActiva.nombre}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--lime)', letterSpacing: 2 }}>{formatTime(elapsed)}</div>
              </div>
              <div className="page-sub">Marcá cada ejercicio al completarlo</div>

              {/* Barra de progreso */}
              <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', flexShrink: 0 }}>Progreso</div>
                <div className="progress-track" style={{ flex: 1 }}>
                  <div className="progress-fill" style={{ width: `${progPct}%` }} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--lime)', flexShrink: 0 }}>{progPct}%</div>
              </div>

              {rutinaActiva.ejercicios?.sort((a, b) => a.orden - b.orden).map((ej, i) => {
                const done = completados[ej.id]
                return (
                  <div
                    key={ej.id}
                    className="card card-hover"
                    style={{ marginBottom: 10, opacity: done ? 0.5 : 1, transition: 'opacity 0.3s', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                    onClick={() => toggleEjercicio(ej.id)}
                  >
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: done ? 'var(--lime)' : 'var(--muted)', width: 32, textAlign: 'center' }}>{done ? '✓' : i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>{ej.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                        {ej.series} series{ej.reps ? ` · ${ej.reps}` : ''}{ej.descanso_s ? ` · ${ej.descanso_s}s descanso` : ''}
                      </div>
                      {ej.notas && <div style={{ fontSize: 11, color: 'var(--border-hi)', marginTop: 3, fontStyle: 'italic' }}>{ej.notas}</div>}
                    </div>
                    <span className={`tag tag-${TIPOS_TAG[ej.tipo] || 'series'}`}>{TIPOS_LABEL[ej.tipo]}</span>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      border: `2px solid ${done ? 'var(--lime)' : 'var(--border-hi)'}`,
                      background: done ? 'var(--lime)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s', flexShrink: 0,
                    }}>
                      {done && <span style={{ color: 'var(--black)', fontSize: 14, fontWeight: 700 }}>✓</span>}
                    </div>
                  </div>
                )
              })}

              <button
                className="btn btn-lime"
                style={{ width: '100%', marginTop: 16, fontSize: 18, padding: '14px' }}
                onClick={finalizarSesion}
              >
                {progPct === 100 ? '🎉 FINALIZAR SESIÓN' : `TERMINAR (${doneEj}/${totalEj} completados)`}
              </button>
            </div>
          )}

          {/* ── HISTORIAL ── */}
          {tab === 'historial' && (
            <div className="fade-up">
              <div className="page-title">HISTORIAL</div>
              <div className="page-sub">Tus últimas sesiones de entrenamiento</div>

              {sesiones.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">SIN HISTORIAL</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>Completá tu primera sesión para verla acá</div>
                </div>
              )}

              {sesiones.map((s, i) => (
                <div key={s.id} className={`card fade-up fade-up-${Math.min(i + 1, 4)}`} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.completada ? 'var(--lime)' : 'var(--border-hi)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.rutinas?.nombre || 'Rutina'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {new Date(s.created_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {s.completada
                      ? <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Completada</span>
                      : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Incompleta</span>}
                    {s.duracion_min && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.duracion_min} min</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ESTADÍSTICAS ── */}
          {tab === 'stats' && (
            <div className="fade-up">
              <div className="page-title">MIS ESTADÍSTICAS</div>
              <div className="page-sub">Tu progreso en números</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 32 }}>
                {[
                  { label: 'Sesiones totales',   value: stats.total || 0,        suffix: '' },
                  { label: 'Completadas',         value: stats.completadas || 0,  suffix: '' },
                  { label: 'Tasa de éxito',       value: `${stats.porcentaje || 0}`, suffix: '%' },
                  { label: 'Minutos totales',      value: stats.duracionTotal || 0, suffix: '' },
                ].map((m, i) => (
                  <div key={i} className={`card fade-up-${i + 1} fade-up`} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'var(--lime)', lineHeight: 1, marginBottom: 8 }}>
                      {m.value}{m.suffix}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, marginBottom: 16 }}>CONSISTENCIA</div>
                <div className="progress-track" style={{ marginBottom: 8, height: 10 }}>
                  <div className="progress-fill" style={{ width: `${stats.porcentaje || 0}%`, height: '100%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                  <span>0%</span>
                  <span style={{ color: 'var(--lime)', fontWeight: 500 }}>{stats.porcentaje || 0}% completado</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
