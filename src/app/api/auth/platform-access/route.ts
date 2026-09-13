import { NextResponse } from "next/server";
import {
  createClient as createSupabaseAdmin,
} from "@supabase/supabase-js";

import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================================================
   TYPES
============================================================ */

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

/* ============================================================
   CLIENT ADMIN SUPABASE
============================================================ */

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  /*
   * Nous acceptons les deux noms afin d'éviter un problème
   * de configuration entre l'environnement local et Vercel.
   */
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL est manquant.",
    );
  }

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY est manquant.",
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

/* ============================================================
   DÉTECTER UNE TABLE SUPABASE ABSENTE
============================================================ */

function isMissingTableError(
  error: unknown,
) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error
      ? String(
          (error as {
            message?: unknown;
          }).message ?? "",
        )
      : "";

  const code =
    error &&
    typeof error === "object" &&
    "code" in error
      ? String(
          (error as {
            code?: unknown;
          }).code ?? "",
        )
      : "";

  return (
    code === "PGRST205" ||
    /could not find the table/i.test(
      message,
    ) ||
    /relation .* does not exist/i.test(
      message,
    )
  );
}

/* ============================================================
   GET
============================================================ */

export async function GET() {
  try {
    /* ========================================================
       1. UTILISATEUR CONNECTÉ
    ======================================================== */

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
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    /* ========================================================
       2. CLIENT ADMIN
    ======================================================== */

    let adminClient;

    try {
      adminClient =
        getSupabaseAdmin();
    } catch (adminConfigError) {
      /*
       * IMPORTANT :
       *
       * Si la configuration serveur n'est pas disponible,
       * nous ne bloquons PAS un utilisateur pharmacie.
       *
       * En revanche, un Super Admin ne pourra pas être détecté
       * tant que la clé serveur n'est pas correctement configurée.
       */
      console.error(
        "PLATFORM ACCESS - ADMIN CONFIG:",
        adminConfigError,
      );

      return NextResponse.json<PlatformAccess>(
        {
          type: "none",
          active: false,
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    /* ========================================================
       3. SUPER ADMIN
    ======================================================== */

    try {
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

      /*
       * Si la table n'existe pas encore, ce n'est pas une raison
       * pour bloquer les utilisateurs de pharmacie.
       */
      if (superAdminError) {
        if (
          isMissingTableError(
            superAdminError,
          )
        ) {
          console.warn(
            "PLATFORM ACCESS - platform_admins n'existe pas encore.",
          );
        } else {
          console.error(
            "PLATFORM ACCESS - SUPER ADMIN:",
            superAdminError,
          );
        }
      } else if (
        superAdmin
      ) {
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
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate",
            },
          },
        );
      }
    } catch (superAdminException) {
      console.error(
        "PLATFORM ACCESS - SUPER ADMIN EXCEPTION:",
        superAdminException,
      );
    }

    /* ========================================================
       4. AGENT PLATEFORME
    ======================================================== */

    try {
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

      /*
       * platform_agents peut ne pas encore être créée.
       *
       * Dans ce cas, l'utilisateur est simplement considéré
       * comme utilisateur pharmacie normal.
       */
      if (agentError) {
        if (
          isMissingTableError(
            agentError,
          )
        ) {
          console.warn(
            "PLATFORM ACCESS - platform_agents n'existe pas encore.",
          );
        } else {
          console.error(
            "PLATFORM ACCESS - AGENT:",
            agentError,
          );
        }
      } else if (
        agent
      ) {
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
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate",
            },
          },
        );
      }
    } catch (agentException) {
      console.error(
        "PLATFORM ACCESS - AGENT EXCEPTION:",
        agentException,
      );
    }

    /* ========================================================
       5. UTILISATEUR PHARMACIE NORMAL
    ======================================================== */

    return NextResponse.json<PlatformAccess>(
      {
        type: "none",
        active: false,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    /*
     * Cette erreur est réellement inattendue.
     *
     * Nous la journalisons côté serveur.
     */
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
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}