import { useAuth } from 'contexts/AuthContext'

export default function BienvenidaProfe({ setPage }) {
  const { profile, org } = useAuth()
  const nombre = profile?.full_name?.split(' ')[0] || 'Profe'

  const pasos = [
    {
      num: '01',
      titulo: 'Agregá tu primer alumno',
      desc: 'Esto activa tus 14 días de prueba gratis. Sin alumno, el contador no corre.',
      cta: 'Ir a Alumnos →',
      page: 'alumnos',
      color: 'var(--lime)',
      done: false,
    },
    {
      num: '02',
      titulo: 'Creá su primera rutina',
      desc: 'Diseñá una rutina personalizada con los ejercicios que tu alumno necesita.',
      cta: 'Crear rutina →',
      page: 'rutinas',
      color: 'var(--info)',
      done: false,
    },
    {
      num: '03',
      titulo: 'Configurá los cobros',
      desc: 'Conectá Mercado Pago y creá el primer contrato para empezar a cobrar.',
      cta: 'Configurar →',
      page: 'admin',
      color: 'var(--warning)',
      done: false,
    },
  ]

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 0' }}>

      {/* Header de bienvenida */}
      <div style={{
        background: 'var(--lime-glow)',
        border: '1px solid rgba(200,245,66,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        marginBottom: 28,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36, letterSpacing: 3,
          color: 'var(--lime)', marginBottom: 8,
        }}>
          ¡Bienvenido, {nombre}!
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Tu cuenta está lista. <strong style={{ color: 'var(--white)' }}>Tus 14 días gratis empiezan cuando agregues tu primer alumno.</strong>{' '}
          Seguí estos 3 pasos para arrancar.
        </p>
      </div>

      {/* Banner info trial */}
      <div style={{
        background: 'rgba(96,165,250,0.06)',
        border: '1px solid rgba(96,165,250,0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        marginBottom: 28,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18 }}>⏸</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--info)' }}>Trial en espera</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            El período de prueba no está corriendo todavía. Empieza cuando agregues tu primer alumno — así no perdés días por demora nuestra o tuya.
          </div>
        </div>
      </div>

      {/* Pasos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pasos.map((paso, i) => (
          <div
            key={i}
            className="card card-hover"
            style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', cursor: 'pointer', borderColor: 'var(--border-dim)' }}
            onClick={() => setPage(paso.page)}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 40, lineHeight: 1,
              color: paso.color, opacity: 0.3,
              flexShrink: 0, width: 48,
            }}>
              {paso.num}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{paso.titulo}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{paso.desc}</div>
            </div>
            <span style={{ fontSize: 13, color: paso.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {paso.cta}
            </span>
          </div>
        ))}
      </div>

      {/* Nota WhatsApp */}
      <div style={{
        marginTop: 28, padding: '16px 20px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-dim)',
        borderRadius: 'var(--radius-md)',
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <span style={{ fontSize: 24 }}>💬</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>¿Necesitás ayuda para empezar?</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Escribinos por WhatsApp y te ayudamos a configurar todo en menos de 15 minutos.
          </div>
        </div>
        <a
          href="https://wa.me/56912345678?text=Hola%2C+me+registré+en+CALFIT+PRO+y+necesito+ayuda+para+empezar"
          target="_blank"
          rel="noreferrer"
          style={{
            background: '#25D366', color: '#fff',
            border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13,
            fontWeight: 500, cursor: 'pointer',
            whiteSpace: 'nowrap', textDecoration: 'none',
            flexShrink: 0, display: 'inline-block',
          }}
        >
          WhatsApp
        </a>
      </div>
    </div>
  )
}
