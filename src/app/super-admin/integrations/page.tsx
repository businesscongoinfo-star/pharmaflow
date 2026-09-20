import Link from "next/link";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";

type Integration = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: "active" | "available";
  environment: string;
  features: string[];
};

const integrations: Integration[] = [
  {
    id: "moko-afrika",
    name: "Moko Afrika",
    description:
      "Paiements Mobile Money et intégrations de paiement pour les transactions prises en charge.",
    category: "Paiements",
    icon: "💳",
    status: "active",
    environment: "Sandbox / Production",
    features: [
      "Mobile Money",
      "Vérification des paiements",
      "Webhooks",
      "Suivi des transactions",
    ],
  },

  {
    id: "yabetoo",
    name: "Yabétoo",
    description:
      "Solution de paiement Mobile Money destinée aux transactions prises en charge par PharmaFlow.",
    category: "Paiements",
    icon: "📱",
    status: "active",
    environment: "Sandbox / Production",
    features: [
      "Mobile Money",
      "Payment Intent",
      "Confirmation",
      "Vérification du statut",
    ],
  },

  {
    id: "gofreshpay",
    name: "GoFreshPay",
    description:
      "Passerelle de paiement utilisée pour les transactions et vérifications prises en charge.",
    category: "Paiements",
    icon: "💰",
    status: "active",
    environment: "Sandbox / Production",
    features: [
      "Paiement",
      "Vérification",
      "Callback",
      "Sécurisation des transactions",
    ],
  },

  {
    id: "supabase",
    name: "Supabase",
    description:
      "Infrastructure principale de PharmaFlow pour l'authentification, la base de données et les services backend.",
    category: "Infrastructure",
    icon: "⚡",
    status: "active",
    environment: "Production",
    features: [
      "Authentification",
      "Base de données",
      "Sessions",
      "API",
      "Sécurité",
    ],
  },

  {
    id: "nextjs",
    name: "Next.js",
    description:
      "Framework principal utilisé pour l'application PharmaFlow.",
    category: "Infrastructure",
    icon: "▲",
    status: "active",
    environment: "Production",
    features: [
      "Application Web",
      "API Routes",
      "Server Components",
      "Sécurité serveur",
    ],
  },
];

function getCategoryIcon(category: string) {
  switch (category) {
    case "Paiements":
      return "💳";

    case "Infrastructure":
      return "⚙️";

    case "Communication":
      return "💬";

    case "Sécurité":
      return "🛡️";

    default:
      return "🔌";
  }
}

function getCategoryCount(category: string) {
  return integrations.filter(
    (item) => item.category === category,
  ).length;
}

export default async function SuperAdminIntegrationsPage() {
  const admin = await requireSuperAdmin();

  const activeIntegrations = integrations.filter(
    (item) => item.status === "active",
  );

  const categories = Array.from(
    new Set(
      integrations.map(
        (item) => item.category,
      ),
    ),
  );

  return (
    <main className="integrations-page">

      {/* HEADER */}
      <header className="integrations-header">

        <div className="header-left">

          <Link
            href="/super-admin"
            className="back-link"
          >
            ← Retour au Super Admin
          </Link>

          <div className="title-row">

            <div className="title-icon">
              🔌
            </div>

            <div>
              <h1>
                Intégrations
              </h1>

              <p>
                Gérez les services et connexions
                utilisés par PharmaFlow.
              </p>
            </div>

          </div>

        </div>

        <div className="admin-box">

          <div className="admin-avatar">
            {(admin.full_name ?? "SA")
              .trim()
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {admin.full_name ??
                "Super Administrateur"}
            </strong>

            <span>
              Super Administrateur
            </span>
          </div>

        </div>

      </header>

      {/* CONTENU */}
      <section className="integrations-content">

        {/* STATISTIQUES */}
        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon">
              🔌
            </div>

            <div>
              <strong>
                {integrations.length}
              </strong>

              <span>
                Intégrations
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              ✓
            </div>

            <div>
              <strong>
                {activeIntegrations.length}
              </strong>

              <span>
                Actives
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              💳
            </div>

            <div>
              <strong>
                {getCategoryCount("Paiements")}
              </strong>

              <span>
                Paiements
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ⚙️
            </div>

            <div>
              <strong>
                {categories.length}
              </strong>

              <span>
                Catégories
              </span>
            </div>
          </div>

        </div>

        {/* SÉCURITÉ */}
        <section className="security-banner">

          <div className="security-icon">
            🛡️
          </div>

          <div className="security-content">

            <strong>
              Configuration sécurisée
            </strong>

            <p>
              Les clés secrètes et identifiants
              sensibles restent côté serveur.
            </p>

          </div>

          <span className="security-status">
            Protégé
          </span>

        </section>

        {/* TITRE */}
        <div className="section-heading">

          <div>
            <h2>
              Services connectés
            </h2>

            <p>
              Configurez les services utilisés
              par PharmaFlow.
            </p>
          </div>

          <span className="count-badge">
            {integrations.length} services
          </span>

        </div>

        {/* CARTES */}
        <div className="integrations-grid">

          {integrations.map(
            (integration) => (
              <article
                key={integration.id}
                className="integration-card"
              >

                <div className="integration-card-top">

                  <div className="integration-icon">
                    {integration.icon}
                  </div>

                  <div className="integration-status">
                    <span className="status-dot" />
                    Active
                  </div>

                </div>

                <div className="integration-body">

                  <div className="integration-category">
                    {getCategoryIcon(
                      integration.category,
                    )}

                    {integration.category}
                  </div>

                  <h3>
                    {integration.name}
                  </h3>

                  <p>
                    {integration.description}
                  </p>

                </div>

                <div className="environment">

                  <span>
                    Environnement
                  </span>

                  <strong>
                    {integration.environment}
                  </strong>

                </div>

                <div className="features">

                  {integration.features.map(
                    (feature) => (
                      <span
                        key={feature}
                        className="feature"
                      >
                        ✓ {feature}
                      </span>
                    ),
                  )}

                </div>

                <div className="card-footer">

                  <span className="connected">
                    <span className="small-dot" />
                    Connecté
                  </span>

                  {/* BOUTON MAINTENANT ACTIF */}
                  <Link
                    href={`/super-admin/integrations/${integration.id}`}
                    className="manage-button"
                  >
                    ⚙️ Configuration
                  </Link>

                </div>

              </article>
            ),
          )}

        </div>

        {/* ARCHITECTURE */}
        <section className="architecture-card">

          <div className="architecture-header">

            <div className="architecture-icon">
              🧩
            </div>

            <div>
              <h2>
                Architecture des paiements
              </h2>

              <p>
                Les fournisseurs sont centralisés
                dans le moteur de paiement PharmaFlow.
              </p>
            </div>

          </div>

          <div className="architecture-flow">

            <div className="flow-box">
              <span>🏥</span>
              <strong>PharmaFlow</strong>
              <small>Application</small>
            </div>

            <div className="flow-arrow">
              →
            </div>

            <div className="flow-box">
              <span>⚙️</span>
              <strong>Payment Engine</strong>
              <small>Gestion centralisée</small>
            </div>

            <div className="flow-arrow">
              →
            </div>

            <div className="flow-providers">

              <div>
                💳 Moko Afrika
              </div>

              <div>
                📱 Yabétoo
              </div>

              <div>
                💰 GoFreshPay
              </div>

            </div>

          </div>

        </section>

      </section>

      <footer className="integrations-footer">

        <span>
          PharmaFlow — Administration de la plateforme
        </span>

        <Link href="/super-admin">
          Retour au tableau de bord
        </Link>

      </footer>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .integrations-page {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .integrations-header {
          min-height: 84px;
          padding: 18px 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 9px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .back-link:hover {
          color: #2563eb;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .title-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #eff6ff;
          font-size: 24px;
        }

        .title-row h1 {
          margin: 0 0 4px;
          font-size: 25px;
        }

        .title-row p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .admin-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 13px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #fff;
        }

        .admin-avatar {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #0f172a;
          color: #fff;
          font-weight: 800;
        }

        .admin-box strong {
          display: block;
          font-size: 13px;
        }

        .admin-box span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
        }

        .integrations-content {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 30px 34px 50px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 6px 22px rgba(15,23,42,.04);
        }

        .stat-icon {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #eff6ff;
          font-size: 21px;
        }

        .stat-icon.success {
          background: #ecfdf5;
        }

        .stat-card strong {
          display: block;
          font-size: 24px;
        }

        .stat-card span {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
        }

        .security-banner {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 17px 20px;
          margin-bottom: 30px;
          background: #fff;
          border: 1px solid #dbeafe;
          border-radius: 17px;
        }

        .security-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #eff6ff;
          font-size: 20px;
        }

        .security-content {
          flex: 1;
        }

        .security-content strong {
          display: block;
          font-size: 13px;
        }

        .security-content p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .security-status {
          padding: 7px 11px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-size: 11px;
          font-weight: 800;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 17px;
        }

        .section-heading h2 {
          margin: 0 0 5px;
          font-size: 20px;
        }

        .section-heading p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .count-badge {
          padding: 7px 11px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
        }

        .integrations-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .integration-card {
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 28px rgba(15,23,42,.04);
        }

        .integration-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 20px 0;
        }

        .integration-icon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 25px;
        }

        .integration-status {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #047857;
          font-size: 11px;
          font-weight: 800;
        }

        .status-dot,
        .small-dot {
          width: 7px;
          height: 7px;
          display: inline-block;
          border-radius: 50%;
          background: #10b981;
        }

        .integration-body {
          padding: 18px 20px;
        }

        .integration-category {
          display: inline-flex;
          gap: 5px;
          margin-bottom: 8px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .integration-body h3 {
          margin: 0 0 8px;
          font-size: 19px;
        }

        .integration-body p {
          min-height: 58px;
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.65;
        }

        .environment {
          display: flex;
          justify-content: space-between;
          padding: 12px 20px;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
        }

        .environment span {
          color: #94a3b8;
          font-size: 11px;
        }

        .environment strong {
          font-size: 11px;
        }

        .features {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 16px 20px;
        }

        .feature {
          padding: 6px 8px;
          border-radius: 8px;
          background: #f8fafc;
          color: #475569;
          font-size: 10px;
          font-weight: 700;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
          padding: 15px 20px;
          background: #fafafa;
          border-top: 1px solid #f1f5f9;
        }

        .connected {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #047857;
          font-size: 11px;
          font-weight: 800;
        }

        /*
         * BOUTON CONFIGURATION ACTIF
         */

        .manage-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 13px;
          border: 1px solid #bfdbfe;
          border-radius: 9px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          transition: all .2s ease;
        }

        .manage-button:hover {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
          transform: translateY(-1px);
        }

        .architecture-card {
          margin-top: 24px;
          padding: 24px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
        }

        .architecture-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }

        .architecture-icon {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #f1f5f9;
        }

        .architecture-header h2 {
          margin: 0 0 5px;
          font-size: 18px;
        }

        .architecture-header p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .architecture-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .flow-box {
          min-width: 190px;
          padding: 18px;
          text-align: center;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          background: #f8fafc;
        }

        .flow-box span {
          display: block;
          margin-bottom: 7px;
          font-size: 24px;
        }

        .flow-box strong {
          display: block;
          font-size: 13px;
        }

        .flow-box small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 10px;
        }

        .flow-arrow {
          color: #94a3b8;
          font-size: 24px;
        }

        .flow-providers {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .flow-providers div {
          min-width: 180px;
          padding: 11px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          font-size: 12px;
          font-weight: 700;
        }

        .integrations-footer {
          display: flex;
          justify-content: space-between;
          padding: 22px 34px;
          border-top: 1px solid #e2e8f0;
          background: #fff;
          color: #94a3b8;
          font-size: 11px;
        }

        .integrations-footer a {
          color: #2563eb;
          font-weight: 700;
          text-decoration: none;
        }

        @media (max-width: 1100px) {
          .integrations-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .integrations-header {
            align-items: flex-start;
            flex-direction: column;
            padding: 18px;
          }

          .integrations-content {
            padding: 22px 16px 40px;
          }

          .integrations-grid,
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .security-banner {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .architecture-flow {
            flex-direction: column;
          }

          .flow-arrow {
            transform: rotate(90deg);
          }

          .integrations-footer {
            flex-direction: column;
            gap: 10px;
            padding: 20px 16px;
          }
        }

      `}</style>

    </main>
  );
}