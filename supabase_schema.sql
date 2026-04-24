-- ============================================================
-- CALFIT — Schema completo para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. PERFILES (extiende auth.users)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('profe', 'alumno')),
  level       TEXT DEFAULT 'Iniciante',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RUTINAS
CREATE TABLE public.rutinas (
  id          BIGSERIAL PRIMARY KEY,
  alumno_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profe_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  activa      BOOLEAN DEFAULT TRUE,
  orden       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EJERCICIOS
CREATE TABLE public.ejercicios (
  id          BIGSERIAL PRIMARY KEY,
  rutina_id   BIGINT NOT NULL REFERENCES public.rutinas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('al_fallo', 'series', 'tiempo')),
  series      INT DEFAULT 4,
  reps        TEXT,
  descanso_s  INT DEFAULT 90,
  notas       TEXT,
  video_url   TEXT,
  orden       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SESIONES DE ENTRENAMIENTO
CREATE TABLE public.sesiones (
  id          BIGSERIAL PRIMARY KEY,
  alumno_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rutina_id   BIGINT NOT NULL REFERENCES public.rutinas(id) ON DELETE CASCADE,
  fecha       DATE DEFAULT CURRENT_DATE,
  completada  BOOLEAN DEFAULT FALSE,
  duracion_min INT,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EJERCICIOS COMPLETADOS POR SESIÓN
CREATE TABLE public.sesion_ejercicios (
  id            BIGSERIAL PRIMARY KEY,
  sesion_id     BIGINT NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  ejercicio_id  BIGINT NOT NULL REFERENCES public.ejercicios(id) ON DELETE CASCADE,
  completado    BOOLEAN DEFAULT FALSE,
  reps_logradas TEXT,
  notas         TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutinas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ejercicios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesion_ejercicios ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Usuarios ven su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Profes ven todos los alumnos"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'profe'
    )
  );

CREATE POLICY "Usuarios actualizan su perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RUTINAS
CREATE POLICY "Alumno ve sus rutinas"
  ON public.rutinas FOR SELECT
  USING (alumno_id = auth.uid());

CREATE POLICY "Profe ve todas las rutinas"
  ON public.rutinas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'profe'
    )
  );

CREATE POLICY "Profe crea rutinas"
  ON public.rutinas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'profe'
    )
  );

CREATE POLICY "Profe edita rutinas"
  ON public.rutinas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'profe'
    )
  );

CREATE POLICY "Profe elimina rutinas"
  ON public.rutinas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'profe'
    )
  );

-- EJERCICIOS (heredan acceso de rutinas)
CREATE POLICY "Ver ejercicios de rutinas propias"
  ON public.ejercicios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rutinas r
      WHERE r.id = rutina_id
        AND (r.alumno_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'profe'
        ))
    )
  );

CREATE POLICY "Profe gestiona ejercicios"
  ON public.ejercicios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'profe'
    )
  );

-- SESIONES
CREATE POLICY "Alumno gestiona sus sesiones"
  ON public.sesiones FOR ALL
  USING (alumno_id = auth.uid());

CREATE POLICY "Profe ve todas las sesiones"
  ON public.sesiones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'profe'
    )
  );

-- SESION_EJERCICIOS
CREATE POLICY "Acceso a ejercicios de sesión propia"
  ON public.sesion_ejercicios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sesiones s
      WHERE s.id = sesion_id AND s.alumno_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'alumno')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCIÓN: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rutinas_updated_at
  BEFORE UPDATE ON public.rutinas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- DATOS DE EJEMPLO (opcional - ejecutar después del schema)
-- ============================================================
-- Nota: primero crear los usuarios desde el panel Auth de Supabase
-- o desde la app, luego ejecutar esto con los UUIDs reales.
-- El trigger handle_new_user() creará los profiles automáticamente.
