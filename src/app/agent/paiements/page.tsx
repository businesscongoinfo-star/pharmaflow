import Link from "next/link";

import { requireAgent } from "@/app/lib/agent/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

type Subscription = {
  id: string;
  pharmacy_id: string;
  plan_id: string;
  status: string | null;
  expires_at: string | null;
  created_at: string | null;
};

type Pharmacy = {
  id: string;
  name: string | null;
  currency_code: string | null;
};

type Plan = {
  id: string;
  name: string | null;
  code: string | null;
};

type Price = {
  plan_id: string;
  currency_code: string;
  price: number;
};

function status(
  value: string | null,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function label(
  value: string | null,
) {
  switch (status(value)) {
    case "active":
    case "paid":
      return "Payé / actif";

    case "trial":
    case "trialing":
      return "Essai gratuit";

    case "past_due":
      return "Impayé";

    case "expired":
      return "Expiré";

    case "cancelled":
    case "canceled":
      return "Annulé";

    default:
      return value || "Inconnu";
  }
}

function formatDate(
  value: string | null,
) {
  if (!value) return "—";

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

function money(
  amount: number | null,
  currency: string | null,
) {
  if (
    amount === null ||
    !Number.isFinite(amount)
  ) {
    return "—";
  }

  return (
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 2,
      },
    ).format(amount) +
    ` ${currency ?? ""}`
  );
}

export default async function AgentPaymentsPage() {
  const member =
    await requireAgent();

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from("subscriptions")
    .select(
      `
        id,
        pharmacy_id,
        plan_id,
        status,
        expires_at,
        created_at
      `,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  const subscriptions =
    (data ??
      []) as Subscription[];

  const pharmacyIds =
    Array.from(
      new Set(
        subscriptions.map(
          (item) =>
            item.pharmacy_id,
        ),
      ),
    );

  const planIds =
    Array.from(
      new Set(
        subscriptions.map(
          (item) =>
            item.plan_id,
        ),
      ),
    );

  let pharmacies: Pharmacy[] =
    [];

  let plans: Plan[] =
    [];

  let prices: Price[] =
    [];

  if (pharmacyIds.length) {
    const { data } =
      await supabase
        .from("pharmacies")
        .select(
          `
            id,
            name,
            currency_code
          `,
        )
        .in(
          "id",
          pharmacyIds,
        );

    pharmacies =
      (data ??
        []) as Pharmacy[];
  }

  if (planIds.length) {
    const { data } =
      await supabase
        .from(
          "subscription_plans",
        )
        .select(
          `
            id,
            name,
            code
          `,
        )
        .in(
          "id",
          planIds,
        );

    plans =
      (data ??
        []) as Plan[];
  }

  if (planIds.length) {
    const { data } =
      await supabase
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

    prices =
      (data ??
        []) as Price[];
  }

  const paid =
    subscriptions.filter(
      (item) => {
        const s =
          status(item.status);

        return (
          s === "active" ||
          s === "paid"
        );
      },
    );

  const pending =
    subscriptions.filter(
      (item) =>
        status(item.status) ===
        "past_due",
    );

  const trials =
    subscriptions.filter(
      (item) => {
        const s =
          status(item.status);

        return (
          s === "trial" ||
          s === "trialing"
        );
      },
    );

  return (
    <main className="payments-page">

      <div className="shell">

        <header className="header">

          <div>

            <Link
              href="/agent"
              className="back"
            >
              ← Espace agent
            </Link>

            <div className="eyebrow">
              PHARMAFLOW FINANCE
            </div>

            <h1>
              Suivi des paiements
            </h1>

            <p>
              Suivi des règlements et de
              l'état financier des abonnements.
            </p>

          </div>

          <div className="agent">

            <div className="avatar">
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

        <nav className="nav">

          <Link
            href="/agent/abonnements"
          >
            Abonnements
          </Link>

          <Link
            href="/agent/paiements"
            className="active"
          >
            Paiements
          </Link>

          <Link
            href="/agent/finance"
          >
            Tableau financier
          </Link>

        </nav>

        <section className="stats">

          <div>
            <span>
              Actifs / payés
            </span>

            <strong>
              {paid.length}
            </strong>
          </div>

          <div>
            <span>
              En attente
            </span>

            <strong>
              {pending.length}
            </strong>
          </div>

          <div>
            <span>
              Essais gratuits
            </span>

            <strong>
              {trials.length}
            </strong>
          </div>

        </section>

        <section className="table-card">

          <div className="table-head">

            <div>
              <span>
                RÈGLEMENTS
              </span>

              <h2>
                Situation des abonnements
              </h2>
            </div>

            <span className="count">
              {subscriptions.length} dossiers
            </span>

          </div>

          {error ? (
            <div className="error">
              Impossible de charger les
              informations financières.
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
                      Plan
                    </th>

                    <th>
                      Statut
                    </th>

                    <th>
                      Tarif
                    </th>

                    <th>
                      Expiration
                    </th>

                    <th>
                      Dossier
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {subscriptions.map(
                    (subscription) => {

                      const pharmacy =
                        pharmacies.find(
                          (item) =>
                            item.id ===
                            subscription.pharmacy_id,
                        );

                      const plan =
                        plans.find(
                          (item) =>
                            item.id ===
                            subscription.plan_id,
                        );

                      const currency =
                        pharmacy
                          ?.currency_code
                          ?.toUpperCase() ??
                        null;

                      const price =
                        prices.find(
                          (item) =>
                            item.plan_id ===
                              subscription.plan_id &&
                            item.currency_code
                              ?.toUpperCase() ===
                              currency,
                        );

                      return (
                        <tr
                          key={
                            subscription.id
                          }
                        >

                          <td>
                            <strong>
                              {pharmacy?.name ||
                                "Pharmacie non renseignée"}
                            </strong>

                            <small>
                              {currency ||
                                "Devise inconnue"}
                            </small>
                          </td>

                          <td>
                            {plan?.name ||
                              plan?.code ||
                              "Plan inconnu"}
                          </td>

                          <td>

                            <span
                              className={
                                `badge ${status(
                                  subscription.status,
                                )}`
                              }
                            >
                              {label(
                                subscription.status,
                              )}
                            </span>

                          </td>

                          <td>
                            {money(
                              price
                                ? Number(
                                    price.price,
                                  )
                                : null,
                              currency,
                            )}
                          </td>

                          <td>
                            {formatDate(
                              subscription.expires_at,
                            )}
                          </td>

                          <td>
                            <Link
                              href={`/agent/abonnements/${subscription.id}`}
                            >
                              Voir →
                            </Link>
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

        <div className="notice">
          <strong>
            ℹ️ À propos de cette vue
          </strong>

          <p>
            Cette page présente actuellement
            l'état financier des abonnements à
            partir des enregistrements
            d'abonnement. Le registre détaillé
            des transactions encaissées sera
            relié directement à la table de
            transactions de paiement dès que
            sa structure sera confirmée dans
            votre base Supabase.
          </p>
        </div>

      </div>

      <style>{`
        .payments-page {
          min-height: 100vh;
          padding: 30px;
          background: #f5f9f9;
          color: #172033;
        }

        .shell {
          max-width: 1450px;
          margin: auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .back {
          color: #0f766e;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .eyebrow {
          margin-top: 20px;
          color: #0f766e;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        h1 {
          margin: 6px 0;
          font-size: 38px;
          font-weight: 950;
        }

        .header p {
          margin: 0;
          color: #667085;
        }

        .agent {
          display: flex;
          align-items: center;
          gap: 10px;
          height: fit-content;
          padding: 12px 15px;
          border: 1px solid #dce8e8;
          border-radius: 15px;
          background: white;
        }

        .avatar {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #0f766e;
          color: white;
          font-weight: 900;
        }

        .agent strong,
        .agent span {
          display: block;
        }

        .agent strong {
          font-size: 12px;
        }

        .agent span {
          margin-top: 3px;
          color: #0f766e;
          font-size: 10px;
          font-weight: 800;
        }

        .nav {
          display: flex;
          gap: 7px;
          padding: 7px;
          margin-bottom: 18px;
          border: 1px solid #dce8e8;
          border-radius: 14px;
          background: white;
        }

        .nav a {
          padding: 10px 15px;
          border-radius: 9px;
          color: #667085;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .nav a.active {
          background: #0f766e;
          color: white;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 14px;
        }

        .stats > div {
          padding: 20px;
          border: 1px solid #dce8e8;
          border-radius: 17px;
          background: white;
        }

        .stats span {
          color: #667085;
          font-size: 11px;
          font-weight: 800;
        }

        .stats strong {
          display: block;
          margin-top: 6px;
          font-size: 27px;
          font-weight: 950;
        }

        .table-card {
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid #dce8e8;
          border-radius: 19px;
          background: white;
        }

        .table-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px;
          border-bottom: 1px solid #edf1f2;
        }

        .table-head span:first-child {
          color: #0f766e;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .table-head h2 {
          margin: 5px 0 0;
          font-size: 19px;
        }

        .count {
          padding: 7px 10px;
          border-radius: 8px;
          background: #edf7f5;
          color: #0f766e;
          font-size: 10px;
          font-weight: 900;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
        }

        th {
          padding: 12px 15px;
          background: #f8fafb;
          color: #667085;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
        }

        td {
          padding: 15px;
          border-top: 1px solid #edf1f2;
          font-size: 11px;
        }

        td strong {
          display: block;
        }

        td small {
          display: block;
          margin-top: 4px;
          color: #98a2b3;
        }

        td a {
          color: #0f766e;
          text-decoration: none;
          font-weight: 900;
        }

        .badge {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 999px;
          background: #eef2f3;
          color: #667085;
          font-size: 10px;
          font-weight: 900;
        }

        .badge.active,
        .badge.paid {
          background: #e9f8ef;
          color: #15803d;
        }

        .badge.trial,
        .badge.trialing {
          background: #eaf2ff;
          color: #2563eb;
        }

        .badge.past_due {
          background: #fff4e5;
          color: #c2410c;
        }

        .badge.expired {
          background: #f0f2f3;
          color: #667085;
        }

        .notice {
          margin-top: 18px;
          padding: 15px;
          border: 1px solid #d9e8f5;
          border-radius: 13px;
          background: #f5faff;
        }

        .notice strong {
          color: #2563eb;
          font-size: 12px;
        }

        .notice p {
          margin: 6px 0 0;
          color: #667085;
          font-size: 11px;
          line-height: 1.5;
        }

        .error {
          padding: 30px;
          color: #b42318;
        }

        @media(max-width:800px) {
          .payments-page {
            padding: 16px;
          }

          .header {
            flex-direction: column;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .nav {
            overflow-x: auto;
          }

          .nav a {
            white-space: nowrap;
          }
        }
      `}</style>

    </main>
  );
}