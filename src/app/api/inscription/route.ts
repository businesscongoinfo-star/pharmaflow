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

export async function POST(
  request: NextRequest,
) {
  /*
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

  /*
   * ==========================================================
   * 2. RÉCUPÉRATION DES CHAMPS
   * ==========================================================
   */

  const pharmacyName = normalizeText(
    body.pharmacyName,
  );

  const address = normalizeText(
    body.address,
  );

  const countryCode =
    normalizeCountryCode(
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

  /*
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

  /*
   * ==========================================================
   * 4. DEVISE DE LA PHARMACIE
   * ==========================================================
   */

  const currencyCode =
    getCurrencyForCountry(
      countryCode,
    );

  /*
   * ==========================================================
   * 5. CLIENT ADMIN SUPABASE
   * ==========================================================
   *
   * Ce client reste exclusivement côté serveur.
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

  /*
   * ==========================================================
   * 6. CRÉATION DU COMPTE AUTH
   * ==========================================================
   *
   * Nous laissons Supabase gérer les éventuels doublons
   * d'adresse e-mail.
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
         * La vérification e-mail pourra être ajoutée plus tard
         * si nous décidons de l'activer.
         */
        email_confirm: true,

        user_metadata: {
          full_name: fullName,
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

  /*
   * ==========================================================
   * 7. CRÉATION DE LA PHARMACIE + PROFIL + TRIAL
   * ==========================================================
   */

  try {
    /*
     * ========================================================
     * 7.1 CRÉATION DE LA PHARMACIE
     * ========================================================
     */

    const {
      data: pharmacyData,
      error: pharmacyError,
    } =
      await supabaseAdmin
        .from("pharmacies")
        .insert({
          name: pharmacyName,

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

    /*
     * ========================================================
     * 7.2 CRÉATION DU PROFIL
     * ========================================================
     *
     * profiles.language = langue personnelle du compte.
     */

    const {
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,

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

    /*
     * ========================================================
     * 7.3 RECHERCHE DU FORFAIT GRATUIT
     * ========================================================
     *
     * IMPORTANT :
     *
     * Ta vraie table subscription_plans utilise :
     *
     * name
     * code
     * duration_days
     * price
     * currency_code
     * is_active
     *
     * Il n'y a PAS :
     *
     * plan_name
     * plan_code
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

    /*
     * ========================================================
     * 7.4 VÉRIFICATION DE LA DURÉE
     * ========================================================
     *
     * La base doit normalement contenir :
     *
     * duration_days = 7
     *
     * Si la valeur est incorrecte, nous refusons de créer
     * l'essai plutôt que d'accorder une mauvaise durée.
     */

    const trialDurationDays =
      Number(
        trialPlan.duration_days,
      );

    if (
      !Number.isFinite(
        trialDurationDays,
      ) ||
      trialDurationDays <= 0
    ) {
      console.error(
        "REGISTER INVALID TRIAL DURATION:",
        trialPlan.duration_days,
      );

      throw new Error(
        "INVALID_TRIAL_DURATION",
      );
    }

    /*
     * ========================================================
     * 7.5 CALCUL DES DATES
     * ========================================================
     */

    const trialStartedAt =
      new Date();

    const trialEndsAt =
      new Date(
        trialStartedAt.getTime() +
          trialDurationDays *
            24 *
            60 *
            60 *
            1000,
      );

    /*
     * ========================================================
     * 7.6 CRÉATION DE L'ABONNEMENT TRIAL
     * ========================================================
     *
     * status:
     *   trial
     *
     * trial_started_at:
     *   maintenant
     *
     * trial_ends_at:
     *   maintenant + 7 jours
     *
     * expires_at:
     *   même date que trial_ends_at
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

    /*
     * ========================================================
     * 7.7 RÉPONSE DE SUCCÈS
     * ========================================================
     */

    return NextResponse.json(
      {
        success: true,

        message:
          "Votre pharmacie a été créée avec succès. Votre essai gratuit est actif.",

        user: {
          id: userId,

          email,

          full_name:
            fullName,

          phone,

          language,
        },

        pharmacy: {
          id: pharmacyId,

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
            trialDurationDays,

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
    /*
     * ==========================================================
     * 8. NETTOYAGE EN CAS D'ÉCHEC
     * ==========================================================
     */

    console.error(
      "REGISTER TRANSACTION:",
      error,
    );

    /*
     * Suppression de l'abonnement si créé.
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

    /*
     * Suppression du profil si créé.
     */

    if (profileCreated) {
      const {
        error:
          deleteProfileError,
      } =
        await supabaseAdmin
          .from("profiles")
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

    /*
     * Suppression de la pharmacie si créée.
     */

    if (pharmacyId) {
      const {
        error:
          deletePharmacyError,
      } =
        await supabaseAdmin
          .from("pharmacies")
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

    /*
     * Suppression du compte Auth.
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

    /*
     * Message générique côté navigateur.
     *
     * Les détails techniques restent dans le terminal
     * du serveur et ne sont pas exposés à l'utilisateur.
     */

    return errorResponse(
      "Impossible de terminer la création de votre pharmacie. Aucun abonnement n'a été activé.",
      500,
    );
  }
}