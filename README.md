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

### Pie de página opcional

En **Contenido / Estructura**, la casilla **Usar pie de página por defecto**
controla el fallback cuando no hay un pie personalizado visible para el perfil.
Desmárcala y pulsa **Guardar cambios** para dejar la página sin pie en ese caso.
Un pie personalizado visible sigue teniendo prioridad. La web pública y la
previsualización de Diseño respetan esta opción.

Se guarda como `diseno.usarPieFallback`: `false` desactiva el fallback;
`true` o la ausencia del campo mantienen el comportamiento anterior.
Esta opción de estructura no se modifica al aplicar versiones visuales.

### Botón de confirmación de asistencia

En la web pública, «Confirmar asistencia» aparece cuando la URL contiene
`inviteCode` (o `invitecode`) no vacío y no ha vencido el plazo de confirmación.
No depende de que termine o tenga éxito la consulta de la invitación; el código
se valida al acceder al formulario RSVP. El plazo incluye todo el día indicado
y se calcula con la fecha local del dispositivo. Si no hay plazo, no caduca.
La consulta sigue cargando el texto personalizado y, para invitaciones de
administrador, cambia el botón a «Panel de administración», disponible también
fuera de plazo.

El enlace «Volver a la web» del RSVP conserva `inviteCode` y añade
`skipIntro=1` para mostrar directamente la invitación, sin repetir la intro.
Este parámetro se conserva en los enlaces internos y no afecta a la
previsualización de Diseño ni a las visitas normales sin el parámetro.

Las rutas RSVP solo devuelven «invitación no encontrada» si la consulta termina
correctamente y no existe el código. Los fallos de base de datos se registran
en el servidor; la API responde con 503 y el formulario muestra un aviso con
**Reintentar**, que realiza una recarga completa. Si falla la lectura de los
asistentes, no se muestra un formulario vacío ni se sustituyen los datos por
personas nuevas. La consulta de portada no usa caché y los códigos se recortan
y codifican al construir las URLs. El botón abre el formulario (o el panel de
administración) con una navegación completa para no reutilizar errores previos
de la caché de navegación del cliente.

La consulta de portada y el enlace al formulario incluyen `rsvpVersion=2`.
Esto cambia la clave de caché para evitar los 404 guardados antes de corregir
las respuestas; `no-store` por sí solo no elimina respuestas ya almacenadas.
El parámetro no cambia el código de invitación ni los datos guardados. Es una
versión fija, no un identificador aleatorio por visita. Los enlaces antiguos
siguen siendo válidos en el servidor, pero si un navegador conserva su 404,
se puede abrir `/rsvp/<inviteCode>?rsvpVersion=2` directamente.

### Versiones visuales (antes de migrar roles)

Aplica primero `supabase/migrations/20261009_visual_versions.sql` en Supabase.
Sin esta migración, las operaciones muestran un error y **no restauran ni
publican nada**. No modifica el modelo de roles existente.

En **Diseño → Versiones visuales persistentes**:

- **Guardar versión sin publicar** captura el estilo del editor, incluidos
  los borradores, con nombre y fecha del servidor. No modifica la web.
- **Previsualizar y comparar** muestra las diferencias efectivas con la
  configuración publicada y permite alternar **A/B** o verlas lado a lado,
  en PC/móvil. Usa el mismo renderizador público, con contenido y geometría
  actuales. La intro se repite sin alterar el registro de visitas.
- **Aplicar versión explícitamente** requiere confirmación. Antes guarda el
  estilo del borrador; el respaldo del estilo publicado y la aplicación se
  ejecutan juntos en una transacción con bloqueo y control de concurrencia.
  Si falla el respaldo, no se aplica. Si otro administrador ha modificado la
  configuración desde la comparación, hay que previsualizar de nuevo.
- Al seleccionar una versión, el panel carga su propuesta inmediatamente
  en **B**; cambiar la selección no publica el diseño. **A** es el diseño
  publicado. Alterna A/B o usa la vista lado a lado. **Actualizar
  previsualización A/B** recarga ambas con el contenido y la geometría
  actuales. No hace falta seleccionar la paleta por separado: el snapshot
  incluye la paleta activa y todas las asignaciones.
- **Eliminar versión** borra solo el snapshot elegido tras confirmación;
  también se pueden eliminar copias recuperables (esta acción es irreversible)
  y no altera el estilo que esté aplicado.
- Las **copias recuperables** se previsualizan y aplican igual que una versión.
  Aplicar una copia genera otro respaldo: permite volver al estado anterior.
  **Restaurar valores por defecto** también restaura solo estilo y guarda copias.
  **Guardar y publicar cambios** sigue siendo la publicación del editor,
  distinta del guardado de una versión.

Los snapshots independientes guardan paletas, colores/texturas, definiciones y
etiquetas de roles, asignaciones de paleta/color/fuente a componentes, fuentes
por referencia, tamaños de **texto**, bordes, tratamientos de imagen, fondos,
tintes/recursos de separadores, lacre y acabado del sobre. Incluyen colores, opacidad, fuente,
negrita/cursiva y tamaños de texto de los elementos de **Portada libre y pie**,
por separado para PC/móvil, y colores/tamaño de texto de navegación.

No guardan ni restauran invitados, RSVP, mensajes, textos, imágenes de contenido,
orden/visibilidad/perfiles de secciones, geometría del sobre, márgenes, posiciones,
dimensiones/alineación de lienzos/elementos, tamaños de gráficos ni animaciones.
Es deliberado: un mismo estilo puede aplicarse sobre el contenido y la geometría
vigentes. Las posiciones no vuelven atrás al recuperar una versión antigua.

Se emparejan secciones por **ID y tipo**, elementos libres por **ID y dispositivo**.
Una sección/componente eliminado o de otro tipo se omite con advertencia: nunca
se recrea ni se reasigna por índice/nombre. Los nuevos elementos no incluidos en
la versión conservan sus overrides; los mapas visuales de secciones existentes
se reemplazan exactamente para no resucitar overrides antiguos.

La tabla `visual_versions` no tiene acceso para `anon`/`authenticated`; la API,
la previsualización, restauración y eliminación comprueban que el código es
administrador de la boda. El RPC solo admite `service_role`. Las recargas
recuperan versiones desde Supabase, no desde localStorage. El último estilo aplicado se guarda como el mapa aislado
`config_json.visualSnapshot`, no como una copia de las secciones/contenidos
normalizados. La eliminación requiere también
`supabase/migrations/20261009b_visual_versions_delete.sql`.
Cada snapshot identifica `schema: wedding-visual`, `schemaVersion: 1` y
`rolesModel: legacy-v1`; esquemas desconocidos se rechazan hasta implementar
una migración explícita al futuro modelo de roles.

No se copian archivos ni fuentes. Se conservan URLs/rutas: se detectan recursos
locales ausentes y archivos de Drive ausentes/inaccesibles; los fallos de permisos
o conexión y URLs externas se marcan **sin verificar** (no se realizan peticiones
a URLs arbitrarias desde el servidor). Aplicar con incidencias exige aceptación
explícita, sin sustituir referencias. La disponibilidad futura de recursos externos
no puede garantizarse: mantener las versiones no impide que alguien borre el archivo.

Regresión: `node --test src/lib/visual-versions.test.mjs` cubre guardado, recarga,
comparación sin publicación, A → B → copia A, aislamiento de contenido/geometría,
autorización, recursos ausentes, eliminación de overrides y fallos de respaldo/
concurrencia. Los handlers usan un doble de Supabase; valida también el flujo en
tu Supabase después de desplegar la migración. Validación adicional:
`npx tsc --noEmit` y `npm run build`.

### Geometría del sobre

En **Contenido → Intro → Apertura de sobre**, PC y móvil guardan por separado
la geometría en `intro.pc.envelope` / `intro.movil.envelope` de `config_json`.
**Papel plegado** añade relieve y dos costuras diagonales inferiores detrás
de la solapa superior; **Compatible: aspecto anterior** recupera la silueta
y el acabado previos. Cambiar de modo no borra las medidas.

La altura inferior (5–95%) se mide desde abajo respecto al **alto del sobre**;
el extremo plano (0–80%), respecto a su **ancho**. Cero produce un pico.
El redondeo (0–50%) recorta una fracción de los lados adyacentes: cero deja
ángulos vivos. La altura y el redondeo superiores mantienen sus controles.
Esquinas, grosor y sombras siguen usando los controles existentes; las medidas
en **% vmin** corresponden al lado menor de la pantalla, no al sobre.

Las siluetas, máscaras, costuras y sombras proceden de la misma geometría.
La solapa inferior se recorta al frontal para no invadir el hueco de la carta,
incluso si su altura supera la de la superior. No cambia la secuencia,
el lacre, el sello seco, la carga inicial, las texturas ni las dimensiones.
La previsualización del editor y `/dev/envelope-test` usan el mismo renderizador
y controles inferiores. Guarda los cambios en el editor para persistirlos.
Las regresiones de geometría y serialización se ejecutan con
`node --test tests/envelope-geometry.test.mjs`.

### Imágenes y logos con Google Maps

Los controles del carrusel (anterior, siguiente y puntos) usan el rol asignado
a **Controles del carrusel** en Diseño, tanto en la web pública como en las
previsualizaciones de Diseño. En **El gran día**, los títulos y las
descripciones de las entradas están centrados en ordenador; la disposición
móvil no cambia.

En **Contenido**, las imágenes de **Portada (formato libre)** y los eventos del
timeline permiten asignar/quitar **Enlace de Google Maps**, añadir una URL
embebible opcional y previsualizarla. En Diseño también están disponibles los
controles de Maps de la imagen seleccionada en Portada libre. Guarda los cambios
para persistirlos. Si una imagen ya tiene un enlace, elige explícitamente
**Voltear y mostrar Maps**; el enlace anterior no se elimina.

El mapa se carga únicamente al pulsar la imagen o la entrada completa del
timeline. Ambas giran para mostrar la cara B en exactamente la misma región,
sin ampliar columnas ni añadir espacio; el mapa se adapta al espacio disponible
y **Cómo llegar** queda debajo dentro del mismo reverso. Se mantienen los
tamaños móvil/PC de los logos y el layout de las entradas.

Pulsa fuera del componente para recuperar la cara A; no hay botón de volver.
También se puede abrir con Enter/Espacio y cerrar con Escape fuera del iframe.
El foco se restaura si estaba dentro del componente, sin quitarlo a otro control
pulsado fuera. Interactuar con el mapa o **Cómo llegar** no cierra el reverso;
la preferencia de movimiento reducido sustituye las caras sin giro.

Se admiten URLs de Google Maps (`google.com`/`google.es`, `www`/`maps`) con
`q`, `query`, lugar/búsqueda o destino de ruta, inserción `/maps/embed?pb=…`,
y enlaces cortos `maps.app.goo.gl` / `goo.gl/maps`. Se normalizan a HTTPS al
guardar. No se acepta HTML de iframe ni dominios arbitrarios. Los enlaces
cortos y las vistas sin ubicación extraíble no se usan como iframe: añade la
URL de **Compartir → Insertar un mapa** (solo su `src`) para la misma ubicación.
Si no es posible insertar el mapa, se muestra un error y se conserva
**Cómo llegar**. Los bloqueos internos de Google no siempre generan un error
de iframe detectable; **¿No ves el mapa?** ofrece también esta alternativa.

### Márgenes de PC y fondo general

En **Diseño de la web → Marco y fondo general** se configuran independientemente
los márgenes izquierdo y derecho en px, el color de fondo y una textura opcional
(URL, ruta local o subida), con tamaño de mosaico opcional. Pulsa **Guardar cambios**
para persistirlos en `diseno.margenesPc`, `fondoPaginaColor`, `fondoPaginaImagen`
y `fondoPaginaTexturaTamanoPx` de `config_json`. El color permanece debajo de la
textura y se muestra si esta no carga. Los fondos de sección conservan su prioridad.

Desde 768 px, el ancho útil es el ancho disponible de la ventana menos ambos
márgenes; por debajo se ignoran los márgenes. Si no caben, se reducen
proporcionalmente dejando un ancho útil positivo. Los valores antiguos sin
márgenes equivalen a cero, y sin fondo personalizado conservan el de la paleta.
El campo antiguo `fondoPaginaImagen` también se admite como textura.

`WeddingViewport` centraliza el marco y las variables `--wedding-vw`,
`--wedding-width` y `--wedding-vmin`, usadas por navegación, contenedores,
portadas, pie e intro. Las previsualizaciones y miniaturas usan el mismo marco;
las posiciones y dimensiones porcentuales de Portada libre siguen siendo
relativas a su lienzo, no al viewport. En modo pantallas el alto no se reduce
al aplicar márgenes. El editor simula una pantalla 16:9 en PC y 9:16 en móvil.
`sizes` de imágenes sigue siendo una pista de descarga, no una dimensión de layout.

### Imagen del sello de Invitación

En el panel de administración, abre **Contenido**, selecciona la sección
**Invitación** y configura **Imagen del sello**. Puedes subir una imagen a la
subcarpeta `invitacion` de los recursos de Drive, seleccionar una imagen de esa
subcarpeta o pegar una URL (también se admiten rutas locales como
`/images/sello.svg`). Después pulsa **Guardar**.

La imagen se guarda por sección en `diseno.secciones[].selloUrl` y se muestra
tanto en la web como en las vistas previas del editor de diseño. Si el campo
está vacío se conserva el sello SVG actual. Las imágenes personalizadas
mantienen sus colores y proporciones; el control de tamaño del logo sigue
aplicándose. Este campo no cambia el logo de la barra superior ni el lacre de
la Intro.

### Carga inicial de la Intro

El servidor presenta un fondo liso del mismo color que el fondo general de los
márgenes de PC, también en móvil, sin texto de carga visible. El estado de carga
se anuncia solo a lectores de pantalla. No se presenta una geometría provisional
de PC. Tras hidratar, se elige móvil por debajo de 768 px y PC desde 768 px. El sobre
se dimensiona respecto al marco útil (incluidos los márgenes laterales de PC);
la relación de aspecto fija y el ajuste a ancho/alto conservan sus opciones.

El lacre se descarga una sola vez, conservando los bytes del PNG; los SVG se
preparan desde ese mismo contenido. La textura de paleta, la imagen propia y el
fondo exterior se precargan y decodifican antes de mostrar el sobre y el lacre
juntos. No hay una espera mínima: caché caliente y recursos rápidos liberan la
intro en cuanto están preparados. Cada carga tiene un límite de seguridad de
30 segundos, no un retardo de presentación. Los fallos se registran en consola:
una textura fallida mantiene el color base, sin incorporarse tarde, y un lacre
fallido ofrece **Abrir invitación**. El movimiento reducido evita la apertura
animada del sobre.

Para verificar, recargar con caché desactivada en PC y móvil, retrasar o bloquear
las solicitudes del lacre y la textura, y comprobar dimensiones y estilos
además de la captura. `data-intro-state` indica `loading`/`ready` y
`data-intro-phase` la fase del sobre. Ejecutar `npx tsc --noEmit` y `npm run build`.

### Sello seco en la solapa de la Intro (fase a)

En **Contenido → Intro → PC / Móvil → Sobre**, configura **Sello seco en la
solapa**: subida PNG/JPG/SVG, selección de recursos o URL. Guarda los cambios
para persistirlo en `intro.pc.envelope` o `intro.movil.envelope`, dentro de
`diseno.secciones` de `config_json`. Los campos son `selloSecoUrl`,
`selloSecoTamanoPorcentaje`, `selloSecoXPorcentaje` y `selloSecoYPorcentaje`.
Sin URL no hay sello seco y la Intro conserva su comportamiento anterior.
Los defaults son ancho 18% del sobre y centro (50%, 35%) de la solapa.
Se conservan las proporciones y se recorta el dibujo al papel de la solapa.

PNG/JPG conservan sus colores y se integran en el papel mediante
`selloSecoMezclaImagen`: `overlay` (default), `soft-light`, `hard-light` o
`normal` (sin mezcla). Para SVG, `selloSecoRelieveSvg` permite activar un
relieve adicional; por defecto está desactivado para respetar un relieve
ya incorporado en el archivo. Al activarlo se aplica exactamente
`drop-shadow(-1px -1px 1px rgba(255,255,255,.9)) drop-shadow(1px 1px 1px rgba(0,0,0,.35))`,
sin recolorear ni sustituir los filtros originales. Ambos controles se
guardan independientemente para PC y móvil.
El sello pertenece a la cara exterior de la solapa:
gira con ella, deja de verse por su reverso y se retira junto con el sobre.
El lacre también pertenece a la cara exterior y conserva su interacción.

Los SVG conservan su animación propia mediante el visor SVG existente
(incluido el visor aislado para animaciones nativas/script). El sello es
decorativo y no captura clics ni dispara la apertura. Con movimiento reducido
se muestra una versión estática del SVG, sin scripts ni animaciones.
Su carga forma parte de la preparación inicial: un fallo se registra en
consola y se anuncia, pero permite abrir la invitación sin ese sello.

Prueba aislada: `/dev/envelope-test`. Permite introducir el recurso, ajustar
tamaño/posición y reiniciar. Comprueba la fase cerrada, el giro, el descenso y
la portada final; repite en móvil, con recurso ausente y con movimiento reducido.

### Movimiento y salida del sobre

En **Contenido → Intro → PC / Móvil → Sobre**, guarda por dispositivo:

- `lacreFadeDuranteApertura`: checkbox **Desvanecer el lacre al empezar a
  abrir la solapa**. Desmarcado (default), viaja con la solapa sin fade.
  Marcado, el fade y el giro comparten exactamente el instante de inicio,
  después de `pausaTrasTriggerMs`. `duracionFadeLacreMs` permite indicar una
  duración propia (default 900 ms, 0 para desaparición inmediata), independiente
  de `duracionLacreMs` y de la apertura. No retrasa la secuencia y permanece
  unido a la solapa; si el sobre se retira antes, también se retira el lacre.
  El antiguo `lacreFadeAntesApertura` se migra al nuevo comportamiento cuando
  falta el campo nuevo. También se aplica a SVG: en este modo
  el clic lo captura la web en lugar del disparador nativo. Con movimiento
  reducido se omiten fade y pausa. Se guarda independientemente en PC/móvil.
- `anguloMaximoAperturaGrados`: 1–180°, con fallback de 180°.
- `modoSalidaSobre`: `descensoZoom` (modo anterior, por defecto),
  `fadeApertura` (todo el sobre se desvanece mientras gira, sin descenso ni zoom)
  o **`fadeProgramado` (desvanecimiento con línea temporal desde el clic)**.
  Este nuevo modo tiene cuatro efectos independientes en `lineaTemporal`,
  con inicio y duración en milisegundos por dispositivo:

  | Efecto | Inicio desde el clic | Duración por defecto |
  | --- | ---: | ---: |
  | Lacre (`inicioFadeLacreMs`, `duracionFadeLacreMs`) | 100 | 500 |
  | Solapa (`inicioAperturaMs`, `duracionAperturaMs`) | 300 | 2000 |
  | Sobre completo (`inicioFadeSobreMs`, `duracionFadeSobreMs`) | 1000 | 1000 |
  | Zoom (`inicioZoomMs`, `duracionZoomMs`) | 1500 | 1000 |

  El instante 0 es el clic (también en SVG, capturado por la web), sin sumar
  `pausaTrasTriggerMs` ni esperar una animación nativa del lacre. Los efectos
  pueden solaparse y aceptan duración 0; los valores ausentes/no finitos usan
  los defaults y los negativos se normalizan a 0. El fade incluye solapa,
  lacre, sello seco, sombras, mesa y cobertores, pero no la web. No hay descenso.
  La portada conserva su geometría inicial de carta y anima escala y posición
  hasta su tamaño definitivo; si ya está a escala 1 y desplazamiento 0,
  no se crea ni se espera el zoom. La intro finaliza una sola vez al terminar
  todos los efectos aplicables, sin saltos al desmontar. Con movimiento
  reducido se omiten inicios y duraciones, y se desbloquea el scroll.
  Los controles y duraciones de los dos modos anteriores se conservan
  separados: cambiar de modo no sobrescribe sus ajustes guardados.
- `direccionLuzGrados`: origen de la iluminación, en sentido antihorario:
  0° derecha, 90° arriba, 180° izquierda, 270° abajo. La sombra va en sentido
  opuesto: con 225° (default) la luz viene de abajo izquierda y la sombra va
  arriba derecha; con 315° la sombra va arriba izquierda. Se reutilizan `colorSombraApertura`,
  `intensidadSombraAperturaPorcentaje` y `sombraDesenfoquePorcentaje` para
  las sombras variables de solapa y lacre.

La dirección es común al grosor del papel, al cuerpo del sobre, a las caras
de la solapa y al lacre, también en reposo. La sombra proyectada de la solapa
se calcula punto a punto según su altura sobre el papel, anclada a la bisagra:
su proyección cambia de forma y dirección diagonal durante el giro, no solo
se traslada un triángulo vertical. Las sombras locales se proyectan sobre la
superficie giratoria sin invertir artificialmente la luz al mostrar el reverso.
Se eliminan los trazos de costura y el reborde pintado. Los antiguos campos
`colorBorde`, `grosorBordePorcentaje` y `colorCostura` se conservan en los datos
por compatibilidad, pero ya no dibujan contornos ni tienen controles.
Los valores guardados de `direccionLuzGrados` conservan su número y pasan a
esta convención corregida (90° arriba).

La apertura usa un único reloj de Web Animations para giro, sombras y fade.
La curva `ease-in-out` cambia la velocidad, no la duración: la fase siguiente
espera a `Animation.finished`, no a un temporizador paralelo. Descenso y zoom
también esperan al final real de sus transiciones CSS. La duración de
apertura tiene un mínimo de 300 ms; se respetan duraciones guardadas mayores
que el rango habitual del editor (5000 ms). El PNG del lacre no se borra ni encoge
al pulsarlo en modo Sobre: viaja con la solapa y se oculta únicamente al verse
su reverso. Los SVG con disparador nativo conservan ese disparador; la pausa
configurada antes de abrir sigue aplicándose. Para PNG/JPG, `duracionLacreMs`
no añade una espera de borrado en modo Sobre. El fade opcional tiene su propia
duración y empieza junto con la solapa.

En `fadeApertura`, la portada está a escala 1 y sin desplazamiento desde el
estado cerrado, cubierta por la escena del sobre. También se desvanece la
mesa exterior, evitando un cambio de fondo al terminar. Movimiento reducido
finaliza sin animación; la finalización y la persistencia se ejecutan una vez
y se restaura el scroll.
El gutter de la barra de scroll permanece reservado también mientras el
scroll está bloqueado; así su desbloqueo no estrecha la portada al terminar.

En `/dev/envelope-test` se pueden probar ambos modos, ángulo, duración, luz,
textura y sello seco, o activar **Probar IntroReveal** para comprobar lacre,
scroll y persistencia. Para medir, observar `data-intro-phase`, los elementos
`data-envelope-flap`, `data-envelope-seal`, las sombras y
`data-envelope-content-scale`. Registrar el tiempo nativo de la animación
y sus estilos en varios puntos, no solo capturas inicial/final.

### Tamaño del lacre por dispositivo

En **Contenido → Intro → PC / Móvil**, activa **Usar tamaño propio del lacre**
y ajusta el tamaño entre 5% y 40%. Se guarda en
`intro.pc.tamanoLacrePorcentaje` o `intro.movil.tamanoLacrePorcentaje` al
guardar los cambios, y se aplica a todos los modos de Intro, incluido Sobre.
Desactiva la opción para volver al tamaño común
`intro.tamanoLacrePorcentaje`. Las configuraciones antiguas conservan ese
valor común, o 24% si tampoco estaba definido. El recurso, la interacción y
la duración del lacre siguen siendo comunes.

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
Los elementos de tipo **Texto** de Portada libre también tienen un **Link del
texto (opcional)** en Contenido y Diseño. Un enlace válido convierte todo el
texto en un hipervínculo subrayado, conservando su fuente, color, alineación y
dimensiones móvil/PC. Vacía el campo para volver al texto sin enlace y guarda
los cambios para persistirlo. Se admiten HTTP, HTTPS, `mailto:` y `tel:`; los
enlaces web se abren en una nueva pestaña.
