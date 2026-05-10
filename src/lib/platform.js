import { supabase } from 'lib/supabase'

export async function getPlatformKPIs() {
  const { data, error } = await supabase
    .from('admin_platform_kpis').select('*').single()
  if (error) throw error; return data
}

export async function getOrgsOverview(filtro = '') {
  let q = supabase
    .from('admin_orgs_overview').select('*')
    .order('created_at', { ascending: false })
  if (filtro === 'trial')    q = q.eq('plan_status', 'trialing')
  if (filtro === 'active')   q = q.eq('plan_status', 'active')
  if (filtro === 'canceled') q = q.eq('plan_status', 'canceled')
  if (['starter','pro','elite'].includes(filtro)) q = q.eq('plan_id', filtro)
  const { data, error } = await q
  if (error) throw error; return data
}

export async function getGrowthData() {
  const { data, error } = await supabase
    .from('admin_growth').select('*').order('mes', { ascending: true })
  if (error) throw error; return data
}

export async function getAllUsers(busqueda = '') {
  let q = supabase
    .from('profiles').select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (busqueda) q = q.or(`full_name.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
  const { data, error } = await q
  if (error) throw error; return data
}

export async function cambiarPlanOrg(orgId, nuevoPlan) {
  const { error } = await supabase
    .from('organizations')
    .update({ plan_id: nuevoPlan, plan_status: 'active' })
    .eq('id', orgId)
  if (error) throw error
}

export async function suspenderOrg(orgId) {
  const { error } = await supabase
    .from('organizations')
    .update({ plan_status: 'canceled' })
    .eq('id', orgId)
  if (error) throw error
}

export async function getRecentActivity() {
  const { data, error } = await supabase
    .from('sesiones')
    .select('*, alumno:profiles!sesiones_alumno_id_fkey(full_name), org:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error; return data
}
