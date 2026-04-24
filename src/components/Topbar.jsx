import { signOut } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Topbar() {
  const { profile } = useAuth()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  async function handleLogout() {
    try { await signOut() } catch (e) { console.error(e) }
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">CALFIT</div>
      <div className="topbar-right">
        <div className="avatar">{initials}</div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{profile?.full_name}</span>
        {profile?.role === 'profe' && (
          <span style={{
            fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
            background: 'rgba(200,245,66,0.1)', color: 'var(--lime)',
            padding: '3px 8px', borderRadius: 20,
          }}>Profe</span>
        )}
        <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleLogout}>
          Salir
        </button>
      </div>
    </header>
  )
}
