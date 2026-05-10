import { useState } from 'react'
import { useAuth } from 'contexts/AuthContext'
import { PLANES_CLP, fmtCLP } from 'lib/trial'

export default function PlanesPage() {
  const { org } = useAuth()
  const [billing, setBilling] = useState('month')
  const currentPlan = org?.plan_id || 'starter'
  const isTrial     = org?.plan_status === 'trialing'
  const isPending   = isTrial && !org?.trial_activated_at

  function handleUpgrade(planId) {
    window.open(`https://wa.me/56912345678?text=Hola%2C+quiero+contratar+el+plan+${planId.toUpperCase()}+de+CALFIT+PRO`, '_blank')
  }

  return (
    <div className="anim-fadeup">
      <div className="page-title">PLANES</div>
      <div className="page-sub">Elegí el plan que se adapta a tu negocio</div>

      {isPending && (
        <div style={{background:'rgba(96,165,250,0.06)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'var(--radius-md)',padding:'14px 18px',marginBottom:24,display:'flex',gap:12}}>
          <span style={{fontSize:18}}>⏸</span>
          <div>
            <div style={{fontSize:14,fontWeight:500,color:'var(--info)'}}>Tu trial empieza cuando agregues tu primer alumno</div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:2}}>No necesitás elegir un plan ahora. Tenés 14 días gratis para explorar todo.</div>
          </div>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:36,justifyContent:'center'}}>
        <button onClick={()=>setBilling('month')} className={`btn ${billing==='month'?'btn-primary':'btn-ghost'}`} style={{padding:'8px 24px',fontSize:13}}>Mensual</button>
        <button onClick={()=>setBilling('year')}  className={`btn ${billing==='year' ?'btn-primary':'btn-ghost'}`} style={{padding:'8px 24px',fontSize:13}}>
          Anual <span style={{fontSize:11,background:'rgba(200,245,66,0.15)',color:'var(--lime)',padding:'2px 8px',borderRadius:20,marginLeft:6}}>−2 meses gratis</span>
        </button>
      </div>

      <div className="grid-3" style={{alignItems:'stretch'}}>
        {PLANES_CLP.map(plan => {
          const precio   = billing==='month' ? plan.precio_mes : Math.round(plan.precio_anual/12)
          const isCurrent= currentPlan===plan.id
          const isUpgrade= ['starter','pro','elite'].indexOf(currentPlan) < ['starter','pro','elite'].indexOf(plan.id)
          return (
            <div key={plan.id} className="card" style={{borderColor:plan.id==='pro'?'rgba(200,245,66,0.3)':'var(--border-dim)',background:plan.id==='pro'?'rgba(200,245,66,0.02)':'var(--surface-1)',display:'flex',flexDirection:'column',position:'relative'}}>
              {plan.badge && <div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:'var(--lime)',color:'var(--black)',fontSize:10,fontWeight:700,letterSpacing:2,padding:'4px 14px',borderRadius:20}}>{plan.badge}</div>}
              <div style={{fontFamily:'var(--font-display)',fontSize:26,letterSpacing:3,color:plan.color,marginBottom:4}}>{plan.nombre}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:20}}>{plan.max_alumnos===Infinity?'Alumnos ilimitados':`Hasta ${plan.max_alumnos} alumnos`}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:40,lineHeight:1,marginBottom:4}}>{fmtCLP(precio)}</div>
              <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>/mes</div>
              {billing==='year'&&<div style={{fontSize:12,color:'var(--lime)',marginBottom:16}}>{fmtCLP(plan.precio_anual)}/año · Ahorrás {fmtCLP(plan.precio_mes*12-plan.precio_anual)}</div>}
              <div style={{height:1,background:'var(--border-dim)',margin:'16px 0'}}/>
              <div style={{flex:1,marginBottom:24}}>
                {plan.features.map((f,i)=><div key={i} style={{display:'flex',gap:8,marginBottom:8,fontSize:13}}><span style={{color:'var(--lime)',flexShrink:0}}>✓</span><span>{f}</span></div>)}
                {plan.sin?.map((f,i)=><div key={i} style={{display:'flex',gap:8,marginBottom:8,fontSize:13,opacity:0.3}}><span style={{flexShrink:0}}>—</span><span>{f}</span></div>)}
              </div>
              {isCurrent
                ? <div style={{padding:'12px',textAlign:'center',border:'1px solid var(--border-mid)',borderRadius:'var(--radius-sm)',color:'var(--text-muted)',fontSize:13}}>Plan actual {isTrial?'(trial)':''}</div>
                : <button onClick={()=>handleUpgrade(plan.id)} className={`btn ${isUpgrade?'btn-primary':'btn-ghost'}`} style={{width:'100%',fontFamily:'var(--font-display)',fontSize:16,letterSpacing:2,padding:13}}>
                    {isUpgrade?'CONTRATAR POR WHATSAPP':'Cambiar plan'}
                  </button>
              }
            </div>
          )
        })}
      </div>

      <div style={{marginTop:28,textAlign:'center'}}>
        <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>Pagos via transferencia, Mercado Pago o WebPay · Factura disponible · Cancelá cuando quieras</div>
        <a href="https://wa.me/56912345678?text=Hola%2C+quiero+contratar+CALFIT+PRO" target="_blank" rel="noreferrer"
          style={{display:'inline-flex',alignItems:'center',gap:8,background:'#25D366',color:'#fff',padding:'12px 28px',borderRadius:8,fontSize:15,fontWeight:500,textDecoration:'none'}}>
          💬 Contratar por WhatsApp
        </a>
      </div>

      <div className="card" style={{marginTop:32}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:20,letterSpacing:2,marginBottom:20}}>PREGUNTAS FRECUENTES</div>
        {[
          {q:'¿Cuándo empieza el trial?',a:'Cuando agregás tu primer alumno. Así no perdés días mientras configurás tu cuenta.'},
          {q:'¿Puedo cambiar de plan después?',a:'Sí, en cualquier momento. Subís de plan inmediatamente, bajás al próximo ciclo.'},
          {q:'¿Cómo se procesa el pago?',a:'Por WhatsApp coordinamos el método — transferencia, Mercado Pago o WebPay. Sin sorpresas.'},
          {q:'¿Los precios incluyen IVA?',a:'Los precios mostrados no incluyen IVA. Para factura con IVA, coordinamos al momento del pago.'},
        ].map((item,i)=>(
          <div key={i} style={{marginBottom:i<3?18:0}}>
            <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{item.q}</div>
            <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6}}>{item.a}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
