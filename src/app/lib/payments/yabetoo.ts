import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProviderAdapter,
  VerifyPaymentInput,
  VerifyPaymentResult,
  PaymentWebhookResult,
} from "./types";

import {
  normalizePaymentStatus,
} from "./types";

const SANDBOX_URL =
  "https://pay.sandbox.yabetoopay.com";

const PRODUCTION_URL =
  "https://pay.api.yabetoopay.com";

function getBaseUrl() {
  const mode =
    process.env.YABETOO_MODE ===
    "production"
      ? "production"
      : "sandbox";

  return (
    process.env.YABETOO_BASE_URL ||
    (mode === "production"
      ? PRODUCTION_URL
      : SANDBOX_URL)
  ).replace(/\/+$/, "");
}

function getSecretKey() {
  return (
    process.env.YABETOO_SECRET_KEY ||
    ""
  ).trim();
}

function getMode() {
  return process.env.YABETOO_MODE ===
    "production"
    ? "production"
    : "sandbox";
}

function getErrorMessage(
  data: unknown,
  fallback: string,
) {
  if (
    data &&
    typeof data === "object"
  ) {
    const value =
      data as Record<
        string,
        unknown
      >;

    for (const key of [
      "message",
      "error",
      "detail",
    ]) {
      if (
        typeof value[key] ===
        "string" &&
        value[key]
      ) {
        return value[key];
      }
    }
  }

  return fallback;
}

export const yabetooAdapter:
  PaymentProviderAdapter = {
  code: "yabetoo",

  name: "Yabétoo",

  config: {
    code: "yabetoo",

    name: "Yabétoo",

    mode: getMode(),

    baseUrl:
      getBaseUrl(),

    countries: [
      "CG",
    ],

    paymentMethods: [
      "mobile_money",
      "mtn",
      "airtel",
    ],

    enabled:
      Boolean(
        getSecretKey(),
      ),
  },

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const secretKey =
      getSecretKey();

    if (!secretKey) {
      return {
        success: false,
        status: "failed",
        merchantReference:
          input.merchantReference,
        message:
          "Yabétoo n'est pas configuré sur le serveur.",
        errorCode:
          "YABETOO_NOT_CONFIGURED",
      };
    }

    const url =
      `${getBaseUrl()}/v1/payment-intents`;

    /*
     * Yabétoo attend le montant dans la plus petite
     * unité monétaire selon le contrat du compte.
     *
     * Nous envoyons ici le montant numérique fourni
     * par PharmaFlow.
     *
     * La conversion spécifique doit être confirmée
     * selon la configuration commerciale du compte.
     */

    const payload: Record<
      string,
      unknown
    > = {
      amount:
        input.amount,

      currency:
        input.currency
          .toUpperCase(),

      description:
        input.description ??
        `Abonnement PharmaFlow - ${input.merchantReference}`,

      metadata: {
        ...(input.metadata ??
          {}),
        merchant_reference:
          input.merchantReference,
        pharmacy_id:
          input.pharmacyId,
        subscription_id:
          input.subscriptionId ??
          null,
      },
    };

    try {
      const response =
        await fetch(
          url,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${secretKey}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),

            cache: "no-store",
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );

      if (!response.ok) {
        return {
          success: false,

          status: "failed",

          merchantReference:
            input.merchantReference,

          message:
            getErrorMessage(
              data,
              "Yabétoo a refusé la création du paiement.",
            ),

          errorCode:
            `YABETOO_HTTP_${response.status}`,
        };
      }

      const record =
        data &&
        typeof data ===
          "object"
          ? (data as Record<
              string,
              unknown
            >)
          : {};

      const providerTransactionId =
        typeof record.id ===
        "string"
          ? record.id
          : null;

      const clientSecret =
        typeof record.clientSecret ===
        "string"
          ? record.clientSecret
          : null;

      const rawStatus =
        record.status ??
        "created";

      return {
        success: true,

        status:
          normalizePaymentStatus(
            rawStatus,
          ),

        providerTransactionId,

        merchantReference:
          input.merchantReference,

        clientSecret,

        checkoutUrl:
          typeof record.url ===
          "string"
            ? record.url
            : null,

        message:
          "Paiement Yabétoo créé.",

        metadata: {
          provider_response:
            record,
        },
      };
    } catch (error) {
      console.error(
        "YABETOO CREATE:",
        error,
      );

      return {
        success: false,

        status: "failed",

        merchantReference:
          input.merchantReference,

        message:
          "Impossible de contacter Yabétoo.",

        errorCode:
          "YABETOO_NETWORK_ERROR",
      };
    }
  },

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const secretKey =
      getSecretKey();

    if (!secretKey) {
      return {
        success: false,
        status: "failed",
        merchantReference:
          input.merchantReference ??
          null,
        providerTransactionId:
          input.providerTransactionId ??
          null,
        message:
          "Yabétoo n'est pas configuré.",
      };
    }

    const id =
      input.providerTransactionId;

    if (!id) {
      return {
        success: false,

        status: "failed",

        merchantReference:
          input.merchantReference ??
          null,

        message:
          "Identifiant de transaction Yabétoo manquant.",
      };
    }

    const url =
      `${getBaseUrl()}/v1/payment-intents/${encodeURIComponent(id)}`;

    try {
      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${secretKey}`,

              Accept:
                "application/json",
            },

            cache: "no-store",
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );

      if (!response.ok) {
        return {
          success: false,

          status: "failed",

          merchantReference:
            input.merchantReference ??
            null,

          providerTransactionId:
            id,

          message:
            getErrorMessage(
              data,
              "Impossible de vérifier le paiement Yabétoo.",
            ),
        };
      }

      const record =
        data &&
        typeof data ===
          "object"
          ? (data as Record<
              string,
              unknown
            >)
          : {};

      const status =
        normalizePaymentStatus(
          record.status,
        );

      const amount =
        typeof record.amount ===
        "number"
          ? record.amount
          : typeof record.amount ===
              "string"
            ? Number(
                record.amount,
              )
            : null;

      const currency =
        typeof record.currency ===
        "string"
          ? record.currency
          : null;

      return {
        success:
          status ===
          "successful",

        status,

        providerTransactionId:
          id,

        merchantReference:
          input.merchantReference ??
          null,

        amount,

        currency,

        message:
          status ===
          "successful"
            ? "Paiement Yabétoo confirmé."
            : "Statut Yabétoo récupéré.",

        metadata: {
          provider_response:
            record,
        },
      };
    } catch (error) {
      console.error(
        "YABETOO VERIFY:",
        error,
      );

      return {
        success: false,

        status: "pending",

        merchantReference:
          input.merchantReference ??
          null,

        providerTransactionId:
          id,

        message:
          "Vérification Yabétoo temporairement indisponible.",
      };
    }
  },

  parseWebhook(
    payload: unknown,
    headers?: Headers,
  ): PaymentWebhookResult {
    void headers;

    const record =
      payload &&
      typeof payload ===
        "object"
        ? (payload as Record<
            string,
            unknown
          >)
        : {};

    const status =
      normalizePaymentStatus(
        record.status ??
          record.payment_status ??
          record.paymentStatus,
      );

    const merchantReference =
      typeof record.merchant_reference ===
      "string"
        ? record.merchant_reference
        : typeof record.merchantReference ===
            "string"
          ? record.merchantReference
          : null;

    const providerTransactionId =
      typeof record.id ===
      "string"
        ? record.id
        : typeof record.transaction_id ===
            "string"
          ? record.transaction_id
          : null;

    const amount =
      typeof record.amount ===
      "number"
        ? record.amount
        : typeof record.amount ===
            "string"
          ? Number(
              record.amount,
            )
          : null;

    const currency =
      typeof record.currency ===
      "string"
        ? record.currency
        : null;

    return {
      success:
        status ===
        "successful",

      status,

      merchantReference,

      providerTransactionId,

      amount,

      currency,

      message:
        "Webhook Yabétoo reçu.",

      metadata: {
        webhook:
          record,
      },
    };
  },
};
export const yabetooProvider = yabetooAdapter;