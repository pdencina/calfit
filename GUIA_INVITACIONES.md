# GUIA_INVITACIONES.md — Sistema de invitación de alumnos

## Cómo funciona

1. El profe hace click en **"+ Invitar alumno"**
2. Ingresa nombre y email del alumno
3. CALFIT crea la cuenta automáticamente
4. El alumno recibe un email con sus credenciales
5. El alumno hace click → pone contraseña → entra a sus rutinas

---

## PASO 1 — Configurar emails con Resend (gratis)

Resend es el servicio de email más simple. 3.000 emails/mes gratis.

1. Crear cuenta en **https://resend.com**
2. Verificar tu dominio (o usar el sandbox para pruebas)
3. Ir a API Keys → Create API Key → copiar la key

---

## PASO 2 — Deploy de la Edge Function

```bash
# En la raíz de tu proyecto
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF

# Deploy
npx supabase functions deploy invite-alumno

# Configurar secrets
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxx
npx supabase secrets set FRONTEND_URL=https://calfit-XXXX.vercel.app
```

**Tu Project Ref** lo encontrás en:
Supabase Dashboard → Settings → General → Reference ID

---

## PASO 3 — Verificar que funciona

En Supabase Dashboard → Edge Functions → invite-alumno → Logs

Si ves errores de RESEND_API_KEY, verificá que el secret esté bien configurado.

---

## PASO 4 — Para pruebas sin Resend

Si no querés configurar Resend todavía, podés crear alumnos manualmente:

1. Supabase Dashboard → Authentication → Users → **Add user**
2. Completar email y contraseña (ej: `Calfit2025!`)
3. ✅ tildar "Auto Confirm User"
4. En SQL Editor:
```sql
-- El trigger handle_new_user() crea el perfil automáticamente.
-- Solo necesitás agregarlo a la org del profe:
INSERT INTO public.memberships (org_id, user_id, role, status)
VALUES (
  (SELECT id FROM organizations WHERE owner_id = (SELECT id FROM profiles WHERE email = 'EMAIL_DEL_PROFE')),
  (SELECT id FROM auth.users WHERE email = 'EMAIL_DEL_ALUMNO'),
  'alumno',
  'active'
);
```

---

## CASO INMEDIATO — Agregar contaco@guardiantech.cl

```sql
-- 1. Verificar si existe
SELECT id FROM auth.users WHERE email = 'contaco@guardiantech.cl';

-- 2. Si NO existe, crear desde Auth Dashboard y luego:
INSERT INTO public.memberships (org_id, user_id, role, status)
VALUES (
  (SELECT id FROM organizations WHERE owner_id = 
    (SELECT id FROM profiles WHERE email = 'pencina@armglobal.org')),
  (SELECT id FROM auth.users WHERE email = 'contaco@guardiantech.cl'),
  'alumno',
  'active'
);

-- 3. Verificar
SELECT p.full_name, p.email, m.role, m.status
FROM profiles p
JOIN memberships m ON m.user_id = p.id
WHERE p.email = 'contaco@guardiantech.cl';
```

---

## Personalizar el email de bienvenida

El HTML del email está en:
`supabase/functions/invite-alumno/index.ts` → función `buildEmailHTML()`

Podés cambiar:
- Logo y nombre de tu academia
- Colores (actualmente usa el verde lima de CALFIT)
- Texto del mensaje
- El remitente (from: en sendWelcomeEmail)
