import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const PLANS = [
  {
    id: 'starter',
    name: 'STARTER',
    price_month: 19,
    price_year: 150,
    max_alumnos: 10,
    color: 'var(--text-secondary)',
    badge: null,
    features: [
      'Hasta 10 alumnos',
      'Rutinas personalizadas ilimitadas',
      'Mensajería con alumnos',
      'Dashboard básico',
      'Historial de sesiones',
      'Soporte por email',
    ],
    missing: ['Métricas corporales avanzadas','Videos en ejercicios','Nutrición','API access'],
  },
  {
    id: 'pro',
    name: 'PRO',
    price_month: 39,
    price_year: 320,
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
    missing: ['API access','White label','Manager de equipo'],
  },
  {
    id: 'elite',
    name: 'ELITE',
    price_month: 69,
    price_year: 560,
    max_alumnos: Infinity,
    color: 'var(--warning)',
    badge: null,
    features: [
      'Alumnos ilimitados',
      'Todo lo de Pro',
      'White label (tu marca)',
      'API access completo',
      'Manager de equipo (coaches)',
      'Onboarding dedicado 1:1',
      'SLA 99.9% uptime',
    ],
    missing: [],
  },
]

export default function PlanesPage() {
  const { org } = useAuth()
  const [billing, setBilling] = useState('month')
  const currentPlan = org?.plan_id || 'starter'
  const isTrial = org?.plan_status === 'trialing'

  function handleUpgrade(planId) {
    // En producción: redirigir a Stripe Checkout
    // const checkoutUrl = `${process.env.REACT_APP_API_URL}/create-checkout?plan=${planId}&billing=${billing}&org=${org.id}`
    // window.location.href = checkoutUrl
    alert(`Para integrar pagos reales:\n\n1. Crear productos en Stripe Dashboard\n2. Implementar endpoint /create-checkout en tu backend\n3. Configurar webhook /stripe-webhook para actualizar plan_status en Supabase\n\nVer GUIA_STRIPE.md incluida en el proyecto.`)
  }

  return (
    <div className="anim-fadeup">
      <div className="page-title">PLANES Y PRECIOS</div>
      <div className="page-sub">Elegí el plan que se adapta a tu negocio</div>

      {isTrial && (
        <div className="alert alert-warning" style={{ marginBottom:24 }}>
          ⏳ Estás en período de prueba gratuita de 14 días. Elegí un plan antes de que expire para no perder el acceso.
        </div>
      )}

      {/* Toggle mensual / anual */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:36, justifyContent:'center' }}>
        <button className={`btn ${billing==='month' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setBilling('month')} style={{ padding:'8px 24px' }}>
          Mensual
        </button>
        <button className={`btn ${billing==='year' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setBilling('year')} style={{ padding:'8px 24px' }}>
          Anual
          <span style={{ fontSize:11, background:'rgba(200,245,66,0.15)', color:'var(--lime)', padding:'2px 8px', borderRadius:20, marginLeft:4 }}>-35%</span>
        </button>
      </div>

      {/* Cards */}
      <div className="grid-3" style={{ marginBottom:48 }}>
        {PLANS.map(plan => {
          const price = billing === 'month' ? plan.price_month : Math.round(plan.price_year/12)
          const isCurrent = currentPlan === plan.id
          const isUpgrade = PLANS.findIndex(p=>p.id===currentPlan) < PLANS.findIndex(p=>p.id===plan.id)

          return (
            <div key={plan.id} className="card" style={{
              borderColor: plan.id==='pro' ? 'rgba(200,245,66,0.3)' : 'var(--border-dim)',
              background: plan.id==='pro' ? 'rgba(200,245,66,0.02)' : 'var(--surface-1)',
              display:'flex', flexDirection:'column',
              position:'relative',
            }}>
              {plan.badge && (
                <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'var(--lime)', color:'var(--black)', fontSize:10, fontWeight:700, letterSpacing:2, padding:'4px 14px', borderRadius:20 }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ fontFamily:'var(--font-display)', fontSize:28, letterSpacing:3, color:plan.color, marginBottom:4 }}>
                {plan.name}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:20 }}>
                {plan.max_alumnos === Infinity ? 'Alumnos ilimitados' : `Hasta ${plan.max_alumnos} alumnos`}
              </div>

              <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:52, lineHeight:1, color:'var(--text-primary)' }}>${price}</span>
                <span style={{ color:'var(--text-secondary)', fontSize:13 }}>/mes</span>
              </div>
              {billing==='year' && (
                <div style={{ fontSize:12, color:'var(--lime)', marginBottom:16 }}>
                  ${plan.price_year}/año · Ahorrás ${plan.price_month*12 - plan.price_year}
                </div>
              )}

              <div className="divider"/>

              <div style={{ flex:1, marginBottom:24 }}>
                {plan.features.map((f,i) => (
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:8, fontSize:13 }}>
                    <span style={{ color:'var(--lime)', flexShrink:0 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                {plan.missing.map((f,i) => (
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:8, fontSize:13, opacity:0.35 }}>
                    <span style={{ flexShrink:0 }}>–</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div className="btn btn-ghost" style={{ textAlign:'center', opacity:0.5, cursor:'default' }}>
                  Plan actual {isTrial ? '(trial)' : ''}
                </div>
              ) : (
                <button
                  className={`btn ${isUpgrade ? 'btn-display' : 'btn-ghost'}`}
                  onClick={() => handleUpgrade(plan.id)}
                  style={{ width:'100%' }}
                >
                  {isUpgrade ? 'Elegir plan' : 'Bajar plan'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="card" style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:22, letterSpacing:2, marginBottom:20 }}>PREGUNTAS FRECUENTES</div>
        {[
          { q:'¿Puedo cambiar de plan en cualquier momento?', a:'Sí. Si subís de plan se te cobra la diferencia prorrateada. Si bajás, el cambio aplica al próximo ciclo.' },
          { q:'¿Qué pasa si llego al límite de alumnos?', a:'No podés agregar nuevos alumnos hasta que subas tu plan o des de baja alguno existente.' },
          { q:'¿Cómo se procesa el pago?', a:'A través de Stripe, la plataforma de pagos más segura del mundo. Aceptamos todas las tarjetas de crédito y débito.' },
          { q:'¿Hay permanencia mínima?', a:'No. Podés cancelar cuando quieras. Si cancelás en plan anual, te devolvemos el proporcional no utilizado.' },
        ].map((item,i) => (
          <div key={i} style={{ marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>{item.q}</div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>{item.a}</div>
          </div>
        ))}
      </div>

      {/* Integración Stripe */}
      <div className="card" style={{ background:'rgba(251,191,36,0.04)', borderColor:'rgba(251,191,36,0.15)' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:2, color:'var(--warning)', marginBottom:12 }}>
          ⚙️ INTEGRAR PAGOS REALES (STRIPE)
        </div>
        <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.8 }}>
          Para activar los cobros reales necesitás:<br/>
          <strong style={{ color:'var(--text-primary)' }}>1.</strong> Crear cuenta en <a href="https://stripe.com" target="_blank" rel="noreferrer">stripe.com</a> y crear los productos/precios<br/>
          <strong style={{ color:'var(--text-primary)' }}>2.</strong> Backend mínimo (Node.js/Edge Function) con 2 endpoints:<br/>
          &nbsp;&nbsp;• <code style={{ background:'var(--surface-3)', padding:'1px 6px', borderRadius:4, fontSize:12 }}>POST /create-checkout</code> → crea sesión de Stripe Checkout<br/>
          &nbsp;&nbsp;• <code style={{ background:'var(--surface-3)', padding:'1px 6px', borderRadius:4, fontSize:12 }}>POST /stripe-webhook</code> → actualiza <code style={{ background:'var(--surface-3)', padding:'1px 6px', borderRadius:4, fontSize:12 }}>organizations.plan_status</code> en Supabase<br/>
          <strong style={{ color:'var(--text-primary)' }}>3.</strong> Agregar <code style={{ background:'var(--surface-3)', padding:'1px 6px', borderRadius:4, fontSize:12 }}>REACT_APP_STRIPE_KEY</code> a las variables de entorno<br/><br/>
          Todo esto está documentado en <strong style={{ color:'var(--text-primary)' }}>GUIA_STRIPE.md</strong> incluido en el proyecto.
        </div>
      </div>
    </div>
  )
}
