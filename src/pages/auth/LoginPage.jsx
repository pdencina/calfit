import { useState } from 'react'
import { signIn, signUp } from 'lib/supabase'

export default function LoginPage() {
  const [mode, setMode]       = useState('login')
  const [role, setRole]       = useState('profe')
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [ok, setOk]           = useState('')

  async function submit(e) {
    e.preventDefault()
    setError(''); setOk(''); setLoading(true)
    try {
      if(mode === 'login') {
        const { error } = await signIn(email, pass)
        if(error) throw error
      } else {
        const { error } = await signUp(email, pass, name, role)
        if(error) throw error
        setOk('¡Cuenta creada! Si tu proveedor lo requiere, revisá tu email para confirmar.')
        setMode('login')
      }
    } catch(err) { setError(err.message || 'Error desconocido') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--black)', padding:20, flexDirection:'column', gap:0 }}>
      <div style={{ position:'absolute', top:-150, right:-150, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(200,245,66,0.05) 0%, transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ fontFamily:'var(--font-display)', fontSize:80, letterSpacing:12, color:'var(--lime)', lineHeight:1 }}>CALFIT</div>
      <div style={{ fontSize:11, letterSpacing:6, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:48 }}>PLATAFORMA PRO</div>
      <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-dim)', borderRadius:'var(--radius-lg)', padding:32, width:'100%', maxWidth:380 }}>
        <div style={{ display:'flex', borderBottom:'1px solid var(--border-dim)', marginBottom:28 }}>
          {['login','register'].map(m => (
            <button key={m} onClick={()=>{setMode(m);setError('')}} style={{ flex:1, padding:'10px', background:'none', border:'none', borderBottom:`2px solid ${mode===m?'var(--lime)':'transparent'}`, color:mode===m?'var(--lime)':'var(--text-muted)', fontSize:12, letterSpacing:1.5, textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s' }}>
              {m === 'login' ? 'Ingresar' : 'Registrarse'}
            </button>
          ))}
        </div>
        {mode === 'register' && <>
          <div className="form-group"><label>Nombre completo</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Carlos García" required/></div>
          <div style={{ marginBottom:18 }}>
            <label>Tipo de cuenta</label>
            <div style={{ display:'flex', gap:8 }}>
              {[{v:'profe',l:'📋 Profesor'},{v:'alumno',l:'🏋️ Alumno'}].map(({v,l}) => (
                <button key={v} type="button" onClick={()=>setRole(v)} style={{ flex:1, padding:'10px', background:role===v?'rgba(200,245,66,0.08)':'var(--surface-2)', border:`1px solid ${role===v?'var(--lime)':'var(--border-dim)'}`, borderRadius:'var(--radius-sm)', color:role===v?'var(--lime)':'var(--text-secondary)', fontSize:13, cursor:'pointer', transition:'all 0.2s' }}>{l}</button>
              ))}
            </div>
          </div>
        </>}
        <div className="form-group"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required/></div>
        <div className="form-group"><label>Contraseña</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required/></div>
        {error && <div className="alert alert-error" style={{marginBottom:12}}>{error}</div>}
        {ok    && <div className="alert alert-success" style={{marginBottom:12}}>{ok}</div>}
        <button onClick={submit} className="btn btn-display" style={{ width:'100%', marginTop:8 }} disabled={loading}>
          {loading ? 'CARGANDO...' : mode==='login' ? 'ENTRAR' : 'CREAR CUENTA'}
        </button>
      </div>
      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:24 }}>Trial gratis de 14 días · Sin tarjeta requerida</div>
    </div>
  )
}
