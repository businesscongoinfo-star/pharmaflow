import Link from "next/link";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";
import ManualAccessActions from "./ManualAccessActions";

export const dynamic = "force-dynamic";

type Pharmacy = {
  id: string;
  name: string | null;
  address: string | null;
  country_code: string | null;
  city: string | null;
  currency_code: string | null;
  owner_id: string | null;
  status: string | null;
  created_at: string | null;

  manual_access_enabled: boolean;
  manual_access_until: string | null;
  manual_access_reason: string | null;
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

function getStatus(status: string | null) {
  const value = String(status ?? "")
    .trim()
    .toLowerCase();

  switch (value) {
    case "active":
      return {
        label: "Active",
        className: "active",
      };

    case "inactive":
      return {
        label: "Inactive",
        className: "inactive",
      };

    case "suspended":
      return {
        label: "Suspendue",
        className: "suspended",
      };

    case "pending":
      return {
        label: "En attente",
        className: "pending",
      };

    case "trial":
      return {
        label: "Essai",
        className: "trial",
      };

    default:
      return {
        label: status || "Inconnu",
        className: "unknown",
      };
  }
}

function isManualAccessValid(
  pharmacy: Pharmacy,
) {
  if (!pharmacy.manual_access_enabled) {
    return false;
  }

  if (!pharmacy.manual_access_until) {
    return false;
  }

  const timestamp = new Date(
    pharmacy.manual_access_until,
  ).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp > Date.now()
  );
}

export default async function SuperAdminPharmaciesPage() {
  /*
   * ============================================================
   * 1. VÉRIFICATION SUPER ADMIN
   * ============================================================
   */

  await requireSuperAdmin();

  /*
   * ============================================================
   * 2. CLIENT ADMIN SUPABASE
   * ============================================================
   */

  let supabaseAdmin: ReturnType<
    typeof createAdminClient
  >;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "SUPER ADMIN PHARMACIES - ADMIN CLIENT:",
      error,
    );

    return (
      <main className="page">
        <div className="container">
          <section className="errorCard">
            <div className="errorIcon">
              !
            </div>

            <div>
              <h2>
                Configuration serveur
                incomplète
              </h2>

              <p>
                Le client Admin Supabase ne
                peut pas être initialisé.
                Vérifiez les variables
                d'environnement du serveur.
              </p>
            </div>
          </section>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  /*
   * ============================================================
   * 3. RÉCUPÉRATION DES PHARMACIES
   * ============================================================
   */

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("pharmacies")
    .select(
      `
        id,
        name,
        address,
        country_code,
        city,
        currency_code,
        owner_id,
        status,
        created_at,
        manual_access_enabled,
        manual_access_until,
        manual_access_reason
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  /*
   * ============================================================
   * 4. GESTION ERREUR
   * ============================================================
   */

  if (error) {
    console.error(
      "SUPER ADMIN PHARMACIES - DATABASE:",
      error,
    );
  }

  const pharmacies =
    (data ?? []) as Pharmacy[];

  /*
   * ============================================================
   * 5. STATISTIQUES
   * ============================================================
   */

  const totalCount =
    pharmacies.length;

  const activeCount =
    pharmacies.filter(
      (pharmacy) =>
        String(
          pharmacy.status ?? "",
        )
          .trim()
          .toLowerCase() === "active",
    ).length;

  const inactiveCount =
    pharmacies.filter(
      (pharmacy) =>
        String(
          pharmacy.status ?? "",
        )
          .trim()
          .toLowerCase() === "inactive",
    ).length;

  const pendingCount =
    pharmacies.filter(
      (pharmacy) =>
        String(
          pharmacy.status ?? "",
        )
          .trim()
          .toLowerCase() === "pending",
    ).length;

  const manualAccessCount =
    pharmacies.filter(
      (pharmacy) =>
        isManualAccessValid(
          pharmacy,
        ),
    ).length;

  return (
    <main className="page">
      <div className="container">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="header">
          <div className="headerContent">

            <div className="eyebrow">
              PHARMAFLOW · SUPER ADMIN
            </div>

            <h1>
              Pharmacies
            </h1>

            <p>
              Gérez et consultez toutes les
              pharmacies enregistrées sur la
              plateforme PharmaFlow.
            </p>

          </div>

          <Link
            href="/super-admin"
            className="backButton"
          >
            <span>
              ←
            </span>

            Tableau de bord
          </Link>
        </header>

        {/* ======================================================
            ERREUR BASE DE DONNÉES
        ====================================================== */}

        {error ? (
          <section className="errorCard">

            <div className="errorIcon">
              !
            </div>

            <div>
              <h2>
                Impossible de charger
                les pharmacies
              </h2>

              <p>
                {error.message}
              </p>
            </div>

          </section>
        ) : (
          <>

            {/* ==================================================
                STATISTIQUES
            ================================================== */}

            <section className="statsGrid">

              <div className="statCard">
                <div className="statIcon">
                  🏥
                </div>

                <div>
                  <span>
                    Total pharmacies
                  </span>

                  <strong>
                    {totalCount}
                  </strong>
                </div>
              </div>

              <div className="statCard">
                <div className="statIcon green">
                  ✓
                </div>

                <div>
                  <span>
                    Pharmacies actives
                  </span>

                  <strong>
                    {activeCount}
                  </strong>
                </div>
              </div>

              <div className="statCard">
                <div className="statIcon orange">
                  ⏳
                </div>

                <div>
                  <span>
                    En attente
                  </span>

                  <strong>
                    {pendingCount}
                  </strong>
                </div>
              </div>

              <div className="statCard">
                <div className="statIcon red">
                  ×
                </div>

                <div>
                  <span>
                    Inactives
                  </span>

                  <strong>
                    {inactiveCount}
                  </strong>
                </div>
              </div>

            </section>

            {/* ==================================================
                ACCÈS MANUEL
            ================================================== */}

            <section className="manualAccessSummary">

              <div className="manualAccessIcon">
                🔓
              </div>

              <div className="manualAccessContent">

                <strong>
                  Accès manuel actifs
                </strong>

                <span>
                  {manualAccessCount} pharmacie
                  {manualAccessCount !== 1
                    ? "s"
                    : ""}{" "}
                  bénéficient actuellement
                  d'un accès manuel valide.
                </span>

              </div>

            </section>

            {/* ==================================================
                LISTE DES PHARMACIES
            ================================================== */}

            <section className="card">

              <div className="cardHeader">

                <div>
                  <h2>
                    Liste des pharmacies
                  </h2>

                  <p>
                    Toutes les pharmacies
                    enregistrées sur PharmaFlow.
                  </p>
                </div>

                <div className="totalBadge">
                  {totalCount}
                </div>

              </div>

              {pharmacies.length === 0 ? (

                <div className="emptyState">

                  <div className="emptyIcon">
                    🏥
                  </div>

                  <h3>
                    Aucune pharmacie
                  </h3>

                  <p>
                    Aucune pharmacie n'est
                    actuellement enregistrée
                    sur la plateforme.
                  </p>

                </div>

              ) : (

                <div className="tableWrapper">

                  <table>

                    <thead>
                      <tr>

                        <th>
                          Pharmacie
                        </th>

                        <th>
                          Ville
                        </th>

                        <th>
                          Pays
                        </th>

                        <th>
                          Devise
                        </th>

                        <th>
                          Statut
                        </th>

                        <th>
                          Accès manuel
                        </th>

                        <th>
                          Inscription
                        </th>

                        <th>
                          Actions
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {pharmacies.map(
                        (pharmacy) => {

                          const status =
                            getStatus(
                              pharmacy.status,
                            );

                          const manualAccess =
                            isManualAccessValid(
                              pharmacy,
                            );

                          const initial =
                            (
                              pharmacy.name ||
                              "P"
                            )
                              .trim()
                              .charAt(0)
                              .toUpperCase();

                          return (
                            <tr
                              key={pharmacy.id}
                            >

                              {/* PHARMACIE */}

                              <td>
                                <div className="pharmacyCell">

                                  <div className="avatar">
                                    {initial}
                                  </div>

                                  <div className="pharmacyInfo">

                                    <strong>
                                      {pharmacy.name ||
                                        "Pharmacie sans nom"}
                                    </strong>

                                    <small>
                                      ID :{" "}
                                      {pharmacy.id}
                                    </small>

                                  </div>

                                </div>
                              </td>

                              {/* VILLE */}

                              <td>
                                {pharmacy.city ||
                                  "—"}
                              </td>

                              {/* PAYS */}

                              <td>
                                <span className="countryBadge">
                                  {pharmacy.country_code ||
                                    "—"}
                                </span>
                              </td>

                              {/* DEVISE */}

                              <td>
                                {pharmacy.currency_code ||
                                  "—"}
                              </td>

                              {/* STATUT */}

                              <td>
                                <span
                                  className={`statusBadge ${status.className}`}
                                >
                                  <span className="statusDot" />

                                  {status.label}
                                </span>
                              </td>

                              {/* ACCÈS MANUEL */}

                              <td>

                                {manualAccess ? (

                                  <div className="manualStatus">

                                    <span className="manualBadge active">
                                      <span className="manualDot" />
                                      Actif
                                    </span>

                                    <small>
                                      Jusqu'au{" "}
                                      {formatDate(
                                        pharmacy.manual_access_until,
                                      )}
                                    </small>

                                  </div>

                                ) : pharmacy.manual_access_enabled ? (

                                  <div className="manualStatus">

                                    <span className="manualBadge expired">
                                      <span className="manualDot" />
                                      Expiré
                                    </span>

                                    {pharmacy.manual_access_until && (
                                      <small>
                                        Expiré le{" "}
                                        {formatDate(
                                          pharmacy.manual_access_until,
                                        )}
                                      </small>
                                    )}

                                  </div>

                                ) : (

                                  <span className="manualBadge">
                                    <span className="manualDot" />
                                    Aucun
                                  </span>

                                )}

                              </td>

                              {/* INSCRIPTION */}

                              <td>
                                {formatDate(
                                  pharmacy.created_at,
                                )}
                              </td>

                              {/* ACTIONS */}

                              <td>

                                <ManualAccessActions
                                  pharmacyId={
                                    pharmacy.id
                                  }
                                  pharmacyName={
                                    pharmacy.name ||
                                    "Pharmacie"
                                  }
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
                                    manualAccess
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

          </>
        )}

      </div>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .page {
    min-height: 100vh;
    padding: 32px;
    background: #f5f7fb;
    color: #0f172a;
  }

  .container {
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
  }

  .headerContent {
    min-width: 0;
  }

  .eyebrow {
    margin-bottom: 8px;
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .14em;
  }

  h1 {
    margin: 0;
    color: #0f172a;
    font-size: 40px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -.04em;
  }

  .header p {
    max-width: 650px;
    margin: 10px 0 0;
    color: #64748b;
    font-size: 15px;
    line-height: 1.6;
  }

  .backButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 18px;
    border: 1px solid #dbe3ef;
    border-radius: 12px;
    background: #fff;
    color: #1e293b;
    text-decoration: none;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 5px 18px rgba(15,23,42,.05);
  }

  .backButton:hover {
    background: #f8fafc;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 22px;
  }

  .statCard {
    display: flex;
    align-items: center;
    gap: 15px;
    min-height: 112px;
    padding: 20px;
    border: 1px solid #e5eaf2;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 8px 25px rgba(15,23,42,.05);
  }

  .statIcon {
    width: 48px;
    height: 48px;
    display: grid;
    flex: 0 0 48px;
    place-items: center;
    border-radius: 14px;
    background: #eff6ff;
    color: #2563eb;
    font-size: 21px;
    font-weight: 800;
  }

  .statIcon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .statIcon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .statIcon.red {
    background: #fef2f2;
    color: #dc2626;
  }

  .statCard span {
    display: block;
    margin-bottom: 6px;
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
  }

  .statCard strong {
    display: block;
    color: #0f172a;
    font-size: 29px;
    line-height: 1;
    font-weight: 800;
  }

  .manualAccessSummary {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 22px;
    padding: 16px 20px;
    border: 1px solid #bfdbfe;
    border-radius: 16px;
    background: #eff6ff;
  }

  .manualAccessIcon {
    width: 42px;
    height: 42px;
    display: grid;
    flex: 0 0 42px;
    place-items: center;
    border-radius: 12px;
    background: #fff;
    font-size: 19px;
  }

  .manualAccessContent strong {
    display: block;
    margin-bottom: 3px;
    color: #1e3a8a;
    font-size: 14px;
    font-weight: 800;
  }

  .manualAccessContent span {
    display: block;
    color: #475569;
    font-size: 13px;
  }

  .card {
    overflow: hidden;
    border: 1px solid #e5eaf2;
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 12px 35px rgba(15,23,42,.06);
  }

  .cardHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 22px 24px;
    border-bottom: 1px solid #edf1f6;
  }

  .cardHeader h2 {
    margin: 0;
    color: #0f172a;
    font-size: 18px;
    font-weight: 800;
  }

  .cardHeader p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
  }

  .totalBadge {
    min-width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    padding: 0 10px;
    border-radius: 12px;
    background: #eff6ff;
    color: #2563eb;
    font-size: 14px;
    font-weight: 800;
  }

  .tableWrapper {
    width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 1250px;
    border-collapse: collapse;
  }

  thead {
    background: #f8fafc;
  }

  th {
    padding: 14px 20px;
    border-bottom: 1px solid #e5eaf2;
    color: #64748b;
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  td {
    padding: 17px 20px;
    border-bottom: 1px solid #eef2f7;
    color: #334155;
    font-size: 14px;
    vertical-align: middle;
  }

  tbody tr:hover {
    background: #f8fbff;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  .pharmacyCell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 245px;
  }

  .avatar {
    width: 42px;
    height: 42px;
    display: grid;
    flex: 0 0 42px;
    place-items: center;
    border-radius: 12px;
    background: #2563eb;
    color: #fff;
    font-size: 16px;
    font-weight: 800;
  }

  .pharmacyInfo {
    min-width: 0;
  }

  .pharmacyInfo strong {
    display: block;
    margin-bottom: 4px;
    overflow: hidden;
    color: #0f172a;
    font-size: 14px;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pharmacyInfo small {
    display: block;
    max-width: 230px;
    overflow: hidden;
    color: #94a3b8;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .countryBadge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    padding: 5px 8px;
    border-radius: 7px;
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
    font-weight: 800;
  }

  .statusBadge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
  }

  .statusDot {
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 50%;
  }

  .statusBadge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .statusBadge.active .statusDot {
    background: #10b981;
  }

  .statusBadge.inactive {
    background: #fef2f2;
    color: #b91c1c;
  }

  .statusBadge.inactive .statusDot {
    background: #ef4444;
  }

  .statusBadge.suspended {
    background: #fff7ed;
    color: #c2410c;
  }

  .statusBadge.suspended .statusDot {
    background: #f97316;
  }

  .statusBadge.pending {
    background: #fffbeb;
    color: #b45309;
  }

  .statusBadge.pending .statusDot {
    background: #f59e0b;
  }

  .statusBadge.trial {
    background: #eef2ff;
    color: #4338ca;
  }

  .statusBadge.trial .statusDot {
    background: #6366f1;
  }

  .statusBadge.unknown {
    background: #f1f5f9;
    color: #475569;
  }

  .statusBadge.unknown .statusDot {
    background: #94a3b8;
  }

  .manualStatus {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .manualStatus small {
    color: #64748b;
    font-size: 10px;
    white-space: nowrap;
  }

  .manualBadge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
  }

  .manualBadge.active {
    background: #ecfdf5;
    color: #047857;
  }

  .manualBadge.expired {
    background: #fff7ed;
    color: #c2410c;
  }

  .manualDot {
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 50%;
    background: #94a3b8;
  }

  .manualBadge.active .manualDot {
    background: #10b981;
  }

  .manualBadge.expired .manualDot {
    background: #f97316;
  }

  .errorCard {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    padding: 24px;
    border: 1px solid #fecaca;
    border-radius: 18px;
    background: #fff7f7;
  }

  .errorIcon {
    width: 42px;
    height: 42px;
    display: grid;
    flex: 0 0 42px;
    place-items: center;
    border-radius: 12px;
    background: #fee2e2;
    color: #dc2626;
    font-size: 20px;
    font-weight: 900;
  }

  .errorCard h2 {
    margin: 0 0 7px;
    color: #991b1b;
    font-size: 17px;
    font-weight: 800;
  }

  .errorCard p {
    margin: 0;
    color: #7f1d1d;
    font-size: 14px;
    line-height: 1.6;
  }

  .emptyState {
    padding: 80px 24px;
    text-align: center;
  }

  .emptyIcon {
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
    margin: 0 auto 16px;
    border-radius: 18px;
    background: #eff6ff;
    font-size: 28px;
  }

  .emptyState h3 {
    margin: 0 0 8px;
    color: #0f172a;
    font-size: 18px;
    font-weight: 800;
  }

  .emptyState p {
    max-width: 500px;
    margin: 0 auto;
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
  }

  @media (max-width: 1050px) {
    .statsGrid {
      grid-template-columns: repeat(
        2,
        minmax(0, 1fr)
      );
    }
  }

  @media (max-width: 700px) {
    .page {
      padding: 18px 12px;
    }

    .header {
      flex-direction: column;
    }

    .backButton {
      width: 100%;
    }

    h1 {
      font-size: 32px;
    }

    .statsGrid {
      grid-template-columns: 1fr;
    }

    .cardHeader {
      align-items: flex-start;
    }

    .manualAccessSummary {
      align-items: flex-start;
    }
  }
`;