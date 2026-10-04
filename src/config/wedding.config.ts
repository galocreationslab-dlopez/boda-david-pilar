/**
 * wedding.config.ts
 * ─────────────────────────────────────────────────────────────
 * Configuración centralizada de la boda.
 * NUNCA hardcodear datos de la boda en componentes.
 * En fase SaaS, este objeto vendrá de Supabase filtrado por wedding_id.
 */

export type EventoHistoria = {
  id: string;
  fecha: string;        // "Verano 2022"
  titulo: string;
  descripcion: string;
  imagen?: string;      // ruta en /public/images/
  lineAlive?: LineAliveAnimationAsset;
  lado: "izquierda" | "derecha";
};

export type LineAliveAnimationAsset = {
  enabled: boolean;
  sourceResourceId?: string;
  sourceDriveFileId?: string;
  htmlDriveFileId?: string;
  htmlFileName?: string;
  detail?: string;
  aspectRatio?: number;
  generatedAt?: string;
};

export type Localizacion = {
  id: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  coordenadas: { lat: number; lng: number };
  hora: string;
  diaSemana: string;
  fecha: string;
  icono: "iglesia" | "finca" | "cocktail" | "music";
  enlaceMaps?: string;
};

// Tamano (px) del logo de un evento del timeline; sin valor se usa el tamano historico.
export type TamanoLogoTimeline = {
  movil?: number;
  pc?: number;
};

// Alineacion del logo de un evento por dispositivo; sin valor se usan los defaults de timeline-logo-size.
export type AlineacionLogoDispositivo = {
  vertical?: "arriba" | "centro" | "abajo";
  horizontal?: "izquierda" | "centro" | "derecha";
};

export type AlineacionLogoTimeline = {
  movil?: AlineacionLogoDispositivo;
  pc?: AlineacionLogoDispositivo;
};

export type EventoTimeline = {
  id: string;
  hora: string;
  titulo: string;
  descripcion: string;
  icono: "rings" | "cocktail" | "fork" | "cake" | "music" | "car" | "iglesia" | "finca";
  imagen?: string;
  logoTamano?: TamanoLogoTimeline;
  logoAlineacion?: AlineacionLogoTimeline;
};

export type TrayectoTransporte = {
  id: string;
  origen: string;
  destino: string;
  hora: string;
  descripcion: string;
  plazasDisponibles?: number;
};

export type DriveFolderAccess = "private" | "shared" | "public";

export type DriveFolderConfig = {
  folderId: string;
  folderPath: string;
  access: DriveFolderAccess;
  sharedDriveId?: string;
};

export type DriveConfig = {
  recursosWeb: DriveFolderConfig;
  invitados: DriveFolderConfig;
};

export type TemaColores = {
  bronze: string;
  bronzeLight: string;
  olive: string;
  oliveMuted: string;
  cream: string;
  brownDark: string;
  white: string;
};

export type FuenteRol = "nombres" | "titulos" | "textos";

export type FuenteSubida = {
  id: string;
  nombre: string;
  // Nombre de familia CSS (solo letras, numeros, espacios y guiones).
  familia: string;
  url: string;
  formato: "woff2" | "woff" | "truetype" | "opentype";
};

export type TemaFuentes = {
  display: string;
  body: string;
  biblioteca?: FuenteSubida[];
  // rol -> id de FuenteSubida. Sin asignar se usa display/body.
  roles?: Partial<Record<FuenteRol, string>>;
};

export type TemaColorExtra = {
  id: string;
  nombre: string;
  // Color base; si hay textura, queda debajo (se ve a través de los píxeles transparentes del PNG).
  valor: string;
  texturaUrl?: string;
  // Lado del mosaico en px al repetirse; sin valor se usa el tamaño natural de la imagen.
  texturaTamanoPx?: number;
  // Con textura, el color del rol pasa a ser transparente (bordes y respaldos dejan ver la textura).
  texturaBaseTransparente?: boolean;
};

export type TemaColorRoleBase =
  | "titulo"
  | "tituloSeccion"
  | "textoPrincipal"
  | "textoSecundario"
  | "fondoSeccion"
  | "fondoSubseccion"
  | "fondoBoton"
  | "textoBoton"
  | "logo"
  | "nexosTransicionesBordes"
  | "bordes";

export type TemaColorRole = TemaColorRoleBase | (string & {});

export type TemaPaleta = {
  id: string;
  nombre: string;
  colores: TemaColores;
  etiquetasColores?: Partial<Record<keyof TemaColores, string>>;
  coloresExtra?: TemaColorExtra[];
  rolesColor?: Partial<Record<string, string>>;
  roleLabels?: Partial<Record<string, string>>;
};

// `portada` se mantiene por compatibilidad con configuraciones antiguas.
// `pie` es un pie de pagina personalizado (formato libre, como portadaLibre); como maximo una por configuracion,
// siempre se renderiza al final del contenido y nunca es colapsable (ver normalizePieConfig en lib/portada-libre.ts).
export type TipoSeccionDiseno = "intro" | "invitacion" | "portada" | "portadaLibre" | "historia" | "timeline" | "galeria" | "carrusel" | "pie";

export const DEFAULT_TEXTO_INVITACION =
  "Con mucha alegría os invitamos a compartir con nosotros el día más especial de nuestras vidas.";

export type IntroAnimationType = "revealBook" | "cortinas" | "fadeIn" | "focusRegion" | "slideUp" | "custom" | "envelope";

// Región de interés (polígono de 4 vértices) usada por el tipo "focusRegion".
// Coordenadas normalizadas (0-1) relativas al contenedor del media, en orden
// TL (arriba-izq), TR (arriba-der), BR (abajo-der), BL (abajo-izq).
export type IntroRegionCuadrilatero = {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
};

export type IntroRevealBookConfig = {
  panelIzquierdoUrl?: string;
  panelDerechoUrl?: string;
  duracionDibujoMs?: number;
  duracionAperturaMs?: number;
  pausaAntesDeAbrirMs?: number;
  maxEsperaDibujoMs?: number;
};

export type IntroCortinasConfig = {
  panelIzquierdoUrl?: string;
  panelDerechoUrl?: string;
  duracionDibujoMs?: number;
  duracionAperturaMs?: number;
  pausaAntesDeAbrirMs?: number;
  maxEsperaDibujoMs?: number;
};

export type IntroFadeInConfig = {
  mediaUrl?: string;
  duracionFadeMs?: number;
  maxEsperaMs?: number;
};

export type IntroFocusRegionConfig = {
  mediaUrl?: string;
  region?: IntroRegionCuadrilatero;
  duracionZoomMs?: number;
  duracionFadeMs?: number;
  maxEsperaMs?: number;
};

export type IntroSlideUpConfig = {
  mediaUrl?: string;
  duracionDeslizamientoMs?: number;
  maxEsperaMs?: number;
};

export type IntroCustomConfig = {
  htmlUrl?: string;
  maxEsperaMs?: number;
};

// Modo de apariencia del sobre para el tipo de animación "envelope":
// - "colores": el sobre se dibuja íntegramente con los colores/parámetros CSS de abajo.
// - "textura": los colores de abajo actúan de base y se superpone una imagen de textura (papel, kraft, etc.).
// - "svgPersonalizado": una imagen/SVG propio sustituye por completo el acabado del sobre (el código solo anima la apertura).
export type IntroEnvelopeModoFondo = "colores" | "textura" | "svgPersonalizado";

// Cómo se comporta el sobre al descender tras abrirse la solapa.
export type IntroEnvelopeDescensoModo = "desplazamiento" | "fade" | "ambos";

// "automatico": el sobre ocupa el área disponible (pantalla menos el margen) con la
// misma relación de aspecto que la pantalla, como hasta ahora.
// "fijo": el sobre mantiene una relación de aspecho ancho/alto fija; el margen pasa a
// ser un mínimo y el lado que sobre se reparte como margen extra, quedando centrado.
export type IntroEnvelopeAspectoModo = "automatico" | "fijo";

// En modo de aspecto "fijo", a qué lado se ajusta exactamente el sobre (respetando su
// margen mínimo en ese eje): al otro eje no se le aplica margen y, si con la relación
// de aspecto configurada resulta más grande que la pantalla, sobresale sin recortarse.
export type IntroEnvelopeAjusteAspecto = "ancho" | "alto";

export type IntroEnvelopeConfig = {
  acabadoPaleta?: "textura" | "color" | "personalizado";
  modoFondo?: IntroEnvelopeModoFondo;
  imagenUrl?: string; // textura o sobre completo, según modoFondo
  colorBase?: string; // color del frontal (la cara exterior/visible del sobre)
  colorTrasera?: string; // color de la trasera y la cara exterior de la solapa (misma pieza de papel)
  colorBorde?: string;
  // Todas las medidas se expresan como porcentaje del lado menor de la pantalla
  // (unidad "vmin"), ya que el sobre y la carta se dimensionan proporcionalmente.
  grosorBordePorcentaje?: number;
  radioEsquinasPorcentaje?: number;
  colorSolapaInterior?: string;
  colorCostura?: string;
  sombraColor?: string;
  sombraDesenfoquePorcentaje?: number;
  alturaSolapaPorcentaje?: number; // 0-100: altura de la solapa triangular respecto al alto del sobre
  radioPicoSolapaPorcentaje?: number; // 0-50: redondeo del pico de la solapa (y de la muesca a juego en el frontal)
  // Sombra que proyecta la solapa (sobre su cara interior y la portada vista por el
  // hueco) al empezar a abrirse; se desvanece a la vez que termina de abrirse.
  colorSombraApertura?: string;
  intensidadSombraAperturaPorcentaje?: number; // 0-100
  // Sombra sutil en el contorno de la solapa/frontal que simula el grosor del papel.
  colorGrosorPapel?: string;
  intensidadGrosorPapelPorcentaje?: number; // 0-100
  // Escena: ni el sobre ni el contenido ocupan el 100% de la pantalla.
  margenPantallaPorcentaje?: number; // margen (mínimo, en modo "fijo") entre el sobre y el borde de la pantalla
  margenContenidoPorcentaje?: number; // margen adicional del contenido respecto al sobre (para que se note que está dentro)
  modoAspectoSobre?: IntroEnvelopeAspectoModo;
  ajusteAspectoSobre?: IntroEnvelopeAjusteAspecto; // solo en modo "fijo"
  aspectoAnchoSobre?: number; // unidades de ancho de la relación de aspecto (solo en modo "fijo")
  aspectoAltoSobre?: number; // unidades de alto de la relación de aspecto (solo en modo "fijo")
  fondoExteriorColor?: string; // color de fondo detrás del sobre (la "mesa")
  fondoExteriorImagenUrl?: string; // textura opcional superpuesta al fondo exterior
  // Secuencia tras el lacre: abrir solapa -> el sobre desciende -> la portada hace zoom a pantalla completa.
  modoDescensoSobre?: IntroEnvelopeDescensoModo;
  duracionAperturaMs?: number; // tiempo en abrir la solapa
  duracionDescensoMs?: number; // tiempo en que el sobre desciende tras abrirse
  duracionZoomMs?: number; // tiempo en que la portada hace zoom hasta ocupar toda la pantalla
};

export type NativeSvgAnimationOption = {
  id: string;
  label: string;
  begin?: string;
  duration?: string;
  tagName: string;
};

export type IntroDeviceConfig = {
  tipo: IntroAnimationType;
  revealBook?: IntroRevealBookConfig;
  cortinas?: IntroCortinasConfig;
  fadeIn?: IntroFadeInConfig;
  focusRegion?: IntroFocusRegionConfig;
  slideUp?: IntroSlideUpConfig;
  custom?: IntroCustomConfig;
  envelope?: IntroEnvelopeConfig;
};

export type IntroSeccionConfig = {
  activo: boolean;
  repetir: "siempre" | "primeraVez";
  textoTitulo?: string;
  textoSubtitulo?: string;
  textoSaltar?: string;
  lacreUrl?: string;
  lacreTriggerAnimationId?: string;
  tamanoLacrePorcentaje?: number;
  duracionLacreMs?: number;
  pausaTrasTriggerMs?: number;
  bordeIntroPx?: number;
  // Animación tras el lacre, configurable por separado para PC y móvil.
  pc?: IntroDeviceConfig;
  movil?: IntroDeviceConfig;
  // Campos heredados de versiones anteriores (solo "reveal book" plano).
  // Se conservan para poder migrar configuraciones antiguas; usar normalizeIntroConfig().
  panelIzquierdoUrl?: string;
  panelDerechoUrl?: string;
  duracionDibujoMs?: number;
  duracionAperturaMs?: number;
  pausaAntesDeAbrirMs?: number;
  maxEsperaDibujoMs?: number;
};

/**
 * Convierte una IntroSeccionConfig antigua (plana, solo reveal book) al nuevo
 * formato con configuración independiente para "pc" y "movil". Si la config
 * ya tiene pc/movil definidos, se devuelve tal cual (con defaults rellenados).
 */
export function normalizeIntroConfig(intro: IntroSeccionConfig | undefined): IntroSeccionConfig | undefined {
  if (!intro) return intro;
  if (intro.pc && intro.movil) return intro;

  const legacyRevealBook: IntroRevealBookConfig = {
    panelIzquierdoUrl: intro.panelIzquierdoUrl,
    panelDerechoUrl: intro.panelDerechoUrl,
    duracionDibujoMs: intro.duracionDibujoMs,
    duracionAperturaMs: intro.duracionAperturaMs,
    pausaAntesDeAbrirMs: intro.pausaAntesDeAbrirMs,
    maxEsperaDibujoMs: intro.maxEsperaDibujoMs,
  };
  const deviceDefault: IntroDeviceConfig = { tipo: "revealBook", revealBook: legacyRevealBook };

  return {
    ...intro,
    pc: intro.pc ?? deviceDefault,
    movil: intro.movil ?? deviceDefault,
  };
}

export type ItemSeccionDiseno = {
  id: string;
  titulo: string;
  descripcion: string;
  hora?: string;
  imagen?: string;
  lineAlive?: LineAliveAnimationAsset;
  icono?: string;
  logoTamano?: TamanoLogoTimeline;
  logoAlineacion?: AlineacionLogoTimeline;
  enlaceMaps?: string;
  filtrosImagen?: Array<"sepia" | "grayscale" | "blur">;
  botonLabel?: string;
};

export type PortadaElemento = {
  id: string;
  tipo: "imagen" | "texto" | "enlace" | "mapa";
  nombre?: string;
  url?: string;
  enlaceUrl?: string;
  texto?: string;
  alt?: string;
};

export type PortadaColorModo = "original" | "paleta" | "personalizado";

// Posición y estilo de un elemento en un dispositivo. x/w en % del ancho del lienzo;
// y/h en % de la altura de referencia (ver PortadaDispositivoConfig.alturaModo).
export type PortadaElementoLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  mantenerAspecto?: boolean;
  aspectoFijar?: "ancho" | "alto";
  aspectoAlineacion?: "arriba" | "centroVertical" | "abajo" | "izquierda" | "centroHorizontal" | "derecha";
  // Dimensiones manuales conservadas mientras se calcula la dimensión libre.
  aspectoWManual?: number;
  aspectoHManual?: number;
  z?: number;
  oculto?: boolean;
  opacidad?: number; // 0-100
  // Imagen: "original" mantiene los colores; el resto superpone un color (necesita PNG/SVG con transparencia).
  colorModo?: PortadaColorModo;
  colorRol?: string;
  colorHex?: string;
  ajuste?: "contain" | "cover";
  // Texto
  fuenteRol?: FuenteRol;
  tamano?: number; // px sobre el ancho de referencia (1200 PC, 400 móvil)
  alineacion?: "left" | "center" | "right";
  alineacionVertical?: "start" | "center" | "end";
  negrita?: boolean;
  cursiva?: boolean;
};

export type PortadaDispositivoConfig = {
  // "aspecto": lienzo con relación ancho/alto fija. "pantallas": N alturas de pantalla completa (o automático).
  alturaModo: "aspecto" | "pantallas";
  aspecto?: number;
  pantallas?: number; // 0 = automático según los elementos
  fondoModo?: PortadaColorModo;
  fondoRol?: string;
  fondoHex?: string;
  layout: Record<string, PortadaElementoLayout>;
};

export type PortadaLibreConfig = {
  elementos: PortadaElemento[];
  colapsable?: boolean;
  mostrarTitulo?: boolean;
  abiertaPorDefecto?: boolean;
  pc: PortadaDispositivoConfig;
  movil: PortadaDispositivoConfig;
};

export type DistanciaSiguienteSeccion = {
  movil?: number;
  pc?: number;
};

export type SeccionDiseno = {
  id: string;
  nombre: string;
  titulo: string;
  portadaLibre?: PortadaLibreConfig;
  // Config del pie de pagina personalizado (solo aplica cuando tipo === "pie"); reutiliza el modelo de PortadaLibreConfig.
  pie?: PortadaLibreConfig;
  subtituloInterno?: string;
  fondos?: {
    seccion?: string;
    subseccion?: string;
  };
  intro?: IntroSeccionConfig;
  tipo: TipoSeccionDiseno;
  paletaId: string;
  usarPaletaGlobal?: boolean;
  componentRoles?: Partial<Record<string, TemaColorRole>>;
  // Tamano (px) por componente: fontSize para textos, ancho de referencia para graficos.
  componentSizes?: Partial<Record<string, number>>;
  // Componentes con borde: false lo oculta (sin valor se muestra).
  componentBorders?: Partial<Record<string, boolean>>;
  // Rol de fuente por componente de texto (clave de componente -> FuenteRol).
  componentFonts?: Partial<Record<string, FuenteRol>>;
  separadorInterno?: SeparadorDiseno;
  distanciaSiguiente?: DistanciaSiguienteSeccion;
  encadenarAnterior?: boolean;
  visible: boolean;
  // Si es true, la sección aparece como acceso directo en el menú de hamburguesa.
  menuDirecto?: boolean;
  perfiles: string[];
  items: ItemSeccionDiseno[];
  galeriaConfig?: {
    mostrarSeleccionNovios: boolean;
    mostrarSubidasPorMi: boolean;
  };
};

export type SeparadorDiseno = {
  modo: "sin_transicion" | "suave" | "onda" | "corte";
  grafico: "ninguno" | "ornamento" | "linea_doble" | "onda_fina" | "puntos" | "imagen";
  imagenUrl?: string;
  imagenMaxWidthPx?: number;
  imagenMaxHeightPx?: number;
  tintMode?: "original" | "paleta";
  imagenColorRole?: TemaColorRole;
};

export type TratamientoImagen = {
  opacidadOverlay?: number;
  difuminadoBordePx?: number;
};

// "siempre_visible": la barra superior (logo + menú) se muestra siempre, incluso sobre la portada.
// "visible_en_scroll": la barra permanece oculta mientras se ve la portada y aparece al hacer scroll
// hacia las secciones siguientes.
export type ComportamientoBarraNavegacion = "siempre_visible" | "visible_en_scroll";

export type ElementoBarraId = "menu" | "logo" | "texto";
export type PosicionElementoBarra = "izquierda" | "centro" | "derecha";

// El orden del array define el orden de los elementos dentro de cada zona de la barra.
export type ElementoBarra = {
  id: ElementoBarraId;
  visible: boolean;
  posicion: PosicionElementoBarra;
};

export const ELEMENTOS_BARRA_POR_DEFECTO: ElementoBarra[] = [
  { id: "menu", visible: true, posicion: "izquierda" },
  { id: "logo", visible: true, posicion: "derecha" },
  { id: "texto", visible: true, posicion: "derecha" },
];

export type NavegacionDiseno = {
  comportamiento?: ComportamientoBarraNavegacion;
  // Texto de la barra; vacío = "Novia & Novio".
  texto?: string;
  // Imagen del logo; vacío = sello generado.
  logoUrl?: string;
  // Tamaños en px; vacío = automático. Colores en hex; vacío = color por defecto del tema.
  logoAnchoPx?: number;
  logoAltoPx?: number;
  logoMantenerAspecto?: boolean;
  logoAspectoFijar?: "ancho" | "alto";
  logoAspectoAlineacion?: "arriba" | "centroVertical" | "abajo" | "izquierda" | "centroHorizontal" | "derecha";
  logoAnchoManualPx?: number;
  logoAltoManualPx?: number;
  logoColor?: string;
  fondoColor?: string;
  textoTamanoPx?: number;
  textoColor?: string;
  elementos?: ElementoBarra[];
};

// Textos editables del formulario de RSVP (InviteRsvpForm). Todos opcionales: un campo
// vacío/ausente usa el texto por defecto (ver DEFAULT_RSVP_TEXTOS_FORMULARIO).
export type RsvpTextosFormulario = {
  eyebrow?: string;
  saludoPrefijo?: string;
  fraseInicial?: string;
  volverLabel?: string;
  nombreLabel?: string;
  apellidosLabel?: string;
  asistiraSiLabel?: string;
  asistiraNoLabel?: string;
  asistiraPendienteLabel?: string;
  alojamientoLabel?: string;
  alojamientoPlaceholder?: string;
  alergiasLabel?: string;
  alergiasPlaceholder?: string;
  transporteLabel?: string;
  edadLabel?: string;
  comeConPadresLabel?: string;
  menuAdultoLabel?: string;
  necesitaTronaLabel?: string;
  addAdultoLabel?: string;
  addAcompananteLabel?: string;
  addNinoLabel?: string;
  limiteAlcanzadoLabel?: string;
  comentariosLabel?: string;
  comentariosPlaceholder?: string;
  submitLabel?: string;
  submitLabelSending?: string;
  successMessage?: string;
  errorFallback?: string;
};

// Textos editables del chat privado "Pregunta a los novios" (InviteExtras).
export type RsvpTextosChat = {
  eyebrow?: string;
  titulo?: string;
  subtitulo?: string;
  cargandoMensaje?: string;
  sinMensajes?: string;
  respuestaNoviosLabel?: string;
  campoLabel?: string;
  placeholder?: string;
  botonEnviar?: string;
  botonEnviando?: string;
  feedbackExito?: string;
  feedbackErrorFallback?: string;
};

// Ajustes de presentación y comportamiento del RSVP.
export type RsvpConfig = {
  // Sin valor (configuraciones antiguas) se interpreta como true: el chat se mantiene visible.
  mostrarChat?: boolean;
  mostrarCupos?: boolean;
  cuposLimitantes?: boolean;
  textos?: RsvpTextosFormulario;
  chatTextos?: RsvpTextosChat;
};

export const DEFAULT_RSVP_TEXTOS_FORMULARIO: Required<RsvpTextosFormulario> = {
  eyebrow: "Confirmación de asistencia",
  saludoPrefijo: "Hola, ",
  fraseInicial: "Esta respuesta está ligada a tu invitación única y nos ayudará a preparar mejor el día.",
  volverLabel: "← Volver a la web",
  nombreLabel: "Nombre",
  apellidosLabel: "Apellidos",
  asistiraSiLabel: "Asistirá",
  asistiraNoLabel: "No asistirá",
  asistiraPendienteLabel: "Pendiente",
  alojamientoLabel: "Alojamiento",
  alojamientoPlaceholder: "Dónde os alojaréis",
  alergiasLabel: "Alergias / preferencias",
  alergiasPlaceholder: "Alérgenos, vegetarianismo, embarazo, etc.",
  transporteLabel: "Transporte",
  edadLabel: "Edad",
  comeConPadresLabel: "Come con los padres",
  menuAdultoLabel: "Menú adulto (mayores de 12)",
  necesitaTronaLabel: "Necesita trona (menores de 6)",
  addAdultoLabel: "Añadir adulto",
  addAcompananteLabel: "Añadir acompañante",
  addNinoLabel: "Añadir niño",
  limiteAlcanzadoLabel: "Cupo completo",
  comentariosLabel: "Comentarios adicionales",
  comentariosPlaceholder: "Cualquier detalle que quieras compartir",
  submitLabel: "Guardar respuesta",
  submitLabelSending: "Guardando...",
  successMessage: "Gracias. Hemos guardado la respuesta de esta invitación.",
  errorFallback: "Ha ocurrido un error",
};

export const DEFAULT_RSVP_TEXTOS_CHAT: Required<RsvpTextosChat> = {
  eyebrow: "Area privada",
  titulo: "Pregunta a los novios",
  subtitulo: "Solo tu invitacion puede ver este contenido privado.",
  cargandoMensaje: "Cargando contenido privado...",
  sinMensajes: "Todavia no hay mensajes en esta conversacion.",
  respuestaNoviosLabel: "Respuesta de los novios",
  campoLabel: "Escribe aqui tu pregunta o dedicatoria",
  placeholder: "Preguntas, dudas, frases bonitas...",
  botonEnviar: "Enviar mensaje",
  botonEnviando: "Enviando...",
  feedbackExito: "Mensaje enviado. Os responderemos desde la administracion.",
  feedbackErrorFallback: "Error al enviar el mensaje",
};

// Fusiona textos personalizados con los valores por defecto: cualquier string explicito
// (incluido "" para campos que admiten quedar vacios, como saludoPrefijo) sustituye el
// fallback; undefined (no personalizado) conserva el valor por defecto. Sin HTML arbitrario.
export function mergeRsvpTextos<T extends Record<string, string>>(
  defaults: T,
  overrides?: Partial<Record<keyof T, string | undefined>>,
): T {
  if (!overrides) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = overrides[key];
    if (typeof value === "string") result[key] = value as T[keyof T];
  }
  return result;
}

export type WeddingConfig = {
  weddingId: string;
  slug: string;

  novio: { nombre: string; nombreCompleto: string };
  novia: { nombre: string; nombreCompleto: string };
  nombreConjunto?: string;
  inicialesConjuntas?: string;

  // Logo: si hay imagen propia, se usa en vez del SVG generado
  logo?: string;           // ruta en /public/images/ ej: "sello.png"
  iniciales: { novio: string; novia: string };

  // Hero
  heroImagen?: string;     // ruta en /public/images/ ej: "hero.jpg"

  fecha: string;
  fechaFormateada: string;
  hora: string;

  textos: {
    bienvenida: string;
    confirmacionLimite: string;
  };

  tema: {
    colores: TemaColores;
    fuentes: TemaFuentes;
    paletas?: TemaPaleta[];
    paletaActivaId?: string;
  };

  diseno?: {
    separador?: SeparadorDiseno;
    fondoPaginaImagen?: string;
    tratamientosImagenes?: Record<string, TratamientoImagen>;
    secciones?: SeccionDiseno[];
    navegacion?: NavegacionDiseno;
  };

  historia: EventoHistoria[];
  localizaciones: Localizacion[];
  timeline: EventoTimeline[];
  transporte: TrayectoTransporte[];
  drive: DriveConfig;
  rsvp?: RsvpConfig;
};

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE LA BODA — editar aquí todos los datos
// ─────────────────────────────────────────────────────────────
export const weddingConfig: WeddingConfig = {
  weddingId: "boda-001",
  slug: "pilar-y-david",

  novio: {
    nombre: "David",
    nombreCompleto: "David",       // ← añade tu apellido
  },
  novia: {
    nombre: "Pilar",
    nombreCompleto: "Pilar",       // ← añade tu apellido
  },
  nombreConjunto: "Pilar & David",
  inicialesConjuntas: "P&D",

  // ── Imágenes ──────────────────────────────────────────────
  // Cuando tengas los archivos en public/images/, descomenta y pon el nombre:
  //logo: "Sello.svg",      // tu imagen del sello
  //heroImagen: "Catedral de Granada.jpg", // foto de fondo del hero
  iniciales: { novio: "D", novia: "P" },

  // ── Fecha ─────────────────────────────────────────────────
  fecha: "2027-03-06",
  fechaFormateada: "6 de marzo de 2027",
  hora: "12:00",

  textos: {
    bienvenida: DEFAULT_TEXTO_INVITACION,
    confirmacionLimite: "6 de febrero de 2027",
  },

  tema: {
    colores: {
      bronze: "#8C6A3F",
      bronzeLight: "#C4964A",
      olive: "#5C6B3A",
      oliveMuted: "#8A9468",
      cream: "#F7F3EC",
      brownDark: "#2E1F0E",
      white: "#FDFAF5",
    },
    fuentes: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Lato', system-ui, sans-serif",
    },
    paletas: [
      {
        id: "paleta-clasica",
        nombre: "Clasica",
        colores: {
          bronze: "#8C6A3F",
          bronzeLight: "#C4964A",
          olive: "#5C6B3A",
          oliveMuted: "#8A9468",
          cream: "#F7F3EC",
          brownDark: "#2E1F0E",
          white: "#FDFAF5",
        },
        etiquetasColores: {
          bronze: "Bronce principal",
          bronzeLight: "Bronce claro",
          olive: "Oliva",
          oliveMuted: "Oliva suave",
          cream: "Fondo crema",
          brownDark: "Marrón oscuro",
          white: "Blanco base",
        },
        coloresExtra: [],
        rolesColor: {
          titulo: "brownDark",
          tituloSeccion: "brownDark",
          textoPrincipal: "brownDark",
          textoSecundario: "oliveMuted",
          fondoSeccion: "cream",
          fondoSubseccion: "white",
          fondoBoton: "bronze",
          textoBoton: "white",
          logo: "bronze",
          nexosTransicionesBordes: "bronzeLight",
          bordes: "bronzeLight",
        },
      },
    ],
    paletaActivaId: "paleta-clasica",
  },

  diseno: {
    separador: {
      modo: "suave",
      grafico: "ornamento",
    },
    secciones: [
      {
        id: "sec-invitacion",
        nombre: "Invitacion",
        titulo: "Invitación",
        tipo: "invitacion",
        paletaId: "paleta-clasica",
        usarPaletaGlobal: true,
        componentRoles: {
          "portada.fondo": "fondoSeccion",
          "portada.logo": "logo",
          "portada.nombres": "titulo",
          "portada.separador": "nexosTransicionesBordes",
          "portada.fecha": "textoSecundario",
          "portada.bienvenida": "textoPrincipal",
          "portada.faltan": "textoSecundario",
          "portada.cuentaAtras": "titulo",
          "portada.cuentaAtrasLeyendas": "textoSecundario",
          "portada.ctaFondo": "fondoBoton",
          "portada.ctaTexto": "textoBoton",
        },
        visible: true,
        perfiles: ["publico"],
        items: [],
      },
      {
        id: "sec-historia",
        nombre: "Historia",
        titulo: "Nuestra historia",
        subtituloInterno: "El camino hasta aquí",
        tipo: "historia",
        paletaId: "paleta-clasica",
        usarPaletaGlobal: true,
        componentRoles: {
          "historia.tituloSeccion": "tituloSeccion",
          "historia.fondoSeccion": "fondoSeccion",
          "historia.card": "fondoSubseccion",
          "historia.titulo": "textoPrincipal",
          "historia.descripcion": "textoSecundario",
          "historia.fecha": "textoBoton",
          "historia.navegacion": "textoBoton",
        },
        visible: true,
        perfiles: ["publico"],
        items: [],
      },
      {
        id: "sec-galeria",
        nombre: "Galería",
        titulo: "Momentos",
        tipo: "galeria",
        paletaId: "paleta-clasica",
        usarPaletaGlobal: true,
        visible: true,
        perfiles: ["publico"],
        items: [],
      },
      {
        id: "sec-timeline",
        nombre: "Timeline",
        titulo: "El gran día",
        tipo: "timeline",
        paletaId: "paleta-clasica",
        usarPaletaGlobal: true,
        componentRoles: {
          "timeline.fecha": "titulo",
          "timeline.tituloSeccion": "tituloSeccion",
          "timeline.fondoSeccion": "fondoSeccion",
          "timeline.card": "fondoSubseccion",
          "timeline.titulo": "textoPrincipal",
          "timeline.descripcion": "textoSecundario",
          "timeline.hora": "textoBoton",
        },
        visible: true,
        perfiles: ["publico"],
        items: [],
      },
    ],
  },

  // ── Historia — timeline de vuestra relación ───────────────
  // Edita fechas, textos e imágenes a tu gusto
  historia: [
    {
      id: "h1",
      fecha: "8 de Diciembre de 2021",
      titulo: "El primer encuentro",
      descripcion:
        "Chocolate con churros en el Café Fútbol, ni copas en un bar, ni un brunch en un sitio sofisticado, nuestra historia comienza un día cualquiera en un lugar sencillo entre amigos y por casualidad. Una de esas pequeñas casualidades de las que, sin darte cuenta, cambian tu vida para siempre.",
      // imagen: "historia-1.jpg",
      lado: "derecha",
    },
    {
      id: "h2",
      fecha: "Febrero 2022",
      titulo: "Estar con un músico",
      descripcion:
        "Autobús a Madrid para ver a un loco participar en un concierto benéfico.",
      // imagen: "historia-2.jpg",
      lado: "izquierda",
    },
    {
      id: "h3",
      fecha: "Verano 2022",
      titulo: "El enamorado del norte",
      descripcion:
        "Vacaciones recorriendo Asturias....",
      // imagen: "historia-3.jpg",
      lado: "derecha",
    },
    {
      id: "h4",
      fecha: "Navidad 2022",
      titulo: "Ser pareja en familia",
      descripcion:
        "Compartir la nochebuena en Beas de Granada y la nochevieja en Madrid, una tradición que empieza aquí y perdurará años",
      // imagen: "historia-4.jpg",
      lado: "izquierda",
    },
    {
      id: "h5",
      fecha: "Verano 2023",
      titulo: "Cruzar el mundo por amor",
      descripcion:
        "Canguros, playas, ballenas, excursiones... ",
      // imagen: "historia-5.jpg",
      lado: "derecha",
    },
  ],

  // ── Localizaciones ────────────────────────────────────────
  localizaciones: [
    {
      id: "ceremonia",
      nombre: "Ceremonia",
      descripcion: "Iglesia de Beas de Granada",
      direccion: "Iglesia de Beas de Granada, Granada",
      coordenadas: { lat: 37.3891, lng: -3.6952 },
      hora: "12:00",
      diaSemana: "Sábado",
      fecha: "6 de marzo de 2027",
      icono: "iglesia",
      enlaceMaps: "https://maps.google.com/?q=Iglesia+Beas+de+Granada",
    },
    {
      id: "celebracion",
      nombre: "Celebración",
      descripcion: "Finca Torre del Rey",
      direccion: "Finca Torre del Rey, Granada",
      coordenadas: { lat: 37.4, lng: -3.71 },
      hora: "14:30",
      diaSemana: "Sábado",
      fecha: "6 de marzo de 2027",
      icono: "finca",
      enlaceMaps: "https://maps.google.com/?q=Finca+Torre+del+Rey+Granada",
    },
  ],

  // ── Timeline del día ──────────────────────────────────────
  timeline: [
    {
      id: "t1",
      hora: "12:00",
      titulo: "Ceremonia religiosa",
      descripcion: "Iglesia de Beas de Granada",
      icono: "rings",
    },
    {
      id: "t2",
      hora: "13:30",
      titulo: "Cóctel de bienvenida",
      descripcion: "Finca Torre del Rey",
      icono: "cocktail",
    },
    {
      id: "t3",
      hora: "14:30",
      titulo: "Banquete",
      descripcion: "Almuerzo y celebración",
      icono: "fork",
    },
    {
      id: "t4",
      hora: "17:30",
      titulo: "Tarta nupcial",
      descripcion: "El momento más dulce del día",
      icono: "cake",
    },
    {
      id: "t5",
      hora: "18:00",
      titulo: "Baile y fiesta",
      descripcion: "Que la noche no pare",
      icono: "music",
    },
  ],

  // ── Transporte ────────────────────────────────────────────
  transporte: [
    {
      id: "ida-granada",
      origen: "Granada Capital",
      destino: "Iglesia de Beas de Granada",
      hora: "11:15",
      descripcion: "Salida desde Granada capital",
      plazasDisponibles: 50,
    },
    {
      id: "vuelta-granada",
      origen: "Finca Torre del Rey",
      destino: "Granada Capital",
      hora: "02:00",
      descripcion: "Regreso aproximado a Granada",
      plazasDisponibles: 50,
    },
  ],

  drive: {
    recursosWeb: {
      folderId: "",
      folderPath: "Recursos de la web",
      access: "private",
    },
    invitados: {
      folderId: "",
      folderPath: "Subidas de invitados",
      access: "shared",
    },
  },

  rsvp: {
    mostrarChat: true,
    mostrarCupos: true,
    cuposLimitantes: true,
  },
};
