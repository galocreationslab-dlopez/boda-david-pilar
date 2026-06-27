/**
 * components/wedding/SeccionTimeline.tsx
 * Timeline horizontal con camino curvo punteado.
 * 3 puntos: Bus, Ceremonia, Celebración — con mini-mapa en el primero
 * e imagen + enlace en los otros dos.
 */

import { OrnamentoDivisor } from "@/components/ui/OrnamentoDivisor";
import type { Localizacion } from "@/config/wedding.config";

type Props = {
  localizaciones: Localizacion[];
  timeline: Array<{ id: string; hora: string; titulo: string; descripcion: string; icono: string }>;
};

// Los 3 puntos fijos del timeline visible en la portada
const PUNTOS = [
  {
    id: "bus",
    hora: "11:30",
    titulo: "Salida del autobús",
    subtitulo: "Punto de recogida",
    icono: "bus",
    mapaSrc: "https://maps.google.com/maps?q=Granada+Capital&output=embed",
    mapaLink: "https://maps.google.com/?q=Granada+Capital",
    mapaTexto: "Ver punto de recogida",
    descripcion: "Granada capital — lugar exacto por confirmar",
    imagen: null,
  },
  {
    id: "ceremonia",
    hora: "12:00",
    titulo: "Ceremonia nupcial",
    subtitulo: "Iglesia de Beas de Granada",
    icono: "rings",
    mapaSrc: null,
    mapaLink: "https://maps.google.com/?q=Iglesia+Beas+de+Granada",
    mapaTexto: "Cómo llegar",
    descripcion: "Iglesia de Beas de Granada",
    imagen: null, // pondrás: "iglesia-beas.jpg"
  },
  {
    id: "celebracion",
    hora: "14:30",
    titulo: "Cóctel y celebración",
    subtitulo: "Finca Torre del Rey",
    icono: "finca",
    mapaSrc: null,
    mapaLink: "https://maps.google.com/?q=Finca+Torre+del+Rey+Granada",
    mapaTexto: "Cómo llegar",
    descripcion: "Finca Torre del Rey, Granada",
    imagen: null, // pondrás: "finca-torre-del-rey.jpg"
  },
];

function IconoBus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="13" rx="2"/>
      <path d="M2 10 L22 10"/><path d="M7 18 L7 20"/><path d="M17 18 L17 20"/>
      <circle cx="7" cy="14" r="1" fill="currentColor"/><circle cx="17" cy="14" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconoRings() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/>
    </svg>
  );
}
function IconoFinca() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22 L3 8 L12 3 L21 8 L21 22"/><rect x="8" y="14" width="8" height="8"/><rect x="10" y="10" width="4" height="4"/>
    </svg>
  );
}
const ICONOS: Record<string, React.ReactNode> = {
  bus: <IconoBus />, rings: <IconoRings />, finca: <IconoFinca />,
};

export function SeccionTimeline({ localizaciones, timeline }: Props) {
  return (
    <div className="section-wedding" style={{ backgroundColor: "var(--cream-dark)" }}>
      <div className="container-wedding">
        {/* Cabecera */}
        <div className="text-center mb-14">
          <p className="section-subtitle">el gran día</p>
          <h2 className="section-title">6 de marzo de 2027</h2>
          <OrnamentoDivisor />
        </div>

        {/* ── Timeline horizontal ── */}
        <div className="relative w-full overflow-x-auto pb-4">
          <div className="min-w-[700px] relative">

            {/* Camino curvo punteado SVG entre los puntos */}
            <svg
              viewBox="0 0 900 80"
              className="absolute top-[52px] left-0 right-0 w-full"
              style={{ height: "80px", zIndex: 0 }}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M 120 40 C 200 10, 280 70, 380 40 C 480 10, 580 70, 680 40 C 730 25, 760 40, 780 40"
                fill="none"
                stroke="var(--bronze-pale)"
                strokeWidth="2"
                strokeDasharray="6 5"
                strokeLinecap="round"
              />
            </svg>

            {/* Los 3 puntos */}
            <div className="relative z-10 grid grid-cols-3 gap-4">
              {PUNTOS.map((punto) => (
                <div key={punto.id} className="flex flex-col items-center gap-4">

                  {/* Nodo circular con icono */}
                  <div
                    className="w-[104px] h-[104px] rounded-full flex flex-col items-center justify-center gap-1 flex-shrink-0"
                    style={{
                      backgroundColor: "var(--brown-dark)",
                      color: "var(--bronze-light)",
                      boxShadow: "0 0 0 4px var(--cream-dark), 0 0 0 6px var(--bronze-pale)",
                    }}
                  >
                    {ICONOS[punto.icono]}
                    <span
                      className="font-display font-light"
                      style={{ fontSize: "1.15rem", color: "var(--white)", lineHeight: 1 }}
                    >
                      {punto.hora}
                    </span>
                  </div>

                  {/* Tarjeta de contenido */}
                  <div
                    className="w-full"
                    style={{
                      backgroundColor: "var(--white)",
                      border: "1px solid var(--cream-dark)",
                      borderTop: "3px solid var(--bronze)",
                      padding: "1.25rem",
                    }}
                  >
                    <p
                      className="font-display text-xl font-light mb-1"
                      style={{ color: "var(--brown-dark)" }}
                    >
                      {punto.titulo}
                    </p>
                    <p
                      className="text-sm font-light mb-3"
                      style={{ color: "var(--olive-muted)" }}
                    >
                      {punto.subtitulo}
                    </p>

                    {/* Mini mapa embed para el bus */}
                    {punto.mapaSrc && (
                      <div className="mb-3 overflow-hidden" style={{ height: "120px" }}>
                        <iframe
                          src={punto.mapaSrc}
                          width="100%"
                          height="120"
                          style={{ border: 0 }}
                          allowFullScreen={false}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Punto de recogida"
                        />
                      </div>
                    )}

                    {/* Imagen para iglesia/finca */}
                    {punto.imagen && (
                      <div
                        className="mb-3 overflow-hidden"
                        style={{ height: "100px", backgroundColor: "var(--cream)" }}
                      >
                        {/* <Image src={`/images/${punto.imagen}`} alt={punto.titulo} fill className="object-cover" /> */}
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ color: "var(--bronze-pale)" }}
                        >
                          <span className="text-xs" style={{ fontFamily: "var(--font-body)" }}>
                            Añade imagen en SeccionTimeline.tsx
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Enlace al mapa */}
                    <a
                      href={punto.mapaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary !py-1.5 !px-3 !text-xs w-full justify-center"
                    >
                      {punto.mapaTexto}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
