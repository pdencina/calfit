import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('alumno')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [academyName, setAcademyName] = useState('')
  const [academyCode, setAcademyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (role === 'alumno' && !academyCode.trim()) {
          throw new Error('Para registrarte como alumno necesitas el código de tu profesor.')
        }

        await signUp(email, password, fullName, role, academyName, academyCode)
        setSuccess('¡Cuenta creada! Revisa tu email para confirmar y luego ingresa.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setSuccess('')
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgAccent} />

      <div style={styles.brand}>CALFIT</div>
      <div style={styles.brandSub}>PLATAFORMA PARA COACHES Y ALUMNOS</div>

      <div style={styles.box}>
        <div style={styles.badge}>Early Access SaaS</div>

        <div style={styles.tabs}>
          <button
            type="button"
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => switchMode('login')}
          >
            Ingresar
          </button>
          <button
            type="button"
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
            onClick={() => switchMode('register')}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Carlos García"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de cuenta</label>
                <div style={styles.roleToggle}>
                  {['alumno', 'profe'].map(r => (
                    <button
                      key={r}
                      type="button"
                      style={{ ...styles.roleBtn, ...(role === r ? styles.roleBtnActive : {}) }}
                      onClick={() => setRole(r)}
                    >
                      {r === 'alumno' ? '🏋️ Alumno' : '📋 Profesor'}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'profe' ? (
                <div className="form-group">
                  <label className="form-label">Nombre de tu academia/comunidad</label>
                  <input
                    type="text"
                    placeholder="Bar Brothers Puente Alto"
                    value={academyName}
                    onChange={e => setAcademyName(e.target.value)}
                    required
                  />
                  <small style={styles.hint}>Al crear tu cuenta se generará un código para invitar alumnos.</small>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Código de academia</label>
                  <input
                    type="text"
                    placeholder="Ej: A1B2C3D4"
                    value={academyCode}
                    onChange={e => setAcademyCode(e.target.value.toUpperCase())}
                    required
                  />
                  <small style={styles.hint}>Pídele este código a tu profesor.</small>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              placeholder="carlos@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.successMsg}>{success}</div>}

          <button
            type="submit"
            className="btn btn-lime"
            style={{ width: '100%', marginTop: 8, fontSize: 18, padding: '13px' }}
            disabled={loading}
          >
            {loading ? 'CARGANDO...' : mode === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}
          </button>
        </form>
      </div>

      <div style={styles.footer}>Convierte tu comunidad fitness en una academia profesional.</div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--black)',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  bgAccent: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(200,245,66,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  brand: {
    fontFamily: 'var(--font-display)',
    fontSize: 72,
    letterSpacing: 10,
    color: 'var(--lime)',
    lineHeight: 1,
    marginBottom: 4,
  },
  brandSub: {
    fontSize: 11,
    letterSpacing: 5,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    marginBottom: 32,
    textAlign: 'center',
  },
  box: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    width: '100%',
    maxWidth: 390,
    position: 'relative',
  },
  badge: {
    display: 'inline-block',
    marginBottom: 16,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(200,245,66,0.3)',
    color: 'var(--lime)',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border)',
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '10px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--muted)',
    fontSize: 12,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: 'var(--lime)',
    borderBottomColor: 'var(--lime)',
  },
  roleToggle: {
    display: 'flex',
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    padding: '10px',
    background: 'var(--dark)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--muted)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  roleBtnActive: {
    borderColor: 'var(--lime)',
    color: 'var(--lime)',
    background: 'rgba(200,245,66,0.08)',
  },
  hint: {
    display: 'block',
    marginTop: 8,
    color: 'var(--muted)',
    fontSize: 11,
    lineHeight: 1.4,
  },
  error: {
    background: 'rgba(255, 80, 80, 0.1)',
    border: '1px solid rgba(255, 80, 80, 0.25)',
    color: '#ff6b6b',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  successMsg: {
    background: 'rgba(200,245,66,0.1)',
    border: '1px solid rgba(200,245,66,0.25)',
    color: 'var(--lime)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
  },
  footer: {
    marginTop: 28,
    color: 'var(--muted)',
    fontSize: 13,
    textAlign: 'center',
  },
}
