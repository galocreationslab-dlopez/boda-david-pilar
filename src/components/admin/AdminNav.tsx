"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Datos Boda", segment: "datos" },
  { label: "Invitaciones",  segment: "invitaciones" },
  { label: "Diseño", segment: "configuracion" },
];

export default function AdminNav({ inviteCode }: { inviteCode: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Panel admin</p>
          <p className="text-sm text-stone-500">Pilar &amp; David · 6 de marzo de 2027</p>
        </div>

        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ label, segment }) => {
            const href = `/admin/${inviteCode}/${segment}`;
            const active = pathname.includes(segment);
            return (
              <Link
                key={segment}
                href={href}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
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
