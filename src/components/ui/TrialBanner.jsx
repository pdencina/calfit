import { useState, useEffect } from 'react'
import { useAuth } from 'contexts/AuthContext'
import { getTrialStatus, getTrialBannerConfig } from 'lib/trial'

export default function TrialBanner({ setPage }) {
  const { org } = useAuth()
  const [banner, setBanner] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!org) return
    // No mostrar si ya tiene plan pago activo
    if (org.plan_status === 'active') return

    getTrialStatus(org.id)
      .then(status => {
        const config = getTrialBannerConfig(status, org.plan_status)
        setBanner(config)
      })
      .catch(console.error)
  }, [org])

  if (!banner || dismissed) return null
  // No ocultar banners críticos
  const dismissable = banner.tipo === 'active'

  return (
    <div style={{
      background: banner.bg,
      border: `1px solid ${banner.border}`,
      borderRadius: 'var(--radius-md)',
      padding: '14px 20px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 20 }}>{banner.icono}</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: banner.color }}>
          {banner.titulo}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          {banner.texto}
        </div>
      </div>
      {banner.cta && setPage && (
        <button
          onClick={() => setPage(banner.ctaPage)}
          style={{
            background: banner.color,
            color: banner.tipo === 'active' ? 'var(--black)' : 'var(--black)',
            border: 'none',
            borderRadius: 'var(--radius-xs)',
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-body)',
          }}
        >
          {banner.cta}
        </button>
      )}
      {dismissable && (
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
        >
          ×
        </button>
      )}
    </div>
  )
}
