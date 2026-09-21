import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Locale = "fr" | "en";

type SubscriptionPlan = {
  id: string;
  name: string;
  code: string;
  duration_days: number;
  price: number;
  currency_code: string;
  is_active: boolean;
};

/**
 * ============================================================
 * PHARMAFLOW — INSCRIPTION
 * ============================================================
 *
 * Flux :
 *
 * 1. Validation des données
 * 2. Création du compte Supabase Auth
 * 3. Création de la pharmacie
 * 4. Création du profil propriétaire
 * 5. Recherche du plan Trial
 * 6. Création de l'abonnement Trial
 * 7. Nettoyage automatique en cas d'échec
 *
 * IMPORTANT :
 * - Cette route est strictement serveur.
 * - SUPABASE_SECRET_KEY n'est jamais envoyée au navigateur.
 * ============================================================
 */

/**
 * ============================================================
 * NORMALISATION
 * ============================================================
 */

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeCountryCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeLanguage(value: unknown): Locale {
  return value === "en" ? "en" : "fr";
}

/**
 * ============================================================
 * DEVISE
 * ============================================================
 */

function getCurrencyForCountry(
  countryCode: string,
): string {
  const currencies: Record<string, string> = {
    // CEMAC
    CG: "XAF",
    CM: "XAF",
    GA: "XAF",
    TD: "XAF",
    CF: "XAF",
    GQ: "XAF",

    // RDC
    CD: "CDF",

    // UEMOA
    CI: "XOF",
    SN: "XOF",
    BJ: "XOF",
    TG: "XOF",
    BF: "XOF",
    ML: "XOF",
    NE: "XOF",

    // Guinée
    GN: "GNF",

    // Afrique de l'Est
    RW: "RWF",
    KE: "KES",
    TZ: "TZS",
    UG: "UGX",

    // Afrique australe
    ZA: "ZAR",
  };

  return currencies[countryCode] ?? "USD";
}

/**
 * ============================================================
 * RÉPONSE D'ERREUR
 * ============================================================
 */

function errorResponse(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    },
  );
}

/**
 * ============================================================
 * POST /api/inscription
 * ============================================================
 */

export async function POST(
  request: NextRequest,
) {
  /**
   * ==========================================================
   * 1. LECTURE DU BODY
   * ==========================================================
   */

  let body: Record<string, unknown>;

  try {
    const parsed = await request.json();

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return errorResponse(
        "Les données envoyées sont invalides.",
        400,
      );
    }

    body = parsed as Record<string, unknown>;
  } catch (error) {
    console.error(
      "[PHARMAFLOW REGISTER] JSON_ERROR:",
      error,
    );

    return errorResponse(
      "Les données envoyées sont invalides.",
      400,
    );
  }

  /**
   * ==========================================================
   * 2. RÉCUPÉRATION DES DONNÉES
   * ==========================================================
   */

  const pharmacyName = normalizeText(
    body.pharmacyName,
  );

  const address = normalizeText(
    body.address,
  );

  const countryCode = normalizeCountryCode(
    body.countryCode,
  );

  const city = normalizeText(
    body.city,
  );

  const fullName = normalizeText(
    body.fullName,
  );

  const phone = normalizeText(
    body.phone,
  );

  const email = normalizeEmail(
    body.email,
  );

  const password = String(
    body.password ?? "",
  );

  const language = normalizeLanguage(
    body.language,
  );

  /**
   * ==========================================================
   * 3. VALIDATION
   * ==========================================================
   */

  if (
    !pharmacyName ||
    !address ||
    !countryCode ||
    !city ||
    !fullName ||
    !phone ||
    !email ||
    !password
  ) {
    return errorResponse(
      "Veuillez remplir tous les champs obligatoires.",
      400,
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    return errorResponse(
      "Veuillez saisir une adresse e-mail valide.",
      400,
    );
  }

  if (password.length < 8) {
    return errorResponse(
      "Le mot de passe doit contenir au moins 8 caractères.",
      400,
    );
  }

  /**
   * ==========================================================
   * 4. DEVISE
   * ==========================================================
   */

  const currencyCode =
    getCurrencyForCountry(
      countryCode,
    );

  /**
   * ==========================================================
   * 5. CLIENT ADMIN
   * ==========================================================
   */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "[PHARMAFLOW REGISTER] ADMIN_CLIENT_ERROR:",
      error,
    );

    return errorResponse(
      "Le serveur PharmaFlow n'est pas correctement configuré. Veuillez réessayer plus tard.",
      500,
    );
  }

  /**
   * ==========================================================
   * 6. CRÉATION AUTH
   * ==========================================================
   */

  let authData;

  try {
    const result =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,
          password,

          email_confirm: true,

          user_metadata: {
            full_name:
              fullName,

            phone,

            pharmacy_name:
              pharmacyName,

            country_code:
              countryCode,

            city,

            language,
          },
        },
      );

    if (result.error) {
      console.error(
        "[PHARMAFLOW REGISTER] AUTH_CREATE_ERROR:",
        {
          message:
            result.error.message,
          status:
            result.error.status,
          code:
            result.error.code,
        },
      );

      /**
       * E-mail déjà utilisé
       */
      const normalizedAuthMessage =
        result.error.message
          ?.toLowerCase()
          .trim();

      if (
        normalizedAuthMessage?.includes(
          "already registered",
        ) ||
        normalizedAuthMessage?.includes(
          "already exists",
        ) ||
        normalizedAuthMessage?.includes(
          "already been registered",
        )
      ) {
        return errorResponse(
          "Cette adresse e-mail est déjà utilisée. Connectez-vous ou utilisez une autre adresse.",
          409,
        );
      }

      return errorResponse(
        "Impossible de créer votre compte. Vérifiez vos informations puis réessayez.",
        400,
      );
    }

    if (!result.data.user) {
      console.error(
        "[PHARMAFLOW REGISTER] AUTH_USER_MISSING",
      );

      return errorResponse(
        "Le compte utilisateur n'a pas pu être créé.",
        500,
      );
    }

    authData =
      result.data;
  } catch (error) {
    console.error(
      "[PHARMAFLOW REGISTER] AUTH_EXCEPTION:",
      error,
    );

    return errorResponse(
      "Une erreur est survenue lors de la création du compte.",
      500,
    );
  }

  const userId =
    authData.user.id;

  let pharmacyId:
    | string
    | null = null;

  let subscriptionId:
    | string
    | null = null;

  let profileCreated = false;

  /**
   * ==========================================================
   * 7. PHARMACIE
   * ==========================================================
   */

  try {
    const {
      data: pharmacyData,
      error: pharmacyError,
    } =
      await supabaseAdmin
        .from("pharmacies")
        .insert({
          name:
            pharmacyName,

          address,

          country_code:
            countryCode,

          city,

          currency_code:
            currencyCode,

          owner_id:
            userId,

          status:
            "active",
        })
        .select("id")
        .single();

    if (
      pharmacyError ||
      !pharmacyData
    ) {
      console.error(
        "[PHARMAFLOW REGISTER] PHARMACY_ERROR:",
        pharmacyError,
      );

      throw new Error(
        "PHARMACY_CREATION_FAILED",
      );
    }

    pharmacyId =
      pharmacyData.id;

    /**
     * ========================================================
     * 8. PROFIL
     * ========================================================
     */

    const {
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id:
              userId,

            full_name:
              fullName,

            phone,

            role:
              "owner",

            pharmacy_id:
              pharmacyId,

            language,
          },
          {
            onConflict:
              "id",
          },
        );

    if (profileError) {
      console.error(
        "[PHARMAFLOW REGISTER] PROFILE_ERROR:",
        profileError,
      );

      throw new Error(
        "PROFILE_CREATION_FAILED",
      );
    }

    profileCreated =
      true;

    /**
     * ========================================================
     * 9. PLAN TRIAL
     * ========================================================
     */

    const {
      data: trialPlanData,
      error: trialPlanError,
    } =
      await supabaseAdmin
        .from("subscription_plans")
        .select(
          "id, name, code, duration_days, price, currency_code, is_active",
        )
        .eq(
          "code",
          "trial",
        )
        .eq(
          "is_active",
          true,
        )
        .maybeSingle();

    if (trialPlanError) {
      console.error(
        "[PHARMAFLOW REGISTER] TRIAL_PLAN_ERROR:",
        trialPlanError,
      );

      throw new Error(
        "TRIAL_PLAN_LOOKUP_FAILED",
      );
    }

    if (!trialPlanData) {
      console.error(
        "[PHARMAFLOW REGISTER] TRIAL_PLAN_NOT_FOUND",
      );

      throw new Error(
        "TRIAL_PLAN_NOT_FOUND",
      );
    }

    const trialPlan =
      trialPlanData as SubscriptionPlan;

    /**
     * ========================================================
     * 10. VÉRIFICATION DU TRIAL
     * ========================================================
     */

    const trialDurationDays =
      Number(
        trialPlan.duration_days,
      );

    if (
      !Number.isFinite(
        trialDurationDays,
      ) ||
      trialDurationDays !== 7
    ) {
      console.error(
        "[PHARMAFLOW REGISTER] INVALID_TRIAL_DURATION:",
        trialPlan.duration_days,
      );

      throw new Error(
        "INVALID_TRIAL_DURATION",
      );
    }

    /**
     * ========================================================
     * 11. DATES DU TRIAL
     * ========================================================
     */

    const trialStartedAt =
      new Date();

    const trialEndsAt =
      new Date(
        trialStartedAt.getTime() +
          7 *
            24 *
            60 *
            60 *
            1000,
      );

    /**
     * ========================================================
     * 12. ABONNEMENT
     * ========================================================
     */

    const {
      data: subscriptionData,
      error: subscriptionError,
    } =
      await supabaseAdmin
        .from("subscriptions")
        .insert({
          pharmacy_id:
            pharmacyId,

          plan_id:
            trialPlan.id,

          status:
            "trial",

          trial_started_at:
            trialStartedAt.toISOString(),

          trial_ends_at:
            trialEndsAt.toISOString(),

          expires_at:
            trialEndsAt.toISOString(),
        })
        .select(
          `
            id,
            pharmacy_id,
            plan_id,
            status,
            trial_started_at,
            trial_ends_at,
            expires_at
          `,
        )
        .single();

    if (
      subscriptionError ||
      !subscriptionData
    ) {
      console.error(
        "[PHARMAFLOW REGISTER] SUBSCRIPTION_ERROR:",
        subscriptionError,
      );

      throw new Error(
        "TRIAL_SUBSCRIPTION_CREATION_FAILED",
      );
    }

    subscriptionId =
      subscriptionData.id;

    /**
     * ========================================================
     * 13. SUCCÈS
     * ========================================================
     */

    console.log(
      "[PHARMAFLOW REGISTER] SUCCESS:",
      {
        userId,
        pharmacyId,
        subscriptionId,
        email,
      },
    );

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Votre pharmacie a été créée avec succès. Votre essai gratuit de 7 jours est actif.",

        user: {
          id:
            userId,

          email,

          full_name:
            fullName,

          phone,

          language,
        },

        pharmacy: {
          id:
            pharmacyId,

          name:
            pharmacyName,

          country_code:
            countryCode,

          city,

          currency_code:
            currencyCode,
        },

        trial: {
          subscription_id:
            subscriptionId,

          status:
            "trial",

          plan_id:
            trialPlan.id,

          plan_code:
            trialPlan.code,

          plan_name:
            trialPlan.name,

          duration_days:
            7,

          trial_started_at:
            trialStartedAt.toISOString(),

          trial_ends_at:
            trialEndsAt.toISOString(),

          expires_at:
            trialEndsAt.toISOString(),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    /**
     * ==========================================================
     * 14. ERREUR GLOBALE
     * ==========================================================
     */

    console.error(
      "[PHARMAFLOW REGISTER] TRANSACTION_ERROR:",
      error,
    );

    /**
     * ==========================================================
     * 15. NETTOYAGE ABONNEMENT
     * ==========================================================
     */

    if (subscriptionId) {
      const {
        error:
          cleanupSubscriptionError,
      } =
        await supabaseAdmin
          .from("subscriptions")
          .delete()
          .eq(
            "id",
            subscriptionId,
          );

      if (
        cleanupSubscriptionError
      ) {
        console.error(
          "[PHARMAFLOW CLEANUP] SUBSCRIPTION:",
          cleanupSubscriptionError,
        );
      }
    }

    /**
     * ==========================================================
     * 16. NETTOYAGE PROFIL
     * ==========================================================
     */

    if (profileCreated) {
      const {
        error:
          cleanupProfileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .delete()
          .eq(
            "id",
            userId,
          );

      if (
        cleanupProfileError
      ) {
        console.error(
          "[PHARMAFLOW CLEANUP] PROFILE:",
          cleanupProfileError,
        );
      }
    }

    /**
     * ==========================================================
     * 17. NETTOYAGE PHARMACIE
     * ==========================================================
     */

    if (pharmacyId) {
      const {
        error:
          cleanupPharmacyError,
      } =
        await supabaseAdmin
          .from("pharmacies")
          .delete()
          .eq(
            "id",
            pharmacyId,
          );

      if (
        cleanupPharmacyError
      ) {
        console.error(
          "[PHARMAFLOW CLEANUP] PHARMACY:",
          cleanupPharmacyError,
        );
      }
    }

    /**
     * ==========================================================
     * 18. NETTOYAGE AUTH
     * ==========================================================
     */

    const {
      error:
        cleanupAuthError,
    } =
      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

    if (cleanupAuthError) {
      console.error(
        "[PHARMAFLOW CLEANUP] AUTH:",
        cleanupAuthError,
      );
    }

    /**
     * ==========================================================
     * 19. RÉPONSE UTILISATEUR
     * ==========================================================
     */

    return errorResponse(
      "Impossible de terminer la création de votre pharmacie. Veuillez réessayer.",
      500,
    );
  }
}