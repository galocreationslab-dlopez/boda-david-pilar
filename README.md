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

## Hoja de ruta de mejoras (orden recomendado por versiones funcionales)

Este orden prioriza entregas utilizables de extremo a extremo en cada versión, reduciendo riesgo técnico y manteniendo compatibilidad con lo ya publicado.

### V1. Base de Invitación (modelo + contenido)

- [ ] Renombrar el tipo de sección actual `portada` a `invitación` (manteniendo compatibilidad con datos existentes).
- [ ] Permitir texto de invitación personalizado en esta sección, con fallback automático al texto genérico actual si no hay personalización.

### V2. Personalización visual base

- [ ] Permitir divisor entre secciones por imagen subida.
- [ ] Permitir imagen de fondo global de la página (además del color actual).

### V3. Interacción social

- [ ] Nuevo tipo de sección `Playlist` para que invitados sugieran canciones.

### V4. Experiencia de entrada tipo Sobre

- [ ] Nuevo tipo de sección `Sobre` con variantes de diseño.
- [ ] Incluir lacre con logo de la boda y animación de apertura al hacer clic.
- [ ] Al abrirse el sobre, mostrar dentro la sección de invitación actual y debajo el resto de secciones.

### V5. Nueva Portada animada

- [ ] Crear un nuevo tipo de sección `Portada` dedicado a animaciones de entrada.
- [ ] Variante 1: dos puertas de papel que se abren, cada una con su imagen configurable desde Drive (inicialmente vacías).
- [ ] Variante 2: imagen completa con rectángulo configurable (mover y redimensionar) hacia el que se hace zoom progresivo hasta pantalla completa.
- [ ] Variante 3: animación de impresión letra a letra de la invitación y transición al contenido final.

### V6. Historia avanzada

- [ ] Permitir múltiples imágenes por entrada de historia.
- [ ] Modo `Secuencia`: imágenes temporizadas una detrás de otra.
- [ ] Modo `Secuencia LineAlive`: generar LineAlive por imagen y encadenar reproducciones con delay configurable.
- [ ] Modo `Collage`: colocación libre en zona de imagen + modo random para composiciones distintas en cada render.
- [ ] Animar textos de historia como mecanografiados, sincronizables con el dibujo LineAlive.
- [ ] Avance automático entre páginas de historia por tiempo o por fin de LineAlive + delay.

### V7. Extensión LineAlive global

- [ ] Añadir LineAlive a imágenes de portada en todas sus variantes.
- [ ] Permitir que la imagen de fondo global sea también un LineAlive.

### Criterio de priorización

1. Primero cambios de modelo y nomenclatura con impacto transversal (`portada` -> `invitación`).
2. Después personalización de contenido y estética base (texto, divisores, fondo) para valor inmediato.
3. Luego nuevas capacidades funcionales independientes (`Playlist`, `Sobre`).
4. Finalmente animaciones compuestas y sincronización avanzada (`Portada` animada, `Historia` avanzada, LineAlive global).

---

## Hoja de ruta SaaS (Fase B)

1. Sistema de registro de parejas (onboarding)
2. Rutas dinámicas por `weddingSlug`
3. Panel superadmin
4. Pasarela de pagos (Stripe)
5. Subdominios dinámicos (`pareja.dominio.com`)

*Nada de esto requiere reescribir el código existente si se han respetado las decisiones arquitectónicas.*

---

## Integración LineAlive (dev)

Se ha añadido una integración simple para consumir LineAlive como API externa, sin tocar la lógica interna del SaaS.

### Flujo

1. Cliente web sube imagen y detail opcional.
2. Ruta interna recibe multipart en /api/generate-animation.
3. El backend reenvía el multipart a LINEALIVE_API_BASE_URL/generate.
4. Se devuelve al cliente el JSON con demo_html.

### Variable de entorno requerida

Agregar en .env.local:

LINEALIVE_API_BASE_URL=https://tu-linealive-service.com

Opcional (si quieres indicar endpoint exacto en lugar de base URL):

LINEALIVE_GENERATE_URL=https://tu-linealive-service.com/generate

Opcional (si tu endpoint está detrás de túnel/proxy con cabecera de auth):

LINEALIVE_AUTH_HEADER_NAME=X-GitHub-Token
LINEALIVE_AUTH_HEADER_VALUE=tu_token

### Endpoint interno

POST /api/generate-animation

Campos multipart/form-data:

- image: archivo de imagen (requerido)
- detail: string opcional

Respuesta esperada:

- ok
- service
- detail
- message
- demo_html

### Ejemplo curl

curl -X POST "http://localhost:3000/api/generate-animation" \
    -F "image=@./mi-imagen.png" \
    -F "detail=high"

### Ejemplo Python

from pathlib import Path
import requests

url = "http://localhost:3000/api/generate-animation"
image_path = Path("mi-imagen.png")

with image_path.open("rb") as f:
        files = {"image": (image_path.name, f, "image/png")}
        data = {"detail": "high"}
        r = requests.post(url, files=files, data=data, timeout=120)
        r.raise_for_status()
        payload = r.json()

print(payload.get("ok"), payload.get("message"))
html = payload.get("demo_html", "")
if html:
        Path("linealive_demo.html").write_text(html, encoding="utf-8")

