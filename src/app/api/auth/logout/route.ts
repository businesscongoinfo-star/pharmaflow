import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ============================================================
 * POST /api/auth/logout
 * ============================================================
 *
 * Déconnexion serveur.
 *
 * La page /abonnement appelait déjà cette route, mais elle
 * n'existait pas : la déconnexion échouait silencieusement
 * (404) et la session restait active.
 * ============================================================
 */

export async function POST() {
  try {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "PHARMAFLOW LOGOUT:",
        error.message,
      );
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "PHARMAFLOW LOGOUT ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "La déconnexion a échoué. Veuillez réessayer.",
      },
      {
        status: 500,
      },
    );
  }
}
