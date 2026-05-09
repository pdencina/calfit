import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getConversaciones, getOrCreateConversacion,
  getMessages, sendMessage, subscribeToMessages,
  getAlumnos
} from '../../lib/supabase'

function MessageBubble({ msg, isMe }) {
  const time = new Date(msg.created_at).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})
  return (
    <div style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom:8 }}>
      <div style={{
        maxWidth:'70%', padding:'10px 14px',
        background: isMe ? 'var(--lime)' : 'var(--surface-2)',
        color: isMe ? 'var(--black)' : 'var(--text-primary)',
        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        fontSize:14, lineHeight:1.5,
      }}>
        {!isMe && <div style={{ fontSize:11, fontWeight:600, color: isMe ? 'var(--black)' : 'var(--lime)', marginBottom:4 }}>{msg.sender?.full_name}</div>}
        {msg.content}
        <div style={{ fontSize:10, opacity:0.6, textAlign:'right', marginTop:4 }}>{time}</div>
      </div>
    </div>
  )
}

export default function MensajesPage() {
  const { profile, org } = useAuth()
  const [convos, setConvos]         = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages]     = useState([])
  const [newMsg, setNewMsg]         = useState('')
  const [sending, setSending]       = useState(false)
  const [alumnos, setAlumnos]       = useState([])
  const [loading, setLoading]       = useState(true)
  const messagesEnd = useRef(null)
  const channelRef  = useRef(null)

  const isProfe = profile?.role === 'profe'

  useEffect(() => {
    if(!profile) return
    Promise.all([
      getConversaciones(profile.id),
      isProfe && org ? getAlumnos(org.id) : Promise.resolve([])
    ]).then(([c, a]) => {
      setConvos(c || [])
      setAlumnos(a || [])
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [profile, org])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  async function openConvo(convo) {
    setActiveConvo(convo)
    const msgs = await getMessages(convo.id).catch(()=>[])
    setMessages(msgs)

    // Realtime
    if(channelRef.current) channelRef.current.unsubscribe()
    channelRef.current = subscribeToMessages(convo.id, payload => {
      setMessages(prev => {
        if(prev.some(m => m.id === payload.new.id)) return prev
        return [...prev, { ...payload.new, sender:{ full_name:'' } }]
      })
    })
  }

  async function startConvoWithAlumno(alumno) {
    if(!org) return
    const convo = await getOrCreateConversacion(org.id, profile.id, alumno.id)
    const convosActualizadas = await getConversaciones(profile.id)
    setConvos(convosActualizadas)
    const found = convosActualizadas.find(c => c.id === convo.id)
    if(found) openConvo(found)
  }

  async function handleSend(e) {
    e.preventDefault()
    if(!newMsg.trim() || !activeConvo || sending) return
    setSending(true)
    try {
      const msg = await sendMessage(activeConvo.id, profile.id, newMsg.trim())
      setMessages(prev => [...prev, { ...msg, sender:{ full_name: profile.full_name } }])
      setNewMsg('')
      // Actualizar last_message
      setConvos(prev => prev.map(c => c.id === activeConvo.id ? { ...c, last_message_at: new Date().toISOString() } : c))
    } catch(e) { console.error(e) }
    finally { setSending(false) }
  }

  function getOtherPerson(convo) {
    return isProfe ? convo.alumno : convo.profe
  }

  function getInitials(name='') {
    return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  }

  return (
    <div style={{ display:'flex', height:'calc(100vh - var(--topbar-h) - 56px)', gap:0, border:'1px solid var(--border-dim)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>

      {/* Panel izquierdo */}
      <div style={{ width:280, background:'var(--surface-1)', borderRight:'1px solid var(--border-dim)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'16px', borderBottom:'1px solid var(--border-dim)' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:18, letterSpacing:2, marginBottom:10 }}>MENSAJES</div>

          {/* Nuevo chat (solo profe) */}
          {isProfe && alumnos.length > 0 && (
            <div>
              <label style={{ marginBottom:6 }}>Iniciar chat con alumno</label>
              <select onChange={e => {
                const a = alumnos.find(al => al.id === e.target.value)
                if(a) startConvoWithAlumno(a)
                e.target.value = ''
              }} style={{ fontSize:12 }}>
                <option value="">Seleccionar alumno...</option>
                {alumnos.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {loading && <div className="loader" style={{ padding:20 }}><div className="spinner"/></div>}
          {!loading && convos.length === 0 && (
            <div style={{ padding:20, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              {isProfe ? 'Iniciá una conversación con un alumno' : 'Sin mensajes aún. Tu profe se comunicará contigo.'}
            </div>
          )}
          {convos.map(c => {
            const other = getOtherPerson(c)
            const isActive = activeConvo?.id === c.id
            return (
              <div key={c.id}
                style={{ padding:'12px 16px', cursor:'pointer', background: isActive ? 'var(--lime-glow)' : 'transparent', borderLeft: isActive ? '2px solid var(--lime)' : '2px solid transparent', display:'flex', alignItems:'center', gap:10, transition:'all 0.15s' }}
                onClick={() => openConvo(c)}>
                <div className="avatar avatar-sm">{getInitials(other?.full_name)}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{other?.full_name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {new Date(c.last_message_at).toLocaleDateString('es', {day:'numeric',month:'short'})}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Panel derecho - chat */}
      {activeConvo ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--surface-0)' }}>
          {/* Header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-dim)', display:'flex', alignItems:'center', gap:12, background:'var(--surface-1)' }}>
            <div className="avatar avatar-md">{getInitials(getOtherPerson(activeConvo)?.full_name)}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:500 }}>{getOtherPerson(activeConvo)?.full_name}</div>
              <div style={{ fontSize:11, color:'var(--success)' }}>● En línea</div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13, marginTop:40 }}>
                Iniciá la conversación 👋
              </div>
            )}
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_id === profile.id}/>
            ))}
            <div ref={messagesEnd}/>
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding:'14px 20px', borderTop:'1px solid var(--border-dim)', display:'flex', gap:10 }}>
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              placeholder="Escribí tu mensaje..."
              style={{ flex:1 }}
              onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) handleSend(e) }}
            />
            <button type="submit" className="btn btn-primary" disabled={!newMsg.trim() || sending} style={{ flexShrink:0 }}>
              {sending ? '...' : 'Enviar ↑'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:40, opacity:0.2 }}>💬</div>
          <div style={{ fontSize:13, letterSpacing:1 }}>
            {isProfe ? 'Seleccioná un alumno para chatear' : 'Seleccioná una conversación'}
          </div>
        </div>
      )}
    </div>
  )
}
