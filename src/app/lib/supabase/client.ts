"use client";

import { createBrowserClient } from "@supabase/ssr";

let browserClient:
  ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  /*
   * Nouvelle clé Supabase recommandée.
   */
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  /*
   * Compatibilité avec les anciens projets Supabase
   * utilisant encore la clé anon.
   */
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const supabaseKey =
    publishableKey || anonKey;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL est manquant."
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "Aucune clé publique Supabase n'est configurée. " +
      "Ajoutez NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  browserClient =
    createBrowserClient(
      supabaseUrl,
      supabaseKey,
    );

  return browserClient;
}