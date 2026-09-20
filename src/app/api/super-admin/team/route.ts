import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

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

/**
 * Génère un mot de passe temporaire suffisamment long
 * et difficile à deviner.
 *
 * Le mot de passe n'est jamais enregistré dans la base
 * de données. Il est uniquement retourné au Super Admin
 * lors de la création.
 */
function generateTemporaryPassword() {
  const randomPart = randomBytes(18).toString("hex");

  return `PF-${randomPart}-!`;
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

    /*
     * Deux modes sont maintenant disponibles :
     *
     * "temporary_password"
     * → le Super Admin reçoit un mot de passe temporaire.
     *
     * "invitation"
     * → Supabase envoie une invitation par email.
     *
     * Par défaut, on utilise le mot de passe temporaire
     * afin de conserver le comportement demandé.
     */
    const creationMethod =
      body.creationMethod === "invitation"
        ? "invitation"
        : "temporary_password";

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

    /*
     * Vérification d'un membre existant dans PharmaFlow.
     */
    const { data: existingMember, error: existingMemberError } =
      await supabase
        .from("platform_team_members")
        .select("id,user_id,email,is_active")
        .eq("email", email)
        .maybeSingle();

    if (existingMemberError) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingMemberError.message ||
            "Impossible de vérifier les membres existants.",
        },
        { status: 500 },
      );
    }

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
     * ============================================================
     * MODE 1 — MOT DE PASSE TEMPORAIRE
     * ============================================================
     */
    if (creationMethod === "temporary_password") {
      const temporaryPassword =
        generateTemporaryPassword();

      const {
        data: createdUserData,
        error: createUserError,
      } = await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          platform_role: role,
        },
      });

      if (createUserError) {
        return NextResponse.json(
          {
            success: false,
            error:
              createUserError.message ||
              "Impossible de créer le compte utilisateur.",
          },
          { status: 500 },
        );
      }

      const createdUser = createdUserData.user;

      if (!createdUser) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Supabase n'a pas retourné l'utilisateur créé.",
          },
          { status: 500 },
        );
      }

      /*
       * Enregistrement du membre dans la table interne.
       *
       * Le mot de passe temporaire n'est PAS enregistré.
       */
      const { data: member, error: memberError } =
        await supabase
          .from("platform_team_members")
          .insert({
            user_id: createdUser.id,
            full_name: fullName,
            email,
            phone: phone || null,
            role,
            is_active: true,
            permissions,

            /*
             * Le membre devra obligatoirement modifier
             * son mot de passe après sa première connexion.
             */
            must_change_password: true,

            created_by: superAdmin.user_id,
          })
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
              must_change_password,
              created_by,
              created_at,
              updated_at
            `,
          )
          .single();

      if (memberError) {
        /*
         * Rollback :
         * si l'enregistrement PharmaFlow échoue,
         * on supprime le compte Supabase Auth créé juste avant.
         */
        await supabase.auth.admin.deleteUser(
          createdUser.id,
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
          creationMethod: "temporary_password",
          message:
            "Membre créé avec succès. Le mot de passe temporaire doit être communiqué au membre de manière sécurisée.",
          member,
          temporaryPassword,
        },
        { status: 201 },
      );
    }

    /*
     * ============================================================
     * MODE 2 — INVITATION PAR EMAIL
     * ============================================================
     */

    const configuredUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim();

    const siteUrl = configuredUrl
      ? configuredUrl.replace(/\/+$/, "")
      : request.nextUrl.origin.replace(/\/+$/, "");

    const redirectTo = `${siteUrl}/invitation`;

    const {
      data: inviteData,
      error: inviteError,
    } = await supabase.auth.admin.inviteUserByEmail(
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

          /*
           * L'utilisateur définit lui-même son mot de passe
           * via le lien d'invitation.
           */
          must_change_password: false,

          created_by: superAdmin.user_id,
        })
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
            must_change_password,
            created_by,
            created_at,
            updated_at
          `,
        )
        .single();

    if (memberError) {
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
        creationMethod: "invitation",
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