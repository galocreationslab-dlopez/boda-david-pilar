"use client";

import { useId, useRef, useState } from "react";
import { MapBack } from "@/components/media/ImageMapFlip";
import { getGoogleMapsEmbedUrl, getGoogleMapsLinkUrl } from "@/lib/portada-libre";

type MapsValues = { enlaceMaps?: string; enlaceMapsEmbed?: string };

export default function MapsFields({ value, onChange, label }: {
  value: MapsValues;
  onChange: (patch: MapsValues) => void;
  label: string;
}) {
  const id = useId();
  const [preview, setPreview] = useState(false);
  const previewRef = useRef<HTMLButtonElement>(null);
  const link = getGoogleMapsLinkUrl(value.enlaceMaps);
  const embed = getGoogleMapsEmbedUrl(value.enlaceMapsEmbed || value.enlaceMaps);
  const invalidLink = Boolean(value.enlaceMaps?.trim() && !link);
  const invalidEmbed = Boolean(value.enlaceMapsEmbed?.trim() && !getGoogleMapsEmbedUrl(value.enlaceMapsEmbed));
  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-link`} className="label-field">Enlace de Google Maps (navegación)</label>
      <input
        id={`${id}-link`} type="url" className="input-field"
        value={value.enlaceMaps ?? ""} placeholder="https://maps.app.goo.gl/…"
        aria-invalid={invalidLink} aria-describedby={`${id}-help`}
        onChange={(event) => { setPreview(false); onChange({ enlaceMaps: event.target.value }); }}
        onBlur={() => { if (link) onChange({ enlaceMaps: link }); }}
      />
      <label htmlFor={`${id}-embed`} className="label-field">URL embebible opcional (no pegar HTML)</label>
      <input
        id={`${id}-embed`} type="url" className="input-field"
        value={value.enlaceMapsEmbed ?? ""} placeholder="https://www.google.com/maps/embed?pb=…"
        aria-invalid={invalidEmbed} aria-describedby={`${id}-help`}
        onChange={(event) => { setPreview(false); onChange({ enlaceMapsEmbed: event.target.value }); }}
        onBlur={() => {
          const normalized = getGoogleMapsEmbedUrl(value.enlaceMapsEmbed);
          if (normalized) onChange({ enlaceMapsEmbed: normalized });
        }}
      />
      <p id={`${id}-help`} className="text-xs text-stone-500">
        Admite lugar, búsqueda, destino de ruta, q/query, inserción pb y enlaces cortos de Maps.
        Los enlaces cortos necesitan una URL embebible para mostrar el mapa; sin ella se conserva Cómo llegar.
        La URL embebible debe corresponder a la misma ubicación.
      </p>
      {(invalidLink || invalidEmbed) && <p role="alert" className="text-xs text-red-600">{invalidLink ? "Enlace de Google Maps no válido." : "La URL no permite insertar un mapa. No se admite HTML."}</p>}
      {link && !embed && !invalidEmbed && <p role="status" className="text-xs text-amber-700">Solo navegación: no se puede obtener un mapa embebible de este enlace.</p>}
      <div className="flex gap-3">
        <button type="button" className="text-xs underline" onClick={() => { setPreview(false); onChange({ enlaceMaps: "", enlaceMapsEmbed: "" }); }}>Quitar Maps</button>
        <button ref={previewRef} type="button" className="text-xs underline disabled:opacity-40" disabled={!link || invalidEmbed} onClick={() => setPreview(!preview)}>Previsualizar mapa</button>
      </div>
      {preview && link && <div style={{ height: 280 }}><MapBack key={`${link}:${value.enlaceMapsEmbed}`} link={link} embed={value.enlaceMapsEmbed} label={label} onClose={() => {
        setPreview(false);
        previewRef.current?.focus();
      }} /></div>}
    </div>
  );
}
