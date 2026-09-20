import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: true,
          type: "none",
          active: false,
        },
        {
          status: 200,
        },
      );
    }

    /*
     * ======================================================
     * CLIENT ADMIN
     * ======================================================
     *
     * La vérification de platform_team_members est faite
     * côté serveur avec le client administrateur.
     *
     * Le service role n'est jamais envoyé au navigateur.
     */

    const admin =
      createAdminClient();

    /* ======================================================
       1. SUPER ADMIN
    ====================================================== */

    const {
      data: superAdmin,
      error: superAdminError,
    } =
      await admin
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
        .maybeSingle();

    if (
      superAdminError
    ) {
      console.error(
        "PLATFORM_ACCESS_SUPER_ADMIN:",
        superAdminError,
      );
    }

    if (
      superAdmin
    ) {
      if (
        superAdmin.is_active !==
        true
      ) {
        return NextResponse.json(
          {
            success: true,
            type: "super_admin",
            active: false,
            full_name:
              superAdmin.full_name,
          },
          {
            status: 200,
          },
        );
      }

      return NextResponse.json(
        {
          success: true,
          type: "super_admin",
          active: true,
          full_name:
            superAdmin.full_name,
          redirect:
            "/super-admin",
        },
        {
          status: 200,
        },
      );
    }

    /* ======================================================
       2. MEMBRE ÉQUIPE PHARMAFLOW
    ====================================================== */

    const {
      data: teamMember,
      error: teamMemberError,
    } =
      await admin
        .from("platform_team_members")
        .select(
          `
            id,
            user_id,
            full_name,
            email,
            role,
            is_active,
            permissions,
            must_change_password
          `,
        )
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

    if (
      teamMemberError
    ) {
      console.error(
        "PLATFORM_ACCESS_TEAM_MEMBER:",
        teamMemberError,
      );
    }

    if (
      teamMember
    ) {
      if (
        teamMember.is_active !==
        true
      ) {
        return NextResponse.json(
          {
            success: true,
            type: "agent",
            active: false,
            full_name:
              teamMember.full_name,
            department:
              teamMember.role,
            must_change_password:
              teamMember.must_change_password ===
              true,
          },
          {
            status: 200,
          },
        );
      }

      return NextResponse.json(
        {
          success: true,
          type: "agent",
          active: true,
          full_name:
            teamMember.full_name,
          department:
            teamMember.role,
          must_change_password:
            teamMember.must_change_password ===
            true,
          redirect:
            "/agent",
        },
        {
          status: 200,
        },
      );
    }

    /* ======================================================
       3. UTILISATEUR PHARMACIE
    ====================================================== */

    return NextResponse.json(
      {
        success: true,
        type: "none",
        active: false,
      },
      {
        status: 200,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "PLATFORM_ACCESS_ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        type: "none",
        active: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne.",
      },
      {
        status: 500,
      },
    );
  }
}