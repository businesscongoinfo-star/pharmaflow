import Link from "next/link";

import {
  requireSuperAdmin,
} from "@/app/lib/super-admin/auth";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

import TeamMemberActions from "./TeamMemberActions";

type TeamMember = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  permissions: Record<string, boolean> | null;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  support: "Support",
  finance: "Finance",
  technical: "Technique",
  operations: "Opérations",
  analyst: "Analyste",
  security: "Sécurité",
};

const ROLE_ICONS: Record<string, string> = {
  support: "🛟",
  finance: "💳",
  technical: "🛠️",
  operations: "🏥",
  analyst: "📊",
  security: "🛡️",
};

function getRoleLabel(role: string) {
  return ROLE_LABELS[role] || role;
}

function getRoleIcon(role: string) {
  return ROLE_ICONS[role] || "👤";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Jamais";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function countPermissions(
  permissions: Record<string, boolean> | null,
) {
  if (!permissions) {
    return 0;
  }

  return Object.values(permissions).filter(
    (value) => value === true,
  ).length;
}

function getInitials(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export default async function PlatformUsersPage() {
  await requireSuperAdmin();

  const supabase = createAdminClient();

  const {
    data,
    error,
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
        permissions,
        must_change_password,
        last_login_at,
        created_at,
        updated_at
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Impossible de récupérer l'équipe PharmaFlow : ${error.message}`,
    );
  }

  const members =
    (data as TeamMember[] | null) ?? [];

  const activeCount =
    members.filter(
      (member) => member.is_active,
    ).length;

  const inactiveCount =
    members.filter(
      (member) => !member.is_active,
    ).length;

  const supportCount =
    members.filter(
      (member) => member.role === "support",
    ).length;

  const financeCount =
    members.filter(
      (member) => member.role === "finance",
    ).length;

  const technicalCount =
    members.filter(
      (member) => member.role === "technical",
    ).length;

  const operationsCount =
    members.filter(
      (member) => member.role === "operations",
    ).length;

  const securityCount =
    members.filter(
      (member) => member.role === "security",
    ).length;

  const analystCount =
    members.filter(
      (member) => member.role === "analyst",
    ).length;

  const mustChangePasswordCount =
    members.filter(
      (member) => member.must_change_password,
    ).length;

  const configuredPasswordCount =
    members.filter(
      (member) => !member.must_change_password,
    ).length;

  const totalPermissions =
    members.reduce(
      (total, member) =>
        total +
        countPermissions(
          member.permissions,
        ),
      0,
    );

  return (
    <main className="pf-team-page">
      <div className="pf-team-container">

        {/* =====================================================
            HEADER
           ===================================================== */}

        <header className="pf-team-header">

          <div>

            <div className="pf-team-breadcrumb">

              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <span>
                Équipe
              </span>

            </div>

            <div className="pf-team-title-row">

              <div className="pf-team-title-icon">
                👥
              </div>

              <div>

                <h1>
                  Équipe PharmaFlow
                </h1>

                <p>
                  Gérez les membres de l'équipe interne,
                  leurs rôles, permissions et accès à la
                  plateforme.
                </p>

              </div>

            </div>

          </div>

          <div className="pf-team-header-actions">

            <Link
              href="/super-admin"
              className="pf-team-secondary-button"
            >
              ← Super Admin
            </Link>

            <Link
              href="/super-admin/utilisateurs/nouveau"
              className="pf-team-primary-button"
            >
              <span>＋</span>
              Ajouter un membre
            </Link>

          </div>

        </header>


        {/* =====================================================
            STATISTIQUES PRINCIPALES
           ===================================================== */}

        <section className="pf-team-stats">

          <div className="pf-team-stat-card">

            <div className="pf-team-stat-icon">
              👥
            </div>

            <div>
              <span>
                Membres
              </span>

              <strong>
                {members.length}
              </strong>
            </div>

          </div>


          <div className="pf-team-stat-card">

            <div className="pf-team-stat-icon pf-team-stat-success">
              🟢
            </div>

            <div>
              <span>
                Actifs
              </span>

              <strong>
                {activeCount}
              </strong>
            </div>

          </div>


          <div className="pf-team-stat-card">

            <div className="pf-team-stat-icon pf-team-stat-muted">
              ⚪
            </div>

            <div>
              <span>
                Inactifs
              </span>

              <strong>
                {inactiveCount}
              </strong>
            </div>

          </div>


          <div className="pf-team-stat-card">

            <div className="pf-team-stat-icon pf-team-stat-support">
              🛟
            </div>

            <div>
              <span>
                Support
              </span>

              <strong>
                {supportCount}
              </strong>
            </div>

          </div>

        </section>


        {/* =====================================================
            STATISTIQUES SECONDAIRES
           ===================================================== */}

        <section className="pf-team-mini-stats">

          <div className="pf-team-mini-card">

            <div className="pf-team-mini-icon">
              💳
            </div>

            <div>
              <span>
                Finance
              </span>

              <strong>
                {financeCount}
              </strong>
            </div>

          </div>


          <div className="pf-team-mini-card">

            <div className="pf-team-mini-icon">
              🛠️
            </div>

            <div>
              <span>
                Technique
              </span>

              <strong>
                {technicalCount}
              </strong>
            </div>

          </div>


          <div className="pf-team-mini-card">

            <div className="pf-team-mini-icon">
              🏥
            </div>

            <div>
              <span>
                Opérations
              </span>

              <strong>
                {operationsCount}
              </strong>
            </div>

          </div>


          <div className="pf-team-mini-card">

            <div className="pf-team-mini-icon">
              📊
            </div>

            <div>
              <span>
                Analystes
              </span>

              <strong>
                {analystCount}
              </strong>
            </div>

          </div>


          <div className="pf-team-mini-card">

            <div className="pf-team-mini-icon">
              🛡️
            </div>

            <div>
              <span>
                Sécurité
              </span>

              <strong>
                {securityCount}
              </strong>
            </div>

          </div>


          <div className="pf-team-mini-card">

            <div className="pf-team-mini-icon">
              🔐
            </div>

            <div>
              <span>
                Permissions
              </span>

              <strong>
                {totalPermissions}
              </strong>
            </div>

          </div>


          <div className="pf-team-mini-card">

            <div className="pf-team-mini-icon pf-team-password-warning">
              ⚠️
            </div>

            <div>
              <span>
                Mot de passe à modifier
              </span>

              <strong>
                {mustChangePasswordCount}
              </strong>
            </div>

          </div>


          <div className="pf-team-mini-card">

            <div className="pf-team-mini-icon pf-team-password-ok">
              🔒
            </div>

            <div>
              <span>
                Comptes configurés
              </span>

              <strong>
                {configuredPasswordCount}
              </strong>
            </div>

          </div>

        </section>


        {/* =====================================================
            BARRE D'OUTILS
           ===================================================== */}

        <section className="pf-team-toolbar">

          <div className="pf-team-search">

            <span>
              🔎
            </span>

            <input
              type="text"
              placeholder="Rechercher un membre..."
              disabled
              aria-label="Rechercher un membre"
            />

          </div>


          <select
            className="pf-team-filter"
            disabled
            defaultValue=""
            aria-label="Filtrer par rôle"
          >

            <option value="">
              Tous les rôles
            </option>

            <option value="support">
              Support
            </option>

            <option value="finance">
              Finance
            </option>

            <option value="technical">
              Technique
            </option>

            <option value="operations">
              Opérations
            </option>

            <option value="analyst">
              Analyste
            </option>

            <option value="security">
              Sécurité
            </option>

          </select>


          <select
            className="pf-team-filter"
            disabled
            defaultValue=""
            aria-label="Filtrer par statut"
          >

            <option value="">
              Tous les statuts
            </option>

            <option value="active">
              Actifs
            </option>

            <option value="inactive">
              Inactifs
            </option>

          </select>

        </section>


        {/* =====================================================
            TABLEAU
           ===================================================== */}

        <section className="pf-team-card">

          <div className="pf-team-card-header">

            <div>

              <h2>
                Membres de l'équipe
              </h2>

              <p>
                Administrateurs et agents internes
                de la plateforme PharmaFlow.
              </p>

            </div>

            <span className="pf-team-count">

              {members.length}

              {" "}

              membre
              {members.length !== 1
                ? "s"
                : ""}

            </span>

          </div>


          {members.length === 0 ? (

            <div className="pf-team-empty">

              <div className="pf-team-empty-icon">
                👥
              </div>

              <h3>
                Aucun membre d'équipe
              </h3>

              <p>
                Commencez par ajouter votre premier
                membre de l'équipe PharmaFlow.
              </p>

              <Link
                href="/super-admin/utilisateurs/nouveau"
                className="pf-team-primary-button"
              >
                ＋ Ajouter le premier membre
              </Link>

            </div>

          ) : (

            <div className="pf-team-table-wrapper">

              <table className="pf-team-table">

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
                      Accès
                    </th>

                    <th>
                      Dernière connexion
                    </th>

                    <th>
                      Statut
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {members.map(
                    (member) => {

                      const permissionCount =
                        countPermissions(
                          member.permissions,
                        );

                      return (
                        <tr
                          key={member.id}
                        >

                          {/* =================================================
                              MEMBRE
                             ================================================= */}

                          <td>

                            <div className="pf-team-member">

                              <div className="pf-team-avatar">
                                {getInitials(
                                  member.full_name,
                                )}
                              </div>

                              <div>

                                <strong>
                                  {member.full_name}
                                </strong>

                                <span>
                                  {member.email}
                                </span>

                                {member.phone && (
                                  <small>
                                    📱{" "}
                                    {member.phone}
                                  </small>
                                )}

                              </div>

                            </div>

                          </td>


                          {/* =================================================
                              ROLE
                             ================================================= */}

                          <td>

                            <span className="pf-team-role">

                              <span>
                                {getRoleIcon(
                                  member.role,
                                )}
                              </span>

                              {getRoleLabel(
                                member.role,
                              )}

                            </span>

                          </td>


                          {/* =================================================
                              PERMISSIONS
                             ================================================= */}

                          <td>

                            <span className="pf-team-permission-count">

                              🔐{" "}

                              {permissionCount}

                              {" "}

                              permission
                              {permissionCount !== 1
                                ? "s"
                                : ""}

                            </span>

                          </td>


                          {/* =================================================
                              ACCÈS / MOT DE PASSE
                             ================================================= */}

                          <td>

                            {member.must_change_password ? (

                              <span className="pf-team-password-status pf-team-password-pending">

                                <span className="pf-team-password-dot">
                                  ●
                                </span>

                                <span>

                                  <strong>
                                    À modifier
                                  </strong>

                                  <small>
                                    Première connexion
                                  </small>

                                </span>

                              </span>

                            ) : (

                              <span className="pf-team-password-status pf-team-password-ready">

                                <span className="pf-team-password-dot">
                                  ●
                                </span>

                                <span>

                                  <strong>
                                    Configuré
                                  </strong>

                                  <small>
                                    Mot de passe défini
                                  </small>

                                </span>

                              </span>

                            )}

                          </td>


                          {/* =================================================
                              DERNIÈRE CONNEXION
                             ================================================= */}

                          <td>

                            <span className="pf-team-date">

                              {formatDate(
                                member.last_login_at,
                              )}

                            </span>

                          </td>


                          {/* =================================================
                              STATUT
                             ================================================= */}

                          <td>

                            <span
                              className={
                                member.is_active
                                  ? "pf-team-status pf-team-status-active"
                                  : "pf-team-status pf-team-status-inactive"
                              }
                            >

                              <span>
                                ●
                              </span>

                              {member.is_active
                                ? "Actif"
                                : "Inactif"}

                            </span>

                          </td>


                          {/* =================================================
                              ACTIONS
                             ================================================= */}

                          <td>

                            <TeamMemberActions
                              id={member.id}
                              fullName={
                                member.full_name
                              }
                              isActive={
                                member.is_active
                              }
                            />

                          </td>

                        </tr>
                      );
                    },
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* =====================================================
            GUIDE DE GESTION DES MOTS DE PASSE
           ===================================================== */}

        <section className="pf-team-security-grid">

          <div className="pf-team-security-card">

            <div className="pf-team-security-card-icon">
              🔑
            </div>

            <div>

              <strong>
                Mot de passe temporaire
              </strong>

              <p>
                Lorsqu'un membre est créé avec un
                mot de passe temporaire, PharmaFlow
                marque son compte comme nécessitant
                un changement de mot de passe.
              </p>

            </div>

          </div>


          <div className="pf-team-security-card">

            <div className="pf-team-security-card-icon">
              🔒
            </div>

            <div>

              <strong>
                Changement obligatoire
              </strong>

              <p>
                Le membre doit définir son propre
                mot de passe avant de pouvoir utiliser
                normalement son espace agent.
              </p>

            </div>

          </div>


          <div className="pf-team-security-card">

            <div className="pf-team-security-card-icon">
              🛡️
            </div>

            <div>

              <strong>
                Accès indépendant
              </strong>

              <p>
                Les comptes de l'équipe sont séparés
                des comptes des pharmacies et sont
                contrôlés par les autorisations internes.
              </p>

            </div>

          </div>

        </section>


        {/* =====================================================
            FONCTIONNALITÉS
           ===================================================== */}

        <section className="pf-team-features">

          <div className="pf-team-feature-card">

            <div className="pf-team-feature-icon">
              👤
            </div>

            <div>

              <strong>
                Comptes séparés
              </strong>

              <p>
                Chaque membre possède son propre
                compte Supabase Auth et son propre
                profil interne PharmaFlow.
              </p>

            </div>

          </div>


          <div className="pf-team-feature-card">

            <div className="pf-team-feature-icon">
              🎭
            </div>

            <div>

              <strong>
                Rôles spécialisés
              </strong>

              <p>
                Support, Finance, Technique,
                Opérations, Analyste et Sécurité
                disposent de responsabilités distinctes.
              </p>

            </div>

          </div>


          <div className="pf-team-feature-card">

            <div className="pf-team-feature-icon">
              🔐
            </div>

            <div>

              <strong>
                Permissions granulaires
              </strong>

              <p>
                Les permissions déterminent les
                fonctionnalités auxquelles chaque
                agent peut accéder.
              </p>

            </div>

          </div>

        </section>


        {/* =====================================================
            INFORMATION SÉCURITÉ
           ===================================================== */}

        <section className="pf-team-info">

          <div className="pf-team-info-icon">
            🔐
          </div>

          <div>

            <strong>
              Gestion sécurisée de l'équipe
            </strong>

            <p>
              Les opérations sensibles de l'équipe
              passent par les routes serveur protégées
              du Super Admin. Les mots de passe ne sont
              jamais enregistrés dans
              <code>
                platform_team_members
              </code>
              . Un mot de passe temporaire est uniquement
              communiqué au Super Admin lors de la création
              du compte et doit ensuite être remplacé par
              le membre.
            </p>

          </div>

        </section>

      </div>


      <style>{`

        /* =====================================================
           PAGE
           ===================================================== */

        .pf-team-page {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 32px;
          color: #111827;
        }

        .pf-team-container {
          width: 100%;
          max-width: 1550px;
          margin: 0 auto;
        }


        /* =====================================================
           HEADER
           ===================================================== */

        .pf-team-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 28px;
        }

        .pf-team-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: #8a94a6;
          font-size: 13px;
        }

        .pf-team-breadcrumb a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 700;
        }

        .pf-team-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pf-team-title-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eaf2ff;
          font-size: 28px;
          flex-shrink: 0;
        }

        .pf-team-header h1 {
          margin: 0;
          font-size: 32px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.6px;
        }

        .pf-team-header p {
          margin: 8px 0 0;
          color: #687386;
          font-size: 15px;
          line-height: 1.55;
        }

        .pf-team-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }


        /* =====================================================
           BUTTONS
           ===================================================== */

        .pf-team-primary-button,
        .pf-team-secondary-button {
          min-height: 44px;
          padding: 0 17px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .pf-team-primary-button {
          color: #fff;
          background: #2563eb;
          box-shadow:
            0 7px 18px rgba(37, 99, 235, 0.18);
        }

        .pf-team-primary-button:hover {
          transform: translateY(-1px);
          background: #1d4ed8;
        }

        .pf-team-secondary-button {
          color: #374151;
          background: #fff;
          border: 1px solid #dce2ea;
        }

        .pf-team-secondary-button:hover {
          background: #f8fafc;
        }


        /* =====================================================
           STATS
           ===================================================== */

        .pf-team-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .pf-team-stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 100px;
          padding: 20px;
          background: #fff;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          box-shadow:
            0 6px 22px rgba(15, 23, 42, 0.04);
        }

        .pf-team-stat-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #eef4ff;
          font-size: 21px;
          flex-shrink: 0;
        }

        .pf-team-stat-success {
          background: #ecfdf3;
        }

        .pf-team-stat-muted {
          background: #f3f4f6;
        }

        .pf-team-stat-support {
          background: #f4efff;
        }

        .pf-team-stat-card span {
          display: block;
          margin-bottom: 4px;
          color: #7a8495;
          font-size: 12px;
          font-weight: 600;
        }

        .pf-team-stat-card strong {
          display: block;
          color: #111827;
          font-size: 25px;
          line-height: 1;
        }


        /* =====================================================
           MINI STATS
           ===================================================== */

        .pf-team-mini-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .pf-team-mini-card {
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 74px;
          padding: 14px 16px;
          border: 1px solid #e7ebf0;
          border-radius: 13px;
          background: #fff;
        }

        .pf-team-mini-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #f4f6f9;
          font-size: 17px;
          flex-shrink: 0;
        }

        .pf-team-mini-card span {
          display: block;
          color: #7b8494;
          font-size: 10px;
          font-weight: 650;
        }

        .pf-team-mini-card strong {
          display: block;
          margin-top: 3px;
          color: #202733;
          font-size: 15px;
          font-weight: 800;
        }

        .pf-team-password-warning {
          background: #fff7ed;
        }

        .pf-team-password-ok {
          background: #ecfdf3;
        }


        /* =====================================================
           TOOLBAR
           ===================================================== */

        .pf-team-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .pf-team-search {
          flex: 1;
          min-width: 220px;
          height: 46px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          background: #fff;
          border: 1px solid #dfe4eb;
          border-radius: 11px;
        }

        .pf-team-search input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: #374151;
          font: inherit;
        }

        .pf-team-search input::placeholder {
          color: #98a2b3;
        }

        .pf-team-filter {
          height: 46px;
          min-width: 170px;
          padding: 0 13px;
          border: 1px solid #dfe4eb;
          border-radius: 11px;
          background: #fff;
          color: #667085;
          font: inherit;
        }


        /* =====================================================
           TABLE CARD
           ===================================================== */

        .pf-team-card {
          overflow: hidden;
          background: #fff;
          border: 1px solid #e6eaf0;
          border-radius: 17px;
          box-shadow:
            0 8px 28px rgba(15, 23, 42, 0.045);
        }

        .pf-team-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 24px;
          border-bottom: 1px solid #edf0f4;
        }

        .pf-team-card-header h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
        }

        .pf-team-card-header p {
          margin: 5px 0 0;
          color: #7b8494;
          font-size: 13px;
        }

        .pf-team-count {
          padding: 7px 11px;
          border-radius: 999px;
          background: #f2f5f9;
          color: #667085;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }


        /* =====================================================
           TABLE
           ===================================================== */

        .pf-team-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .pf-team-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1250px;
        }

        .pf-team-table th {
          padding: 13px 20px;
          background: #fafbfc;
          border-bottom: 1px solid #e9edf2;
          color: #7b8494;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .pf-team-table td {
          padding: 17px 20px;
          border-bottom: 1px solid #edf0f4;
          vertical-align: middle;
          font-size: 13px;
        }

        .pf-team-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .pf-team-table tbody tr:hover {
          background: #fafcff;
        }


        /* =====================================================
           MEMBER
           ===================================================== */

        .pf-team-member {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 250px;
        }

        .pf-team-avatar {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #eaf2ff;
          color: #2563eb;
          font-size: 14px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .pf-team-member strong {
          display: block;
          color: #202733;
          font-size: 13px;
        }

        .pf-team-member span,
        .pf-team-member small {
          display: block;
          margin-top: 3px;
          color: #7b8494;
          font-size: 11px;
        }


        /* =====================================================
           ROLE
           ===================================================== */

        .pf-team-role {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 9px;
          background: #f5f7fa;
          color: #394150;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }


        /* =====================================================
           PERMISSIONS
           ===================================================== */

        .pf-team-permission-count {
          color: #526071;
          font-weight: 700;
          white-space: nowrap;
        }


        /* =====================================================
           PASSWORD STATUS
           ===================================================== */

        .pf-team-password-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 135px;
          padding: 7px 10px;
          border-radius: 10px;
        }

        .pf-team-password-status strong {
          display: block;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-team-password-status small {
          display: block;
          margin-top: 2px;
          font-size: 9px;
          line-height: 1.2;
        }

        .pf-team-password-dot {
          font-size: 10px;
        }

        .pf-team-password-pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .pf-team-password-pending small {
          color: #ea580c;
        }

        .pf-team-password-ready {
          background: #ecfdf3;
          color: #15803d;
        }

        .pf-team-password-ready small {
          color: #16a34a;
        }


        /* =====================================================
           DATE
           ===================================================== */

        .pf-team-date {
          color: #687386;
          font-size: 12px;
          white-space: nowrap;
        }


        /* =====================================================
           STATUS
           ===================================================== */

        .pf-team-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .pf-team-status-active {
          background: #ecfdf3;
          color: #15803d;
        }

        .pf-team-status-inactive {
          background: #f3f4f6;
          color: #6b7280;
        }


        /* =====================================================
           SECURITY GRID
           ===================================================== */

        .pf-team-security-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .pf-team-security-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 17px;
          border: 1px solid #e5e9ef;
          border-radius: 14px;
          background: #fff;
        }

        .pf-team-security-card-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #eef4ff;
          font-size: 18px;
          flex-shrink: 0;
        }

        .pf-team-security-card strong {
          display: block;
          color: #26303f;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-team-security-card p {
          margin: 5px 0 0;
          color: #7b8494;
          font-size: 11px;
          line-height: 1.55;
        }


        /* =====================================================
           FEATURES
           ===================================================== */

        .pf-team-features {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .pf-team-feature-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 17px;
          border: 1px solid #e5e9ef;
          border-radius: 14px;
          background: #fff;
        }

        .pf-team-feature-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #f1f5f9;
          font-size: 18px;
          flex-shrink: 0;
        }

        .pf-team-feature-card strong {
          display: block;
          color: #26303f;
          font-size: 12px;
          font-weight: 800;
        }

        .pf-team-feature-card p {
          margin: 5px 0 0;
          color: #7b8494;
          font-size: 11px;
          line-height: 1.55;
        }


        /* =====================================================
           INFO
           ===================================================== */

        .pf-team-info {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-top: 18px;
          padding: 17px 19px;
          border: 1px solid #dbe8ff;
          border-radius: 14px;
          background: #f5f9ff;
        }

        .pf-team-info-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .pf-team-info strong {
          display: block;
          color: #1f3b68;
          font-size: 13px;
        }

        .pf-team-info p {
          margin: 5px 0 0;
          color: #60708a;
          font-size: 12px;
          line-height: 1.6;
        }

        .pf-team-info code {
          margin: 0 3px;
          padding: 2px 5px;
          border-radius: 5px;
          background: #e8f0ff;
          color: #2454a6;
          font-family: monospace;
          font-size: 10px;
        }


        /* =====================================================
           EMPTY
           ===================================================== */

        .pf-team-empty {
          padding: 75px 25px;
          text-align: center;
        }

        .pf-team-empty-icon {
          width: 68px;
          height: 68px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: #eef4ff;
          font-size: 30px;
        }

        .pf-team-empty h3 {
          margin: 0;
          color: #202733;
          font-size: 19px;
          font-weight: 800;
        }

        .pf-team-empty p {
          max-width: 440px;
          margin: 8px auto 20px;
          color: #7b8494;
          font-size: 13px;
          line-height: 1.6;
        }


        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 1250px) {

          .pf-team-mini-stats {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .pf-team-security-grid {
            grid-template-columns: 1fr;
          }

        }


        @media (max-width: 1150px) {

          .pf-team-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .pf-team-mini-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .pf-team-header {
            flex-direction: column;
          }

          .pf-team-header-actions {
            width: 100%;
          }

        }


        @media (max-width: 800px) {

          .pf-team-features {
            grid-template-columns: 1fr;
          }

          .pf-team-toolbar {
            flex-wrap: wrap;
          }

          .pf-team-search {
            flex: 1 1 100%;
          }

          .pf-team-filter {
            flex: 1;
          }

        }


        @media (max-width: 700px) {

          .pf-team-page {
            padding: 18px 14px;
          }

          .pf-team-header h1 {
            font-size: 25px;
          }

          .pf-team-header p {
            font-size: 13px;
          }

          .pf-team-title-icon {
            width: 50px;
            height: 50px;
            font-size: 24px;
          }

          .pf-team-title-row {
            align-items: flex-start;
          }

          .pf-team-stats {
            grid-template-columns: 1fr;
          }

          .pf-team-mini-stats {
            grid-template-columns: 1fr;
          }

          .pf-team-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .pf-team-search {
            width: 100%;
          }

          .pf-team-filter {
            width: 100%;
          }

          .pf-team-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .pf-team-primary-button,
          .pf-team-secondary-button {
            width: 100%;
          }

          .pf-team-card-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .pf-team-security-grid {
            grid-template-columns: 1fr;
          }

          .pf-team-info {
            padding: 15px;
          }

        }

      `}</style>

    </main>
  );
}