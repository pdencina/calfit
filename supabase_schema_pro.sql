-- ================================================================
-- CALFIT PRO — Migración desde v1 a v2
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ================================================================
-- IMPORTANTE: Esto borra las tablas anteriores y las recrea.
-- Si tenés datos que querés conservar, hacé un backup primero
-- (Table Editor > cada tabla > Export CSV)
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. LIMPIAR TODO LO ANTERIOR (orden inverso de dependencias)
-- ────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.sesion_ejercicios  CASCADE;
DROP TABLE IF EXISTS public.sesion_sets        CASCADE;
DROP TABLE IF EXISTS public.sesiones           CASCADE;
DROP TABLE IF EXISTS public.ejercicios         CASCADE;
DROP TABLE IF EXISTS public.rutinas            CASCADE;
DROP TABLE IF EXISTS public.messages           CASCADE;
DROP TABLE IF EXISTS public.conversations      CASCADE;
DROP TABLE IF EXISTS public.notifications      CASCADE;
DROP TABLE IF EXISTS public.planes_nutricion   CASCADE;
DROP TABLE IF EXISTS public.goals              CASCADE;
DROP TABLE IF EXISTS public.alumno_metrics     CASCADE;
DROP TABLE IF EXISTS public.memberships        CASCADE;
DROP TABLE IF EXISTS public.organizations      CASCADE;
DROP TABLE IF EXISTS public.profiles           CASCADE;
DROP TABLE IF EXISTS public.plans              CASCADE;

-- Limpiar vistas y funciones anteriores
DROP VIEW  IF EXISTS public.alumno_stats           CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()   CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()    CASCADE;
DROP FUNCTION IF EXISTS public.get_user_org_id()   CASCADE;
DROP FUNCTION IF EXISTS public.is_coach_in_org(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_timestamp() CASCADE;

-- Limpiar triggers en auth.users (si existían)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ────────────────────────────────────────────────────────────────
-- 2. PLANES DE SUSCRIPCIÓN
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  price_monthly INT  NOT NULL,
  price_yearly  INT  NOT NULL,
  max_alumnos   INT  NOT NULL,
  features      JSONB DEFAULT '[]',
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.plans VALUES
  ('starter','Starter',1900,15000,10,
   '["Hasta 10 alumnos","Rutinas ilimitadas","Mensajería","Dashboard básico"]',true,NOW()),
  ('pro','Pro',3900,32000,50,
   '["Hasta 50 alumnos","Todo Starter","Métricas avanzadas","Videos","Nutrición","Soporte prioritario"]',true,NOW()),
  ('elite','Elite',6900,56000,999,
   '["Alumnos ilimitados","Todo Pro","White label","API access","Manager de equipo"]',true,NOW());

-- ────────────────────────────────────────────────────────────────
-- 3. PERFILES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('profe','alumno','admin')),
  avatar_url  TEXT,
  phone       TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 4. ORGANIZACIONES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.organizations (
  id                     BIGSERIAL PRIMARY KEY,
  owner_id               UUID NOT NULL REFERENCES public.profiles(id),
  name                   TEXT NOT NULL,
  slug                   TEXT UNIQUE NOT NULL,
  logo_url               TEXT,
  primary_color          TEXT DEFAULT '#c8f542',
  plan_id                TEXT NOT NULL REFERENCES public.plans(id) DEFAULT 'starter',
  plan_status            TEXT DEFAULT 'trialing'
                           CHECK (plan_status IN ('trialing','active','past_due','canceled')),
  trial_ends_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 5. MEMBRESÍAS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.memberships (
  id         BIGSERIAL PRIMARY KEY,
  org_id     BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    UUID   NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  role       TEXT   NOT NULL CHECK (role IN ('owner','coach','alumno')),
  status     TEXT   DEFAULT 'active' CHECK (status IN ('active','inactive','invited')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- ────────────────────────────────────────────────────────────────
-- 6. MÉTRICAS CORPORALES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.alumno_metrics (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  org_id      BIGINT  NOT NULL REFERENCES public.organizations(id),
  fecha       DATE    NOT NULL DEFAULT CURRENT_DATE,
  peso_kg     DECIMAL(5,2),
  grasa_pct   DECIMAL(4,1),
  musculo_pct DECIMAL(4,1),
  imc         DECIMAL(4,2),
  pecho_cm    DECIMAL(5,1),
  cintura_cm  DECIMAL(5,1),
  cadera_cm   DECIMAL(5,1),
  brazo_cm    DECIMAL(5,1),
  muslo_cm    DECIMAL(5,1),
  foto_url    TEXT,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fecha)
);

-- ────────────────────────────────────────────────────────────────
-- 7. RUTINAS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.rutinas (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES public.organizations(id)  ON DELETE CASCADE,
  alumno_id   UUID   NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  profe_id    UUID   NOT NULL REFERENCES public.profiles(id),
  nombre      TEXT   NOT NULL,
  descripcion TEXT,
  categoria   TEXT DEFAULT 'general'
                CHECK (categoria IN ('traccion','empuje','piernas','core','full_body','cardio','general')),
  activa      BOOLEAN DEFAULT TRUE,
  semana      INT     DEFAULT 1,
  orden       INT     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 8. EJERCICIOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.ejercicios (
  id          BIGSERIAL PRIMARY KEY,
  rutina_id   BIGINT NOT NULL REFERENCES public.rutinas(id) ON DELETE CASCADE,
  nombre      TEXT   NOT NULL,
  tipo        TEXT   NOT NULL CHECK (tipo IN ('al_fallo','series','tiempo','circuito')),
  series      INT    DEFAULT 4,
  reps        TEXT,
  duracion_s  INT,
  descanso_s  INT    DEFAULT 90,
  rir         INT,
  rpe         INT,
  video_url   TEXT,
  imagen_url  TEXT,
  notas       TEXT,
  orden       INT    DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 9. SESIONES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.sesiones (
  id                   BIGSERIAL PRIMARY KEY,
  org_id               BIGINT NOT NULL REFERENCES public.organizations(id),
  alumno_id            UUID   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rutina_id            BIGINT NOT NULL REFERENCES public.rutinas(id),
  fecha                DATE   DEFAULT CURRENT_DATE,
  completada           BOOLEAN DEFAULT FALSE,
  duracion_min         INT,
  calorias             INT,
  percepcion_esfuerzo  INT CHECK (percepcion_esfuerzo BETWEEN 1 AND 10),
  notas                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 10. SETS POR SESIÓN
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.sesion_sets (
  id           BIGSERIAL PRIMARY KEY,
  sesion_id    BIGINT NOT NULL REFERENCES public.sesiones(id)   ON DELETE CASCADE,
  ejercicio_id BIGINT NOT NULL REFERENCES public.ejercicios(id) ON DELETE CASCADE,
  set_num      INT    NOT NULL,
  reps_logradas INT,
  peso_kg      DECIMAL(5,2),
  duracion_s   INT,
  completado   BOOLEAN DEFAULT FALSE,
  notas        TEXT
);

-- ────────────────────────────────────────────────────────────────
-- 11. MENSAJERÍA
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id              BIGSERIAL PRIMARY KEY,
  org_id          BIGINT NOT NULL REFERENCES public.organizations(id),
  profe_id        UUID   NOT NULL REFERENCES public.profiles(id),
  alumno_id       UUID   NOT NULL REFERENCES public.profiles(id),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, profe_id, alumno_id)
);

CREATE TABLE public.messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID   NOT NULL REFERENCES public.profiles(id),
  content         TEXT   NOT NULL,
  tipo            TEXT   DEFAULT 'text' CHECK (tipo IN ('text','image','file','rutina_share')),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 12. NOTIFICACIONES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID  NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo       TEXT  NOT NULL,
  titulo     TEXT  NOT NULL,
  cuerpo     TEXT,
  leida      BOOLEAN DEFAULT FALSE,
  data       JSONB   DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 13. PLANES NUTRICIÓN
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.planes_nutricion (
  id              BIGSERIAL PRIMARY KEY,
  org_id          BIGINT NOT NULL REFERENCES public.organizations(id),
  alumno_id       UUID   NOT NULL REFERENCES public.profiles(id),
  profe_id        UUID   NOT NULL REFERENCES public.profiles(id),
  nombre          TEXT   NOT NULL,
  calorias_obj    INT,
  proteinas_g     INT,
  carbohidratos_g INT,
  grasas_g        INT,
  contenido       JSONB  DEFAULT '{}',
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 14. OBJETIVOS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE public.goals (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID   NOT NULL REFERENCES public.profiles(id),
  org_id         BIGINT NOT NULL REFERENCES public.organizations(id),
  tipo           TEXT   NOT NULL,
  descripcion    TEXT   NOT NULL,
  valor_objetivo DECIMAL(8,2),
  valor_actual   DECIMAL(8,2),
  fecha_limite   DATE,
  completado     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumno_metrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutinas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ejercicios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesion_sets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_nutricion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals             ENABLE ROW LEVEL SECURITY;

-- Helper: org del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM public.memberships
  WHERE user_id = auth.uid() AND status = 'active' LIMIT 1;
$$;

-- Helper: es coach en una org?
CREATE OR REPLACE FUNCTION public.is_coach_in_org(o_id BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = o_id
      AND role IN ('owner','coach') AND status = 'active'
  );
$$;

-- PROFILES
CREATE POLICY "Ver perfil propio"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Ver perfiles de mi org"
  ON public.profiles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m1
      JOIN public.memberships m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
        AND m1.status = 'active'
    )
  );
CREATE POLICY "Actualizar perfil propio"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ORGANIZATIONS
CREATE POLICY "Ver mi org"
  ON public.organizations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND org_id = organizations.id AND status = 'active')
  );
CREATE POLICY "Dueño edita org"
  ON public.organizations FOR UPDATE USING (owner_id = auth.uid());

-- MEMBERSHIPS
CREATE POLICY "Ver membresías de mi org"
  ON public.memberships FOR SELECT USING (org_id = public.get_user_org_id());
CREATE POLICY "Coach gestiona membresías"
  ON public.memberships FOR ALL USING (public.is_coach_in_org(org_id));

-- MÉTRICAS
CREATE POLICY "Alumno gestiona sus métricas"
  ON public.alumno_metrics FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Coach ve métricas de su org"
  ON public.alumno_metrics FOR SELECT USING (public.is_coach_in_org(org_id));
CREATE POLICY "Coach inserta métricas"
  ON public.alumno_metrics FOR INSERT WITH CHECK (public.is_coach_in_org(org_id));
CREATE POLICY "Coach actualiza métricas"
  ON public.alumno_metrics FOR UPDATE USING (public.is_coach_in_org(org_id));

-- RUTINAS
CREATE POLICY "Alumno ve sus rutinas"
  ON public.rutinas FOR SELECT USING (alumno_id = auth.uid());
CREATE POLICY "Coach gestiona rutinas"
  ON public.rutinas FOR ALL USING (public.is_coach_in_org(org_id));

-- EJERCICIOS
CREATE POLICY "Ver ejercicios accesibles"
  ON public.ejercicios FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rutinas r WHERE r.id = rutina_id
        AND (r.alumno_id = auth.uid() OR public.is_coach_in_org(r.org_id))
    )
  );
CREATE POLICY "Coach gestiona ejercicios"
  ON public.ejercicios FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rutinas r WHERE r.id = rutina_id AND public.is_coach_in_org(r.org_id))
  );

-- SESIONES
CREATE POLICY "Alumno gestiona sus sesiones"
  ON public.sesiones FOR ALL USING (alumno_id = auth.uid());
CREATE POLICY "Coach ve sesiones de su org"
  ON public.sesiones FOR SELECT USING (public.is_coach_in_org(org_id));

-- SESION_SETS
CREATE POLICY "Acceso a sets propios"
  ON public.sesion_sets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sesiones s WHERE s.id = sesion_id AND s.alumno_id = auth.uid())
  );

-- CONVERSACIONES
CREATE POLICY "Ver mis conversaciones"
  ON public.conversations FOR SELECT USING (profe_id = auth.uid() OR alumno_id = auth.uid());
CREATE POLICY "Coach crea conversaciones"
  ON public.conversations FOR INSERT WITH CHECK (public.is_coach_in_org(org_id));

-- MENSAJES
CREATE POLICY "Ver mensajes de mis conversaciones"
  ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.profe_id = auth.uid() OR c.alumno_id = auth.uid()))
  );
CREATE POLICY "Enviar mensajes"
  ON public.messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.profe_id = auth.uid() OR c.alumno_id = auth.uid()))
  );

-- NOTIFICACIONES
CREATE POLICY "Ver mis notificaciones"
  ON public.notifications FOR ALL USING (user_id = auth.uid());

-- NUTRICIÓN
CREATE POLICY "Alumno ve su nutrición"
  ON public.planes_nutricion FOR SELECT USING (alumno_id = auth.uid());
CREATE POLICY "Coach gestiona nutrición"
  ON public.planes_nutricion FOR ALL USING (public.is_coach_in_org(org_id));

-- GOALS
CREATE POLICY "Ver y gestionar mis goals"
  ON public.goals FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Coach ve goals de su org"
  ON public.goals FOR SELECT USING (public.is_coach_in_org(org_id));

-- ────────────────────────────────────────────────────────────────
-- FUNCIONES Y TRIGGERS
-- ────────────────────────────────────────────────────────────────

-- Auto-crear perfil + org al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_org_id BIGINT;
  user_role  TEXT;
  user_name  TEXT;
  org_slug   TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'alumno');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, user_name, user_role);

  IF user_role = 'profe' THEN
    org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g'))
                || '-' || substring(NEW.id::TEXT, 1, 6);

    INSERT INTO public.organizations (owner_id, name, slug)
    VALUES (NEW.id, user_name || '''s Gym', org_slug)
    RETURNING id INTO new_org_id;

    INSERT INTO public.memberships (org_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at genérico
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER orgs_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER rutinas_updated_at
  BEFORE UPDATE ON public.rutinas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Actualizar last_message_at en conversación
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_update_convo
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- ────────────────────────────────────────────────────────────────
-- REALTIME
-- ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sesiones;

-- ────────────────────────────────────────────────────────────────
-- VIEW: estadísticas por alumno
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.alumno_stats AS
SELECT
  p.id,
  p.full_name,
  p.email,
  m.org_id,
  COUNT(s.id) FILTER (WHERE s.completada = true)  AS sesiones_completadas,
  COUNT(s.id)                                      AS sesiones_totales,
  ROUND(AVG(s.percepcion_esfuerzo)::NUMERIC, 1)   AS esfuerzo_promedio,
  COALESCE(SUM(s.duracion_min), 0)                 AS minutos_totales,
  MAX(s.fecha)                                     AS ultima_sesion,
  (SELECT am.peso_kg    FROM public.alumno_metrics am WHERE am.user_id = p.id ORDER BY am.fecha DESC LIMIT 1) AS peso_actual,
  (SELECT am.grasa_pct  FROM public.alumno_metrics am WHERE am.user_id = p.id ORDER BY am.fecha DESC LIMIT 1) AS grasa_actual
FROM public.profiles p
JOIN public.memberships m ON m.user_id = p.id AND m.role = 'alumno' AND m.status = 'active'
LEFT JOIN public.sesiones s ON s.alumno_id = p.id
GROUP BY p.id, p.full_name, p.email, m.org_id;

-- ════════════════════════════════════════════════════════════════
-- ✅ LISTO — Schema PRO instalado correctamente
-- ════════════════════════════════════════════════════════════════