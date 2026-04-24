# CALFIT — Guía de Despliegue Completa

## ¿Qué vas a tener al final?
- Una **web app** en una URL pública (gratis) tipo `calfit.vercel.app`
- **Login real** con email y contraseña para cada alumno
- El **profe** puede cargar rutinas personalizadas desde su panel
- Cada **alumno** ve solo sus rutinas y puede registrar sus sesiones
- **Base de datos** en la nube, segura y con backups automáticos

---

## PASO 1 — Crear cuenta en Supabase (base de datos gratis)

1. Ir a **https://supabase.com** → "Start for free"
2. Registrarse con GitHub o Google
3. Clic en **"New project"**
   - Organization: la que te crea por defecto
   - Name: `calfit`
   - Database Password: elegí una contraseña fuerte (guardala)
   - Region: `South America (São Paulo)` — para menor latencia desde Argentina
4. Esperar ~2 minutos a que el proyecto se cree

---

## PASO 2 — Crear las tablas en Supabase

1. En el dashboard de tu proyecto → **"SQL Editor"** (menú izquierdo)
2. Clic en **"New query"**
3. Copiar y pegar todo el contenido del archivo `supabase_schema.sql`
4. Clic en **"Run"** (o F5)
5. Debería aparecer "Success" en verde

### Verificar que funcionó:
- Ir a **"Table Editor"** → deberías ver las tablas:
  - `profiles`
  - `rutinas`
  - `ejercicios`
  - `sesiones`
  - `sesion_ejercicios`

---

## PASO 3 — Obtener las claves de API de Supabase

1. En el dashboard → **"Settings"** → **"API"**
2. Copiar dos valores:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon public** key → una clave larga que empieza con `eyJ...`

---

## PASO 4 — Subir el código a GitHub

1. Crear cuenta en **https://github.com** (si no tenés)
2. Clic en **"New repository"**
   - Name: `calfit`
   - Visibility: Private
   - Clic en "Create repository"
3. En tu computadora, abrir una terminal en la carpeta `calfit/`
4. Ejecutar:
```bash
git init
git add .
git commit -m "primer commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/calfit.git
git push -u origin main
```

---

## PASO 5 — Desplegar en Vercel (hosting gratis)

1. Ir a **https://vercel.com** → "Sign up" (usar tu cuenta de GitHub)
2. Clic en **"Add New Project"**
3. Seleccionar el repositorio `calfit`
4. En **"Environment Variables"** agregar:
   - `REACT_APP_SUPABASE_URL` → pegar la Project URL del paso 3
   - `REACT_APP_SUPABASE_ANON_KEY` → pegar la anon key del paso 3
5. Clic en **"Deploy"**
6. En ~2 minutos tenés tu app en vivo con una URL pública

---

## PASO 6 — Configurar email de confirmación (opcional pero recomendado)

Por defecto Supabase requiere confirmar el email al registrarse.
Para **desactivarlo** durante las pruebas:
1. Supabase → **Authentication** → **Settings**
2. Desactivar "Enable email confirmations"

---

## PASO 7 — Crear las cuentas

### Crear cuenta del profesor:
1. Ir a tu app (la URL de Vercel)
2. Clic en "Registrarse"
3. Elegir **"Profesor"**
4. Completar nombre, email y contraseña
5. ¡Listo! Ya podés entrar como profe

### Crear cuentas de alumnos:
**Opción A** — El alumno se registra solo:
- Van a la web, "Registrarse" → eligen "Alumno"

**Opción B** — El profe los registra desde Supabase:
- Supabase → **Authentication** → **Users** → **"Invite user"**

---

## Estructura del proyecto

```
calfit/
├── src/
│   ├── lib/
│   │   └── supabase.js          ← Todas las llamadas a la DB
│   ├── hooks/
│   │   └── useAuth.js           ← Contexto de autenticación
│   ├── pages/
│   │   ├── LoginPage.jsx        ← Pantalla de login/registro
│   │   ├── ProfesorDashboard.jsx ← Panel del profesor
│   │   └── AlumnoDashboard.jsx  ← Panel del alumno
│   ├── components/
│   │   └── Topbar.jsx           ← Barra superior
│   ├── App.js                   ← Router principal
│   └── index.css                ← Estilos globales
├── public/
│   └── index.html
├── supabase_schema.sql          ← Schema de la base de datos
├── vercel.json                  ← Configuración de Vercel
├── .env.example                 ← Plantilla de variables de entorno
└── package.json
```

---

## Funcionalidades incluidas

### Panel del Profesor
- ✅ Ver todos los alumnos registrados con estadísticas
- ✅ Crear rutinas personalizadas por alumno
- ✅ Agregar ejercicios con: nombre, tipo, series, reps, descanso, notas
- ✅ Eliminar ejercicios y rutinas
- ✅ Ver progreso general de cada alumno

### Panel del Alumno
- ✅ Ver sus rutinas asignadas por el profe
- ✅ Iniciar una sesión de entrenamiento
- ✅ Timer automático de la sesión
- ✅ Marcar ejercicios como completados (barra de progreso)
- ✅ Historial de sesiones anteriores
- ✅ Panel de estadísticas personales

---

## Costos

| Servicio | Plan gratuito incluye |
|----------|----------------------|
| Supabase | 500 MB DB, 50.000 auth users, 2GB storage |
| Vercel   | Hosting ilimitado, SSL, dominio gratis |
| Total    | **$0/mes** para empezar |

Cuando el proyecto crezca y necesites más capacidad,
Supabase Pro cuesta ~$25/mes y Vercel Pro ~$20/mes.

---

## Próximos pasos opcionales

- 📱 **PWA** — agregar `manifest.json` para que se instale como app en el celular
- 🎥 **Videos** — el campo `video_url` en ejercicios ya está listo para links de YouTube
- 📊 **Gráficos** — agregar charts de progreso con Recharts
- 💬 **Notificaciones** — recordatorios de entrenamiento por email
- 🏆 **Logros** — sistema de badges por metas alcanzadas

---

¿Necesitás ayuda con algún paso? ¡Preguntale a tu asistente de IA!
