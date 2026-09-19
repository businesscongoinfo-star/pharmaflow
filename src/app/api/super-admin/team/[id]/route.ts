import { NextRequest, NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/app/lib/super-admin/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

type TeamRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

const ALLOWED_ROLES: TeamRole[] = [
  "support",
  "finance",
  "technical",
  "operations",
  "analyst",
  "security",
];

const ALLOWED_PERMISSIONS = [
  "support.view",
  "support.reply",
  "support.manage",

  "pharmacies.view",
  "pharmacies.manage",

  "subscriptions.view",
  "subscriptions.manage",

  "payments.view",
  "payments.manage",

  "technical.view",
  "technical.manage",

  "analytics.view",

  "security.view",
  "security.manage",
] as const;

function isValidRole(
  value: unknown,
): value is TeamRole {
  return (
    typeof value === "string" &&
    ALLOWED_ROLES.includes(
      value as TeamRole,
    )
  );
}

function sanitizePermissions(
  value: unknown,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return result;
  }

  const source =
    value as Record<string, unknown>;

  for (const permission of ALLOWED_PERMISSIONS) {
    result[permission] =
      source[permission] === true;
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Récupère un membre précis.
*/
export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const superAdmin =
      await requireSuperAdminApi();

    if (!superAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Accès refusé.",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant du membre manquant.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: member, error } =
      await supabase
        .from("platform_team_members")
        .select(
          `
            id,
            user_id,
            full_name,
            email,
            phone,
            role,
            is_active,
            permissions,
            created_by,
            last_login_at,
            created_at,
            updated_at
          `,
        )
        .eq("id", id)
        .maybeSingle();

    if (error) {
      console.error(
        "TEAM_MEMBER_GET_ERROR",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer le membre.",
        },
        { status: 500 },
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error: "Membre introuvable.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      member,
    });
  } catch (error) {
    console.error(
      "TEAM_MEMBER_GET_EXCEPTION",
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
      { status: 500 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
| Modifie un membre :
| - nom
| - téléphone
| - rôle
| - statut actif/inactif
| - permissions
*/
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const superAdmin =
      await requireSuperAdminApi();

    if (!superAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Accès refusé.",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant du membre manquant.",
        },
        { status: 400 },
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const supabase = createAdminClient();

    /*
     * Récupération du membre actuel.
     */
    const {
      data: existingMember,
      error: findError,
    } = await supabase
      .from("platform_team_members")
      .select(
        `
          id,
          user_id,
          full_name,
          email,
          phone,
          role,
          is_active,
          permissions
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error(
        "TEAM_MEMBER_FIND_ERROR",
        findError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer le membre.",
        },
        { status: 500 },
      );
    }

    if (!existingMember) {
      return NextResponse.json(
        {
          success: false,
          error: "Membre introuvable.",
        },
        { status: 404 },
      );
    }

    /*
     * Protection :
     * un Super Admin ne doit pas être géré
     * comme un membre Agent.
     */
    if (
      existingMember.user_id ===
      superAdmin.user_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le compte du Super Admin ne peut pas être modifié depuis cette interface.",
        },
        { status: 400 },
      );
    }

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : existingMember.full_name;

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : existingMember.phone;

    const role = isValidRole(body.role)
      ? body.role
      : existingMember.role;

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : existingMember.is_active;

    const permissions =
      body.permissions !== undefined
        ? sanitizePermissions(
            body.permissions,
          )
        : sanitizePermissions(
            existingMember.permissions,
          );

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom complet est obligatoire.",
        },
        { status: 400 },
      );
    }

    if (!isValidRole(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rôle invalide.",
        },
        { status: 400 },
      );
    }

    /*
     * Mise à jour de notre table PharmaFlow.
     */
    const {
      data: updatedMember,
      error: updateError,
    } = await supabase
      .from("platform_team_members")
      .update({
        full_name: fullName,
        phone: phone || null,
        role,
        is_active: isActive,
        permissions,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
          id,
          user_id,
          full_name,
          email,
          phone,
          role,
          is_active,
          permissions,
          created_by,
          last_login_at,
          created_at,
          updated_at
        `,
      )
      .single();

    if (updateError) {
      console.error(
        "TEAM_MEMBER_UPDATE_ERROR",
        updateError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message ||
            "Impossible de modifier le membre.",
        },
        { status: 500 },
      );
    }

    /*
     * Synchronisation du nom et du rôle dans
     * les métadonnées Auth.
     *
     * Les permissions restent dans
     * platform_team_members.
     */
    const {
      error: authUpdateError,
    } =
      await supabase.auth.admin.updateUserById(
        existingMember.user_id,
        {
          user_metadata: {
            full_name: fullName,
            platform_role: role,
          },
        },
      );

    if (authUpdateError) {
      console.error(
        "TEAM_MEMBER_AUTH_UPDATE_ERROR",
        authUpdateError,
      );

      /*
       * Ce n'est pas bloquant pour la modification
       * métier : la source de vérité reste
       * platform_team_members.
       */
    }

    return NextResponse.json({
      success: true,
      message:
        "Membre modifié avec succès.",
      member: updatedMember,
    });
  } catch (error) {
    console.error(
      "TEAM_MEMBER_PATCH_ERROR",
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
      { status: 500 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
| Supprime :
| 1. le membre de platform_team_members
| 2. son compte Supabase Auth
*/
export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const superAdmin =
      await requireSuperAdminApi();

    if (!superAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Accès refusé.",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant du membre manquant.",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    /*
     * Récupération du membre.
     */
    const { data: member, error: findError } =
      await supabase
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
            created_by
          `,
        )
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      console.error(
        "TEAM_MEMBER_DELETE_FIND_ERROR",
        findError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer le membre.",
        },
        { status: 500 },
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error: "Membre introuvable.",
        },
        { status: 404 },
      );
    }

    /*
     * Protection supplémentaire.
     */
    if (
      member.user_id ===
      superAdmin.user_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le compte du Super Admin connecté ne peut pas être supprimé depuis cette interface.",
        },
        { status: 400 },
      );
    }

    /*
     * 1. Suppression du compte Auth en premier.
     *
     * C'est volontaire :
     * si Supabase Auth refuse la suppression,
     * nous conservons le membre dans notre table.
     */
    const {
      error: deleteAuthError,
    } =
      await supabase.auth.admin.deleteUser(
        member.user_id,
      );

    if (deleteAuthError) {
      console.error(
        "TEAM_MEMBER_DELETE_AUTH_ERROR",
        deleteAuthError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            deleteAuthError.message ||
            "Impossible de supprimer le compte de connexion.",
        },
        { status: 500 },
      );
    }

    /*
     * 2. Suppression du membre dans
     * platform_team_members.
     */
    const {
      error: deleteMemberError,
    } = await supabase
      .from("platform_team_members")
      .delete()
      .eq("id", id);

    if (deleteMemberError) {
      console.error(
        "TEAM_MEMBER_DELETE_DB_ERROR",
        deleteMemberError,
      );

      /*
       * À ce stade le compte Auth a déjà été supprimé.
       * On signale clairement l'incohérence éventuelle.
       */
      return NextResponse.json(
        {
          success: false,
          error:
            "Le compte de connexion a été supprimé, mais la fiche membre n'a pas pu être supprimée. Vérifiez la table platform_team_members.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Membre supprimé définitivement.",
    });
  } catch (error) {
    console.error(
      "TEAM_MEMBER_DELETE_ERROR",
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
      { status: 500 },
    );
  }
}