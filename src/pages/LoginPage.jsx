import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'

export default function LoginPage() {
  const [mode, setMode]         = useState('login')  // 'login' | 'register'
  const [role, setRole]         = useState('alumno')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        // AuthProvider detectará el cambio y redirigirá
      } else {
        await signUp(email, password, fullName, role)
        setSuccess('¡Cuenta creada! Revisá tu email para confirmar.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Decoración de fondo */}
      <div style={styles.bgAccent} />

      <div style={styles.brand}>CALFIT</div>
      <div style={styles.brandSub}>PLATAFORMA DE CALISTENIA</div>

      <div style={styles.box}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => { setMode('login'); setError('') }}
          >
            Ingresar
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
            onClick={() => { setMode('register'); setError('') }}
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

      <div style={styles.footer}>
        Hecho con 💪 para calistenia
      </div>
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
    background: 'radial-gradient(circle, rgba(200,245,66,0.06) 0%, transparent 70%)',
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
    letterSpacing: 6,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    marginBottom: 48,
  },
  box: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px',
    width: '100%',
    maxWidth: 360,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border)',
    marginBottom: 28,
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
  error: {
    background: 'rgba(248,113,113,0.1)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--danger)',
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 12,
  },
  successMsg: {
    background: 'rgba(74,222,128,0.1)',
    border: '1px solid rgba(74,222,128,0.3)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--success)',
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 12,
  },
  footer: {
    marginTop: 32,
    fontSize: 12,
    color: 'var(--border-hi)',
    letterSpacing: '0.5px',
  },
}
