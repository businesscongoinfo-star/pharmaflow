import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * PHARMAFLOW — SUPABASE ADMIN CLIENT
 * ============================================================
 *
 * Client Supabase réservé au serveur.
 *
 * Utilise :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *
 * IMPORTANT :
 * - Ne jamais importer ce fichier dans un composant client.
 * - Ne jamais exposer SUPABASE_SECRET_KEY.
 * - Ne jamais utiliser SUPABASE_SECRET_KEY dans NEXT_PUBLIC_*.
 * ============================================================
 */

/**
 * ============================================================
 * RÉCUPÉRATION DE LA CONFIGURATION
 * ============================================================
 */

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "PHARMAFLOW_CONFIG_ERROR: NEXT_PUBLIC_SUPABASE_URL est manquante.",
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "PHARMAFLOW_CONFIG_ERROR: SUPABASE_SECRET_KEY est manquante.",
    );
  }

  return {
    supabaseUrl,
    supabaseSecretKey,
  };
}

/**
 * ============================================================
 * CRÉATION DU CLIENT ADMIN
 * ============================================================
 *
 * Cette fonction est appelée uniquement côté serveur.
 *
 * Exemple :
 *
 * const supabaseAdmin = createAdminClient();
 *
 * const { data, error } =
 *   await supabaseAdmin.auth.admin.createUser(...);
 *
 * ============================================================
 */

export function createAdminClient() {
  const {
    supabaseUrl,
    supabaseSecretKey,
  } = getSupabaseConfig();

  return createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },

      global: {
        headers: {
          "x-application-name": "pharmaflow",
        },
      },
    },
  );
}