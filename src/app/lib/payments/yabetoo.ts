import "server-only";

import {
  getIntegrationConfig,
  getRuntimeIntegrationValue,
} from "@/app/lib/integrations/config";

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

/* =========================================================
   URLS
========================================================= */

const SANDBOX_URL =
  "https://pay.sandbox.yabetoopay.com";

const PRODUCTION_URL =
  "https://pay.api.yabetoopay.com";

/* =========================================================
   TYPES
========================================================= */

export type YabetooOperator =
  | "mtn"
  | "airtel";

export type YabetooConfirmInput = {
  paymentIntentId: string;
  clientSecret: string;
  operator: YabetooOperator;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type YabetooConfirmResult = {
  success: boolean;

  status:
    | "created"
    | "pending"
    | "successful"
    | "failed"
    | "cancelled"
    | "expired";

  failureReason?: string | null;

  providerTransactionId?: string | null;

  paymentIntentId?: string | null;

  merchantReference?: string | null;

  amount?: number | null;

  currency?: string | null;

  message?: string | null;

  errorCode?: string | null;

  metadata?: Record<
    string,
    unknown
  >;
};

/* =========================================================
   CONFIGURATION
========================================================= */

async function getYabetooConfig() {
  const configuration =
    await getIntegrationConfig(
      "yabetoo",
    );

  const mode =
    configuration?.environment ??
    (process.env.YABETOO_MODE ===
    "production"
      ? "production"
      : "sandbox");

  const baseUrl =
    await getRuntimeIntegrationValue(
      "yabetoo",
      "baseUrl",
      process.env.YABETOO_BASE_URL,
    );

  const secretKey =
    await getRuntimeIntegrationValue(
      "yabetoo",
      "secretKey",
      process.env.YABETOO_SECRET_KEY,
    );

  return {
    mode,

    baseUrl:
      (
        baseUrl ||
        (mode === "production"
          ? PRODUCTION_URL
          : SANDBOX_URL)
      ).replace(/\/+$/, ""),

    secretKey,

    enabled:
      configuration?.isEnabled ??
      Boolean(secretKey),
  };
}

/* =========================================================
   HELPERS
========================================================= */

function getRecord(
  data: unknown,
): Record<string, unknown> {
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    return data as Record<
      string,
      unknown
    >;
  }

  return {};
}

function getNestedRecord(
  data: unknown,
  key: string,
): Record<string, unknown> {
  return getRecord(
    getRecord(data)[key],
  );
}

function getString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value =
      record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function getNumber(
  record: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value =
      record[key];

    if (
      typeof value === "number"
    ) {
      return Number.isFinite(
        value,
      )
        ? value
        : null;
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      const parsed =
        Number(value);

      if (
        Number.isFinite(parsed)
      ) {
        return parsed;
      }
    }
  }

  return null;
}

function getErrorMessage(
  data: unknown,
  fallback: string,
): string {
  const record =
    getRecord(data);

  const directMessage =
    getString(
      record,
      "message",
      "error",
      "detail",
      "failureMessage",
      "failure_message",
    );

  if (directMessage) {
    return directMessage;
  }

  const errors =
    record.errors;

  if (
    Array.isArray(errors) &&
    errors.length > 0
  ) {
    const first =
      errors[0];

    if (
      first &&
      typeof first === "object"
    ) {
      const firstError =
        getRecord(first);

      const message =
        getString(
          firstError,
          "message",
          "error",
          "detail",
        );

      if (message) {
        return message;
      }
    }
  }

  return fallback;
}

function normalizeYabetooStatus(
  status: unknown,
) {
  return normalizePaymentStatus(
    status,
  );
}

/* =========================================================
   CREATE
========================================================= */

async function createYabetooPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const config =
    await getYabetooConfig();

  if (
    !config.enabled ||
    !config.secretKey
  ) {
    return {
      success: false,
      status: "failed",
      merchantReference:
        input.merchantReference,
      message:
        "Yabétoo n'est pas configuré ou est désactivé.",
      errorCode:
        "YABETOO_NOT_CONFIGURED",
    };
  }

  const url =
    `${config.baseUrl}/v1/payment-intents`;

  const payload: Record<
    string,
    unknown
  > = {
    amount:
      input.amount,

    currency:
      input.currency.toLowerCase(),

    description:
      input.description ??
      `Abonnement PharmaFlow - ${input.merchantReference}`,

    metadata: {
      ...(input.metadata ?? {}),

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
              `Bearer ${config.secretKey}`,

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
        metadata: {
          provider_response:
            data,
        },
      };
    }

    const record =
      getRecord(data);

    const nestedData =
      getNestedRecord(
        data,
        "data",
      );

    const providerData =
      Object.keys(
        nestedData,
      ).length > 0
        ? nestedData
        : record;

    const providerTransactionId =
      getString(
        providerData,
        "id",
        "intentId",
        "payment_intent_id",
        "paymentIntentId",
      );

    const clientSecret =
      getString(
        providerData,
        "clientSecret",
        "client_secret",
      );

    const status =
      normalizeYabetooStatus(
        providerData.status ??
          "requires_payment_method",
      );

    return {
      success: true,

      status,

      providerTransactionId,

      merchantReference:
        input.merchantReference,

      clientSecret,

      checkoutUrl:
        getString(
          providerData,
          "url",
          "checkoutUrl",
          "checkout_url",
        ),

      message:
        "Intention de paiement Yabétoo créée.",

      metadata: {
        provider_response:
          providerData,

        yabetoo_payment_intent_id:
          providerTransactionId,

        yabetoo_client_secret:
          clientSecret,
      },
    };
  } catch {
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
}

/* =========================================================
   CONFIRM
========================================================= */

export async function confirmYabetooPayment(
  input: YabetooConfirmInput,
): Promise<YabetooConfirmResult> {
  const config =
    await getYabetooConfig();

  if (
    !config.enabled ||
    !config.secretKey
  ) {
    return {
      success: false,
      status: "failed",
      paymentIntentId:
        input.paymentIntentId,
      failureReason:
        "YABETOO_NOT_CONFIGURED",
      message:
        "Yabétoo n'est pas configuré.",
      errorCode:
        "YABETOO_NOT_CONFIGURED",
    };
  }

  if (
    !input.paymentIntentId.trim()
  ) {
    return {
      success: false,
      status: "failed",
      failureReason:
        "PAYMENT_INTENT_MISSING",
      message:
        "Identifiant de l'intention Yabétoo manquant.",
      errorCode:
        "YABETOO_PAYMENT_INTENT_MISSING",
    };
  }

  if (
    !input.clientSecret.trim()
  ) {
    return {
      success: false,
      status: "failed",
      paymentIntentId:
        input.paymentIntentId,
      failureReason:
        "CLIENT_SECRET_MISSING",
      message:
        "Client secret Yabétoo manquant.",
      errorCode:
        "YABETOO_CLIENT_SECRET_MISSING",
    };
  }

  if (!input.phone.trim()) {
    return {
      success: false,
      status: "failed",
      paymentIntentId:
        input.paymentIntentId,
      failureReason:
        "PHONE_MISSING",
      message:
        "Numéro Mobile Money manquant.",
      errorCode:
        "YABETOO_PHONE_MISSING",
    };
  }

  const url =
    `${config.baseUrl}/v1/payment-intents/${encodeURIComponent(
      input.paymentIntentId,
    )}/confirm`;

  const payload = {
    client_secret:
      input.clientSecret,

    ...(input.firstName
      ? {
          first_name:
            input.firstName,
        }
      : {}),

    ...(input.lastName
      ? {
          last_name:
            input.lastName,
        }
      : {}),

    ...(input.email
      ? {
          receipt_email:
            input.email,
        }
      : {}),

    payment_method_data: {
      type: "momo",

      momo: {
        country: "cg",

        msisdn:
          input.phone.trim(),

        operator_name:
          input.operator,
      },
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
              `Bearer ${config.secretKey}`,

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

    const record =
      getRecord(data);

    const nestedData =
      getNestedRecord(
        data,
        "data",
      );

    const providerData =
      Object.keys(
        nestedData,
      ).length > 0
        ? nestedData
        : record;

    if (!response.ok) {
      return {
        success: false,
        status: "failed",
        paymentIntentId:
          input.paymentIntentId,
        providerTransactionId:
          getString(
            providerData,
            "financialTransactionId",
            "transactionId",
            "id",
            "externalId",
          ),
        amount:
          getNumber(
            providerData,
            "amount",
          ),
        currency:
          getString(
            providerData,
            "currency",
          ),
        failureReason:
          getString(
            providerData,
            "failureReason",
            "failure_reason",
            "error",
          ),
        message:
          getErrorMessage(
            data,
            "Yabétoo a refusé la confirmation du paiement.",
          ),
        errorCode:
          `YABETOO_HTTP_${response.status}`,
        metadata: {
          provider_response:
            providerData,
        },
      };
    }

    const status =
      normalizeYabetooStatus(
        providerData.status ??
          providerData.payment_status ??
          providerData.paymentStatus ??
          "processing",
      );

    const providerTransactionId =
      getString(
        providerData,
        "financialTransactionId",
        "transactionId",
        "id",
        "externalId",
      );

    const successful =
      status === "successful";

    return {
      success:
        successful,

      status,

      providerTransactionId,

      paymentIntentId:
        getString(
          providerData,
          "intentId",
          "paymentIntentId",
          "payment_intent_id",
        ) ??
        input.paymentIntentId,

      amount:
        getNumber(
          providerData,
          "amount",
        ),

      currency:
        getString(
          providerData,
          "currency",
        ),

      failureReason:
        getString(
          providerData,
          "failureReason",
          "failure_reason",
          "failureMessage",
          "failure_message",
        ),

      message:
        successful
          ? "Paiement Yabétoo confirmé avec succès."
          : getErrorMessage(
              providerData,
              "Le paiement Yabétoo est en cours de traitement.",
            ),

      errorCode:
        getString(
          providerData,
          "failureCode",
          "failure_code",
          "errorCode",
          "error_code",
        ),

      metadata: {
        provider_response:
          providerData,

        yabetoo_payment_intent_id:
          input.paymentIntentId,

        yabetoo_operator:
          input.operator,
      },
    };
  } catch {
    return {
      success: false,
      status: "pending",
      paymentIntentId:
        input.paymentIntentId,
      failureReason:
        "NETWORK_ERROR",
      message:
        "La confirmation Yabétoo est temporairement indisponible.",
      errorCode:
        "YABETOO_CONFIRM_NETWORK_ERROR",
    };
  }
}

/* =========================================================
   VERIFY
========================================================= */

async function verifyYabetooPayment(
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const config =
    await getYabetooConfig();

  if (
    !config.enabled ||
    !config.secretKey
  ) {
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
    input.providerTransactionId?.trim();

  if (!id) {
    return {
      success: false,
      status: "failed",
      merchantReference:
        input.merchantReference ??
        null,
      providerTransactionId:
        null,
      message:
        "Identifiant de transaction Yabétoo manquant.",
    };
  }

  try {
    const response =
      await fetch(
        `${config.baseUrl}/v1/payment-intents/${encodeURIComponent(
          id,
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${config.secretKey}`,

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
      getRecord(data);

    const nestedData =
      getNestedRecord(
        data,
        "data",
      );

    const providerData =
      Object.keys(
        nestedData,
      ).length > 0
        ? nestedData
        : record;

    const status =
      normalizeYabetooStatus(
        providerData.status ??
          providerData.payment_status ??
          providerData.paymentStatus,
      );

    const amount =
      getNumber(
        providerData,
        "amount",
      );

    const currency =
      getString(
        providerData,
        "currency",
      );

    if (
      input.expectedAmount !==
        undefined &&
      amount !== null &&
      amount !==
        input.expectedAmount
    ) {
      return {
        success: false,
        status: "failed",
        merchantReference:
          input.merchantReference ??
          null,
        providerTransactionId:
          id,
        amount,
        currency,
        message:
          "Le montant Yabétoo ne correspond pas au montant attendu.",
        failureReason:
          "AMOUNT_MISMATCH",
      };
    }

    if (
      input.expectedCurrency &&
      currency &&
      currency.toUpperCase() !==
        input.expectedCurrency.toUpperCase()
    ) {
      return {
        success: false,
        status: "failed",
        merchantReference:
          input.merchantReference ??
          null,
        providerTransactionId:
          id,
        amount,
        currency,
        message:
          "La devise Yabétoo ne correspond pas à la devise attendue.",
        failureReason:
          "CURRENCY_MISMATCH",
      };
    }

    return {
      success:
        status === "successful",

      status,

      providerTransactionId:
        id,

      merchantReference:
        input.merchantReference ??
        null,

      amount,

      currency,

      message:
        status === "successful"
          ? "Paiement Yabétoo confirmé."
          : "Statut Yabétoo récupéré.",

      metadata: {
        provider_response:
          providerData,
      },
    };
  } catch {
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
}

/* =========================================================
   WEBHOOK
========================================================= */

function parseYabetooWebhook(
  payload: unknown,
  headers?: Headers,
): PaymentWebhookResult {
  void headers;

  const record =
    getRecord(payload);

  const nestedData =
    getNestedRecord(
      payload,
      "data",
    );

  const providerData =
    Object.keys(
      nestedData,
    ).length > 0
      ? nestedData
      : record;

  const status =
    normalizeYabetooStatus(
      providerData.status ??
        providerData.payment_status ??
        providerData.paymentStatus ??
        providerData.event_status,
    );

  return {
    success:
      status === "successful",

    status,

    merchantReference:
      getString(
        providerData,
        "merchant_reference",
        "merchantReference",
        "reference",
        "metadata_reference",
      ),

    providerTransactionId:
      getString(
        providerData,
        "financialTransactionId",
        "transactionId",
        "transaction_id",
        "id",
        "externalId",
        "external_id",
      ),

    amount:
      getNumber(
        providerData,
        "amount",
      ),

    currency:
      getString(
        providerData,
        "currency",
      ),

    message:
      "Webhook Yabétoo reçu.",

    metadata: {
      webhook:
        providerData,
    },
  };
}

/* =========================================================
   ADAPTER
========================================================= */

export const yabetooAdapter:
  PaymentProviderAdapter = {
  code: "yabetoo",

  name: "Yabétoo",

  config: {
    code: "yabetoo",

    name: "Yabétoo",

    mode:
      process.env.YABETOO_MODE ===
      "production"
        ? "production"
        : "sandbox",

    baseUrl:
      (
        process.env.YABETOO_BASE_URL ||
        SANDBOX_URL
      ).replace(/\/+$/, ""),

    countries: [
      "CG",
    ],

    currencies: [
      "XAF",
    ],

    paymentMethods: [
      "mobile_money",
      "mtn",
      "airtel",
    ],

    enabled:
      Boolean(
        process.env.YABETOO_SECRET_KEY,
      ),
  },

  createPayment:
    createYabetooPayment,

  verifyPayment:
    verifyYabetooPayment,

  parseWebhook:
    parseYabetooWebhook,
};

export const yabetooProvider =
  yabetooAdapter;