import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

// ── Auth ──────────────────────────────────────────────────────
export const signIn   = (e,p)   => supabase.auth.signInWithPassword({ email:e, password:p })
export const signOut  = ()      => supabase.auth.signOut()
export const signUp   = (e,p,n,r) => supabase.auth.signUp({ email:e, password:p, options:{data:{full_name:n,role:r}} })
export const resetPass= (e)     => supabase.auth.resetPasswordForEmail(e)

// ── Profile ───────────────────────────────────────────────────
export async function getProfile(uid) {
  const { data,error } = await supabase.from('profiles').select('*').eq('id',uid).single()
  if(error) throw error; return data
}
export async function updateProfile(uid, updates) {
  const { data,error } = await supabase.from('profiles').update(updates).eq('id',uid).select().single()
  if(error) throw error; return data
}

// ── Organization ──────────────────────────────────────────────
export async function getMyOrg(uid) {
  const { data,error } = await supabase
    .from('organizations').select('*, plans(*)')
    .eq('owner_id', uid).single()
  if(error) throw error; return data
}
export async function updateOrg(id, updates) {
  const { data,error } = await supabase.from('organizations').update(updates).eq('id',id).select().single()
  if(error) throw error; return data
}

// ── Alumnos ───────────────────────────────────────────────────
export async function getAlumnos(orgId) {
  const { data,error } = await supabase
    .from('memberships')
    .select('*, profiles(*)')
    .eq('org_id', orgId)
    .eq('role','alumno')
    .eq('status','active')
    .order('joined_at', { ascending:false })
  if(error) throw error
  return data.map(m => ({ ...m.profiles, membership_id:m.id, joined_at:m.joined_at }))
}

export async function getAlumnoStats(orgId) {
  const { data,error } = await supabase
    .from('alumno_stats').select('*').eq('org_id', orgId)
  if(error) throw error; return data
}

export async function addAlumnoToOrg(orgId, email, profId) {
  // Buscar si el usuario existe
  const { data:existing } = await supabase.from('profiles').select('id').eq('email',email).single()
  if(!existing) throw new Error('No existe un usuario con ese email. Pedile que se registre primero.')
  const { error } = await supabase.from('memberships').upsert({ org_id:orgId, user_id:existing.id, role:'alumno', status:'active' })
  if(error) throw error
  return existing
}

// ── Rutinas ───────────────────────────────────────────────────
export async function getRutinasAlumno(alumnoId) {
  const { data,error } = await supabase
    .from('rutinas').select('*, ejercicios(*)')
    .eq('alumno_id',alumnoId).eq('activa',true).order('orden')
  if(error) throw error; return data
}
export async function getRutinasOrg(orgId) {
  const { data,error } = await supabase
    .from('rutinas').select('*, profiles!rutinas_alumno_id_fkey(full_name), ejercicios(id)')
    .eq('org_id',orgId).order('created_at',{ascending:false})
  if(error) throw error; return data
}
export async function createRutina(orgId, alumnoId, profeId, payload) {
  const { data,error } = await supabase
    .from('rutinas').insert({org_id:orgId, alumno_id:alumnoId, profe_id:profeId, ...payload})
    .select().single()
  if(error) throw error; return data
}
export async function updateRutina(id, updates) {
  const { data,error } = await supabase.from('rutinas').update(updates).eq('id',id).select().single()
  if(error) throw error; return data
}
export async function deleteRutina(id) {
  const { error } = await supabase.from('rutinas').delete().eq('id',id)
  if(error) throw error
}

// ── Ejercicios ────────────────────────────────────────────────
export async function createEjercicio(rutinaId, payload) {
  const { data,error } = await supabase.from('ejercicios').insert({rutina_id:rutinaId,...payload}).select().single()
  if(error) throw error; return data
}
export async function updateEjercicio(id, updates) {
  const { data,error } = await supabase.from('ejercicios').update(updates).eq('id',id).select().single()
  if(error) throw error; return data
}
export async function deleteEjercicio(id) {
  const { error } = await supabase.from('ejercicios').delete().eq('id',id)
  if(error) throw error
}

// ── Métricas ──────────────────────────────────────────────────
export async function getMetricasAlumno(uid, limit=20) {
  const { data,error } = await supabase
    .from('alumno_metrics').select('*').eq('user_id',uid)
    .order('fecha',{ascending:false}).limit(limit)
  if(error) throw error; return data
}
export async function insertMetrica(payload) {
  const { data,error } = await supabase.from('alumno_metrics').upsert(payload).select().single()
  if(error) throw error; return data
}

// ── Sesiones ──────────────────────────────────────────────────
export async function createSesion(orgId, alumnoId, rutinaId) {
  const { data,error } = await supabase
    .from('sesiones').insert({org_id:orgId, alumno_id:alumnoId, rutina_id:rutinaId}).select().single()
  if(error) throw error; return data
}
export async function completarSesion(id, payload) {
  const { data,error } = await supabase.from('sesiones').update({completada:true,...payload}).eq('id',id).select().single()
  if(error) throw error; return data
}
export async function getSesionesAlumno(uid, limit=30) {
  const { data,error } = await supabase
    .from('sesiones').select('*, rutinas(nombre,categoria)').eq('alumno_id',uid)
    .order('fecha',{ascending:false}).limit(limit)
  if(error) throw error; return data
}
export async function getSesionesOrg(orgId, days=30) {
  const since = new Date(); since.setDate(since.getDate()-days)
  const { data,error } = await supabase
    .from('sesiones').select('*, profiles!sesiones_alumno_id_fkey(full_name)')
    .eq('org_id',orgId).gte('fecha', since.toISOString().split('T')[0])
    .order('fecha',{ascending:false})
  if(error) throw error; return data
}

// ── Mensajería ────────────────────────────────────────────────
export async function getConversaciones(uid) {
  const { data,error } = await supabase
    .from('conversations')
    .select('*, alumno:profiles!conversations_alumno_id_fkey(*), profe:profiles!conversations_profe_id_fkey(*)')
    .or(`profe_id.eq.${uid},alumno_id.eq.${uid}`)
    .order('last_message_at',{ascending:false})
  if(error) throw error; return data
}
export async function getOrCreateConversacion(orgId, profeId, alumnoId) {
  const { data:ex } = await supabase.from('conversations')
    .select('*').eq('org_id',orgId).eq('profe_id',profeId).eq('alumno_id',alumnoId).single()
  if(ex) return ex
  const { data,error } = await supabase.from('conversations')
    .insert({org_id:orgId, profe_id:profeId, alumno_id:alumnoId}).select().single()
  if(error) throw error; return data
}
export async function getMessages(conversacionId, limit=50) {
  const { data,error } = await supabase
    .from('messages').select('*, sender:profiles!messages_sender_id_fkey(full_name,avatar_url)')
    .eq('conversation_id', conversacionId).order('created_at',{ascending:true}).limit(limit)
  if(error) throw error; return data
}
export async function sendMessage(conversacionId, senderId, content) {
  const { data,error } = await supabase
    .from('messages').insert({conversation_id:conversacionId, sender_id:senderId, content}).select().single()
  if(error) throw error; return data
}
export function subscribeToMessages(conversacionId, callback) {
  return supabase.channel(`conv-${conversacionId}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${conversacionId}` }, callback)
    .subscribe()
}

// ── Notificaciones ────────────────────────────────────────────
export async function getNotificaciones(uid) {
  const { data,error } = await supabase
    .from('notifications').select('*').eq('user_id',uid)
    .order('created_at',{ascending:false}).limit(20)
  if(error) throw error; return data
}
export async function marcarLeidasAll(uid) {
  const { error } = await supabase.from('notifications').update({leida:true}).eq('user_id',uid).eq('leida',false)
  if(error) throw error
}
export async function createNotificacion(userId, tipo, titulo, cuerpo, data={}) {
  const { error } = await supabase.from('notifications').insert({user_id:userId,tipo,titulo,cuerpo,data})
  if(error) console.error('Notif error:',error)
}

// ── Goals ─────────────────────────────────────────────────────
export async function getGoals(uid) {
  const { data,error } = await supabase.from('goals').select('*').eq('user_id',uid).order('created_at',{ascending:false})
  if(error) throw error; return data
}
export async function createGoal(payload) {
  const { data,error } = await supabase.from('goals').insert(payload).select().single()
  if(error) throw error; return data
}
export async function updateGoal(id, updates) {
  const { data,error } = await supabase.from('goals').update(updates).eq('id',id).select().single()
  if(error) throw error; return data
}

// ── Dashboard Profe ───────────────────────────────────────────
export async function getDashboardProfe(orgId) {
  const [alumnos, sesiones, metricas] = await Promise.all([
    getAlumnos(orgId),
    getSesionesOrg(orgId, 30),
    supabase.from('alumno_metrics').select('*').eq('org_id',orgId).order('fecha',{ascending:false}).limit(100).then(r => r.data || [])
  ])
  return { alumnos, sesiones, metricas }
}
