/**
 * Regla única para derivar el estado de una invitación a partir de sus asistentes:
 * confirmada si alguno asiste, rechazada si ninguno asiste pero alguno rechazó, si no pendiente.
 */
export function computeInvitacionEstado(estadosAsistencia: string[]): "confirmada" | "rechazada" | "pendiente" {
  if (estadosAsistencia.some((estado) => estado === "si")) return "confirmada";
  if (estadosAsistencia.some((estado) => estado === "no")) return "rechazada";
  return "pendiente";
}
