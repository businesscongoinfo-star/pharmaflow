import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase PRIVILÉGIÉ.
 *
 * IMPORTANT :
 * - Ce fichier ne doit être utilisé que côté serveur.
 * - SUPABASE_SECRET_KEY ne doit JAMAIS être exposée au navigateur.
 * - Il permet au Super Admin d'effectuer les opérations globales
 *   qui ne doivent pas dépendre des RLS d'une pharmacie.
 */

export function createSuperAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Configuration Supabase serveur incomplète. " +
        "Vérifiez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY.",
    );
  }

  return createSupabaseClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}