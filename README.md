# 💍 Página de Boda — Plantilla SaaS-Ready

Invitación digital para boda construida con Next.js, Tailwind CSS y Supabase.
Diseñada desde el inicio con arquitectura multitenant para escalar a SaaS.

---

## Estructura del proyecto

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Página principal (invitación)
│   ├── layout.tsx              # Layout raíz
│   ├── public/                 # Páginas públicas de la boda
│   │   ├── layout.tsx          # Layout con nav + footer
│   │   ├── rsvp/               # Confirmación de asistencia
│   │   ├── transporte/         # Selección de transporte
│   │   ├── galeria/            # Galería multimedia
│   │   └── info/               # Información y timing
│   ├── admin/                  # Panel de administración (protegido)
│   │   ├── bodas/              # Gestión de bodas (fase SaaS)
│   │   ├── asistentes/         # Gestión de asistentes
│   │   └── configuracion/      # Config de la boda
│   └── api/                    # API Routes
│       ├── rsvp/               # Guardar RSVP
│       ├── transporte/         # Reservas de transporte
│       ├── galeria/            # Subida a Google Drive
│       └── admin/              # Endpoints del admin
│
├── components/
│   ├── ui/                     # Componentes atómicos reutilizables
│   │   ├── SelloNupcial.tsx    # Sello SVG con iniciales ✦ FIRMA VISUAL
│   │   ├── CuentaAtras.tsx     # Countdown animado
│   │   └── OrnamentoDivisor.tsx # Divisores decorativos
│   ├── wedding/                # Bloques específicos de la web de boda
│   ├── admin/                  # Componentes del panel admin
│   └── layout/                 # Nav, footer, layouts
│       ├── NavegacionPublica.tsx
│       └── PieDePagina.tsx
│
├── config/
│   └── wedding.config.ts       # ⭐ CONFIG CENTRALIZADA — editar aquí
│
├── types/
│   └── database.ts             # Tipos TypeScript del esquema Supabase
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Cliente Supabase (browser)
│   │   └── server.ts           # Cliente Supabase (servidor)
│   └── google-drive/           # Helpers para Google Drive API
│
├── hooks/                      # Custom React hooks
└── styles/
    └── globals.css             # Tokens de diseño + utilidades CSS

supabase/
└── schema.sql                  # Esquema completo de base de datos
```

---

## Principios arquitectónicos

### 1. Configuración centralizada
**Todo** dato de la boda vive en `src/config/wedding.config.ts`.
Los componentes reciben datos como **props**, nunca leen la config directamente.
→ En fase SaaS: sustituir por lectura de Supabase filtrada por `wedding_id`.

### 2. `wedding_id` en todas las tablas
Aunque en fase A solo exista una boda, todas las tablas tienen `wedding_id`.
Escalar a multitenant = añadir filas, no rediseñar el esquema.

### 3. Componentes sin acoplamiento de datos
```tsx
// ✅ Correcto — recibe datos como props
<SelloNupcial inicialNovio="C" inicialNovia="M" />

// ❌ Incorrecto — hardcodeado
<SelloNupcial inicialNovio="C" inicialNovia="M" /> // con C y M quemadas dentro
```

### 4. Rutas preparadas para weddingSlug
Fase A: `/rsvp`, `/galeria`, etc.
Fase B (SaaS): `/[weddingSlug]/rsvp`, `/[weddingSlug]/galeria`
Solo hay que envolver las rutas en un segmento dinámico.

---

## Setup inicial

### 1. Variables de entorno
```bash
cp .env.example .env.local
# Rellenar con tus valores de Supabase y Google Drive
```

### 2. Base de datos Supabase
```bash
# En el SQL Editor de Supabase, ejecutar:
# supabase/schema.sql
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Desarrollo local
```bash
npm run dev
```

### 5. Despliegue en Vercel
- Conectar repositorio GitHub en Vercel
- Añadir variables de entorno en el dashboard de Vercel
- Push a `main` → despliegue automático

---

## Paleta de colores

| Token | Hex | Uso |
|-------|-----|-----|
| `--bronze` | `#8C6A3F` | Acento principal, botones, sello |
| `--bronze-light` | `#C4964A` | Hover, highlights |
| `--bronze-pale` | `#E8D5B7` | Fondos claros, decoraciones |
| `--olive` | `#5C6B3A` | Vegetación, secciones alternadas |
| `--olive-muted` | `#8A9468` | Texto secundario |
| `--cream` | `#F7F3EC` | Fondo base |
| `--brown-dark` | `#2E1F0E` | Texto principal, hero bg |
| `--white` | `#FDFAF5` | Superficies de tarjetas |

---

## Tipografías

- **Display**: Cormorant Garamond (títulos, sello, elementos elegantes)
- **Body**: Lato (cuerpo de texto, formularios, etiquetas)

---

## Módulos pendientes

- [ ] Formulario RSVP + guardado en Supabase
- [ ] Sección de transporte
- [ ] Sección de información y timeline
- [ ] Galería multimedia con subida a Google Drive
- [ ] Panel de administración

---

## Hoja de ruta SaaS (Fase B)

1. Sistema de registro de parejas (onboarding)
2. Rutas dinámicas por `weddingSlug`
3. Panel superadmin
4. Pasarela de pagos (Stripe)
5. Subdominios dinámicos (`pareja.dominio.com`)

*Nada de esto requiere reescribir el código existente si se han respetado las decisiones arquitectónicas.*
