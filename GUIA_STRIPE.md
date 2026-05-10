# GUIA_STRIPE.md — Integrar cobros reales en CALFIT PRO

## Arquitectura de pagos

```
Usuario elige plan
      ↓
Frontend llama a tu backend → /create-checkout
      ↓
Backend crea Stripe Checkout Session
      ↓
Usuario paga en Stripe (PCI compliant, vos no tocás la tarjeta)
      ↓
Stripe llama a tu webhook → /stripe-webhook
      ↓
Backend actualiza organizations.plan_id y plan_status en Supabase
      ↓
Usuario ve su nuevo plan activo
```

---

## PASO 1 — Crear cuenta en Stripe

1. https://stripe.com → Registrarse
2. Activar tu cuenta (requiere datos fiscales)
3. En Dashboard → Developers → API Keys → copiar:
   - `Publishable key` (pk_live_...)
   - `Secret key` (sk_live_...) — nunca en el frontend

---

## PASO 2 — Crear productos en Stripe

En Stripe Dashboard → Products → Add product:

| Plan    | Precio mensual | Precio anual |
|---------|---------------|--------------|
| Starter | $19 USD/mes   | $150 USD/año |
| Pro     | $39 USD/mes   | $320 USD/año |
| Elite   | $69 USD/mes   | $560 USD/año |

Para cada plan, creá 2 prices (mensual y anual). Guardá los IDs de precio (price_XXXXX).

---

## PASO 3 — Backend (Supabase Edge Functions)

Crear en `supabase/functions/create-checkout/index.ts`:

```typescript
import Stripe from 'npm:stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

const PRICE_IDS = {
  starter_month: 'price_XXXX',
  starter_year:  'price_XXXX',
  pro_month:     'price_XXXX',
  pro_year:      'price_XXXX',
  elite_month:   'price_XXXX',
  elite_year:    'price_XXXX',
}

Deno.serve(async (req) => {
  const { plan, billing, orgId, userId } = await req.json()
  const priceId = PRICE_IDS[`${plan}_${billing}`]

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${Deno.env.get('FRONTEND_URL')}/success?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${Deno.env.get('FRONTEND_URL')}/planes`,
    metadata: { orgId, userId, plan },
    subscription_data: { metadata: { orgId, plan } }
  })

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Crear en `supabase/functions/stripe-webhook/index.ts`:

```typescript
import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!
  const event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)

  if(event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { orgId, plan } = session.metadata!

    await supabase.from('organizations').update({
      plan_id: plan,
      plan_status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
    }).eq('id', orgId)
  }

  if(event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase.from('organizations')
      .update({ plan_status: 'canceled' })
      .eq('stripe_subscription_id', sub.id)
  }

  if(event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    await supabase.from('organizations')
      .update({ plan_status: 'past_due' })
      .eq('stripe_customer_id', invoice.customer as string)
  }

  return new Response('ok')
})
```

---

## PASO 4 — Deploy Edge Functions

```bash
npx supabase functions deploy create-checkout
npx supabase functions deploy stripe-webhook

# Configurar secrets
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set FRONTEND_URL=https://tu-app.vercel.app
```

---

## PASO 5 — Webhook en Stripe Dashboard

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://TU_PROYECTO.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`

---

## PASO 6 — Actualizar el frontend

En `PlanesPage.jsx`, reemplazar el alert por:

```javascript
async function handleUpgrade(planId) {
  const resp = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
    },
    body: JSON.stringify({ plan: planId, billing, orgId: org.id, userId: profile.id })
  })
  const { url } = await resp.json()
  window.location.href = url  // Redirige a Stripe Checkout
}
```

---

## Variables de entorno adicionales (.env.local)

```
REACT_APP_SUPABASE_URL=https://...
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

## Precios en ARS (opcional)

Si querés cobrar en pesos argentinos, en Stripe creás los productos con currency: 'ars'
y usás los precios en centavos de ARS. Stripe acepta pagos locales argentinos.

## Facturación

Para emitir facturas/recibos automáticos, en Stripe Dashboard:
Settings → Billing → Customer emails → activar "Successful payment"
