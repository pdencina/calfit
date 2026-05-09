import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getProfile, getMyOrg } from 'lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [profile, setProfile] = useState(null)
  const [org, setOrg]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{session} }) => {
      setUser(session?.user ?? null)
      if(session?.user) load(session.user)
      else setLoading(false)
    })
    const { data:{subscription} } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if(session?.user) load(session.user)
      else { setProfile(null); setOrg(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function load(user) {
    try {
      const p = await getProfile(user.id)
      setProfile(p)
      if(p.role === 'profe') {
        const o = await getMyOrg(user.id).catch(() => null)
        setOrg(o)
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function refreshOrg() {
    if(!user) return
    const o = await getMyOrg(user.id).catch(() => null)
    setOrg(o)
  }

  return (
    <AuthContext.Provider value={{ user, profile, org, loading, refreshOrg }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
