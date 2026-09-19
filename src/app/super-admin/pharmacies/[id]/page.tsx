import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";
import ManualAccessActions from "../ManualAccessActions";

type Pharmacy = {
  id: string;
  name: string;
  country_code: string;
  city: string;
  address: string | null;
  currency_code: string;
  owner_id: string | null;
  status: string;
  language: string;
  created_at: string;
  updated_at: string;

  manual_access_enabled: boolean;
  manual_access_until: string | null;
  manual_access_reason: string | null;
  manual_access_by: string | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";

    case "inactive":
      return "Inactive";

    case "suspended":
      return "Suspendue";

    default:
      return status || "Inconnue";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "active":
      return "status active";

    case "inactive":
      return "status inactive";

    case "suspended":
      return "status suspended";

    default:
      return "status";
  }
}

function manualAccessIsActive(
  pharmacy: Pharmacy,
) {
  if (!pharmacy.manual_access_enabled) {
    return false;
  }

  if (!pharmacy.manual_access_until) {
    return false;
  }

  const until = new Date(
    pharmacy.manual_access_until,
  ).getTime();

  return (
    Number.isFinite(until) &&
    until > Date.now()
  );
}

export default async function PharmacyDetailsPage({
  params,
}: PageProps) {
  await requireSuperAdmin();

  const { id } = await params;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pharmacies")
    .select(`
      id,
      name,
      country_code,
      city,
      address,
      currency_code,
      owner_id,
      status,
      language,
      created_at,
      updated_at,
      manual_access_enabled,
      manual_access_until,
      manual_access_reason,
      manual_access_by
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de récupérer la pharmacie : ${error.message}`,
    );
  }

  if (!data) {
    notFound();
  }

  const pharmacy = data as Pharmacy;

  const manualAccessActive =
    manualAccessIsActive(pharmacy);

  return (
    <main className="details-page">
      <div className="details-container">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="page-header">
          <div>
            <div className="breadcrumb">
              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <Link href="/super-admin/pharmacies">
                Pharmacies
              </Link>

              <span>/</span>

              <span>Détails</span>
            </div>

            <h1>{pharmacy.name}</h1>

            <p>
              Informations détaillées de la
              pharmacie.
            </p>
          </div>

          <div className="header-actions">
            <Link
              href="/super-admin/pharmacies"
              className="btn btn-secondary"
            >
              ← Retour
            </Link>

            <Link
              href={`/super-admin/pharmacies/${pharmacy.id}/edit`}
              className="btn btn-primary"
            >
              ✏️ Modifier
            </Link>
          </div>
        </header>

        {/* =====================================================
            INFORMATIONS
        ===================================================== */}

        <section className="content-grid">
          <div className="main-card">
            <div className="card-header">
              <div>
                <h2>
                  Informations de la pharmacie
                </h2>

                <p>
                  Informations générales
                  enregistrées dans PharmaFlow.
                </p>
              </div>

              <span
                className={getStatusClass(
                  pharmacy.status,
                )}
              >
                <span className="status-dot" />

                {getStatusLabel(
                  pharmacy.status,
                )}
              </span>
            </div>

            <div className="information-grid">
              <div className="information-item">
                <span>Nom</span>

                <strong>
                  {pharmacy.name}
                </strong>
              </div>

              <div className="information-item">
                <span>ID</span>

                <strong className="break">
                  {pharmacy.id}
                </strong>
              </div>

              <div className="information-item">
                <span>Pays</span>

                <strong>
                  {pharmacy.country_code}
                </strong>
              </div>

              <div className="information-item">
                <span>Ville</span>

                <strong>
                  {pharmacy.city}
                </strong>
              </div>

              <div className="information-item">
                <span>Adresse</span>

                <strong>
                  {pharmacy.address ||
                    "Non renseignée"}
                </strong>
              </div>

              <div className="information-item">
                <span>Devise</span>

                <strong>
                  {pharmacy.currency_code}
                </strong>
              </div>

              <div className="information-item">
                <span>Langue</span>

                <strong>
                  {pharmacy.language || "fr"}
                </strong>
              </div>

              <div className="information-item">
                <span>Owner ID</span>

                <strong className="break">
                  {pharmacy.owner_id ||
                    "Non renseigné"}
                </strong>
              </div>

              <div className="information-item">
                <span>Créée le</span>

                <strong>
                  {formatDate(
                    pharmacy.created_at,
                  )}
                </strong>
              </div>

              <div className="information-item">
                <span>Modifiée le</span>

                <strong>
                  {formatDate(
                    pharmacy.updated_at,
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* ===================================================
              ACCÈS MANUEL
          =================================================== */}

          <div className="side-card">
            <div className="card-header">
              <div>
                <h2>Accès manuel</h2>

                <p>
                  Gestion de l'accès
                  exceptionnel.
                </p>
              </div>

              <span
                className={
                  manualAccessActive
                    ? "access-badge active"
                    : "access-badge inactive"
                }
              >
                {manualAccessActive
                  ? "Actif"
                  : "Inactif"}
              </span>
            </div>

            <div className="access-summary">
              <div className="access-row">
                <span>État</span>

                <strong>
                  {manualAccessActive
                    ? "Accès autorisé"
                    : "Accès non autorisé"}
                </strong>
              </div>

              <div className="access-row">
                <span>Expiration</span>

                <strong>
                  {pharmacy.manual_access_until
                    ? formatDate(
                        pharmacy.manual_access_until,
                      )
                    : "Aucune"}
                </strong>
              </div>

              <div className="access-row">
                <span>Motif</span>

                <strong>
                  {pharmacy.manual_access_reason ||
                    "Aucun motif enregistré"}
                </strong>
              </div>
            </div>

            {/* =================================================
                CORRECTION IMPORTANTE
            ================================================= */}

            <div className="manual-actions">
              <ManualAccessActions
                pharmacyId={pharmacy.id}
                pharmacyName={pharmacy.name}
                manualAccessEnabled={
                  pharmacy.manual_access_enabled
                }
                manualAccessUntil={
                  pharmacy.manual_access_until
                }
                manualAccessReason={
                  pharmacy.manual_access_reason
                }
                manualAccessActive={
                  manualAccessActive
                }
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            INFORMATIONS TECHNIQUES
        ===================================================== */}

        <section className="technical-card">
          <div className="card-header">
            <div>
              <h2>
                Informations techniques
              </h2>

              <p>
                Identifiants utilisés par
                PharmaFlow.
              </p>
            </div>
          </div>

          <div className="technical-grid">
            <div>
              <span>Pharmacy ID</span>

              <code>
                {pharmacy.id}
              </code>
            </div>

            <div>
              <span>Owner ID</span>

              <code>
                {pharmacy.owner_id || "—"}
              </code>
            </div>

            <div>
              <span>Manual access by</span>

              <code>
                {pharmacy.manual_access_by ||
                  "—"}
              </code>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .details-page {
          min-height: 100vh;
          background: #f6f8fb;
          padding: 32px;
        }

        .details-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .breadcrumb {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 13px;
          color: #7b8494;
        }

        .breadcrumb a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }

        .page-header h1 {
          margin: 0;
          color: #111827;
          font-size: 32px;
          font-weight: 800;
        }

        .page-header p {
          margin: 8px 0 0;
          color: #687386;
          font-size: 15px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .btn-secondary {
          background: #fff;
          border: 1px solid #dbe1ea;
          color: #374151;
        }

        .btn-primary {
          background: #2563eb;
          color: #fff;
        }

        .content-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.6fr)
            minmax(320px, 0.8fr);
          gap: 20px;
        }

        .main-card,
        .side-card,
        .technical-card {
          background: #fff;
          border: 1px solid #e5e9f0;
          border-radius: 16px;
          box-shadow:
            0 3px 12px
              rgba(15, 23, 42, 0.04);
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 24px;
          border-bottom: 1px solid #edf0f4;
        }

        .card-header h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 800;
        }

        .card-header p {
          margin: 5px 0 0;
          color: #7b8494;
          font-size: 13px;
        }

        .information-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .information-item {
          min-width: 0;
          padding: 19px 24px;
          border-bottom: 1px solid #f0f2f5;
        }

        .information-item:nth-child(odd) {
          border-right: 1px solid #f0f2f5;
        }

        .information-item span {
          display: block;
          margin-bottom: 6px;
          color: #8a94a6;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .information-item strong {
          display: block;
          color: #374151;
          font-size: 14px;
          line-height: 1.45;
        }

        .break {
          word-break: break-all;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 8px;
          background: #f3f4f6;
          color: #4b5563;
          font-size: 11px;
          font-weight: 700;
        }

        .status.active {
          background: #ecfdf3;
          color: #047857;
        }

        .status.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .status.suspended {
          background: #fff1f2;
          color: #be123c;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }

        .access-badge {
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
        }

        .access-badge.active {
          background: #ecfdf3;
          color: #047857;
        }

        .access-badge.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .access-summary {
          padding: 10px 24px;
        }

        .access-row {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 14px 0;
          border-bottom: 1px solid #f0f2f5;
        }

        .access-row span {
          color: #8a94a6;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .access-row strong {
          color: #374151;
          font-size: 13px;
          line-height: 1.5;
        }

        .manual-actions {
          padding: 0 24px 24px;
        }

        .technical-card {
          margin-top: 20px;
        }

        .technical-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
        }

        .technical-grid > div {
          padding: 20px 24px;
          border-right: 1px solid #f0f2f5;
        }

        .technical-grid span {
          display: block;
          margin-bottom: 8px;
          color: #8a94a6;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .technical-grid code {
          display: block;
          padding: 9px 10px;
          background: #f7f8fa;
          border-radius: 7px;
          color: #4b5563;
          font-size: 11px;
          word-break: break-all;
        }

        @media (max-width: 1000px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .details-page {
            padding: 18px;
          }

          .page-header {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions .btn {
            flex: 1;
          }

          .information-grid {
            grid-template-columns: 1fr;
          }

          .information-item:nth-child(odd) {
            border-right: none;
          }

          .technical-grid {
            grid-template-columns: 1fr;
          }

          .technical-grid > div {
            border-right: none;
            border-bottom: 1px solid #f0f2f5;
          }
        }
      `}</style>
    </main>
  );
}