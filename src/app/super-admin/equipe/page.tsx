import Link from "next/link";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperAdmin } from "@/app/lib/super-admin/auth";

/* ============================================================
   TYPES
============================================================ */

type TeamRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security"
  | "admin"
  | "super_admin"
  | string;

type TeamMember = {
  id: string;
  role: TeamRole | null;
  permissions: Record<string, boolean> | null;
  is_active: boolean | null;
  created_at: string | null;
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
};

/* ============================================================
   HELPERS
============================================================ */

function normalizeRole(role: unknown): string {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function getRoleLabel(role: unknown): string {
  switch (normalizeRole(role)) {
    case "support":
      return "Support";

    case "finance":
      return "Finance";

    case "technical":
    case "technique":
    case "technicien":
      return "Technique";

    case "operations":
    case "operation":
      return "Opérations";

    case "analyst":
    case "analyste":
      return "Analyste";

    case "security":
    case "securite":
      return "Sécurité";

    case "admin":
      return "Administrateur";

    case "superadmin":
      return "Super Admin";

    default:
      return String(role || "Agent");
  }
}

function getRoleIcon(role: unknown): string {
  switch (normalizeRole(role)) {
    case "support":
      return "◉";

    case "finance":
      return "◆";

    case "technical":
    case "technique":
    case "technicien":
      return "⚙";

    case "operations":
    case "operation":
      return "▣";

    case "analyst":
    case "analyste":
      return "◒";

    case "security":
    case "securite":
      return "◈";

    case "admin":
    case "superadmin":
      return "♛";

    default:
      return "●";
  }
}

function getInitials(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  const source =
    String(fullName || "")
      .trim() ||
    String(email || "")
      .trim();

  if (!source) {
    return "AG";
  }

  const parts = source
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`
    ).toUpperCase();
  }

  return source
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function countPermissions(
  permissions: Record<string, boolean> | null,
): number {
  if (!permissions) {
    return 0;
  }

  return Object.values(permissions).filter(
    Boolean,
  ).length;
}

/* ============================================================
   PAGE
============================================================ */

export default async function SuperAdminEquipePage() {
  /*
   * Vérification Super Admin.
   *
   * Cette page reste dans l'espace plateforme.
   */
  await requireSuperAdmin();

  const supabase = createAdminClient();

  /* ==========================================================
     MEMBRES DE L'ÉQUIPE
  ========================================================== */

  const {
    data: membersData,
    error: membersError,
  } = await supabase
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
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  const members =
    (membersData ?? []) as TeamMember[];

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const totalMembers =
    members.length;

  const activeMembers =
    members.filter(
      (member) =>
        member.is_active === true,
    ).length;

  const inactiveMembers =
    members.filter(
      (member) =>
        member.is_active !== true,
    ).length;

  const technicalMembers =
    members.filter(
      (member) => {
        const role =
          normalizeRole(member.role);

        return (
          role === "technical" ||
          role === "technique" ||
          role === "technicien"
        );
      },
    ).length;

  /* ==========================================================
     RÔLES
  ========================================================== */

  const roleCounts =
    members.reduce<
      Record<string, number>
    >(
      (accumulator, member) => {
        const role =
          getRoleLabel(
            member.role,
          );

        accumulator[role] =
          (accumulator[role] ?? 0) + 1;

        return accumulator;
      },
      {},
    );

  /* ==========================================================
     ERREUR
  ========================================================== */

  const hasError =
    Boolean(membersError);

  return (
    <main className="sa-team-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="sa-team-shell">

        <header className="sa-team-header">

          <div className="sa-team-header-left">

            <Link
              href="/super-admin"
              className="sa-team-back"
            >
              <span aria-hidden="true">
                ←
              </span>

              Retour au Super Admin
            </Link>

            <div className="sa-team-heading">

              <div className="sa-team-heading-icon">
                ♟
              </div>

              <div>

                <span className="sa-team-eyebrow">
                  ADMINISTRATION PLATEFORME
                </span>

                <h1>
                  Équipe PharmaFlow
                </h1>

                <p>
                  Gérez les membres de l'équipe
                  plateforme, leurs rôles et leur
                  niveau d'accès opérationnel.
                </p>

              </div>

            </div>

          </div>

          <div className="sa-team-header-actions">

            <div className="sa-team-security-badge">
              <span className="sa-team-status-dot" />
              Espace sécurisé
            </div>

            <Link
              href="/agent"
              className="sa-team-secondary-button"
            >
              <span>
                ◉
              </span>

              Espace agents
            </Link>

          </div>

        </header>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {hasError && (
          <section className="sa-team-error">

            <div className="sa-team-error-icon">
              !
            </div>

            <div>
              <strong>
                Impossible de charger l'équipe
              </strong>

              <p>
                Les membres de l'équipe n'ont pas
                pu être récupérés depuis la base
                de données.
              </p>
            </div>

          </section>
        )}

        {/* ====================================================
            KPI
        ==================================================== */}

        <section className="sa-team-stats">

          <article className="sa-team-stat-card">

            <div className="sa-team-stat-icon">
              ◎
            </div>

            <div>
              <span>
                Membres
              </span>

              <strong>
                {totalMembers}
              </strong>

              <small>
                équipe plateforme
              </small>
            </div>

          </article>

          <article className="sa-team-stat-card sa-team-stat-active">

            <div className="sa-team-stat-icon">
              ✓
            </div>

            <div>
              <span>
                Actifs
              </span>

              <strong>
                {activeMembers}
              </strong>

              <small>
                accès opérationnel
              </small>
            </div>

          </article>

          <article className="sa-team-stat-card">

            <div className="sa-team-stat-icon">
              ◌
            </div>

            <div>
              <span>
                Inactifs
              </span>

              <strong>
                {inactiveMembers}
              </strong>

              <small>
                accès désactivé
              </small>
            </div>

          </article>

          <article className="sa-team-stat-card">

            <div className="sa-team-stat-icon">
              ⚙
            </div>

            <div>
              <span>
                Technique
              </span>

              <strong>
                {technicalMembers}
              </strong>

              <small>
                agents techniques
              </small>
            </div>

          </article>

        </section>

        {/* ====================================================
            CONTENU
        ==================================================== */}

        <section className="sa-team-content">

          {/* ==================================================
              MEMBRES
          ================================================== */}

          <div className="sa-team-main-card">

            <div className="sa-team-card-header">

              <div>

                <span className="sa-team-card-eyebrow">
                  MEMBRES
                </span>

                <h2>
                  Équipe de la plateforme
                </h2>

                <p>
                  Vue centralisée des comptes
                  opérationnels PharmaFlow.
                </p>

              </div>

              <div className="sa-team-member-count">
                {totalMembers}
                <span>
                  membre{totalMembers > 1 ? "s" : ""}
                </span>
              </div>

            </div>

            {members.length === 0 ? (

              <div className="sa-team-empty">

                <div className="sa-team-empty-icon">
                  ◎
                </div>

                <h3>
                  Aucun membre
                </h3>

                <p>
                  Aucun membre de l'équipe
                  plateforme n'est actuellement
                  enregistré.
                </p>

              </div>

            ) : (

              <div className="sa-team-table-wrap">

                <table className="sa-team-table">

                  <thead>

                    <tr>
                      <th>
                        Membre
                      </th>

                      <th>
                        Rôle
                      </th>

                      <th>
                        Permissions
                      </th>

                      <th>
                        Statut
                      </th>

                      <th>
                        Créé le
                      </th>

                      <th>
                        Action
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {members.map(
                      (member) => {

                        const initials =
                          getInitials(
                            member.full_name,
                            member.email,
                          );

                        const permissionCount =
                          countPermissions(
                            member.permissions,
                          );

                        const roleLabel =
                          getRoleLabel(
                            member.role,
                          );

                        return (
                          <tr
                            key={member.id}
                          >

                            <td>

                              <div className="sa-team-person">

                                <div className="sa-team-avatar">
                                  {initials}
                                </div>

                                <div className="sa-team-person-info">

                                  <strong>
                                    {member.full_name ||
                                      "Membre de l'équipe"}
                                  </strong>

                                  <span>
                                    {member.email ||
                                      "Compte plateforme"}
                                  </span>

                                </div>

                              </div>

                            </td>

                            <td>

                              <div className="sa-team-role">

                                <span className="sa-team-role-icon">
                                  {getRoleIcon(
                                    member.role,
                                  )}
                                </span>

                                <span>
                                  {roleLabel}
                                </span>

                              </div>

                            </td>

                            <td>

                              <span className="sa-team-permissions">
                                {permissionCount}
                                <span>
                                  permission
                                  {permissionCount !== 1
                                    ? "s"
                                    : ""}
                                </span>
                              </span>

                            </td>

                            <td>

                              {member.is_active === true ? (

                                <span className="sa-team-status sa-team-status-active">
                                  <i />
                                  Actif
                                </span>

                              ) : (

                                <span className="sa-team-status sa-team-status-inactive">
                                  <i />
                                  Inactif
                                </span>

                              )}

                            </td>

                            <td>

                              <span className="sa-team-date">
                                {formatDate(
                                  member.created_at,
                                )}
                              </span>

                            </td>

                            <td>

                              <Link
                                href={`/super-admin/equipe/${member.id}`}
                                className="sa-team-view-button"
                              >
                                Voir
                                <span>
                                  →
                                </span>
                              </Link>

                            </td>

                          </tr>
                        );
                      },
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

          {/* ==================================================
              SIDEBAR
          ================================================== */}

          <aside className="sa-team-sidebar">

            <div className="sa-team-side-card">

              <div className="sa-team-side-header">

                <div className="sa-team-side-icon">
                  ◈
                </div>

                <div>
                  <span>
                    RÉPARTITION
                  </span>

                  <h3>
                    Rôles
                  </h3>
                </div>

              </div>

              <div className="sa-team-role-list">

                {Object.entries(
                  roleCounts,
                ).map(
                  ([role, count]) => (

                    <div
                      className="sa-team-role-row"
                      key={role}
                    >

                      <div>

                        <span className="sa-team-role-mini-icon">
                          {getRoleIcon(role)}
                        </span>

                        <strong>
                          {role}
                        </strong>

                      </div>

                      <span className="sa-team-role-number">
                        {count}
                      </span>

                    </div>

                  ),
                )}

                {Object.keys(roleCounts)
                  .length === 0 && (

                  <div className="sa-team-side-empty">
                    Aucun rôle disponible.
                  </div>

                )}

              </div>

            </div>

            <div className="sa-team-side-card sa-team-security-card">

              <div className="sa-team-side-header">

                <div className="sa-team-side-icon">
                  🔐
                </div>

                <div>
                  <span>
                    SÉCURITÉ
                  </span>

                  <h3>
                    Contrôle des accès
                  </h3>
                </div>

              </div>

              <p>
                Les comptes de l'équipe
                plateforme sont distincts des
                comptes des pharmacies.
              </p>

              <div className="sa-team-security-list">

                <div>
                  <span>✓</span>
                  Rôles plateforme
                </div>

                <div>
                  <span>✓</span>
                  Permissions opérationnelles
                </div>

                <div>
                  <span>✓</span>
                  Statut d'accès
                </div>

                <div>
                  <span>✓</span>
                  Traçabilité des comptes
                </div>

              </div>

            </div>

          </aside>

        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="sa-team-footer">

          <div>

            <strong>
              PharmaFlow Africa
            </strong>

            <span>
              Administration de la plateforme
            </span>

          </div>

          <span>
            Équipe • Sécurité • Opérations
          </span>

        </footer>

      </div>

      {/* ======================================================
          STYLES
      ====================================================== */}

      <style>{`

        .sa-team-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(15, 118, 110, 0.07),
              transparent 30%
            ),
            #f5f8f8;
          color: #0f172a;
        }

        .sa-team-shell {
          width: 100%;
          max-width: 1580px;
          margin: 0 auto;
          padding: 34px 42px 60px;
        }

        .sa-team-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 30px;
        }

        .sa-team-header-left {
          min-width: 0;
        }

        .sa-team-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 22px;
          color: #64748b;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          transition: color .2s ease;
        }

        .sa-team-back:hover {
          color: #0f766e;
        }

        .sa-team-back span {
          font-size: 18px;
        }

        .sa-team-heading {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .sa-team-heading-icon {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cce8e4;
          border-radius: 16px;
          background: linear-gradient(
            145deg,
            #e8f8f5,
            #d9f0ed
          );
          color: #0f766e;
          font-size: 23px;
          box-shadow:
            0 10px 30px rgba(
              15,
              118,
              110,
              .08
            );
        }

        .sa-team-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: #0f766e;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .14em;
        }

        .sa-team-heading h1 {
          margin: 0;
          color: #0f172a;
          font-size: 31px;
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -.035em;
        }

        .sa-team-heading p {
          max-width: 720px;
          margin: 9px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.65;
        }

        .sa-team-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .sa-team-security-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border: 1px solid #dce7e6;
          border-radius: 12px;
          background: #fff;
          color: #475569;
          font-size: 12px;
          font-weight: 750;
        }

        .sa-team-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #16a34a;
          box-shadow:
            0 0 0 4px
            rgba(22, 163, 74, .10);
        }

        .sa-team-secondary-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 43px;
          padding: 0 15px;
          border-radius: 12px;
          background: #0f766e;
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          box-shadow:
            0 9px 22px rgba(
              15,
              118,
              110,
              .16
            );
          transition:
            transform .2s ease,
            box-shadow .2s ease,
            background .2s ease;
        }

        .sa-team-secondary-button:hover {
          background: #0b655e;
          transform: translateY(-1px);
          box-shadow:
            0 13px 28px rgba(
              15,
              118,
              110,
              .21
            );
        }

        .sa-team-error {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 20px;
          padding: 16px 18px;
          border: 1px solid #fecaca;
          border-radius: 15px;
          background: #fff7f7;
          color: #991b1b;
        }

        .sa-team-error-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          border-radius: 10px;
          background: #fee2e2;
          font-weight: 900;
        }

        .sa-team-error strong {
          display: block;
          font-size: 13px;
        }

        .sa-team-error p {
          margin: 3px 0 0;
          color: #b91c1c;
          font-size: 12px;
        }

        .sa-team-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 22px;
        }

        .sa-team-stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 116px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 8px 30px
            rgba(15, 23, 42, .035);
        }

        .sa-team-stat-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 44px;
          border-radius: 13px;
          background: #edf7f5;
          color: #0f766e;
          font-size: 18px;
          font-weight: 850;
        }

        .sa-team-stat-card span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
        }

        .sa-team-stat-card strong {
          display: block;
          margin-top: 3px;
          color: #0f172a;
          font-size: 25px;
          line-height: 1;
          font-weight: 850;
        }

        .sa-team-stat-card small {
          display: block;
          margin-top: 6px;
          color: #94a3b8;
          font-size: 10px;
        }

        .sa-team-stat-active .sa-team-stat-icon {
          background: #ecfdf3;
          color: #15803d;
        }

        .sa-team-content {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            320px;
          gap: 20px;
          align-items: start;
        }

        .sa-team-main-card,
        .sa-team-side-card {
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 10px 34px
            rgba(15, 23, 42, .035);
        }

        .sa-team-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 25px 20px;
          border-bottom: 1px solid #edf1f3;
        }

        .sa-team-card-eyebrow {
          color: #0f766e;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: .14em;
        }

        .sa-team-card-header h2 {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 850;
          letter-spacing: -.02em;
        }

        .sa-team-card-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .sa-team-member-count {
          padding: 9px 12px;
          border-radius: 11px;
          background: #f1f7f6;
          color: #0f766e;
          font-size: 14px;
          font-weight: 850;
          white-space: nowrap;
        }

        .sa-team-member-count span {
          margin-left: 4px;
          color: #64748b;
          font-size: 10px;
          font-weight: 650;
        }

        .sa-team-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .sa-team-table {
          width: 100%;
          min-width: 850px;
          border-collapse: collapse;
        }

        .sa-team-table th {
          padding: 13px 17px;
          border-bottom: 1px solid #edf1f3;
          background: #fafcfc;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: .08em;
          text-align: left;
          text-transform: uppercase;
        }

        .sa-team-table td {
          padding: 16px 17px;
          border-bottom: 1px solid #f0f3f4;
          vertical-align: middle;
        }

        .sa-team-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .sa-team-table tbody tr {
          transition: background .18s ease;
        }

        .sa-team-table tbody tr:hover {
          background: #fbfdfd;
        }

        .sa-team-person {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 210px;
        }

        .sa-team-avatar {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 40px;
          border: 1px solid #cfe9e5;
          border-radius: 12px;
          background: #e6f6f3;
          color: #0f766e;
          font-size: 11px;
          font-weight: 900;
        }

        .sa-team-person-info {
          min-width: 0;
        }

        .sa-team-person-info strong {
          display: block;
          max-width: 210px;
          overflow: hidden;
          color: #1e293b;
          font-size: 12px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sa-team-person-info span {
          display: block;
          max-width: 210px;
          margin-top: 3px;
          overflow: hidden;
          color: #94a3b8;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sa-team-role {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          font-size: 11px;
          font-weight: 750;
          white-space: nowrap;
        }

        .sa-team-role-icon,
        .sa-team-role-mini-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 9px;
          background: #f1f7f6;
          color: #0f766e;
          font-size: 12px;
        }

        .sa-team-permissions {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 9px;
          border-radius: 9px;
          background: #f8fafc;
          color: #334155;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .sa-team-permissions span {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 650;
        }

        .sa-team-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .sa-team-status i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .sa-team-status-active {
          background: #ecfdf3;
          color: #15803d;
        }

        .sa-team-status-active i {
          background: #16a34a;
        }

        .sa-team-status-inactive {
          background: #f8fafc;
          color: #64748b;
        }

        .sa-team-status-inactive i {
          background: #94a3b8;
        }

        .sa-team-date {
          color: #64748b;
          font-size: 10px;
          white-space: nowrap;
        }

        .sa-team-view-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #0f766e;
          text-decoration: none;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .sa-team-view-button:hover {
          text-decoration: underline;
        }

        .sa-team-view-button span {
          font-size: 15px;
        }

        .sa-team-empty {
          padding: 70px 25px;
          text-align: center;
        }

        .sa-team-empty-icon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 15px;
          border-radius: 16px;
          background: #edf7f5;
          color: #0f766e;
          font-size: 22px;
        }

        .sa-team-empty h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 850;
        }

        .sa-team-empty p {
          max-width: 360px;
          margin: 7px auto 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        .sa-team-sidebar {
          display: grid;
          gap: 20px;
        }

        .sa-team-side-card {
          padding: 21px;
        }

        .sa-team-side-header {
          display: flex;
          align-items: center;
          gap: 11px;
          padding-bottom: 17px;
          border-bottom: 1px solid #edf1f3;
        }

        .sa-team-side-icon {
          width: 39px;
          height: 39px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 39px;
          border-radius: 11px;
          background: #edf7f5;
          color: #0f766e;
          font-size: 16px;
          font-weight: 850;
        }

        .sa-team-side-header span {
          display: block;
          color: #0f766e;
          font-size: 8px;
          font-weight: 850;
          letter-spacing: .13em;
        }

        .sa-team-side-header h3 {
          margin: 3px 0 0;
          color: #0f172a;
          font-size: 15px;
          font-weight: 850;
        }

        .sa-team-role-list {
          padding-top: 7px;
        }

        .sa-team-role-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #f0f3f4;
        }

        .sa-team-role-row:last-child {
          border-bottom: 0;
        }

        .sa-team-role-row > div {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .sa-team-role-row strong {
          color: #475569;
          font-size: 11px;
          font-weight: 750;
        }

        .sa-team-role-number {
          min-width: 26px;
          padding: 4px 7px;
          border-radius: 7px;
          background: #f1f5f9;
          color: #334155;
          font-size: 10px;
          font-weight: 850;
          text-align: center;
        }

        .sa-team-side-empty {
          padding: 18px 0 4px;
          color: #94a3b8;
          font-size: 11px;
        }

        .sa-team-security-card p {
          margin: 16px 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.65;
        }

        .sa-team-security-list {
          display: grid;
          gap: 9px;
        }

        .sa-team-security-list div {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-size: 10px;
          font-weight: 700;
        }

        .sa-team-security-list span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: #ecfdf3;
          color: #15803d;
          font-size: 10px;
          font-weight: 900;
        }

        .sa-team-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #94a3b8;
          font-size: 10px;
        }

        .sa-team-footer div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sa-team-footer strong {
          color: #475569;
          font-size: 11px;
          font-weight: 800;
        }

        @media (max-width: 1100px) {

          .sa-team-shell {
            padding: 27px 25px 50px;
          }

          .sa-team-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .sa-team-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .sa-team-content {
            grid-template-columns: 1fr;
          }

          .sa-team-sidebar {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

        }

        @media (max-width: 700px) {

          .sa-team-shell {
            padding: 18px 14px 35px;
          }

          .sa-team-heading {
            gap: 11px;
          }

          .sa-team-heading-icon {
            width: 45px;
            height: 45px;
            flex-basis: 45px;
            border-radius: 13px;
            font-size: 18px;
          }

          .sa-team-heading h1 {
            font-size: 24px;
          }

          .sa-team-heading p {
            font-size: 12px;
          }

          .sa-team-header-actions {
            width: 100%;
          }

          .sa-team-security-badge,
          .sa-team-secondary-button {
            flex: 1;
            justify-content: center;
          }

          .sa-team-stats {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .sa-team-stat-card {
            min-height: 100px;
            padding: 14px;
          }

          .sa-team-stat-icon {
            width: 36px;
            height: 36px;
            flex-basis: 36px;
          }

          .sa-team-stat-card strong {
            font-size: 21px;
          }

          .sa-team-content {
            gap: 14px;
          }

          .sa-team-sidebar {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .sa-team-card-header {
            padding: 19px;
          }

          .sa-team-footer {
            align-items: flex-start;
            flex-direction: column;
          }

        }

        @media (prefers-reduced-motion: reduce) {

          .sa-team-page *,
          .sa-team-page *::before,
          .sa-team-page *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }

        }

      `}</style>

    </main>
  );
}