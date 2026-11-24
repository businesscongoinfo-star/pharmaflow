/**
 * ============================================================
 * PHARMAFLOW — TARIFS OFFICIELS (SOURCE UNIQUE)
 * ============================================================
 *
 * Ce fichier est utilisé par :
 *
 * - la page publique (src/app/page.tsx) ;
 * - les données structurées du layout (src/app/layout.tsx).
 *
 * Les libellés sont écrits en dur (et non formatés par Intl) afin
 * d'être strictement identiques côté serveur et côté navigateur,
 * ce qui évite toute divergence d'hydratation.
 * ============================================================
 */

export const PHARMAFLOW_PRICING = {
  currency: "XAF",

  monthly: 8500,
  yearly: 85000,

  trialDays: 7,

  labels: {
    fr: {
      monthly: "8 500",
      yearly: "85 000",
    },
    en: {
      monthly: "8,500",
      yearly: "85,000",
    },
  },
} as const;
