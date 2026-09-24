import Link from "next/link";
import { requireSuperAdmin } from "@/app/lib/super-admin/auth";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminParametresPage() {
  await requireSuperAdmin();

  return (
    <main className="pf-settings-page">
      <div className="pf-settings-container">

        <header className="pf-settings-header">
          <div>
            <div className="pf-settings-breadcrumb">
              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>›</span>

              <span>Paramètres</span>
            </div>

            <div className="pf-settings-heading">
              <div className="pf-settings-heading-icon">
                ⚙️
              </div>

              <div>
                <h1>Paramètres</h1>

                <p>
                  Gérez votre compte Super Administrateur,
                  la sécurité et les préférences de votre
                  espace PharmaFlow.
                </p>
              </div>
            </div>
          </div>

          <div className="pf-settings-actions">
            <Link
              href="/super-admin"
              className="pf-settings-btn secondary"
            >
              ← Tableau de bord
            </Link>

            <Link
              href="/super-admin/audit"
              className="pf-settings-btn primary"
            >
              🛡️ Audit
            </Link>
          </div>
        </header>

        <SettingsClient />

      </div>

      <style>{`
        .pf-settings-page {
          min-height: 100vh;
          padding: 32px;
          background: #f5f7fb;
          box-sizing: border-box;
        }

        .pf-settings-container {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
        }

        .pf-settings-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .pf-settings-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          color: #98a2b3;
          font-size: 12px;
          font-weight: 650;
        }

        .pf-settings-breadcrumb a {
          color: #0f766e;
          text-decoration: none;
        }

        .pf-settings-heading {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .pf-settings-heading-icon {
          width: 50px;
          height: 50px;
          flex: 0 0 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: linear-gradient(
            135deg,
            #0f766e,
            #14b8a6
          );
          color: #fff;
          font-size: 23px;
          box-shadow:
            0 10px 25px rgba(15,118,110,.18);
        }

        .pf-settings-heading h1 {
          margin: 0;
          color: #101828;
          font-size: clamp(26px, 3vw, 35px);
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -.7px;
        }

        .pf-settings-heading p {
          max-width: 760px;
          margin: 7px 0 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
        }

        .pf-settings-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .pf-settings-btn {
          min-height: 42px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          transition: .18s ease;
        }

        .pf-settings-btn:hover {
          transform: translateY(-1px);
        }

        .pf-settings-btn.secondary {
          border: 1px solid #dfe4ec;
          background: #fff;
          color: #344054;
        }

        .pf-settings-btn.primary {
          border: 1px solid #0f766e;
          background: #0f766e;
          color: #fff;
          box-shadow:
            0 7px 18px rgba(15,118,110,.15);
        }

        @media (max-width: 850px) {
          .pf-settings-page {
            padding: 20px;
          }

          .pf-settings-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .pf-settings-actions {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .pf-settings-page {
            padding: 14px;
          }

          .pf-settings-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }

          .pf-settings-btn {
            width: 100%;
          }

          .pf-settings-heading-icon {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
          }
        }
      `}</style>
    </main>
  );
}