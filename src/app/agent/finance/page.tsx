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

function money(
  value: number,
  currency: string,
) {
  return (
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 2,
      },
    ).format(value) +
    ` ${currency}`
  );
}

export default async function FinancePage() {
  const member =
    await requireAgent();

  const supabase =
    createAdminClient();

  const {
    data: subscriptions,
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
    );

  const rows =
    (subscriptions ??
      []) as Subscription[];

  const pharmacyIds =
    Array.from(
      new Set(
        rows.map(
          (item) =>
            item.pharmacy_id,
        ),
      ),
    );

  const planIds =
    Array.from(
      new Set(
        rows.map(
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

  const active =
    rows.filter(
      (item) => {
        const s =
          status(item.status);

        return (
          s === "active" ||
          s === "paid"
        );
      },
    );

  const trials =
    rows.filter(
      (item) => {
        const s =
          status(item.status);

        return (
          s === "trial" ||
          s === "trialing"
        );
      },
    );

  const expired =
    rows.filter(
      (item) =>
        status(item.status) ===
        "expired",
    );

  const pastDue =
    rows.filter(
      (item) =>
        status(item.status) ===
        "past_due",
    );

  const revenue: Record<
    string,
    number
  > = {};

  for (const subscription of active) {
    const pharmacy =
      pharmacies.find(
        (item) =>
          item.id ===
          subscription.pharmacy_id,
      );

    if (!pharmacy) continue;

    const currency =
      pharmacy.currency_code
        ?.trim()
        .toUpperCase();

    if (!currency) continue;

    const price =
      prices.find(
        (item) =>
          item.plan_id ===
            subscription.plan_id &&
          item.currency_code
            ?.trim()
            .toUpperCase() ===
            currency,
      );

    if (!price) continue;

    revenue[currency] =
      (revenue[currency] ??
        0) +
      Number(price.price);
  }

  return (
    <main className="finance-dashboard">

      <div className="finance-shell">

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
              Tableau financier
            </h1>

            <p>
              Vue globale de l'activité
              d'abonnement PharmaFlow.
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
          >
            Paiements
          </Link>

          <Link
            href="/agent/finance"
            className="active"
          >
            Tableau financier
          </Link>

        </nav>

        <section className="cards">

          <div className="card">
            <span>
              Abonnements
            </span>

            <strong>
              {rows.length}
            </strong>

            <small>
              Total enregistré
            </small>
          </div>

          <div className="card green">
            <span>
              Actifs
            </span>

            <strong>
              {active.length}
            </strong>

            <small>
              Abonnements actifs
            </small>
          </div>

          <div className="card blue">
            <span>
              Essais
            </span>

            <strong>
              {trials.length}
            </strong>

            <small>
              Essais gratuits
            </small>
          </div>

          <div className="card orange">
            <span>
              Impayés
            </span>

            <strong>
              {pastDue.length}
            </strong>

            <small>
              À traiter
            </small>
          </div>

          <div className="card red">
            <span>
              Expirés
            </span>

            <strong>
              {expired.length}
            </strong>

            <small>
              Accès expirés
            </small>
          </div>

        </section>

        <section className="revenue">

          <div className="section-head">

            <div>
              <span>
                SYNTHÈSE
              </span>

              <h2>
                Valeur des abonnements actifs
              </h2>
            </div>

          </div>

          <div className="revenue-grid">

            {Object.keys(revenue).length ===
            0 ? (
              <div className="empty">
                Aucun abonnement actif avec
                un tarif configuré.
              </div>
            ) : (
              Object.entries(
                revenue,
              ).map(
                ([
                  currency,
                  amount,
                ]) => (
                  <div
                    className="revenue-card"
                    key={currency}
                  >
                    <span>
                      {currency}
                    </span>

                    <strong>
                      {money(
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

        </section>

        <section className="distribution">

          <div className="section-head">

            <div>
              <span>
                RÉPARTITION
              </span>

              <h2>
                Situation des abonnements
              </h2>
            </div>

          </div>

          <div className="bars">

            <div>
              <label>
                Actifs
                <b>
                  {active.length}
                </b>
              </label>

              <div className="bar">
                <i
                  style={{
                    width: rows.length
                      ? `${Math.round(
                          (active.length /
                            rows.length) *
                            100,
                        )}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <label>
                Essais
                <b>
                  {trials.length}
                </b>
              </label>

              <div className="bar">
                <i
                  style={{
                    width: rows.length
                      ? `${Math.round(
                          (trials.length /
                            rows.length) *
                            100,
                        )}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <label>
                Impayés
                <b>
                  {pastDue.length}
                </b>
              </label>

              <div className="bar">
                <i
                  style={{
                    width: rows.length
                      ? `${Math.round(
                          (pastDue.length /
                            rows.length) *
                            100,
                        )}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <label>
                Expirés
                <b>
                  {expired.length}
                </b>
              </label>

              <div className="bar">
                <i
                  style={{
                    width: rows.length
                      ? `${Math.round(
                          (expired.length /
                            rows.length) *
                            100,
                        )}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

          </div>

        </section>

      </div>

      <style>{`
        .finance-dashboard {
          min-height: 100vh;
          padding: 30px;
          background: #f5f9f9;
          color: #172033;
        }

        .finance-shell {
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
          letter-spacing: -.04em;
        }

        .header p {
          color: #667085;
          margin: 0;
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

        .cards {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 14px;
        }

        .card,
        .revenue,
        .distribution {
          border: 1px solid #dce8e8;
          border-radius: 18px;
          background: white;
          box-shadow:
            0 10px 30px
            rgba(15,23,42,.04);
        }

        .card {
          padding: 18px;
        }

        .card span {
          color: #667085;
          font-size: 11px;
          font-weight: 800;
        }

        .card strong {
          display: block;
          margin-top: 8px;
          font-size: 27px;
          font-weight: 950;
        }

        .card small {
          display: block;
          margin-top: 4px;
          color: #98a2b3;
          font-size: 10px;
        }

        .card.green strong {
          color: #15803d;
        }

        .card.blue strong {
          color: #2563eb;
        }

        .card.orange strong {
          color: #c2410c;
        }

        .card.red strong {
          color: #dc2626;
        }

        .revenue,
        .distribution {
          margin-top: 18px;
          padding: 22px;
        }

        .section-head span {
          color: #0f766e;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .section-head h2 {
          margin: 5px 0 18px;
          font-size: 19px;
          font-weight: 900;
        }

        .revenue-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(220px, 1fr)
            );
          gap: 12px;
        }

        .revenue-card {
          padding: 17px;
          border: 1px solid #e2ebec;
          border-radius: 14px;
          background: #f8fbfb;
        }

        .revenue-card span {
          color: #0f766e;
          font-size: 11px;
          font-weight: 900;
        }

        .revenue-card strong {
          display: block;
          margin-top: 5px;
          font-size: 22px;
        }

        .revenue-card small {
          display: block;
          margin-top: 5px;
          color: #8793a4;
          font-size: 10px;
        }

        .empty {
          padding: 22px;
          border: 1px dashed #d2dede;
          border-radius: 13px;
          color: #7a8798;
          font-size: 12px;
        }

        .bars {
          display: grid;
          gap: 18px;
        }

        .bars label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: #667085;
          font-size: 11px;
          font-weight: 800;
        }

        .bars b {
          color: #172033;
        }

        .bar {
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: #edf2f2;
        }

        .bar i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #0f766e;
        }

        @media(max-width: 900px) {
          .finance-dashboard {
            padding: 16px;
          }

          .header {
            flex-direction: column;
          }

          .cards {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media(max-width: 520px) {
          .cards {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 28px;
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