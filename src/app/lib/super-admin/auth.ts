import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

/**
 * Rôle unique actuellement autorisé au niveau plateforme.
 */
export type SuperAdminRole = "super_admin";

/**
 * Représentation d'un administrateur global PharmaFlow.
 */
export type SuperAdmin = {
  id: string;
  user_id: string;
  role: SuperAdminRole;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Récupère le Super Admin actuellement connecté.
 *
 * IMPORTANT :
 * - On ne fait jamais confiance à un rôle envoyé par le navigateur.
 * - On vérifie l'utilisateur via Supabase Auth.
 * - On vérifie ensuite sa présence dans platform_admins.
 * - Le compte doit également être actif.
 */
export async function getCurrentSuperAdmin(): Promise<SuperAdmin | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("platform_admins")
    .select(
      `
        id,
        user_id,
        role,
        full_name,
        is_active,
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

  if (data.role !== "super_admin") {
    return null;
  }

  return data as SuperAdmin;
}

/**
 * Protège une PAGE Super Admin.
 *
 * Si l'utilisateur n'est pas autorisé :
 * → redirection vers /login
 */
export async function requireSuperAdmin(): Promise<SuperAdmin> {
  const admin = await getCurrentSuperAdmin();

  if (!admin) {
    redirect("/login");
  }

  return admin;
}

/**
 * Version destinée aux API.
 *
 * IMPORTANT :
 * Une API ne doit pas utiliser redirect().
 * Elle doit retourner null afin que la route puisse répondre
 * avec HTTP 401/403.
 */
export async function requireSuperAdminApi(): Promise<SuperAdmin | null> {
  return getCurrentSuperAdmin();
}