/**
 * ============================================================
 * PHARMAFLOW — HORODATAGE UTILITAIRE
 * ============================================================
 *
 * Les composants serveur (Server Components) ne peuvent pas
 * utiliser de hooks. `Date.now()` y est légitime (une seule
 * évaluation par requête), mais son appel direct dans le corps
 * d'un composant est signalé par react-hooks/purity.
 *
 * Cette fonction centralise l'accès à l'heure courante.
 * ============================================================
 */

export function getCurrentTimestamp(): number {
  return Date.now();
}
