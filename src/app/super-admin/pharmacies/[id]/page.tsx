import Link from "next/link";
import { notFound } from "next/navigation";

import {
  requireSuperAdmin,
} from "@/app/lib/super-admin/auth";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Pharmacy = {
  id: string;
  name: string;
  country_code: string;
  city: string;
  address: string | null;
  currency_code: string;
  owner_id: string | null;
  status: string | null;
  language: string | null;
  created_at: string;
  updated_at: string | null;
  manual_access_enabled: boolean | null;
  manual_access_until: string | null;
};

type Subscription = {
  id: string;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  plan: {
    id: string;
    name: string;
    code: string;
    price: number;
    currency_code: string;
  } | null;
};

type OwnerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  language: string | null;
};

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function formatPrice(
  value: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency:
        currency || "XAF",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function getStatusLabel(
  status: string | null,
): string {
  switch (
    String(status || "")
      .toLowerCase()
      .trim()
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
  status: string | null,
): string {
  switch (
    String(status || "")
      .toLowerCase()
      .trim()
  ) {
    case "active":
      return "status-active";

    case "inactive":
      return "status-inactive";

    case "suspended":
      return "status-suspended";

    default:
      return "status-neutral";
  }
}

function getSubscriptionLabel(
  status: string | null,
): string {
  switch (
    String(status || "")
      .toLowerCase()
      .trim()
  ) {
    case "trial":
      return "Essai gratuit";

    case "active":
      return "Actif";

    case "paid":
      return "Payé";

    case "past_due":
      return "Impayé";

    case "cancelled":
      return "Annulé";

    case "suspended":
      return "Suspendu";

    default:
      return status || "Inconnu";
  }
}

export default async function PharmacyDetailsPage({
  params,
}: PageProps) {
  await requireSuperAdmin();

  const {
    id,
  } = await params;

  if (!id) {
    notFound();
  }

  const supabase =
    createAdminClient();

  /**
   * ==========================================================
   * PHARMACIE
   * ==========================================================
   */

  const {
    data: pharmacyData,
    error: pharmacyError,
  } =
    await supabase
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
          manual_access_until
        `,
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();

  if (pharmacyError) {
    console.error(
      "[PHARMACY DETAILS] PHARMACY ERROR:",
      pharmacyError,
    );

    throw new Error(
      "Impossible de récupérer la pharmacie.",
    );
  }

  if (!pharmacyData) {
    notFound();
  }

  const pharmacy =
    pharmacyData as Pharmacy;

  /**
   * ==========================================================
   * PROFIL OWNER
   * ==========================================================
   *
   * IMPORTANT :
   *
   * owner_id est nullable.
   *
   * Nous ne l'utilisons JAMAIS directement comme
   * string obligatoire.
   *
   * On vérifie d'abord sa présence.
   * ==========================================================
   */

  let ownerProfile:
    | OwnerProfile
    | null = null;

  if (pharmacy.owner_id) {
    const {
      data,
      error,
    } =
      await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            phone,
            role,
            language
          `,
        )
        .eq(
          "id",
          pharmacy.owner_id,
        )
        .maybeSingle();

    if (error) {
      console.error(
        "[PHARMACY DETAILS] OWNER PROFILE ERROR:",
        error,
      );
    }

    if (data) {
      ownerProfile =
        data as OwnerProfile;
    }
  }

  /**
   * ==========================================================
   * ABONNEMENT
   * ==========================================================
   */

  let subscription:
    | Subscription
    | null = null;

  const {
    data:
      subscriptionData,
    error:
      subscriptionError,
  } =
    await supabase
      .from("subscriptions")
      .select(
        `
          id,
          status,
          trial_started_at,
          trial_ends_at,
          expires_at,
          created_at,
          subscription_plans (
            id,
            name,
            code,
            price,
            currency_code
          )
        `,
      )
      .eq(
        "pharmacy_id",
        pharmacy.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (subscriptionError) {
    console.error(
      "[PHARMACY DETAILS] SUBSCRIPTION ERROR:",
      subscriptionError,
    );
  }

  if (subscriptionData) {
    const rawPlan =
      Array.isArray(
        subscriptionData.subscription_plans,
      )
        ? subscriptionData
            .subscription_plans[0]
        : subscriptionData.subscription_plans;

    subscription = {
      id:
        subscriptionData.id,

      status:
        subscriptionData.status,

      trial_started_at:
        subscriptionData.trial_started_at,

      trial_ends_at:
        subscriptionData.trial_ends_at,

      expires_at:
        subscriptionData.expires_at,

      created_at:
        subscriptionData.created_at,

      plan: rawPlan
        ? {
            id:
              rawPlan.id,

            name:
              rawPlan.name,

            code:
              rawPlan.code,

            price:
              Number(
                rawPlan.price,
              ),

            currency_code:
              rawPlan.currency_code,
          }
        : null,
    };
  }

  /**
   * ==========================================================
   * ACCÈS MANUEL
   * ==========================================================
   */

  const manualAccessValid =
    pharmacy.manual_access_enabled ===
      true &&
    !!pharmacy.manual_access_until &&
    new Date(
      pharmacy.manual_access_until,
    ).getTime() >
      Date.now();

  return (
    <main className="pf-page">
      <div className="pf-container">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <header className="pf-header">

          <div>

            <div className="pf-breadcrumb">

              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <Link href="/super-admin/pharmacies">
                Pharmacies
              </Link>

              <span>/</span>

              <strong>
                {pharmacy.name}
              </strong>

            </div>

            <h1>
              {pharmacy.name}
            </h1>

            <p>
              Fiche détaillée de la pharmacie
              et de son abonnement.
            </p>

          </div>

          <div className="pf-header-actions">

            <Link
              href="/super-admin/pharmacies"
              className="pf-button pf-button-secondary"
            >
              ← Retour
            </Link>

            <Link
              href={`/super-admin/pharmacies/${pharmacy.id}/edit`}
              className="pf-button pf-button-primary"
            >
              ✎ Modifier
            </Link>

          </div>

        </header>

        {/* ================================================= */}
        {/* STATUS */}
        {/* ================================================= */}

        <section className="pf-status-banner">

          <div>

            <span className="pf-overline">
              STATUT DE LA PHARMACIE
            </span>

            <strong
              className={`pf-status ${getStatusClass(
                pharmacy.status,
              )}`}
            >
              <span className="pf-status-dot" />

              {getStatusLabel(
                pharmacy.status,
              )}
            </strong>

          </div>

          <div className="pf-status-right">

            {manualAccessValid && (
              <span className="pf-manual-badge">
                🔓 Accès manuel actif
              </span>
            )}

            {subscription && (
              <span className="pf-subscription-badge">
                {getSubscriptionLabel(
                  subscription.status,
                )}
              </span>
            )}

          </div>

        </section>

        {/* ================================================= */}
        {/* GRID */}
        {/* ================================================= */}

        <div className="pf-grid">

          {/* =============================================== */}
          {/* INFORMATIONS PHARMACIE */}
          {/* =============================================== */}

          <section className="pf-card">

            <div className="pf-card-header">

              <div className="pf-card-icon">
                🏥
              </div>

              <div>
                <h2>
                  Informations de la pharmacie
                </h2>

                <p>
                  Informations générales de
                  l'établissement.
                </p>
              </div>

            </div>

            <div className="pf-info-grid">

              <Info
                label="Nom"
                value={pharmacy.name}
              />

              <Info
                label="Pays"
                value={
                  pharmacy.country_code
                }
              />

              <Info
                label="Ville"
                value={
                  pharmacy.city
                }
              />

              <Info
                label="Devise"
                value={
                  pharmacy.currency_code
                }
              />

              <Info
                label="Langue"
                value={
                  pharmacy.language ===
                  "en"
                    ? "English"
                    : "Français"
                }
              />

              <Info
                label="Adresse"
                value={
                  pharmacy.address ||
                  "—"
                }
                full
              />

              <Info
                label="Créée le"
                value={formatDate(
                  pharmacy.created_at,
                )}
              />

              <Info
                label="Dernière modification"
                value={formatDate(
                  pharmacy.updated_at,
                )}
              />

            </div>

          </section>

          {/* =============================================== */}
          {/* RESPONSABLE */}
          {/* =============================================== */}

          <section className="pf-card">

            <div className="pf-card-header">

              <div className="pf-card-icon">
                👤
              </div>

              <div>
                <h2>
                  Responsable
                </h2>

                <p>
                  Compte propriétaire de la
                  pharmacie.
                </p>
              </div>

            </div>

            {ownerProfile ? (
              <div className="pf-info-grid">

                <Info
                  label="Nom complet"
                  value={
                    ownerProfile.full_name ||
                    "—"
                  }
                />

                <Info
                  label="Téléphone"
                  value={
                    ownerProfile.phone ||
                    "—"
                  }
                />

                <Info
                  label="Rôle"
                  value={
                    ownerProfile.role ||
                    "owner"
                  }
                />

                <Info
                  label="Langue"
                  value={
                    ownerProfile.language ===
                    "en"
                      ? "English"
                      : "Français"
                  }
                />

                <Info
                  label="Identifiant utilisateur"
                  value={
                    ownerProfile.id
                  }
                  full
                  mono
                />

              </div>
            ) : (
              <div className="pf-empty">
                Aucun profil responsable
                associé à cette pharmacie.
              </div>
            )}

          </section>

          {/* =============================================== */}
          {/* ABONNEMENT */}
          {/* =============================================== */}

          <section className="pf-card">

            <div className="pf-card-header">

              <div className="pf-card-icon">
                🎁
              </div>

              <div>
                <h2>
                  Abonnement
                </h2>

                <p>
                  État actuel de l'accès
                  PharmaFlow.
                </p>
              </div>

            </div>

            {subscription ? (
              <div className="pf-info-grid">

                <Info
                  label="Plan"
                  value={
                    subscription.plan?.name ||
                    "—"
                  }
                />

                <Info
                  label="Code"
                  value={
                    subscription.plan?.code ||
                    "—"
                  }
                />

                <Info
                  label="Statut"
                  value={getSubscriptionLabel(
                    subscription.status,
                  )}
                />

                <Info
                  label="Prix"
                  value={
                    subscription.plan
                      ? formatPrice(
                          subscription.plan
                            .price,
                          subscription.plan
                            .currency_code,
                        )
                      : "—"
                  }
                />

                <Info
                  label="Début"
                  value={formatDate(
                    subscription.trial_started_at,
                  )}
                />

                <Info
                  label="Fin de l'essai"
                  value={formatDate(
                    subscription.trial_ends_at,
                  )}
                />

                <Info
                  label="Expiration"
                  value={formatDate(
                    subscription.expires_at,
                  )}
                />

              </div>
            ) : (
              <div className="pf-empty">
                Aucun abonnement trouvé.
              </div>
            )}

          </section>

          {/* =============================================== */}
          {/* ACCÈS MANUEL */}
          {/* =============================================== */}

          <section className="pf-card">

            <div className="pf-card-header">

              <div className="pf-card-icon">
                🔐
              </div>

              <div>
                <h2>
                  Accès manuel
                </h2>

                <p>
                  Accès accordé indépendamment
                  de l'abonnement.
                </p>
              </div>

            </div>

            <div className="pf-manual-box">

              <div>

                <strong>
                  {manualAccessValid
                    ? "Accès manuel actif"
                    : "Accès manuel inactif"}
                </strong>

                <span>
                  {pharmacy.manual_access_until
                    ? `Jusqu'au ${formatDate(
                        pharmacy.manual_access_until,
                      )}`
                    : "Aucune date d'expiration configurée."}
                </span>

              </div>

              <span
                className={
                  manualAccessValid
                    ? "pf-access-on"
                    : "pf-access-off"
                }
              >
                {manualAccessValid
                  ? "ACTIF"
                  : "INACTIF"}
              </span>

            </div>

          </section>

        </div>

      </div>

      <style>{`
        .pf-page {
          min-height: 100vh;
          background: #f5f8f7;
          padding: 32px;
        }

        .pf-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .pf-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 26px;
        }

        .pf-breadcrumb {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-bottom: 12px;
          color: #81918d;
          font-size: 13px;
        }

        .pf-breadcrumb a {
          color: #18796e;
          text-decoration: none;
          font-weight: 700;
        }

        .pf-header h1 {
          margin: 0;
          color: #173b37;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.6px;
        }

        .pf-header p {
          margin: 7px 0 0;
          color: #71817d;
          font-size: 14px;
        }

        .pf-header-actions {
          display: flex;
          gap: 10px;
        }

        .pf-button {
          min-height: 44px;
          padding: 0 17px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
        }

        .pf-button-secondary {
          border: 1px solid #d8e3e0;
          background: #ffffff;
          color: #405a55;
        }

        .pf-button-primary {
          background: #18796e;
          color: #ffffff;
        }

        .pf-status-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 18px 20px;
          margin-bottom: 20px;
          border: 1px solid #dce9e6;
          border-radius: 14px;
          background: #ffffff;
        }

        .pf-overline {
          display: block;
          margin-bottom: 7px;
          color: #8a9895;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.8px;
        }

        .pf-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 800;
        }

        .pf-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .status-active {
          color: #16805c;
        }

        .status-inactive {
          color: #8b6a16;
        }

        .status-suspended {
          color: #b33c35;
        }

        .status-neutral {
          color: #66736f;
        }

        .pf-status-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .pf-manual-badge,
        .pf-subscription-badge {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 11px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .pf-manual-badge {
          background: #edf8f4;
          color: #167453;
        }

        .pf-subscription-badge {
          background: #eef4ff;
          color: #3c61a2;
        }

        .pf-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .pf-card {
          background: #ffffff;
          border: 1px solid #e0e9e6;
          border-radius: 15px;
          padding: 24px;
          box-shadow: 0 8px 25px rgba(23, 59, 55, 0.04);
        }

        .pf-card-header {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 22px;
        }

        .pf-card-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 40px;
          border-radius: 10px;
          background: #eaf6f3;
          font-size: 19px;
        }

        .pf-card h2 {
          margin: 0;
          color: #1c403b;
          font-size: 17px;
          font-weight: 800;
        }

        .pf-card-header p {
          margin: 4px 0 0;
          color: #7b8986;
          font-size: 12px;
        }

        .pf-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .pf-info-full {
          grid-column: 1 / -1;
        }

        .pf-info-label {
          display: block;
          margin-bottom: 5px;
          color: #8a9895;
          font-size: 11px;
          font-weight: 700;
        }

        .pf-info-value {
          display: block;
          color: #304b46;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .pf-mono {
          font-family: monospace;
          font-size: 11px;
        }

        .pf-empty {
          padding: 18px;
          border-radius: 10px;
          background: #f7faf9;
          color: #7a8985;
          font-size: 13px;
        }

        .pf-manual-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 16px;
          border-radius: 11px;
          background: #f7faf9;
          border: 1px solid #e2ece9;
        }

        .pf-manual-box strong {
          display: block;
          color: #34524d;
          font-size: 13px;
        }

        .pf-manual-box span:not(.pf-access-on):not(.pf-access-off) {
          display: block;
          margin-top: 5px;
          color: #7b8985;
          font-size: 11px;
        }

        .pf-access-on,
        .pf-access-off {
          min-height: 28px;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
        }

        .pf-access-on {
          background: #e9f7f0;
          color: #167653;
        }

        .pf-access-off {
          background: #f2f4f4;
          color: #77817f;
        }

        @media (max-width: 800px) {
          .pf-page {
            padding: 18px;
          }

          .pf-header {
            flex-direction: column;
          }

          .pf-header-actions {
            width: 100%;
          }

          .pf-button {
            flex: 1;
          }

          .pf-grid {
            grid-template-columns: 1fr;
          }

          .pf-info-grid {
            grid-template-columns: 1fr;
          }

          .pf-info-full {
            grid-column: auto;
          }

          .pf-status-banner {
            align-items: flex-start;
            flex-direction: column;
          }

          .pf-status-right {
            justify-content: flex-start;
          }
        }
      `}</style>
    </main>
  );
}

function Info({
  label,
  value,
  full = false,
  mono = false,
}: {
  label: string;
  value: string;
  full?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={
        full
          ? "pf-info-full"
          : undefined
      }
    >
      <span className="pf-info-label">
        {label}
      </span>

      <span
        className={`pf-info-value ${
          mono
            ? "pf-mono"
            : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}