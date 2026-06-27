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
  lado: "izquierda" | "derecha";
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

export type EventoTimeline = {
  id: string;
  hora: string;
  titulo: string;
  descripcion: string;
  icono: "rings" | "cocktail" | "fork" | "cake" | "music" | "car";
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
  weddingId: string;
  slug: string;

  novio: { nombre: string; nombreCompleto: string };
  novia: { nombre: string; nombreCompleto: string };

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

  historia: EventoHistoria[];
  localizaciones: Localizacion[];
  timeline: EventoTimeline[];
  transporte: TrayectoTransporte[];
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
    bienvenida:
      "Con mucha alegría os invitamos a compartir con nosotros el día más especial de nuestras vidas.",
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
};
