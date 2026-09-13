import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";
import { createSuperAdminClient } from "@/app/lib/super-admin/admin-client";

export const dynamic = "force-dynamic";

/* ============================================================
   TYPES
============================================================ */

type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  country_codes: string[];
  base_currency: string;
  exchange_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

/* ============================================================
   SERVER ACTION
============================================================ */

async function updateCurrency(formData: FormData) {
  "use server";

  const admin = await requireSuperAdmin();
  const supabase = createSuperAdminClient();

  const id = String(formData.get("id") || "").trim();
  const exchangeRateRaw = String(
    formData.get("exchange_rate") || "",
  ).trim();

  const isActive =
    String(formData.get("is_active") || "") === "true";

  if (!id) {
    throw new Error("La devise sélectionnée est invalide.");
  }

  let exchangeRate: number | null = null;

  if (exchangeRateRaw !== "") {
    const parsedRate = Number(exchangeRateRaw);

    if (
      !Number.isFinite(parsedRate) ||
      parsedRate <= 0
    ) {
      throw new Error(
        "Le taux de change doit être un nombre supérieur à 0.",
      );
    }

    exchangeRate = parsedRate;
  }

  const { error } = await supabase
    .from("platform_currencies")
    .update({
      exchange_rate: exchangeRate,
      is_active: isActive,
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Impossible de mettre à jour la devise : ${error.message}`,
    );
  }

  revalidatePath("/super-admin/devises");
  revalidatePath("/super-admin");
}

/* ============================================================
   PAGE SUPER ADMIN — DEVISES
============================================================ */

export default async function SuperAdminCurrenciesPage() {
  const admin = await requireSuperAdmin();
  const supabase = createSuperAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("platform_currencies")
    .select(
      `
        id,
        code,
        name,
        symbol,
        country_codes,
        base_currency,
        exchange_rate,
        is_active,
        created_at,
        updated_at,
        updated_by
      `,
    )
    .order("code", {
      ascending: true,
    });

  const currencies: Currency[] =
    (data as Currency[] | null) || [];

  const activeCurrencies =
    currencies.filter(
      (currency) => currency.is_active,
    );

  const inactiveCurrencies =
    currencies.filter(
      (currency) => !currency.is_active,
    );

  return (
    <main className="currency-page">
      <style>{`
        .currency-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(59, 130, 246, 0.08),
              transparent 30%
            ),
            #f8fafc;
          color: #0f172a;
          padding: 28px;
        }

        .currency-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .currency-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .currency-title-wrap {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .currency-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #334155;
          text-decoration: none;
          font-size: 20px;
          transition: 0.2s ease;
        }

        .currency-back:hover {
          background: #f1f5f9;
          transform: translateX(-2px);
        }

        .currency-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        .currency-subtitle {
          max-width: 760px;
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.65;
        }

        .admin-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow:
            0 6px 20px rgba(15, 23, 42, 0.04);
        }

        /* =====================================================
           STATISTIQUES
        ===================================================== */

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          box-shadow:
            0 8px 30px rgba(15, 23, 42, 0.04);
        }

        .stat-label {
          margin-bottom: 8px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .stat-value {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        /* =====================================================
           INFORMATION
        ===================================================== */

        .info-card {
          margin-bottom: 24px;
          padding: 18px 20px;
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          background: #eff6ff;
          color: #1e3a8a;
        }

        .info-card-title {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 800;
        }

        .info-card-text {
          margin: 0;
          font-size: 13px;
          line-height: 1.65;
        }

        /* =====================================================
           ERREUR
        ===================================================== */

        .error-card {
          margin-bottom: 24px;
          padding: 18px 20px;
          border: 1px solid #fecaca;
          border-radius: 16px;
          background: #fef2f2;
          color: #991b1b;
        }

        .error-card-title {
          display: block;
          margin-bottom: 5px;
          font-weight: 800;
        }

        .error-card-text {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
        }

        /* =====================================================
           TABLEAU
        ===================================================== */

        .currency-table-card {
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow:
            0 8px 30px rgba(15, 23, 42, 0.04);
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 21px 22px;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-title {
          margin: 0;
          color: #0f172a;
          font-size: 18px;
          font-weight: 800;
        }

        .table-description {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1120px;
          border-collapse: collapse;
        }

        th {
          padding: 14px 18px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #64748b;
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        td {
          padding: 17px 18px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 14px;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        /* =====================================================
           DEVISE
        ===================================================== */

        .currency-code {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 60px;
          padding: 7px 10px;
          border-radius: 9px;
          background: #0f172a;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .currency-name {
          color: #0f172a;
          font-weight: 700;
        }

        .currency-symbol {
          color: #0f172a;
          font-size: 18px;
          font-weight: 800;
        }

        .country-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          max-width: 280px;
        }

        .country-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 7px;
          border-radius: 7px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
        }

        /* =====================================================
           STATUT
        ===================================================== */

        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-active {
          background: #dcfce7;
          color: #166534;
        }

        .status-inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }

        /* =====================================================
           FORMULAIRE
        ===================================================== */

        .edit-form {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .rate-input {
          width: 130px;
          height: 38px;
          padding: 0 10px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          outline: none;
          background: #ffffff;
          color: #0f172a;
          font-size: 13px;
          transition: 0.2s ease;
        }

        .rate-input:focus {
          border-color: #64748b;
          box-shadow:
            0 0 0 3px
            rgba(100, 116, 139, 0.12);
        }

        .status-select {
          width: 120px;
          height: 38px;
          padding: 0 9px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          outline: none;
          background: #ffffff;
          color: #0f172a;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .status-select:focus {
          border-color: #64748b;
          box-shadow:
            0 0 0 3px
            rgba(100, 116, 139, 0.12);
        }

        .save-button {
          height: 38px;
          padding: 0 13px;
          border: none;
          border-radius: 9px;
          background: #0f172a;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .save-button:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }

        /* =====================================================
           ACTION TARIFS
        ===================================================== */

        .pricing-link {
          display: inline-flex;
          align-items: center;
          color: #334155;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .pricing-link:hover {
          color: #0f172a;
          text-decoration: underline;
        }

        /* =====================================================
           EMPTY STATE
        ===================================================== */

        .empty-state {
          padding: 64px 20px;
          text-align: center;
          color: #64748b;
        }

        .empty-icon {
          margin-bottom: 12px;
          font-size: 42px;
        }

        .empty-title {
          margin: 0 0 6px;
          color: #0f172a;
          font-size: 16px;
          font-weight: 800;
        }

        .empty-text {
          margin: 0;
          font-size: 13px;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .footer-note {
          margin-top: 18px;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.65;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1000px) {
          .currency-page {
            padding: 20px;
          }

          .currency-topbar {
            flex-direction: column;
          }

          .admin-badge {
            white-space: normal;
          }

          .stats-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .currency-page {
            padding: 15px;
          }

          .currency-title {
            font-size: 25px;
          }

          .currency-subtitle {
            font-size: 13px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .table-header {
            padding: 18px;
          }
        }

        @media (max-width: 500px) {
          .currency-title-wrap {
            gap: 10px;
          }

          .currency-back {
            width: 40px;
            height: 40px;
          }

          .currency-title {
            font-size: 22px;
          }
        }
      `}</style>

      <div className="currency-container">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="currency-topbar">

          <div className="currency-title-wrap">

            <Link
              href="/super-admin"
              className="currency-back"
              aria-label="Retour au Super Admin"
            >
              ←
            </Link>

            <div>

              <h1 className="currency-title">
                🌍 Devises internationales
              </h1>

              <p className="currency-subtitle">
                Gestion centralisée des devises utilisées
                par PharmaFlow pour les pharmacies,
                les abonnements et le futur déploiement
                international.
              </p>

            </div>

          </div>


          <div className="admin-badge">
            🔐
            <span>
              Super Admin
            </span>

            <span>
              •
            </span>

            <span>
              {admin.full_name ||
                "Administrateur"}
            </span>
          </div>

        </div>


        {/* ====================================================
            STATISTIQUES
        ==================================================== */}

        <div className="stats-grid">

          <div className="stat-card">

            <div className="stat-label">
              Devises configurées
            </div>

            <p className="stat-value">
              {currencies.length}
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-label">
              Devises actives
            </div>

            <p className="stat-value">
              {activeCurrencies.length}
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-label">
              Devises désactivées
            </div>

            <p className="stat-value">
              {inactiveCurrencies.length}
            </p>

          </div>

        </div>


        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <div className="info-card">

          <span className="info-card-title">
            ℹ️ À propos des taux de change
          </span>

          <p className="info-card-text">
            Le taux de change configuré ici est
            actuellement <strong>indicatif</strong>.
            Il ne déclenche pas automatiquement une
            conversion financière et ne modifie pas
            directement les montants envoyés aux
            prestataires de paiement.
          </p>

        </div>


        {/* ====================================================
            ERREUR DE LECTURE
        ==================================================== */}

        {error && (
          <div className="error-card">

            <span className="error-card-title">
              ⚠️ Erreur de chargement
            </span>

            <p className="error-card-text">
              {error.message}
            </p>

          </div>
        )}


        {/* ====================================================
            TABLEAU DES DEVISES
        ==================================================== */}

        <section className="currency-table-card">

          <div className="table-header">

            <div>

              <h2 className="table-title">
                Configuration des devises
              </h2>

              <p className="table-description">
                Activez ou désactivez une devise et
                configurez son taux indicatif.
              </p>

            </div>

          </div>


          {currencies.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                🌍
              </div>

              <h3 className="empty-title">
                Aucune devise configurée
              </h3>

              <p className="empty-text">
                La plateforme ne contient actuellement
                aucune devise.
              </p>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>
                      Code
                    </th>

                    <th>
                      Devise
                    </th>

                    <th>
                      Symbole
                    </th>

                    <th>
                      Pays
                    </th>

                    <th>
                      Devise de base
                    </th>

                    <th>
                      Taux indicatif
                    </th>

                    <th>
                      Statut
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>

                </thead>


                <tbody>

                  {currencies.map(
                    (currency) => (

                      <tr
                        key={currency.id}
                      >

                        {/* ==============================
                            CODE
                        ============================== */}

                        <td>

                          <span className="currency-code">
                            {currency.code}
                          </span>

                        </td>


                        {/* ==============================
                            NOM
                        ============================== */}

                        <td>

                          <div className="currency-name">
                            {currency.name}
                          </div>

                        </td>


                        {/* ==============================
                            SYMBOLE
                        ============================== */}

                        <td>

                          <span className="currency-symbol">
                            {currency.symbol}
                          </span>

                        </td>


                        {/* ==============================
                            PAYS
                        ============================== */}

                        <td>

                          <div className="country-list">

                            {Array.isArray(
                              currency.country_codes,
                            ) &&
                            currency.country_codes.length >
                              0 ? (

                              currency.country_codes.map(
                                (country) => (
                                  <span
                                    key={`${currency.id}-${country}`}
                                    className="country-tag"
                                  >
                                    {country}
                                  </span>
                                ),
                              )

                            ) : (

                              <span className="country-tag">
                                International
                              </span>

                            )}

                          </div>

                        </td>


                        {/* ==============================
                            BASE
                        ============================== */}

                        <td>

                          <strong>
                            {currency.base_currency}
                          </strong>

                        </td>


                        {/* ==============================
                            FORMULAIRE
                        ============================== */}

                        <td>

                          <form
                            action={updateCurrency}
                            className="edit-form"
                          >

                            <input
                              type="hidden"
                              name="id"
                              value={currency.id}
                            />


                            <input
                              type="number"
                              name="exchange_rate"
                              className="rate-input"
                              step="0.00000001"
                              min="0"
                              placeholder="Non configuré"
                              defaultValue={
                                currency.exchange_rate ??
                                ""
                              }
                              aria-label={`Taux de change ${currency.code}`}
                            />


                            <select
                              name="is_active"
                              className="status-select"
                              defaultValue={
                                currency.is_active
                                  ? "true"
                                  : "false"
                              }
                              aria-label={`Statut ${currency.code}`}
                            >

                              <option value="true">
                                Active
                              </option>

                              <option value="false">
                                Inactive
                              </option>

                            </select>


                            <button
                              type="submit"
                              className="save-button"
                            >
                              Enregistrer
                            </button>

                          </form>

                        </td>


                        {/* ==============================
                            STATUT
                        ============================== */}

                        <td>

                          {currency.is_active ? (

                            <span className="status status-active">

                              <span className="status-dot" />

                              Active

                            </span>

                          ) : (

                            <span className="status status-inactive">

                              <span className="status-dot" />

                              Inactive

                            </span>

                          )}

                        </td>


                        {/* ==============================
                            TARIFS
                        ============================== */}

                        <td>

                          <Link
                            href="/super-admin/abonnements"
                            className="pricing-link"
                          >
                            Tarifs →
                          </Link>

                        </td>

                      </tr>

                    ),
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* ====================================================
            NOTE
        ==================================================== */}

        <div className="footer-note">
          PharmaFlow — Configuration internationale.
          Les tarifs d'abonnement et les intégrations
          de paiement restent séparés de cette
          configuration afin de conserver un contrôle
          strict sur les paiements et les conversions.
        </div>

      </div>
    </main>
  );
}