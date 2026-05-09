-- ================================================================
-- CALFIT PRO — Schema Administrativo
-- Agregar al schema existente en Supabase SQL Editor
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- SERVICIOS / PLANES DEL PROFE (lo que cobra a sus alumnos)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.servicios (
  id            BIGSERIAL PRIMARY KEY,
  org_id        BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nombre        TEXT   NOT NULL,                      -- "Plan mensual", "Pack 10 sesiones"
  descripcion   TEXT,
  precio        DECIMAL(10,2) NOT NULL,
  moneda        TEXT DEFAULT 'ARS',                   -- 'ARS' | 'USD'
  tipo          TEXT DEFAULT 'mensual'
                  CHECK (tipo IN ('mensual','trimestral','anual','pack','unico')),
  sesiones_incl INT,                                  -- NULL = ilimitadas
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- CONTRATOS (alumno ↔ servicio)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.contratos (
  id              BIGSERIAL PRIMARY KEY,
  org_id          BIGINT NOT NULL REFERENCES public.organizations(id),
  alumno_id       UUID   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  servicio_id     BIGINT NOT NULL REFERENCES public.servicios(id),
  fecha_inicio    DATE   NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin       DATE,
  precio_acordado DECIMAL(10,2) NOT NULL,             -- puede diferir del servicio (descuento)
  descuento_pct   INT DEFAULT 0,
  estado          TEXT DEFAULT 'activo'
                    CHECK (estado IN ('activo','pausado','cancelado','finalizado')),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- CUOTAS (generadas automáticamente por contrato)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.cuotas (
  id                 BIGSERIAL PRIMARY KEY,
  org_id             BIGINT NOT NULL REFERENCES public.organizations(id),
  contrato_id        BIGINT NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  alumno_id          UUID   NOT NULL REFERENCES public.profiles(id),
  concepto           TEXT   NOT NULL,                 -- "Cuota Junio 2025"
  monto              DECIMAL(10,2) NOT NULL,
  moneda             TEXT DEFAULT 'ARS',
  fecha_vencimiento  DATE   NOT NULL,
  fecha_pago         DATE,
  estado             TEXT DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente','pagado','vencido','cancelado')),
  metodo_pago        TEXT
                       CHECK (metodo_pago IN ('mercadopago','stripe','transferencia','efectivo','otro')),
  mp_preference_id   TEXT,                            -- Mercado Pago preference ID
  mp_payment_id      TEXT,                            -- MP payment ID (webhook)
  stripe_payment_id  TEXT,
  comprobante_url    TEXT,
  notas              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- PAGOS MANUALES (transferencias, efectivo)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.pagos_manuales (
  id            BIGSERIAL PRIMARY KEY,
  org_id        BIGINT NOT NULL REFERENCES public.organizations(id),
  cuota_id      BIGINT REFERENCES public.cuotas(id),
  alumno_id     UUID   NOT NULL REFERENCES public.profiles(id),
  monto         DECIMAL(10,2) NOT NULL,
  metodo        TEXT NOT NULL,
  descripcion   TEXT,
  fecha         DATE DEFAULT CURRENT_DATE,
  registrado_por UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- AGENDA DE TURNOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.turnos (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES public.organizations(id),
  alumno_id   UUID   NOT NULL REFERENCES public.profiles(id),
  profe_id    UUID   NOT NULL REFERENCES public.profiles(id),
  fecha       DATE   NOT NULL,
  hora_inicio TIME   NOT NULL,
  hora_fin    TIME   NOT NULL,
  tipo        TEXT DEFAULT 'individual' CHECK (tipo IN ('individual','grupal','online')),
  estado      TEXT DEFAULT 'confirmado'
                CHECK (estado IN ('confirmado','cancelado','completado','ausente')),
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.servicios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_manuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos         ENABLE ROW LEVEL SECURITY;

-- Servicios
CREATE POLICY "Coach gestiona servicios"
  ON public.servicios FOR ALL USING (public.is_coach_in_org(org_id));
CREATE POLICY "Alumno ve servicios de su org"
  ON public.servicios FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND org_id = servicios.org_id AND status = 'active')
  );

-- Contratos
CREATE POLICY "Coach gestiona contratos"
  ON public.contratos FOR ALL USING (public.is_coach_in_org(org_id));
CREATE POLICY "Alumno ve sus contratos"
  ON public.contratos FOR SELECT USING (alumno_id = auth.uid());

-- Cuotas
CREATE POLICY "Coach gestiona cuotas"
  ON public.cuotas FOR ALL USING (public.is_coach_in_org(org_id));
CREATE POLICY "Alumno ve sus cuotas"
  ON public.cuotas FOR SELECT USING (alumno_id = auth.uid());

-- Pagos manuales
CREATE POLICY "Coach gestiona pagos manuales"
  ON public.pagos_manuales FOR ALL USING (public.is_coach_in_org(org_id));

-- Turnos
CREATE POLICY "Coach gestiona turnos"
  ON public.turnos FOR ALL USING (public.is_coach_in_org(org_id));
CREATE POLICY "Alumno ve sus turnos"
  ON public.turnos FOR SELECT USING (alumno_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- FUNCIÓN: marcar cuotas vencidas automáticamente
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.marcar_cuotas_vencidas()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.cuotas
  SET estado = 'vencido'
  WHERE estado = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;
END;
$$;

-- Llamar manualmente o desde un cron job diario en Supabase

-- ────────────────────────────────────────────────────────────────
-- VISTAS ÚTILES
-- ────────────────────────────────────────────────────────────────

-- Dashboard financiero del profe
CREATE OR REPLACE VIEW public.resumen_financiero AS
SELECT
  c.org_id,
  DATE_TRUNC('month', c.fecha_vencimiento) AS mes,
  COUNT(*) FILTER (WHERE c.estado = 'pagado')    AS cuotas_cobradas,
  COUNT(*) FILTER (WHERE c.estado = 'pendiente') AS cuotas_pendientes,
  COUNT(*) FILTER (WHERE c.estado = 'vencido')   AS cuotas_vencidas,
  SUM(c.monto) FILTER (WHERE c.estado = 'pagado')    AS total_cobrado,
  SUM(c.monto) FILTER (WHERE c.estado IN ('pendiente','vencido')) AS total_por_cobrar
FROM public.cuotas c
GROUP BY c.org_id, DATE_TRUNC('month', c.fecha_vencimiento);

-- Lista de deudores
CREATE OR REPLACE VIEW public.deudores AS
SELECT
  p.id AS alumno_id,
  p.full_name,
  p.email,
  cu.org_id,
  COUNT(cu.id) AS cuotas_adeudadas,
  SUM(cu.monto) AS deuda_total,
  MIN(cu.fecha_vencimiento) AS vencimiento_mas_antiguo
FROM public.profiles p
JOIN public.cuotas cu ON cu.alumno_id = p.id
WHERE cu.estado IN ('vencido','pendiente')
  AND cu.fecha_vencimiento < CURRENT_DATE
GROUP BY p.id, p.full_name, p.email, cu.org_id
ORDER BY deuda_total DESC;
