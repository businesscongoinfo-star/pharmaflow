import { NextResponse } from "next/server";

import {
  requireSuperAdminApi,
} from "@/app/lib/super-admin/auth";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type ManualSubscriptionBody = {
  pharmacyId?: unknown;
  planId?: unknown;
  currencyCode?: unknown;
  reason?: unknown;
};

type PharmacyRow = {
  id: string;
  name: string;
  status: string | null;
  owner_id: string | null;
  currency_code: string | null;
};

type PlanRow = {
  id: string;
  name: string;
  code: string;
  duration_days: number;
  price: number | string;
  currency_code: string;
  is_active: boolean;
};

type PlanPriceRow = {
  id: string;
  plan_id: string;
  currency_code: string;
  price: number | string;
  is_active: boolean;
};

type SubscriptionRow = {
  id: string;
  pharmacy_id: string;
  plan_id: string | null;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function cleanString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/**
 * Normalise une devise.
 */
function normalizeCurrency(
  value: unknown,
): string {
  return cleanString(value)
    .toUpperCase();
}

/**
 * Vérifie qu'une devise possède un format ISO simple.
 */
function isValidCurrency(
  currency: string,
): boolean {
  return /^[A-Z]{3}$/.test(
    currency,
  );
}

/**
 * Les blocages administratifs ne peuvent pas être contournés
 * par un abonnement manuel.
 */
function isAdministrativeBlock(
  status: unknown,
): boolean {
  const normalized =
    typeof status === "string"
      ? status
          .trim()
          .toLowerCase()
      : "";

  return [
    "disabled",
    "blocked",
    "suspended",
    "closed",
  ].includes(normalized);
}

/**
 * Vérifie une date.
 */
function validDate(
  value: string | null | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| Retourne les forfaits actifs ainsi que leurs prix disponibles.
|
| GET /api/super-admin/pharmacies/manual-subscription
|
|--------------------------------------------------------------------------
*/

export async function GET() {
  /*
   * ============================================================
   * 1. VÉRIFICATION SUPER ADMIN
   * ============================================================
   */

  const admin =
    await requireSuperAdminApi();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Accès refusé. Vous devez être Super Admin.",
      },
      {
        status: 403,
      },
    );
  }

  /*
   * ============================================================
   * 2. CLIENT ADMIN SUPABASE
   * ============================================================
   */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "MANUAL SUBSCRIPTION GET - ADMIN CLIENT:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Le client Admin Supabase ne peut pas être initialisé.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 3. RÉCUPÉRER LES PLANS ACTIFS
   * ============================================================
   */

  const {
    data: plans,
    error: plansError,
  } =
    await supabaseAdmin
      .from("subscription_plans")
      .select(
        `
          id,
          name,
          code,
          duration_days,
          price,
          currency_code,
          is_active
        `,
      )
      .eq(
        "is_active",
        true,
      )
      .order(
        "duration_days",
        {
          ascending: true,
        },
      );

  if (plansError) {
    console.error(
      "MANUAL SUBSCRIPTION GET - PLANS:",
      plansError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de récupérer les forfaits.",
        details:
          plansError.message,
      },
      {
        status: 500,
      },
    );
  }

  const normalizedPlans =
    ((plans ?? []) as PlanRow[])
      .filter(
        (plan) =>
          typeof plan.id ===
            "string" &&
          typeof plan.name ===
            "string" &&
          typeof plan.code ===
            "string" &&
          Number.isInteger(
            Number(
              plan.duration_days,
            ),
          ) &&
          Number(
            plan.duration_days,
          ) > 0,
      );

  /*
   * ============================================================
   * 4. RÉCUPÉRER LES PRIX
   * ============================================================
   *
   * Un même forfait possède plusieurs devises :
   *
   * Mensuel :
   * XOF 8500
   * XAF 8500
   * USD 15
   * EUR 14
   * etc.
   *
   * Annuel :
   * XOF 85000
   * XAF 85000
   * USD 150
   * EUR 140
   * etc.
   *
   * ============================================================
   */

  const planIds =
    normalizedPlans.map(
      (plan) =>
        plan.id,
    );

  let prices:
    | PlanPriceRow[]
    | null = [];

  if (
    planIds.length > 0
  ) {
    const {
      data: pricesData,
      error: pricesError,
    } =
      await supabaseAdmin
        .from(
          "subscription_plan_prices",
        )
        .select(
          `
            id,
            plan_id,
            currency_code,
            price,
            is_active
          `,
        )
        .in(
          "plan_id",
          planIds,
        )
        .eq(
          "is_active",
          true,
        );

    if (pricesError) {
      console.error(
        "MANUAL SUBSCRIPTION GET - PLAN PRICES:",
        pricesError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer les prix des forfaits.",
          details:
            pricesError.message,
        },
        {
          status: 500,
        },
      );
    }

    prices =
      (pricesData ??
        []) as PlanPriceRow[];
  }

  /*
   * ============================================================
   * 5. CONSTRUIRE LES FORFAITS
   * ============================================================
   */

  const result =
    normalizedPlans.map(
      (plan) => {
        const planPrices =
          prices
            .filter(
              (price) =>
                price.plan_id ===
                  plan.id &&
                price.is_active ===
                  true,
            )
            .map(
              (price) => ({
                id:
                  price.id,

                currency_code:
                  price.currency_code,

                price:
                  Number(
                    price.price,
                  ),
              }),
            );

        return {
          id:
            plan.id,

          name:
            plan.name,

          code:
            plan.code,

          duration_days:
            Number(
              plan.duration_days,
            ),

          prices:
            planPrices,
        };
      },
    );

  /*
   * ============================================================
   * 6. RÉPONSE
   * ============================================================
   */

  return NextResponse.json(
    {
      success: true,

      plans:
        result,
    },
    {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    },
  );
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| Crée un VÉRITABLE abonnement.
|
| Utilisation :
|
| {
|   pharmacyId: "...",
|   planId: "...",
|   currencyCode: "XOF",
|   reason: "Paiement en espèces reçu"
| }
|
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request,
) {
  /*
   * ============================================================
   * 1. VÉRIFICATION SUPER ADMIN
   * ============================================================
   */

  const admin =
    await requireSuperAdminApi();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Accès refusé. Vous devez être Super Admin.",
      },
      {
        status: 403,
      },
    );
  }

  /*
   * ============================================================
   * 2. LECTURE DU BODY
   * ============================================================
   */

  let body:
    | ManualSubscriptionBody;

  try {
    body =
      (await request.json()) as ManualSubscriptionBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "Le corps de la requête est invalide.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * ============================================================
   * 3. NORMALISATION
   * ============================================================
   */

  const pharmacyId =
    cleanString(
      body.pharmacyId,
    );

  const planId =
    cleanString(
      body.planId,
    );

  const requestedCurrency =
    normalizeCurrency(
      body.currencyCode,
    );

  const reason =
    cleanString(
      body.reason,
    );

  /*
   * ============================================================
   * 4. VALIDATION
   * ============================================================
   */

  if (!pharmacyId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "L'identifiant de la pharmacie est obligatoire.",
      },
      {
        status: 400,
      },
    );
  }

  if (!planId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "L'identifiant du forfait est obligatoire.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    requestedCurrency &&
    !isValidCurrency(
      requestedCurrency,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "La devise sélectionnée est invalide.",
      },
      {
        status: 400,
      },
    );
  }

  if (!reason) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Le motif de l'activation est obligatoire.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    reason.length >
    500
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Le motif ne peut pas dépasser 500 caractères.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * ============================================================
   * 5. CLIENT ADMIN SUPABASE
   * ============================================================
   */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "MANUAL SUBSCRIPTION POST - ADMIN CLIENT:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Le client Admin Supabase ne peut pas être initialisé.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 6. RÉCUPÉRER LA PHARMACIE
   * ============================================================
   */

  const {
    data: pharmacyData,
    error: pharmacyError,
  } =
    await supabaseAdmin
      .from("pharmacies")
      .select(
        `
          id,
          name,
          status,
          owner_id,
          currency_code
        `,
      )
      .eq(
        "id",
        pharmacyId,
      )
      .maybeSingle();

  if (pharmacyError) {
    console.error(
      "MANUAL SUBSCRIPTION - PHARMACY READ:",
      pharmacyError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de récupérer la pharmacie.",
        details:
          pharmacyError.message,
      },
      {
        status: 500,
      },
    );
  }

  if (!pharmacyData) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Pharmacie introuvable.",
      },
      {
        status: 404,
      },
    );
  }

  const pharmacy =
    pharmacyData as PharmacyRow;

  /*
   * ============================================================
   * 7. VÉRIFICATION DU STATUT
   * ============================================================
   *
   * inactive = autorisé
   *
   * disabled / blocked / suspended / closed = refusé
   *
   * ============================================================
   */

  if (
    isAdministrativeBlock(
      pharmacy.status,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Cette pharmacie est administrativement bloquée. Réactivez-la d'abord depuis le panneau Super Admin.",
        status:
          pharmacy.status,
      },
      {
        status: 409,
      },
    );
  }

  /*
   * ============================================================
   * 8. RÉCUPÉRER LE PLAN
   * ============================================================
   */

  const {
    data: planData,
    error: planError,
  } =
    await supabaseAdmin
      .from(
        "subscription_plans",
      )
      .select(
        `
          id,
          name,
          code,
          duration_days,
          price,
          currency_code,
          is_active
        `,
      )
      .eq(
        "id",
        planId,
      )
      .maybeSingle();

  if (planError) {
    console.error(
      "MANUAL SUBSCRIPTION - PLAN READ:",
      planError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de récupérer le forfait.",
        details:
          planError.message,
      },
      {
        status: 500,
      },
    );
  }

  if (!planData) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Forfait introuvable.",
      },
      {
        status: 404,
      },
    );
  }

  const plan =
    planData as PlanRow;

  /*
   * ============================================================
   * 9. FORFAIT ACTIF
   * ============================================================
   */

  if (
    plan.is_active !==
    true
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ce forfait n'est plus disponible.",
      },
      {
        status: 409,
      },
    );
  }

  /*
   * ============================================================
   * 10. VALIDATION DURÉE
   * ============================================================
   */

  const durationDays =
    Number(
      plan.duration_days,
    );

  if (
    !Number.isInteger(
      durationDays,
    ) ||
    durationDays <= 0
  ) {
    console.error(
      "MANUAL SUBSCRIPTION - INVALID PLAN DURATION:",
      {
        planId,
        duration_days:
          plan.duration_days,
      },
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "La durée du forfait est invalide.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 11. DÉTERMINER LA DEVISE
   * ============================================================
   *
   * Priorité :
   *
   * 1. devise envoyée par le Super Admin
   * 2. devise de la pharmacie
   * 3. devise du plan
   *
   * ============================================================
   */

  const pharmacyCurrency =
    normalizeCurrency(
      pharmacy.currency_code,
    );

  const planCurrency =
    normalizeCurrency(
      plan.currency_code,
    );

  const currencyCode =
    requestedCurrency ||
    pharmacyCurrency ||
    planCurrency;

  if (
    !currencyCode ||
    !isValidCurrency(
      currencyCode,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de déterminer la devise de l'abonnement.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * ============================================================
   * 12. RÉCUPÉRER LE PRIX DU FORFAIT
   * ============================================================
   *
   * IMPORTANT :
   *
   * Le prix est récupéré dans subscription_plan_prices.
   *
   * Exemple :
   *
   * Mensuel / XOF = 8 500
   * Annuel / XOF = 85 000
   * Mensuel / USD = 15
   * Annuel / USD = 150
   *
   * ============================================================
   */

  const {
    data: priceData,
    error: priceError,
  } =
    await supabaseAdmin
      .from(
        "subscription_plan_prices",
      )
      .select(
        `
          id,
          plan_id,
          currency_code,
          price,
          is_active
        `,
      )
      .eq(
        "plan_id",
        plan.id,
      )
      .eq(
        "currency_code",
        currencyCode,
      )
      .eq(
        "is_active",
        true,
      )
      .maybeSingle();

  if (priceError) {
    console.error(
      "MANUAL SUBSCRIPTION - PRICE READ:",
      priceError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de récupérer le prix du forfait.",
        details:
          priceError.message,
      },
      {
        status: 500,
      },
    );
  }

  if (!priceData) {
    return NextResponse.json(
      {
        success: false,
        error:
          `Aucun prix actif n'est configuré pour le forfait "${plan.name}" en ${currencyCode}.`,
      },
      {
        status: 409,
      },
    );
  }

  const planPriceRow =
    priceData as PlanPriceRow;

  const planPrice =
    Number(
      planPriceRow.price,
    );

  if (
    !Number.isFinite(
      planPrice,
    ) ||
    planPrice < 0
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Le prix du forfait est invalide.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 13. RÉCUPÉRER L'ABONNEMENT ACTUEL
   * ============================================================
   */

  const {
    data: currentSubscriptionData,
    error:
      currentSubscriptionError,
  } =
    await supabaseAdmin
      .from(
        "subscriptions",
      )
      .select(
        `
          id,
          pharmacy_id,
          plan_id,
          status,
          trial_started_at,
          trial_ends_at,
          started_at,
          expires_at,
          created_at,
          updated_at
        `,
      )
      .eq(
        "pharmacy_id",
        pharmacyId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (
    currentSubscriptionError
  ) {
    console.error(
      "MANUAL SUBSCRIPTION - CURRENT SUBSCRIPTION READ:",
      currentSubscriptionError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de vérifier l'abonnement actuel.",
        details:
          currentSubscriptionError.message,
      },
      {
        status: 500,
      },
    );
  }

  const currentSubscription =
    currentSubscriptionData as
      | SubscriptionRow
      | null;

  /*
   * ============================================================
   * 14. CALCUL DES DATES
   * ============================================================
   *
   * Si l'ancien abonnement est encore actif :
   *
   *      ancienne expiration
   *              ↓
   *      nouveau forfait
   *
   * Si l'ancien abonnement est expiré :
   *
   *      maintenant
   *              ↓
   *      nouveau forfait
   *
   * ============================================================
   */

  const now =
    new Date();

  let startedAt =
    new Date(now);

  const currentExpiresAt =
    validDate(
      currentSubscription?.expires_at,
    );

  if (
    currentExpiresAt &&
    currentExpiresAt.getTime() >
      now.getTime()
  ) {
    startedAt =
      new Date(
        currentExpiresAt,
      );
  }

  const expiresAt =
    new Date(
      startedAt,
    );

  expiresAt.setUTCDate(
    expiresAt.getUTCDate() +
      durationDays,
  );

  /*
   * ============================================================
   * 15. CRÉER LA SOUSCRIPTION
   * ============================================================
   */

  const {
    data: subscriptionData,
    error: subscriptionError,
  } =
    await supabaseAdmin
      .from(
        "subscriptions",
      )
      .insert({
        pharmacy_id:
          pharmacyId,

        plan_id:
          plan.id,

        status:
          "active",

        trial_started_at:
          null,

        trial_ends_at:
          null,

        started_at:
          startedAt.toISOString(),

        expires_at:
          expiresAt.toISOString(),

        updated_at:
          now.toISOString(),
      })
      .select(
        `
          id,
          pharmacy_id,
          plan_id,
          status,
          trial_started_at,
          trial_ends_at,
          started_at,
          expires_at,
          created_at,
          updated_at
        `,
      )
      .single();

  if (subscriptionError) {
    console.error(
      "MANUAL SUBSCRIPTION - INSERT:",
      subscriptionError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de créer l'abonnement.",
        details:
          subscriptionError.message,
        code:
          subscriptionError.code ??
          null,
      },
      {
        status: 500,
      },
    );
  }

  const subscription =
    subscriptionData as SubscriptionRow;

  /*
   * ============================================================
   * 16. RÉACTIVER LA PHARMACIE
   * ============================================================
   *
   * Une pharmacie inactive peut être réactivée.
   *
   * Les blocages administratifs ont déjà été refusés.
   *
   * ============================================================
   */

  let updatedPharmacy =
    pharmacy;

  const pharmacyStatus =
    String(
      pharmacy.status ??
        "",
    )
      .trim()
      .toLowerCase();

  if (
    pharmacyStatus !==
    "active"
  ) {
    const {
      data:
        pharmacyUpdate,
      error:
        pharmacyUpdateError,
    } =
      await supabaseAdmin
        .from(
          "pharmacies",
        )
        .update({
          status:
            "active",

          updated_at:
            now.toISOString(),
        })
        .eq(
          "id",
          pharmacyId,
        )
        .select(
          `
            id,
            name,
            status,
            owner_id,
            currency_code
          `,
        )
        .single();

    if (
      pharmacyUpdateError
    ) {
      console.error(
        "MANUAL SUBSCRIPTION - PHARMACY ACTIVATE:",
        pharmacyUpdateError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "L'abonnement a été créé, mais la pharmacie n'a pas pu être réactivée.",
          subscription,
          details:
            pharmacyUpdateError.message,
        },
        {
          status: 500,
        },
      );
    }

    updatedPharmacy =
      pharmacyUpdate as PharmacyRow;
  }

  /*
   * ============================================================
   * 17. RÉPONSE FINALE
   * ============================================================
   */

  return NextResponse.json(
    {
      success: true,

      message:
        "Abonnement manuel activé avec succès.",

      payment: {
        method:
          "cash",

        label:
          "Paiement manuel / espèces",

        currency:
          currencyCode,

        amount:
          planPrice,
      },

      pharmacy: {
        id:
          updatedPharmacy.id,

        name:
          updatedPharmacy.name,

        status:
          updatedPharmacy.status,
      },

      plan: {
        id:
          plan.id,

        name:
          plan.name,

        code:
          plan.code,

        duration_days:
          durationDays,

        currency_code:
          currencyCode,

        price:
          planPrice,
      },

      subscription,

      access: {
        enabled:
          true,

        started_at:
          subscription.started_at,

        expires_at:
          subscription.expires_at,
      },

      renewal: {
        previous_subscription_id:
          currentSubscription?.id ??
          null,

        extended_from_existing:
          !!(
            currentExpiresAt &&
            currentExpiresAt.getTime() >
              now.getTime()
          ),
      },
    },
    {
      status: 201,
    },
  );
}