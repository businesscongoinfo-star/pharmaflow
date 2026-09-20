import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type AgentRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

export type AgentMember = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AgentRole;
  is_active: boolean;
  permissions: Record<string, boolean>;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCurrentAgent(): Promise<AgentMember | null> {
  /*
   * --------------------------------------------------
   * 1. AUTHENTIFICATION SUPABASE
   * --------------------------------------------------
   */

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  /*
   * --------------------------------------------------
   * 2. MEMBRE PHARMAFLOW
   * --------------------------------------------------
   *
   * On utilise ici le client admin uniquement côté
   * serveur, après avoir vérifié l'utilisateur Auth.
   *
   * Cela évite que la RLS de
   * platform_team_members bloque le contrôle interne.
   */

  const admin = createAdminClient();

  const {
    data,
    error,
  } = await admin
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
        must_change_password,
        last_login_at,
        created_at,
        updated_at
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  /*
   * --------------------------------------------------
   * 3. COMPTE ACTIF
   * --------------------------------------------------
   */

  if (data.is_active !== true) {
    return null;
  }

  return data as AgentMember;
}

export async function requireAgent(): Promise<AgentMember> {
  const agent = await getCurrentAgent();

  if (!agent) {
    redirect("/login?error=platform_access");
  }

  /*
   * --------------------------------------------------
   * PREMIÈRE CONNEXION
   * --------------------------------------------------
   *
   * Si le Super Admin a créé le compte avec un mot
   * de passe temporaire, l'agent doit le remplacer
   * avant d'accéder au centre opérationnel.
   */

  if (agent.must_change_password === true) {
    redirect("/agent/change-password");
  }

  return agent;
}

export async function requireAgentApi(): Promise<AgentMember | null> {
  return getCurrentAgent();
}