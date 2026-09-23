import { NextResponse } from "next/server";

import { createClient } from "../../../lib/supabase/server";

type Locale = "fr" | "en";

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  pharmacy_id: string | null;
  language: string | null;
};

type PharmacyRow = {
  id: string;
  name: string;
  address: string | null;
  country_code: string | null;
  city: string | null;
  currency_code: string | null;
  owner_id: string | null;
  status: string | null;

  /*
   * Accès manuel accordé par le Super Admin.
   */
  manual_access_enabled: boolean | null;
  manual_access_until: string | null;
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

type SubscriptionStatus =
  | "trial"
  | "active"
  | "expired"
  | "past_due"
  | "suspended"
  | "cancelled";

type AccessReason =
  | "trial"
  | "active"
  | "manual_access"
  | "expired"
  | "past_due"
  | "suspended"
  | "cancelled"
  | "no_subscription"
  | "manual_access_expired"
  | "pharmacy_inactive";

type TimeRemaining = {
  remaining_ms: number;
  remaining_seconds: number;
  remaining_minutes: number;
  remaining_hours: number;
  remaining_days: number;
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

/**
 * Normalise la langue de l'utilisateur.
 */
function normalizeLanguage(
  value: string | null | undefined,
): Locale {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "en"
    ? "en"
    : "fr";
}

/**
 * Normalise une devise ISO 4217.
 */
function normalizeCurrency(
  value: string | null | undefined,
): string | null {
  const currency = String(value ?? "")
    .trim()
    .toUpperCase();

  if (!currency) {
    return null;
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return null;
  }

  return currency;
}

/**
 * Normalise le statut d'un abonnement.
 *
 * "paid" est également accepté et transformé en "active".
 */
function normalizeSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();

  switch (status) {
    case "trial":
    case "trialing":
      return "trial";

    case "active":
    case "paid":
      return "active";

    case "expired":
      return "expired";

    case "past_due":
      return "past_due";

    case "suspended":
      return "suspended";

    case "cancelled":
    case "canceled":
      return "cancelled";

    default:
      return "expired";
  }
}

/**
 * Vérifie qu'une date est dans le futur.
 */
function isFutureDate(
  value: string | null | undefined,
  nowMs: number,
): boolean {
  if (!value) {
    return false;
  }

  const timestamp =
    new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp > nowMs;
}

/**
 * Calcule le temps restant jusqu'à une date.
 */
function calculateRemaining(
  targetDate: string | null,
  nowMs: number,
): TimeRemaining {
  if (!targetDate) {
    return {
      remaining_ms: 0,
      remaining_seconds: 0,
      remaining_minutes: 0,
      remaining_hours: 0,
      remaining_days: 0,
    };
  }

  const targetMs =
    new Date(targetDate).getTime();

  if (!Number.isFinite(targetMs)) {
    return {
      remaining_ms: 0,
      remaining_seconds: 0,
      remaining_minutes: 0,
      remaining_hours: 0,
      remaining_days: 0,
    };
  }

  const remainingMs = Math.max(
    targetMs - nowMs,
    0,
  );

  const remainingSeconds =
    Math.floor(
      remainingMs / 1000,
    );

  const remainingMinutes =
    Math.floor(
      remainingSeconds / 60,
    );

  const remainingHours =
    Math.floor(
      remainingMinutes / 60,
    );

  const remainingDays =
    Math.floor(
      remainingHours / 24,
    );

  return {
    remaining_ms: remainingMs,
    remaining_seconds:
      remainingSeconds,
    remaining_minutes:
      remainingMinutes,
    remaining_hours:
      remainingHours,
    remaining_days:
      remainingDays,
  };
}

/**
 * Calcule le pourcentage utilisé du trial.
 */
function calculateTrialPercent(
  startedAt: string | null,
  endsAt: string | null,
  nowMs: number,
): number {
  if (!startedAt || !endsAt) {
    return 0;
  }

  const startMs =
    new Date(startedAt).getTime();

  const endMs =
    new Date(endsAt).getTime();

  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    endMs <= startMs
  ) {
    return 0;
  }

  const total =
    endMs - startMs;

  const elapsed =
    Math.min(
      Math.max(
        nowMs - startMs,
        0,
      ),
      total,
    );

  return Math.min(
    Math.max(
      Math.round(
        (elapsed / total) * 100,
      ),
      0,
    ),
    100,
  );
}

/* ==========================================================================
   PHARMACY ACCESS
   ========================================================================== */

/**
 * Les statuts suivants représentent un blocage administratif réel.
 *
 * IMPORTANT :
 *
 * "inactive" n'est PAS dans cette liste.
 *
 * Pourquoi ?
 *
 * Une pharmacie inactive peut avoir son accès réactivé
 * temporairement par le Super Admin grâce à l'accès manuel.
 */
function isAdministrativeBlock(
  status: string | null,
): boolean {
  const normalized =
    String(status ?? "")
      .trim()
      .toLowerCase();

  return [
    "disabled",
    "blocked",
    "suspended",
    "closed",
  ].includes(normalized);
}

/**
 * Vérifie l'accès manuel du Super Admin.
 *
 * Règle :
 *
 * manual_access_enabled = true
 *
 * ET
 *
 * manual_access_until > maintenant
 */
function hasValidManualAccess(
  pharmacy: PharmacyRow,
  nowMs: number,
): boolean {
  if (
    pharmacy.manual_access_enabled !==
    true
  ) {
    return false;
  }

  return isFutureDate(
    pharmacy.manual_access_until,
    nowMs,
  );
}

/**
 * Retourne les informations détaillées
 * de l'accès manuel.
 */
function buildManualAccessResponse(
  pharmacy: PharmacyRow,
  nowMs: number,
) {
  const enabled =
    pharmacy.manual_access_enabled ===
    true;

  const valid =
    hasValidManualAccess(
      pharmacy,
      nowMs,
    );

  const remaining =
    valid
      ? calculateRemaining(
          pharmacy.manual_access_until,
          nowMs,
        )
      : {
          remaining_ms: 0,
          remaining_seconds: 0,
          remaining_minutes: 0,
          remaining_hours: 0,
          remaining_days: 0,
        };

  return {
    enabled,

    valid,

    until:
      pharmacy.manual_access_until ??
      null,

    remaining_ms:
      remaining.remaining_ms,

    remaining_seconds:
      remaining.remaining_seconds,

    remaining_minutes:
      remaining.remaining_minutes,

    remaining_hours:
      remaining.remaining_hours,

    remaining_days:
      remaining.remaining_days,
  };
}

/* ==========================================================================
   SUBSCRIPTION ACCESS
   ========================================================================== */

/**
 * Vérifie si l'abonnement est actuellement valide.
 */
function hasValidSubscription(
  subscription: SubscriptionRow | null,
  nowMs: number,
): boolean {
  if (!subscription) {
    return false;
  }

  const status =
    String(
      subscription.status ?? "",
    )
      .trim()
      .toLowerCase();

  /*
   * TRIAL
   */
  if (
    status === "trial" ||
    status === "trialing"
  ) {
    return isFutureDate(
      subscription.trial_ends_at,
      nowMs,
    );
  }

  /*
   * ABONNEMENT PAYÉ
   */
  if (
    status === "active" ||
    status === "paid"
  ) {
    return isFutureDate(
      subscription.expires_at,
      nowMs,
    );
  }

  return false;
}

/* ==========================================================================
   RESPONSE HELPERS
   ========================================================================== */

function createError(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      success: false,
      authenticated: false,
      message,
    },
    {
      status,
    },
  );
}

function buildEmptyTrial(
  percentUsed = 0,
) {
  return {
    active: false,

    started_at: null,

    ends_at: null,

    remaining_ms: 0,

    remaining_seconds: 0,

    remaining_minutes: 0,

    remaining_hours: 0,

    remaining_days: 0,

    percent_used:
      percentUsed,
  };
}

function buildEmptyExpiration() {
  return {
    expired: true,

    expires_at: null,

    remaining_ms: 0,

    remaining_seconds: 0,

    remaining_minutes: 0,

    remaining_hours: 0,

    remaining_days: 0,
  };
}

function buildUserResponse(
  profile: ProfileRow,
  locale: Locale,
  pharmacyId: string,
) {
  return {
    id: profile.id,

    full_name:
      profile.full_name,

    phone:
      profile.phone,

    role:
      profile.role,

    language:
      locale,

    pharmacy_id:
      pharmacyId,
  };
}

function buildPharmacyResponse(
  pharmacy: PharmacyRow,
  nowMs: number,
) {
  return {
    id:
      pharmacy.id,

    name:
      pharmacy.name,

    address:
      pharmacy.address,

    country_code:
      pharmacy.country_code,

    city:
      pharmacy.city,

    currency_code:
      normalizeCurrency(
        pharmacy.currency_code,
      ),

    owner_id:
      pharmacy.owner_id,

    status:
      pharmacy.status,

    manual_access:
      buildManualAccessResponse(
        pharmacy,
        nowMs,
      ),
  };
}

/* ==========================================================================
   GET /api/subscription/status
   ========================================================================== */

export async function GET() {
  try {
    /* ======================================================================
       1. SUPABASE
       ====================================================================== */

    const supabase =
      await createClient();

    /* ======================================================================
       2. UTILISATEUR CONNECTÉ
       ====================================================================== */

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError) {
      console.error(
        "PharmaFlow subscription status - auth:",
        authError,
      );

      return createError(
        "Impossible de vérifier votre session.",
        401,
      );
    }

    const user =
      authData.user;

    if (!user) {
      return createError(
        "Vous devez être connecté.",
        401,
      );
    }

    /* ======================================================================
       3. PROFIL
       ====================================================================== */

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            phone,
            role,
            pharmacy_id,
            language
          `,
        )
        .eq(
          "id",
          user.id,
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "PharmaFlow subscription status - profile:",
        profileError,
      );

      return createError(
        "Impossible de récupérer votre profil.",
        500,
      );
    }

    if (!profile) {
      return createError(
        "Votre profil utilisateur est introuvable.",
        404,
      );
    }

    const typedProfile =
      profile as ProfileRow;

    if (
      !typedProfile.pharmacy_id
    ) {
      return createError(
        "Aucune pharmacie n'est associée à votre compte.",
        400,
      );
    }

    const pharmacyId =
      typedProfile.pharmacy_id;

    /* ======================================================================
       4. DATE SERVEUR
       ====================================================================== */

    const now =
      new Date();

    const nowMs =
      now.getTime();

    const serverTime =
      now.toISOString();

    /* ======================================================================
       5. LANGUE
       ====================================================================== */

    const locale =
      normalizeLanguage(
        typedProfile.language,
      );

    /* ======================================================================
       6. PHARMACIE
       ====================================================================== */

    const {
      data: pharmacy,
      error: pharmacyError,
    } =
      await supabase
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
            manual_access_enabled,
            manual_access_until
          `,
        )
        .eq(
          "id",
          pharmacyId,
        )
        .maybeSingle();

    if (pharmacyError) {
      console.error(
        "PharmaFlow subscription status - pharmacy:",
        pharmacyError,
      );

      return createError(
        "Impossible de récupérer votre pharmacie.",
        500,
      );
    }

    if (!pharmacy) {
      return createError(
        "La pharmacie associée à votre compte est introuvable.",
        404,
      );
    }

    const typedPharmacy =
      pharmacy as PharmacyRow;

    const pharmacyCurrency =
      normalizeCurrency(
        typedPharmacy.currency_code,
      );

    const userResponse =
      buildUserResponse(
        typedProfile,
        locale,
        pharmacyId,
      );

    const pharmacyResponse =
      buildPharmacyResponse(
        typedPharmacy,
        nowMs,
      );

    const manualAccessResponse =
      buildManualAccessResponse(
        typedPharmacy,
        nowMs,
      );

    /* ======================================================================
       7. BLOCAGE ADMINISTRATIF
       ====================================================================== */

    /*
     * IMPORTANT :
     *
     * Ces statuts restent prioritaires.
     *
     * Le Super Admin peut donc réellement désactiver
     * une pharmacie et empêcher même un accès manuel
     * de contourner ce blocage.
     */

    if (
      isAdministrativeBlock(
        typedPharmacy.status,
      )
    ) {
      return NextResponse.json({
        success: true,

        authenticated: true,

        access: {
          allowed: false,

          blocked: true,

          reason:
            "pharmacy_inactive" as AccessReason,

          manual_access:
            manualAccessResponse,
        },

        status:
          "suspended" as SubscriptionStatus,

        locale,

        user:
          userResponse,

        pharmacy:
          pharmacyResponse,

        subscription: null,

        plan: null,

        prices: {
          currency_code:
            pharmacyCurrency,

          monthly: null,

          yearly: null,

          available: false,
        },

        trial:
          buildEmptyTrial(100),

        expiration:
          buildEmptyExpiration(),

        manual_access:
          manualAccessResponse,

        server_time:
          serverTime,
      });
    }

    /* ======================================================================
       8. ACCÈS MANUEL PRIORITAIRE
       ====================================================================== */

    /*
     * C'EST LE POINT PRINCIPAL DE LA MODIFICATION.
     *
     * L'accès manuel est vérifié AVANT l'abonnement.
     *
     * Cela permet :
     *
     * 1. abonnement expiré + accès manuel = ACCÈS
     *
     * 2. aucun abonnement + accès manuel = ACCÈS
     *
     * 3. pharmacie inactive + accès manuel = ACCÈS
     *
     * 4. abonnement actif + accès manuel = ACCÈS
     *
     * L'accès manuel est donc une autorisation temporaire
     * accordée directement par le Super Administrateur.
     */

    const manualAccessValid =
      hasValidManualAccess(
        typedPharmacy,
        nowMs,
      );

    if (
      manualAccessValid
    ) {
      return NextResponse.json({
        success: true,

        authenticated: true,

        access: {
          allowed: true,

          blocked: false,

          reason:
            "manual_access" as AccessReason,

          manual_access:
            manualAccessResponse,
        },

        /*
         * On retourne "active" pour permettre
         * aux composants qui utilisent "status"
         * de considérer l'accès comme actuellement autorisé.
         *
         * L'information réelle reste disponible
         * dans access.reason = "manual_access".
         */
        status:
          "active" as SubscriptionStatus,

        locale,

        user:
          userResponse,

        pharmacy:
          pharmacyResponse,

        /*
         * L'abonnement peut être expiré ou absent.
         *
         * L'accès vient du Super Admin.
         */
        subscription: null,

        plan: null,

        prices: {
          currency_code:
            pharmacyCurrency,

          monthly: null,

          yearly: null,

          available: false,
        },

        trial:
          buildEmptyTrial(100),

        expiration:
          buildEmptyExpiration(),

        manual_access:
          manualAccessResponse,

        server_time:
          serverTime,
      });
    }

    /* ======================================================================
       9. RÉCUPÉRATION DES ABONNEMENTS
       ====================================================================== */

    const {
      data: subscriptionRows,
      error: subscriptionError,
    } =
      await supabase
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
        .limit(10);

    if (subscriptionError) {
      console.error(
        "PharmaFlow subscription status - subscription:",
        subscriptionError,
      );

      return createError(
        "Impossible de vérifier votre abonnement.",
        500,
      );
    }

    const subscriptions =
      (subscriptionRows ??
        []) as SubscriptionRow[];

    const subscription =
      subscriptions.length > 0
        ? subscriptions[0]
        : null;

    /* ======================================================================
       10. PLANS MENSUEL / ANNUEL
       ====================================================================== */

    let monthlyPlan:
      PlanRow | null = null;

    let yearlyPlan:
      PlanRow | null = null;

    const {
      data: pricingPlans,
      error: pricingPlansError,
    } =
      await supabase
        .from("subscription_plans")
        .select(
          `
            id,
            code,
            name,
            duration_days,
            is_active
          `,
        )
        .in(
          "code",
          [
            "monthly",
            "yearly",
          ],
        )
        .eq(
          "is_active",
          true,
        );

    if (pricingPlansError) {
      console.error(
        "PharmaFlow subscription status - pricing plans:",
        pricingPlansError,
      );
    } else {
      const plans =
        (pricingPlans ??
          []) as PlanRow[];

      monthlyPlan =
        plans.find(
          (item) =>
            item.code
              ?.trim()
              .toLowerCase() ===
            "monthly",
        ) ??
        plans.find(
          (item) =>
            Number(
              item.duration_days,
            ) === 30,
        ) ??
        null;

      yearlyPlan =
        plans.find(
          (item) =>
            item.code
              ?.trim()
              .toLowerCase() ===
            "yearly",
        ) ??
        plans.find(
          (item) =>
            Number(
              item.duration_days,
            ) === 365,
        ) ??
        null;
    }

    /* ======================================================================
       11. PRIX
       ====================================================================== */

    let planPrices:
      PlanPriceRow[] = [];

    if (pharmacyCurrency) {
      const {
        data: priceRows,
        error: priceError,
      } =
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
          .eq(
            "currency_code",
            pharmacyCurrency,
          );

      if (priceError) {
        console.error(
          "PharmaFlow subscription status - plan prices:",
          priceError,
        );
      } else {
        planPrices =
          (priceRows ??
            []) as PlanPriceRow[];
      }
    }

    /* ======================================================================
       12. PRIX MENSUEL / ANNUEL
       ====================================================================== */

    const monthlyPrice =
      monthlyPlan
        ? planPrices.find(
            (row) =>
              row.plan_id ===
              monthlyPlan?.id,
          ) ?? null
        : null;

    const yearlyPrice =
      yearlyPlan
        ? planPrices.find(
            (row) =>
              row.plan_id ===
              yearlyPlan?.id,
          ) ?? null
        : null;

    /* ======================================================================
       13. VALIDATION DES PRIX
       ====================================================================== */

    const validMonthlyPrice =
      monthlyPrice &&
      Number.isFinite(
        Number(
          monthlyPrice.price,
        ),
      ) &&
      Number(
        monthlyPrice.price,
      ) >= 0
        ? monthlyPrice
        : null;

    const validYearlyPrice =
      yearlyPrice &&
      Number.isFinite(
        Number(
          yearlyPrice.price,
        ),
      ) &&
      Number(
        yearlyPrice.price,
      ) >= 0
        ? yearlyPrice
        : null;

    const pricesResponse = {
      currency_code:
        pharmacyCurrency,

      available:
        Boolean(
          validMonthlyPrice ||
          validYearlyPrice,
        ),

      monthly:
        monthlyPlan &&
        validMonthlyPrice
          ? {
              plan_id:
                monthlyPlan.id,

              code:
                monthlyPlan.code,

              name:
                monthlyPlan.name,

              duration_days:
                monthlyPlan.duration_days,

              price:
                Number(
                  validMonthlyPrice.price,
                ),

              currency_code:
                normalizeCurrency(
                  validMonthlyPrice.currency_code,
                ),
            }
          : null,

      yearly:
        yearlyPlan &&
        validYearlyPrice
          ? {
              plan_id:
                yearlyPlan.id,

              code:
                yearlyPlan.code,

              name:
                yearlyPlan.name,

              duration_days:
                yearlyPlan.duration_days,

              price:
                Number(
                  validYearlyPrice.price,
                ),

              currency_code:
                normalizeCurrency(
                  validYearlyPrice.currency_code,
                ),
            }
          : null,
    };

    /* ======================================================================
       14. AUCUN ABONNEMENT
       ====================================================================== */

    if (!subscription) {
      return NextResponse.json({
        success: true,

        authenticated: true,

        access: {
          allowed: false,

          blocked: true,

          reason:
            typedPharmacy.manual_access_enabled
              ? (
                  "manual_access_expired" as AccessReason
                )
              : (
                  "no_subscription" as AccessReason
                ),

          manual_access:
            manualAccessResponse,
        },

        status:
          "expired" as SubscriptionStatus,

        locale,

        user:
          userResponse,

        pharmacy:
          pharmacyResponse,

        subscription: null,

        plan: null,

        prices:
          pricesResponse,

        trial:
          buildEmptyTrial(100),

        expiration:
          buildEmptyExpiration(),

        manual_access:
          manualAccessResponse,

        server_time:
          serverTime,
      });
    }

    /* ======================================================================
       15. PLAN ACTUEL
       ====================================================================== */

    const {
      data: currentPlanData,
      error: currentPlanError,
    } =
      await supabase
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
          subscription.plan_id,
        )
        .maybeSingle();

    if (currentPlanError) {
      console.error(
        "PharmaFlow subscription status - current plan:",
        currentPlanError,
      );
    }

    const currentPlan =
      currentPlanData
        ? (
            currentPlanData as PlanRow
          )
        : null;

    /* ======================================================================
       16. STATUT ABONNEMENT
       ====================================================================== */

    const status =
      normalizeSubscriptionStatus(
        subscription.status,
      );

    /* ======================================================================
       17. TEMPS RESTANT
       ====================================================================== */

    const trialRemaining =
      calculateRemaining(
        subscription.trial_ends_at,
        nowMs,
      );

    const expiration =
      calculateRemaining(
        subscription.expires_at,
        nowMs,
      );

    const trialPercent =
      calculateTrialPercent(
        subscription.trial_started_at,
        subscription.trial_ends_at,
        nowMs,
      );

    /* ======================================================================
       18. VALIDATION TRIAL
       ====================================================================== */

    const trialStartedMs =
      subscription.trial_started_at
        ? new Date(
            subscription.trial_started_at,
          ).getTime()
        : NaN;

    const trialEndsMs =
      subscription.trial_ends_at
        ? new Date(
            subscription.trial_ends_at,
          ).getTime()
        : NaN;

    const trialDatesValid =
      Number.isFinite(
        trialStartedMs,
      ) &&
      Number.isFinite(
        trialEndsMs,
      ) &&
      trialEndsMs >
        trialStartedMs;

    const trialStillValid =
      status === "trial" &&
      trialDatesValid &&
      nowMs <
        trialEndsMs;

    /* ======================================================================
       19. ABONNEMENT PAYÉ
       ====================================================================== */

    const paidSubscriptionStillValid =
      status === "active" &&
      Boolean(
        subscription.expires_at,
      ) &&
      expiration.remaining_ms >
        0;

    /* ======================================================================
       20. DÉCISION FINALE
       ====================================================================== */

    let allowed = false;

    let blocked = true;

    let reason: AccessReason =
      "expired";

    /*
     * TRIAL VALIDE
     */
    if (
      trialStillValid
    ) {
      allowed = true;

      blocked = false;

      reason =
        "trial";
    }

    /*
     * ABONNEMENT PAYÉ VALIDE
     */
    else if (
      paidSubscriptionStillValid
    ) {
      allowed = true;

      blocked = false;

      reason =
        "active";
    }

    /*
     * ACCÈS MANUEL
     *
     * Normalement cette condition aura déjà été traitée
     * à l'étape 8.
     *
     * Elle reste ici comme sécurité supplémentaire.
     */
    else if (
      manualAccessValid
    ) {
      allowed = true;

      blocked = false;

      reason =
        "manual_access";
    }

    /*
     * ACCÈS MANUEL EXPIRÉ
     */
    else if (
      typedPharmacy.manual_access_enabled ===
      true
    ) {
      allowed = false;

      blocked = true;

      reason =
        "manual_access_expired";
    }

    /*
     * PAIEMENT EN RETARD
     */
    else if (
      status === "past_due"
    ) {
      allowed = false;

      blocked = true;

      reason =
        "past_due";
    }

    /*
     * ABONNEMENT SUSPENDU
     */
    else if (
      status === "suspended"
    ) {
      allowed = false;

      blocked = true;

      reason =
        "suspended";
    }

    /*
     * ABONNEMENT ANNULÉ
     */
    else if (
      status === "cancelled"
    ) {
      allowed = false;

      blocked = true;

      reason =
        "cancelled";
    }

    /*
     * EXPIRÉ
     */
    else {
      allowed = false;

      blocked = true;

      reason =
        "expired";
    }

    /* ======================================================================
       21. POURCENTAGE TRIAL
       ====================================================================== */

    let finalTrialPercent =
      0;

    if (
      trialStillValid
    ) {
      finalTrialPercent =
        trialPercent;
    } else if (
      status === "trial"
    ) {
      finalTrialPercent =
        100;
    }

    /* ======================================================================
       22. RÉPONSE TRIAL
       ====================================================================== */

    const trialResponse = {
      active:
        trialStillValid,

      started_at:
        subscription.trial_started_at,

      ends_at:
        subscription.trial_ends_at,

      remaining_ms:
        trialStillValid
          ? trialRemaining.remaining_ms
          : 0,

      remaining_seconds:
        trialStillValid
          ? trialRemaining.remaining_seconds
          : 0,

      remaining_minutes:
        trialStillValid
          ? trialRemaining.remaining_minutes
          : 0,

      remaining_hours:
        trialStillValid
          ? trialRemaining.remaining_hours
          : 0,

      remaining_days:
        trialStillValid
          ? trialRemaining.remaining_days
          : 0,

      percent_used:
        finalTrialPercent,
    };

    /* ======================================================================
       23. RÉPONSE EXPIRATION
       ====================================================================== */

    const expirationResponse = {
      expired:
        !subscription.expires_at ||
        expiration.remaining_ms <=
          0,

      expires_at:
        subscription.expires_at,

      remaining_ms:
        expiration.remaining_ms,

      remaining_seconds:
        expiration.remaining_seconds,

      remaining_minutes:
        expiration.remaining_minutes,

      remaining_hours:
        expiration.remaining_hours,

      remaining_days:
        expiration.remaining_days,
    };

    /* ======================================================================
       24. RÉPONSE FINALE
       ====================================================================== */

    return NextResponse.json({
      success: true,

      authenticated: true,

      access: {
        allowed,

        blocked,

        reason,

        manual_access:
          manualAccessResponse,
      },

      status,

      locale,

      user:
        userResponse,

      pharmacy:
        pharmacyResponse,

      subscription: {
        id:
          subscription.id,

        pharmacy_id:
          subscription.pharmacy_id,

        plan_id:
          subscription.plan_id,

        plan_code:
          currentPlan?.code ??
          null,

        plan_name:
          currentPlan?.name ??
          null,

        status,

        trial_started_at:
          subscription.trial_started_at,

        trial_ends_at:
          subscription.trial_ends_at,

        expires_at:
          subscription.expires_at,

        created_at:
          subscription.created_at,

        updated_at:
          subscription.updated_at,
      },

      plan:
        currentPlan
          ? {
              id:
                currentPlan.id,

              name:
                currentPlan.name,

              code:
                currentPlan.code,

              duration_days:
                currentPlan.duration_days,

              is_active:
                currentPlan.is_active,
            }
          : null,

      prices:
        pricesResponse,

      trial:
        trialResponse,

      expiration:
        expirationResponse,

      manual_access:
        manualAccessResponse,

      server_time:
        serverTime,
    });
  } catch (error) {
    console.error(
      "PharmaFlow subscription status - fatal:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        authenticated: false,

        message:
          error instanceof Error
            ? error.message
            : "Impossible de vérifier l'état de votre abonnement.",
      },
      {
        status: 500,
      },
    );
  }
}