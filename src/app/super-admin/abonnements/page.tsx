import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";
import { createSuperAdminClient } from "@/app/lib/super-admin/admin-client";

export const dynamic = "force-dynamic";

/* ============================================================
   TYPES
============================================================ */

type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  duration_days: number | null;
  is_active: boolean;
};

type PlatformCurrency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
};

type SubscriptionPrice = {
  plan_id: string;
  currency_code: string;
  price: number;
};

type CurrencyPricingRow = {
  currency: PlatformCurrency;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
};

/* ============================================================
   OUTIL — VALIDATION DU PRIX
============================================================ */

function parsePrice(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const normalized = raw.replace(",", ".");
  const price = Number(normalized);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(
      "Le prix doit être un nombre supérieur ou égal à 0.",
    );
  }

  return price;
}

/* ============================================================
   OUTIL — IDENTIFICATION DU PLAN MENSUEL
============================================================ */

function isMonthlyPlan(plan: SubscriptionPlan) {
  return (
    plan.code.toLowerCase() === "monthly" ||
    Number(plan.duration_days) === 30
  );
}

/* ============================================================
   OUTIL — IDENTIFICATION DU PLAN ANNUEL
============================================================ */

function isYearlyPlan(plan: SubscriptionPlan) {
  return (
    plan.code.toLowerCase() === "yearly" ||
    Number(plan.duration_days) === 365
  );
}

/* ============================================================
   SERVER ACTION — ENREGISTRER UN TARIF
============================================================ */

async function saveSubscriptionPrice(
  formData: FormData,
) {
  "use server";

  const admin = await requireSuperAdmin();
  const supabase = createSuperAdminClient();

  const planId = String(
    formData.get("plan_id") ?? "",
  ).trim();

  const currencyCode = String(
    formData.get("currency_code") ?? "",
  )
    .trim()
    .toUpperCase();

  const price = parsePrice(
    formData.get("price"),
  );

  if (!planId) {
    throw new Error(
      "Le plan d'abonnement est obligatoire.",
    );
  }

  if (!currencyCode) {
    throw new Error(
      "La devise est obligatoire.",
    );
  }

  if (price === null) {
    throw new Error(
      "Veuillez saisir un prix.",
    );
  }

  /* ==========================================================
     VÉRIFICATION DE LA DEVISE
  ========================================================== */

  const {
    data: currency,
    error: currencyError,
  } = await supabase
    .from("platform_currencies")
    .select(
      "id, code, is_active",
    )
    .eq("code", currencyCode)
    .maybeSingle();

  if (currencyError) {
    throw new Error(
      `Impossible de vérifier la devise : ${currencyError.message}`,
    );
  }

  if (!currency) {
    throw new Error(
      `La devise ${currencyCode} n'existe pas dans la configuration internationale.`,
    );
  }

  if (!currency.is_active) {
    throw new Error(
      `La devise ${currencyCode} est actuellement désactivée.`,
    );
  }

  /* ==========================================================
     VÉRIFICATION DU PLAN
  ========================================================== */

  const {
    data: plan,
    error: planError,
  } = await supabase
    .from("subscription_plans")
    .select(
      "id, code, name, duration_days, is_active",
    )
    .eq("id", planId)
    .maybeSingle();

  if (planError) {
    throw new Error(
      `Impossible de vérifier le plan : ${planError.message}`,
    );
  }

  if (!plan) {
    throw new Error(
      "Le plan d'abonnement sélectionné n'existe pas.",
    );
  }

  if (!plan.is_active) {
    throw new Error(
      "Le plan d'abonnement sélectionné est désactivé.",
    );
  }

  /* ==========================================================
     RECHERCHE DU TARIF EXISTANT
  ========================================================== */

  const {
    data: existingPrice,
    error: existingPriceError,
  } = await supabase
    .from("subscription_plan_prices")
    .select(
      "plan_id, currency_code, price",
    )
    .eq("plan_id", planId)
    .eq("currency_code", currencyCode)
    .limit(1)
    .maybeSingle();

  if (existingPriceError) {
    throw new Error(
      `Impossible de rechercher le tarif : ${existingPriceError.message}`,
    );
  }

  /* ==========================================================
     MODIFICATION
  ========================================================== */

  if (existingPrice) {
    const {
      error: updateError,
    } = await supabase
      .from("subscription_plan_prices")
      .update({
        price,
      })
      .eq("plan_id", planId)
      .eq("currency_code", currencyCode);

    if (updateError) {
      throw new Error(
        `Impossible de modifier le tarif : ${updateError.message}`,
      );
    }
  }

  /* ==========================================================
     CRÉATION
  ========================================================== */

  else {
    const {
      error: insertError,
    } = await supabase
      .from("subscription_plan_prices")
      .insert({
        plan_id: planId,
        currency_code: currencyCode,
        price,
      });

    if (insertError) {
      throw new Error(
        `Impossible de créer le tarif : ${insertError.message}`,
      );
    }
  }

  /* ==========================================================
     JOURNALISATION
  ========================================================== */

  console.info(
    `[SUPER ADMIN] Tarif abonnement modifié par ${
      admin.full_name || admin.id
    }: ${plan.code} / ${currencyCode} / ${price}`,
  );

  revalidatePath(
    "/super-admin/abonnements",
  );

  revalidatePath(
    "/super-admin/devises",
  );

  revalidatePath(
    "/super-admin",
  );

  revalidatePath(
    "/abonnement",
  );
}

/* ============================================================
   SERVER ACTION — SUPPRIMER UN TARIF
============================================================ */

async function removeSubscriptionPrice(
  formData: FormData,
) {
  "use server";

  const admin = await requireSuperAdmin();
  const supabase = createSuperAdminClient();

  const planId = String(
    formData.get("plan_id") ?? "",
  ).trim();

  const currencyCode = String(
    formData.get("currency_code") ?? "",
  )
    .trim()
    .toUpperCase();

  if (!planId || !currencyCode) {
    throw new Error(
      "Informations de tarif invalides.",
    );
  }

  const {
    error,
  } = await supabase
    .from("subscription_plan_prices")
    .delete()
    .eq("plan_id", planId)
    .eq("currency_code", currencyCode);

  if (error) {
    throw new Error(
      `Impossible de supprimer le tarif : ${error.message}`,
    );
  }

  console.info(
    `[SUPER ADMIN] Tarif supprimé par ${
      admin.full_name || admin.id
    }: ${planId} / ${currencyCode}`,
  );

  revalidatePath(
    "/super-admin/abonnements",
  );

  revalidatePath(
    "/super-admin/devises",
  );

  revalidatePath(
    "/abonnement",
  );
}

/* ============================================================
   PAGE
============================================================ */

export default async function SuperAdminSubscriptionsPage() {
  const admin = await requireSuperAdmin();

  const supabase = createSuperAdminClient();

  /* ==========================================================
     CHARGEMENT DES PLANS
     
     IMPORTANT :
     La table réelle ne possède pas "description".
     On sélectionne uniquement les colonnes existantes.
  ========================================================== */

  const {
    data: plansData,
    error: plansError,
  } = await supabase
    .from("subscription_plans")
    .select(
      "id, code, name, duration_days, is_active",
    )
    .in("code", [
      "monthly",
      "yearly",
    ])
    .order("duration_days", {
      ascending: true,
    });

  const plans =
    (plansData as SubscriptionPlan[] | null) ??
    [];

  /* ==========================================================
     CHARGEMENT DES DEVISES
  ========================================================== */

  const {
    data: currenciesData,
    error: currenciesError,
  } = await supabase
    .from("platform_currencies")
    .select(
      "id, code, name, symbol, is_active",
    )
    .eq("is_active", true)
    .order("code", {
      ascending: true,
    });

  const currencies =
    (currenciesData as PlatformCurrency[] | null) ??
    [];

  /* ==========================================================
     CHARGEMENT DES TARIFS
  ========================================================== */

  const {
    data: pricesData,
    error: pricesError,
  } = await supabase
    .from("subscription_plan_prices")
    .select(
      "plan_id, currency_code, price",
    );

  const prices =
    (pricesData as SubscriptionPrice[] | null) ??
    [];

  /* ==========================================================
     IDENTIFICATION DES PLANS
     
     Le système reconnaît :
     - monthly OU 30 jours
     - yearly OU 365 jours
  ========================================================== */

  const monthlyPlan =
    plans.find(isMonthlyPlan) ??
    null;

  const yearlyPlan =
    plans.find(isYearlyPlan) ??
    null;

  /* ==========================================================
     PRIX PAR DEVISE
  ========================================================== */

  const pricingRows: CurrencyPricingRow[] =
    currencies.map((currency) => {
      const monthly =
        monthlyPlan
          ? prices.find(
              (item) =>
                item.plan_id ===
                  monthlyPlan.id &&
                item.currency_code.toUpperCase() ===
                  currency.code.toUpperCase(),
            )
          : null;

      const yearly =
        yearlyPlan
          ? prices.find(
              (item) =>
                item.plan_id ===
                  yearlyPlan.id &&
                item.currency_code.toUpperCase() ===
                  currency.code.toUpperCase(),
            )
          : null;

      return {
        currency,

        monthlyPrice:
          monthly?.price !== undefined
            ? Number(monthly.price)
            : null,

        yearlyPrice:
          yearly?.price !== undefined
            ? Number(yearly.price)
            : null,
      };
    });

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const configuredMonthly =
    pricingRows.filter(
      (row) =>
        row.monthlyPrice !== null,
    ).length;

  const configuredYearly =
    pricingRows.filter(
      (row) =>
        row.yearlyPrice !== null,
    ).length;

  const totalCurrencies =
    currencies.length;

  const incompleteCurrencies =
    pricingRows.filter(
      (row) =>
        row.monthlyPrice === null ||
        row.yearlyPrice === null,
    ).length;

  const loadError =
    plansError ||
    currenciesError ||
    pricesError;

  /* ==========================================================
     NOM ADMIN
  ========================================================== */

  const adminName =
    admin.full_name ||
    "Super Administrateur";

  return (
    <main className="sa-pricing-page">

      <div className="sa-pricing-container">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="sa-pricing-header">

          <div className="sa-pricing-title-area">

            <Link
              href="/super-admin"
              className="sa-pricing-back"
              aria-label="Retour au Super Admin"
            >
              ←
            </Link>

            <div>

              <div className="sa-pricing-eyebrow">
                SUPER ADMIN · SaaS
              </div>

              <h1>
                Tarifs internationaux
              </h1>

              <p>
                Définissez les prix des abonnements
                PharmaFlow pour chaque devise et
                chaque marché.
              </p>

            </div>

          </div>

          <div className="sa-pricing-admin">

            <span className="sa-pricing-lock">
              🔐
            </span>

            <div>

              <strong>
                {adminName}
              </strong>

              <span>
                Gestionnaire des tarifs
              </span>

            </div>

          </div>

        </header>


        {/* ==================================================
            ERREUR
        ================================================== */}

        {loadError && (
          <section className="sa-pricing-error">

            <strong>
              ⚠️ Impossible de charger
              complètement les tarifs
            </strong>

            <p>
              {loadError.message}
            </p>

          </section>
        )}


        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <section className="sa-pricing-stats">

          <div className="sa-pricing-stat">

            <span>
              Devises actives
            </span>

            <strong>
              {totalCurrencies}
            </strong>

            <small>
              Marchés disponibles
            </small>

          </div>


          <div className="sa-pricing-stat">

            <span>
              Tarifs mensuels
            </span>

            <strong>
              {configuredMonthly}
            </strong>

            <small>
              sur {totalCurrencies}
            </small>

          </div>


          <div className="sa-pricing-stat">

            <span>
              Tarifs annuels
            </span>

            <strong>
              {configuredYearly}
            </strong>

            <small>
              sur {totalCurrencies}
            </small>

          </div>


          <div className="sa-pricing-stat">

            <span>
              À compléter
            </span>

            <strong>
              {incompleteCurrencies}
            </strong>

            <small>
              Devises avec tarif incomplet
            </small>

          </div>

        </section>


        {/* ==================================================
            EXPLICATION
        ================================================== */}

        <section className="sa-pricing-info">

          <div className="sa-pricing-info-icon">
            💡
          </div>

          <div>

            <strong>
              Les prix commerciaux sont indépendants
              des taux de change.
            </strong>

            <p>
              Le tarif d'un abonnement peut être
              fixé librement par le Super Admin
              pour chaque marché. Il n'est pas
              automatiquement calculé à partir
              d'une conversion de devise.
            </p>

          </div>

        </section>


        {/* ==================================================
            PLANS
        ================================================== */}

        <section className="sa-pricing-plan-overview">

          <div className="sa-pricing-section-heading">

            <div>

              <span>
                PLANS PHARMAFLOW
              </span>

              <h2>
                Abonnements disponibles
              </h2>

            </div>

            <Link
              href="/super-admin/devises"
              className="sa-pricing-secondary-link"
            >
              🌍 Gérer les devises →
            </Link>

          </div>


          <div className="sa-pricing-plan-grid">

            {plans.map((plan) => (

              <div
                key={plan.id}
                className="sa-pricing-plan-card"
              >

                <div className="sa-pricing-plan-icon">
                  {isYearlyPlan(plan)
                    ? "📅"
                    : "💳"}
                </div>

                <div>

                  <span className="sa-pricing-plan-code">
                    {plan.code}
                  </span>

                  <h3>
                    {plan.name}
                  </h3>

                  <p>
                    Abonnement PharmaFlow
                  </p>

                </div>

                <div className="sa-pricing-plan-duration">

                  <strong>
                    {plan.duration_days ??
                      "—"}
                  </strong>

                  <span>
                    jours
                  </span>

                </div>

              </div>

            ))}

          </div>

        </section>


        {/* ==================================================
            MESSAGE SI PLANS NON TROUVÉS
        ================================================== */}

        {(!monthlyPlan ||
          !yearlyPlan) && (
          <section className="sa-pricing-warning">

            <div className="sa-pricing-warning-icon">
              ⚠️
            </div>

            <div>

              <strong>
                Configuration des plans
                incomplète
              </strong>

              <p>
                PharmaFlow doit disposer d'un
                plan mensuel de 30 jours et
                d'un plan annuel de 365 jours.
              </p>

              <p>
                Plans détectés :
                {" "}
                {plans.length}
              </p>

              <p>
                Mensuel :
                {" "}
                {monthlyPlan
                  ? `${monthlyPlan.name} (${monthlyPlan.duration_days} jours)`
                  : "Non trouvé"}
                {" · "}
                Annuel :
                {" "}
                {yearlyPlan
                  ? `${yearlyPlan.name} (${yearlyPlan.duration_days} jours)`
                  : "Non trouvé"}
              </p>

            </div>

          </section>
        )}


        {/* ==================================================
            TARIFS PAR DEVISE
        ================================================== */}

        <section className="sa-pricing-table-section">

          <div className="sa-pricing-section-heading">

            <div>

              <span>
                CONFIGURATION COMMERCIALE
              </span>

              <h2>
                Tarifs par devise
              </h2>

              <p>
                Configurez séparément le mensuel
                et l'annuel pour chaque monnaie.
              </p>

            </div>

          </div>


          <div className="sa-pricing-table-card">

            <div className="sa-pricing-table-wrapper">

              <table className="sa-pricing-table">

                <thead>

                  <tr>

                    <th>
                      Devise
                    </th>

                    <th>
                      Pays / marché
                    </th>

                    <th>
                      Mensuel
                    </th>

                    <th>
                      Annuel
                    </th>

                    <th>
                      État
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {pricingRows.map(
                    (row) => (

                      <tr
                        key={
                          row.currency.id
                        }
                      >

                        {/* =================================
                            DEVISE
                        ================================= */}

                        <td>

                          <div className="sa-pricing-currency">

                            <span className="sa-pricing-currency-code">
                              {
                                row.currency
                                  .code
                              }
                            </span>

                            <div>

                              <strong>
                                {
                                  row.currency
                                    .name
                                }
                              </strong>

                              <span>
                                {
                                  row.currency
                                    .symbol
                                }
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* =================================
                            MARCHÉ
                        ================================= */}

                        <td>

                          <span className="sa-pricing-market">
                            Marché international
                          </span>

                        </td>


                        {/* =================================
                            MENSUEL
                        ================================= */}

                        <td>

                          {monthlyPlan ? (

                            <form
                              action={
                                saveSubscriptionPrice
                              }
                              className="sa-price-form"
                            >

                              <input
                                type="hidden"
                                name="plan_id"
                                value={
                                  monthlyPlan.id
                                }
                              />

                              <input
                                type="hidden"
                                name="currency_code"
                                value={
                                  row.currency
                                    .code
                                }
                              />

                              <div className="sa-price-input-wrap">

                                <input
                                  type="number"
                                  name="price"
                                  min="0"
                                  step="0.01"
                                  className="sa-price-input"
                                  defaultValue={
                                    row.monthlyPrice ??
                                    ""
                                  }
                                  placeholder="Non configuré"
                                  aria-label={`Prix mensuel ${row.currency.code}`}
                                />

                                <span>
                                  {
                                    row.currency
                                      .symbol
                                  }
                                </span>

                              </div>

                              <button
                                type="submit"
                                className="sa-price-save"
                              >
                                Enregistrer
                              </button>

                            </form>

                          ) : (

                            <span className="sa-price-missing">
                              Plan mensuel absent
                            </span>

                          )}

                        </td>


                        {/* =================================
                            ANNUEL
                        ================================= */}

                        <td>

                          {yearlyPlan ? (

                            <form
                              action={
                                saveSubscriptionPrice
                              }
                              className="sa-price-form"
                            >

                              <input
                                type="hidden"
                                name="plan_id"
                                value={
                                  yearlyPlan.id
                                }
                              />

                              <input
                                type="hidden"
                                name="currency_code"
                                value={
                                  row.currency
                                    .code
                                }
                              />

                              <div className="sa-price-input-wrap">

                                <input
                                  type="number"
                                  name="price"
                                  min="0"
                                  step="0.01"
                                  className="sa-price-input"
                                  defaultValue={
                                    row.yearlyPrice ??
                                    ""
                                  }
                                  placeholder="Non configuré"
                                  aria-label={`Prix annuel ${row.currency.code}`}
                                />

                                <span>
                                  {
                                    row.currency
                                      .symbol
                                  }
                                </span>

                              </div>

                              <button
                                type="submit"
                                className="sa-price-save"
                              >
                                Enregistrer
                              </button>

                            </form>

                          ) : (

                            <span className="sa-price-missing">
                              Plan annuel absent
                            </span>

                          )}

                        </td>


                        {/* =================================
                            ÉTAT
                        ================================= */}

                        <td>

                          {row.monthlyPrice !==
                            null &&
                          row.yearlyPrice !==
                            null ? (

                            <span className="sa-pricing-status complete">

                              <span />

                              Complet

                            </span>

                          ) : (

                            <span className="sa-pricing-status incomplete">

                              <span />

                              À configurer

                            </span>

                          )}

                        </td>

                      </tr>

                    ),
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </section>


        {/* ==================================================
            RÈGLES
        ================================================== */}

        <section className="sa-pricing-rules">

          <div className="sa-pricing-section-heading">

            <div>

              <span>
                RÈGLES COMMERCIALES
              </span>

              <h2>
                Fonctionnement des tarifs
              </h2>

            </div>

          </div>


          <div className="sa-pricing-rules-grid">

            <div className="sa-pricing-rule">

              <span>
                01
              </span>

              <div>

                <strong>
                  Prix local
                </strong>

                <p>
                  Chaque devise peut avoir
                  son propre prix commercial.
                </p>

              </div>

            </div>


            <div className="sa-pricing-rule">

              <span>
                02
              </span>

              <div>

                <strong>
                  Pas de conversion automatique
                </strong>

                <p>
                  Le tarif enregistré ne dépend
                  pas automatiquement d'un taux
                  de change.
                </p>

              </div>

            </div>


            <div className="sa-pricing-rule">

              <span>
                03
              </span>

              <div>

                <strong>
                  Mensuel et annuel séparés
                </strong>

                <p>
                  Le Super Admin contrôle
                  séparément chaque période.
                </p>

              </div>

            </div>


            <div className="sa-pricing-rule">

              <span>
                04
              </span>

              <div>

                <strong>
                  Paiement contrôlé
                </strong>

                <p>
                  Le tarif affiché reste séparé
                  de la logique des prestataires
                  de paiement.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="sa-pricing-footer">

          <div>

            <strong>
              PharmaFlow
            </strong>

            <span>
              Tarification SaaS internationale
            </span>

          </div>

          <span>
            🔐 Super Admin uniquement
          </span>

        </footer>

      </div>

    </main>
  );
}