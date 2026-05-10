// src/lib/trial.js
// Manejo del trial inteligente y formato CLP

import { supabase } from 'lib/supabase'

// ── Formato CLP ───────────────────────────────────────────────
export const fmtCLP = (n) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n || 0)

// Ej: fmtCLP(37000) → "$37.000"

// ── Planes en CLP ─────────────────────────────────────────────
export const PLANES_CLP = [
  {
    id: 'starter',
    nombre: 'STARTER',
    precio_mes: 18000,
    precio_anual: 145000,
    max_alumnos: 10,
    color: 'var(--text-secondary)',
    features: [
      'Hasta 10 alumnos',
      'Rutinas personalizadas ilimitadas',
      'Mensajería con alumnos',
      'Dashboard financiero',
      'Cobros con Mercado Pago',
      'Soporte por email',
    ],
    sin: ['Métricas avanzadas', 'Videos en ejercicios', 'Nutrición'],
  },
  {
    id: 'pro',
    nombre: 'PRO',
    precio_mes: 37000,
    precio_anual: 295000,
    max_alumnos: 50,
    color: 'var(--lime)',
    badge: 'MÁS POPULAR',
    features: [
      'Hasta 50 alumnos',
      'Todo lo de Starter',
      'Métricas corporales + gráficos',
      'Videos en cada ejercicio',
      'Planes de nutrición',
      'Soporte prioritario',
      'Exportar reportes PDF',
    ],
    sin: ['White label', 'API access'],
  },
  {
    id: 'elite',
    nombre: 'ELITE',
    precio_mes: 65000,
    precio_anual: 520000,
    max_alumnos: Infinity,
    color: 'var(--warning)',
    features: [
      'Alumnos ilimitados',
      'Todo lo de Pro',
      'White label (tu marca)',
      'API access completo',
      'Manager de equipo / coaches',
      'Onboarding dedicado 1:1',
    ],
    sin: [],
  },
]

// ── Trial status desde Supabase ───────────────────────────────
export async function getTrialStatus(orgId) {
  const { data, error } = await supabase
    .rpc('get_trial_status', { org_id: orgId })
  if (error) throw error
  return data
  // Retorna: { status, dias_restantes, activado, mensaje?, trial_inicio?, trial_fin? }
}

// ── Banner de trial según estado ──────────────────────────────
export function getTrialBannerConfig(trialStatus, planActual) {
  if (!trialStatus) return null
  if (planActual === 'active') return null // ya tiene plan pago

  const { status, dias_restantes, activado, mensaje } = trialStatus

  if (!activado) {
    return {
      tipo: 'pending',
      color: 'var(--info)',
      bg: 'rgba(96,165,250,0.08)',
      border: 'rgba(96,165,250,0.2)',
      icono: '⏸',
      titulo: 'Trial en espera',
      texto: 'Tus 14 días gratis empiezan cuando agregues tu primer alumno.',
      cta: 'Agregar primer alumno →',
      ctaPage: 'alumnos',
    }
  }

  if (status === 'expired') {
    return {
      tipo: 'expired',
      color: 'var(--danger)',
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.25)',
      icono: '🔒',
      titulo: 'Trial expirado',
      texto: 'Tu período de prueba terminó. Elegí un plan para seguir usando CALFIT PRO.',
      cta: 'Ver planes →',
      ctaPage: 'planes',
    }
  }

  if (dias_restantes <= 3) {
    return {
      tipo: 'urgent',
      color: 'var(--danger)',
      bg: 'rgba(248,113,113,0.06)',
      border: 'rgba(248,113,113,0.2)',
      icono: '⚠️',
      titulo: `${dias_restantes} día${dias_restantes !== 1 ? 's' : ''} restante${dias_restantes !== 1 ? 's' : ''}`,
      texto: 'Tu trial termina muy pronto. Activá tu plan para no perder el acceso.',
      cta: 'Elegir plan →',
      ctaPage: 'planes',
    }
  }

  if (dias_restantes <= 7) {
    return {
      tipo: 'warning',
      color: 'var(--warning)',
      bg: 'rgba(251,191,36,0.06)',
      border: 'rgba(251,191,36,0.2)',
      icono: '⏳',
      titulo: `${dias_restantes} días de trial restantes`,
      texto: 'Estás aprovechando el período de prueba. ¡Elegí tu plan antes de que termine!',
      cta: 'Ver planes →',
      ctaPage: 'planes',
    }
  }

  return {
    tipo: 'active',
    color: 'var(--lime)',
    bg: 'rgba(200,245,66,0.05)',
    border: 'rgba(200,245,66,0.15)',
    icono: '✓',
    titulo: `Trial activo — ${dias_restantes} días restantes`,
    texto: 'Estás en período de prueba. Explorá todas las funcionalidades sin límites.',
    cta: null,
    ctaPage: null,
  }
}
