import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * PHARMAFLOW — SUPABASE ADMIN CLIENT
 * ============================================================
 *
 * Ce fichier est STRICTEMENT SERVEUR.
 *
 * Il utilise :
 *   SUPABASE_SECRET_KEY
 *
 * Cette clé permet aux routes serveur PharmaFlow
 * d'effectuer les opérations administratives nécessaires.
 *
 * IMPORTANT :
 * - Ne jamais importer ce fichier dans un composant client.
 * - Ne jamais utiliser SUPABASE_SECRET_KEY dans NEXT_PUBLIC_*.
 * - Ne jamais envoyer cette clé au navigateur.
 * ============================================================
 */

/**
 * ============================================================
 * RÉCUPÉRATION DES VARIABLES D'ENVIRONNEMENT
 * ============================================================
 */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

/**
 * ============================================================
 * VALIDATION DE LA CONFIGURATION
 * ============================================================
 */

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL est manquante dans .env.local.",
  );
}

if (!supabaseSecretKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY est manquante dans .env.local.",
  );
}

/**
 * ============================================================
 * VALEURS VALIDÉES
 * ============================================================
 *
 * Ces constantes permettent à TypeScript de savoir
 * explicitement qu'il s'agit bien de chaînes de caractères.
 *
 * Cela évite l'erreur :
 *
 * string | undefined
 *       ↓
 * string
 * ============================================================
 */

const validatedSupabaseUrl: string =
  supabaseUrl;

const validatedSupabaseSecretKey: string =
  supabaseSecretKey;

/**
 * ============================================================
 * CRÉATION DU CLIENT ADMIN
 * ============================================================
 *
 * Fonction conservée pour assurer la compatibilité
 * avec les anciennes et nouvelles routes PharmaFlow.
 */
export function createAdminClient() {
  return createClient(
    validatedSupabaseUrl,
    validatedSupabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },

      global: {
        headers: {
          "x-application-name":
            "pharmaflow",
        },
      },
    },
  );
}

/**
 * ============================================================
 * CLIENT ADMIN PARTAGÉ
 * ============================================================
 *
 * Utilisation dans les routes serveur :
 *
 * import {
 *   supabaseAdmin,
 * } from "@/app/lib/supabase/admin";
 *
 * Exemple :
 *
 * const { data, error } =
 *   await supabaseAdmin
 *     .from("support_tickets")
 *     .select("*");
 *
 * ============================================================
 */
export const supabaseAdmin =
  createAdminClient();