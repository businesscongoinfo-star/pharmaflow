import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "../../lib/supabase/admin";

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

function normalizeCountryCode(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeLanguage(
  value: unknown,
): Locale {
  return value === "en" ? "en" : "fr";
}

/**
 * ============================================================
 * DEVISE SELON LE PAYS
 * ============================================================
 */

function getCurrencyForCountry(
  countryCode: string,
): string {
  const currencies: Record<string, string> = {
    /*
     * Afrique centrale
     */
    CG: "XAF",
    CM: "XAF",
    GA: "XAF",
    TD: "XAF",
    CF: "XAF",
    GQ: "XAF",

    /*
     * République démocratique du Congo
     */
    CD: "CDF",

    /*
     * Afrique de l'Ouest
     */
    CI: "XOF",
    SN: "XOF",
    BJ: "XOF",
    TG: "XOF",
    BF: "XOF",
    ML: "XOF",
    NE: "XOF",

    /*
     * Guinée
     */
    GN: "GNF",

    /*
     * Afrique de l'Est
     */
    RW: "RWF",
    KE: "KES",
    TZ: "TZS",
    UG: "UGX",

    /*
     * Afrique australe
     */
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
 * INSCRIPTION
 * ============================================================
 */

export async function POST(
  request: NextRequest,
) {
  /**
   * ==========================================================
   * 1. LECTURE DES DONNÉES
   * ==========================================================
   */

  let body: Record<string, unknown>;

  try {
    body =
      (await request.json()) as Record<
        string,
        unknown
      >;
  } catch (error) {
    console.error(
      "REGISTER JSON:",
      error,
    );

    return errorResponse(
      "Les données envoyées sont invalides.",
      400,
    );
  }

  /**
   * ==========================================================
   * 2. RÉCUPÉRATION DES CHAMPS
   * ==========================================================
   */

  const pharmacyName =
    normalizeText(
      body.pharmacyName,
    );

  const address =
    normalizeText(
      body.address,
    );

  const countryCode =
    normalizeCountryCode(
      body.countryCode,
    );

  const city =
    normalizeText(
      body.city,
    );

  const fullName =
    normalizeText(
      body.fullName,
    );

  const phone =
    normalizeText(
      body.phone,
    );

  const email =
    normalizeEmail(
      body.email,
    );

  const password =
    String(
      body.password ?? "",
    );

  const language =
    normalizeLanguage(
      body.language,
    );

  /**
   * ==========================================================
   * 3. VALIDATION DES CHAMPS
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
   * 4. DEVISE DE LA PHARMACIE
   * ==========================================================
   */

  const currencyCode =
    getCurrencyForCountry(
      countryCode,
    );

  /**
   * ==========================================================
   * 5. CLIENT ADMIN SUPABASE
   * ==========================================================
   *
   * Le client Admin Supabase est utilisé uniquement côté
   * serveur.
   */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "REGISTER ADMIN CLIENT:",
      error,
    );

    return errorResponse(
      "La configuration sécurisée du serveur est incomplète.",
      500,
    );
  }

  /**
   * ==========================================================
   * 6. CRÉATION DU COMPTE AUTH
   * ==========================================================
   */

  const {
    data: authData,
    error: authError,
  } =
    await supabaseAdmin.auth.admin.createUser(
      {
        email,
        password,

        /*
         * Le compte peut se connecter immédiatement.
         */
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

  if (
    authError ||
    !authData.user
  ) {
    console.error(
      "REGISTER AUTH:",
      authError,
    );

    const message =
      authError?.message ??
      "Impossible de créer votre compte.";

    return errorResponse(
      message,
      400,
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

  let profileCreated =
    false;

  /**
   * ==========================================================
   * 7. CRÉATION PHARMACIE + PROFIL + TRIAL
   * ==========================================================
   */

  try {
    /**
     * ========================================================
     * 7.1 CRÉATION DE LA PHARMACIE
     * ========================================================
     */

    const {
      data: pharmacyData,
      error: pharmacyError,
    } =
      await supabaseAdmin
        .from(
          "pharmacies",
        )
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
        .select(
          "id",
        )
        .single();

    if (
      pharmacyError ||
      !pharmacyData
    ) {
      console.error(
        "REGISTER PHARMACY:",
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
     * 7.2 CRÉATION DU PROFIL
     * ========================================================
     */

    const {
      error: profileError,
    } =
      await supabaseAdmin
        .from(
          "profiles",
        )
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
        "REGISTER PROFILE:",
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
     * 7.3 RECHERCHE DU PLAN TRIAL
     * ========================================================
     *
     * Structure réelle de subscription_plans :
     *
     * id
     * name
     * code
     * duration_days
     * price
     * currency_code
     * is_active
     */

    const {
      data: trialPlanData,
      error: trialPlanError,
    } =
      await supabaseAdmin
        .from(
          "subscription_plans",
        )
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
        "REGISTER TRIAL PLAN:",
        trialPlanError,
      );

      throw new Error(
        "TRIAL_PLAN_LOOKUP_FAILED",
      );
    }

    if (!trialPlanData) {
      console.error(
        "REGISTER TRIAL PLAN: aucun plan trial actif.",
      );

      throw new Error(
        "TRIAL_PLAN_NOT_FOUND",
      );
    }

    const trialPlan =
      trialPlanData as SubscriptionPlan;

    /**
     * ========================================================
     * 7.4 VÉRIFICATION DU TRIAL
     * ========================================================
     *
     * PharmaFlow doit fournir exactement 7 jours gratuits.
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
        "REGISTER INVALID TRIAL DURATION:",
        trialPlan.duration_days,
      );

      throw new Error(
        "INVALID_TRIAL_DURATION",
      );
    }

    /**
     * ========================================================
     * 7.5 CALCUL DES DATES DU TRIAL
     * ========================================================
     *
     * Début :
     *   maintenant
     *
     * Fin :
     *   maintenant + 7 jours
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
     * 7.6 CRÉATION DE L'ABONNEMENT TRIAL
     * ========================================================
     *
     * status :
     *   trial
     *
     * trial_started_at :
     *   maintenant
     *
     * trial_ends_at :
     *   maintenant + 7 jours
     *
     * expires_at :
     *   fin du trial
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
        "REGISTER SUBSCRIPTION:",
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
     * 7.7 RÉPONSE DE SUCCÈS
     * ========================================================
     */

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
     * 8. NETTOYAGE EN CAS D'ÉCHEC
     * ==========================================================
     */

    console.error(
      "REGISTER TRANSACTION:",
      error,
    );

    /**
     * ----------------------------------------------------------
     * 8.1 SUPPRESSION DE L'ABONNEMENT
     * ----------------------------------------------------------
     */

    if (subscriptionId) {
      const {
        error:
          deleteSubscriptionError,
      } =
        await supabaseAdmin
          .from(
            "subscriptions",
          )
          .delete()
          .eq(
            "id",
            subscriptionId,
          );

      if (
        deleteSubscriptionError
      ) {
        console.error(
          "REGISTER CLEANUP SUBSCRIPTION:",
          deleteSubscriptionError,
        );
      }
    }

    /**
     * ----------------------------------------------------------
     * 8.2 SUPPRESSION DU PROFIL
     * ----------------------------------------------------------
     */

    if (profileCreated) {
      const {
        error:
          deleteProfileError,
      } =
        await supabaseAdmin
          .from(
            "profiles",
          )
          .delete()
          .eq(
            "id",
            userId,
          );

      if (
        deleteProfileError
      ) {
        console.error(
          "REGISTER CLEANUP PROFILE:",
          deleteProfileError,
        );
      }
    }

    /**
     * ----------------------------------------------------------
     * 8.3 SUPPRESSION DE LA PHARMACIE
     * ----------------------------------------------------------
     */

    if (pharmacyId) {
      const {
        error:
          deletePharmacyError,
      } =
        await supabaseAdmin
          .from(
            "pharmacies",
          )
          .delete()
          .eq(
            "id",
            pharmacyId,
          );

      if (
        deletePharmacyError
      ) {
        console.error(
          "REGISTER CLEANUP PHARMACY:",
          deletePharmacyError,
        );
      }
    }

    /**
     * ----------------------------------------------------------
     * 8.4 SUPPRESSION DU COMPTE AUTH
     * ----------------------------------------------------------
     */

    const {
      error:
        deleteAuthError,
    } =
      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

    if (deleteAuthError) {
      console.error(
        "REGISTER CLEANUP AUTH:",
        deleteAuthError,
      );
    }

    /**
     * ----------------------------------------------------------
     * 8.5 MESSAGE UTILISATEUR
     * ----------------------------------------------------------
     *
     * Les détails techniques restent côté serveur.
     */

    return errorResponse(
      "Impossible de terminer la création de votre pharmacie. Aucun abonnement n'a été activé.",
      500,
    );
  }
}