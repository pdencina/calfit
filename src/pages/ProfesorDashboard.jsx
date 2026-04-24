import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Topbar from '../components/Topbar'
import {
  getAllAlumnos, getRutinasAlumno,
  createRutina, deleteRutina,
  createEjercicio, deleteEjercicio,
  getEstadisticasAlumno
} from '../lib/supabase'

const TIPOS = [
  { value: 'al_fallo', label: 'Al fallo' },
  { value: 'series',   label: 'Por series' },
  { value: 'tiempo',   label: 'Por tiempo' },
]

export default function ProfesorDashboard() {
  const { profile } = useAuth()
  const [tab, setTab]               = useState('alumnos')
  const [alumnos, setAlumnos]       = useState([])
  const [selected, setSelected]     = useState(null)
  const [rutinas, setRutinas]       = useState([])
  const [stats, setStats]           = useState({})
  const [loading, setLoading]       = useState(true)

  // Estado formulario nueva rutina
  const [newRutinaNombre, setNewRutinaNombre] = useState('')
  const [newRutinaDesc, setNewRutinaDesc]     = useState('')
  const [showRutinaForm, setShowRutinaForm]   = useState(false)

  // Estado formulario nuevo ejercicio
  const [activeRutina, setActiveRutina]   = useState(null)
  const [showEjForm, setShowEjForm]       = useState(false)
  const [ejForm, setEjForm]               = useState({ nombre: '', tipo: 'al_fallo', series: 4, reps: '', descanso_s: 90, notas: '' })

  useEffect(() => {
    loadAlumnos()
  }, [])

  async function loadAlumnos() {
    setLoading(true)
    try {
      const data = await getAllAlumnos()
      setAlumnos(data)
      // cargar estadísticas de cada uno
      const s = {}
      await Promise.all(data.map(async a => {
        s[a.id] = await getEstadisticasAlumno(a.id)
      }))
      setStats(s)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function selectAlumno(alumno) {
    setSelected(alumno)
    setTab('rutinas')
    try {
      const data = await getRutinasAlumno(alumno.id)
      setRutinas(data || [])
    } catch (e) { console.error(e) }
  }

  async function handleCreateRutina(e) {
    e.preventDefault()
    if (!selected || !newRutinaNombre.trim()) return
    try {
      const r = await createRutina(selected.id, profile.id, newRutinaNombre, newRutinaDesc)
      setRutinas(prev => [...prev, { ...r, ejercicios: [] }])
      setNewRutinaNombre('')
      setNewRutinaDesc('')
      setShowRutinaForm(false)
    } catch (e) { console.error(e) }
  }

  async function handleDeleteRutina(rutinaId) {
    if (!window.confirm('¿Eliminar esta rutina y todos sus ejercicios?')) return
    try {
      await deleteRutina(rutinaId)
      setRutinas(prev => prev.filter(r => r.id !== rutinaId))
    } catch (e) { console.error(e) }
  }

  async function handleAddEjercicio(e) {
    e.preventDefault()
    if (!activeRutina || !ejForm.nombre.trim()) return
    try {
      const ej = await createEjercicio(activeRutina, ejForm)
      setRutinas(prev => prev.map(r =>
        r.id === activeRutina
          ? { ...r, ejercicios: [...(r.ejercicios || []), ej] }
          : r
      ))
      setEjForm({ nombre: '', tipo: 'al_fallo', series: 4, reps: '', descanso_s: 90, notas: '' })
      setShowEjForm(false)
      setActiveRutina(null)
    } catch (e) { console.error(e) }
  }

  async function handleDeleteEj(rutinaId, ejId) {
    try {
      await deleteEjercicio(ejId)
      setRutinas(prev => prev.map(r =>
        r.id === rutinaId
          ? { ...r, ejercicios: r.ejercicios.filter(e => e.id !== ejId) }
          : r
      ))
    } catch (e) { console.error(e) }
  }

  const sidebarItems = [
    { key: 'alumnos', icon: '👥', label: 'Alumnos' },
    { key: 'rutinas', icon: '📋', label: 'Rutinas', disabled: !selected },
    { key: 'progreso', icon: '📈', label: 'Progreso' },
  ]

  return (
    <div className="app-shell">
      <Topbar />
      <div className="layout-with-sidebar">
        <nav className="sidebar">
          {sidebarItems.map(item => (
            <div
              key={item.key}
              className={`sidebar-link ${tab === item.key ? 'active' : ''} ${item.disabled ? '' : ''}`}
              onClick={() => !item.disabled && setTab(item.key)}
              style={{ opacity: item.disabled ? 0.35 : 1 }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}

          {selected && (
            <div style={{ marginTop: 24, padding: '0 20px' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Alumno activo
              </div>
              <div style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 500 }}>{selected.full_name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{selected.level}</div>
              <button
                className="btn btn-ghost"
                style={{ marginTop: 10, width: '100%', fontSize: 11, padding: '6px' }}
                onClick={() => { setSelected(null); setRutinas([]); setTab('alumnos') }}
              >
                Cambiar alumno
              </button>
            </div>
          )}
        </nav>

        <main className="page-body">

          {/* ── TAB ALUMNOS ── */}
          {tab === 'alumnos' && (
            <div className="fade-up">
              <div className="page-title">MIS ALUMNOS</div>
              <div className="page-sub">Seleccioná un alumno para gestionar sus rutinas</div>

              {loading && <div className="loader">Cargando...</div>}

              {!loading && alumnos.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">SIN ALUMNOS</div>
                  <div style={{ fontSize: 13 }}>Los alumnos aparecerán aquí al registrarse con rol "alumno"</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {alumnos.map((a, i) => {
                  const s = stats[a.id] || {}
                  const initials = a.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div
                      key={a.id}
                      className={`card card-hover fade-up fade-up-${Math.min(i + 1, 4)}`}
                      style={{ cursor: 'pointer', borderColor: selected?.id === a.id ? 'var(--lime)' : undefined, background: selected?.id === a.id ? 'rgba(200,245,66,0.04)' : undefined }}
                      onClick={() => selectAlumno(a)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div className="avatar" style={{ width: 44, height: 44, fontSize: 14 }}>{initials}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{a.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{a.level || 'Sin nivel'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--lime)' }}>{s.completadas || 0}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Sesiones</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--white)' }}>{s.porcentaje || 0}%</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Completado</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TAB RUTINAS ── */}
          {tab === 'rutinas' && selected && (
            <div className="fade-up">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                  <div className="page-title">RUTINAS</div>
                  <div className="page-sub">Alumno: {selected.full_name}</div>
                </div>
                <button
                  className="btn btn-lime"
                  onClick={() => setShowRutinaForm(!showRutinaForm)}
                >
                  + Nueva rutina
                </button>
              </div>

              {showRutinaForm && (
                <form onSubmit={handleCreateRutina} className="card" style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: 2, marginBottom: 16 }}>NUEVA RUTINA</div>
                  <div className="form-group">
                    <label className="form-label">Nombre de la rutina</label>
                    <input value={newRutinaNombre} onChange={e => setNewRutinaNombre(e.target.value)} placeholder="Ej: Tracción, Empuje, Full Body..." required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descripción (opcional)</label>
                    <input value={newRutinaDesc} onChange={e => setNewRutinaDesc(e.target.value)} placeholder="Ej: Enfocada en jalas verticales y horizontales" />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn-lime">Crear rutina</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowRutinaForm(false)}>Cancelar</button>
                  </div>
                </form>
              )}

              {rutinas.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">SIN RUTINAS</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>Creá la primera rutina para {selected.full_name}</div>
                </div>
              )}

              {rutinas.map(rutina => (
                <div key={rutina.id} className="card" style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2, color: 'var(--lime)' }}>{rutina.nombre}</div>
                      {rutina.descripcion && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{rutina.descripcion}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: '7px 14px' }}
                        onClick={() => { setActiveRutina(rutina.id); setShowEjForm(true) }}
                      >
                        + Ejercicio
                      </button>
                      <button className="btn btn-danger" style={{ padding: '7px 10px' }} onClick={() => handleDeleteRutina(rutina.id)}>🗑</button>
                    </div>
                  </div>

                  {/* Form agregar ejercicio */}
                  {showEjForm && activeRutina === rutina.id && (
                    <form onSubmit={handleAddEjercicio} style={{ background: 'var(--dark)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label className="form-label">Nombre del ejercicio</label>
                          <input value={ejForm.nombre} onChange={e => setEjForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Muscle-up, Dominadas..." required />
                        </div>
                        <div>
                          <label className="form-label">Tipo</label>
                          <select value={ejForm.tipo} onChange={e => setEjForm(p => ({ ...p, tipo: e.target.value }))}>
                            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Series</label>
                          <input type="number" min={1} max={20} value={ejForm.series} onChange={e => setEjForm(p => ({ ...p, series: parseInt(e.target.value) }))} />
                        </div>
                        <div>
                          <label className="form-label">Reps / Tiempo</label>
                          <input value={ejForm.reps} onChange={e => setEjForm(p => ({ ...p, reps: e.target.value }))} placeholder="10 reps / 30s / al fallo" />
                        </div>
                        <div>
                          <label className="form-label">Descanso (seg)</label>
                          <input type="number" min={0} value={ejForm.descanso_s} onChange={e => setEjForm(p => ({ ...p, descanso_s: parseInt(e.target.value) }))} />
                        </div>
                        <div>
                          <label className="form-label">Notas</label>
                          <input value={ejForm.notas} onChange={e => setEjForm(p => ({ ...p, notas: e.target.value }))} placeholder="Agarre prono, codos adentro..." />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-lime" style={{ fontSize: 14, padding: '8px 18px' }}>Agregar</button>
                        <button type="button" className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => { setShowEjForm(false); setActiveRutina(null) }}>Cancelar</button>
                      </div>
                    </form>
                  )}

                  {/* Lista de ejercicios */}
                  {(!rutina.ejercicios || rutina.ejercicios.length === 0) ? (
                    <div style={{ fontSize: 13, color: 'var(--muted)', padding: '16px 0', textAlign: 'center' }}>
                      Sin ejercicios — añadí el primero
                    </div>
                  ) : (
                    rutina.ejercicios
                      .sort((a, b) => a.orden - b.orden)
                      .map((ej, i) => (
                        <div key={ej.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--dark)', borderRadius: 8, marginBottom: 6 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--lime)', width: 28, textAlign: 'center' }}>{i + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{ej.nombre}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                              {ej.series} series{ej.reps ? ` · ${ej.reps}` : ''}{ej.descanso_s ? ` · ${ej.descanso_s}s descanso` : ''}
                            </div>
                          </div>
                          <span className={`tag tag-${ej.tipo === 'al_fallo' ? 'fallo' : ej.tipo === 'series' ? 'series' : 'tiempo'}`}>
                            {TIPOS.find(t => t.value === ej.tipo)?.label}
                          </span>
                          {ej.notas && <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ej.notas}</span>}
                          <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 16 }} onClick={() => handleDeleteEj(rutina.id, ej.id)}>×</button>
                        </div>
                      ))
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── TAB PROGRESO ── */}
          {tab === 'progreso' && (
            <div className="fade-up">
              <div className="page-title">PROGRESO</div>
              <div className="page-sub">Seguimiento de todos los alumnos</div>

              {alumnos.map((a, i) => {
                const s = stats[a.id] || {}
                const initials = a.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={a.id} className={`card fade-up fade-up-${Math.min(i + 1, 4)}`} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="avatar">{initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{a.full_name}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{a.level || 'Sin nivel'}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${s.porcentaje || 0}%` }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--lime)', lineHeight: 1 }}>{s.porcentaje || 0}%</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.completadas || 0} / {s.total || 0} sesiones</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
