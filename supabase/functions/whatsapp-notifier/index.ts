// supabase/functions/whatsapp-notifier/index.ts
// Envía WhatsApp a Pablo cuando se registra un nuevo profe
// Usa Twilio WhatsApp API (opción más simple) o Meta Cloud API

import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ── Twilio WhatsApp (más fácil de configurar) ──────────────────
async function sendWhatsAppTwilio(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const from       = 'whatsapp:+14155238886' // Sandbox de Twilio

  const body = new URLSearchParams({
    From: from,
    To:   `whatsapp:${to}`,
    Body: message,
  })

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  )

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Twilio error: ${err}`)
  }
  return resp.json()
}

// ── Handler principal ──────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    // Obtener notificaciones no procesadas
    const { data: notifs, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('procesada', false)
      .eq('tipo', 'nuevo_profe')
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw error
    if (!notifs || notifs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
    }

    const TU_WHATSAPP = Deno.env.get('ADMIN_WHATSAPP')! // ej: +56912345678
    let processed = 0

    for (const notif of notifs) {
      const { full_name, email, created_at } = notif.data

      const mensaje = `🏋️ *CALFIT PRO — Nuevo Profe*\n\n` +
        `👤 *Nombre:* ${full_name}\n` +
        `📧 *Email:* ${email}\n` +
        `🕐 *Registrado:* ${new Date(created_at).toLocaleString('es-CL')}\n\n` +
        `💡 _El trial empieza cuando agregue su primer alumno._\n` +
        `👉 Contactar para onboarding.`

      await sendWhatsAppTwilio(TU_WHATSAPP, mensaje)

      // Marcar como procesada
      await supabase
        .from('admin_notifications')
        .update({ procesada: true })
        .eq('id', notif.id)

      processed++
    }

    return new Response(JSON.stringify({ processed }), { status: 200 })

  } catch (err) {
    console.error('WhatsApp notifier error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

/*
══════════════════════════════════════════════════════════════════
SETUP RÁPIDO CON TWILIO SANDBOX (15 minutos)
══════════════════════════════════════════════════════════════════

1. Crear cuenta gratis en https://twilio.com
2. Ir a Console → Messaging → Try it out → Send a WhatsApp message
3. Seguir las instrucciones para activar el Sandbox en tu teléfono
   (básicamente mandás un mensaje a +1 415 523 8886)
4. Copiar Account SID y Auth Token de https://console.twilio.com

5. Deploy la función:
   npx supabase functions deploy whatsapp-notifier

6. Configurar secrets:
   npx supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxx
   npx supabase secrets set TWILIO_AUTH_TOKEN=xxxxxx
   npx supabase secrets set ADMIN_WHATSAPP=+56912345678

7. Crear un cron job en Supabase para llamar esta función cada 5 minutos:
   Supabase Dashboard → Edge Functions → Schedule → cada 5 minutos

══════════════════════════════════════════════════════════════════
ALTERNATIVA: Link de WhatsApp directo (sin backend)
══════════════════════════════════════════════════════════════════

Si no querés configurar Twilio, podés recibir el email de registro
desde Supabase Auth automáticamente (Dashboard → Auth → Email Templates)
y luego abrís el chat de WhatsApp manualmente con este link:

https://wa.me/56912345678?text=Hola%2C+me+registré+en+CALFIT+PRO

Este link se puede poner en el email de bienvenida automático de Supabase.
*/
