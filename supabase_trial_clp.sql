-- ================================================================
-- CALFIT PRO — Migración: Trial inteligente + CLP + WhatsApp
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. ACTUALIZAR PLANES A CLP
-- ────────────────────────────────────────────────────────────────
-- USD 19  → CLP ~18.000  (redondeado comercialmente)
-- USD 39  → CLP ~37.000
-- USD 69  → CLP ~65.000
UPDATE public.plans SET
  price_monthly = 18000,
  price_yearly  = 145000,
  features = '["Hasta 10 alumnos","Rutinas ilimitadas","Mensajería","Dashboard básico","Cobros con Mercado Pago"]'
WHERE id = 'starter';

UPDATE public.plans SET
  price_monthly = 37000,
  price_yearly  = 295000,
  features = '["Hasta 50 alumnos","Todo Starter","Métricas avanzadas","Videos en ejercicios","Nutrición","Soporte prioritario"]'
WHERE id = 'pro';

UPDATE public.plans SET
  price_monthly = 65000,
  price_yearly  = 520000,
  features = '["Alumnos ilimitados","Todo Pro","White label","API access","Manager de equipo","Onboarding 1:1"]'
WHERE id = 'elite';

-- ────────────────────────────────────────────────────────────────
-- 2. TRIAL INTELIGENTE
-- El trial_ends_at se resetea cuando el profe agrega su PRIMER alumno
-- Hasta ese momento, la cuenta existe pero el contador no corre
-- ────────────────────────────────────────────────────────────────

-- Agregar columna para saber si el trial ya fue activado
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_notified   BOOLEAN DEFAULT FALSE;

-- Actualizar orgs existentes: si ya tienen alumnos, trial ya activado
UPDATE public.organizations o
SET trial_activated_at = o.created_at
WHERE EXISTS (
  SELECT 1 FROM public.memberships m
  WHERE m.org_id = o.id AND m.role = 'alumno' AND m.status = 'active'
)
AND trial_activated_at IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 3. FUNCIÓN: activar trial cuando se agrega el primer alumno
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activate_trial_on_first_alumno()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  alumno_count INT;
  org_record   public.organizations%ROWTYPE;
BEGIN
  -- Solo si es un alumno nuevo activo
  IF NEW.role <> 'alumno' OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Contar alumnos previos en esta org
  SELECT COUNT(*) INTO alumno_count
  FROM public.memberships
  WHERE org_id = NEW.org_id AND role = 'alumno' AND status = 'active'
    AND id <> NEW.id;

  -- Si es el primero, activar trial
  IF alumno_count = 0 THEN
    UPDATE public.organizations
    SET
      trial_activated_at = NOW(),
      trial_ends_at      = NOW() + INTERVAL '14 days',
      plan_status        = 'trialing'
    WHERE id = NEW.org_id AND trial_activated_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_activate_trial ON public.memberships;
CREATE TRIGGER trigger_activate_trial
  AFTER INSERT ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.activate_trial_on_first_alumno();

-- ────────────────────────────────────────────────────────────────
-- 4. FUNCIÓN: notificar por WhatsApp al registrarse un nuevo profe
-- Esto actúa como webhook — lo procesamos desde una Edge Function
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_profe_registration()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insertar en tabla de notificaciones del admin
  -- La Edge Function whatsapp-notifier escucha esta tabla via Realtime
  IF NEW.role = 'profe' THEN
    INSERT INTO public.admin_notifications (tipo, data)
    VALUES (
      'nuevo_profe',
      jsonb_build_object(
        'profe_id',   NEW.id,
        'full_name',  NEW.full_name,
        'email',      NEW.email,
        'created_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Tabla de notificaciones para el admin
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id         BIGSERIAL PRIMARY KEY,
  tipo       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  procesada  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar realtime en esta tabla para que la Edge Function la escuche
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

DROP TRIGGER IF EXISTS trigger_notify_new_profe ON public.profiles;
CREATE TRIGGER trigger_notify_new_profe
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_profe_registration();

-- ────────────────────────────────────────────────────────────────
-- 5. FUNCIÓN: calcular días restantes de trial (considerando activación)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_trial_status(org_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  org public.organizations%ROWTYPE;
  dias_restantes INT;
  resultado JSONB;
BEGIN
  SELECT * INTO org FROM public.organizations WHERE id = org_id;

  IF org.plan_status NOT IN ('trialing') THEN
    RETURN jsonb_build_object('status', org.plan_status, 'dias_restantes', null, 'activado', true);
  END IF;

  IF org.trial_activated_at IS NULL THEN
    -- Trial aún no activado (no tiene alumnos)
    RETURN jsonb_build_object(
      'status', 'pending',
      'dias_restantes', 14,
      'activado', false,
      'mensaje', 'El período de prueba empieza cuando agregues tu primer alumno'
    );
  END IF;

  dias_restantes := GREATEST(0, EXTRACT(DAY FROM (org.trial_ends_at - NOW()))::INT);

  RETURN jsonb_build_object(
    'status', CASE WHEN dias_restantes > 0 THEN 'trialing' ELSE 'expired' END,
    'dias_restantes', dias_restantes,
    'activado', true,
    'trial_inicio', org.trial_activated_at,
    'trial_fin', org.trial_ends_at
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 6. VISTA: resumen financiero en CLP
-- ────────────────────────────────────────────────────────────────
-- Reemplaza la vista anterior para mostrar MRR en CLP
DROP VIEW IF EXISTS public.admin_platform_kpis;
CREATE OR REPLACE VIEW public.admin_platform_kpis AS
SELECT
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'profe')                          AS total_profes,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'alumno')                         AS total_alumnos,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '30 days') AS nuevos_30d,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_id = 'starter')                AS orgs_starter,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_id = 'pro')                    AS orgs_pro,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_id = 'elite')                  AS orgs_elite,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'trialing' AND trial_activated_at IS NOT NULL) AS orgs_trial,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'trialing' AND trial_activated_at IS NULL)     AS orgs_pending,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'active')             AS orgs_activas,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'canceled')           AS orgs_canceladas,
  (SELECT COUNT(*) FROM public.sesiones WHERE created_at > NOW() - INTERVAL '30 days') AS sesiones_30d,
  (SELECT COUNT(*) FROM public.sesiones WHERE completada = true AND created_at > NOW() - INTERVAL '30 days') AS sesiones_comp_30d,
  -- MRR en CLP
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'active' AND plan_id = 'starter') * 18000 +
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'active' AND plan_id = 'pro')     * 37000 +
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'active' AND plan_id = 'elite')   * 65000 AS mrr_plataforma_clp;

-- ================================================================
-- ✅ LISTO
-- ================================================================
