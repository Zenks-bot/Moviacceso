import type { AccessibilityStatus, GraphEdge } from '../../types/domain';
import { isSimulated } from '../../types/domain';

export const ROUTE_PROFILES = ['general', 'movilidad_reducida', 'estricto'] as const;
export type RouteProfile = (typeof ROUTE_PROFILES)[number];

export interface RouteOptions {
  profile: RouteProfile;
  /**
   * Si es falso, los datos simulados NO cuentan como evidencia: su estado se trata
   * como "informacion_insuficiente". Si es verdadero, se usan para ilustrar el algoritmo
   * y el resultado se etiqueta como demostrativo.
   */
  includeDemoData: boolean;
}

/**
 * Estado de accesibilidad que el motor considera para un segmento.
 * Regla: un dato simulado nunca es evidencia real.
 */
export function effectiveStatus(edge: GraphEdge, includeDemoData: boolean): AccessibilityStatus {
  if (isSimulated(edge.sourceType) && !includeDemoData) return 'informacion_insuficiente';
  return edge.accessibilityStatus;
}

/** Multiplicadores de costo del perfil "movilidad reducida". Documentados en docs/architecture.md. */
export const REDUCED_MOBILITY_FACTORS: Record<AccessibilityStatus, number | null> = {
  accesible_verificado: 1,
  informacion_insuficiente: 1.5,
  comunitario_pendiente: 2.5,
  barrera_verificada: null, // excluido
};

/**
 * Costo de recorrer un segmento con un perfil dado, o null si el segmento queda excluido.
 */
export function edgeCost(edge: GraphEdge, options: RouteOptions): number | null {
  const status = effectiveStatus(edge, options.includeDemoData);
  switch (options.profile) {
    case 'general':
      return edge.lengthM;
    case 'movilidad_reducida': {
      const factor = REDUCED_MOBILITY_FACTORS[status];
      return factor === null ? null : edge.lengthM * factor;
    }
    case 'estricto':
      return status === 'accesible_verificado' ? edge.lengthM : null;
  }
}
