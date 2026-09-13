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

type BillingCycle =
  | "monthly"
  | "yearly";

type RequestBody = {
  billingCycle?: BillingCycle;

  paymentMethod?:
    | "mobile_money"
    | "card";

  phone?: string;
};

const ALLOWED_BILLING_CYCLES: BillingCycle[] =
  [
    "monthly",
    "yearly",
  ];

/**
 * =========================================================
 * DEVISE
 * =========================================================
 */

function normalizeCurrency(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
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

/**
 * =========================================================
 * PRIORITÉ FOURNISSEURS
 * =========================================================
 *
 * La priorité reste spécifique au pays.
 *
 * Le fournisseur est ensuite filtré selon :
 *
 * - pays
 * - moyen de paiement
 * - activation dans payment_providers
 */

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

/**
 * =========================================================
 * NORMALISATION
 * =========================================================
 */

function normalizeBillingCycle(
  value: unknown,
): BillingCycle | null {
  if (
    typeof value !==
    "string"
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

function normalizePaymentMethod(
  value: unknown,
):
  | "mobile_money"
  | "card"
  | null {
  if (
    typeof value !==
    "string"
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
    normalized ===
    "card"
  ) {
    return "card";
  }

  return null;
}

function normalizePhone(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
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
    parts.length ===
    1
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

/**
 * =========================================================
 * POST
 * =========================================================
 */

export async function POST(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    // =======================================================
    // 1. UTILISATEUR CONNECTÉ
    // =======================================================

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
      );
    }

    // =======================================================
    // 2. REQUÊTE
    // =======================================================

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return jsonError(
        "Les données envoyées sont invalides.",
      );
    }

    const billingCycle =
      normalizeBillingCycle(
        body.billingCycle,
      );

    const paymentMethod =
      normalizePaymentMethod(
        body.paymentMethod,
      );

    if (
      !billingCycle
    ) {
      return jsonError(
        "La formule d'abonnement sélectionnée est invalide.",
      );
    }

    if (
      !paymentMethod
    ) {
      return jsonError(
        "Le mode de paiement sélectionné est invalide.",
      );
    }

    // =======================================================
    // 3. PROFIL
    // =======================================================

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
      );
    }

    if (!profile) {
      return jsonError(
        "Votre profil PharmaFlow est introuvable.",
        404,
      );
    }

    if (
      !profile.pharmacy_id
    ) {
      return jsonError(
        "Aucune pharmacie n'est associée à votre compte.",
        400,
      );
    }

    const pharmacyId =
      profile.pharmacy_id;

    // =======================================================
    // 4. PHARMACIE
    // =======================================================

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
      );
    }

    if (!pharmacy) {
      return jsonError(
        "Votre pharmacie est introuvable.",
        404,
      );
    }

    // =======================================================
    // 5. STATUT PHARMACIE
    // =======================================================

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
      );
    }

    // =======================================================
    // 6. DEVISE
    // =======================================================

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

    // =======================================================
    // 7. PLAN
    // =======================================================

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
          "id, code, name, description, duration_days, is_active",
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
      );
    }

    if (!plan) {
      return jsonError(
        "Le plan d'abonnement sélectionné n'est pas disponible.",
        404,
      );
    }

    // =======================================================
    // 8. PRIX
    // =======================================================

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

    // =======================================================
    // 9. ABONNEMENT ACTUEL
    // =======================================================

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
      );
    }

    if (!subscription) {
      return jsonError(
        "Aucun abonnement n'est associé à cette pharmacie.",
        400,
      );
    }

    // =======================================================
    // 10. PAYS
    // =======================================================

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
      );
    }

    // =======================================================
    // 11. FOURNISSEURS ACTIVÉS
    // =======================================================

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
      );
    }

    // =======================================================
    // 12. SÉLECTION FOURNISSEUR
    // =======================================================
    //
    // On sélectionne maintenant selon le MOYEN réellement
    // demandé :
    //
    // mobile_money
    // OU
    // card
    //
    // Cela permet à Moko Afrika de recevoir le bon flux.
    // =======================================================

    const requestedProviderMethod =
      paymentMethod;

    const providerPriority =
      COUNTRY_PROVIDER_PRIORITY[
        countryCode
      ] ?? [];

    const compatibleProviders =
      (providers ?? []).filter(
        (provider) => {
          const providerCode =
            String(
              provider.code ??
                "",
            )
              .trim()
              .toLowerCase() as PaymentProviderCode;

          const countries =
            Array.isArray(
              provider.countries,
            )
              ? provider.countries.map(
                  (
                    value,
                  ) =>
                    String(
                      value,
                    )
                      .trim()
                      .toUpperCase(),
                )
              : [];

          const paymentMethods =
            Array.isArray(
              provider.payment_methods,
            )
              ? provider.payment_methods.map(
                  (
                    value,
                  ) =>
                    String(
                      value,
                    )
                      .trim()
                      .toLowerCase(),
                )
              : [];

          const countrySupported =
            countries.length ===
              0 ||
            countries.includes(
              countryCode,
            );

          const methodSupported =
            paymentMethods.includes(
              requestedProviderMethod,
            );

          return (
            countrySupported &&
            methodSupported &&
            (
              providerPriority.length ===
                0 ||
              providerPriority.includes(
                providerCode,
              )
            )
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

    // =======================================================
    // 13. CHOISIR LE FOURNISSEUR
    // =======================================================

    let selectedProvider:
      | (typeof compatibleProviders)[number]
      | undefined;

    if (
      providerPriority.length >
      0
    ) {
      selectedProvider =
        providerPriority
          .map(
            (
              code,
            ) =>
              compatibleProviders.find(
                (
                  provider,
                ) =>
                  String(
                    provider.code,
                  )
                    .trim()
                    .toLowerCase() ===
                  code,
              ),
          )
          .find(
            Boolean,
          );
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
        selectedProvider.code,
      )
        .trim()
        .toLowerCase() as PaymentProviderCode;

    // =======================================================
    // 14. COMPATIBILITÉ CARTE MOKO AFRIKA
    // =======================================================
    //
    // Le Hosted Checkout carte Moko utilisé par PharmaFlow
    // accepte USD ou CDF.
    //
    // Nous ne transformons PAS silencieusement une autre
    // devise en USD/CDF.
    // =======================================================

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
        `Le paiement par carte Moko Afrika n'est actuellement disponible que pour USD ou CDF. La devise configurée pour cette pharmacie est ${currency}.`,
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

    // =======================================================
    // 15. CLIENT
    // =======================================================

    const customerPhone =
      normalizePhone(
        body.phone,
      ) ??
      normalizePhone(
        profile.phone,
      );

    if (!customerPhone) {
      return jsonError(
        "Aucun numéro de téléphone n'est associé à votre compte. Veuillez renseigner votre numéro de téléphone.",
        400,
        {
          code:
            "CUSTOMER_PHONE_REQUIRED",
        },
      );
    }

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

    // =======================================================
    // 16. EMAIL OBLIGATOIRE POUR CARTE
    // =======================================================

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

    // =======================================================
    // 17. ADRESSE CLIENT / PHARMACIE
    // =======================================================
    //
    // Moko Card demande notamment :
    //
    // bill_to_address_line1
    // bill_to_address_city
    // bill_to_address_country
    //
    // Ces informations sont envoyées via metadata afin que
    // l'adapter Moko puisse les utiliser.
    // =======================================================

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

    // =======================================================
    // 18. RÉFÉRENCE UNIQUE
    // =======================================================

    const merchantReference =
      generateMerchantReference();

    // =======================================================
    // 19. TYPE DE PAIEMENT
    // =======================================================

    const paymentMethodType:
      PaymentMethodType =
      paymentMethod ===
      "card"
        ? "card"
        : "mobile_money";

    // =======================================================
    // 20. MÉTADONNÉES
    // =======================================================

    const metadata: Record<
      string,
      unknown
    > = {
      billing_cycle:
        billingCycle,

      plan_id:
        plan.id,

      plan_code:
        plan.code,

      pharmacy_id:
        pharmacyId,

      created_by:
        user.id,

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

      // -------------------------------------------------------
      // Informations client
      // -------------------------------------------------------

      customer_name:
        customerName ||
        null,

      customer_email:
        email ||
        null,

      customer_phone:
        customerPhone,

      // -------------------------------------------------------
      // Informations de facturation
      // -------------------------------------------------------

      addressLine1:
        addressLine1 ||
        null,

      city:
        customerCity ||
        null,

      countryCode,

      // -------------------------------------------------------
      // Compatibilité avec l'adapter Moko Card
      // -------------------------------------------------------

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
        customerPhone,

      bill_to_address_line1:
        addressLine1 ||
        null,

      bill_to_address_city:
        customerCity ||
        null,

      bill_to_address_country:
        countryCode,

      // -------------------------------------------------------
      // Valeurs serveur
      // -------------------------------------------------------

      server_created_at:
        new Date().toISOString(),
    };

    // =======================================================
    // 21. TRANSACTION LOCALE
    // =======================================================

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
            customerPhone,

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
      );
    }

    // =======================================================
    // 22. APPEL DU MOTEUR
    // =======================================================

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
                customerPhone,

              countryCode,
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

    // =======================================================
    // 23. FOURNISSEUR REFUSE
    // =======================================================

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

    // =======================================================
    // 24. STATUT LOCAL
    // =======================================================

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

    // =======================================================
    // 25. MISE À JOUR TRANSACTION
    // =======================================================

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

      metadata: {
        ...metadata,

        provider_response:
          paymentResult.metadata ??
          null,
      },
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

    // =======================================================
    // 26. RÉPONSE
    // =======================================================
    //
    // IMPORTANT :
    //
    // Nous n'activons PAS l'abonnement ici.
    //
    // Pour une carte Moko :
    //
    // create
    //   ↓
    // checkoutUrl
    //   ↓
    // paiement
    //   ↓
    // callback Moko
    //   ↓
    // vérification
    //   ↓
    // activation abonnement
    //
    // La documentation Moko précise que le callback serveur
    // est la source de vérité et que la redirection navigateur
    // ne suffit pas à confirmer le paiement. 
    // =======================================================

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
      },
      {
        status: 500,
      },
    );
  }
}