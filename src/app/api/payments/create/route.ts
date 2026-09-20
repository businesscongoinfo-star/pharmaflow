import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";

import {
  createPayment,
  generateMerchantReference,
} from "@/app/lib/payments/engine";

import type {
  PaymentMethodType,
  PaymentProviderCode,
  ProviderPaymentMethod,
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

type MobileMoneyOperator =
  | "mpesa"
  | "airtel"
  | "orange"
  | "africell";

type RequestBody = {
  billingCycle?: BillingCycle;
  paymentMethod?: PaymentMethod;

  /*
   * Opérateur Mobile Money.
   *
   * Exemples :
   * mpesa
   * airtel
   * orange
   * africell
   */
  mobileMoneyOperator?: MobileMoneyOperator | string;

  /*
   * Alias acceptés pour faciliter la compatibilité
   * avec les formulaires existants.
   */
  operator?: MobileMoneyOperator | string;

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
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
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
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
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
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, "_");

  if (
    normalized === "mobile_money" ||
    normalized === "mobilemoney" ||
    normalized === "momo"
  ) {
    return "mobile_money";
  }

  if (
    normalized === "card" ||
    normalized === "visa" ||
    normalized === "mastercard"
  ) {
    return "card";
  }

  return null;
}

/* =========================================================
   OPÉRATEUR MOBILE MONEY
========================================================= */

function normalizeMobileMoneyOperator(
  value: unknown,
): MobileMoneyOperator | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, "_");

  if (
    normalized === "mpesa" ||
    normalized === "m_pesa" ||
    normalized === "vodacom" ||
    normalized === "vodacom_money" ||
    normalized === "vodacom_mpesa"
  ) {
    return "mpesa";
  }

  if (
    normalized === "airtel" ||
    normalized === "airtel_money"
  ) {
    return "airtel";
  }

  if (
    normalized === "orange" ||
    normalized === "orange_money"
  ) {
    return "orange";
  }

  if (
    normalized === "africell" ||
    normalized === "africell_money"
  ) {
    return "africell";
  }

  return null;
}

/* =========================================================
   TÉLÉPHONE
========================================================= */

function normalizePhone(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const phone = value.trim();

  return phone || null;
}

/* =========================================================
   NOM CLIENT
========================================================= */

function splitName(
  fullName: string | null | undefined,
): {
  firstName: string;
  lastName: string;
} {
  const cleanName = (
    fullName ?? ""
  ).trim();

  if (!cleanName) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const parts = cleanName.split(/\s+/);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: parts[0],
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/* =========================================================
   ERREUR JSON
========================================================= */

function jsonError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {},
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
   NORMALISATION FOURNISSEUR
========================================================= */

function normalizeProviderCode(
  value: unknown,
): PaymentProviderCode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");

  if (
    normalized === "moko" ||
    normalized === "moko_afrika"
  ) {
    return "moko_afrika";
  }

  if (
    normalized === "gofreshpay" ||
    normalized === "go_fresh_pay" ||
    normalized === "freshpay"
  ) {
    return "gofreshpay";
  }

  if (
    normalized === "yabetoo" ||
    normalized === "yabétoo" ||
    normalized === "yabetoopay"
  ) {
    return "yabetoo";
  }

  return normalized as PaymentProviderCode;
}

/* =========================================================
   PRIORITÉ FOURNISSEURS
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
    "moko_afrika",
    "gofreshpay",
  ],
};

/* =========================================================
   MÉTHODES FOURNISSEUR
========================================================= */

function normalizeProviderMethod(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, "_");
}

function providerSupportsPaymentMethod(
  providerMethods: unknown,
  requestedMethod: PaymentMethod,
): boolean {
  const methods = Array.isArray(providerMethods)
    ? providerMethods.map(
        normalizeProviderMethod,
      )
    : [];

  if (requestedMethod === "mobile_money") {
    return (
      methods.includes("mobile_money") ||
      methods.includes("momo") ||
      methods.includes("mpesa") ||
      methods.includes("m_pesa") ||
      methods.includes("airtel") ||
      methods.includes("airtel_money") ||
      methods.includes("orange") ||
      methods.includes("orange_money") ||
      methods.includes("africell") ||
      methods.includes("africell_money") ||
      methods.includes("vodacom") ||
      methods.includes("vodacom_money") ||
      methods.includes("mtn") ||
      methods.includes("mtn_money") ||
      methods.includes("moov") ||
      methods.includes("wave") ||
      methods.includes("free_money")
    );
  }

  return (
    methods.includes("card") ||
    methods.includes("visa") ||
    methods.includes("mastercard") ||
    methods.includes("bank_card") ||
    methods.includes("bankcard")
  );
}

/* =========================================================
   DEVISES FOURNISSEUR
========================================================= */

function providerSupportsCurrency(
  providerCurrencies: unknown,
  requestedCurrency: string,
): boolean {
  /*
   * Si aucune devise n'est renseignée en base,
   * on ne bloque pas artificiellement le fournisseur.
   */
  if (!Array.isArray(providerCurrencies)) {
    return true;
  }

  const currencies =
    providerCurrencies
      .map((value) =>
        String(value)
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean);

  if (currencies.length === 0) {
    return true;
  }

  return currencies.includes(
    requestedCurrency.toUpperCase(),
  );
}

/* =========================================================
   PAYS
========================================================= */

function providerSupportsCountry(
  providerCountries: unknown,
  countryCode: string,
): boolean {
  if (!Array.isArray(providerCountries)) {
    return true;
  }

  const countries = providerCountries.map(
    (value) =>
      String(value)
        .trim()
        .toUpperCase(),
  );

  if (countries.length === 0) {
    return true;
  }

  return countries.includes(
    countryCode,
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    /* =======================================================
       1. UTILISATEUR
    ======================================================= */

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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
       2. REQUÊTE
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
       3. FORMULE
    ======================================================= */

    const billingCycle =
      normalizeBillingCycle(
        body.billingCycle,
      );

    if (!billingCycle) {
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
       4. PAIEMENT
    ======================================================= */

    const paymentMethod =
      normalizePaymentMethod(
        body.paymentMethod,
      );

    if (!paymentMethod) {
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
       5. OPÉRATEUR MOBILE MONEY
    ======================================================= */

    let mobileMoneyOperator:
      MobileMoneyOperator | null =
      null;

    if (
      paymentMethod ===
      "mobile_money"
    ) {
      const requestedOperator =
        body.mobileMoneyOperator ??
        body.operator;

      mobileMoneyOperator =
        normalizeMobileMoneyOperator(
          requestedOperator,
        );

      /*
       * L'opérateur reste optionnel pour conserver
       * la compatibilité avec l'ancien frontend.
       *
       * Si le frontend envoie un opérateur,
       * celui-ci sera transmis explicitement
       * au fournisseur.
       */
    }

    /* =======================================================
       6. PROFIL
    ======================================================= */

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, role, pharmacy_id, language",
        )
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
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

    if (!profile.pharmacy_id) {
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
      error: pharmacyError,
    } =
      await supabase
        .from("pharmacies")
        .select(
          "id, name, address, country_code, city, currency_code, owner_id, status",
        )
        .eq("id", pharmacyId)
        .maybeSingle();

    if (pharmacyError) {
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

    const pharmacyStatus = String(
      pharmacy.status ?? "active",
    )
      .trim()
      .toLowerCase();

    if (
      [
        "inactive",
        "disabled",
        "blocked",
        "suspended",
        "closed",
      ].includes(pharmacyStatus)
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
        "La devise de votre pharmacie n'est pas correctement configurée.",
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
        pharmacy.country_code ?? "",
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

    const {
      data: plan,
      error: planError,
    } =
      await supabase
        .from("subscription_plans")
        .select(
          "id, code, name, duration_days, is_active",
        )
        .eq("code", billingCycle)
        .eq("is_active", true)
        .maybeSingle();

    if (planError) {
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
        },
      );
    }

    /* =======================================================
       12. PRIX
    ======================================================= */

    const {
      data: planPrice,
      error: planPriceError,
    } =
      await supabase
        .from("subscription_plan_prices")
        .select(
          "id, plan_id, currency_code, price, is_active",
        )
        .eq("plan_id", plan.id)
        .eq("currency_code", currency)
        .eq("is_active", true)
        .maybeSingle();

    if (planPriceError) {
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
      Number(planPrice.price);

    if (
      !Number.isFinite(amount) ||
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
       13. ABONNEMENT
    ======================================================= */

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await supabase
        .from("subscriptions")
        .select(
          "id, pharmacy_id, plan_id, status, trial_started_at, trial_ends_at, expires_at, created_at, updated_at",
        )
        .eq("pharmacy_id", pharmacyId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (subscriptionError) {
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
       14. FOURNISSEURS
    ======================================================= */

    const {
      data: providers,
      error: providersError,
    } =
      await supabase
        .from("payment_providers")
        .select(
          "id, code, name, description, enabled, mode, countries, payment_methods, currencies",
        )
        .eq("enabled", true);

    if (providersError) {
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
        .filter((provider) => {
          const providerCode =
            normalizeProviderCode(
              provider.code,
            );

          if (!providerCode) {
            return false;
          }

          if (
            !providerSupportsCountry(
              provider.countries,
              countryCode,
            )
          ) {
            return false;
          }

          if (
            !providerSupportsPaymentMethod(
              provider.payment_methods,
              paymentMethod,
            )
          ) {
            return false;
          }

          /*
           * Vérification de la devise.
           *
           * Exemple :
           * Moko Afrika -> USD / CDF
           * Yabétoo     -> XAF
           *
           * Cela évite d'envoyer directement une devise
           * que le fournisseur ne déclare pas supporter.
           */
          if (
            !providerSupportsCurrency(
              provider.currencies,
              currency,
            )
          ) {
            return false;
          }

          if (
            providerPriority.length > 0 &&
            !providerPriority.includes(
              providerCode,
            )
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          const aCode =
            normalizeProviderCode(
              a.code,
            );

          const bCode =
            normalizeProviderCode(
              b.code,
            );

          const aIndex =
            aCode
              ? providerPriority.indexOf(
                  aCode,
                )
              : -1;

          const bIndex =
            bCode
              ? providerPriority.indexOf(
                  bCode,
                )
              : -1;

          return (
            (aIndex < 0
              ? 999
              : aIndex) -
            (bIndex < 0
              ? 999
              : bIndex)
          );
        });

    if (
      compatibleProviders.length === 0
    ) {
      return jsonError(
        paymentMethod === "card"
          ? `Aucun fournisseur de carte compatible avec ${currency} n'est disponible pour ${countryCode}.`
          : `Aucun fournisseur Mobile Money compatible avec ${currency} n'est disponible pour ${countryCode}.`,
        400,
        {
          code:
            paymentMethod === "card"
              ? "NO_ENABLED_CARD_PROVIDER"
              : "NO_ENABLED_MOBILE_MONEY_PROVIDER",

          countryCode,

          currency,

          paymentMethod,

          providerPriority,
        },
      );
    }

    /* =======================================================
       16. CLIENT
    ======================================================= */

    const customerPhone =
      normalizePhone(body.phone) ??
      normalizePhone(profile.phone);

    const customerName =
      String(
        profile.full_name ?? "",
      ).trim();

    const {
      firstName,
      lastName,
    } = splitName(customerName);

    const email =
      typeof user.email === "string"
        ? user.email.trim().toLowerCase()
        : "";

    if (
      paymentMethod ===
        "mobile_money" &&
      !customerPhone
    ) {
      return jsonError(
        "Aucun numéro de téléphone n'est associé à votre compte.",
        400,
        {
          code:
            "CUSTOMER_PHONE_REQUIRED",
        },
      );
    }

    if (
      paymentMethod === "card" &&
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
       17. ADRESSE
    ======================================================= */

    const addressLine1 =
      String(
        pharmacy.address ?? "",
      ).trim();

    const customerCity =
      String(
        pharmacy.city ?? "",
      ).trim();

    if (
      paymentMethod === "card" &&
      !addressLine1
    ) {
      return jsonError(
        "L'adresse de la pharmacie est obligatoire pour le paiement par carte.",
        400,
        {
          code:
            "BILLING_ADDRESS_REQUIRED",
        },
      );
    }

    if (
      paymentMethod === "card" &&
      !customerCity
    ) {
      return jsonError(
        "La ville de la pharmacie est obligatoire pour le paiement par carte.",
        400,
        {
          code:
            "BILLING_CITY_REQUIRED",
        },
      );
    }

    /* =======================================================
       18. RÉFÉRENCE
    ======================================================= */

    const merchantReference =
      generateMerchantReference();

    const paymentMethodType:
      PaymentMethodType =
      paymentMethod === "card"
        ? "card"
        : "mobile_money";

    const paymentRail =
      paymentMethod === "card"
        ? "card"
        : "mobile_money";

    /* =======================================================
       19. FOURNISSEUR SÉLECTIONNÉ
    ======================================================= */

    const selectedProvider =
      compatibleProviders[0];

    const selectedProviderCode =
      normalizeProviderCode(
        selectedProvider.code,
      );

    if (!selectedProviderCode) {
      return jsonError(
        "Le code du fournisseur sélectionné est invalide.",
        500,
        {
          code:
            "INVALID_PROVIDER_CODE",
        },
      );
    }

    /* =======================================================
       20. MÉTHODE FOURNISSEUR
    ======================================================= */

    /*
     * Pour Moko Afrika, on transmet maintenant
     * explicitement l'opérateur Mobile Money lorsqu'il
     * est fourni par le frontend.
     *
     * Sans opérateur, on conserve "mobile_money"
     * pour compatibilité avec l'ancien frontend.
     */
    const providerPaymentMethod:
      ProviderPaymentMethod | undefined =
      paymentMethod ===
        "mobile_money" &&
      mobileMoneyOperator
        ? mobileMoneyOperator
        : paymentMethod;

    /* =======================================================
       21. MÉTADONNÉES
    ======================================================= */

    const metadata: Record<
      string,
      unknown
    > = {
      rail: paymentRail,

      provider:
        selectedProviderCode,

      provider_priority:
        compatibleProviders.map(
          (provider) =>
            normalizeProviderCode(
              provider.code,
            ),
        ),

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

      payment_method_type:
        paymentMethodType,

      payment_method:
        paymentMethod,

      provider_payment_method:
        providerPaymentMethod,

      mobile_money_operator:
        mobileMoneyOperator,

      country_code:
        countryCode,

      currency,

      reference_currency:
        currency,

      reference_amount:
        amount,

      customer_name:
        customerName || null,

      customer_email:
        email || null,

      customer_phone:
        customerPhone || null,

      addressLine1:
        addressLine1 || null,

      city:
        customerCity || null,

      countryCode,

      ...(paymentMethod === "card"
        ? {
            bill_to_forename:
              firstName || null,

            bill_to_surname:
              lastName || null,

            bill_to_email:
              email || null,

            bill_to_phone:
              customerPhone || null,

            bill_to_address_line1:
              addressLine1 || null,

            bill_to_address_city:
              customerCity || null,

            bill_to_address_country:
              countryCode,
          }
        : {}),

      server_created_at:
        new Date().toISOString(),
    };

    /* =======================================================
       22. TRANSACTION LOCALE
    ======================================================= */

    const {
      data: paymentTransaction,
      error: insertError,
    } =
      await supabase
        .from("payment_transactions")
        .insert({
          pharmacy_id:
            pharmacyId,

          subscription_id:
            subscription.id,

          provider_id:
            selectedProvider.id,

          provider:
            selectedProviderCode,

          merchant_reference:
            merchantReference,

          amount,

          currency,

          payment_method:
            paymentMethod,

          status:
            "created",

          customer_name:
            customerName || null,

          customer_email:
            email || null,

          customer_phone:
            customerPhone || null,

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
       23. APPEL FOURNISSEUR
    ======================================================= */

    let paymentResult;

    try {
      paymentResult =
        await createPayment(
          selectedProviderCode,
          {
            pharmacyId,

            subscriptionId:
              subscription.id,

            merchantReference,

            amount,

            currency,

            paymentMethodType,

            /*
             * IMPORTANT :
             *
             * Pour Mobile Money :
             * mpesa / airtel / orange / africell
             *
             * Pour carte :
             * card
             */
            paymentMethod:
              providerPaymentMethod,

            customer: {
              firstName,
              lastName,

              name:
                customerName,

              email:
                email || undefined,

              phone:
                customerPhone ||
                undefined,

              countryCode,

              addressLine1:
                addressLine1 ||
                undefined,

              city:
                customerCity ||
                undefined,
            },

            description:
              `Abonnement PharmaFlow ${billingCycle}`,

            metadata,
          },
        );
    } catch (providerError) {
      console.error(
        "Erreur appel fournisseur paiement:",
        providerError,
      );

      const failureReason =
        providerError instanceof Error
          ? providerError.message
          : "Erreur lors de la communication avec le fournisseur de paiement.";

      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",

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
            selectedProviderCode,
        },
      );
    }

    /* =======================================================
       24. FOURNISSEUR REFUSE
    ======================================================= */

    if (!paymentResult.success) {
      const failureReason =
        paymentResult.message ??
        paymentResult.errorCode ??
        "Le fournisseur de paiement a refusé la transaction.";

      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",

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
            selectedProviderCode,

          status:
            paymentResult.status,

          providerResponse:
            paymentResult.metadata ??
            null,
        },
      );
    }

    /* =======================================================
       25. STATUT LOCAL
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
       26. MÉTADONNÉES
    ======================================================= */

    const updatedMetadata:
      Record<
        string,
        unknown
      > = {
      ...metadata,

      provider:
        selectedProviderCode,

      provider_code:
        selectedProviderCode,

      provider_transaction_id:
        paymentResult.providerTransactionId ??
        null,

      ...(paymentResult.clientSecret
        ? {
            client_secret:
              paymentResult.clientSecret,
          }
        : {}),

      provider_response:
        paymentResult.metadata ??
        null,
    };

    /* =======================================================
       27. UPDATE
    ======================================================= */

    const updatePayload:
      Record<string, unknown> = {
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
      [
        "failed",
        "cancelled",
        "expired",
      ].includes(localStatus)
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
        .from("payment_transactions")
        .update(updatePayload)
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
        "Le paiement a été envoyé, mais la transaction locale n'a pas pu être mise à jour.",
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
       28. RÉPONSE
    ======================================================= */

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

        rail:
          paymentRail,

        clientSecret:
          paymentResult.clientSecret ??
          null,

        amount:
          updatedTransaction.amount,

        currency:
          updatedTransaction.currency,

        paymentMethod:
          updatedTransaction.payment_method,

        providerPaymentMethod:
          providerPaymentMethod,

        mobileMoneyOperator:
          mobileMoneyOperator,

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
  } catch (error) {
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