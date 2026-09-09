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
};

type PlanRow = {
  id: string;
  name: string | null;
  code: string | null;
  duration_days: number | null;
  price: number | null;
  currency_code: string | null;
  is_active: boolean | null;
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
  | "expired"
  | "past_due"
  | "suspended"
  | "cancelled"
  | "no_subscription"
  | "pharmacy_inactive";

type TimeRemaining = {
  remaining_ms: number;
  remaining_seconds: number;
  remaining_minutes: number;
  remaining_hours: number;
  remaining_days: number;
};

function normalizeLanguage(
  value: string | null | undefined,
): Locale {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "en"
    ? "en"
    : "fr";
}

function normalizeSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    status === "trial" ||
    status === "active" ||
    status === "expired" ||
    status === "past_due" ||
    status === "suspended" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "expired";
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

  const targetMs = new Date(targetDate).getTime();

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

  const remainingSeconds = Math.floor(
    remainingMs / 1000,
  );

  const remainingMinutes = Math.floor(
    remainingSeconds / 60,
  );

  const remainingHours = Math.floor(
    remainingMinutes / 60,
  );

  const remainingDays = Math.floor(
    remainingHours / 24,
  );

  return {
    remaining_ms: remainingMs,
    remaining_seconds: remainingSeconds,
    remaining_minutes: remainingMinutes,
    remaining_hours: remainingHours,
    remaining_days: remainingDays,
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

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endsAt).getTime();

  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    endMs <= startMs
  ) {
    return 0;
  }

  const total = endMs - startMs;

  const elapsed = Math.min(
    Math.max(nowMs - startMs, 0),
    total,
  );

  return Math.min(
    Math.max(
      Math.round((elapsed / total) * 100),
      0,
    ),
    100,
  );
}

function isPharmacyActive(
  status: string | null,
): boolean {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

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

export async function GET() {
  try {
    const supabase = await createClient();

    // ============================================================
    // 1. UTILISATEUR CONNECTÉ
    // ============================================================

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

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

    const user = authData.user;

    if (!user) {
      return createError(
        "Vous devez être connecté.",
        401,
      );
    }

    // ============================================================
    // 2. PROFIL UTILISATEUR
    // ============================================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "id, full_name, phone, role, pharmacy_id, language",
      )
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

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

    if (!profile.pharmacy_id) {
      return createError(
        "Aucune pharmacie n'est associée à votre compte.",
        400,
      );
    }

    const pharmacyId = profile.pharmacy_id;

    // ============================================================
    // 3. LANGUE
    // ============================================================

    const locale = normalizeLanguage(
      profile.language,
    );

    // ============================================================
    // 4. PHARMACIE
    // ============================================================

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabase
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
          status
        `,
      )
      .eq("id", pharmacyId)
      .maybeSingle<PharmacyRow>();

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

    // ============================================================
    // 5. VÉRIFIER LE STATUT DE LA PHARMACIE
    // ============================================================

    if (!isPharmacyActive(pharmacy.status)) {
      const serverTime =
        new Date().toISOString();

      return NextResponse.json({
        success: true,
        authenticated: true,

        access: {
          allowed: false,
          blocked: true,
          reason: "pharmacy_inactive" as AccessReason,
        },

        status:
          "suspended" as SubscriptionStatus,

        locale,

        user: {
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          role: profile.role,
          language: locale,
          pharmacy_id: pharmacyId,
        },

        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
          address: pharmacy.address,
          country_code:
            pharmacy.country_code,
          city: pharmacy.city,
          currency_code:
            pharmacy.currency_code,
          owner_id: pharmacy.owner_id,
          status: pharmacy.status,
        },

        subscription: null,

        plan: null,

        trial: buildEmptyTrial(100),

        expiration:
          buildEmptyExpiration(),

        server_time: serverTime,
      });
    }

    // ============================================================
    // 6. RÉCUPÉRER LES ABONNEMENTS
    // ============================================================
    //
    // IMPORTANT :
    //
    // Nous n'utilisons PAS maybeSingle() ici.
    //
    // Pourquoi ?
    //
    // Si plusieurs abonnements existent accidentellement pour
    // une même pharmacie, maybeSingle() provoque une erreur
    // "multiple rows returned".
    //
    // Nous récupérons donc une liste triée par création,
    // puis nous prenons le plus récent.
    // ============================================================

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
      .eq(
        "pharmacy_id",
        pharmacyId,
      )
      .order("created_at", {
        ascending: false,
      })
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

    // ============================================================
    // 7. PRENDRE L'ABONNEMENT LE PLUS RÉCENT
    // ============================================================

    const subscriptions =
      (subscriptionRows ??
        []) as SubscriptionRow[];

    const subscription =
      subscriptions.length > 0
        ? subscriptions[0]
        : null;

    // ============================================================
    // 8. AUCUN ABONNEMENT
    // ============================================================

    if (!subscription) {
      const serverTime =
        new Date().toISOString();

      return NextResponse.json({
        success: true,
        authenticated: true,

        access: {
          allowed: false,
          blocked: true,
          reason:
            "no_subscription" as AccessReason,
        },

        status:
          "expired" as SubscriptionStatus,

        locale,

        user: {
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          role: profile.role,
          language: locale,
          pharmacy_id: pharmacyId,
        },

        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
          address: pharmacy.address,
          country_code:
            pharmacy.country_code,
          city: pharmacy.city,
          currency_code:
            pharmacy.currency_code,
          owner_id: pharmacy.owner_id,
          status: pharmacy.status,
        },

        subscription: null,

        plan: null,

        trial: buildEmptyTrial(100),

        expiration:
          buildEmptyExpiration(),

        server_time: serverTime,
      });
    }

    // ============================================================
    // 9. DATE SERVEUR
    // ============================================================
    //
    // Toutes les décisions de durée sont calculées avec l'heure
    // du serveur.
    //
    // Le navigateur ne peut pas prolonger l'essai en modifiant
    // son horloge.
    // ============================================================

    const now = new Date();
    const nowMs = now.getTime();
    const serverTime = now.toISOString();

    // ============================================================
    // 10. RÉCUPÉRER LE PLAN
    // ============================================================

    const {
      data: plan,
      error: planError,
    } = await supabase
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
        "id",
        subscription.plan_id,
      )
      .maybeSingle<PlanRow>();

    if (planError) {
      console.error(
        "PharmaFlow subscription status - plan:",
        planError,
      );

      /*
       * Nous ne bloquons pas l'accès simplement parce que
       * les informations descriptives du plan sont indisponibles.
       *
       * La décision d'accès repose sur la ligne subscription
       * et ses dates.
       */
    }

    // ============================================================
    // 11. NORMALISER LE STATUT
    // ============================================================

    const status =
      normalizeSubscriptionStatus(
        subscription.status,
      );

    // ============================================================
    // 12. CALCUL DU TEMPS RESTANT
    // ============================================================

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

    // ============================================================
    // 13. VALIDATION DES DATES DU TRIAL
    // ============================================================

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

    // ============================================================
    // 14. ESSAI GRATUIT ENCORE VALIDE
    // ============================================================
    //
    // C'est ici que nous garantissons :
    //
    // inscription aujourd'hui
    //        ↓
    // trial_started_at = aujourd'hui
    //        ↓
    // trial_ends_at = aujourd'hui + 7 jours
    //        ↓
    // accès autorisé immédiatement
    //
    // Le système ne se contente pas de regarder expires_at.
    // Il vérifie explicitement le trial.
    // ============================================================

    const trialStillValid =
      status === "trial" &&
      trialDatesValid &&
      nowMs <
        trialEndsMs;

    // ============================================================
    // 15. ABONNEMENT PAYÉ ENCORE VALIDE
    // ============================================================

    const paidSubscriptionStillValid =
      status === "active" &&
      Boolean(
        subscription.expires_at,
      ) &&
      expiration.remaining_ms >
        0;

    // ============================================================
    // 16. DÉCISION D'ACCÈS
    // ============================================================

    let allowed = false;

    let blocked = true;

    let reason: AccessReason =
      "expired";

    if (trialStillValid) {
      /*
       * 🟢 ESSAI GRATUIT
       */
      allowed = true;
      blocked = false;
      reason = "trial";
    } else if (
      paidSubscriptionStillValid
    ) {
      /*
       * 🟢 ABONNEMENT PAYÉ
       */
      allowed = true;
      blocked = false;
      reason = "active";
    } else if (
      status === "past_due"
    ) {
      /*
       * 🔴 PAIEMENT EN RETARD
       */
      allowed = false;
      blocked = true;
      reason = "past_due";
    } else if (
      status === "suspended"
    ) {
      /*
       * 🔴 SUSPENDU
       */
      allowed = false;
      blocked = true;
      reason = "suspended";
    } else if (
      status === "cancelled"
    ) {
      /*
       * 🔴 ANNULÉ
       */
      allowed = false;
      blocked = true;
      reason = "cancelled";
    } else {
      /*
       * 🔴 TRIAL OU FORFAIT EXPIRÉ
       */
      allowed = false;
      blocked = true;
      reason = "expired";
    }

    // ============================================================
    // 17. POURCENTAGE DU TRIAL
    // ============================================================

    let finalTrialPercent = 0;

    if (trialStillValid) {
      finalTrialPercent =
        trialPercent;
    } else if (
      status === "trial"
    ) {
      finalTrialPercent = 100;
    }

    // ============================================================
    // 18. TEMPS DE TRIAL EXPOSÉ
    // ============================================================

    const trialResponse = {
      active: trialStillValid,

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

    // ============================================================
    // 19. EXPIRATION
    // ============================================================

    const expirationResponse = {
      expired:
        !subscription.expires_at ||
        expiration.remaining_ms <= 0,

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
    // ============================================================
    // 20. RÉPONSE FINALE
    // ============================================================

    return NextResponse.json({
      success: true,
      authenticated: true,

      access: {
        allowed,
        blocked,
        reason,
      },

      status,

      locale,

      user: {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        role: profile.role,
        language: locale,
        pharmacy_id: pharmacyId,
      },

      pharmacy: {
        id: pharmacy.id,
        name: pharmacy.name,
        address: pharmacy.address,
        country_code:
          pharmacy.country_code,
        city: pharmacy.city,
        currency_code:
          pharmacy.currency_code,
        owner_id: pharmacy.owner_id,
        status: pharmacy.status,
      },

      subscription: {
        id: subscription.id,
        pharmacy_id:
          subscription.pharmacy_id,
        plan_id:
          subscription.plan_id,

        plan_code:
          plan?.code ?? null,

        plan_name:
          plan?.name ?? null,

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

      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            code: plan.code,
            duration_days:
              plan.duration_days,
            price: plan.price,
            currency_code:
              plan.currency_code,
            is_active:
              plan.is_active,
          }
        : null,

      trial: trialResponse,

      expiration:
        expirationResponse,

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