import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";

import {
  createPayment,
  generateMerchantReference,
} from "@/app/lib/payments/engine";

import type {
  PaymentMethodType,
  PaymentProviderCode,
} from "@/app/lib/payments/types";

/* =========================================================
   TYPES
========================================================= */

type BillingCycle =
  | "monthly"
  | "yearly";

type PaymentMethod =
  | "mobile_money"
  | "card";

type RequestBody = {
  billingCycle?: BillingCycle;
  paymentMethod?: PaymentMethod;
  phone?: string;
};

const ALLOWED_BILLING_CYCLES: BillingCycle[] = [
  "monthly",
  "yearly",
];

/* =========================================================
   DEVISE
========================================================= */

function normalizeCurrency(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toUpperCase();

  if (
    !/^[A-Z]{3}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  return normalized;
}

/* =========================================================
   FORMULE
========================================================= */

function normalizeBillingCycle(
  value: unknown,
): BillingCycle | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    !ALLOWED_BILLING_CYCLES.includes(
      normalized as BillingCycle,
    )
  ) {
    return null;
  }

  return normalized as BillingCycle;
}

/* =========================================================
   MOYEN DE PAIEMENT
========================================================= */

function normalizePaymentMethod(
  value: unknown,
): PaymentMethod | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized ===
    "mobile_money"
  ) {
    return "mobile_money";
  }

  if (
    normalized === "card"
  ) {
    return "card";
  }

  return null;
}

/* =========================================================
   TÉLÉPHONE
========================================================= */

function normalizePhone(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const phone =
    value.trim();

  if (!phone) {
    return null;
  }

  return phone;
}

/* =========================================================
   NOM CLIENT
========================================================= */

function splitName(
  fullName:
    | string
    | null
    | undefined,
) {
  const cleanName =
    (
      fullName ?? ""
    ).trim();

  if (!cleanName) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const parts =
    cleanName.split(
      /\s+/,
    );

  if (
    parts.length === 1
  ) {
    return {
      firstName:
        parts[0],
      lastName: "",
    };
  }

  return {
    firstName:
      parts[0],

    lastName:
      parts
        .slice(1)
        .join(" "),
  };
}

/* =========================================================
   ERREUR JSON
========================================================= */

function jsonError(
  message: string,
  status = 400,
  extra: Record<
    string,
    unknown
  > = {},
) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...extra,
    },
    {
      status,
    },
  );
}

/* =========================================================
   FOURNISSEURS PAR PAYS
========================================================= */

const COUNTRY_PROVIDER_PRIORITY: Record<
  string,
  PaymentProviderCode[]
> = {
  CG: [
    "yabetoo",
    "gofreshpay",
    "moko_afrika",
  ],

  CD: [
    "gofreshpay",
    "moko_afrika",
  ],
};

/* =========================================================
   RECONNAÎTRE UN MOYEN DE PAIEMENT FOURNISSEUR
========================================================= */

/**
 * Certains fournisseurs enregistrent :
 *
 * mobile_money
 * momo
 * mtn
 * airtel
 * orange
 * mpesa
 * etc.
 *
 * Pour éviter qu'un fournisseur Mobile Money soit
 * rejeté simplement parce que sa DB utilise "mtn"
 * ou "airtel", nous normalisons ici.
 */

function providerSupportsPaymentMethod(
  providerMethods: unknown,
  requestedMethod: PaymentMethod,
): boolean {
  const methods =
    Array.isArray(
      providerMethods,
    )
      ? providerMethods.map(
          (value) =>
            String(
              value,
            )
              .trim()
              .toLowerCase(),
        )
      : [];

  if (
    requestedMethod ===
    "mobile_money"
  ) {
    return (
      methods.includes(
        "mobile_money",
      ) ||
      methods.includes(
        "momo",
      ) ||
      methods.includes(
        "mtn",
      ) ||
      methods.includes(
        "airtel",
      ) ||
      methods.includes(
        "orange",
      ) ||
      methods.includes(
        "mpesa",
      ) ||
      methods.includes(
        "africell",
      ) ||
      methods.includes(
        "vodacom",
      ) ||
      methods.includes(
        "moov",
      ) ||
      methods.includes(
        "wave",
      ) ||
      methods.includes(
        "free_money",
      )
    );
  }

  return (
    methods.includes(
      "card",
    ) ||
    methods.includes(
      "visa",
    ) ||
    methods.includes(
      "mastercard",
    )
  );
}

/* =========================================================
   PAYS FOURNISSEUR
========================================================= */

function providerSupportsCountry(
  providerCountries: unknown,
  countryCode: string,
): boolean {
  const countries =
    Array.isArray(
      providerCountries,
    )
      ? providerCountries.map(
          (value) =>
            String(
              value,
            )
              .trim()
              .toUpperCase(),
        )
      : [];

  /*
   * Une liste vide signifie :
   * le fournisseur n'impose pas de restriction
   * de pays dans la configuration DB.
   */
  return (
    countries.length === 0 ||
    countries.includes(
      countryCode,
    )
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =======================================================
       1. CLIENT SUPABASE
    ======================================================= */

    const supabase =
      await createClient();

    /* =======================================================
       2. UTILISATEUR CONNECTÉ
    ======================================================= */

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Votre session a expiré. Veuillez vous reconnecter.",
        401,
        {
          code:
            "AUTHENTICATION_REQUIRED",
        },
      );
    }

    /* =======================================================
       3. LIRE LA REQUÊTE
    ======================================================= */

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return jsonError(
        "Les données envoyées sont invalides.",
        400,
        {
          code:
            "INVALID_REQUEST_BODY",
        },
      );
    }

    /* =======================================================
       4. FORMULE
    ======================================================= */

    const billingCycle =
      normalizeBillingCycle(
        body.billingCycle,
      );

    if (
      !billingCycle
    ) {
      return jsonError(
        "La formule d'abonnement sélectionnée est invalide.",
        400,
        {
          code:
            "INVALID_BILLING_CYCLE",
        },
      );
    }

    /* =======================================================
       5. MOYEN DE PAIEMENT
    ======================================================= */

    const paymentMethod =
      normalizePaymentMethod(
        body.paymentMethod,
      );

    if (
      !paymentMethod
    ) {
      return jsonError(
        "Le mode de paiement sélectionné est invalide.",
        400,
        {
          code:
            "INVALID_PAYMENT_METHOD",
        },
      );
    }

    /* =======================================================
       6. PROFIL
    ======================================================= */

    const {
      data: profile,
      error:
        profileError,
    } =
      await supabase
        .from(
          "profiles",
        )
        .select(
          "id, full_name, phone, role, pharmacy_id, language",
        )
        .eq(
          "id",
          user.id,
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "Erreur récupération profil paiement:",
        profileError,
      );

      return jsonError(
        "Impossible de récupérer votre profil.",
        500,
        {
          code:
            "PROFILE_QUERY_ERROR",
        },
      );
    }

    if (!profile) {
      return jsonError(
        "Votre profil PharmaFlow est introuvable.",
        404,
        {
          code:
            "PROFILE_NOT_FOUND",
        },
      );
    }

    if (
      !profile.pharmacy_id
    ) {
      return jsonError(
        "Aucune pharmacie n'est associée à votre compte.",
        400,
        {
          code:
            "PHARMACY_NOT_ASSOCIATED",
        },
      );
    }

    const pharmacyId =
      profile.pharmacy_id;

    /* =======================================================
       7. PHARMACIE
    ======================================================= */

    const {
      data: pharmacy,
      error:
        pharmacyError,
    } =
      await supabase
        .from(
          "pharmacies",
        )
        .select(
          "id, name, address, country_code, city, currency_code, owner_id, status",
        )
        .eq(
          "id",
          pharmacyId,
        )
        .maybeSingle();

    if (
      pharmacyError
    ) {
      console.error(
        "Erreur récupération pharmacie paiement:",
        pharmacyError,
      );

      return jsonError(
        "Impossible de récupérer les informations de votre pharmacie.",
        500,
        {
          code:
            "PHARMACY_QUERY_ERROR",
        },
      );
    }

    if (!pharmacy) {
      return jsonError(
        "Votre pharmacie est introuvable.",
        404,
        {
          code:
            "PHARMACY_NOT_FOUND",
        },
      );
    }

    /* =======================================================
       8. STATUT PHARMACIE
    ======================================================= */

    const pharmacyStatus =
      String(
        pharmacy.status ??
          "active",
      )
        .trim()
        .toLowerCase();

    const blockedPharmacyStatuses =
      [
        "inactive",
        "disabled",
        "blocked",
        "suspended",
        "closed",
      ];

    if (
      blockedPharmacyStatuses.includes(
        pharmacyStatus,
      )
    ) {
      return jsonError(
        "Cette pharmacie n'est actuellement pas autorisée à effectuer un paiement.",
        403,
        {
          code:
            "PHARMACY_PAYMENT_BLOCKED",
        },
      );
    }

    /* =======================================================
       9. DEVISE
    ======================================================= */

    const currency =
      normalizeCurrency(
        pharmacy.currency_code,
      );

    if (!currency) {
      return jsonError(
        "La devise de votre pharmacie n'est pas correctement configurée. Utilisez une devise ISO 4217 à 3 lettres.",
        400,
        {
          code:
            "INVALID_PHARMACY_CURRENCY",
        },
      );
    }

    /* =======================================================
       10. PAYS
    ======================================================= */

    const countryCode =
      String(
        pharmacy.country_code ??
          "",
      )
        .trim()
        .toUpperCase();

    if (!countryCode) {
      return jsonError(
        "Le pays de votre pharmacie n'est pas configuré.",
        400,
        {
          code:
            "COUNTRY_NOT_CONFIGURED",
        },
      );
    }

    /* =======================================================
       11. PLAN
    ======================================================= */

    const planCode =
      billingCycle;

    const {
      data: plan,
      error:
        planError,
    } =
      await supabase
        .from(
          "subscription_plans",
        )
        .select(
          "id, code, name, duration_days, is_active",
        )
        .eq(
          "code",
          planCode,
        )
        .eq(
          "is_active",
          true,
        )
        .maybeSingle();

    if (
      planError
    ) {
      console.error(
        "Erreur récupération plan paiement:",
        planError,
      );

      return jsonError(
        "Impossible de récupérer le plan d'abonnement.",
        500,
        {
          code:
            "SUBSCRIPTION_PLAN_QUERY_ERROR",
        },
      );
    }

    if (!plan) {
      return jsonError(
        "Le plan d'abonnement sélectionné n'est pas disponible.",
        404,
        {
          code:
            "SUBSCRIPTION_PLAN_NOT_FOUND",

          billingCycle,
        },
      );
    }

    /* =======================================================
       12. PRIX DU PLAN
    ======================================================= */

    const {
      data: planPrice,
      error:
        planPriceError,
    } =
      await supabase
        .from(
          "subscription_plan_prices",
        )
        .select(
          "id, plan_id, currency_code, price, is_active",
        )
        .eq(
          "plan_id",
          plan.id,
        )
        .eq(
          "currency_code",
          currency,
        )
        .eq(
          "is_active",
          true,
        )
        .maybeSingle();

    if (
      planPriceError
    ) {
      console.error(
        "Erreur récupération prix abonnement:",
        planPriceError,
      );

      return jsonError(
        "Impossible de récupérer le prix de l'abonnement.",
        500,
        {
          code:
            "SUBSCRIPTION_PRICE_QUERY_ERROR",
        },
      );
    }

    if (!planPrice) {
      return jsonError(
        `Aucun prix n'est configuré pour le plan ${billingCycle} en ${currency}.`,
        400,
        {
          code:
            "SUBSCRIPTION_PRICE_NOT_CONFIGURED",

          currency,

          billingCycle,
        },
      );
    }

    const amount =
      Number(
        planPrice.price,
      );

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      return jsonError(
        "Le prix de l'abonnement configuré est invalide.",
        500,
        {
          code:
            "INVALID_SUBSCRIPTION_PRICE",
        },
      );
    }

    /* =======================================================
       13. ABONNEMENT ACTUEL
    ======================================================= */

    const {
      data: subscription,
      error:
        subscriptionError,
    } =
      await supabase
        .from(
          "subscriptions",
        )
        .select(
          "id, pharmacy_id, plan_id, status, trial_started_at, trial_ends_at, expires_at, created_at, updated_at",
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(1)
        .maybeSingle();

    if (
      subscriptionError
    ) {
      console.error(
        "Erreur récupération abonnement paiement:",
        subscriptionError,
      );

      return jsonError(
        "Impossible de récupérer votre abonnement.",
        500,
        {
          code:
            "SUBSCRIPTION_QUERY_ERROR",
        },
      );
    }

    if (!subscription) {
      return jsonError(
        "Aucun abonnement n'est associé à cette pharmacie.",
        400,
        {
          code:
            "SUBSCRIPTION_NOT_FOUND",
        },
      );
    }

    /* =======================================================
       14. FOURNISSEURS ACTIVÉS
    ======================================================= */

    const {
      data: providers,
      error:
        providersError,
    } =
      await supabase
        .from(
          "payment_providers",
        )
        .select(
          "id, code, name, description, enabled, mode, countries, payment_methods",
        )
        .eq(
          "enabled",
          true,
        );

    if (
      providersError
    ) {
      console.error(
        "Erreur récupération fournisseurs paiement:",
        providersError,
      );

      return jsonError(
        "Impossible de récupérer les fournisseurs de paiement.",
        500,
        {
          code:
            "PAYMENT_PROVIDERS_QUERY_ERROR",
        },
      );
    }

    /* =======================================================
       15. FOURNISSEURS COMPATIBLES
    ======================================================= */

    const providerPriority =
      COUNTRY_PROVIDER_PRIORITY[
        countryCode
      ] ?? [];

    const compatibleProviders =
      (providers ?? [])
        .filter(
          (provider) => {
            const providerCode =
              String(
                provider.code ??
                  "",
              )
                .trim()
                .toLowerCase() as PaymentProviderCode;

            const countrySupported =
              providerSupportsCountry(
                provider.countries,
                countryCode,
              );

            const methodSupported =
              providerSupportsPaymentMethod(
                provider.payment_methods,
                paymentMethod,
              );

            /*
             * Pour un pays qui possède une priorité
             * configurée, seuls les fournisseurs présents
             * dans cette priorité sont sélectionnés.
             *
             * Pour les autres pays, on laisse le moteur
             * gérer la sélection.
             */
            const prioritySupported =
              providerPriority.length ===
                0 ||
              providerPriority.includes(
                providerCode,
              );

            return (
              countrySupported &&
              methodSupported &&
              prioritySupported
            );
          },
        );

    if (
      compatibleProviders.length ===
      0
    ) {
      return jsonError(
        paymentMethod ===
          "card"
          ? `Aucun fournisseur de carte activé n'est disponible pour ${countryCode}.`
          : `Aucun fournisseur Mobile Money activé n'est disponible pour ${countryCode}.`,
        400,
        {
          code:
            paymentMethod ===
            "card"
              ? "NO_ENABLED_CARD_PROVIDER"
              : "NO_ENABLED_MOBILE_MONEY_PROVIDER",

          countryCode,

          currency,

          paymentMethod,
        },
      );
    }

    /* =======================================================
       16. SÉLECTION DU FOURNISSEUR
    ======================================================= */

    let selectedProvider:
      | (typeof compatibleProviders)[number]
      | undefined;

    if (
      providerPriority.length >
      0
    ) {
      for (
        const priorityCode of
          providerPriority
      ) {
        const found =
          compatibleProviders.find(
            (
              provider,
            ) =>
              String(
                provider.code ??
                  "",
              )
                .trim()
                .toLowerCase() ===
              priorityCode,
          );

        if (found) {
          selectedProvider =
            found;

          break;
        }
      }
    } else {
      selectedProvider =
        compatibleProviders[0];
    }

    if (
      !selectedProvider
    ) {
      return jsonError(
        "Impossible de sélectionner un fournisseur de paiement.",
        400,
        {
          code:
            "PAYMENT_PROVIDER_SELECTION_ERROR",
        },
      );
    }

    const providerCode =
      String(
        selectedProvider.code ??
          "",
      )
        .trim()
        .toLowerCase() as PaymentProviderCode;

    /* =======================================================
       17. COMPATIBILITÉ YABÉTOO
    ======================================================= */

    if (
      providerCode ===
        "yabetoo" &&
      countryCode !== "CG"
    ) {
      return jsonError(
        "Yabétoo est actuellement configuré pour le Congo-Brazzaville.",
        400,
        {
          code:
            "YABETOO_COUNTRY_NOT_SUPPORTED",

          provider:
            "yabetoo",

          countryCode,
        },
      );
    }

    if (
      providerCode ===
        "yabetoo" &&
      paymentMethod !==
        "mobile_money"
    ) {
      return jsonError(
        "Yabétoo est actuellement utilisé par PharmaFlow pour les paiements Mobile Money.",
        400,
        {
          code:
            "YABETOO_PAYMENT_METHOD_NOT_SUPPORTED",

          provider:
            "yabetoo",

          paymentMethod,
        },
      );
    }

    if (
      providerCode ===
        "yabetoo" &&
      currency !== "XAF"
    ) {
      return jsonError(
        "Yabétoo est actuellement configuré pour les paiements en XAF au Congo-Brazzaville.",
        400,
        {
          code:
            "YABETOO_CURRENCY_NOT_SUPPORTED",

          provider:
            "yabetoo",

          currency,

          supportedCurrencies:
            ["XAF"],
        },
      );
    }

    /* =======================================================
       18. COMPATIBILITÉ CARTE MOKO AFRIKA
    ======================================================= */

    if (
      paymentMethod ===
        "card" &&
      providerCode ===
        "moko_afrika" &&
      ![
        "USD",
        "CDF",
      ].includes(
        currency,
      )
    ) {
      return jsonError(
        `Le paiement par carte Moko Afrika est actuellement disponible pour USD ou CDF. La devise de cette pharmacie est ${currency}.`,
        400,
        {
          code:
            "MOKO_CARD_CURRENCY_NOT_SUPPORTED",

          provider:
            providerCode,

          currency,

          supportedCurrencies:
            [
              "USD",
              "CDF",
            ],
        },
      );
    }

    /* =======================================================
       19. CLIENT
    ======================================================= */

    const customerPhone =
      normalizePhone(
        body.phone,
      ) ??
      normalizePhone(
        profile.phone,
      );

    const customerName =
      String(
        profile.full_name ??
          "",
      ).trim();

    const {
      firstName,
      lastName,
    } =
      splitName(
        customerName,
      );

    const email =
      typeof user.email ===
      "string"
        ? user.email
            .trim()
            .toLowerCase()
        : "";

    /* =======================================================
       20. TÉLÉPHONE MOBILE MONEY
    ======================================================= */

    if (
      paymentMethod ===
        "mobile_money" &&
      !customerPhone
    ) {
      return jsonError(
        "Aucun numéro de téléphone n'est associé à votre compte. Veuillez renseigner votre numéro Mobile Money.",
        400,
        {
          code:
            "CUSTOMER_PHONE_REQUIRED",
        },
      );
    }

    /* =======================================================
       21. EMAIL CARTE
    ======================================================= */

    if (
      paymentMethod ===
        "card" &&
      !email
    ) {
      return jsonError(
        "Une adresse e-mail est obligatoire pour le paiement par carte.",
        400,
        {
          code:
            "CUSTOMER_EMAIL_REQUIRED",
        },
      );
    }

    /* =======================================================
       22. ADRESSE DE FACTURATION
    ======================================================= */

    const addressLine1 =
      String(
        pharmacy.address ??
          "",
      ).trim();

    const customerCity =
      String(
        pharmacy.city ??
          "",
      ).trim();

    if (
      paymentMethod ===
        "card" &&
      !addressLine1
    ) {
      return jsonError(
        "L'adresse de la pharmacie est obligatoire pour préparer le paiement par carte.",
        400,
        {
          code:
            "BILLING_ADDRESS_REQUIRED",
        },
      );
    }

    if (
      paymentMethod ===
        "card" &&
      !customerCity
    ) {
      return jsonError(
        "La ville de la pharmacie est obligatoire pour préparer le paiement par carte.",
        400,
        {
          code:
            "BILLING_CITY_REQUIRED",
        },
      );
    }

    /* =======================================================
       23. RÉFÉRENCE UNIQUE
    ======================================================= */

    const merchantReference =
      generateMerchantReference();

    /* =======================================================
       24. TYPE DE PAIEMENT
    ======================================================= */

    const paymentMethodType:
      PaymentMethodType =
      paymentMethod ===
      "card"
        ? "card"
        : "mobile_money";

    /* =======================================================
       25. MÉTADONNÉES
    ======================================================= */

    const metadata: Record<
      string,
      unknown
    > = {
      /* -----------------------------------------------------
         Abonnement
      ----------------------------------------------------- */

      billing_cycle:
        billingCycle,

      plan_id:
        plan.id,

      plan_code:
        plan.code,

      pharmacy_id:
        pharmacyId,

      subscription_id:
        subscription.id,

      created_by:
        user.id,

      /* -----------------------------------------------------
         Paiement
      ----------------------------------------------------- */

      payment_method_type:
        paymentMethodType,

      provider_code:
        providerCode,

      country_code:
        countryCode,

      currency,

      reference_currency:
        currency,

      reference_amount:
        amount,

      /* -----------------------------------------------------
         Client
      ----------------------------------------------------- */

      customer_name:
        customerName ||
        null,

      customer_email:
        email ||
        null,

      customer_phone:
        customerPhone ||
        null,

      /* -----------------------------------------------------
         Facturation
      ----------------------------------------------------- */

      addressLine1:
        addressLine1 ||
        null,

      city:
        customerCity ||
        null,

      countryCode,

      /* -----------------------------------------------------
         Moko Afrika Card
      ----------------------------------------------------- */

      bill_to_forename:
        firstName ||
        null,

      bill_to_surname:
        lastName ||
        null,

      bill_to_email:
        email ||
        null,

      bill_to_phone:
        customerPhone ||
        null,

      bill_to_address_line1:
        addressLine1 ||
        null,

      bill_to_address_city:
        customerCity ||
        null,

      bill_to_address_country:
        countryCode,

      /* -----------------------------------------------------
         Suivi serveur
      ----------------------------------------------------- */

      server_created_at:
        new Date().toISOString(),
    };

    /* =======================================================
       26. CRÉER TRANSACTION LOCALE
    ======================================================= */

    const {
      data:
        paymentTransaction,
      error:
        insertError,
    } =
      await supabase
        .from(
          "payment_transactions",
        )
        .insert({
          pharmacy_id:
            pharmacyId,

          subscription_id:
            subscription.id,

          provider_id:
            selectedProvider.id,

          provider:
            providerCode,

          merchant_reference:
            merchantReference,

          amount,

          currency,

          payment_method:
            paymentMethod,

          status:
            "created",

          customer_name:
            customerName ||
            null,

          customer_email:
            email ||
            null,

          customer_phone:
            customerPhone ||
            null,

          metadata,
        })
        .select(
          "id, pharmacy_id, subscription_id, provider_id, provider, merchant_reference, amount, currency, payment_method, status, checkout_url, customer_name, customer_email, customer_phone, metadata, failure_reason, created_at, updated_at, paid_at",
        )
        .single();

    if (
      insertError ||
      !paymentTransaction
    ) {
      console.error(
        "Erreur création transaction paiement:",
        insertError,
      );

      return jsonError(
        "Impossible de créer la transaction de paiement.",
        500,
        {
          code:
            "PAYMENT_TRANSACTION_CREATE_ERROR",
        },
      );
    }

    /* =======================================================
       27. APPEL DU FOURNISSEUR
    ======================================================= */

    let paymentResult;

    try {
      paymentResult =
        await createPayment(
          providerCode,
          {
            pharmacyId,

            subscriptionId:
              subscription.id,

            merchantReference,

            amount,

            currency,

            paymentMethodType,

            paymentMethod,

            customer: {
              firstName,

              lastName,

              name:
                customerName,

              email:
                email ||
                undefined,

              phone:
                customerPhone ||
                undefined,

              countryCode,
            },

            description:
              `Abonnement PharmaFlow ${billingCycle}`,

            metadata,
          },
        );
    } catch (
      providerError
    ) {
      console.error(
        "Erreur appel fournisseur paiement:",
        providerError,
      );

      const failureReason =
        providerError instanceof
        Error
          ? providerError.message
          : "Erreur lors de la communication avec le fournisseur de paiement.";

      await supabase
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",

          failure_reason:
            failureReason,

          metadata: {
            ...metadata,

            provider_error:
              failureReason,
          },
        })
        .eq(
          "id",
          paymentTransaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        );

      return jsonError(
        failureReason,
        502,
        {
          code:
            "PAYMENT_PROVIDER_REQUEST_ERROR",

          paymentTransactionId:
            paymentTransaction.id,

          merchantReference,

          provider:
            providerCode,
        },
      );
    }

    /* =======================================================
       28. FOURNISSEUR REFUSE
    ======================================================= */

    if (
      !paymentResult.success
    ) {
      const failureReason =
        paymentResult.message ??
        paymentResult.errorCode ??
        "Le fournisseur de paiement a refusé la transaction.";

      await supabase
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",

          provider_transaction_id:
            paymentResult.providerTransactionId ??
            null,

          checkout_url:
            paymentResult.checkoutUrl ??
            null,

          failure_reason:
            failureReason,

          metadata: {
            ...metadata,

            provider_response:
              paymentResult.metadata ??
              null,
          },
        })
        .eq(
          "id",
          paymentTransaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        );

      return jsonError(
        failureReason,
        400,
        {
          code:
            paymentResult.errorCode ??
            "PAYMENT_PROVIDER_ERROR",

          paymentTransactionId:
            paymentTransaction.id,

          merchantReference,

          provider:
            providerCode,

          status:
            paymentResult.status,
        },
      );
    }

    /* =======================================================
       29. STATUT LOCAL
    ======================================================= */

    const localStatus =
      paymentResult.status ===
      "successful"
        ? "successful"
        : paymentResult.status ===
          "failed"
          ? "failed"
          : paymentResult.status ===
            "cancelled"
            ? "cancelled"
            : paymentResult.status ===
              "expired"
              ? "expired"
              : "pending";

    /* =======================================================
       30. MÉTADONNÉES FOURNISSEUR
    ======================================================= */

    const providerMetadata =
      paymentResult.metadata ??
      null;

    const updatedMetadata:
      Record<
        string,
        unknown
      > = {
      ...metadata,

      /* -----------------------------------------------------
         ID transaction fournisseur
      ----------------------------------------------------- */

      provider_transaction_id:
        paymentResult.providerTransactionId ??
        null,

      /* -----------------------------------------------------
         Client secret Yabétoo
      ----------------------------------------------------- */

      client_secret:
        paymentResult.clientSecret ??
        null,

      /* -----------------------------------------------------
         Réponse fournisseur
      ----------------------------------------------------- */

      provider_response:
        providerMetadata,
    };

    /* =======================================================
       31. MISE À JOUR TRANSACTION
    ======================================================= */

    const updatePayload:
      Record<
        string,
        unknown
      > = {
      status:
        localStatus,

      provider_transaction_id:
        paymentResult.providerTransactionId ??
        null,

      checkout_url:
        paymentResult.checkoutUrl ??
        null,

      metadata:
        updatedMetadata,
    };

    if (
      localStatus ===
      "successful"
    ) {
      updatePayload.paid_at =
        new Date().toISOString();
    }

    if (
      localStatus ===
        "failed" ||
      localStatus ===
        "cancelled" ||
      localStatus ===
        "expired"
    ) {
      updatePayload.failure_reason =
        paymentResult.message ??
        "Le paiement n'a pas abouti.";
    }

    const {
      data:
        updatedTransaction,
      error:
        updateError,
    } =
      await supabase
        .from(
          "payment_transactions",
        )
        .update(
          updatePayload,
        )
        .eq(
          "id",
          paymentTransaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        )
        .select(
          "id, merchant_reference, provider, amount, currency, payment_method, status, checkout_url, provider_transaction_id, metadata, failure_reason, created_at, updated_at, paid_at",
        )
        .single();

    if (
      updateError ||
      !updatedTransaction
    ) {
      console.error(
        "Erreur mise à jour transaction paiement:",
        updateError,
      );

      return jsonError(
        "Le paiement a été envoyé, mais la transaction locale n'a pas pu être mise à jour. Veuillez vérifier son statut.",
        500,
        {
          code:
            "PAYMENT_TRANSACTION_UPDATE_ERROR",

          paymentTransactionId:
            paymentTransaction.id,

          merchantReference,
        },
      );
    }

    /* =======================================================
       32. RÉPONSE
    ======================================================= */

    /*
     * IMPORTANT :
     *
     * La création du paiement ne signifie PAS
     * automatiquement que l'abonnement est payé.
     *
     * Pour Yabétoo :
     *
     * CREATE
     *    ↓
     * clientSecret + Payment Intent
     *    ↓
     * CONFIRM
     *    ↓
     * MTN / Airtel
     *    ↓
     * WEBHOOK / VERIFY
     *    ↓
     * vérification montant + devise
     *    ↓
     * activation abonnement
     *
     * L'activation sera donc traitée dans
     * l'étape de confirmation/vérification.
     */

    return NextResponse.json({
      success: true,

      message:
        paymentResult.message ??
        "Paiement créé avec succès.",

      payment: {
        id:
          updatedTransaction.id,

        merchantReference:
          updatedTransaction.merchant_reference,

        provider:
          updatedTransaction.provider,

        providerTransactionId:
          updatedTransaction.provider_transaction_id,

        /*
         * Nécessaire pour la confirmation
         * de l'intention Yabétoo.
         */
        clientSecret:
          paymentResult.clientSecret ??
          null,

        amount:
          updatedTransaction.amount,

        currency:
          updatedTransaction.currency,

        paymentMethod:
          updatedTransaction.payment_method,

        status:
          updatedTransaction.status,

        checkoutUrl:
          updatedTransaction.checkout_url,
      },

      subscription: {
        id:
          subscription.id,

        planId:
          plan.id,

        planCode:
          plan.code,

        billingCycle,

        currency,

        amount,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Erreur inattendue API création paiement:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Une erreur inattendue est survenue lors de la création du paiement.",

        code:
          "PAYMENT_CREATE_UNEXPECTED_ERROR",
      },
      {
        status: 500,
      },
    );
  }
}