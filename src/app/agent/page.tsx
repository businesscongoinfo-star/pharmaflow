import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

type AgentRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

type PlatformTeamMember = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AgentRole;
  is_active: boolean;
  permissions: Record<string, boolean>;
  created_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type AgentCardProps = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

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

function hasPermission(
  member: PlatformTeamMember,
  permission: string,
): boolean {
  return (
    member.is_active === true &&
    member.permissions?.[permission] === true
  );
}

export default async function AgentPage() {
  const supabase = await createClient();

  /*
   * --------------------------------------------------
   * UTILISATEUR CONNECTÉ
   * --------------------------------------------------
   */

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?redirect=/agent");
  }

  /*
   * --------------------------------------------------
   * MEMBRE DE L'ÉQUIPE PHARMAFLOW
   * --------------------------------------------------
   */

  const {
    data: memberData,
    error: memberError,
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
        created_by,
        last_login_at,
        created_at,
        updated_at
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    memberError ||
    !memberData ||
    memberData.is_active !== true
  ) {
    redirect("/login?redirect=/agent");
  }

  /*
   * --------------------------------------------------
   * NORMALISATION DU MEMBRE
   * --------------------------------------------------
   */

  const member =
    memberData as PlatformTeamMember;

  const role = member.role;

  const canSupport = hasPermission(
    member,
    "support.view",
  );

  const canPharmacies = hasPermission(
    member,
    "pharmacies.view",
  );

  const canSubscriptions = hasPermission(
    member,
    "subscriptions.view",
  );

  const canPayments = hasPermission(
    member,
    "payments.view",
  );

  const canTechnical = hasPermission(
    member,
    "technical.view",
  );

  const canAnalytics = hasPermission(
    member,
    "analytics.view",
  );

  const firstName =
    member.full_name
      ?.trim()
      .split(/\s+/)[0] || "Membre";

  const hasAnyModule =
    canSupport ||
    canPharmacies ||
    canSubscriptions ||
    canPayments ||
    canTechnical ||
    canAnalytics;

  return (
    <main className="pf-agent-page">
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

      <section className="pf-agent-content">
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

        {hasAnyModule ? (
          <div className="pf-agent-grid">
            {canSupport ? (
              <AgentCard
                icon="🛟"
                title="Support & Réclamations"
                description="Consulter les demandes des pharmacies, répondre aux clients et suivre les réclamations."
                href="/agent/support"
              />
            ) : null}

            {canPharmacies ? (
              <AgentCard
                icon="🏥"
                title="Pharmacies"
                description="Consulter les pharmacies et effectuer les opérations autorisées."
                href="/agent/pharmacies"
              />
            ) : null}

            {canSubscriptions ? (
              <AgentCard
                icon="📅"
                title="Abonnements"
                description="Consulter les abonnements et leur état."
                href="/agent/abonnements"
              />
            ) : null}

            {canPayments ? (
              <AgentCard
                icon="💳"
                title="Paiements"
                description="Consulter les paiements et les informations financières autorisées."
                href="/agent/paiements"
              />
            ) : null}

            {canTechnical ? (
              <AgentCard
                icon="🛠️"
                title="Technique"
                description="Consulter les problèmes techniques et les incidents de la plateforme."
                href="/agent/technique"
              />
            ) : null}

            {canAnalytics ? (
              <AgentCard
                icon="📊"
                title="Analytique"
                description="Consulter les statistiques et rapports autorisés."
                href="/agent/analytique"
              />
            ) : null}
          </div>
        ) : (
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

      <footer className="pf-agent-footer">
        <span>
          PharmaFlow — Centre opérationnel
        </span>

        <span>
          Accès sécurisé
        </span>
      </footer>

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
          max-width: 220px;
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