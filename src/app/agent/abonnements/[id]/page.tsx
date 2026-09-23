import Link from "next/link";

import { requireAgent } from "@/app/lib/agent/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

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

type PriceRow = {
  plan_id: string;
  currency_code: string;
  price: number;
};

function normalizeStatus(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getStatusLabel(
  value: string | null | undefined,
) {
  switch (normalizeStatus(value)) {
    case "active":
    case "paid":
      return "Actif";

    case "trial":
    case "trialing":
      return "Essai gratuit";

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

function getStatusClass(
  value: string | null | undefined,
) {
  const status =
    normalizeStatus(value);

  if (
    status === "active" ||
    status === "paid"
  ) {
    return "status active";
  }

  if (
    status === "trial" ||
    status === "trialing"
  ) {
    return "status trial";
  }

  if (
    status === "expired"
  ) {
    return "status expired";
  }

  if (
    status === "past_due"
  ) {
    return "status warning";
  }

  return "status danger";
}

function formatDate(
  value: string | null,
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

function formatMoney(
  amount: number | null,
  currency: string | null,
) {
  if (
    amount === null ||
    !Number.isFinite(amount)
  ) {
    return "Non configuré";
  }

  return (
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 2,
      },
    ).format(amount) +
    (currency
      ? ` ${currency}`
      : "")
  );
}

function isValidSubscription(
  subscription: SubscriptionRow,
) {
  const status =
    normalizeStatus(
      subscription.status,
    );

  const now = Date.now();

  if (
    status === "active" ||
    status === "paid"
  ) {
    if (!subscription.expires_at) {
      return true;
    }

    return (
      new Date(
        subscription.expires_at,
      ).getTime() > now
    );
  }

  if (
    status === "trial" ||
    status === "trialing"
  ) {
    if (!subscription.trial_ends_at) {
      return true;
    }

    return (
      new Date(
        subscription.trial_ends_at,
      ).getTime() > now
    );
  }

  return false;
}

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const member =
    await requireAgent();

  const { id } = await params;

  const supabase =
    createAdminClient();

  /* =====================================================
     ABONNEMENT
  ===================================================== */

  const {
    data: subscription,
    error:
      subscriptionError,
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
    .eq("id", id)
    .maybeSingle();

  if (
    subscriptionError ||
    !subscription
  ) {
    return (
      <main className="detail-page">
        <div className="detail-error">
          <div className="error-icon">
            !
          </div>

          <h1>
            Abonnement introuvable
          </h1>

          <p>
            Cet abonnement n'existe pas
            ou n'est plus disponible.
          </p>

          <Link
            href="/agent/abonnements"
          >
            ← Retour aux abonnements
          </Link>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  const typedSubscription =
    subscription as SubscriptionRow;

  /* =====================================================
     PHARMACIE
  ===================================================== */

  const {
    data: pharmacy,
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
    .eq(
      "id",
      typedSubscription.pharmacy_id,
    )
    .maybeSingle();

  const typedPharmacy =
    pharmacy as PharmacyRow | null;

  /* =====================================================
     PLAN
  ===================================================== */

  const {
    data: plan,
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
    .eq(
      "id",
      typedSubscription.plan_id,
    )
    .maybeSingle();

  const typedPlan =
    plan as PlanRow | null;

  /* =====================================================
     PRIX
  ===================================================== */

  let price: number | null =
    null;

  const currency =
    typedPharmacy?.currency_code
      ?.trim()
      .toUpperCase() ??
    null;

  if (currency) {
    const {
      data: priceRow,
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
      .eq(
        "plan_id",
        typedSubscription.plan_id,
      )
      .eq(
        "currency_code",
        currency,
      )
      .maybeSingle();

    if (priceRow) {
      price =
        Number(
          (
            priceRow as PriceRow
          ).price,
        );
    }
  }

  const valid =
    isValidSubscription(
      typedSubscription,
    );

  return (
    <main className="detail-page">

      <div className="detail-shell">

        {/* HEADER */}

        <header className="detail-header">

          <div>

            <Link
              href="/agent/abonnements"
              className="back-link"
            >
              ← Retour aux abonnements
            </Link>

            <div className="eyebrow">
              PHARMAFLOW FINANCE
            </div>

            <h1>
              Détail de l'abonnement
            </h1>

            <p>
              Consultation complète du
              dossier d'abonnement.
            </p>

          </div>

          <div className="agent-box">
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

        {/* STATUS */}

        <section className="hero-card">

          <div>

            <span className="label">
              STATUT
            </span>

            <div
              className={getStatusClass(
                typedSubscription.status,
              )}
            >
              <i />
              {getStatusLabel(
                typedSubscription.status,
              )}
            </div>

          </div>

          <div className="valid-box">

            <span>
              Accès actuel
            </span>

            <strong
              className={
                valid
                  ? "valid"
                  : "not-valid"
              }
            >
              {valid
                ? "Accès valide"
                : "Accès non valide"}
            </strong>

          </div>

        </section>

        <div className="grid">

          {/* PHARMACIE */}

          <section className="card">

            <div className="card-title">
              <span>
                🏥
              </span>

              <div>
                <small>
                  PHARMACIE
                </small>

                <h2>
                  Informations de la pharmacie
                </h2>
              </div>
            </div>

            <div className="info-list">

              <div>
                <span>
                  Nom
                </span>

                <strong>
                  {typedPharmacy?.name ||
                    "Non renseigné"}
                </strong>
              </div>

              <div>
                <span>
                  Ville
                </span>

                <strong>
                  {typedPharmacy?.city ||
                    "Non renseignée"}
                </strong>
              </div>

              <div>
                <span>
                  Adresse
                </span>

                <strong>
                  {typedPharmacy?.address ||
                    "Non renseignée"}
                </strong>
              </div>

              <div>
                <span>
                  Pays
                </span>

                <strong>
                  {typedPharmacy?.country_code ||
                    "Non renseigné"}
                </strong>
              </div>

              <div>
                <span>
                  Devise
                </span>

                <strong>
                  {currency ||
                    "Non configurée"}
                </strong>
              </div>

              <div>
                <span>
                  Statut pharmacie
                </span>

                <strong>
                  {typedPharmacy?.status ||
                    "Non renseigné"}
                </strong>
              </div>

            </div>

          </section>

          {/* PLAN */}

          <section className="card">

            <div className="card-title">
              <span>
                ◈
              </span>

              <div>
                <small>
                  PLAN
                </small>

                <h2>
                  Informations de l'abonnement
                </h2>
              </div>
            </div>

            <div className="info-list">

              <div>
                <span>
                  Plan
                </span>

                <strong>
                  {typedPlan?.name ||
                    typedPlan?.code ||
                    "Non renseigné"}
                </strong>
              </div>

              <div>
                <span>
                  Code
                </span>

                <strong>
                  {typedPlan?.code ||
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Durée
                </span>

                <strong>
                  {typedPlan?.duration_days
                    ? `${typedPlan.duration_days} jours`
                    : "Non renseignée"}
                </strong>
              </div>

              <div>
                <span>
                  Tarif
                </span>

                <strong className="price">
                  {formatMoney(
                    price,
                    currency,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Plan actif
                </span>

                <strong>
                  {typedPlan?.is_active
                    ? "Oui"
                    : "Non"}
                </strong>
              </div>

            </div>

          </section>

          {/* DATES */}

          <section className="card">

            <div className="card-title">
              <span>
                ◷
              </span>

              <div>
                <small>
                  PÉRIODE
                </small>

                <h2>
                  Dates importantes
                </h2>
              </div>
            </div>

            <div className="info-list">

              <div>
                <span>
                  Création
                </span>

                <strong>
                  {formatDate(
                    typedSubscription.created_at,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Début essai
                </span>

                <strong>
                  {formatDate(
                    typedSubscription
                      .trial_started_at,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Fin essai
                </span>

                <strong>
                  {formatDate(
                    typedSubscription
                      .trial_ends_at,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Expiration
                </span>

                <strong>
                  {formatDate(
                    typedSubscription
                      .expires_at,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Dernière modification
                </span>

                <strong>
                  {formatDate(
                    typedSubscription
                      .updated_at,
                  )}
                </strong>
              </div>

            </div>

          </section>

          {/* IDENTIFIANTS */}

          <section className="card">

            <div className="card-title">
              <span>
                #
              </span>

              <div>
                <small>
                  IDENTIFIANTS
                </small>

                <h2>
                  Références système
                </h2>
              </div>
            </div>

            <div className="technical">

              <div>
                <span>
                  ID abonnement
                </span>

                <code>
                  {typedSubscription.id}
                </code>
              </div>

              <div>
                <span>
                  ID pharmacie
                </span>

                <code>
                  {typedSubscription
                    .pharmacy_id}
                </code>
              </div>

              <div>
                <span>
                  ID plan
                </span>

                <code>
                  {typedSubscription
                    .plan_id}
                </code>
              </div>

              {typedPharmacy?.owner_id && (
                <div>
                  <span>
                    Propriétaire
                  </span>

                  <code>
                    {typedPharmacy.owner_id}
                  </code>
                </div>
              )}

            </div>

          </section>

        </div>

        <div className="actions">

          <Link
            href="/agent/abonnements"
            className="secondary"
          >
            ← Tous les abonnements
          </Link>

          <Link
            href="/agent/paiements"
            className="primary"
          >
            Voir les paiements →
          </Link>

        </div>

      </div>

      <style>{styles}</style>

    </main>
  );
}

const styles = `
.detail-page {
  min-height: 100vh;
  background: #f5f9f9;
  padding: 30px;
  color: #172033;
}

.detail-shell {
  max-width: 1400px;
  margin: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.back-link {
  color: #0f766e;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
}

.eyebrow {
  margin-top: 20px;
  color: #0f766e;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .12em;
}

.detail-header h1 {
  margin: 6px 0 0;
  font-size: 36px;
  font-weight: 950;
  letter-spacing: -.04em;
}

.detail-header p {
  margin: 8px 0 0;
  color: #667085;
}

.agent-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  height: fit-content;
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

.agent-box strong,
.agent-box span {
  display: block;
}

.agent-box strong {
  font-size: 13px;
}

.agent-box span {
  margin-top: 3px;
  color: #0f766e;
  font-size: 10px;
  font-weight: 800;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 22px;
  margin-bottom: 18px;
  border: 1px solid #dce8e8;
  border-radius: 19px;
  background: white;
  box-shadow: 0 10px 30px rgba(15,23,42,.04);
}

.label {
  display: block;
  margin-bottom: 8px;
  color: #8793a4;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .08em;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.status.active {
  color: #15803d;
  background: #e9f8ef;
}

.status.trial {
  color: #2563eb;
  background: #eaf2ff;
}

.status.expired {
  color: #667085;
  background: #f0f2f3;
}

.status.warning {
  color: #c2410c;
  background: #fff4e5;
}

.status.danger {
  color: #dc2626;
  background: #ffeded;
}

.valid-box {
  text-align: right;
}

.valid-box span {
  display: block;
  color: #8793a4;
  font-size: 10px;
}

.valid-box strong {
  display: block;
  margin-top: 5px;
  font-size: 15px;
}

.valid {
  color: #15803d;
}

.not-valid {
  color: #dc2626;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.card {
  padding: 22px;
  border: 1px solid #dce8e8;
  border-radius: 19px;
  background: white;
}

.card-title {
  display: flex;
  gap: 11px;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid #edf1f2;
}

.card-title > span {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #eaf6f4;
  color: #0f766e;
}

.card-title small {
  color: #0f766e;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .1em;
}

.card-title h2 {
  margin: 3px 0 0;
  font-size: 16px;
  font-weight: 900;
}

.info-list {
  margin-top: 8px;
}

.info-list > div {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f3;
}

.info-list > div:last-child {
  border-bottom: 0;
}

.info-list span {
  color: #8793a4;
  font-size: 11px;
}

.info-list strong {
  text-align: right;
  font-size: 11px;
}

.price {
  color: #0f766e;
}

.technical > div {
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f3;
}

.technical span {
  display: block;
  color: #8793a4;
  font-size: 10px;
  margin-bottom: 5px;
}

.technical code {
  display: block;
  overflow-wrap: anywhere;
  color: #344054;
  font-size: 10px;
}

.actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}

.actions a {
  padding: 12px 17px;
  border-radius: 10px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 900;
}

.secondary {
  border: 1px solid #d7e3e3;
  background: white;
  color: #344054;
}

.primary {
  background: #0f766e;
  color: white;
}

.detail-error {
  max-width: 550px;
  margin: 15vh auto;
  padding: 45px;
  border: 1px solid #e1e8e9;
  border-radius: 20px;
  background: white;
  text-align: center;
}

.error-icon {
  width: 50px;
  height: 50px;
  margin: auto auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: #ffeded;
  color: #dc2626;
  font-weight: 900;
}

.detail-error h1 {
  margin: 0;
  font-size: 22px;
}

.detail-error p {
  color: #667085;
}

.detail-error a {
  color: #0f766e;
  font-weight: 800;
}

@media (max-width: 800px) {
  .detail-page {
    padding: 16px;
  }

  .detail-header {
    flex-direction: column;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .hero-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .valid-box {
    text-align: left;
  }
}
`;