import { useState } from 'react'
import { useAuth } from 'contexts/AuthContext'
import { supabase } from 'lib/supabase'

export default function InviteAlumnoModal({ orgId, onClose, onInvited }) {
  const { profile } = useAuth()
  const [step, setStep]       = useState('form')  // 'form' | 'success' | 'exists'
  const [form, setForm]       = useState({ full_name: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState(null)

  async function handleInvite(e) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim()) return
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const resp = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/invite-alumno`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email:     form.email.trim().toLowerCase(),
            full_name: form.full_name.trim(),
            org_id:    orgId,
          })
        }
      )

      const data = await resp.json()

      if (!data.success) throw new Error(data.error)

      setResult(data)
      setStep(data.is_new_user ? 'success' : 'exists')
      onInvited()

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-mid)',
        borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 460,
        padding: 32,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 2 }}>
              INVITAR ALUMNO
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              El alumno recibirá un email con su acceso
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* FORM */}
        {step === 'form' && (
          <form onSubmit={handleInvite}>
            <div className="form-group">
              <label>Nombre completo del alumno</label>
              <input
                type="text"
                placeholder="Ej: Carlos García"
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Email del alumno</label>
              <input
                type="email"
                placeholder="carlos@email.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* Qué va a pasar */}
            <div style={{
              background: 'rgba(200,245,66,0.05)',
              border: '1px solid rgba(200,245,66,0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 500, marginBottom: 8 }}>
                ¿Qué va a pasar?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  'Se crea la cuenta del alumno automáticamente',
                  'Le llega un email con sus credenciales de acceso',
                  'Queda vinculado a tu organización al instante',
                  'Vos podés asignarle rutinas de inmediato',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--lime)', flexShrink: 0 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2, padding: 13 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span style={{ width: 14, height: 14, border: '2px solid var(--black)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}/>
                    ENVIANDO...
                  </span>
                ) : '📧 INVITAR ALUMNO'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* SUCCESS — cuenta nueva */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2, color: 'var(--lime)', marginBottom: 8 }}>
              INVITACIÓN ENVIADA
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              <strong style={{ color: 'var(--white)' }}>{form.full_name}</strong> recibió un email en{' '}
              <strong style={{ color: 'var(--lime)' }}>{form.email}</strong> con sus credenciales de acceso.
            </p>
            <div style={{
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              marginBottom: 24,
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
            }}>
              El alumno ya aparece en tu lista. Podés asignarle rutinas mientras espera activar su cuenta.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => { setStep('form'); setForm({ full_name: '', email: '' }) }}
                style={{ fontFamily: 'var(--font-display)', letterSpacing: 2 }}
              >
                INVITAR OTRO
              </button>
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            </div>
          </div>
        )}

        {/* EXISTS — ya tenía cuenta */}
        {step === 'exists' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2, color: 'var(--info)', marginBottom: 8 }}>
              ALUMNO AGREGADO
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              <strong style={{ color: 'var(--white)' }}>{form.full_name}</strong> ya tenía cuenta en CALFIT PRO y fue agregado directamente a tu organización.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => { setStep('form'); setForm({ full_name: '', email: '' }) }}
                style={{ fontFamily: 'var(--font-display)', letterSpacing: 2 }}
              >
                INVITAR OTRO
              </button>
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
