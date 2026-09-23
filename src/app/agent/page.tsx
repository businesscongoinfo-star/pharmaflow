import Link from "next/link";

import { requireAgent } from "@/app/lib/agent/auth";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type AgentRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

type AgentCardProps = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

/*
|--------------------------------------------------------------------------
| CONFIGURATION DES RÔLES
|--------------------------------------------------------------------------
*/

const ROLE_LABELS: Record<AgentRole, string> = {
  support: "Support",
  finance: "Finance",
  technical: "Technique",
  operations: "Opérations",
  analyst: "Analyste",
  security: "Sécurité",
};

const ROLE_ICONS: Record<AgentRole, string> = {
  support: "🛟",
  finance: "💳",
  technical: "🛠️",
  operations: "🏥",
  analyst: "📊",
  security: "🛡️",
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function hasPermission(
  permissions: Record<string, boolean>,
  permission: string,
): boolean {
  return permissions?.[permission] === true;
}

function normalizeRole(role: string): AgentRole {
  const allowedRoles: AgentRole[] = [
    "support",
    "finance",
    "technical",
    "operations",
    "analyst",
    "security",
  ];

  return allowedRoles.includes(role as AgentRole)
    ? (role as AgentRole)
    : "support";
}

/*
|--------------------------------------------------------------------------
| PAGE AGENT
|--------------------------------------------------------------------------
*/

export default async function AgentPage() {
  /*
  |--------------------------------------------------------------------------
  | AUTHENTIFICATION
  |--------------------------------------------------------------------------
  |
  | requireAgent() vérifie notamment :
  |
  | 1. utilisateur Supabase connecté
  | 2. membre présent dans platform_team_members
  | 3. membre actif
  | 4. éventuel changement obligatoire du mot de passe
  |
  */

  const member = await requireAgent();

  /*
  |--------------------------------------------------------------------------
  | DONNÉES DU MEMBRE
  |--------------------------------------------------------------------------
  */

  const permissions =
    member.permissions ?? {};

  const role = normalizeRole(
    String(member.role ?? "support"),
  );

  const firstName =
    member.full_name
      ?.trim()
      .split(/\s+/)[0] || "Membre";

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS SUPPORT
  |--------------------------------------------------------------------------
  */

  const canSupport = hasPermission(
    permissions,
    "support.view",
  );

  const canSupportManage = hasPermission(
    permissions,
    "support.manage",
  );

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS PHARMACIES
  |--------------------------------------------------------------------------
  */

  const canPharmacies = hasPermission(
    permissions,
    "pharmacies.view",
  );

  const canPharmaciesManage = hasPermission(
    permissions,
    "pharmacies.manage",
  );

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS ABONNEMENTS
  |--------------------------------------------------------------------------
  */

  const canSubscriptions = hasPermission(
    permissions,
    "subscriptions.view",
  );

  const canSubscriptionsManage = hasPermission(
    permissions,
    "subscriptions.manage",
  );

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS PAIEMENTS
  |--------------------------------------------------------------------------
  */

  const canPayments = hasPermission(
    permissions,
    "payments.view",
  );

  const canPaymentsManage = hasPermission(
    permissions,
    "payments.manage",
  );

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS TECHNIQUES
  |--------------------------------------------------------------------------
  */

  const canTechnical = hasPermission(
    permissions,
    "technical.view",
  );

  const canTechnicalManage = hasPermission(
    permissions,
    "technical.manage",
  );

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS ANALYTIQUES
  |--------------------------------------------------------------------------
  */

  const canAnalytics = hasPermission(
    permissions,
    "analytics.view",
  );

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS SÉCURITÉ
  |--------------------------------------------------------------------------
  */

  const canSecurity = hasPermission(
    permissions,
    "security.view",
  );

  const canSecurityManage = hasPermission(
    permissions,
    "security.manage",
  );

  /*
  |--------------------------------------------------------------------------
  | MODULES DISPONIBLES
  |--------------------------------------------------------------------------
  */

  const hasAnyModule =
    canSupport ||
    canPharmacies ||
    canSubscriptions ||
    canPayments ||
    canTechnical ||
    canAnalytics ||
    canSecurity;

  /*
  |--------------------------------------------------------------------------
  | RENDU
  |--------------------------------------------------------------------------
  */

  return (
    <main className="pf-agent-page">
      {/* ================================================================
          HEADER
      ================================================================ */}

      <header className="pf-agent-header">
        <div className="pf-agent-brand">
          <div className="pf-agent-logo">
            P
          </div>

          <div className="pf-agent-brand-text">
            <strong>
              PharmaFlow
            </strong>

            <span>
              Centre opérationnel
            </span>
          </div>
        </div>

        <div className="pf-agent-profile">
          <div className="pf-agent-avatar">
            {firstName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="pf-agent-profile-text">
            <strong>
              {member.full_name}
            </strong>

            <span>
              {ROLE_ICONS[role]}{" "}
              {ROLE_LABELS[role]}
            </span>
          </div>
        </div>
      </header>

      {/* ================================================================
          CONTENU PRINCIPAL
      ================================================================ */}

      <section className="pf-agent-content">
        {/* ============================================================
            BIENVENUE
        ============================================================ */}

        <div className="pf-agent-welcome">
          <div>
            <span className="pf-agent-eyebrow">
              ESPACE ÉQUIPE PHARMAFLOW
            </span>

            <h1>
              Bonjour {firstName} 👋
            </h1>

            <p>
              Retrouvez ici les outils auxquels
              votre compte PharmaFlow a accès.
            </p>
          </div>

          <div className="pf-agent-role">
            <span>
              Rôle attribué
            </span>

            <strong>
              {ROLE_ICONS[role]}{" "}
              {ROLE_LABELS[role]}
            </strong>
          </div>
        </div>

        {/* ============================================================
            MODULES
        ============================================================ */}

        {hasAnyModule ? (
          <div className="pf-agent-grid">
            {/* --------------------------------------------------------
                SUPPORT
            -------------------------------------------------------- */}

            {canSupport ? (
              <AgentCard
                icon="🛟"
                title="Support & Réclamations"
                description={
                  canSupportManage
                    ? "Gérer les demandes des pharmacies, répondre aux clients et traiter les réclamations."
                    : "Consulter les demandes des pharmacies et les réclamations autorisées."
                }
                href="/agent/support"
              />
            ) : null}

            {/* --------------------------------------------------------
                PHARMACIES
            -------------------------------------------------------- */}

            {canPharmacies ? (
              <AgentCard
                icon="🏥"
                title="Pharmacies"
                description={
                  canPharmaciesManage
                    ? "Consulter et gérer les pharmacies selon les permissions attribuées."
                    : "Consulter les pharmacies auxquelles votre compte a accès."
                }
                href="/agent/pharmacies"
              />
            ) : null}

            {/* --------------------------------------------------------
                ABONNEMENTS
            -------------------------------------------------------- */}

            {canSubscriptions ? (
              <AgentCard
                icon="📅"
                title="Abonnements"
                description={
                  canSubscriptionsManage
                    ? "Consulter et gérer les abonnements des pharmacies."
                    : "Consulter l'état des abonnements."
                }
                href="/agent/abonnements"
              />
            ) : null}

            {/* --------------------------------------------------------
                PAIEMENTS
            -------------------------------------------------------- */}

            {canPayments ? (
              <AgentCard
                icon="💳"
                title="Paiements"
                description={
                  canPaymentsManage
                    ? "Consulter et gérer les opérations de paiement autorisées."
                    : "Consulter les paiements et informations financières autorisées."
                }
                href="/agent/paiements"
              />
            ) : null}

            {/* --------------------------------------------------------
                TECHNIQUE
            -------------------------------------------------------- */}

            {canTechnical ? (
              <AgentCard
                icon="🛠️"
                title="Technique"
                description={
                  canTechnicalManage
                    ? "Gérer les incidents et problèmes techniques de PharmaFlow."
                    : "Consulter les incidents et problèmes techniques."
                }
                href="/agent/technique"
              />
            ) : null}

            {/* --------------------------------------------------------
                ANALYTIQUE
            -------------------------------------------------------- */}

            {canAnalytics ? (
              <AgentCard
                icon="📊"
                title="Analytique"
                description="Consulter les statistiques et rapports autorisés."
                href="/agent/analytique"
              />
            ) : null}

            {/* --------------------------------------------------------
                SÉCURITÉ
            -------------------------------------------------------- */}

            {canSecurity ? (
              <AgentCard
                icon="🛡️"
                title="Sécurité"
                description={
                  canSecurityManage
                    ? "Consulter et gérer les éléments de sécurité autorisés."
                    : "Consulter les informations de sécurité autorisées."
                }
                href="/agent/securite"
              />
            ) : null}
          </div>
        ) : (
          /* ============================================================
             AUCUN MODULE
          ============================================================ */

          <div className="pf-agent-empty">
            <div className="pf-agent-empty-icon">
              🔐
            </div>

            <h2>
              Aucun module disponible
            </h2>

            <p>
              Votre compte est actif, mais aucune
              permission fonctionnelle ne lui a
              encore été attribuée.
            </p>

            <p>
              Contactez un Super Admin pour obtenir
              les accès nécessaires.
            </p>
          </div>
        )}

        {/* ============================================================
            INFORMATIONS DU COMPTE
        ============================================================ */}

        <div className="pf-agent-account">
          <div className="pf-agent-account-icon">
            👤
          </div>

          <div className="pf-agent-account-content">
            <strong>
              Votre compte
            </strong>

            <div className="pf-agent-account-grid">
              <div>
                <span>
                  Nom
                </span>

                <strong>
                  {member.full_name}
                </strong>
              </div>

              <div>
                <span>
                  Email
                </span>

                <strong>
                  {member.email}
                </strong>
              </div>

              <div>
                <span>
                  Fonction
                </span>

                <strong>
                  {ROLE_ICONS[role]}{" "}
                  {ROLE_LABELS[role]}
                </strong>
              </div>

              <div>
                <span>
                  Statut
                </span>

                <strong className="pf-agent-status">
                  ● Actif
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            SÉCURITÉ
        ============================================================ */}

        <div className="pf-agent-security">
          <div className="pf-agent-security-icon">
            🔐
          </div>

          <div>
            <strong>
              Accès contrôlé par permissions
            </strong>

            <p>
              Les fonctionnalités visibles dans cet
              espace dépendent des permissions
              attribuées à votre compte par un
              Super Admin.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
      ================================================================ */}

      <footer className="pf-agent-footer">
        <span>
          PharmaFlow — Centre opérationnel
        </span>

        <span>
          Accès sécurisé
        </span>
      </footer>

      {/* ================================================================
          STYLES
      ================================================================ */}

      <style>{`
        .pf-agent-page {
          min-height: 100vh;
          background: #f6f8fb;
          color: #172033;
        }

        .pf-agent-header {
          min-height: 76px;
          padding: 14px 32px;
          background: #ffffff;
          border-bottom: 1px solid #e6eaf0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          box-sizing: border-box;
        }

        .pf-agent-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .pf-agent-logo {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          background: #0f766e;
          color: #ffffff;
          font-size: 19px;
          font-weight: 800;
        }

        .pf-agent-brand-text,
        .pf-agent-profile-text {
          min-width: 0;
        }

        .pf-agent-brand-text strong {
          display: block;
          color: #172033;
          font-size: 15px;
          font-weight: 800;
        }

        .pf-agent-brand-text span {
          display: block;
          margin-top: 3px;
          color: #7a8597;
          font-size: 11px;
        }

        .pf-agent-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .pf-agent-avatar {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e8f5f3;
          color: #0f766e;
          font-size: 14px;
          font-weight: 800;
        }

        .pf-agent-profile-text strong {
          display: block;
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #273142;
          font-size: 13px;
        }

        .pf-agent-profile-text span {
          display: block;
          margin-top: 3px;
          color: #7a8597;
          font-size: 11px;
        }

        .pf-agent-content {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 36px 0 28px;
          box-sizing: border-box;
        }

        .pf-agent-welcome {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .pf-agent-eyebrow {
          display: inline-block;
          color: #0f766e;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.9px;
        }

        .pf-agent-welcome h1 {
          margin: 7px 0 5px;
          color: #172033;
          font-size: 30px;
          line-height: 1.2;
          letter-spacing: -0.7px;
        }

        .pf-agent-welcome p {
          margin: 0;
          color: #697586;
          font-size: 14px;
          line-height: 1.6;
        }

        .pf-agent-role {
          min-width: 180px;
          padding: 14px 16px;
          background: #ffffff;
          border: 1px solid #e5eaf0;
          border-radius: 15px;
          box-sizing: border-box;
        }

        .pf-agent-role span {
          display: block;
          color: #8a94a6;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pf-agent-role strong {
          display: block;
          margin-top: 5px;
          color: #273142;
          font-size: 13px;
        }

        .pf-agent-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .pf-agent-card {
          display: block;
          min-height: 190px;
          padding: 22px;
          background: #ffffff;
          border: 1px solid #e4e9ef;
          border-radius: 18px;
          color: inherit;
          text-decoration: none;
          box-sizing: border-box;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            border-color 0.15s ease;
        }

        .pf-agent-card:hover {
          transform: translateY(-2px);
          border-color: #cddbd9;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
        }

        .pf-agent-card-icon {
          width: 46px;
          height: 46px;
          margin-bottom: 16px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: #f0fdf4;
          font-size: 22px;
        }

        .pf-agent-card strong {
          display: block;
          color: #273142;
          font-size: 15px;
          line-height: 1.35;
        }

        .pf-agent-card p {
          margin: 8px 0 0;
          color: #718096;
          font-size: 12px;
          line-height: 1.6;
        }

        .pf-agent-empty {
          padding: 34px 24px;
          background: #ffffff;
          border: 1px solid #e4e9ef;
          border-radius: 18px;
          text-align: center;
          box-sizing: border-box;
        }

        .pf-agent-empty-icon {
          font-size: 30px;
        }

        .pf-agent-empty h2 {
          margin: 10px 0 5px;
          color: #273142;
          font-size: 18px;
        }

        .pf-agent-empty p {
          margin: 4px 0;
          color: #718096;
          font-size: 13px;
          line-height: 1.6;
        }

        .pf-agent-account {
          margin-top: 20px;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 18px;
          background: #ffffff;
          border: 1px solid #e5eaf0;
          border-radius: 17px;
          box-sizing: border-box;
        }

        .pf-agent-account-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #eef6ff;
          font-size: 19px;
        }

        .pf-agent-account-content {
          flex: 1;
          min-width: 0;
        }

        .pf-agent-account-content > strong {
          display: block;
          color: #273142;
          font-size: 13px;
        }

        .pf-agent-account-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .pf-agent-account-grid > div {
          min-width: 0;
        }

        .pf-agent-account-grid span {
          display: block;
          color: #8a94a6;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .pf-agent-account-grid strong {
          display: block;
          margin-top: 4px;
          color: #344054;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pf-agent-status {
          color: #15803d !important;
        }

        .pf-agent-security {
          margin-top: 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 15px;
          background: #ffffff;
          border: 1px solid #e5eaf0;
          border-radius: 15px;
          box-sizing: border-box;
        }

        .pf-agent-security-icon {
          flex: 0 0 auto;
          font-size: 19px;
        }

        .pf-agent-security strong {
          display: block;
          color: #344054;
          font-size: 13px;
        }

        .pf-agent-security p {
          margin: 4px 0 0;
          color: #718096;
          font-size: 12px;
          line-height: 1.55;
        }

        .pf-agent-footer {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 20px 0 30px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          color: #98a2b3;
          font-size: 11px;
          border-top: 1px solid #e7ebef;
          box-sizing: border-box;
        }

        @media (max-width: 980px) {
          .pf-agent-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pf-agent-account-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .pf-agent-header {
            padding: 13px 16px;
          }

          .pf-agent-profile-text {
            display: none;
          }

          .pf-agent-content {
            width: min(calc(100% - 28px), 1180px);
            padding-top: 26px;
          }

          .pf-agent-welcome {
            align-items: stretch;
            flex-direction: column;
          }

          .pf-agent-welcome h1 {
            font-size: 26px;
          }

          .pf-agent-role {
            min-width: 0;
          }

          .pf-agent-footer {
            width: min(calc(100% - 28px), 1180px);
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .pf-agent-grid {
            grid-template-columns: 1fr;
          }

          .pf-agent-account-grid {
            grid-template-columns: 1fr;
          }

          .pf-agent-card {
            min-height: 160px;
          }

          .pf-agent-logo {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
          }

          .pf-agent-brand-text span {
            display: none;
          }

          .pf-agent-security {
            padding: 14px;
          }
        }
      `}</style>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| COMPOSANT CARTE
|--------------------------------------------------------------------------
*/

function AgentCard({
  icon,
  title,
  description,
  href,
}: AgentCardProps) {
  return (
    <Link
      href={href}
      className="pf-agent-card"
    >
      <div className="pf-agent-card-icon">
        {icon}
      </div>

      <strong>
        {title}
      </strong>

      <p>
        {description}
      </p>
    </Link>
  );
}