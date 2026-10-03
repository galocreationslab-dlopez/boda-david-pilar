import ContenidoView from "@/components/admin/ContenidoView";
import { SeccionCarrusel } from "@/components/wedding/SeccionCarrusel";
import { weddingConfig, type ItemSeccionDiseno } from "@/config/wedding.config";
import type { CSSProperties } from "react";

const photos: ItemSeccionDiseno[] = [
  { id: "foto-1", titulo: "Alhambra", descripcion: "", imagen: "/images/Alhambra.jpg" },
  { id: "foto-2", titulo: "Catedral", descripcion: "", imagen: "/images/Catedral.jpg" },
  { id: "foto-3", titulo: "Sello", descripcion: "", imagen: "/images/Sello.svg" },
];

export default function CarruselTestPage() {
  return (
    <main className="py-8">
      <section id="demo-carrusel"><SeccionCarrusel items={photos} /></section>
      <section id="demo-tratamiento" style={{ "--content-texture-image": 'url("/images/Sello.svg")', "--content-texture-size": "80px" } as CSSProperties}>
        <SeccionCarrusel items={photos} imageTreatments={{ "carrusel:foto-1": { opacidadOverlay: 45, difuminadoBordePx: 35 } }} />
      </section>
      <section id="demo-vacio"><SeccionCarrusel items={[]} /></section>
      <section id="demo-unica"><SeccionCarrusel items={photos.slice(0, 1)} /></section>
      <section id="demo-error"><SeccionCarrusel items={[{ id: "error", titulo: "Foto no disponible", descripcion: "", imagen: "/images/no-existe-carrusel.jpg" }]} /></section>
      <section id="demo-editor" className="mx-auto max-w-6xl px-4">
        <ContenidoView inviteCode="CARRUSEL-TEST" config={{
          ...weddingConfig,
          diseno: { ...weddingConfig.diseno, secciones: [{
            id: "carrusel-test", nombre: "Carrusel de prueba", titulo: "Fotos", tipo: "carrusel",
            paletaId: weddingConfig.tema.paletaActivaId ?? "", visible: true, perfiles: ["publico"], items: photos,
          }] },
        }} />
      </section>
    </main>
  );
}