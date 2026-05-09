# CALFIT Comercial — guía rápida

## 1. Ejecutar SQL
En Supabase entra a:

`SQL Editor > New query`

Copia y ejecuta completo:

`supabase_schema_comercial.sql`

Esto activa:

- academias / comunidades
- profesores
- alumnos por código de academia
- rutinas
- ejercicios
- sesiones
- progreso
- seguridad RLS por academia

## 2. Variables en Vercel
En Vercel configura:

```env
REACT_APP_SUPABASE_URL=tu_url
REACT_APP_SUPABASE_ANON_KEY=tu_anon_key
```

Luego haz redeploy sin cache.

## 3. Flujo de prueba

### Crear profesor
1. Registrarse como `Profesor`.
2. Escribir nombre de academia.
3. Confirmar correo.
4. Ingresar.

Supabase creará automáticamente una academia con código.

### Ver código de academia
En Supabase:

`Table Editor > academias > academy_code`

Ese código se entrega a los alumnos.

### Crear alumno
1. Registrarse como `Alumno`.
2. Ingresar el código de academia.
3. Confirmar correo.
4. Entrar.

El alumno quedará asociado a la academia del profesor.

## 4. Qué archivos se modificaron

- `supabase_schema_comercial.sql`
- `src/lib/supabase.js`
- `src/pages/LoginPage.jsx`

## 5. Nota
Mantengo compatibilidad con tu dashboard actual, pero ahora queda listo para venderlo como SaaS multi-academia.
