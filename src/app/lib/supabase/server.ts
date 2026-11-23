import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * ============================================================
 * PHARMAFLOW — CLIENT SUPABASE SERVEUR (SSR)
 * ============================================================
 *
 * Clé publique utilisée :
 *
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (recommandée)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY (rétro-compatibilité)
 *
 * La clé secrète n'est JAMAIS utilisée ici.
 * ============================================================
 */

function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url) {
    throw new Error(
      "PHARMAFLOW_CONFIG_ERROR: NEXT_PUBLIC_SUPABASE_URL est manquante.",
    );
  }

  return url;
}

function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!key) {
    throw new Error(
      "PHARMAFLOW_CONFIG_ERROR: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est manquante.",
    );
  }

  return key;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(name, value, options);
              },
            );
          } catch {
            /*
             * Les Server Components peuvent parfois ne pas
             * pouvoir modifier les cookies. Les cookies sont
             * alors rafraîchis par le Proxy.
             */
          }
        },
      },
    },
  );
}
