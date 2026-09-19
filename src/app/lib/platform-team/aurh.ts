import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export type PlatformTeamRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

export type PlatformTeamMember = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: PlatformTeamRole;
  is_active: boolean;
  permissions: Record<string, boolean>;
  created_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

const ALLOWED_ROLES: PlatformTeamRole[] = [
  "support",
  "finance",
  "technical",
  "operations",
  "analyst",
  "security",
];

function normalizeRole(
  value: unknown,
): PlatformTeamRole | null {
  if (
    typeof value !== "string" ||
    !ALLOWED_ROLES.includes(
      value as PlatformTeamRole,
    )
  ) {
    return null;
  }

  return value as PlatformTeamRole;
}

function normalizePermissions(
  value: unknown,
): Record<string, boolean> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const permissions: Record<string, boolean> = {};

  for (const [key, permission] of Object.entries(
    value as Record<string, unknown>,
  )) {
    permissions[key] = permission === true;
  }

  return permissions;
}

function normalizeNullableString(
  value: unknown,
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function normalizeMember(
  value: unknown,
): PlatformTeamMember | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const row = value as Record<string, unknown>;

  const role = normalizeRole(row.role);

  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.full_name !== "string" ||
    typeof row.email !== "string" ||
    !role ||
    typeof row.is_active !== "boolean" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    phone: normalizeNullableString(row.phone),
    role,
    is_active: row.is_active,
    permissions: normalizePermissions(
      row.permissions,
    ),
    created_by: normalizeNullableString(
      row.created_by,
    ),
    last_login_at: normalizeNullableString(
      row.last_login_at,
    ),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Récupère le membre de l'équipe PharmaFlow
 * actuellement connecté.
 */
export async function getCurrentPlatformTeamMember(): Promise<PlatformTeamMember | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
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
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeMember(data);
}

/**
 * Exige un membre actif de l'équipe.
 *
 * Si aucun membre valide n'est connecté,
 * l'utilisateur est envoyé vers la connexion.
 */
export async function requirePlatformTeamMember(): Promise<PlatformTeamMember> {
  const member =
    await getCurrentPlatformTeamMember();

  if (!member) {
    redirect(
      "/login?redirect=/agent",
    );
  }

  return member;
}

/**
 * Vérifie une permission.
 *
 * Exemple :
 * hasPlatformPermission(
 *   member,
 *   "support.view"
 * )
 */
export function hasPlatformPermission(
  member: PlatformTeamMember | null,
  permission: string,
): boolean {
  if (
    !member ||
    !member.is_active ||
    !permission
  ) {
    return false;
  }

  return member.permissions[permission] === true;
}

/**
 * Vérifie si au moins une permission est accordée.
 */
export function hasAnyPlatformPermission(
  member: PlatformTeamMember | null,
  permissions: string[],
): boolean {
  if (
    !member ||
    !member.is_active
  ) {
    return false;
  }

  return permissions.some(
    (permission) =>
      hasPlatformPermission(
        member,
        permission,
      ),
  );
}

/**
 * Vérifie si toutes les permissions sont accordées.
 */
export function hasAllPlatformPermissions(
  member: PlatformTeamMember | null,
  permissions: string[],
): boolean {
  if (
    !member ||
    !member.is_active
  ) {
    return false;
  }

  return permissions.every(
    (permission) =>
      hasPlatformPermission(
        member,
        permission,
      ),
  );
}

/**
 * Vérifie le rôle du membre.
 */
export function hasPlatformRole(
  member: PlatformTeamMember | null,
  role: PlatformTeamRole,
): boolean {
  return Boolean(
    member &&
      member.is_active &&
      member.role === role,
  );
}