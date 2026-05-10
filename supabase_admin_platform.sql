-- ================================================================
-- CALFIT PRO — Schema Superadmin
-- Agregar al schema existente en Supabase SQL Editor
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- VISTA: resumen de cada organización (profe)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.admin_orgs_overview AS
SELECT
  o.id                            AS org_id,
  o.name                          AS org_name,
  o.slug,
  o.plan_id,
  o.plan_status,
  o.trial_ends_at,
  o.created_at,
  p.full_name                     AS owner_name,
  p.email                         AS owner_email,
  -- alumnos
  COUNT(DISTINCT m.user_id) FILTER (WHERE m.role = 'alumno' AND m.status = 'active') AS total_alumnos,
  -- sesiones últimos 30 días
  COUNT(DISTINCT s.id) FILTER (WHERE s.created_at > NOW() - INTERVAL '30 days')      AS sesiones_30d,
  -- última actividad
  MAX(s.created_at)               AS ultima_sesion,
  -- cuotas cobradas este mes
  COALESCE(SUM(c.monto) FILTER (
    WHERE c.estado = 'pagado'
      AND DATE_TRUNC('month', c.fecha_pago::DATE) = DATE_TRUNC('month', CURRENT_DATE)
  ), 0)                           AS mrr_cobrado
FROM public.organizations o
JOIN public.profiles p ON p.id = o.owner_id
LEFT JOIN public.memberships m ON m.org_id = o.id
LEFT JOIN public.sesiones s ON s.org_id = o.id
LEFT JOIN public.cuotas c ON c.org_id = o.id
GROUP BY o.id, o.name, o.slug, o.plan_id, o.plan_status, o.trial_ends_at, o.created_at, p.full_name, p.email;

-- ────────────────────────────────────────────────────────────────
-- VISTA: métricas globales de la plataforma
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.admin_platform_kpis AS
SELECT
  -- usuarios
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'profe')                          AS total_profes,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'alumno')                         AS total_alumnos,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '30 days') AS nuevos_30d,
  -- organizaciones por plan
  (SELECT COUNT(*) FROM public.organizations WHERE plan_id = 'starter')                AS orgs_starter,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_id = 'pro')                    AS orgs_pro,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_id = 'elite')                  AS orgs_elite,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'trialing')           AS orgs_trial,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'active')             AS orgs_activas,
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'canceled')           AS orgs_canceladas,
  -- actividad
  (SELECT COUNT(*) FROM public.sesiones WHERE created_at > NOW() - INTERVAL '30 days') AS sesiones_30d,
  (SELECT COUNT(*) FROM public.sesiones WHERE completada = true AND created_at > NOW() - INTERVAL '30 days') AS sesiones_comp_30d,
  -- ingresos de CALFIT (suscripciones de profes — aproximado)
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'active' AND plan_id = 'starter') * 19 +
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'active' AND plan_id = 'pro')     * 39 +
  (SELECT COUNT(*) FROM public.organizations WHERE plan_status = 'active' AND plan_id = 'elite')   * 69 AS mrr_plataforma_usd;

-- ────────────────────────────────────────────────────────────────
-- VISTA: crecimiento mensual (nuevos profes por mes)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.admin_growth AS
SELECT
  DATE_TRUNC('month', o.created_at) AS mes,
  COUNT(*)                           AS nuevas_orgs,
  COUNT(*) FILTER (WHERE o.plan_status IN ('active','trialing')) AS orgs_activas
FROM public.organizations o
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY mes DESC
LIMIT 12;

-- ────────────────────────────────────────────────────────────────
-- RLS — solo admins pueden ver estas vistas
-- ────────────────────────────────────────────────────────────────
-- Las vistas heredan permisos de las tablas base.
-- Para seguridad total, crear una función que valide el rol admin:

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Política extra en organizations para que admin vea todo
CREATE POLICY "Admin ve todas las orgs"
  ON public.organizations FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Admin ve todos los perfiles"
  ON public.profiles FOR SELECT
  USING (public.is_platform_admin());

-- ────────────────────────────────────────────────────────────────
-- CREAR TU USUARIO ADMIN
-- Ejecutar esto DESPUÉS de registrarte con el email de admin:
-- ────────────────────────────────────────────────────────────────
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'tu-email@dominio.com';
