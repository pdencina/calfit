import { supabase } from 'lib/supabase'

// ── Servicios ────────────────────────────────────────────────────
export async function getServicios(orgId) {
  const { data, error } = await supabase
    .from('servicios').select('*').eq('org_id', orgId).eq('activo', true).order('precio')
  if (error) throw error; return data
}
export async function createServicio(orgId, payload) {
  const { data, error } = await supabase
    .from('servicios').insert({ org_id: orgId, ...payload }).select().single()
  if (error) throw error; return data
}
export async function updateServicio(id, updates) {
  const { data, error } = await supabase
    .from('servicios').update(updates).eq('id', id).select().single()
  if (error) throw error; return data
}

// ── Contratos ────────────────────────────────────────────────────
export async function getContratos(orgId) {
  const { data, error } = await supabase
    .from('contratos')
    .select('*, alumno:profiles!contratos_alumno_id_fkey(full_name,email), servicio:servicios(nombre,tipo)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error; return data
}
export async function createContrato(orgId, alumnoId, servicioId, payload) {
  const { data, error } = await supabase
    .from('contratos')
    .insert({ org_id: orgId, alumno_id: alumnoId, servicio_id: servicioId, ...payload })
    .select().single()
  if (error) throw error; return data
}

// ── Cuotas ───────────────────────────────────────────────────────
export async function getCuotas(orgId, filtros = {}) {
  let q = supabase
    .from('cuotas')
    .select('*, alumno:profiles!cuotas_alumno_id_fkey(full_name,email)')
    .eq('org_id', orgId)
    .order('fecha_vencimiento', { ascending: false })

  if (filtros.estado)    q = q.eq('estado', filtros.estado)
  if (filtros.alumnoId)  q = q.eq('alumno_id', filtros.alumnoId)
  if (filtros.mes) {
    const inicio = `${filtros.mes}-01`
    const fin    = new Date(filtros.mes.split('-')[0], filtros.mes.split('-')[1], 0)
      .toISOString().split('T')[0]
    q = q.gte('fecha_vencimiento', inicio).lte('fecha_vencimiento', fin)
  }

  const { data, error } = await q
  if (error) throw error; return data
}

export async function getCuotasAlumno(alumnoId) {
  const { data, error } = await supabase
    .from('cuotas').select('*, contratos(servicios(nombre))')
    .eq('alumno_id', alumnoId).order('fecha_vencimiento', { ascending: false })
  if (error) throw error; return data
}

export async function createCuota(orgId, contratoId, alumnoId, payload) {
  const { data, error } = await supabase
    .from('cuotas')
    .insert({ org_id: orgId, contrato_id: contratoId, alumno_id: alumnoId, ...payload })
    .select().single()
  if (error) throw error; return data
}

export async function marcarPagada(cuotaId, metodo, notas = '') {
  const { data, error } = await supabase
    .from('cuotas')
    .update({ estado: 'pagado', metodo_pago: metodo, fecha_pago: new Date().toISOString().split('T')[0], notas })
    .eq('id', cuotaId).select().single()
  if (error) throw error; return data
}

export async function generarCuotasMensuales(orgId) {
  // Obtener contratos activos
  const { data: contratos } = await supabase
    .from('contratos')
    .select('*, servicios(nombre,precio)')
    .eq('org_id', orgId).eq('estado', 'activo')

  const hoy = new Date()
  const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 2).padStart(2, '0')}` // mes siguiente
  const vencimiento = `${mes}-10` // vence el 10 del mes siguiente
  const concepto = `Cuota ${new Date(vencimiento).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`

  const inserts = contratos
    .filter(c => c.servicios.tipo === 'mensual')
    .map(c => ({
      org_id: orgId,
      contrato_id: c.id,
      alumno_id: c.alumno_id,
      concepto,
      monto: c.precio_acordado,
      moneda: 'ARS',
      fecha_vencimiento: vencimiento,
      estado: 'pendiente'
    }))

  if (inserts.length === 0) return []
  const { data, error } = await supabase.from('cuotas').insert(inserts).select()
  if (error) throw error; return data
}

// ── Resumen financiero ───────────────────────────────────────────
export async function getResumenFinanciero(orgId) {
  const { data, error } = await supabase
    .from('resumen_financiero').select('*').eq('org_id', orgId)
    .order('mes', { ascending: false }).limit(6)
  if (error) throw error; return data
}

export async function getDeudores(orgId) {
  const { data, error } = await supabase
    .from('deudores').select('*').eq('org_id', orgId)
  if (error) throw error; return data
}

export async function getKPIsAdmin(orgId) {
  const [cuotas, contratos, deudores] = await Promise.all([
    supabase.from('cuotas').select('monto,estado,fecha_vencimiento').eq('org_id', orgId),
    supabase.from('contratos').select('id,estado').eq('org_id', orgId).eq('estado', 'activo'),
    supabase.from('deudores').select('deuda_total').eq('org_id', orgId),
  ])

  const mesActual = new Date().toISOString().slice(0, 7)
  const cuotasMes = (cuotas.data || []).filter(c => c.fecha_vencimiento?.startsWith(mesActual))

  return {
    ingresosDelMes:    cuotasMes.filter(c => c.estado === 'pagado').reduce((s, c) => s + Number(c.monto), 0),
    porCobrarDelMes:   cuotasMes.filter(c => c.estado !== 'pagado').reduce((s, c) => s + Number(c.monto), 0),
    alumnosActivos:    contratos.data?.length || 0,
    totalDeuda:        (deudores.data || []).reduce((s, d) => s + Number(d.deuda_total), 0),
    cantDeudores:      deudores.data?.length || 0,
  }
}

// ── Mercado Pago ─────────────────────────────────────────────────
export async function crearPreferenciaMercadoPago(cuotaId, alumnoEmail, monto, concepto) {
  // Llama a tu Edge Function / backend
  const { data: { session } } = await supabase.auth.getSession()
  const resp = await fetch(
    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/mp-create-preference`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ cuotaId, alumnoEmail, monto, concepto })
    }
  )
  if (!resp.ok) throw new Error('Error creando preferencia de Mercado Pago')
  return resp.json() // { preference_id, init_point }
}

// ── Agenda / Turnos ──────────────────────────────────────────────
export async function getTurnos(orgId, fecha) {
  let q = supabase
    .from('turnos')
    .select('*, alumno:profiles!turnos_alumno_id_fkey(full_name)')
    .eq('org_id', orgId)
  if (fecha) q = q.eq('fecha', fecha)
  const { data, error } = await q.order('hora_inicio')
  if (error) throw error; return data
}

export async function getTurnosSemana(orgId, fechaInicio) {
  const fin = new Date(fechaInicio)
  fin.setDate(fin.getDate() + 6)
  const { data, error } = await supabase
    .from('turnos')
    .select('*, alumno:profiles!turnos_alumno_id_fkey(full_name)')
    .eq('org_id', orgId)
    .gte('fecha', fechaInicio)
    .lte('fecha', fin.toISOString().split('T')[0])
    .order('fecha').order('hora_inicio')
  if (error) throw error; return data
}

export async function createTurno(orgId, profeId, payload) {
  const { data, error } = await supabase
    .from('turnos').insert({ org_id: orgId, profe_id: profeId, ...payload }).select().single()
  if (error) throw error; return data
}

export async function updateTurno(id, updates) {
  const { data, error } = await supabase
    .from('turnos').update(updates).eq('id', id).select().single()
  if (error) throw error; return data
}
