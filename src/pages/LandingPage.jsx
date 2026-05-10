import { useEffect } from 'react'

// La landing se inyecta como HTML puro para preservar todos los estilos y scripts
// sin conflictos con el CSS de React

export default function LandingPage() {
  useEffect(() => {
    // Cargar la landing.html como documento completo
    fetch('/landing.html')
      .then(r => r.text())
      .then(html => {
        // Reemplazar el documento completo
        document.open()
        document.write(html)
        document.close()
      })
      .catch(() => {
        // Fallback inline si no carga
        window.location.href = '/login'
      })
  }, [])

  // Mostrar loading mientras carga
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
