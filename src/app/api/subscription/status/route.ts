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

  manual_access_enabled: boolean | null;
  manual_access_until: string | null;
  manual_access_reason: string | null;
  manual_access_by: string | null;
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

function normalizeLanguage(
  value: string | null | undefined,
): Locale {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "en"
    ? "en"
    : "fr";
}

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

function normalizeSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();

  switch (status) {
    case "trial":
      return "trial";

    case "active":
      return "active";

    case "expired":
      return "expired";

    case "past_due":
      return "past_due";

    case "suspended":
      return "suspended";

    case "cancelled":
      return "cancelled";

    default:
      return "expired";
  }
}

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

function isPharmacyActive(
  status: string | null,
): boolean {
  const normalized =
    String(status ?? "")
      .trim()
      .toLowerCase();

  /*
   * Si aucun statut n'est renseigné,
   * on conserve le comportement historique :
   * la pharmacie n'est pas considérée comme bloquée.
   */
  if (!normalized) {
    return true;
  }

  return ![
    "inactive",
    "disabled",
    "blocked",
    "suspended",
    "closed",
  ].includes(normalized);
}

/**
 * Vérifie l'accès manuel accordé par le Super Admin.
 *
 * L'accès est valide uniquement si :
 *
 * manual_access_enabled = true
 * ET
 * manual_access_until existe
 * ET
 * manual_access_until > maintenant
 */
function hasValidManualAccess(
  pharmacy: PharmacyRow,
  nowMs: number,
): boolean {
  if (
    !pharmacy.manual_access_enabled
  ) {
    return false;
  }

  if (
    !pharmacy.manual_access_until
  ) {
    return false;
  }

  const untilMs =
    new Date(
      pharmacy.manual_access_until,
    ).getTime();

  if (!Number.isFinite(untilMs)) {
    return false;
  }

  return untilMs > nowMs;
}

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
    percent_used: percentUsed,
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

function buildEmptyManualAccess() {
  return {
    enabled: false,
    valid: false,
    until: null,
    reason: null,
    granted_by: null,
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
    full_name: profile.full_name,
    phone: profile.phone,
    role: profile.role,
    language: locale,
    pharmacy_id: pharmacyId,
  };
}

function buildManualAccessResponse(
  pharmacy: PharmacyRow,
  nowMs: number,
) {
  const enabled =
    Boolean(
      pharmacy.manual_access_enabled,
    );

  const valid =
    hasValidManualAccess(
      pharmacy,
      nowMs,
    );

  const remaining =
    valid &&
    pharmacy.manual_access_until
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

    reason:
      pharmacy.manual_access_reason ??
      null,

    granted_by:
      pharmacy.manual_access_by ??
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

function buildPharmacyResponse(
  pharmacy: PharmacyRow,
  nowMs: number,
) {
  return {
    id: pharmacy.id,
    name: pharmacy.name,
    address: pharmacy.address,
    country_code: pharmacy.country_code,
    city: pharmacy.city,
    currency_code:
      normalizeCurrency(
        pharmacy.currency_code,
      ),
    owner_id: pharmacy.owner_id,
    status: pharmacy.status,

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
    const supabase =
      await createClient();

    /* ======================================================================
       1. UTILISATEUR CONNECTÉ
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
       2. PROFIL
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
        .eq("id", user.id)
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
       3. DATE SERVEUR
       ====================================================================== */

    const now =
      new Date();

    const nowMs =
      now.getTime();

    const serverTime =
      now.toISOString();

    /* ======================================================================
       4. LANGUE
       ====================================================================== */

    const locale =
      normalizeLanguage(
        typedProfile.language,
      );

    /* ======================================================================
       5. PHARMACIE
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
            manual_access_until,
            manual_access_reason,
            manual_access_by
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
       6. PHARMACIE INACTIVE / SUSPENDUE
       ====================================================================== */

    /*
     * L'accès manuel ne permet pas de contourner une suspension
     * administrative de la pharmacie.
     */

    if (
      !isPharmacyActive(
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
       7. ABONNEMENT
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
       8. PLANS MENSUEL ET ANNUEL
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
       9. PRIX
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
       10. PRIX MENSUEL / ANNUEL
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
       11. VALIDATION DES PRIX
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

    /* ======================================================================
       12. RÉPONSE DES PRIX
       ====================================================================== */

    const pricesResponse = {
      currency_code:
        pharmacyCurrency,

      /*
       * Au moins un tarif valide suffit pour rendre les prix disponibles.
       */
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
       13. AUCUN ABONNEMENT
       ====================================================================== */

    if (!subscription) {
      /*
       * Même sans abonnement, le Super Admin peut avoir accordé
       * un accès temporaire.
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
       14. PLAN ACTUEL
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
       15. STATUT
       ====================================================================== */

    const status =
      normalizeSubscriptionStatus(
        subscription.status,
      );

    /* ======================================================================
       16. TEMPS RESTANT
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
       17. VALIDATION DES DATES DU TRIAL
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

    /* ======================================================================
       18. TRIAL
       ====================================================================== */

    const trialStillValid =
      status === "trial" &&
      trialDatesValid &&
      nowMs <
        trialEndsMs;

    /* ======================================================================
       19. ABONNEMENT PAYÉ
       ====================================================================== */

    /*
     * Dans ton schéma actuel, le statut payé valide est "active".
     *
     * L'abonnement doit également avoir une date d'expiration
     * située dans le futur.
     */
    const paidSubscriptionStillValid =
      status === "active" &&
      Boolean(
        subscription.expires_at,
      ) &&
      expiration.remaining_ms >
        0;

    /* ======================================================================
       20. ACCÈS MANUEL
       ====================================================================== */

    const manualAccessValid =
      hasValidManualAccess(
        typedPharmacy,
        nowMs,
      );

    /* ======================================================================
       21. DÉCISION FINALE D'ACCÈS
       ====================================================================== */

    let allowed = false;

    let blocked = true;

    let reason: AccessReason =
      "expired";

    /*
     * PRIORITÉ 1 :
     * Trial encore valide.
     */
    if (
      trialStillValid
    ) {
      allowed = true;
      blocked = false;
      reason = "trial";
    }

    /*
     * PRIORITÉ 2 :
     * Abonnement payé encore valide.
     */
    else if (
      paidSubscriptionStillValid
    ) {
      allowed = true;
      blocked = false;
      reason = "active";
    }

    /*
     * PRIORITÉ 3 :
     * Accès manuel accordé par le Super Admin.
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
     * Accès manuel activé mais date dépassée.
     */
    else if (
      typedPharmacy.manual_access_enabled
    ) {
      allowed = false;
      blocked = true;
      reason =
        "manual_access_expired";
    }

    /*
     * Paiement en retard.
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
     * Abonnement suspendu.
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
     * Abonnement annulé.
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
     * Expiration normale.
     */
    else {
      allowed = false;
      blocked = true;
      reason =
        "expired";
    }

    /* ======================================================================
       22. POURCENTAGE DU TRIAL
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
       23. RÉPONSE TRIAL
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
       24. EXPIRATION
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
       25. RÉPONSE FINALE
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