import { NextResponse } from "next/server";

import {
  requireSuperAdminApi,
} from "@/app/lib/super-admin/auth";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

type CreatePharmacyBody = {
  pharmacyName?: unknown;
  countryCode?: unknown;
  city?: unknown;
  address?: unknown;
  fullName?: unknown;
  phone?: unknown;
  email?: unknown;
  password?: unknown;
  currencyCode?: unknown;
  language?: unknown;
  status?: unknown;
  manualAccessEnabled?: unknown;
  manualAccessUntil?: unknown;
};

type TrialPlan = {
  id: string;
  name: string;
  code: string;
  duration_days: number;
  price: number;
  currency_code: string;
  is_active: boolean;
};

const ALLOWED_STATUSES = [
  "active",
  "inactive",
  "suspended",
] as const;

type AllowedStatus =
  (typeof ALLOWED_STATUSES)[number];

function cleanString(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeEmail(
  value: unknown,
): string {
  return cleanString(
    value,
  ).toLowerCase();
}

function getCurrencyForCountry(
  countryCode: string,
): string {
  const currencies: Record<
    string,
    string
  > = {
    CG: "XAF",
    CM: "XAF",
    GA: "XAF",
    TD: "XAF",
    CF: "XAF",
    GQ: "XAF",

    CD: "CDF",

    CI: "XOF",
    SN: "XOF",
    BJ: "XOF",
    TG: "XOF",
    BF: "XOF",
    ML: "XOF",
    NE: "XOF",

    GN: "GNF",

    RW: "RWF",
    KE: "KES",
    TZ: "TZS",
    UG: "UGX",

    ZA: "ZAR",
  };

  return (
    currencies[countryCode] ||
    "USD"
  );
}

function errorResponse(
  error: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
    },
  );
}

/**
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Cette route accepte uniquement les requêtes POST.",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

/**
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: Request,
) {
  /**
   * ==========================================================
   * 1. VÉRIFICATION SUPER ADMIN
   * ==========================================================
   */

  try {
    const admin =
      await requireSuperAdminApi();

    if (!admin) {
      return errorResponse(
        "Accès non autorisé.",
        401,
      );
    }
  } catch (error) {
    console.error(
      "[CREATE PHARMACY] SUPER ADMIN ERROR:",
      error,
    );

    return errorResponse(
      "Vous n'êtes pas autorisé à créer une pharmacie.",
      403,
    );
  }

  /**
   * ==========================================================
   * 2. LECTURE DU BODY
   * ==========================================================
   */

  let body: CreatePharmacyBody;

  try {
    body =
      (await request.json()) as CreatePharmacyBody;
  } catch (error) {
    console.error(
      "[CREATE PHARMACY] BODY ERROR:",
      error,
    );

    return errorResponse(
      "Les données envoyées sont invalides.",
      400,
    );
  }

  /**
   * ==========================================================
   * 3. NORMALISATION
   * ==========================================================
   */

  const pharmacyName =
    cleanString(
      body.pharmacyName,
    );

  const countryCode =
    cleanString(
      body.countryCode,
    ).toUpperCase();

  const city =
    cleanString(
      body.city,
    );

  const address =
    cleanString(
      body.address,
    );

  const fullName =
    cleanString(
      body.fullName,
    );

  const phone =
    cleanString(
      body.phone,
    );

  const email =
    normalizeEmail(
      body.email,
    );

  const password =
    typeof body.password ===
    "string"
      ? body.password
      : "";

  const language =
    body.language === "en"
      ? "en"
      : "fr";

  const requestedCurrency =
    cleanString(
      body.currencyCode,
    ).toUpperCase();

  const currencyCode =
    requestedCurrency ||
    getCurrencyForCountry(
      countryCode,
    );

  const requestedStatus =
    cleanString(
      body.status,
    );

  const status: AllowedStatus =
    ALLOWED_STATUSES.includes(
      requestedStatus as AllowedStatus,
    )
      ? (requestedStatus as AllowedStatus)
      : "active";

  const manualAccessEnabled =
    body.manualAccessEnabled ===
    true;

  const manualAccessUntil =
    manualAccessEnabled
      ? cleanString(
          body.manualAccessUntil,
        )
      : "";

  /**
   * ==========================================================
   * 4. VALIDATION
   * ==========================================================
   */

  if (!pharmacyName) {
    return errorResponse(
      "Le nom de la pharmacie est obligatoire.",
    );
  }

  if (!countryCode) {
    return errorResponse(
      "Le pays est obligatoire.",
    );
  }

  if (!city) {
    return errorResponse(
      "La ville est obligatoire.",
    );
  }

  if (!address) {
    return errorResponse(
      "L'adresse est obligatoire.",
    );
  }

  if (!fullName) {
    return errorResponse(
      "Le nom du responsable est obligatoire.",
    );
  }

  if (!phone) {
    return errorResponse(
      "Le numéro de téléphone est obligatoire.",
    );
  }

  if (!email) {
    return errorResponse(
      "L'adresse e-mail est obligatoire.",
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    return errorResponse(
      "L'adresse e-mail est invalide.",
    );
  }

  if (
    password.length < 8
  ) {
    return errorResponse(
      "Le mot de passe doit contenir au moins 8 caractères.",
    );
  }

  if (
    manualAccessEnabled &&
    !manualAccessUntil
  ) {
    return errorResponse(
      "La date de fin de l'accès manuel est obligatoire.",
    );
  }

  let manualAccessUntilIso:
    | string
    | null = null;

  if (
    manualAccessEnabled &&
    manualAccessUntil
  ) {
    const date =
      new Date(
        manualAccessUntil,
      );

    if (
      !Number.isFinite(
        date.getTime(),
      )
    ) {
      return errorResponse(
        "La date d'accès manuel est invalide.",
      );
    }

    if (
      date.getTime() <=
      Date.now()
    ) {
      return errorResponse(
        "La date d'accès manuel doit être dans le futur.",
      );
    }

    manualAccessUntilIso =
      date.toISOString();
  }

  /**
   * ==========================================================
   * 5. CLIENT SUPABASE ADMIN
   * ==========================================================
   */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "[CREATE PHARMACY] ADMIN CLIENT ERROR:",
      error,
    );

    return errorResponse(
      "La configuration Supabase du serveur est incorrecte.",
      500,
    );
  }

  /**
   * ==========================================================
   * 6. VARIABLES DE ROLLBACK
   * ==========================================================
   */

  let userId:
    | string
    | null = null;

  let pharmacyId:
    | string
    | null = null;

  let subscriptionId:
    | string
    | null = null;

  /**
   * ==========================================================
   * 7. CRÉATION DU COMPTE AUTH
   * ==========================================================
   */

  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,

          password,

          email_confirm:
            true,

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

            created_by:
              "super_admin",

            must_change_password:
              true,
          },
        },
      );

    if (error) {
      console.error(
        "[CREATE PHARMACY] AUTH CREATE ERROR:",
        {
          message:
            error.message,

          status:
            error.status,

          code:
            error.code,
        },
      );

      const message =
        String(
          error.message ||
            "",
        ).toLowerCase();

      if (
        message.includes(
          "already registered",
        ) ||
        message.includes(
          "already exists",
        ) ||
        message.includes(
          "already been registered",
        ) ||
        message.includes(
          "user already",
        )
      ) {
        return errorResponse(
          "Cette adresse e-mail est déjà utilisée par un compte PharmaFlow.",
          409,
        );
      }

      return errorResponse(
        "Impossible de créer le compte du responsable.",
        400,
      );
    }

    if (!data.user) {
      return errorResponse(
        "Le compte du responsable n'a pas été créé.",
        500,
      );
    }

    userId =
      data.user.id;
  } catch (error) {
    console.error(
      "[CREATE PHARMACY] AUTH EXCEPTION:",
      error,
    );

    return errorResponse(
      "Une erreur est survenue lors de la création du compte responsable.",
      500,
    );
  }

  /**
   * ==========================================================
   * 8. CRÉATION PHARMACIE
   * ==========================================================
   */

  try {
    const {
      data,
      error,
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

          status,

          manual_access_enabled:
            manualAccessEnabled,

          manual_access_until:
            manualAccessUntilIso,
        })
        .select(
          "id",
        )
        .single();

    if (error) {
      console.error(
        "[CREATE PHARMACY] PHARMACY INSERT ERROR:",
        error,
      );

      throw new Error(
        error.message,
      );
    }

    if (!data?.id) {
      throw new Error(
        "PHARMACY_ID_NOT_RETURNED",
      );
    }

    pharmacyId =
      data.id;
  } catch (error) {
    console.error(
      "[CREATE PHARMACY] PHARMACY ERROR:",
      error,
    );

    if (userId) {
      const {
        error:
          cleanupError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          userId,
        );

      if (cleanupError) {
        console.error(
          "[CREATE PHARMACY] AUTH ROLLBACK ERROR:",
          cleanupError,
        );
      }
    }

    return errorResponse(
      "Impossible de créer la pharmacie.",
      500,
    );
  }

  /**
   * ==========================================================
   * 9. CRÉATION PROFIL OWNER
   * ==========================================================
   */

  try {
    const {
      error,
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

    if (error) {
      console.error(
        "[CREATE PHARMACY] PROFILE ERROR:",
        error,
      );

      throw new Error(
        error.message,
      );
    }
  } catch (error) {
    console.error(
      "[CREATE PHARMACY] PROFILE EXCEPTION:",
      error,
    );

    if (pharmacyId) {
      await supabaseAdmin
        .from("pharmacies")
        .delete()
        .eq(
          "id",
          pharmacyId,
        );
    }

    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );
    }

    return errorResponse(
      "Impossible de créer le profil du responsable.",
      500,
    );
  }

  /**
   * ==========================================================
   * 10. RÉCUPÉRATION DU PLAN TRIAL
   * ==========================================================
   *
   * IMPORTANT :
   *
   * On utilise une constante NON NULLABLE après
   * la vérification.
   *
   * Cela élimine les erreurs TypeScript :
   *
   * "trialPlan is possibly null"
   *
   * ==========================================================
   */

  let trialPlan: TrialPlan;

  try {
    const {
      data,
      error,
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
          "code",
          "trial",
        )
        .eq(
          "is_active",
          true,
        )
        .maybeSingle();

    if (error) {
      console.error(
        "[CREATE PHARMACY] TRIAL PLAN ERROR:",
        error,
      );

      throw new Error(
        error.message,
      );
    }

    if (!data) {
      throw new Error(
        "TRIAL_PLAN_NOT_FOUND",
      );
    }

    /**
     * Conversion explicite après
     * le contrôle !data.
     */
    trialPlan = {
      id: String(
        data.id,
      ),

      name: String(
        data.name,
      ),

      code: String(
        data.code,
      ),

      duration_days:
        Number(
          data.duration_days,
        ),

      price:
        Number(
          data.price,
        ),

      currency_code:
        String(
          data.currency_code,
        ),

      is_active:
        Boolean(
          data.is_active,
        ),
    };
  } catch (error) {
    console.error(
      "[CREATE PHARMACY] TRIAL PLAN EXCEPTION:",
      error,
    );

    if (userId) {
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq(
          "id",
          userId,
        );
    }

    if (pharmacyId) {
      await supabaseAdmin
        .from("pharmacies")
        .delete()
        .eq(
          "id",
          pharmacyId,
        );
    }

    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );
    }

    return errorResponse(
      "Le plan d'essai gratuit n'est pas correctement configuré.",
      500,
    );
  }

  /**
   * ==========================================================
   * 11. VALIDATION DU PLAN
   * ==========================================================
   */

  if (
    !Number.isFinite(
      trialPlan.duration_days,
    ) ||
    trialPlan.duration_days <=
      0
  ) {
    console.error(
      "[CREATE PHARMACY] INVALID TRIAL DURATION:",
      trialPlan.duration_days,
    );

    if (userId) {
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq(
          "id",
          userId,
        );
    }

    if (pharmacyId) {
      await supabaseAdmin
        .from("pharmacies")
        .delete()
        .eq(
          "id",
          pharmacyId,
        );
    }

    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );
    }

    return errorResponse(
      "La durée du plan d'essai est invalide.",
      500,
    );
  }

  /**
   * ==========================================================
   * 12. DATES DE L'ESSAI
   * ==========================================================
   */

  const trialStartedAt =
    new Date();

  const trialEndsAt =
    new Date(
      trialStartedAt.getTime() +
        trialPlan.duration_days *
          24 *
          60 *
          60 *
          1000,
    );

  /**
   * ==========================================================
   * 13. CRÉATION ABONNEMENT
   * ==========================================================
   */

  try {
    const {
      data,
      error,
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
          "id",
        )
        .single();

    if (error) {
      console.error(
        "[CREATE PHARMACY] SUBSCRIPTION ERROR:",
        error,
      );

      throw new Error(
        error.message,
      );
    }

    if (!data?.id) {
      throw new Error(
        "SUBSCRIPTION_ID_NOT_RETURNED",
      );
    }

    subscriptionId =
      data.id;
  } catch (error) {
    console.error(
      "[CREATE PHARMACY] SUBSCRIPTION EXCEPTION:",
      error,
    );

    if (pharmacyId) {
      await supabaseAdmin
        .from("subscriptions")
        .delete()
        .eq(
          "pharmacy_id",
          pharmacyId,
        );
    }

    if (userId) {
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq(
          "id",
          userId,
        );
    }

    if (pharmacyId) {
      await supabaseAdmin
        .from("pharmacies")
        .delete()
        .eq(
          "id",
          pharmacyId,
        );
    }

    if (userId) {
      const {
        error:
          cleanupError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          userId,
        );

      if (cleanupError) {
        console.error(
          "[CREATE PHARMACY] AUTH ROLLBACK ERROR:",
          cleanupError,
        );
      }
    }

    return errorResponse(
      "Impossible de créer l'abonnement d'essai.",
      500,
    );
  }

  /**
   * ==========================================================
   * 14. SUCCÈS
   * ==========================================================
   */

  console.log(
    "[CREATE PHARMACY] SUCCESS",
    {
      userId,
      pharmacyId,
      subscriptionId,
    },
  );

  return NextResponse.json(
    {
      success: true,

      message:
        "La pharmacie, le compte responsable et l'essai gratuit ont été créés avec succès.",

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

        status,

        manual_access_enabled:
          manualAccessEnabled,

        manual_access_until:
          manualAccessUntilIso,
      },

      user: {
        id:
          userId,

        email,

        full_name:
          fullName,

        phone,

        role:
          "owner",
      },

      subscription: {
        id:
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
          trialPlan.duration_days,

        trial_started_at:
          trialStartedAt.toISOString(),

        trial_ends_at:
          trialEndsAt.toISOString(),

        expires_at:
          trialEndsAt.toISOString(),
      },

      credentials: {
        email,

        password,
      },
    },
    {
      status: 201,
    },
  );
}