import { requireSuperAdmin } from "@/app/lib/super-admin/auth";
import { createSuperAdminClient } from "@/app/lib/super-admin/admin-client";


export const dynamic = "force-dynamic";

type StatCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: string;
  tone?: "blue" | "green" | "orange" | "red";
};

type ModuleCardProps = {
  icon: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  tone?: "blue" | "green" | "orange" | "red";
};

function StatCard({
  title,
  value,
  description,
  icon,
  tone = "blue",
}: StatCardProps) {
  return (
    <div className="sa-stat-card">
      <div className="sa-stat-top">
        <div>
          <p className="sa-stat-title">
            {title}
          </p>

          <p className="sa-stat-value">
            {value}
          </p>
        </div>

        <div className={`sa-stat-icon ${tone}`}>
          {icon}
        </div>
      </div>

      <p className="sa-stat-description">
        {description}
      </p>
    </div>
  );
}

function ModuleCard({
  icon,
  title,
  description,
  href,
  badge,
  tone = "blue",
}: ModuleCardProps) {
  return (
    <a
      href={href}
      className={`sa-module-card ${tone}`}
    >
      <div className="sa-module-icon">
        {icon}
      </div>

      <div className="sa-module-content">
        <div className="sa-module-title-row">
          <h3>{title}</h3>

          {badge && (
            <span className="sa-module-badge">
              {badge}
            </span>
          )}
        </div>

        <p>
          {description}
        </p>
      </div>

      <span className="sa-module-arrow">
        →
      </span>
    </a>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="sa-section-header">
      <div>
        <h2>{title}</h2>

        <p>
          {description}
        </p>
      </div>
    </div>
  );
}

export default async function SuperAdminDashboardPage() {
  const auth = await requireSuperAdmin();

  const supabase = createSuperAdminClient();

  /*
   * ==========================================================
   * STATISTIQUES GLOBALES
   * ==========================================================
   */

  const [
    pharmaciesResult,
    usersResult,
    productsResult,
    salesResult,
    paymentsResult,
    revenueResult,
  ] = await Promise.all([
    supabase
      .from("pharmacies")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("sales")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("payments")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("sales")
      .select("total")
      .not(
        "status",
        "in",
        "(cancelled,refunded)",
      ),
  ]);

  const pharmaciesCount =
    pharmaciesResult.count ?? 0;

  const usersCount =
    usersResult.count ?? 0;

  const productsCount =
    productsResult.count ?? 0;

  const salesCount =
    salesResult.count ?? 0;

  const paymentsCount =
    paymentsResult.count ?? 0;

  let totalRevenue = 0;

  if (
    !revenueResult.error &&
    revenueResult.data
  ) {
    totalRevenue =
      revenueResult.data.reduce(
        (sum, sale) =>
          sum + Number(sale.total ?? 0),
        0,
      );
  }

  const formattedRevenue =
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(totalRevenue);

  /*
   * ==========================================================
   * ADMINISTRATEUR CONNECTÉ
   * ==========================================================
   */

  const adminName =
    auth.full_name ||
    "Super Administrateur";

  const adminInitial =
    adminName
      .charAt(0)
      .toUpperCase();

  return (
    <div className="sa-layout">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="sa-sidebar">

        <div className="sa-brand">

          <div className="sa-brand-logo">
            P
          </div>

          <div className="sa-brand-text">

            <div className="sa-brand-name">
              PharmaFlow
            </div>

            <div className="sa-brand-subtitle">
              Administration globale
            </div>

          </div>

        </div>

        <div className="sa-sidebar-scroll">

          <div className="sa-nav-title">
            Vue générale
          </div>

          <nav className="sa-nav">

            <a
              href="/super-admin"
              className="sa-nav-link active"
            >
              <span className="sa-nav-icon">
                ▦
              </span>

              <span>
                Tableau de bord
              </span>
            </a>

          </nav>

          <div className="sa-nav-title">
            Écosystème PharmaFlow
          </div>

          <nav className="sa-nav">

            <a
              href="/super-admin/pharmacies"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                🏥
              </span>

              <span>
                Pharmacies
              </span>
            </a>

            <a
              href="/super-admin/utilisateurs"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                👥
              </span>

              <span>
                Utilisateurs
              </span>
            </a>

            <a
              href="/super-admin/abonnements"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                💳
              </span>

              <span>
                Abonnements
              </span>
            </a>

            <a
              href="/super-admin/paiements"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                💰
              </span>

              <span>
                Transactions
              </span>
            </a>

          </nav>
          <div className="sa-nav-title">
            Opérations
          </div>

          <nav className="sa-nav">

            <a
              href="/super-admin/reclamations"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                🚨
              </span>

              <span>
                Réclamations
              </span>

              <span className="sa-nav-count">
                IA
              </span>
            </a>

            <a
              href="/super-admin/ia"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                🤖
              </span>

              <span>
                Centre IA
              </span>
            </a>

            <a
              href="/super-admin/equipe"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                👨‍💼
              </span>

              <span>
                Équipe plateforme
              </span>
            </a>

          </nav>

          <div className="sa-nav-title">
            Contrôle & configuration
          </div>

          <nav className="sa-nav">

            <a
              href="/super-admin/audit"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                📜
              </span>

              <span>
                Journal d'audit
              </span>
            </a>

            <a
              href="/super-admin/site"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                🌐
              </span>

              <span>
                Site public
              </span>
            </a>

            <a
              href="/super-admin/integrations"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                🔌
              </span>

              <span>
                Intégrations & API
              </span>
            </a>

            <a
              href="/super-admin/parametres"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                ⚙️
              </span>

              <span>
                Paramètres
              </span>
            </a>

          </nav>

          <div className="sa-nav-title">
            Navigation
          </div>

          <nav className="sa-nav">

            <a
              href="/dashboard"
              className="sa-nav-link"
            >
              <span className="sa-nav-icon">
                ←
              </span>

              <span>
                Retour à PharmaFlow
              </span>
            </a>

          </nav>

        </div>

        <div className="sa-sidebar-footer">

          <div className="sa-security-status">

            <span className="sa-security-dot" />

            <div>
              <strong>
                Plateforme sécurisée
              </strong>

              <span>
                Accès Super Admin
              </span>
            </div>

          </div>

        </div>

      </aside>


      {/* ======================================================
          CONTENU PRINCIPAL
      ====================================================== */}

      <main className="sa-main">

        <header className="sa-header">

          <div className="sa-header-left">

            <div className="sa-breadcrumb">
              <span>
                PharmaFlow
              </span>

              <span className="sa-breadcrumb-separator">
                /
              </span>

              <strong>
                Super Admin
              </strong>
            </div>

          </div>

          <div className="sa-header-right">

            <button
              type="button"
              className="sa-header-icon-button"
              aria-label="Notifications"
            >
              🔔
            </button>

            <div className="sa-admin-profile">

              <div className="sa-admin-avatar">
                {adminInitial}
              </div>

              <div className="sa-admin-info">

                <strong>
                  {adminName}
                </strong>

                <span>
                  Super Administrateur
                </span>

              </div>

            </div>

          </div>

        </header>


        {/* ====================================================
            CONTENU
        ==================================================== */}

        <div className="sa-content">

          <section className="sa-welcome">

            <div className="sa-welcome-content">

              <span className="sa-eyebrow">
                CENTRE DE CONTRÔLE
              </span>

              <h1>
                Administration globale
                <br />
                de PharmaFlow
              </h1>

              <p>
                Pilotez l'écosystème PharmaFlow,
                les pharmacies, les abonnements,
                les transactions et les opérations
                de support depuis un espace centralisé.
              </p>

            </div>

            <div className="sa-welcome-actions">

              <a
                href="/super-admin/reclamations"
                className="sa-primary-button"
              >
                🚨 Voir les réclamations
              </a>

              <a
                href="/super-admin/abonnements"
                className="sa-secondary-button"
              >
                💳 Gérer les abonnements
              </a>

            </div>

          </section>


          {/* ==================================================
              STATISTIQUES
          ================================================== */}

          <section className="sa-stats-grid">

            <StatCard
              title="Pharmacies"
              value={pharmaciesCount}
              description="Pharmacies enregistrées sur PharmaFlow"
              icon="🏥"
              tone="blue"
            />

            <StatCard
              title="Utilisateurs"
              value={usersCount}
              description="Comptes utilisateurs de la plateforme"
              icon="👥"
              tone="green"
            />

            <StatCard
              title="Produits"
              value={productsCount}
              description="Produits actuellement enregistrés"
              icon="📦"
              tone="orange"
            />

            <StatCard
              title="Ventes"
              value={salesCount}
              description="Ventes enregistrées dans l'écosystème"
              icon="🛒"
              tone="blue"
            />

            <StatCard
              title="Paiements"
              value={paymentsCount}
              description="Paiements enregistrés"
              icon="💰"
              tone="green"
            />

            <StatCard
              title="Chiffre d'affaires"
              value={`${formattedRevenue} FCFA`}
              description="Total des ventes non annulées ou remboursées"
              icon="📈"
              tone="green"
            />

          </section>


          {/* ==================================================
              CENTRE DES OPÉRATIONS
          ================================================== */}

          <section className="sa-section">

            <SectionHeader
              title="Centre des opérations"
              description="Les fonctions prioritaires de supervision et d'intervention."
            />

            <div className="sa-module-grid">

              <ModuleCard
                icon="🚨"
                title="Réclamations & incidents"
                description="Analysez les réclamations, vérifiez les paiements et intervenez sur les problèmes d'activation."
                href="/super-admin/reclamations"
                badge="Prioritaire"
                tone="red"
              />

              <ModuleCard
                icon="💳"
                title="Gestion des abonnements"
                description="Supervisez les abonnements PharmaFlow et intervenez lorsqu'une activation automatique échoue."
                href="/super-admin/abonnements"
                badge="SaaS"
                tone="blue"
              />

              <ModuleCard
                icon="💰"
                title="Transactions d'abonnement"
                description="Contrôlez les transactions liées aux abonnements et leur état de traitement."
                href="/super-admin/paiements"
                badge="Finance"
                tone="green"
              />

              <ModuleCard
                icon="🤖"
                title="Centre IA"
                description="Analysez les dossiers, recommandations IA et demandes nécessitant une intervention humaine."
                href="/super-admin/ia"
                badge="IA"
                tone="orange"
              />

            </div>

          </section>
          {/* ==================================================
              ADMINISTRATION DE LA PLATEFORME
          ================================================== */}

          <section className="sa-section">

            <SectionHeader
              title="Administration de la plateforme"
              description="Supervisez les ressources et les utilisateurs de l'ensemble de l'écosystème."
            />

            <div className="sa-module-grid">

              <ModuleCard
                icon="🏥"
                title="Pharmacies"
                description="Consultez les pharmacies enregistrées, leur statut et leur environnement PharmaFlow."
                href="/super-admin/pharmacies"
                tone="blue"
              />

              <ModuleCard
                icon="👥"
                title="Utilisateurs"
                description="Consultez les utilisateurs et contrôlez les accès au niveau de la plateforme."
                href="/super-admin/utilisateurs"
                tone="green"
              />

              <ModuleCard
                icon="👨‍💼"
                title="Équipe plateforme"
                description="Gérez les agents PharmaFlow et leurs permissions opérationnelles."
                href="/super-admin/equipe"
                tone="orange"
              />

              <ModuleCard
                icon="📜"
                title="Journal d'audit"
                description="Suivez les actions sensibles effectuées par les administrateurs et les agents."
                href="/super-admin/audit"
                tone="red"
              />

            </div>

          </section>


          {/* ==================================================
              ACTIONS RAPIDES
          ================================================== */}

          <section className="sa-section">

            <SectionHeader
              title="Actions rapides"
              description="Accédez rapidement aux opérations les plus importantes."
            />

            <div className="sa-quick-actions">

              <a
                href="/super-admin/reclamations"
                className="sa-quick-action"
              >
                <span className="sa-quick-icon">
                  🚨
                </span>

                <span className="sa-quick-content">
                  <strong>
                    Traiter une réclamation
                  </strong>

                  <small>
                    Vérifier un paiement ou une activation
                  </small>
                </span>

                <span className="sa-quick-arrow">
                  →
                </span>
              </a>


              <a
                href="/super-admin/abonnements"
                className="sa-quick-action"
              >
                <span className="sa-quick-icon">
                  💳
                </span>

                <span className="sa-quick-content">
                  <strong>
                    Vérifier un abonnement
                  </strong>

                  <small>
                    Contrôler l'état d'un abonnement SaaS
                  </small>
                </span>

                <span className="sa-quick-arrow">
                  →
                </span>
              </a>


              <a
                href="/super-admin/paiements"
                className="sa-quick-action"
              >
                <span className="sa-quick-icon">
                  💰
                </span>

                <span className="sa-quick-content">
                  <strong>
                    Vérifier une transaction
                  </strong>

                  <small>
                    Rechercher et contrôler un paiement
                  </small>
                </span>

                <span className="sa-quick-arrow">
                  →
                </span>
              </a>


              <a
                href="/super-admin/ia"
                className="sa-quick-action"
              >
                <span className="sa-quick-icon">
                  🤖
                </span>

                <span className="sa-quick-content">
                  <strong>
                    Ouvrir le Centre IA
                  </strong>

                  <small>
                    Analyser les dossiers et recommandations
                  </small>
                </span>

                <span className="sa-quick-arrow">
                  →
                </span>
              </a>

            </div>

          </section>


          {/* ==================================================
              GOUVERNANCE & SÉCURITÉ
          ================================================== */}

          <section className="sa-section">

            <SectionHeader
              title="Gouvernance & sécurité"
              description="Les contrôles essentiels pour protéger la plateforme."
            />

            <div className="sa-governance-grid">

              <div className="sa-governance-card">

                <div className="sa-governance-icon">
                  🔐
                </div>

                <div className="sa-governance-content">

                  <h3>
                    Accès Super Admin
                  </h3>

                  <p>
                    Votre identité est vérifiée par
                    Supabase Auth puis contrôlée dans
                    la table des administrateurs
                    de plateforme.
                  </p>

                  <div className="sa-status-badge success">
                    <span />
                    Accès autorisé
                  </div>

                </div>

              </div>


              <div className="sa-governance-card">

                <div className="sa-governance-icon">
                  🛡️
                </div>

                <div className="sa-governance-content">

                  <h3>
                    Contrôle des interventions
                  </h3>

                  <p>
                    Les recommandations de l'IA ne
                    modifient jamais directement les
                    abonnements ou les comptes.
                  </p>

                  <div className="sa-status-badge success">
                    <span />
                    Validation humaine requise
                  </div>

                </div>

              </div>


              <div className="sa-governance-card">

                <div className="sa-governance-icon">
                  📋
                </div>

                <div className="sa-governance-content">

                  <h3>
                    Journalisation
                  </h3>

                  <p>
                    Les opérations sensibles pourront
                    être enregistrées dans le journal
                    d'audit de la plateforme.
                  </p>

                  <div className="sa-status-badge">
                    <span />
                    Audit plateforme
                  </div>

                </div>

              </div>

            </div>

          </section>


          {/* ==================================================
              PAIEMENTS & INTÉGRATIONS
          ================================================== */}

          <section className="sa-section">

            <SectionHeader
              title="Paiements & intégrations"
              description="Préparez l'écosystème PharmaFlow pour les services externes et le déploiement international."
            />

            <div className="sa-integration-grid">

              <a
                href="/super-admin/integrations"
                className="sa-integration-card"
              >

                <div className="sa-integration-icon">
                  🔌
                </div>

                <div className="sa-integration-content">

                  <h3>
                    Intégrations & API
                  </h3>

                  <p>
                    Gérez les futures connexions avec
                    les agrégateurs de paiement,
                    services externes et APIs.
                  </p>

                  <span>
                    Configurer →
                  </span>

                </div>

              </a>


              <a
                href="/super-admin/site"
                className="sa-integration-card"
              >

                <div className="sa-integration-icon">
                  🌐
                </div>

                <div className="sa-integration-content">

                  <h3>
                    Site public
                  </h3>

                  <p>
                    Gérez les éléments publics de
                    PharmaFlow et préparez la présence
                    internationale du service.
                  </p>

                  <span>
                    Gérer le site →
                  </span>

                </div>

              </a>


              <a
                href="/super-admin/parametres"
                className="sa-integration-card"
              >

                <div className="sa-integration-icon">
                  ⚙️
                </div>

                <div className="sa-integration-content">

                  <h3>
                    Paramètres plateforme
                  </h3>

                  <p>
                    Configurez les paramètres globaux
                    et les règles de fonctionnement
                    de PharmaFlow.
                  </p>

                  <span>
                    Ouvrir les paramètres →
                  </span>

                </div>

              </a>

            </div>

          </section>
          {/* ==================================================
              DÉPLOIEMENT INTERNATIONAL
          ================================================== */}

          <section className="sa-section">

            <SectionHeader
              title="Déploiement international"
              description="Préparez PharmaFlow à fonctionner dans différents pays, devises et environnements réglementaires."
            />

            <div className="sa-international-card">

              <div className="sa-international-main">

                <div className="sa-international-icon">
                  🌍
                </div>

                <div>

                  <h3>
                    PharmaFlow International
                  </h3>

                  <p>
                    Supervisez les marchés, les devises,
                    les langues et les intégrations
                    nécessaires au déploiement mondial.
                  </p>

                </div>

              </div>

              <div className="sa-international-items">

                <div className="sa-international-item">
                  <span>🌐</span>
                  <strong>
                    Multilingue
                  </strong>
                  <small>
                    FR / EN
                  </small>
                </div>

                <div className="sa-international-item">
                  <span>💱</span>
                  <strong>
                    Multi-devises
                  </strong>
                  <small>
                    Selon le pays
                  </small>
                </div>

                <div className="sa-international-item">
                  <span>💳</span>
                  <strong>
                    Paiements
                  </strong>
                  <small>
                    APIs & agrégateurs
                  </small>
                </div>

                <div className="sa-international-item">
                  <span>🔐</span>
                  <strong>
                    Sécurité
                  </strong>
                  <small>
                    Contrôle plateforme
                  </small>
                </div>

              </div>

            </div>

          </section>


          {/* ==================================================
              CENTRE DE CONTRÔLE
          ================================================== */}

          <section className="sa-section">

            <SectionHeader
              title="Centre de contrôle PharmaFlow"
              description="Vue synthétique des principaux domaines de supervision."
            />

            <div className="sa-control-grid">

              <div className="sa-control-card">

                <span className="sa-control-number">
                  01
                </span>

                <div className="sa-control-icon">
                  🏥
                </div>

                <h3>
                  Écosystème
                </h3>

                <p>
                  Pharmacies, utilisateurs,
                  produits et activité globale.
                </p>

              </div>


              <div className="sa-control-card">

                <span className="sa-control-number">
                  02
                </span>

                <div className="sa-control-icon">
                  💳
                </div>

                <h3>
                  SaaS & revenus
                </h3>

                <p>
                  Abonnements, transactions et
                  supervision financière.
                </p>

              </div>


              <div className="sa-control-card">

                <span className="sa-control-number">
                  03
                </span>

                <div className="sa-control-icon">
                  🚨
                </div>

                <h3>
                  Incidents
                </h3>

                <p>
                  Réclamations, vérifications,
                  interventions et résolutions.
                </p>

              </div>


              <div className="sa-control-card">

                <span className="sa-control-number">
                  04
                </span>

                <div className="sa-control-icon">
                  🤖
                </div>

                <h3>
                  Intelligence
                </h3>

                <p>
                  Analyse IA et recommandations
                  avec validation humaine.
                </p>

              </div>


              <div className="sa-control-card">

                <span className="sa-control-number">
                  05
                </span>

                <div className="sa-control-icon">
                  🔐
                </div>

                <h3>
                  Gouvernance
                </h3>

                <p>
                  Permissions, sécurité et
                  journal d'audit.
                </p>

              </div>


              <div className="sa-control-card">

                <span className="sa-control-number">
                  06
                </span>

                <div className="sa-control-icon">
                  🌍
                </div>

                <h3>
                  International
                </h3>

                <p>
                  Pays, langues, devises et
                  intégrations internationales.
                </p>

              </div>

            </div>

          </section>


          {/* ==================================================
              FOOTER
          ================================================== */}

          <footer className="sa-footer">

            <div className="sa-footer-brand">

              <div className="sa-footer-logo">
                P
              </div>

              <div>

                <strong>
                  PharmaFlow
                </strong>

                <span>
                  Administration globale
                </span>

              </div>

            </div>

            <div className="sa-footer-center">
              © {new Date().getFullYear()} PharmaFlow.
              Tous droits réservés.
            </div>

            <div className="sa-footer-status">

              <span className="sa-security-dot" />

              Système opérationnel

            </div>

          </footer>

        </div>

      </main>

    </div>
  );
}