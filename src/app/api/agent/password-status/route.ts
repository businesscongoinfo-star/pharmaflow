import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/app/lib/supabase/server";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

export async function POST() {
  try {
    const supabase =
      await createClient();

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
          success: false,
          error:
            "Session utilisateur introuvable.",
        },
        {
          status: 401,
        },
      );
    }

    const adminClient =
      createAdminClient();

    const {
      data: member,
      error: memberError,
    } =
      await adminClient
        .from("platform_team_members")
        .select(
          "id,user_id,is_active,must_change_password",
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (memberError) {
      return NextResponse.json(
        {
          success: false,
          error:
            memberError.message ||
            "Impossible de vérifier le compte agent.",
        },
        {
          status: 500,
        },
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Compte agent introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    if (!member.is_active) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ce compte agent est actuellement désactivé.",
        },
        {
          status: 403,
        },
      );
    }

    const {
      error: updateError,
    } =
      await adminClient
        .from("platform_team_members")
        .update({
          must_change_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message ||
            "Impossible de mettre à jour le statut du compte.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      mustChangePassword: false,
    });
  } catch (error) {
    console.error(
      "AGENT_PASSWORD_STATUS_ERROR",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Une erreur interne est survenue.",
      },
      {
        status: 500,
      },
    );
  }
}