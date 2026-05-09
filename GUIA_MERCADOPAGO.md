# GUIA_MERCADOPAGO.md — Integrar Mercado Pago en CALFIT PRO

## Por qué Mercado Pago para Argentina

Mercado Pago es el método preferido en Argentina: acepta todas las tarjetas locales,
transferencias bancarias, cuotas sin interés, y tiene la mayor adopción en el país.

---

## Arquitectura del flujo de cobro

```
Profe hace click en "Cobrar MP" en la cuota
        ↓
Frontend llama a Edge Function → /mp-create-preference
        ↓
Edge Function crea preferencia en la API de MP
        ↓
Retorna init_point (URL de pago)
        ↓
Se abre en nueva pestaña → Alumno paga en Mercado Pago
        ↓
MP llama a tu webhook → /mp-webhook
        ↓
Edge Function actualiza cuotas.estado = 'pagado' en Supabase
```

---

## PASO 1 — Crear cuenta en Mercado Pago Developers

1. https://www.mercadopago.com.ar/developers
2. Registrarse con tu cuenta de MP personal
3. Crear aplicación → copiar:
   - **Access Token** (producción)
   - **Access Token** (test — para pruebas)
   - **Webhook secret** (lo configurás en el siguiente paso)

---

## PASO 2 — Edge Function: crear preferencia

Crear en `supabase/functions/mp-create-preference/index.ts`:

```typescript
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!

Deno.serve(async (req) => {
  const { cuotaId, alumnoEmail, monto, concepto } = await req.json()

  const preference = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{
        title: concepto,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: Number(monto),
      }],
      payer: { email: alumnoEmail },
      external_reference: String(cuotaId),
      back_urls: {
        success: `${Deno.env.get('FRONTEND_URL')}/pago-exitoso`,
        failure: `${Deno.env.get('FRONTEND_URL')}/pago-fallido`,
        pending: `${Deno.env.get('FRONTEND_URL')}/pago-pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
      // Para cuotas sin interés (requiere integración con tu banco):
      // payment_methods: { installments: 12 }
    }),
  }).then(r => r.json())

  return new Response(
    JSON.stringify({ preference_id: preference.id, init_point: preference.init_point }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

## PASO 3 — Edge Function: webhook

Crear en `supabase/functions/mp-webhook/index.ts`:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const body = await req.json()

  // Solo procesar pagos aprobados
  if (body.type !== 'payment' || body.action !== 'payment.updated') {
    return new Response('ok')
  }

  // Obtener el pago desde MP
  const payment = await fetch(
    `https://api.mercadopago.com/v1/payments/${body.data.id}`,
    { headers: { 'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` } }
  ).then(r => r.json())

  if (payment.status === 'approved') {
    const cuotaId = parseInt(payment.external_reference)
    await supabase.from('cuotas').update({
      estado: 'pagado',
      metodo_pago: 'mercadopago',
      mp_payment_id: String(payment.id),
      fecha_pago: new Date().toISOString().split('T')[0],
    }).eq('id', cuotaId)
  }

  return new Response('ok')
})
```

---

## PASO 4 — Deploy y configuración

```bash
# Deploy
npx supabase functions deploy mp-create-preference
npx supabase functions deploy mp-webhook

# Secrets
npx supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxx
npx supabase secrets set FRONTEND_URL=https://tu-app.vercel.app
```

En el Dashboard de Mercado Pago Developers → Tu App → Webhooks:
- URL: `https://TU_PROYECTO.supabase.co/functions/v1/mp-webhook`
- Eventos: `payment`

---

## PASO 5 — Pruebas

MP provee usuarios de prueba y tarjetas de test:

```
Tarjeta Visa test:     4509 9535 6623 3704
CVV:                   123
Fecha vencimiento:     11/25
Nombre:                APRO (para simular pago aprobado)
```

Usuarios de prueba: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test

---

## Link de pago directo (alternativa simple)

Si no querés implementar el webhook todavía, podés crear links de pago
directamente desde el Dashboard de MP y enviárselos al alumno por mensaje.
El profe lo marca como pagado manualmente cuando recibe la confirmación.

Esta es la forma más rápida de empezar — sin código backend.

---

## Comisiones de Mercado Pago (2025)

| Tipo de pago          | Comisión aproximada |
|-----------------------|---------------------|
| Débito                | 0.8%                |
| Crédito 1 cuota       | 2.99%               |
| Crédito 3+ cuotas     | 4.99% - 6.79%       |
| Transferencia MP      | 0%                  |

El dinero queda disponible en tu cuenta de MP en 1-2 días hábiles.
Podés configurar débito automático para que los alumnos no tengan que pagar manualmente cada mes.
