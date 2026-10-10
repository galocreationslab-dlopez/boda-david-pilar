"use client";

import { Fragment, type ReactNode } from "react";
import { useDeviceViewport } from "@/components/motion/useDeviceViewport";

export default function DeviceContent({ pc, movil }: { pc: ReactNode; movil: ReactNode }) {
  const device = useDeviceViewport();
  if (!device) return null;
  return <Fragment key={device}>{device === "desktop" ? pc : movil}</Fragment>;
}
