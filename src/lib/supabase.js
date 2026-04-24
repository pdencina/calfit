import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth helpers ──────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password, fullName, role = 'alumno') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } }
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// ── Rutinas ───────────────────────────────────────────────────

export async function getRutinasAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('rutinas')
    .select(`
      *,
      ejercicios (*)
    `)
    .eq('alumno_id', alumnoId)
    .eq('activa', true)
    .order('orden')
  if (error) throw error
  return data
}

export async function getAllAlumnos() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'alumno')
    .order('full_name')
  if (error) throw error
  return data
}

export async function createRutina(alumnoId, profeId, nombre, descripcion = '') {
  const { data, error } = await supabase
    .from('rutinas')
    .insert({ alumno_id: alumnoId, profe_id: profeId, nombre, descripcion })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRutina(id, updates) {
  const { data, error } = await supabase
    .from('rutinas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRutina(id) {
  const { error } = await supabase.from('rutinas').delete().eq('id', id)
  if (error) throw error
}

// ── Ejercicios ────────────────────────────────────────────────

export async function createEjercicio(rutinaId, ejercicio) {
  const { data, error } = await supabase
    .from('ejercicios')
    .insert({ rutina_id: rutinaId, ...ejercicio })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEjercicio(id, updates) {
  const { data, error } = await supabase
    .from('ejercicios')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEjercicio(id) {
  const { error } = await supabase.from('ejercicios').delete().eq('id', id)
  if (error) throw error
}

export async function reorderEjercicios(ejercicios) {
  const updates = ejercicios.map((ej, index) =>
    supabase.from('ejercicios').update({ orden: index }).eq('id', ej.id)
  )
  await Promise.all(updates)
}

// ── Sesiones ──────────────────────────────────────────────────

export async function createSesion(alumnoId, rutinaId) {
  const { data, error } = await supabase
    .from('sesiones')
    .insert({ alumno_id: alumnoId, rutina_id: rutinaId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSesionesAlumno(alumnoId, limit = 10) {
  const { data, error } = await supabase
    .from('sesiones')
    .select(`*, rutinas(nombre)`)
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function completarSesion(sesionId, duracionMin) {
  const { data, error } = await supabase
    .from('sesiones')
    .update({ completada: true, duracion_min: duracionMin })
    .eq('id', sesionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function guardarSesionEjercicio(sesionId, ejercicioId, completado, repsLogradas) {
  const { data, error } = await supabase
    .from('sesion_ejercicios')
    .upsert({
      sesion_id: sesionId,
      ejercicio_id: ejercicioId,
      completado,
      reps_logradas: repsLogradas
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getEstadisticasAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('sesiones')
    .select('completada, duracion_min, created_at')
    .eq('alumno_id', alumnoId)
  if (error) throw error

  const total = data.length
  const completadas = data.filter(s => s.completada).length
  const duracionTotal = data.reduce((s, x) => s + (x.duracion_min || 0), 0)

  return { total, completadas, duracionTotal, porcentaje: total ? Math.round(completadas / total * 100) : 0 }
}
