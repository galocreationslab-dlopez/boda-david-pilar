/**
 * wedding.config.ts
 * ─────────────────────────────────────────────────────────────
 * Configuración centralizada de la boda.
 * NUNCA hardcodear datos de la boda en componentes.
 * En fase SaaS, este objeto vendrá de Supabase filtrado por wedding_id.
 *
 * Estructura pensada para multitenant desde el inicio:
 * cada boda tendrá su propio objeto con esta misma forma.
 */

export type Localizacion = {
  id: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  coordenadas: { lat: number; lng: number };
  hora: string;
  icono: string;
  enlaceMaps?: string;
};

export type EventoTimeline = {
  id: string;
  hora: string;
  titulo: string;
  descripcion: string;
  icono?: string;
};

export type TrayectoTransporte = {
  id: string;
  origen: string;
  destino: string;
  hora: string;
  descripcion: string;
  plazasDisponibles?: number;
};

export type WeddingConfig = {
  // Identificador único — clave para el futuro multitenant
  weddingId: string;
  slug: string;

  // Novios
  novio: { nombre: string; nombreCompleto: string };
  novia: { nombre: string; nombreCompleto: string };

  // Sello: iniciales para el logo SVG
  iniciales: { novio: string; novia: string };

  // Fecha y hora
  fecha: string; // ISO: "2027-03-06"
  fechaFormateada: string;
  hora: string;

  // Textos de la página
  textos: {
    bienvenida: string;
    historia: string;
    dressCode: string;
    dressCodeDetalle: string;
    confirmacionLimite: string; // fecha límite RSVP
  };

  // Diseño visual (en fase SaaS, personalizable por boda)
  tema: {
    colores: {
      bronze: string;
      bronzeLight: string;
      olive: string;
      oliveMuted: string;
      cream: string;
      brownDark: string;
      white: string;
    };
    fuentes: {
      display: string;
      body: string;
    };
  };

  // Localizaciones del día
  localizaciones: Localizacion[];

  // Timeline del día
  timeline: EventoTimeline[];

  // Opciones de transporte
  transporte: TrayectoTransporte[];
};

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE LA BODA — editar aquí todos los datos
// ─────────────────────────────────────────────────────────────
export const weddingConfig: WeddingConfig = {
  weddingId: "boda-001", // En producción, vendrá de Supabase
  slug: "pilar-y-david",

  novio: {
    nombre: "David",
    nombreCompleto: "David",   // ← actualiza con tu apellido
  },
  novia: {
    nombre: "Pilar",
    nombreCompleto: "Pilar",   // ← actualiza con tu apellido
  },

  iniciales: {
    novio: "D",
    novia: "P",
  },

  fecha: "2027-03-06",
  fechaFormateada: "6 de marzo de 2027",
  hora: "12:00",

  textos: {
    bienvenida:
      "Con mucha alegría os invitamos a compartir con nosotros el día más especial de nuestras vidas.",
    historia:
      "Nuestra historia comenzó hace años, en un momento inesperado que cambió todo. Desde entonces, cada día ha sido una aventura compartida. Ahora queremos que seáis parte de nuestro próximo capítulo.",
    dressCode: "Elegante y romántico",
    dressCodeDetalle:
      "Os pedimos que vengáis vestidos con elegancia. Colores claros y pasteles para las señoras, traje oscuro para los caballeros. Evitad el blanco, reservado para la novia.",
    confirmacionLimite: "1 de enero de 2027",
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
  },

  localizaciones: [
    {
      id: "ceremonia",
      nombre: "Ceremonia Civil",
      descripcion: "La unión de nuestras vidas ante vosotros",
      direccion: "Por confirmar",
      coordenadas: { lat: 40.4168, lng: -3.7038 },
      hora: "12:00",
      icono: "rings",
      enlaceMaps: "",
    },
    {
      id: "banquete",
      nombre: "Banquete",
      descripcion: "Celebración, comida y baile hasta la madrugada",
      direccion: "Por confirmar",
      coordenadas: { lat: 40.4168, lng: -3.7038 },
      hora: "14:00",
      icono: "champagne",
      enlaceMaps: "",
    },
  ],

  timeline: [
    { id: "1", hora: "12:00", titulo: "Ceremonia", descripcion: "Celebración de la unión", icono: "rings" },
    { id: "2", hora: "13:00", titulo: "Cóctel", descripcion: "Bienvenida con aperitivos y bebidas", icono: "cocktail" },
    { id: "3", hora: "14:30", titulo: "Banquete", descripcion: "Almuerzo y celebración", icono: "fork" },
    { id: "4", hora: "17:00", titulo: "Tarta nupcial", descripcion: "El momento más dulce", icono: "cake" },
    { id: "5", hora: "18:00", titulo: "Baile y fiesta", descripcion: "La pista os espera", icono: "music" },
  ],

  transporte: [
    {
      id: "ida-madrid",
      origen: "Madrid Centro",
      destino: "Lugar de Ceremonia",
      hora: "11:00",
      descripcion: "Salida desde Plaza de España, Madrid",
      plazasDisponibles: 50,
    },
    {
      id: "vuelta-madrid",
      origen: "Lugar del Banquete",
      destino: "Madrid Centro",
      hora: "01:00",
      descripcion: "Regreso aproximado a Madrid",
      plazasDisponibles: 50,
    },
  ],
};
