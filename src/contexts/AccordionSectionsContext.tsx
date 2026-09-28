"use client";
/**
 * contexts/AccordionSectionsContext.tsx
 * Coordina que solo una sección colapsable permanezca abierta a la vez.
 * Usado por SeccionColapsable cuando está disponible; si no hay proveedor
 * (p. ej. previews de admin), cada sección mantiene su propio estado local.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

type AccordionSectionsContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const AccordionSectionsContext = createContext<AccordionSectionsContextValue | null>(null);

export function AccordionSectionsProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <AccordionSectionsContext.Provider value={{ openId, setOpenId }}>
      {children}
    </AccordionSectionsContext.Provider>
  );
}

export function useAccordionSectionsContext() {
  return useContext(AccordionSectionsContext);
}
