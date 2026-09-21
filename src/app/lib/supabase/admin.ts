import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * PHARMAFLOW — SUPABASE ADMIN CLIENT
 * ============================================================
 *
 * Client Supabase strictement réservé au serveur.
 *
 * Variables nécessaires :
 *
 * NEXT_PUBLIC_SUPABASE_URL
 * SUPABASE_SECRET_KEY
 *
 * IMPORTANT :
 *
 * - Ne jamais importer ce fichier dans un composant client.
 * - Ne jamais exposer SUPABASE_SECRET_KEY.
 * - Ne jamais utiliser SUPABASE_SECRET_KEY dans NEXT_PUBLIC_*.
 * ============================================================
 */

/**
 * ============================================================
 * CONFIGURATION SUPABASE
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

/**
 * ============================================================
 * CLIENT ADMIN PARTAGÉ
 * ============================================================
 *
 * IMPORTANT :
 *
 * Cette exportation est conservée parce que plusieurs anciennes
 * et nouvelles routes PharmaFlow utilisent directement :
 *
 * import { supabaseAdmin } from "@/app/lib/supabase/admin";
 *
 * Cela permet de conserver la compatibilité avec :
 *
 * - API support
 * - API tickets
 * - API paiements
 * - Webhooks
 * - Vérification des paiements
 * - Administration
 * ============================================================
 */

export const supabaseAdmin =
  createAdminClient();