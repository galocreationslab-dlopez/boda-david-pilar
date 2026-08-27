"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useIntroContext } from "@/contexts/IntroContext";

type PostIntroSectionsGateProps = {
  children: ReactNode;
};

export default function PostIntroSectionsGate({ children }: PostIntroSectionsGateProps) {
  const { introActive } = useIntroContext();
  const [unlocked, setUnlocked] = useState(false);

  // Si intro está activo, no mostrar resto de secciones hasta interacción
  useEffect(() => {
    const unlock = () => {
      setUnlocked(true);
    };

    const onWheel = () => unlock();
    const onTouchMove = () => unlock();
    const onCustomUnlock = () => unlock();
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "ArrowDown" || key === "PageDown" || key === " " || key === "End") {
        unlock();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("intro:unlock-sections", onCustomUnlock as EventListener);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("intro:unlock-sections", onCustomUnlock as EventListener);
    };
  }, []);

  if (!introActive) {
    return <>{children}</>;
  }

  return <>{children}</>;
}


