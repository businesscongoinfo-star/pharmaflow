import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlatformAccess =
  | {
      type: "super_admin";
      active: true;
      full_name: string | null;
      redirect: "/super-admin";
    }
  | {
      type: "agent";
      active: true;
      full_name: string;
      department:
        | "support"
        | "finance"
        | "technical"
        | string;
      redirect: "/agent";
    }
  | {
      type: "none";
      active: false;
    };

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "La configuration serveur Supabase est incomplète.",
    );
  }

  return createSupabaseAdmin(
    url,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function GET() {
  try {
    /*
     * ==========================================================
     * 1. CLIENT SUPABASE DE LA SESSION
     * ==========================================================
     *
     * Ce client récupère l'utilisateur actuellement connecté.
     *
     * IMPORTANT :
     *
     * Nous ne faisons jamais confiance à un user_id envoyé
     * depuis le navigateur.
     */
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json<PlatformAccess>(
        {
          type: "none",
          active: false,
        },
        {
          status: 401,
        },
      );
    }

    /*
     * ==========================================================
     * 2. CLIENT ADMIN SUPABASE
     * ==========================================================
     *
     * Le service role est utilisé UNIQUEMENT côté serveur.
     *
     * Il n'est jamais exposé au navigateur.
     */
    const adminClient =
      getSupabaseAdmin();

    /*
     * ==========================================================
     * 3. SUPER ADMIN
     * ==========================================================
     *
     * Priorité absolue au compte Super Admin.
     *
     * Un Super Admin n'a pas besoin :
     *
     * - d'un pharmacy_id
     * - d'un profil pharmacie
     * - d'un abonnement pharmacie
     *
     * Il appartient à la plateforme PharmaFlow.
     */
    const {
      data: superAdmin,
      error: superAdminError,
    } =
      await adminClient
        .from("platform_admins")
        .select(
          `
            id,
            user_id,
            role,
            full_name,
            is_active
          `,
        )
        .eq(
          "user_id",
          user.id,
        )
        .eq(
          "role",
          "super_admin",
        )
        .eq(
          "is_active",
          true,
        )
        .maybeSingle();

    if (superAdminError) {
      console.error(
        "PLATFORM ACCESS - SUPER ADMIN:",
        superAdminError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de vérifier les droits plateforme.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Si l'utilisateur est Super Admin,
     * nous arrêtons immédiatement la vérification.
     */
    if (superAdmin) {
      return NextResponse.json<PlatformAccess>(
        {
          type: "super_admin",
          active: true,
          full_name:
            superAdmin.full_name ??
            null,
          redirect:
            "/super-admin",
        },
        {
          status: 200,
        },
      );
    }

    /*
     * ==========================================================
     * 4. AGENT PLATEFORME
     * ==========================================================
     *
     * Si l'utilisateur n'est pas Super Admin,
     * nous vérifions s'il est un agent PharmaFlow.
     */
    const {
      data: agent,
      error: agentError,
    } =
      await adminClient
        .from("platform_agents")
        .select(
          `
            id,
            user_id,
            full_name,
            department,
            is_active
          `,
        )
        .eq(
          "user_id",
          user.id,
        )
        .eq(
          "is_active",
          true,
        )
        .maybeSingle();

    if (agentError) {
      console.error(
        "PLATFORM ACCESS - AGENT:",
        agentError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de vérifier le compte agent.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Agent actif trouvé.
     */
    if (agent) {
      return NextResponse.json<PlatformAccess>(
        {
          type: "agent",
          active: true,
          full_name:
            agent.full_name,
          department:
            agent.department,
          redirect:
            "/agent",
        },
        {
          status: 200,
        },
      );
    }

    /*
     * ==========================================================
     * 5. UTILISATEUR PHARMACIE
     * ==========================================================
     *
     * Aucun accès plateforme.
     *
     * Le login.tsx poursuivra alors normalement vers :
     *
     * profiles
     *      ↓
     * pharmacies
     *      ↓
     * abonnement
     *      ↓
     * rôle
     *      ↓
     * espace utilisateur
     */
    return NextResponse.json<PlatformAccess>(
      {
        type: "none",
        active: false,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "PLATFORM ACCESS ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Erreur interne lors de la vérification de l'accès plateforme.",
      },
      {
        status: 500,
      },
    );
  }
}