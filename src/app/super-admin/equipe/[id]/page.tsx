import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperAdmin } from "@/app/lib/super-admin/auth";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    updated?: string;
    error?: string;
  }>;
};

type Permissions = Record<string, boolean>;

type TeamMember = {
  id: string;
  role: string | null;
  permissions: Permissions | null;
  is_active: boolean | null;
  created_at: string | null;
};

const ROLES = [
  {
    value: "support",
    label: "Support",
    description: "Gère les demandes et accompagne les clients.",
    icon: "💬",
  },
  {
    value: "technical",
    label: "Technique",
    description: "Résout les problèmes techniques de PharmaFlow.",
    icon: "⚙️",
  },
  {
    value: "analyst",
    label: "Analyste",
    description: "Analyse les données, activités et performances.",
    icon: "📊",
  },
  {
    value: "finance",
    label: "Finance",
    description: "Gère les opérations financières de la plateforme.",
    icon: "💰",
  },
  {
    value: "operations",
    label: "Opérations",
    description: "Gère les opérations quotidiennes de PharmaFlow.",
    icon: "🧩",
  },
  {
    value: "security",
    label: "Sécurité",
    description: "Surveille les accès et les opérations de sécurité.",
    icon: "🛡️",
  },
] as const;

const AVAILABLE_PERMISSIONS = [
  {
    key: "support.view",
    label: "Voir le support",
    description: "Consulter les demandes et tickets de support.",
  },
  {
    key: "support.manage",
    label: "Gérer le support",
    description: "Prendre en charge et gérer les demandes de support.",
  },
  {
    key: "callTickets",
    label: "Appeler les tickets",
    description: "Prendre en charge les tickets attribués.",
  },
  {
    key: "serveClients",
    label: "Assister les clients",
    description: "Prendre en charge les clients PharmaFlow.",
  },
  {
    key: "completeTickets",
    label: "Finaliser les tickets",
    description: "Marquer les tickets comme terminés.",
  },
  {
    key: "viewClients",
    label: "Voir les clients",
    description: "Consulter les informations opérationnelles des clients.",
  },
  {
    key: "viewStatistics",
    label: "Voir les statistiques",
    description: "Consulter les statistiques et indicateurs.",
  },
] as const;

function normalizeRole(role: string | null | undefined): string {
  const value = String(role ?? "")
    .trim()
    .toLowerCase();

  if (value === "technique" || value === "technicien") {
    return "technical";
  }

  if (value === "opération" || value === "opérations") {
    return "operations";
  }

  return value;
}

function normalizePermissions(
  permissions: unknown,
): Permissions {
  if (
    !permissions ||
    typeof permissions !== "object" ||
    Array.isArray(permissions)
  ) {
    return {};
  }

  const result: Permissions = {};

  for (const [key, value] of Object.entries(
    permissions as Record<string, unknown>,
  )) {
    if (typeof value === "boolean") {
      result[key] = value;
    }
  }

  return result;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Date inconnue";
  }

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function TeamMemberPage({
  params,
  searchParams,
}: PageProps) {
  await requireSuperAdmin();

  const { id } = await params;
  const query = searchParams
    ? await searchParams
    : {};

  const admin = createAdminClient();

  const {
    data: member,
    error: memberError,
  } = await admin
    .from("platform_team_members")
    .select(
      `
        id,
        role,
        permissions,
        is_active,
        created_at
      `,
    )
    .eq("id", id)
    .maybeSingle<TeamMember>();

  if (memberError) {
    throw new Error(
      `Impossible de récupérer le membre : ${memberError.message}`,
    );
  }

  if (!member) {
    redirect("/super-admin/equipe");
  }

  const currentRole = normalizeRole(member.role);

  const currentPermissions = normalizePermissions(
    member.permissions,
  );

  async function updateMember(formData: FormData) {
    "use server";

    await requireSuperAdmin();

    const adminClient = createAdminClient();

    const selectedRole = String(
      formData.get("role") ?? "",
    )
      .trim()
      .toLowerCase();

    const allowedRole = ROLES.some(
      (role) => role.value === selectedRole,
    );

    if (!allowedRole) {
      redirect(
        `/super-admin/equipe/${id}?error=role`,
      );
    }

    const isActive =
      formData.get("is_active") === "on";

    /*
     * On récupère d'abord les permissions existantes
     * afin de ne pas supprimer accidentellement une
     * permission qui n'est pas affichée dans cette page.
     */
    const {
      data: existingMember,
      error: existingError,
    } = await adminClient
      .from("platform_team_members")
      .select(
        `
          id,
          permissions
        `,
      )
      .eq("id", id)
      .maybeSingle<{
        id: string;
        permissions: Permissions | null;
      }>();

    if (existingError) {
      redirect(
        `/super-admin/equipe/${id}?error=read`,
      );
    }

    if (!existingMember) {
      redirect(
        `/super-admin/equipe/${id}?error=notfound`,
      );
    }

    const updatedPermissions =
      normalizePermissions(
        existingMember.permissions,
      );

    /*
     * Mise à jour uniquement des permissions connues
     * par cette interface.
     */
    for (const permission of AVAILABLE_PERMISSIONS) {
      updatedPermissions[permission.key] =
        formData.get(
          `permission_${permission.key}`,
        ) === "on";
    }

    const { error: updateError } =
      await adminClient
        .from("platform_team_members")
        .update({
          role: selectedRole,
          permissions: updatedPermissions,
          is_active: isActive,
        })
        .eq("id", id);

    if (updateError) {
      redirect(
        `/super-admin/equipe/${id}?error=save`,
      );
    }

    revalidatePath("/super-admin/equipe");
    revalidatePath(
      `/super-admin/equipe/${id}`,
    );

    redirect(
      `/super-admin/equipe/${id}?updated=1`,
    );
  }

  return (
    <main className="pf-team-member-page">
      <div className="pf-team-member-container">

        {/* HEADER */}
        <header className="pf-team-member-header">
          <div>
            <div className="pf-breadcrumb">
              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <Link href="/super-admin/equipe">
                Équipe
              </Link>

              <span>/</span>

              <span>Membre</span>
            </div>

            <div className="pf-eyebrow">
              ADMINISTRATION ÉQUIPE
            </div>

            <h1>
              Gestion du membre
            </h1>

            <p>
              Configurez le rôle, les permissions
              et l'accès opérationnel de ce membre
              de l'équipe PharmaFlow.
            </p>
          </div>

          <Link
            href="/super-admin/equipe"
            className="pf-back-button"
          >
            ← Retour à l'équipe
          </Link>
        </header>

        {/* MESSAGES */}
        {query.updated === "1" && (
          <div className="pf-alert pf-alert-success">
            <div className="pf-alert-icon">
              ✓
            </div>

            <div>
              <strong>
                Modifications enregistrées
              </strong>

              <span>
                Le rôle, le statut et les permissions
                du membre ont bien été mis à jour.
              </span>
            </div>
          </div>
        )}

        {query.error && (
          <div className="pf-alert pf-alert-error">
            <div className="pf-alert-icon">
              !
            </div>

            <div>
              <strong>
                Impossible d'enregistrer
              </strong>

              <span>
                Une erreur est survenue pendant
                l'enregistrement. Vérifiez les
                informations puis réessayez.
              </span>
            </div>
          </div>
        )}

        <form
          action={updateMember}
          className="pf-member-form"
        >

          {/* IDENTITÉ / ÉTAT */}
          <section className="pf-section-card">
            <div className="pf-section-header">
              <div>
                <div className="pf-section-number">
                  01
                </div>

                <h2>
                  État du compte
                </h2>

                <p>
                  Activez ou désactivez l'accès
                  opérationnel du membre.
                </p>
              </div>

              <div
                className={
                  member.is_active
                    ? "pf-status-badge pf-status-active"
                    : "pf-status-badge pf-status-inactive"
                }
              >
                <span className="pf-status-dot" />

                {member.is_active
                  ? "Compte actif"
                  : "Compte désactivé"}
              </div>
            </div>

            <div className="pf-account-state">
              <label
                htmlFor="is_active"
                className="pf-toggle-row"
              >
                <div>
                  <strong>
                    Autoriser l'accès
                  </strong>

                  <span>
                    Le membre pourra accéder aux
                    espaces opérationnels qui lui
                    sont autorisés.
                  </span>
                </div>

                <span className="pf-switch">
                  <input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    defaultChecked={
                      member.is_active ?? false
                    }
                  />

                  <span className="pf-switch-slider" />
                </span>
              </label>

              <div className="pf-created-info">
                <span>
                  Membre créé le
                </span>

                <strong>
                  {formatDate(
                    member.created_at,
                  )}
                </strong>
              </div>
            </div>
          </section>

          {/* RÔLE */}
          <section className="pf-section-card">
            <div className="pf-section-header">
              <div>
                <div className="pf-section-number">
                  02
                </div>

                <h2>
                  Rôle de l'agent
                </h2>

                <p>
                  Le rôle détermine la fonction
                  principale du membre au sein de
                  PharmaFlow.
                </p>
              </div>
            </div>

            <div className="pf-role-grid">
              {ROLES.map((role) => {
                const selected =
                  currentRole === role.value;

                return (
                  <label
                    key={role.value}
                    className={
                      selected
                        ? "pf-role-card pf-role-card-selected"
                        : "pf-role-card"
                    }
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      defaultChecked={selected}
                    />

                    <span className="pf-role-radio">
                      <span />
                    </span>

                    <span className="pf-role-icon">
                      {role.icon}
                    </span>

                    <span className="pf-role-content">
                      <strong>
                        {role.label}
                      </strong>

                      <span>
                        {role.description}
                      </span>
                    </span>

                    <span className="pf-role-check">
                      ✓
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* PERMISSIONS */}
          <section className="pf-section-card">
            <div className="pf-section-header">
              <div>
                <div className="pf-section-number">
                  03
                </div>

                <h2>
                  Permissions opérationnelles
                </h2>

                <p>
                  Sélectionnez précisément les
                  opérations que cet agent peut
                  effectuer.
                </p>
              </div>
            </div>

            <div className="pf-permissions-grid">
              {AVAILABLE_PERMISSIONS.map(
                (permission) => {
                  const checked =
                    currentPermissions[
                      permission.key
                    ] === true;

                  return (
                    <label
                      key={permission.key}
                      className="pf-permission-card"
                    >
                      <input
                        type="checkbox"
                        name={`permission_${permission.key}`}
                        defaultChecked={checked}
                      />

                      <span className="pf-checkbox">
                        <span>✓</span>
                      </span>

                      <span className="pf-permission-content">
                        <strong>
                          {permission.label}
                        </strong>

                        <span>
                          {permission.description}
                        </span>
                      </span>
                    </label>
                  );
                },
              )}
            </div>
          </section>

          {/* ACTIONS */}
          <div className="pf-form-actions">
            <Link
              href="/super-admin/equipe"
              className="pf-cancel-button"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="pf-save-button"
            >
              <span>✓</span>
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .pf-team-member-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(15, 118, 110, 0.08),
              transparent 30%
            ),
            #f6f9fb;
          padding: 34px 24px 70px;
        }

        .pf-team-member-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .pf-team-member-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .pf-breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
          color: #8a96a6;
          font-size: 13px;
        }

        .pf-breadcrumb a {
          color: #0f766e;
          text-decoration: none;
          font-weight: 700;
        }

        .pf-eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: #e7f6f3;
          color: #0f766e;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 10px;
        }

        .pf-team-member-header h1 {
          margin: 0;
          color: #10202a;
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.1;
          font-weight: 850;
          letter-spacing: -0.8px;
        }

        .pf-team-member-header p {
          max-width: 720px;
          margin: 10px 0 0;
          color: #718091;
          font-size: 15px;
          line-height: 1.65;
        }

        .pf-back-button {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid #dce5ea;
          border-radius: 12px;
          background: #fff;
          color: #344454;
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .pf-back-button:hover {
          transform: translateY(-1px);
          border-color: #b9d9d5;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
        }

        .pf-alert {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 20px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid;
        }

        .pf-alert-success {
          background: #effaf7;
          border-color: #bce6dc;
          color: #11685f;
        }

        .pf-alert-error {
          background: #fff5f5;
          border-color: #f2c4c4;
          color: #9b2c2c;
        }

        .pf-alert-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.75);
          font-weight: 900;
        }

        .pf-alert div:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pf-alert strong {
          font-size: 14px;
        }

        .pf-alert span {
          font-size: 12px;
          opacity: 0.85;
        }

        .pf-member-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pf-section-card {
          padding: 26px;
          background: rgba(255,255,255,0.96);
          border: 1px solid #e0e8ed;
          border-radius: 20px;
          box-shadow:
            0 10px 30px rgba(15, 23, 42, 0.045),
            0 2px 5px rgba(15, 23, 42, 0.025);
        }

        .pf-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .pf-section-number {
          margin-bottom: 5px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .pf-section-header h2 {
          margin: 0;
          color: #16232d;
          font-size: 20px;
          font-weight: 820;
          letter-spacing: -0.2px;
        }

        .pf-section-header p {
          margin: 6px 0 0;
          color: #788695;
          font-size: 13px;
          line-height: 1.55;
        }

        .pf-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 32px;
          padding: 0 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .pf-status-active {
          background: #eaf8f4;
          color: #08766b;
        }

        .pf-status-inactive {
          background: #f1f3f5;
          color: #687684;
        }

        .pf-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }

        .pf-account-state {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 18px;
          align-items: center;
        }

        .pf-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 76px;
          padding: 17px 18px;
          border: 1px solid #e2e9ed;
          border-radius: 14px;
          background: #fbfdfd;
          cursor: pointer;
        }

        .pf-toggle-row > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pf-toggle-row strong {
          color: #24333e;
          font-size: 14px;
        }

        .pf-toggle-row span {
          color: #81909d;
          font-size: 12px;
          line-height: 1.45;
        }

        .pf-switch {
          position: relative;
          width: 48px;
          height: 27px;
          flex-shrink: 0;
        }

        .pf-switch input {
          position: absolute;
          opacity: 0;
          width: 1px;
          height: 1px;
        }

        .pf-switch-slider {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #cbd5dc;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .pf-switch-slider::before {
          content: "";
          position: absolute;
          width: 21px;
          height: 21px;
          left: 3px;
          top: 3px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          transition: transform 0.2s ease;
        }

        .pf-switch input:checked + .pf-switch-slider {
          background: #0f8b80;
        }

        .pf-switch input:checked + .pf-switch-slider::before {
          transform: translateX(21px);
        }

        .pf-created-info {
          min-width: 190px;
          padding: 14px 16px;
          border-radius: 14px;
          background: #f7f9fa;
          border: 1px solid #e5ebef;
        }

        .pf-created-info span,
        .pf-created-info strong {
          display: block;
        }

        .pf-created-info span {
          margin-bottom: 4px;
          color: #84919d;
          font-size: 11px;
        }

        .pf-created-info strong {
          color: #344550;
          font-size: 12px;
        }

        .pf-role-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .pf-role-card {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-height: 130px;
          padding: 17px;
          border: 1.5px solid #e0e8ec;
          border-radius: 16px;
          background: #fff;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
        }

        .pf-role-card:hover {
          transform: translateY(-1px);
          border-color: #9ccbc5;
          box-shadow: 0 8px 22px rgba(15, 118, 110, 0.08);
        }

        .pf-role-card-selected {
          border-color: #0f8b80;
          background: #f0fbf9;
          box-shadow:
            0 0 0 3px rgba(15, 139, 128, 0.08),
            0 8px 24px rgba(15, 118, 110, 0.08);
        }

        .pf-role-card input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .pf-role-radio {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #c8d3d9;
          border-radius: 50%;
          margin-top: 1px;
        }

        .pf-role-card input:checked
          + .pf-role-radio {
          border-color: #0f8b80;
        }

        .pf-role-card input:checked
          + .pf-role-radio span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #0f8b80;
        }

        .pf-role-icon {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #edf7f5;
          font-size: 16px;
        }

        .pf-role-content {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding-right: 12px;
        }

        .pf-role-content strong {
          color: #263640;
          font-size: 14px;
          font-weight: 800;
        }

        .pf-role-content span {
          color: #7d8b97;
          font-size: 11px;
          line-height: 1.5;
        }

        .pf-role-check {
          position: absolute;
          right: 14px;
          bottom: 13px;
          display: none;
          width: 20px;
          height: 20px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #0f8b80;
          color: #fff;
          font-size: 11px;
          font-weight: 900;
        }

        .pf-role-card-selected .pf-role-check {
          display: flex;
        }

        .pf-permissions-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .pf-permission-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border: 1px solid #e0e8ec;
          border-radius: 14px;
          background: #fff;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .pf-permission-card:hover {
          border-color: #b7d8d3;
          background: #fbfefe;
        }

        .pf-permission-card input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .pf-checkbox {
          width: 21px;
          height: 21px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #c8d3d9;
          border-radius: 6px;
          background: #fff;
          margin-top: 1px;
        }

        .pf-checkbox span {
          display: none;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }

        .pf-permission-card
          input:checked
          + .pf-checkbox {
          border-color: #0f8b80;
          background: #0f8b80;
        }

        .pf-permission-card
          input:checked
          + .pf-checkbox
          span {
          display: block;
        }

        .pf-permission-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pf-permission-content strong {
          color: #2d3d47;
          font-size: 13px;
          font-weight: 800;
        }

        .pf-permission-content span {
          color: #83909b;
          font-size: 11px;
          line-height: 1.45;
        }

        .pf-form-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 4px 0;
        }

        .pf-cancel-button,
        .pf-save-button {
          min-height: 48px;
          padding: 0 20px;
          border-radius: 12px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .pf-cancel-button {
          color: #52616c;
          background: #fff;
          border: 1px solid #dce5ea;
        }

        .pf-save-button {
          border: 0;
          color: #fff;
          background: linear-gradient(
            135deg,
            #0f766e,
            #0d9488
          );
          box-shadow:
            0 8px 18px rgba(15, 118, 110, 0.2);
        }

        .pf-cancel-button:hover,
        .pf-save-button:hover {
          transform: translateY(-1px);
        }

        .pf-save-button:hover {
          box-shadow:
            0 11px 24px rgba(15, 118, 110, 0.26);
        }

        .pf-save-button:active,
        .pf-cancel-button:active {
          transform: translateY(0);
        }

        @media (max-width: 900px) {
          .pf-role-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pf-account-state {
            grid-template-columns: 1fr;
          }

          .pf-created-info {
            min-width: 0;
          }
        }

        @media (max-width: 680px) {
          .pf-team-member-page {
            padding: 20px 14px 50px;
          }

          .pf-team-member-header {
            flex-direction: column;
          }

          .pf-back-button {
            width: 100%;
          }

          .pf-section-card {
            padding: 19px;
            border-radius: 16px;
          }

          .pf-role-grid,
          .pf-permissions-grid {
            grid-template-columns: 1fr;
          }

          .pf-form-actions {
            flex-direction: column-reverse;
          }

          .pf-cancel-button,
          .pf-save-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}