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

type BillingCycle = "monthly" | "yearly";

type RequestBody = {
  billingCycle?: BillingCycle;
  paymentMethod?: "mobile_money" | "card";
  phone?: string;
};

const ALLOWED_BILLING_CYCLES: BillingCycle[] = [
  "monthly",
  "yearly",
];

const CURRENCY_ALIASES: Record<string, string> = {
  XAF: "XAF",
  CDF: "CDF",
  USD: "USD",
};

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

function normalizePaymentMethod(
  value: unknown,
): "mobile_money" | "card" | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase();

  if (normalized === "mobile_money") {
    return "mobile_money";
  }

  if (normalized === "card") {
    return "card";
  }

  return null;
}

function normalizeCurrency(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toUpperCase();

  return (
    CURRENCY_ALIASES[normalized] ?? null
  );
}

function normalizePhone(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const phone = value.trim();

  if (!phone) {
    return null;
  }

  return phone;
}

function splitName(
  fullName: string | null | undefined,
) {
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
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts
      .slice(1)
      .join(" "),
  };
}

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

export async function POST(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    // =========================================================
    // 1. VÉRIFIER L'UTILISATEUR CONNECTÉ
    // =========================================================

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError(
        "Votre session a expiré. Veuillez vous reconnecter.",
        401,
      );
    }

    // =========================================================
    // 2. LIRE ET VALIDER LA REQUÊTE
    // =========================================================

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

    if (!billingCycle) {
      return jsonError(
        "La formule d'abonnement sélectionnée est invalide.",
      );
    }

    if (!paymentMethod) {
      return jsonError(
        "Le mode de paiement sélectionné est invalide.",
      );
    }

    // =========================================================
    // 3. RÉCUPÉRER LE PROFIL
    // =========================================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
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
      );
    }

    if (!profile) {
      return jsonError(
        "Votre profil PharmaFlow est introuvable.",
        404,
      );
    }

    if (!profile.pharmacy_id) {
      return jsonError(
        "Aucune pharmacie n'est associée à votre compte.",
        400,
      );
    }

    const pharmacyId =
      profile.pharmacy_id;

    // =========================================================
    // 4. RÉCUPÉRER LA PHARMACIE
    // =========================================================

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabase
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
      );
    }

    if (!pharmacy) {
      return jsonError(
        "Votre pharmacie est introuvable.",
        404,
      );
    }

    // =========================================================
    // 5. VÉRIFIER LE STATUT DE LA PHARMACIE
    // =========================================================

    const pharmacyStatus =
      String(
        pharmacy.status ?? "active",
      )
        .trim()
        .toLowerCase();

    const blockedPharmacyStatuses = [
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

    // =========================================================
    // 6. DÉTERMINER LA DEVISE
    // =========================================================

    const currency =
      normalizeCurrency(
        pharmacy.currency_code,
      );

    if (!currency) {
      return jsonError(
        "La devise de votre pharmacie n'est pas encore configurée.",
        400,
      );
    }

    // =========================================================
    // 7. PAIEMENT PAR CARTE
    // =========================================================

    if (
      paymentMethod === "card"
    ) {
      return jsonError(
        "Le paiement par carte n'est pas encore disponible pour cette configuration. Veuillez utiliser Mobile Money.",
        400,
        {
          code:
            "CARD_PAYMENT_NOT_AVAILABLE",
        },
      );
    }

    // =========================================================
    // 8. RÉCUPÉRER LE PLAN
    // =========================================================

    const planCode =
      billingCycle;

    const {
      data: plan,
      error: planError,
    } = await supabase
      .from("subscription_plans")
      .select(
        "id, plan_name, plan_code, duration_days, currency_code, price, is_active",
      )
      .eq(
        "plan_code",
        planCode,
      )
      .eq(
        "is_active",
        true,
      )
      .maybeSingle();

    if (planError) {
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

    // =========================================================
    // 9. RÉCUPÉRER LE PRIX
    // =========================================================

    const {
      data: planPrice,
      error: planPriceError,
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

    if (planPriceError) {
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
      );
    }

    // =========================================================
    // 10. RÉCUPÉRER L'ABONNEMENT ACTUEL
    // =========================================================

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await supabase
        .from("subscriptions")
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
            ascending: false,
          },
        )
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
      );
    }

    if (!subscription) {
      return jsonError(
        "Aucun abonnement n'est associé à cette pharmacie.",
        400,
      );
    }

    // =========================================================
    // 11. PAYS
    // =========================================================

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
      );
    }

    const providerPriority =
      COUNTRY_PROVIDER_PRIORITY[
        countryCode
      ] ?? [];

    if (
      providerPriority.length ===
      0
    ) {
      return jsonError(
        `Aucun fournisseur Mobile Money n'est configuré pour le pays ${countryCode}.`,
        400,
        {
          code:
            "NO_PAYMENT_PROVIDER_FOR_COUNTRY",
        },
      );
    }

    // =========================================================
    // 12. FOURNISSEURS ACTIVÉS
    // =========================================================

    const {
      data: providers,
      error: providersError,
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

    if (providersError) {
      console.error(
        "Erreur récupération fournisseurs paiement:",
        providersError,
      );

      return jsonError(
        "Impossible de récupérer les fournisseurs de paiement.",
        500,
      );
    }

    const compatibleProviders =
      (providers ?? []).filter(
        (provider) => {
          const providerCode =
            String(
              provider.code ?? "",
            )
              .trim()
              .toLowerCase() as PaymentProviderCode;

          const countries =
            Array.isArray(
              provider.countries,
            )
              ? provider.countries.map(
                  (value) =>
                    String(
                      value,
                    ).toUpperCase(),
                )
              : [];

          const paymentMethods =
            Array.isArray(
              provider.payment_methods,
            )
              ? provider.payment_methods.map(
                  (value) =>
                    String(
                      value,
                    ).toLowerCase(),
                )
              : [];

          const countrySupported =
            countries.length === 0 ||
            countries.includes(
              countryCode,
            );

          const mobileMoneySupported =
            paymentMethods.includes(
              "mobile_money",
            );

          return (
            providerPriority.includes(
              providerCode,
            ) &&
            countrySupported &&
            mobileMoneySupported
          );
        },
      );

    if (
      compatibleProviders.length ===
      0
    ) {
      return jsonError(
        "Aucun fournisseur Mobile Money activé n'est disponible pour votre pays.",
        400,
        {
          code:
            "NO_ENABLED_MOBILE_MONEY_PROVIDER",
        },
      );
    }

    // =========================================================
    // 13. SÉLECTION DU FOURNISSEUR
    // =========================================================

    const selectedProvider =
      providerPriority
        .map((code) =>
          compatibleProviders.find(
            (provider) =>
              String(
                provider.code,
              )
                .trim()
                .toLowerCase() ===
              code,
          ),
        )
        .find(Boolean);

    if (!selectedProvider) {
      return jsonError(
        "Impossible de sélectionner un fournisseur de paiement.",
        400,
      );
    }

    const providerCode =
      String(
        selectedProvider.code,
      )
        .trim()
        .toLowerCase() as PaymentProviderCode;

    // =========================================================
    // 14. NUMÉRO MOBILE MONEY
    // =========================================================

    const customerPhone =
      normalizePhone(body.phone) ??
      normalizePhone(profile.phone);

    if (!customerPhone) {
      return jsonError(
        "Aucun numéro de téléphone n'est associé à votre compte. Veuillez renseigner votre numéro Mobile Money.",
        400,
        {
          code:
            "CUSTOMER_PHONE_REQUIRED",
        },
      );
    }
    // =========================================================
    // 15. INFORMATIONS CLIENT
    // =========================================================

    const customerName =
      String(
        profile.full_name ?? "",
      ).trim();

    const {
      firstName,
      lastName,
    } = splitName(
      customerName,
    );

    const email =
      typeof user.email ===
      "string"
        ? user.email
            .trim()
            .toLowerCase()
        : "";

    // =========================================================
    // 16. RÉFÉRENCE UNIQUE
    // =========================================================

    const merchantReference =
      generateMerchantReference();

    // =========================================================
    // 17. MÉTADONNÉES
    // =========================================================

    const metadata = {
      billing_cycle:
        billingCycle,
      plan_id:
        plan.id,
      plan_code:
        plan.plan_code,
      pharmacy_id:
        pharmacyId,
      created_by:
        user.id,
      payment_method_type:
        "mobile_money",
      provider_code:
        providerCode,
      country_code:
        countryCode,
      currency,
    };

    // =========================================================
    // 18. CRÉER LA TRANSACTION LOCALE
    // =========================================================

    const {
      data: paymentTransaction,
      error: insertError,
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
            "mobile_money",
          status:
            "created",
          customer_name:
            customerName ||
            null,
          customer_email:
            email || null,
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

    // =========================================================
    // 19. APPELER LE MOTEUR DE PAIEMENT
    // =========================================================

    const paymentMethodType:
      PaymentMethodType =
      "mobile_money";

    const paymentResult =
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
          paymentMethod:
            "mobile_money",
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

    // =========================================================
    // 20. LE FOURNISSEUR A REFUSÉ LE PAIEMENT
    //
    // IMPORTANT :
    // CreatePaymentResult ne contient PAS de propriété "error".
    // =========================================================

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

    // =========================================================
    // 21. STATUT LOCAL
    // =========================================================

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

    // =========================================================
    // 22. PRÉPARER LA MISE À JOUR
    // =========================================================

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

    // =========================================================
    // 23. METTRE À JOUR LA TRANSACTION
    // =========================================================

    const {
      data: updatedTransaction,
      error: updateError,
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

    // =========================================================
    // 24. ACTIVATION DE L'ABONNEMENT
    //
    // L'abonnement n'est PAS activé ici simplement parce que
    // la création du paiement a répondu "successful".
    //
    // L'activation définitive est effectuée après vérification
    // du paiement par /api/payments/verify ou par webhook.
    // =========================================================

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
          plan.plan_code,
        billingCycle,
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