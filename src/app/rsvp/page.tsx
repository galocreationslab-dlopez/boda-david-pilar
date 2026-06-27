import { weddingConfig } from "@/config/wedding.config";
import { RsvpForm } from "@/components/wedding/RsvpForm";
import { NavegacionPublica } from "@/components/layout/NavegacionPublica";
import { PieDePagina } from "@/components/layout/PieDePagina";

export default function RsvpPage() {
  return (
    <>
      <NavegacionPublica config={weddingConfig} />
      <main className="pt-24">
        <RsvpForm config={weddingConfig} />
      </main>
      <PieDePagina config={weddingConfig} />
    </>
  );
}
