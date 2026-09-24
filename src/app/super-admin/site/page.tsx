import Link from "next/link";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";

export const dynamic = "force-dynamic";

export default async function SuperAdminSitePage() {
  await requireSuperAdmin();

  return (
    <main className="pf-site-page">
      <div className="pf-site-background" />

      <div className="pf-site-container">
        {/* =========================================================
            HEADER
        ========================================================= */}
        <header className="pf-site-header">
          <div className="pf-site-header-left">
            <Link
              href="/super-admin"
              className="pf-site-back"
              aria-label="Retour au Super Admin"
            >
              ←
            </Link>

            <div>
              <div className="pf-site-eyebrow">
                PHARMAFLOW • SUPER ADMIN
              </div>

              <h1>Gestion du site</h1>

              <p>
                Centre de configuration et de supervision du site
                PharmaFlow Africa.
              </p>
            </div>
          </div>

          <div className="pf-site-header-actions">
            <a
              href="https://pharmaflow.africa"
              target="_blank"
              rel="noopener noreferrer"
              className="pf-site-button pf-site-button-primary"
            >
              🌐 Voir le site
            </a>

            <Link
              href="/super-admin"
              className="pf-site-button pf-site-button-secondary"
            >
              ← Tableau de bord
            </Link>
          </div>
        </header>

        {/* =========================================================
            STATUS
        ========================================================= */}
        <section className="pf-site-status">
          <div className="pf-site-status-icon">✓</div>

          <div className="pf-site-status-content">
            <strong>Site PharmaFlow opérationnel</strong>

            <span>
              Le site public est configuré et accessible depuis
              l'adresse officielle PharmaFlow Africa.
            </span>
          </div>

          <div className="pf-site-status-badge">
            ● ACTIF
          </div>
        </section>

        {/* =========================================================
            INFORMATIONS GÉNÉRALES
        ========================================================= */}
        <section className="pf-site-section">
          <div className="pf-site-section-heading">
            <div>
              <span className="pf-site-section-kicker">
                CONFIGURATION
              </span>

              <h2>Informations générales</h2>

              <p>
                Les informations principales utilisées par
                PharmaFlow Africa.
              </p>
            </div>
          </div>

          <div className="pf-site-info-grid">
            <div className="pf-site-info-card">
              <div className="pf-site-info-icon">🌐</div>

              <div>
                <span>Site officiel</span>

                <strong>pharmaflow.africa</strong>

                <a
                  href="https://pharmaflow.africa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ouvrir le site →
                </a>
              </div>
            </div>

            <div className="pf-site-info-card">
              <div className="pf-site-info-icon">✉️</div>

              <div>
                <span>Email officiel</span>

                <strong>pharmaflowafrica@gmail.com</strong>

                <a href="mailto:pharmaflowafrica@gmail.com">
                  Envoyer un email →
                </a>
              </div>
            </div>

            <div className="pf-site-info-card">
              <div className="pf-site-info-icon">📞</div>

              <div>
                <span>Téléphone</span>

                <strong>+242 044 177 909</strong>

                <a href="tel:+242044177909">
                  Appeler →
                </a>
              </div>
            </div>

            <div className="pf-site-info-card">
              <div className="pf-site-info-icon">🛡️</div>

              <div>
                <span>Administration</span>

                <strong>Super Admin</strong>

                <small>
                  Accès protégé par authentification.
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            MODULES
        ========================================================= */}
        <section className="pf-site-section">
          <div className="pf-site-section-heading">
            <div>
              <span className="pf-site-section-kicker">
                ESPACE ADMINISTRATION
              </span>

              <h2>Modules du site</h2>

              <p>
                Accédez rapidement aux différentes fonctions de
                gestion de la plateforme.
              </p>
            </div>
          </div>

          <div className="pf-site-modules-grid">
            {/* SITE PUBLIC */}
            <a
              href="https://pharmaflow.africa"
              target="_blank"
              rel="noopener noreferrer"
              className="pf-site-module"
            >
              <div className="pf-site-module-top">
                <div className="pf-site-module-icon">
                  🌐
                </div>

                <span className="pf-site-module-status">
                  ACTIF
                </span>
              </div>

              <h3>Site public</h3>

              <p>
                Consultez le site public de PharmaFlow Africa
                tel qu'il est présenté aux visiteurs.
              </p>

              <div className="pf-site-module-link">
                Visiter le site <span>→</span>
              </div>
            </a>

            {/* AUDIT */}
            <Link
              href="/super-admin/audit"
              className="pf-site-module"
            >
              <div className="pf-site-module-top">
                <div className="pf-site-module-icon">
                  🛡️
                </div>

                <span className="pf-site-module-status">
                  DISPONIBLE
                </span>
              </div>

              <h3>Journal d'audit</h3>

              <p>
                Consultez les activités et événements
                enregistrés dans l'espace d'administration.
              </p>

              <div className="pf-site-module-link">
                Ouvrir l'audit <span>→</span>
              </div>
            </Link>

            {/* ÉQUIPE */}
            <Link
              href="/super-admin/equipe"
              className="pf-site-module"
            >
              <div className="pf-site-module-top">
                <div className="pf-site-module-icon">
                  👥
                </div>

                <span className="pf-site-module-status">
                  DISPONIBLE
                </span>
              </div>

              <h3>Équipe plateforme</h3>

              <p>
                Gérez les membres de l'équipe PharmaFlow,
                leurs rôles et leurs permissions.
              </p>

              <div className="pf-site-module-link">
                Gérer l'équipe <span>→</span>
              </div>
            </Link>

            {/* SUPPORT */}
            <Link
              href="/agent/support"
              className="pf-site-module"
            >
              <div className="pf-site-module-top">
                <div className="pf-site-module-icon">
                  🎧
                </div>

                <span className="pf-site-module-status">
                  DISPONIBLE
                </span>
              </div>

              <h3>Support client</h3>

              <p>
                Accédez au centre de support pour suivre les
                tickets, demandes et interventions.
              </p>

              <div className="pf-site-module-link">
                Ouvrir le support <span>→</span>
              </div>
            </Link>
          </div>
        </section>

        {/* =========================================================
            CONFIGURATION FUTURE
        ========================================================= */}
        <section className="pf-site-section">
          <div className="pf-site-section-heading">
            <div>
              <span className="pf-site-section-kicker">
                GESTION DU CONTENU
              </span>

              <h2>Configuration du site public</h2>

              <p>
                Ces espaces sont préparés pour permettre
                progressivement la gestion du contenu du site
                depuis le Super Admin.
              </p>
            </div>
          </div>

          <div className="pf-site-settings-grid">
            <div className="pf-site-setting-card">
              <div className="pf-site-setting-icon">
                🏠
              </div>

              <div className="pf-site-setting-content">
                <h3>Page d'accueil</h3>

                <p>
                  Gestion du contenu, des sections et des
                  informations affichées sur la page d'accueil.
                </p>

                <span className="pf-site-coming">
                  À configurer
                </span>
              </div>
            </div>

            <div className="pf-site-setting-card">
              <div className="pf-site-setting-icon">
                🔎
              </div>

              <div className="pf-site-setting-content">
                <h3>SEO</h3>

                <p>
                  Gestion du titre, de la description,
                  des métadonnées et du référencement.
                </p>

                <span className="pf-site-coming">
                  À configurer
                </span>
              </div>
            </div>

            <div className="pf-site-setting-card">
              <div className="pf-site-setting-icon">
                📢
              </div>

              <div className="pf-site-setting-content">
                <h3>Communication</h3>

                <p>
                  Gestion des informations de contact,
                  annonces et communications publiques.
                </p>

                <span className="pf-site-coming">
                  À configurer
                </span>
              </div>
            </div>

            <div className="pf-site-setting-card">
              <div className="pf-site-setting-icon">
                ⚙️
              </div>

              <div className="pf-site-setting-content">
                <h3>Paramètres généraux</h3>

                <p>
                  Configuration générale du fonctionnement
                  du site public.
                </p>

                <span className="pf-site-coming">
                  À configurer
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FOOTER
        ========================================================= */}
        <footer className="pf-site-footer">
          <div>
            <strong>PharmaFlow Africa</strong>

            <span>
              Plateforme professionnelle de gestion des
              pharmacies.
            </span>
          </div>

          <div className="pf-site-footer-links">
            <Link href="/super-admin">
              Super Admin
            </Link>

            <Link href="/super-admin/audit">
              Audit
            </Link>

            <Link href="/super-admin/equipe">
              Équipe
            </Link>
          </div>
        </footer>
      </div>

      {/* =========================================================
          STYLES LOCAUX
          Aucun ajout nécessaire dans globals.css
      ========================================================= */}
      <style>{`
        .pf-site-page {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          background:
            linear-gradient(
              180deg,
              #f7fbfa 0%,
              #f4f8f8 45%,
              #eef5f4 100%
            );
          color: #0f172a;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .pf-site-background {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 10% 5%,
              rgba(15, 118, 110, 0.08),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 10%,
              rgba(13, 148, 136, 0.07),
              transparent 25%
            );
        }

        .pf-site-container {
          position: relative;
          z-index: 1;
          width: min(1440px, calc(100% - 48px));
          margin: 0 auto;
          padding: 34px 0 50px;
        }

        .pf-site-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          margin-bottom: 26px;
        }

        .pf-site-header-left {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .pf-site-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border: 1px solid #d9e7e4;
          border-radius: 13px;
          background: rgba(255,255,255,.9);
          color: #0f766e;
          text-decoration: none;
          font-size: 21px;
          font-weight: 800;
          box-shadow: 0 6px 18px rgba(15,23,42,.05);
          transition:
            transform .18s ease,
            box-shadow .18s ease;
        }

        .pf-site-back:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(15,23,42,.09);
        }

        .pf-site-eyebrow {
          margin-bottom: 7px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .12em;
        }

        .pf-site-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.08;
          letter-spacing: -.035em;
          font-weight: 900;
        }

        .pf-site-header p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .pf-site-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pf-site-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 43px;
          padding: 0 16px;
          border-radius: 11px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          transition:
            transform .18s ease,
            box-shadow .18s ease;
        }

        .pf-site-button:hover {
          transform: translateY(-1px);
        }

        .pf-site-button-primary {
          background: #0f766e;
          color: #fff;
          box-shadow: 0 8px 20px rgba(15,118,110,.18);
        }

        .pf-site-button-secondary {
          border: 1px solid #d9e7e4;
          background: #fff;
          color: #334155;
        }

        .pf-site-status {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 17px 19px;
          margin-bottom: 28px;
          border: 1px solid #cce9df;
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              #f0fdf9,
              #ffffff
            );
          box-shadow: 0 8px 25px rgba(15,23,42,.04);
        }

        .pf-site-status-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 12px;
          background: #dcfce7;
          color: #15803d;
          font-size: 19px;
          font-weight: 900;
        }

        .pf-site-status-content {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .pf-site-status-content strong {
          color: #14532d;
          font-size: 14px;
          font-weight: 850;
        }

        .pf-site-status-content span {
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .pf-site-status-badge {
          margin-left: auto;
          padding: 7px 11px;
          border-radius: 999px;
          background: #dcfce7;
          color: #15803d;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .pf-site-section {
          margin-top: 26px;
        }

        .pf-site-section-heading {
          margin-bottom: 15px;
        }

        .pf-site-section-kicker {
          color: #0f766e;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .pf-site-section-heading h2 {
          margin: 5px 0 0;
          color: #0f172a;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -.02em;
        }

        .pf-site-section-heading p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .pf-site-info-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 13px;
        }

        .pf-site-info-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
          padding: 17px;
          border: 1px solid #e1ebe9;
          border-radius: 15px;
          background: #fff;
          box-shadow: 0 7px 22px rgba(15,23,42,.045);
        }

        .pf-site-info-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 39px;
          height: 39px;
          flex: 0 0 39px;
          border-radius: 11px;
          background: #e7f6f3;
          font-size: 17px;
        }

        .pf-site-info-card > div:last-child {
          min-width: 0;
        }

        .pf-site-info-card span {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 750;
        }

        .pf-site-info-card strong {
          display: block;
          margin-top: 4px;
          overflow-wrap: anywhere;
          color: #0f172a;
          font-size: 12px;
          font-weight: 850;
        }

        .pf-site-info-card a {
          display: inline-block;
          margin-top: 6px;
          color: #0f766e;
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
        }

        .pf-site-info-card small {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.45;
        }

        .pf-site-modules-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .pf-site-module {
          display: flex;
          flex-direction: column;
          min-height: 230px;
          padding: 20px;
          border: 1px solid #e0eae8;
          border-radius: 17px;
          background: #fff;
          color: inherit;
          text-decoration: none;
          box-shadow: 0 8px 26px rgba(15,23,42,.045);
          transition:
            transform .2s ease,
            box-shadow .2s ease,
            border-color .2s ease;
        }

        .pf-site-module:hover {
          transform: translateY(-4px);
          border-color: #b9dcd6;
          box-shadow: 0 16px 34px rgba(15,23,42,.08);
        }

        .pf-site-module-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .pf-site-module-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #e8f7f4;
          font-size: 22px;
        }

        .pf-site-module-status {
          padding: 6px 9px;
          border-radius: 999px;
          background: #f0fdf4;
          color: #15803d;
          font-size: 9px;
          font-weight: 900;
        }

        .pf-site-module h3 {
          margin: 21px 0 0;
          color: #0f172a;
          font-size: 16px;
          font-weight: 900;
        }

        .pf-site-module p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.65;
        }

        .pf-site-module-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
          padding-top: 18px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 850;
        }

        .pf-site-module-link span {
          font-size: 16px;
        }

        .pf-site-settings-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .pf-site-setting-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px;
          border: 1px solid #e1e8ee;
          border-radius: 15px;
          background: rgba(255,255,255,.82);
        }

        .pf-site-setting-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 12px;
          background: #f1f5f9;
          font-size: 19px;
        }

        .pf-site-setting-content {
          min-width: 0;
        }

        .pf-site-setting-content h3 {
          margin: 0;
          color: #0f172a;
          font-size: 13px;
          font-weight: 850;
        }

        .pf-site-setting-content p {
          margin: 5px 0 9px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        .pf-site-coming {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          background: #f8fafc;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          border: 1px solid #e2e8f0;
        }

        .pf-site-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 38px;
          padding-top: 22px;
          border-top: 1px solid #dce7e5;
        }

        .pf-site-footer > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pf-site-footer strong {
          color: #0f766e;
          font-size: 12px;
          font-weight: 900;
        }

        .pf-site-footer span {
          color: #94a3b8;
          font-size: 10px;
        }

        .pf-site-footer-links {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .pf-site-footer-links a {
          color: #64748b;
          font-size: 10px;
          font-weight: 750;
          text-decoration: none;
        }

        .pf-site-footer-links a:hover {
          color: #0f766e;
        }

        @media (max-width: 1100px) {
          .pf-site-info-grid,
          .pf-site-modules-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .pf-site-container {
            width: min(100% - 28px, 680px);
            padding-top: 22px;
          }

          .pf-site-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .pf-site-header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .pf-site-button {
            flex: 1 1 auto;
          }

          .pf-site-status {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .pf-site-status-badge {
            margin-left: 56px;
          }

          .pf-site-info-grid,
          .pf-site-modules-grid,
          .pf-site-settings-grid {
            grid-template-columns: 1fr;
          }

          .pf-site-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .pf-site-header-left {
            gap: 11px;
          }

          .pf-site-back {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
          }

          .pf-site-header h1 {
            font-size: 27px;
          }

          .pf-site-header p {
            font-size: 12px;
          }

          .pf-site-header-actions {
            flex-direction: column;
          }

          .pf-site-button {
            width: 100%;
          }

          .pf-site-status {
            padding: 14px;
          }

          .pf-site-status-badge {
            margin-left: 0;
          }
        }

        @media print {
          .pf-site-page {
            background: #fff !important;
          }

          .pf-site-background,
          .pf-site-header-actions,
          .pf-site-back,
          .pf-site-status,
          .pf-site-footer-links {
            display: none !important;
          }

          .pf-site-container {
            width: 100% !important;
            padding: 0 !important;
          }

          .pf-site-info-grid,
          .pf-site-modules-grid,
          .pf-site-settings-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .pf-site-module,
          .pf-site-info-card,
          .pf-site-setting-card {
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}