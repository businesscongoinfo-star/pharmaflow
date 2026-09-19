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

function getDefaultPermissions(role: TeamRole) {
  const permissions: Record<string, boolean> = {};

  for (const permission of ALLOWED_PERMISSIONS) {
    permissions[permission] = false;
  }

  if (role === "support") {
    permissions["support.view"] = true;
    permissions["support.reply"] = true;
    permissions["support.manage"] = true;
  }

  if (role === "finance") {
    permissions["subscriptions.view"] = true;
    permissions["subscriptions.manage"] = true;
    permissions["payments.view"] = true;
    permissions["payments.manage"] = true;
  }

  if (role === "technical") {
    permissions["technical.view"] = true;
    permissions["technical.manage"] = true;
  }

  if (role === "operations") {
    permissions["pharmacies.view"] = true;
    permissions["pharmacies.manage"] = true;
  }

  if (role === "analyst") {
    permissions["analytics.view"] = true;
  }

  if (role === "security") {
    permissions["security.view"] = true;
    permissions["security.manage"] = true;
  }

  return permissions;
}

function getSiteUrl(request: NextRequest) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  const origin = request.nextUrl.origin;

  return origin.replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const superAdmin = await requireSuperAdminApi();

    if (!superAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Accès refusé.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const role = body.role as TeamRole;

    const requestedPermissions =
      body.permissions &&
      typeof body.permissions === "object" &&
      !Array.isArray(body.permissions)
        ? body.permissions
        : null;

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          error: "Le nom complet est obligatoire.",
        },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Adresse email invalide.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rôle invalide.",
        },
        { status: 400 },
      );
    }

    const permissions =
      requestedPermissions ??
      getDefaultPermissions(role);

    const supabase = createAdminClient();

    const { data: existingMember } = await supabase
      .from("platform_team_members")
      .select("id,user_id,email,is_active")
      .eq("email", email)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Un membre de cette adresse email existe déjà dans l'équipe PharmaFlow.",
        },
        { status: 409 },
      );
    }

    /*
     * L'invitation est envoyée par Supabase Auth.
     *
     * Le membre arrivera ensuite sur :
     *
     * /invitation
     *
     * où il pourra définir son mot de passe.
     */
    const redirectTo =
      `${getSiteUrl(request)}/invitation`;

    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name: fullName,
            platform_role: role,
          },
          redirectTo,
        },
      );

    if (inviteError) {
      return NextResponse.json(
        {
          success: false,
          error:
            inviteError.message ||
            "Impossible d'envoyer l'invitation.",
        },
        { status: 500 },
      );
    }

    const invitedUser = inviteData.user;

    if (!invitedUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase n'a pas retourné l'utilisateur invité.",
        },
        { status: 500 },
      );
    }

    const { data: member, error: memberError } =
      await supabase
        .from("platform_team_members")
        .insert({
          user_id: invitedUser.id,
          full_name: fullName,
          email,
          phone: phone || null,
          role,
          is_active: true,
          permissions,
          created_by: superAdmin.user_id,
        })
        .select(
          "id,user_id,full_name,email,phone,role,is_active,permissions,created_by,created_at,updated_at",
        )
        .single();

    if (memberError) {
      /*
       * Si l'insertion de l'équipe échoue après la création
       * du compte Auth, on supprime l'utilisateur Auth afin
       * d'éviter un compte orphelin.
       */
      await supabase.auth.admin.deleteUser(
        invitedUser.id,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            memberError.message ||
            "Impossible d'enregistrer le membre de l'équipe.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Invitation envoyée avec succès.",
        member,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "SUPER_ADMIN_TEAM_CREATE_ERROR",
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