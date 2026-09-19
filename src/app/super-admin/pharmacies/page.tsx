import Link from "next/link";

import {
  requireSuperAdmin,
} from "@/app/lib/super-admin/auth";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

import PharmacyActions from "./PharmacyActions";

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
  manual_access_enabled: boolean | null;
  manual_access_until: string | null;
  manual_access_reason: string | null;
  manual_access_by: string | null;
};

function getStatusLabel(
  status: string,
) {
  switch (
    String(status)
      .trim()
      .toLowerCase()
  ) {
    case "active":
      return "Active";

    case "inactive":
      return "Inactive";

    case "suspended":
      return "Suspendue";

    default:
      return status || "Inconnu";
  }
}

function getStatusClass(
  status: string,
) {
  switch (
    String(status)
      .trim()
      .toLowerCase()
  ) {
    case "active":
      return "status-active";

    case "inactive":
      return "status-inactive";

    case "suspended":
      return "status-suspended";

    default:
      return "status-unknown";
  }
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function manualAccessIsActive(
  pharmacy: Pharmacy,
) {
  return (
    pharmacy.manual_access_enabled ===
      true &&
    !!pharmacy.manual_access_until &&
    new Date(
      pharmacy.manual_access_until,
    ).getTime() > Date.now()
  );
}

export default async function SuperAdminPharmaciesPage() {
  await requireSuperAdmin();

  const supabase =
    createAdminClient();

  const {
    data: pharmacies,
    error,
  } = await supabase
    .from("pharmacies")
    .select(
      `
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
      `,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throw new Error(
      `Impossible de récupérer les pharmacies : ${error.message}`,
    );
  }

  const pharmacyList =
    (pharmacies ||
      []) as Pharmacy[];

  const total =
    pharmacyList.length;

  const active =
    pharmacyList.filter(
      (pharmacy) =>
        String(
          pharmacy.status,
        ).toLowerCase() ===
        "active",
    ).length;

  const inactive =
    pharmacyList.filter(
      (pharmacy) =>
        String(
          pharmacy.status,
        ).toLowerCase() ===
        "inactive",
    ).length;

  const suspended =
    pharmacyList.filter(
      (pharmacy) =>
        String(
          pharmacy.status,
        ).toLowerCase() ===
        "suspended",
    ).length;

  const manualAccess =
    pharmacyList.filter(
      manualAccessIsActive,
    ).length;

  return (
    <main className="pharmacies-page">
      <div className="page-container">

        {/* ====================================================== */}
        {/* HEADER */}
        {/* ====================================================== */}

        <header className="page-header">
          <div>
            <div className="breadcrumb">
              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <span>
                Pharmacies
              </span>
            </div>

            <h1>
              Gestion des pharmacies
            </h1>

            <p>
              Gérez les comptes pharmacies,
              leurs statuts et leurs accès
              à la plateforme.
            </p>
          </div>

          <div className="header-actions">
            <Link
              href="/super-admin"
              className="back-button"
            >
              ← Super Admin
            </Link>
          </div>
        </header>

        {/* ====================================================== */}
        {/* STATISTIQUES */}
        {/* ====================================================== */}

        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon">
              🏥
            </div>

            <div>
              <span>
                Total
              </span>

              <strong>
                {total}
              </strong>

              <small>
                pharmacies
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              🟢
            </div>

            <div>
              <span>
                Actives
              </span>

              <strong>
                {active}
              </strong>

              <small>
                accessibles
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon danger">
              🔴
            </div>

            <div>
              <span>
                Inactives
              </span>

              <strong>
                {inactive}
              </strong>

              <small>
                désactivées
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              ⏸️
            </div>

            <div>
              <span>
                Suspendues
              </span>

              <strong>
                {suspended}
              </strong>

              <small>
                temporairement
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon manual">
              🔑
            </div>

            <div>
              <span>
                Accès manuel
              </span>

              <strong>
                {manualAccess}
              </strong>

              <small>
                actuellement actifs
              </small>
            </div>
          </div>

        </section>

        {/* ====================================================== */}
        {/* TABLEAU */}
        {/* ====================================================== */}

        <section className="table-card">

          <div className="table-header">
            <div>
              <h2>
                Toutes les pharmacies
              </h2>

              <p>
                {total} pharmacie
                {total > 1
                  ? "s"
                  : ""} enregistrée
                {total > 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <Link
              href="/super-admin/pharmacies/new"
              className="new-button"
            >
              + Nouvelle pharmacie
            </Link>
          </div>

          {pharmacyList.length ===
          0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                🏥
              </div>

              <h3>
                Aucune pharmacie
              </h3>

              <p>
                Aucune pharmacie
                n'est encore
                enregistrée sur la
                plateforme.
              </p>

              <Link
                href="/super-admin/pharmacies/new"
                className="new-button"
              >
                Créer une pharmacie
              </Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      Pharmacie
                    </th>

                    <th>
                      Localisation
                    </th>

                    <th>
                      Devise
                    </th>

                    <th>
                      Statut
                    </th>

                    <th>
                      Accès plateforme
                    </th>

                    <th>
                      Création
                    </th>

                    <th className="actions-column">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pharmacyList.map(
                    (
                      pharmacy,
                    ) => {
                      const hasManualAccess =
                        manualAccessIsActive(
                          pharmacy,
                        );

                      return (
                        <tr
                          key={
                            pharmacy.id
                          }
                        >
                          {/* ================================== */}
                          {/* PHARMACIE */}
                          {/* ================================== */}

                          <td>
                            <div className="pharmacy-cell">
                              <div className="pharmacy-avatar">
                                {pharmacy.name
                                  .charAt(
                                    0,
                                  )
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {
                                    pharmacy.name
                                  }
                                </strong>

                                <span>
                                  {
                                    pharmacy.country_code
                                  }
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* ================================== */}
                          {/* LOCALISATION */}
                          {/* ================================== */}

                          <td>
                            <div className="location-cell">
                              <strong>
                                {
                                  pharmacy.city
                                }
                              </strong>

                              <span>
                                {pharmacy.address ||
                                  "Adresse non renseignée"}
                              </span>
                            </div>
                          </td>

                          {/* ================================== */}
                          {/* DEVISE */}
                          {/* ================================== */}

                          <td>
                            <span className="currency">
                              {
                                pharmacy.currency_code
                              }
                            </span>
                          </td>

                          {/* ================================== */}
                          {/* STATUT */}
                          {/* ================================== */}

                          <td>
                            <span
                              className={`status-badge ${getStatusClass(
                                pharmacy.status,
                              )}`}
                            >
                              <span className="status-dot" />

                              {getStatusLabel(
                                pharmacy.status,
                              )}
                            </span>
                          </td>

                          {/* ================================== */}
                          {/* ACCÈS */}
                          {/* ================================== */}

                          <td>
                            {hasManualAccess ? (
                              <div className="access-badge active">
                                <span>
                                  🔑
                                </span>

                                <div>
                                  <strong>
                                    Accès manuel
                                  </strong>

                                  <small>
                                    Jusqu'au{" "}
                                    {formatDate(
                                      pharmacy.manual_access_until,
                                    )}
                                  </small>
                                </div>
                              </div>
                            ) : (
                              <div className="access-badge none">
                                <span>
                                  🔒
                                </span>

                                <div>
                                  <strong>
                                    Standard
                                  </strong>

                                  <small>
                                    Selon abonnement
                                  </small>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* ================================== */}
                          {/* DATE */}
                          {/* ================================== */}

                          <td>
                            <span className="date">
                              {formatDate(
                                pharmacy.created_at,
                              )}
                            </span>
                          </td>

                          {/* ================================== */}
                          {/* ACTIONS */}
                          {/* ================================== */}

                          <td className="actions-column">
                            <PharmacyActions
                              pharmacy={{
                                id:
                                  pharmacy.id,
                                name:
                                  pharmacy.name,
                                status:
                                  pharmacy.status,
                                manual_access_enabled:
                                  pharmacy.manual_access_enabled,
                                manual_access_until:
                                  pharmacy.manual_access_until,
                              }}
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
      </div>

      <style>{`
        .pharmacies-page {
          min-height: 100vh;
          background: #f6f8fb;
          padding: 32px;
        }

        .page-container {
          width: 100%;
          max-width: 1500px;
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
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
          color: #8a94a6;
          font-size: 12px;
        }

        .breadcrumb a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 700;
        }

        .page-header h1 {
          margin: 0;
          color: #111827;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -0.5px;
        }

        .page-header p {
          margin: 9px 0 0;
          color: #6b7687;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
          background: #ffffff;
          color: #344054;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .back-button:hover {
          background: #f8fafc;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .stat-card {
          min-height: 108px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 17px;
          border: 1px solid #e5eaf0;
          border-radius: 15px;
          background: #ffffff;
          box-shadow:
            0 2px 10px rgba(
              15,
              23,
              42,
              0.035
            );
        }

        .stat-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #eef2ff;
          font-size: 19px;
        }

        .stat-icon.success {
          background: #ecfdf3;
        }

        .stat-icon.danger {
          background: #fef2f2;
        }

        .stat-icon.warning {
          background: #fffbeb;
        }

        .stat-icon.manual {
          background: #eff6ff;
        }

        .stat-card span {
          display: block;
          color: #7b8797;
          font-size: 11px;
          font-weight: 650;
        }

        .stat-card strong {
          display: inline-block;
          margin-top: 2px;
          color: #172033;
          font-size: 25px;
          line-height: 1;
          font-weight: 850;
        }

        .stat-card small {
          display: block;
          margin-top: 4px;
          color: #9aa4b2;
          font-size: 10px;
        }

        .table-card {
          overflow: visible;
          border: 1px solid #e3e8ef;
          border-radius: 16px;
          background: #ffffff;
          box-shadow:
            0 3px 14px rgba(
              15,
              23,
              42,
              0.035
            );
        }

        .table-header {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 17px 20px;
          border-bottom: 1px solid #edf0f4;
        }

        .table-header h2 {
          margin: 0;
          color: #172033;
          font-size: 17px;
          font-weight: 800;
        }

        .table-header p {
          margin: 4px 0 0;
          color: #8a94a6;
          font-size: 11px;
        }

        .new-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 15px;
          border-radius: 10px;
          background: #2563eb;
          color: #ffffff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 750;
          box-shadow:
            0 4px 10px rgba(
              37,
              99,
              235,
              0.18
            );
        }

        .new-button:hover {
          background: #1d4ed8;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          overflow-y: visible;
        }

        table {
          width: 100%;
          min-width: 1120px;
          border-collapse: separate;
          border-spacing: 0;
        }

        th {
          height: 45px;
          padding: 0 14px;
          border-bottom: 1px solid #edf0f4;
          background: #fbfcfd;
          color: #7d8898;
          text-align: left;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        td {
          height: 78px;
          padding: 10px 14px;
          border-bottom: 1px solid #f0f2f5;
          vertical-align: middle;
          color: #344054;
          font-size: 12px;
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        tbody tr:hover td {
          background: #fcfdff;
        }

        .pharmacy-cell {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 180px;
        }

        .pharmacy-avatar {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #eef2ff;
          color: #3656c9;
          font-size: 14px;
          font-weight: 850;
        }

        .pharmacy-cell strong {
          display: block;
          color: #202b3c;
          font-size: 12px;
          font-weight: 800;
        }

        .pharmacy-cell span {
          display: block;
          margin-top: 3px;
          color: #8d98a8;
          font-size: 10px;
          font-weight: 600;
        }

        .location-cell {
          max-width: 190px;
        }

        .location-cell strong {
          display: block;
          color: #3a4658;
          font-size: 11px;
          font-weight: 750;
        }

        .location-cell span {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          color: #9aa4b2;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .currency {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 7px;
          background: #f3f5f8;
          color: #596579;
          font-size: 10px;
          font-weight: 800;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 750;
          white-space: nowrap;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .status-active {
          background: #ecfdf3;
          color: #16804e;
        }

        .status-inactive {
          background: #fef2f2;
          color: #c53030;
        }

        .status-suspended {
          background: #fffbeb;
          color: #a16207;
        }

        .status-unknown {
          background: #f3f4f6;
          color: #6b7280;
        }

        .access-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 125px;
        }

        .access-badge > span {
          width: 27px;
          height: 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #f3f5f8;
          font-size: 12px;
        }

        .access-badge strong {
          display: block;
          font-size: 10px;
          font-weight: 750;
        }

        .access-badge small {
          display: block;
          margin-top: 2px;
          color: #98a1af;
          font-size: 9px;
        }

        .access-badge.active > span {
          background: #ecfdf3;
        }

        .access-badge.active strong {
          color: #16804e;
        }

        .access-badge.none strong {
          color: #687386;
        }

        .date {
          color: #7f8999;
          font-size: 10px;
          white-space: nowrap;
        }

        .actions-column {
          width: 145px;
          min-width: 145px;
          text-align: right;
          white-space: nowrap;
        }

        .empty-state {
          padding: 70px 20px;
          text-align: center;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #f1f5f9;
          font-size: 27px;
        }

        .empty-state h3 {
          margin: 0;
          color: #263244;
          font-size: 17px;
        }

        .empty-state p {
          max-width: 400px;
          margin: 7px auto 18px;
          color: #8a94a6;
          font-size: 12px;
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .pharmacies-page {
            padding: 18px 12px;
          }

          .page-header {
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .table-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .new-button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .page-header h1 {
            font-size: 25px;
          }
        }
      `}</style>
    </main>
  );
}