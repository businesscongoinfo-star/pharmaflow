"use client";

import { useEffect, useState } from "react";

/**
 * ============================================================
 * PHARMAFLOW — HORLOGE DE RENDU (CLIENT)
 * ============================================================
 *
 * `Date.now()` appelé directement dans le corps d'un composant
 * est impur : il peut produire un rendu différent du HTML
 * serveur (erreur de la règle react-hooks/purity).
 *
 * Ce hook expose l'heure courante de façon sûre :
 *
 * - valeur initialisée une seule fois (initialiseur paresseux) ;
 * - rafraîchissement périodique dans un effet.
 *
 * Utilisation :
 *
 *   const now = useNow();               // rafraîchi chaque minute
 *   const now = useNow(1000);           // chaque seconde
 * ============================================================
 */

const DEFAULT_INTERVAL_MS = 60_000;

export function useNow(
  intervalMs: number = DEFAULT_INTERVAL_MS,
): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}
