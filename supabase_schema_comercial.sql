-- ============================================================
-- CALFIT SaaS Comercial — Supabase SQL
-- Multi academia: coaches/profesores + alumnos + rutinas + sesiones
-- Ejecutar completo en Supabase > SQL Editor
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- ============================================================
-- 1) TABLAS BASE
-- ============================================================

create table if not exists public.academias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  academy_code text unique not null default upper(substr(md5(random()::text), 1, 8)),
  logo_url text,
  primary_color text default '#c8f542',
  plan text not null default 'founder' check (plan in ('free','founder','starter','pro','white_label')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  academia_id uuid references public.academias(id) on delete set null,
  email text not null,
  full_name text not null,
  role text not null default 'alumno' check (role in ('admin','profe','alumno')),
  level text default 'Iniciante',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.rutinas (
  id bigserial primary key,
  academia_id uuid references public.academias(id) on delete cascade,
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  profe_id uuid not null references public.profiles(id) on delete cascade,
  nombre text not null,
  descripcion text,
  activa boolean default true,
  orden int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ejercicios (
  id bigserial primary key,
  rutina_id bigint not null references public.rutinas(id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('al_fallo','series','tiempo')),
  series int default 4,
  reps text,
  descanso_s int default 90,
  notas text,
  video_url text,
  orden int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sesiones (
  id bigserial primary key,
  academia_id uuid references public.academias(id) on delete cascade,
  alumno_id uuid not null references public.profiles(id) on delete cascade,
  rutina_id bigint not null references public.rutinas(id) on delete cascade,
  fecha date default current_date,
  completada boolean default false,
  duracion_min int,
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists public.sesion_ejercicios (
  id bigserial primary key,
  sesion_id bigint not null references public.sesiones(id) on delete cascade,
  ejercicio_id bigint not null references public.ejercicios(id) on delete cascade,
  completado boolean default false,
  reps_logradas text,
  notas text,
  unique (sesion_id, ejercicio_id)
);

-- Si ya tenías tablas antiguas, agrega columnas nuevas sin romper.
alter table public.profiles add column if not exists academia_id uuid references public.academias(id) on delete set null;
alter table public.rutinas add column if not exists academia_id uuid references public.academias(id) on delete cascade;
alter table public.sesiones add column if not exists academia_id uuid references public.academias(id) on delete cascade;

create index if not exists idx_profiles_academia_role on public.profiles(academia_id, role);
create index if not exists idx_rutinas_alumno on public.rutinas(alumno_id);
create index if not exists idx_rutinas_academia on public.rutinas(academia_id);
create index if not exists idx_sesiones_alumno on public.sesiones(alumno_id);

-- ============================================================
-- 2) HELPERS RLS
-- ============================================================

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_academia_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select academia_id from public.profiles where id = auth.uid()
$$;

-- ============================================================
-- 3) ROW LEVEL SECURITY
-- ============================================================

alter table public.academias enable row level security;
alter table public.profiles enable row level security;
alter table public.rutinas enable row level security;
alter table public.ejercicios enable row level security;
alter table public.sesiones enable row level security;
alter table public.sesion_ejercicios enable row level security;

drop policy if exists "academia visible por miembros" on public.academias;
drop policy if exists "usuarios ven perfiles de su academia" on public.profiles;
drop policy if exists "usuarios actualizan su perfil" on public.profiles;
drop policy if exists "rutinas visibles por academia" on public.rutinas;
drop policy if exists "profe crea rutinas en su academia" on public.rutinas;
drop policy if exists "profe edita rutinas de su academia" on public.rutinas;
drop policy if exists "profe elimina rutinas de su academia" on public.rutinas;
drop policy if exists "ejercicios visibles por rutinas accesibles" on public.ejercicios;
drop policy if exists "profe gestiona ejercicios de su academia" on public.ejercicios;
drop policy if exists "sesiones visibles por academia" on public.sesiones;
drop policy if exists "alumno crea sus sesiones" on public.sesiones;
drop policy if exists "alumno actualiza sus sesiones" on public.sesiones;
drop policy if exists "sesion ejercicios visibles" on public.sesion_ejercicios;
drop policy if exists "alumno gestiona ejercicios de su sesion" on public.sesion_ejercicios;

create policy "academia visible por miembros"
on public.academias for select
using (id = public.current_user_academia_id());

create policy "usuarios ven perfiles de su academia"
on public.profiles for select
using (id = auth.uid() or academia_id = public.current_user_academia_id());

create policy "usuarios actualizan su perfil"
on public.profiles for update
using (id = auth.uid());

create policy "rutinas visibles por academia"
on public.rutinas for select
using (
  alumno_id = auth.uid()
  or profe_id = auth.uid()
  or academia_id = public.current_user_academia_id()
);

create policy "profe crea rutinas en su academia"
on public.rutinas for insert
with check (
  public.current_user_role() in ('admin','profe')
  and academia_id = public.current_user_academia_id()
);

create policy "profe edita rutinas de su academia"
on public.rutinas for update
using (
  public.current_user_role() in ('admin','profe')
  and academia_id = public.current_user_academia_id()
);

create policy "profe elimina rutinas de su academia"
on public.rutinas for delete
using (
  public.current_user_role() in ('admin','profe')
  and academia_id = public.current_user_academia_id()
);

create policy "ejercicios visibles por rutinas accesibles"
on public.ejercicios for select
using (
  exists (
    select 1 from public.rutinas r
    where r.id = rutina_id
    and (r.alumno_id = auth.uid() or r.academia_id = public.current_user_academia_id())
  )
);

create policy "profe gestiona ejercicios de su academia"
on public.ejercicios for all
using (
  public.current_user_role() in ('admin','profe')
  and exists (
    select 1 from public.rutinas r
    where r.id = rutina_id
    and r.academia_id = public.current_user_academia_id()
  )
)
with check (
  public.current_user_role() in ('admin','profe')
  and exists (
    select 1 from public.rutinas r
    where r.id = rutina_id
    and r.academia_id = public.current_user_academia_id()
  )
);

create policy "sesiones visibles por academia"
on public.sesiones for select
using (alumno_id = auth.uid() or academia_id = public.current_user_academia_id());

create policy "alumno crea sus sesiones"
on public.sesiones for insert
with check (alumno_id = auth.uid());

create policy "alumno actualiza sus sesiones"
on public.sesiones for update
using (alumno_id = auth.uid());

create policy "sesion ejercicios visibles"
on public.sesion_ejercicios for select
using (
  exists (
    select 1 from public.sesiones s
    where s.id = sesion_id
    and (s.alumno_id = auth.uid() or s.academia_id = public.current_user_academia_id())
  )
);

create policy "alumno gestiona ejercicios de su sesion"
on public.sesion_ejercicios for all
using (
  exists (select 1 from public.sesiones s where s.id = sesion_id and s.alumno_id = auth.uid())
)
with check (
  exists (select 1 from public.sesiones s where s.id = sesion_id and s.alumno_id = auth.uid())
);

-- ============================================================
-- 4) TRIGGERS
-- ============================================================

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(value,''))), '[^a-z0-9]+', '-', 'g'))
$$;


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_full_name text;
  v_academia_id uuid;
  v_academy_name text;
  v_academy_code text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'alumno');
  if v_role not in ('admin','profe','alumno') then
    v_role := 'alumno';
  end if;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_academy_name := nullif(new.raw_user_meta_data->>'academy_name', '');
  v_academy_code := upper(nullif(new.raw_user_meta_data->>'academy_code', ''));

  if v_role in ('admin','profe') then
    insert into public.academias(name, slug)
    values (
      coalesce(v_academy_name, 'Academia de ' || v_full_name),
      lower(substr(md5(new.id::text || now()::text), 1, 10))
    )
    returning id into v_academia_id;
  else
    select id into v_academia_id
    from public.academias
    where academy_code = v_academy_code
    limit 1;
  end if;

  insert into public.profiles(id, academia_id, email, full_name, role)
  values (new.id, v_academia_id, new.email, v_full_name, v_role)
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    academia_id = coalesce(public.profiles.academia_id, excluded.academia_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rutinas_updated_at on public.rutinas;
create trigger rutinas_updated_at
before update on public.rutinas
for each row execute function public.set_updated_at();

-- Completa academia_id automáticamente al crear rutinas/sesiones
create or replace function public.set_academia_from_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.academia_id is null then
    select academia_id into new.academia_id from public.profiles where id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists rutinas_set_academia on public.rutinas;
create trigger rutinas_set_academia
before insert on public.rutinas
for each row execute function public.set_academia_from_user();

drop trigger if exists sesiones_set_academia on public.sesiones;
create trigger sesiones_set_academia
before insert on public.sesiones
for each row execute function public.set_academia_from_user();

-- ============================================================
-- 5) VISTA SIMPLE PARA COACH
-- ============================================================

create or replace view public.v_alumnos_resumen as
select
  p.id,
  p.full_name,
  p.email,
  p.level,
  p.academia_id,
  count(distinct s.id) as total_sesiones,
  count(distinct s.id) filter (where s.completada) as sesiones_completadas,
  coalesce(sum(s.duracion_min), 0) as minutos_entrenados
from public.profiles p
left join public.sesiones s on s.alumno_id = p.id
where p.role = 'alumno'
group by p.id;

-- ============================================================
-- Listo.
-- Al registrar un PROFE se crea una academia y un código.
-- El código está en public.academias.academy_code.
-- Al registrar un ALUMNO, debe ingresar ese código para quedar asociado.
-- ============================================================
