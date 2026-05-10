import { useEffect } from 'react'

export default function LandingPage() {
  useEffect(() => {
    // Redirect to the static landing.html file directly
    // This file exists in public/ and gets copied to build/ by React
    window.location.replace('/landing.html')
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060606',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{
        fontFamily: 'sans-serif',
        fontSize: 52,
        letterSpacing: 10,
        color: '#c8f542',
        fontWeight: 900,
      }}>
        CALFIT
      </div>
      <div style={{
        width: 20, height: 20,
        border: '2px solid #333',
        borderTopColor: '#c8f542',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
