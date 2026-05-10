// supabase/functions/invite-alumno/index.ts
// Crea el usuario en Supabase Auth y lo agrega a la org del profe
// Usa service_role para tener permisos de admin

import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // admin — puede crear usuarios
  { auth: { autoRefreshToken: false, persistSession: false } }
)

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    // Verificar que quien llama es un profe autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No autorizado')

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !caller) throw new Error('Token inválido')

    // Verificar que el caller es profe/owner
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !['profe', 'admin'].includes(callerProfile.role)) {
      throw new Error('Solo los profesores pueden invitar alumnos')
    }

    // Datos del alumno a invitar
    const { email, full_name, org_id } = await req.json()

    if (!email || !full_name || !org_id) {
      throw new Error('Se requieren email, full_name y org_id')
    }

    // Verificar límite de alumnos según plan
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('*, plans(max_alumnos)')
      .eq('id', org_id)
      .single()

    const { count: alumnosActuales } = await supabaseAdmin
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .eq('role', 'alumno')
      .eq('status', 'active')

    const maxAlumnos = org?.plans?.max_alumnos || 10
    if ((alumnosActuales || 0) >= maxAlumnos) {
      throw new Error(`Límite de ${maxAlumnos} alumnos alcanzado. Mejorá tu plan para agregar más.`)
    }

    // Verificar si el email ya existe en auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === email)

    let alumnoId: string

    if (existing) {
      // Ya existe — solo agregar a la org
      alumnoId = existing.id

      // Actualizar nombre si está vacío
      await supabaseAdmin
        .from('profiles')
        .update({ full_name })
        .eq('id', alumnoId)
        .eq('full_name', email.split('@')[0]) // solo si tiene nombre genérico

    } else {
      // Crear nuevo usuario con contraseña temporal
      const tempPassword = generatePassword()

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // confirmar automáticamente
        user_metadata: {
          full_name,
          role: 'alumno',
          invited_by: caller.id,
          org_id,
          temp_password: tempPassword, // para incluir en el email
        }
      })

      if (createErr) throw createErr
      alumnoId = newUser.user.id

      // El trigger handle_new_user() ya crea el profile automáticamente
      // Esperar un momento para que el trigger se ejecute
      await new Promise(r => setTimeout(r, 500))

      // Enviar email de bienvenida con link de acceso
      const appUrl = Deno.env.get('FRONTEND_URL') || 'https://calfit.vercel.app'
      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', org_id)
        .single()

      const { data: profeProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', caller.id)
        .single()

      await sendWelcomeEmail({
        to: email,
        alumnoName: full_name,
        profeNombre: profeProfile?.full_name || 'Tu entrenador',
        orgNombre: orgData?.name || 'CALFIT PRO',
        appUrl,
        tempPassword,
      })
    }

    // Agregar a la org como alumno
    const { error: memberErr } = await supabaseAdmin
      .from('memberships')
      .upsert({
        org_id,
        user_id: alumnoId,
        role: 'alumno',
        status: 'active',
      }, { onConflict: 'org_id,user_id' })

    if (memberErr) throw memberErr

    // Notificar al admin (Pablo) por WhatsApp si está configurado
    try {
      await supabaseAdmin
        .from('admin_notifications')
        .insert({
          tipo: 'alumno_invitado',
          data: {
            profe_name: (await supabaseAdmin.from('profiles').select('full_name').eq('id', caller.id).single()).data?.full_name,
            alumno_email: email,
            alumno_name: full_name,
            org_id,
            is_new_user: !existing,
          }
        })
    } catch (_) { /* no crítico */ }

    return new Response(
      JSON.stringify({
        success: true,
        is_new_user: !existing,
        message: existing
          ? `${full_name} ya tenía cuenta y fue agregado a tu organización.`
          : `Invitación enviada a ${email}. El alumno recibirá un email para activar su cuenta.`
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )

  } catch (err: any) {
    console.error('invite-alumno error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})

// ── Helpers ──────────────────────────────────────────────────────

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)]
  }
  return pass
}

async function sendWelcomeEmail({
  to, alumnoName, profeNombre, orgNombre, appUrl, tempPassword
}: {
  to: string
  alumnoName: string
  profeNombre: string
  orgNombre: string
  appUrl: string
  tempPassword: string
}) {
  // Opción A: Resend (recomendado, 3000 emails/mes gratis)
  const resendKey = Deno.env.get('RESEND_API_KEY')

  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CALFIT PRO <noreply@calfit.app>',
        to: [to],
        subject: `${profeNombre} te invitó a CALFIT PRO 💪`,
        html: buildEmailHTML({ alumnoName, profeNombre, orgNombre, appUrl, tempPassword, email: to }),
      })
    })
    return
  }

  // Opción B: SMTP via Supabase (usa el email de Supabase Auth como fallback)
  console.log(`Email no enviado — configurar RESEND_API_KEY. Credenciales: ${to} / ${tempPassword}`)
}

function buildEmailHTML({
  alumnoName, profeNombre, orgNombre, appUrl, tempPassword, email
}: {
  alumnoName: string
  profeNombre: string
  orgNombre: string
  appUrl: string
  tempPassword: string
  email: string
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#0e0e0e;padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.06)">
            <span style="font-family:'Arial Black',Arial,sans-serif;font-size:26px;letter-spacing:6px;color:#c8f542;font-weight:900">CALFIT</span>
            <span style="font-size:11px;letter-spacing:3px;color:#555;margin-left:8px;text-transform:uppercase">PRO</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 36px">
            <p style="color:#c8f542;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px">Fuiste invitado</p>
            <h1 style="color:#f0efe8;font-size:28px;font-weight:800;margin:0 0 16px;line-height:1.2">
              Hola ${alumnoName} 👋
            </h1>
            <p style="color:#888;font-size:15px;line-height:1.7;margin:0 0 28px">
              <strong style="color:#f0efe8">${profeNombre}</strong> te invitó a entrenar en <strong style="color:#f0efe8">${orgNombre}</strong> a través de CALFIT PRO.<br/>
              Tu cuenta ya está lista. Usá las credenciales de abajo para ingresar.
            </p>

            <!-- Credenciales -->
            <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px 24px;margin-bottom:28px">
              <p style="color:#555;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px">Tus credenciales</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#888;font-size:13px;padding:6px 0">Email</td>
                  <td style="color:#f0efe8;font-size:13px;font-weight:500;text-align:right">${email}</td>
                </tr>
                <tr>
                  <td style="color:#888;font-size:13px;padding:6px 0">Contraseña temporal</td>
                  <td style="color:#c8f542;font-size:16px;font-weight:700;text-align:right;letter-spacing:2px;font-family:monospace">${tempPassword}</td>
                </tr>
              </table>
            </div>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${appUrl}/login" style="display:inline-block;background:#c8f542;color:#0a0a0a;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:2px;text-transform:uppercase">
                    ACTIVAR MI CUENTA →
                  </a>
                </td>
              </tr>
            </table>

            <p style="color:#555;font-size:12px;text-align:center;margin:20px 0 0">
              O ingresá en <a href="${appUrl}/login" style="color:#c8f542">${appUrl}/login</a>
            </p>

            <!-- Tip -->
            <div style="background:rgba(200,245,66,0.05);border:1px solid rgba(200,245,66,0.15);border-radius:8px;padding:16px 20px;margin-top:28px">
              <p style="color:#c8f542;font-size:12px;font-weight:600;margin:0 0 6px">💡 Tip</p>
              <p style="color:#888;font-size:13px;margin:0;line-height:1.6">
                Te recomendamos cambiar tu contraseña la primera vez que ingreses. Podés hacerlo desde Configuración dentro de la app.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06)">
            <p style="color:#444;font-size:12px;margin:0;text-align:center">
              CALFIT PRO · Plataforma profesional de calistenia<br/>
              Si no esperabas este email, podés ignorarlo.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `
}
