"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDeviceViewport, type DeviceViewport } from "@/components/motion/useDeviceViewport";
import { loadImageGroups, loadOriginalImage, type ImageLoadingGroup } from "@/lib/image-loading";

type LoadingContext = {
  ready: boolean;
  loaded: Set<string>;
  planned: Set<string>;
  markIntroReady: () => void;
};
const Context = createContext<LoadingContext | null>(null);
export const useImageLoading = () => useContext(Context);

export default function ImageLoadingProvider({ pc, movil, waitForIntro, children }: {
  pc: ImageLoadingGroup[];
  movil: ImageLoadingGroup[];
  waitForIntro: boolean;
  children: ReactNode;
}) {
  const device = useDeviceViewport();
  const [introReady, setIntroReady] = useState<DeviceViewport | null>(null);
  const ready = !waitForIntro || (device !== null && introReady === device);
  const markIntroReady = useCallback(() => setIntroReady(device), [device]);
  const groups = device === "desktop" ? pc : movil;
  const key = JSON.stringify(groups);
  const [result, setResult] = useState<{ key: string; loaded: Set<string>; failed: Set<string>; group: string }>();
  const [attempt, setAttempt] = useState(0);
  const planned = useMemo(() => new Set(groups.flatMap((group) => group.sources)), [groups]);

  useEffect(() => {
    if (!device || !ready) return;
    const controller = new AbortController();
    const update = (fn: (state: NonNullable<typeof result>) => NonNullable<typeof result>) =>
      setResult((previous) => fn(previous?.key === key ? previous : { key, loaded: new Set(), failed: new Set(), group: "" }));
    void loadImageGroups(JSON.parse(key) as ImageLoadingGroup[], controller.signal, loadOriginalImage,
      (src) => update((state) => ({ ...state, loaded: new Set([...state.loaded, src]) })),
      (src, error) => {
        console.error("[Media] Error de precarga", src, error);
        update((state) => ({ ...state, failed: new Set([...state.failed, src]) }));
      },
      (group) => update((state) => ({ ...state, group })),
    ).catch((error: unknown) => {
      if (!controller.signal.aborted) console.error("[Media] Error de la secuencia de precarga", error);
    });
    return () => controller.abort();
  }, [device, ready, key, attempt]);

  const current = result?.key === key ? result : undefined;
  const loaded = current?.loaded ?? new Set<string>();
  return (
    <Context.Provider value={{ ready, loaded, planned, markIntroReady }}>
      <div data-image-loading-group={ready ? current?.group ?? "pending" : "intro"}>
        {children}
      </div>
      {current?.failed.size ? (
        <div role="status" className="fixed bottom-4 left-4 z-[110] max-w-sm rounded bg-white p-3 text-sm text-black shadow">
          Algunas imagenes no se han podido cargar.
          <button className="ml-2 underline" onClick={() => { setResult(undefined); setAttempt((value) => value + 1); }}>Reintentar</button>
        </div>
      ) : null}
    </Context.Provider>
  );
}
