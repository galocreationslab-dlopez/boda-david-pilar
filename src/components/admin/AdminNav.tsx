"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Datos Boda", segment: "datos" },
  { label: "Invitaciones",  segment: "invitaciones" },
  { label: "Diseño", segment: "configuracion" },
  { label: "Contenido", segment: "contenido" },
];

export default function AdminNav({ inviteCode }: { inviteCode: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4 md:flex-nowrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Panel admin</p>
          <p className="text-sm text-stone-500">Pilar &amp; David · 6 de marzo de 2027</p>
        </div>

        <nav className="order-last -mx-4 flex w-full gap-1 overflow-x-auto px-4 md:order-none md:mx-0 md:w-auto md:overflow-visible md:px-0">
          {NAV_ITEMS.map(({ label, segment }) => {
            const href = `/admin/${inviteCode}/${segment}`;
            const active = pathname.includes(segment);
            return (
              <Link
                key={segment}
                href={href}
                className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors sm:px-4 ${
                  active
                    ? "bg-amber-700 text-white font-medium"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={`/?inviteCode=${encodeURIComponent(inviteCode)}`}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Volver a la web
        </Link>
      </div>
    </header>
  );
}
