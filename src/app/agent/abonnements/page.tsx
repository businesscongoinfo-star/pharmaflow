import Link from "next/link";

import { requireAgent } from "@/app/lib/agent/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

/* ============================================================
   TYPES
============================================================ */

type SubscriptionRow = {
  id: string;
  pharmacy_id: string;
  plan_id: string;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PharmacyRow = {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
  owner_id: string | null;
  status: string | null;
};

type PlanRow = {
  id: string;
  name: string | null;
  code: string | null;
  duration_days: number | null;
  is_active: boolean | null;
};

type PlanPriceRow = {
  plan_id: string;
  currency_code: string;
  price: number;
};

type SubscriptionView = SubscriptionRow & {
  pharmacy: PharmacyRow | null;
  plan: PlanRow | null;
  price: number | null;
  currency: string | null;
};

/* ============================================================
   HELPERS
============================================================ */

function normalizeStatus(
  value: string | null | undefined,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function statusLabel(
  value: string | null | undefined,
): string {
  const status = normalizeStatus(value);

  switch (status) {
    case "active":
    case "paid":
      return "Actif";

    case "trial":
    case "trialing":
      return "Essai";

    case "expired":
      return "Expiré";

    case "past_due":
      return "Impayé";

    case "suspended":
      return "Suspendu";

    case "cancelled":
    case "canceled":
      return "Annulé";

    default:
      return value || "Inconnu";
  }
}

function statusClass(
  value: string | null | undefined,
): string {
  const status = normalizeStatus(value);

  switch (status) {
    case "active":
    case "paid":
      return "finance-status finance-status-active";

    case "trial":
    case "trialing":
      return "finance-status finance-status-trial";

    case "expired":
      return "finance-status finance-status-expired";

    case "past_due":
      return "finance-status finance-status-warning";

    case "suspended":
    case "cancelled":
    case "canceled":
      return "finance-status finance-status-danger";

    default:
      return "finance-status";
  }
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function formatMoney(
  amount: number | null,
  currency: string | null,
): string {
  if (
    amount === null ||
    !Number.isFinite(amount)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 2,
    },
  ).format(amount) +
    (currency
      ? ` ${currency}`
      : "");
}

function isCurrentlyValid(
  subscription: SubscriptionRow,
): boolean {
  const status = normalizeStatus(
    subscription.status,
  );

  const expiration = subscription.expires_at
    ? new Date(
        subscription.expires_at,
      ).getTime()
    : null;

  const now = Date.now();

  if (
    status === "active" ||
    status === "paid"
  ) {
    return (
      expiration === null ||
      expiration > now
    );
  }

  if (
    status === "trial" ||
    status === "trialing"
  ) {
    const trialEnd =
      subscription.trial_ends_at
        ? new Date(
            subscription.trial_ends_at,
          ).getTime()
        : null;

    return (
      trialEnd === null ||
      trialEnd > now
    );
  }

  return false;
}

/* ============================================================
   PAGE
============================================================ */

export default async function AgentAbonnementsPage() {
  /*
   * IMPORTANT :
   * requireAgent() retourne directement l'agent.
   *
   * NE PAS faire :
   * const { member } = await requireAgent();
   */
  const member = await requireAgent();

  const supabase = createAdminClient();

  /* ==========================================================
     1. RÉCUPÉRER LES ABONNEMENTS
  ========================================================== */

  const {
    data: subscriptionRows,
    error: subscriptionError,
  } = await supabase
    .from("subscriptions")
    .select(
      `
        id,
        pharmacy_id,
        plan_id,
        status,
        trial_started_at,
        trial_ends_at,
        expires_at,
        created_at,
        updated_at
      `,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (subscriptionError) {
    console.error(
      "PharmaFlow Finance subscriptions:",
      subscriptionError,
    );
  }

  const subscriptions =
    (subscriptionRows ??
      []) as SubscriptionRow[];

  /* ==========================================================
     2. IDENTIFIANTS PHARMACIES
  ========================================================== */

  const pharmacyIds = Array.from(
    new Set(
      subscriptions
        .map(
          (item) =>
            item.pharmacy_id,
        )
        .filter(Boolean),
    ),
  );

  const planIds = Array.from(
    new Set(
      subscriptions
        .map(
          (item) =>
            item.plan_id,
        )
        .filter(Boolean),
    ),
  );

  /* ==========================================================
     3. PHARMACIES
  ========================================================== */

  let pharmacies: PharmacyRow[] =
    [];

  if (pharmacyIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("pharmacies")
      .select(
        `
          id,
          name,
          address,
          city,
          country_code,
          currency_code,
          owner_id,
          status
        `,
      )
      .in(
        "id",
        pharmacyIds,
      );

    if (error) {
      console.error(
        "PharmaFlow Finance pharmacies:",
        error,
      );
    } else {
      pharmacies =
        (data ??
          []) as PharmacyRow[];
    }
  }

  /* ==========================================================
     4. PLANS
  ========================================================== */

  let plans: PlanRow[] = [];

  if (planIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("subscription_plans")
      .select(
        `
          id,
          name,
          code,
          duration_days,
          is_active
        `,
      )
      .in(
        "id",
        planIds,
      );

    if (error) {
      console.error(
        "PharmaFlow Finance plans:",
        error,
      );
    } else {
      plans =
        (data ??
          []) as PlanRow[];
    }
  }

  /* ==========================================================
     5. PRIX
     
     On récupère les prix disponibles.
     Le prix réellement affiché dépend de la
     devise de la pharmacie.
  ========================================================== */

  let prices: PlanPriceRow[] =
    [];

  if (planIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "subscription_plan_prices",
      )
      .select(
        `
          plan_id,
          currency_code,
          price
        `,
      )
      .in(
        "plan_id",
        planIds,
      );

    if (error) {
      console.error(
        "PharmaFlow Finance prices:",
        error,
      );
    } else {
      prices =
        (data ??
          []) as PlanPriceRow[];
    }
  }

  /* ==========================================================
     6. CONSTRUIRE LA VUE FINANCIÈRE
  ========================================================== */

  const subscriptionViews: SubscriptionView[] =
    subscriptions.map(
      (subscription) => {
        const pharmacy =
          pharmacies.find(
            (item) =>
              item.id ===
              subscription.pharmacy_id,
          ) ?? null;

        const plan =
          plans.find(
            (item) =>
              item.id ===
              subscription.plan_id,
          ) ?? null;

        const currency =
          pharmacy?.currency_code
            ?.trim()
            .toUpperCase() ??
          null;

        const price =
          prices.find(
            (item) =>
              item.plan_id ===
                subscription.plan_id &&
              item.currency_code
                ?.trim()
                .toUpperCase() ===
                currency,
          ) ?? null;

        return {
          ...subscription,
          pharmacy,
          plan,
          price: price
            ? Number(price.price)
            : null,
          currency,
        };
      },
    );

  /* ==========================================================
     7. STATISTIQUES
  ========================================================== */

  const totalSubscriptions =
    subscriptionViews.length;

  const activeSubscriptions =
    subscriptionViews.filter(
      (item) =>
        normalizeStatus(
          item.status,
        ) === "active" ||
        normalizeStatus(
          item.status,
        ) === "paid",
    ).length;

  const trialSubscriptions =
    subscriptionViews.filter(
      (item) => {
        const status =
          normalizeStatus(
            item.status,
          );

        return (
          status === "trial" ||
          status === "trialing"
        );
      },
    ).length;

  const expiredSubscriptions =
    subscriptionViews.filter(
      (item) =>
        normalizeStatus(
          item.status,
        ) === "expired",
    ).length;

  const pendingSubscriptions =
    subscriptionViews.filter(
      (item) =>
        normalizeStatus(
          item.status,
        ) === "past_due",
    ).length;

  const validSubscriptions =
    subscriptionViews.filter(
      (item) =>
        isCurrentlyValid(item),
    ).length;

  /* ==========================================================
     8. REVENUS INDICATIFS DES ABONNEMENTS
     
     IMPORTANT :
     Ce montant n'est PAS présenté comme un encaissement réel.
     Il représente uniquement la valeur des abonnements dont
     le prix est connu.
  ========================================================== */

  const estimatedValueByCurrency =
    subscriptionViews.reduce<
      Record<string, number>
    >(
      (
        accumulator,
        subscription,
      ) => {
        const status =
          normalizeStatus(
            subscription.status,
          );

        const paidLike =
          status === "active" ||
          status === "paid";

        if (
          !paidLike ||
          subscription.price ===
            null ||
          !subscription.currency
        ) {
          return accumulator;
        }

        accumulator[
          subscription.currency
        ] =
          (
            accumulator[
              subscription.currency
            ] ?? 0
          ) +
          subscription.price;

        return accumulator;
      },
      {},
    );

  /* ==========================================================
     9. DATE ACTUELLE
  ========================================================== */

  const generatedAt =
    new Date().toLocaleString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  return (
    <main className="finance-page">
      <div className="finance-shell">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="finance-header">

          <div>
            <Link
              href="/agent"
              className="finance-back"
            >
              ← Retour espace agent
            </Link>

            <div className="finance-eyebrow">
              PHARMAFLOW FINANCE
            </div>

            <h1>
              Gestion des abonnements
            </h1>

            <p>
              Suivi financier des abonnements
              des pharmacies PharmaFlow.
            </p>
          </div>

          <div className="finance-agent-card">

            <div className="finance-agent-avatar">
              {(
                member.full_name ||
                "A"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {member.full_name ||
                  "Agent Finance"}
              </strong>

              <span>
                Agent Finance
              </span>
            </div>

          </div>

        </header>

        {/* ==================================================
            KPI
        ================================================== */}

        <section className="finance-kpi-grid">

          <div className="finance-kpi-card">

            <div className="finance-kpi-icon">
              ◉
            </div>

            <div>
              <span>
                Total abonnements
              </span>

              <strong>
                {totalSubscriptions}
              </strong>
            </div>

          </div>

          <div className="finance-kpi-card">

            <div className="finance-kpi-icon finance-green">
              ✓
            </div>

            <div>
              <span>
                Abonnements actifs
              </span>

              <strong>
                {activeSubscriptions}
              </strong>
            </div>

          </div>

          <div className="finance-kpi-card">

            <div className="finance-kpi-icon finance-blue">
              ⏱
            </div>

            <div>
              <span>
                Essais en cours
              </span>

              <strong>
                {trialSubscriptions}
              </strong>
            </div>

          </div>

          <div className="finance-kpi-card">

            <div className="finance-kpi-icon finance-orange">
              !
            </div>

            <div>
              <span>
                Impayés
              </span>

              <strong>
                {pendingSubscriptions}
              </strong>
            </div>

          </div>

          <div className="finance-kpi-card">

            <div className="finance-kpi-icon finance-red">
              ×
            </div>

            <div>
              <span>
                Expirés
              </span>

              <strong>
                {expiredSubscriptions}
              </strong>
            </div>

          </div>

          <div className="finance-kpi-card">

            <div className="finance-kpi-icon finance-purple">
              ◆
            </div>

            <div>
              <span>
                Accès actuellement valides
              </span>

              <strong>
                {validSubscriptions}
              </strong>
            </div>

          </div>

        </section>

        {/* ==================================================
            NAVIGATION FINANCE
        ================================================== */}

        <section className="finance-navigation">

          <Link
            href="/agent/abonnements"
            className="finance-nav-active"
          >
            <span>▣</span>
            Abonnements
          </Link>

          <Link
            href="/agent/paiements"
            className="finance-nav-link"
          >
            <span>◈</span>
            Paiements
          </Link>

          <Link
            href="/agent/finance"
            className="finance-nav-link"
          >
            <span>▥</span>
            Tableau financier
          </Link>

        </section>

        {/* ==================================================
            VALEUR PAR DEVISE
        ================================================== */}

        <section className="finance-summary">

          <div className="finance-section-title">

            <div>
              <span>
                SYNTHÈSE
              </span>

              <h2>
                Valeur des abonnements actifs
              </h2>
            </div>

            <small>
              Généré le {generatedAt}
            </small>

          </div>

          <div className="finance-currency-grid">

            {Object.keys(
              estimatedValueByCurrency,
            ).length === 0 ? (
              <div className="finance-empty-small">
                Aucun montant d'abonnement
                actif avec un tarif configuré.
              </div>
            ) : (
              Object.entries(
                estimatedValueByCurrency,
              ).map(
                ([
                  currency,
                  amount,
                ]) => (
                  <div
                    key={currency}
                    className="finance-currency-card"
                  >
                    <span>
                      {currency}
                    </span>

                    <strong>
                      {formatMoney(
                        amount,
                        currency,
                      )}
                    </strong>

                    <small>
                      Valeur tarifaire des
                      abonnements actifs
                    </small>
                  </div>
                ),
              )
            )}

          </div>

          <div className="finance-notice">
            <span>ⓘ</span>

            <p>
              Cette synthèse correspond à la
              valeur tarifaire connue des
              abonnements actifs. Elle ne
              constitue pas un relevé
              d'encaissements confirmé.
            </p>
          </div>

        </section>

        {/* ==================================================
            TABLEAU
        ================================================== */}

        <section className="finance-table-card">

          <div className="finance-table-header">

            <div>
              <span>
                ABONNEMENTS
              </span>

              <h2>
                Toutes les pharmacies
              </h2>
            </div>

            <div className="finance-table-count">
              {totalSubscriptions} abonnement
              {totalSubscriptions > 1
                ? "s"
                : ""}
            </div>

          </div>

          {subscriptionError ? (
            <div className="finance-error">
              <strong>
                Impossible de charger les
                abonnements.
              </strong>

              <p>
                Vérifiez la connexion à la base
                de données et les permissions
                de la plateforme.
              </p>
            </div>
          ) : subscriptionViews.length ===
            0 ? (
            <div className="finance-empty">
              <div className="finance-empty-icon">
                ◌
              </div>

              <h3>
                Aucun abonnement trouvé
              </h3>

              <p>
                Aucun abonnement n'est
                actuellement enregistré dans
                PharmaFlow.
              </p>
            </div>
          ) : (
            <div className="finance-table-wrapper">

              <table className="finance-table">

                <thead>
                  <tr>
                    <th>
                      Pharmacie
                    </th>

                    <th>
                      Plan
                    </th>

                    <th>
                      Statut
                    </th>

                    <th>
                      Tarif
                    </th>

                    <th>
                      Début
                    </th>

                    <th>
                      Expiration
                    </th>

                    <th>
                      Dernière mise à jour
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {subscriptionViews.map(
                    (subscription) => (
                      <tr
                        key={
                          subscription.id
                        }
                      >

                        {/* PHARMACIE */}

                        <td>

                          <div className="finance-pharmacy">

                            <div className="finance-pharmacy-avatar">
                              {(
                                subscription
                                  .pharmacy
                                  ?.name ||
                                "P"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>

                              <strong>
                                {subscription
                                  .pharmacy
                                  ?.name ||
                                  "Pharmacie non renseignée"}
                              </strong>

                              <span>
                                {subscription
                                  .pharmacy
                                  ?.city ||
                                  subscription
                                    .pharmacy
                                    ?.country_code ||
                                  "Localisation inconnue"}
                              </span>

                            </div>

                          </div>

                        </td>

                        {/* PLAN */}

                        <td>

                          <div className="finance-plan">

                            <strong>
                              {subscription
                                .plan
                                ?.name ||
                                subscription
                                  .plan
                                  ?.code ||
                                "Plan non renseigné"}
                            </strong>

                            <span>
                              {subscription
                                .plan
                                ?.duration_days
                                ? `${subscription.plan.duration_days} jours`
                                : "Durée non renseignée"}
                            </span>

                          </div>

                        </td>

                        {/* STATUT */}

                        <td>

                          <span
                            className={statusClass(
                              subscription.status,
                            )}
                          >
                            <i />
                            {statusLabel(
                              subscription.status,
                            )}
                          </span>

                        </td>

                        {/* PRIX */}

                        <td>

                          <strong className="finance-price">
                            {formatMoney(
                              subscription.price,
                              subscription.currency,
                            )}
                          </strong>

                        </td>

                        {/* DATE DÉBUT */}

                        <td>
                          <span className="finance-date">
                            {formatDate(
                              subscription.created_at,
                            )}
                          </span>
                        </td>

                        {/* EXPIRATION */}

                        <td>

                          <div className="finance-expiration">

                            <strong>
                              {formatDate(
                                subscription.expires_at,
                              )}
                            </strong>

                            {subscription
                              .expires_at && (
                              <span>
                                {isCurrentlyValid(
                                  subscription,
                                )
                                  ? "Accès valide"
                                  : "Accès à vérifier"}
                              </span>
                            )}

                          </div>

                        </td>

                        {/* UPDATED */}

                        <td>
                          <span className="finance-date">
                            {formatDateTime(
                              subscription.updated_at,
                            )}
                          </span>
                        </td>

                        {/* ACTION */}

                        <td>

                          <Link
                            href={`/agent/abonnements/${subscription.id}`}
                            className="finance-view-button"
                          >
                            Voir
                            <span>
                              →
                            </span>
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

        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="finance-footer">

          <div>
            <strong>
              Pharma<span>Flow</span>
            </strong>

            <small>
              Gestion financière de la plateforme
            </small>
          </div>

          <small>
            Agent connecté :{" "}
            {member.full_name ||
              "Agent Finance"}
          </small>

        </footer>

      </div>

      {/* ==================================================
          STYLE LOCAL
      ================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .finance-page {
          min-height: 100vh;
          background:
            linear-gradient(
              135deg,
              #f4f8f8 0%,
              #f8fbfc 50%,
              #eef8f7 100%
            );
          color: #172033;
          padding: 30px;
        }

        .finance-shell {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
        }

        .finance-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 28px;
        }

        .finance-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 16px;
          color: #0f766e;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .finance-back:hover {
          text-decoration: underline;
        }

        .finance-eyebrow {
          margin-bottom: 7px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .13em;
        }

        .finance-header h1 {
          margin: 0;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1.08;
          font-weight: 900;
          letter-spacing: -.04em;
        }

        .finance-header p {
          margin: 10px 0 0;
          color: #667085;
          font-size: 14px;
        }

        .finance-agent-card {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 210px;
          padding: 12px 15px;
          border: 1px solid #dce7e8;
          border-radius: 15px;
          background: rgba(255,255,255,.85);
          box-shadow:
            0 10px 30px
            rgba(15,23,42,.05);
        }

        .finance-agent-avatar {
          width: 43px;
          height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #0f766e;
          color: white;
          font-size: 17px;
          font-weight: 900;
        }

        .finance-agent-card strong {
          display: block;
          font-size: 13px;
        }

        .finance-agent-card span {
          display: block;
          margin-top: 3px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 800;
        }

        .finance-kpi-grid {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .finance-kpi-card {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 105px;
          padding: 17px;
          border: 1px solid #dfe9ea;
          border-radius: 17px;
          background: rgba(255,255,255,.88);
          box-shadow:
            0 10px 30px
            rgba(15,23,42,.045);
        }

        .finance-kpi-icon {
          width: 43px;
          height: 43px;
          min-width: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #e7f6f4;
          color: #0f766e;
          font-size: 18px;
          font-weight: 900;
        }

        .finance-green {
          background: #e9f8ef;
          color: #15803d;
        }

        .finance-blue {
          background: #eaf2ff;
          color: #2563eb;
        }

        .finance-orange {
          background: #fff5e7;
          color: #c2410c;
        }

        .finance-red {
          background: #ffeded;
          color: #dc2626;
        }

        .finance-purple {
          background: #f3edff;
          color: #7c3aed;
        }

        .finance-kpi-card span {
          display: block;
          color: #667085;
          font-size: 11px;
          font-weight: 700;
        }

        .finance-kpi-card strong {
          display: block;
          margin-top: 5px;
          color: #172033;
          font-size: 24px;
          font-weight: 900;
        }

        .finance-navigation {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px;
          margin-bottom: 18px;
          border: 1px solid #dfe8e9;
          border-radius: 15px;
          background: rgba(255,255,255,.8);
        }

        .finance-navigation a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          border-radius: 10px;
          color: #667085;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
        }

        .finance-navigation a:hover {
          background: #f0f7f7;
          color: #0f766e;
        }

        .finance-navigation .finance-nav-active {
          background: #0f766e;
          color: white;
        }

        .finance-summary,
        .finance-table-card {
          border: 1px solid #dfe8e9;
          border-radius: 20px;
          background: rgba(255,255,255,.9);
          box-shadow:
            0 12px 35px
            rgba(15,23,42,.055);
        }

        .finance-summary {
          padding: 23px;
          margin-bottom: 18px;
        }

        .finance-section-title {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 17px;
        }

        .finance-section-title > div > span,
        .finance-table-header > div > span {
          color: #0f766e;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .finance-section-title h2,
        .finance-table-header h2 {
          margin: 5px 0 0;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -.02em;
        }

        .finance-section-title small {
          color: #98a2b3;
          font-size: 11px;
        }

        .finance-currency-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(210px, 1fr)
            );
          gap: 12px;
        }

        .finance-currency-card {
          padding: 17px;
          border: 1px solid #e2ebec;
          border-radius: 15px;
          background: #f9fcfc;
        }

        .finance-currency-card > span {
          display: block;
          color: #0f766e;
          font-size: 11px;
          font-weight: 900;
        }

        .finance-currency-card strong {
          display: block;
          margin-top: 6px;
          font-size: 22px;
          font-weight: 900;
        }

        .finance-currency-card small {
          display: block;
          margin-top: 5px;
          color: #7a8798;
          font-size: 10px;
          line-height: 1.4;
        }

        .finance-notice {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          padding: 12px 14px;
          border: 1px solid #d9e8f5;
          border-radius: 12px;
          background: #f5faff;
        }

        .finance-notice span {
          color: #2563eb;
          font-weight: 900;
        }

        .finance-notice p {
          margin: 0;
          color: #536174;
          font-size: 11px;
          line-height: 1.5;
        }

        .finance-table-card {
          overflow: hidden;
        }

        .finance-table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 22px 23px;
          border-bottom: 1px solid #e5ebed;
        }

        .finance-table-count {
          padding: 7px 11px;
          border-radius: 9px;
          background: #eef7f6;
          color: #0f766e;
          font-size: 11px;
          font-weight: 800;
        }

        .finance-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .finance-table {
          width: 100%;
          min-width: 1150px;
          border-collapse: collapse;
        }

        .finance-table th {
          padding: 12px 15px;
          border-bottom: 1px solid #e5ebed;
          background: #f8fafb;
          color: #667085;
          text-align: left;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .03em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .finance-table td {
          padding: 14px 15px;
          border-bottom: 1px solid #edf1f2;
          vertical-align: middle;
        }

        .finance-table tbody tr:hover {
          background: #fbfefe;
        }

        .finance-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .finance-pharmacy {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 180px;
        }

        .finance-pharmacy-avatar {
          width: 37px;
          height: 37px;
          min-width: 37px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #e8f5f3;
          color: #0f766e;
          font-size: 14px;
          font-weight: 900;
        }

        .finance-pharmacy strong,
        .finance-plan strong {
          display: block;
          color: #172033;
          font-size: 12px;
          font-weight: 850;
        }

        .finance-pharmacy span,
        .finance-plan span {
          display: block;
          margin-top: 4px;
          color: #8793a4;
          font-size: 10px;
        }

        .finance-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 999px;
          background: #eef2f4;
          color: #596574;
          font-size: 10px;
          font-weight: 850;
          white-space: nowrap;
        }

        .finance-status i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .finance-status-active {
          background: #e9f8ef;
          color: #15803d;
        }

        .finance-status-trial {
          background: #eaf2ff;
          color: #2563eb;
        }

        .finance-status-warning {
          background: #fff5e7;
          color: #c2410c;
        }

        .finance-status-expired {
          background: #f2f4f5;
          color: #667085;
        }

        .finance-status-danger {
          background: #ffeded;
          color: #dc2626;
        }

        .finance-price {
          color: #0f766e;
          font-size: 12px;
          white-space: nowrap;
        }

        .finance-date {
          color: #596574;
          font-size: 10px;
          white-space: nowrap;
        }

        .finance-expiration strong {
          display: block;
          font-size: 11px;
          white-space: nowrap;
        }

        .finance-expiration span {
          display: block;
          margin-top: 4px;
          color: #8793a4;
          font-size: 9px;
        }

        .finance-view-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 10px;
          border: 1px solid #cfe3e1;
          border-radius: 8px;
          background: #f3faf9;
          color: #0f766e;
          text-decoration: none;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .finance-view-button:hover {
          background: #0f766e;
          color: white;
          border-color: #0f766e;
        }

        .finance-empty,
        .finance-error {
          margin: 20px;
          padding: 45px 20px;
          border: 1px dashed #d5dfe1;
          border-radius: 15px;
          text-align: center;
        }

        .finance-empty-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          border-radius: 14px;
          background: #eef7f6;
          color: #0f766e;
          font-size: 20px;
        }

        .finance-empty h3,
        .finance-error strong {
          margin: 0;
          font-size: 15px;
        }

        .finance-empty p,
        .finance-error p {
          margin: 7px 0 0;
          color: #7a8798;
          font-size: 12px;
        }

        .finance-error {
          border-color: #f1cccc;
          background: #fffafa;
        }

        .finance-error strong {
          color: #b42318;
        }

        .finance-empty-small {
          padding: 20px;
          border: 1px dashed #d5dfe1;
          border-radius: 13px;
          color: #7a8798;
          font-size: 12px;
        }

        .finance-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 4px 5px;
          color: #8793a4;
        }

        .finance-footer strong {
          display: block;
          color: #172033;
          font-size: 14px;
        }

        .finance-footer strong span {
          color: #0f766e;
        }

        .finance-footer small {
          display: block;
          margin-top: 3px;
          font-size: 10px;
        }

        @media (max-width: 1250px) {
          .finance-kpi-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .finance-page {
            padding: 18px;
          }

          .finance-header {
            flex-direction: column;
          }

          .finance-agent-card {
            width: 100%;
          }

          .finance-kpi-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .finance-navigation {
            overflow-x: auto;
          }

          .finance-navigation a {
            white-space: nowrap;
          }

          .finance-section-title,
          .finance-table-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .finance-page {
            padding: 12px;
          }

          .finance-kpi-grid {
            grid-template-columns: 1fr;
          }

          .finance-header h1 {
            font-size: 28px;
          }

          .finance-summary {
            padding: 17px;
          }

          .finance-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }

      `}</style>
    </main>
  );
}