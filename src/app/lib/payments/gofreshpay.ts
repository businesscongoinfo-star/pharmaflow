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

const DEFAULT_BASE_URL =
  "https://api.gofreshpay.com";

async function getGoFreshPayConfig() {
  const configuration =
    await getIntegrationConfig(
      "gofreshpay",
    );

  const mode =
    configuration?.environment ??
    (process.env.GOFRESHPAY_MODE ===
    "production"
      ? "production"
      : "sandbox");

  const baseUrl =
    await getRuntimeIntegrationValue(
      "gofreshpay",
      "baseUrl",
      process.env.GOFRESHPAY_BASE_URL,
    );

  const merchantId =
    await getRuntimeIntegrationValue(
      "gofreshpay",
      "merchantId",
      process.env.GOFRESHPAY_MERCHANT_ID,
    );

  const merchantSecret =
    await getRuntimeIntegrationValue(
      "gofreshpay",
      "merchantSecret",
      process.env.GOFRESHPAY_MERCHANT_SECRET,
    );

  return {
    mode,

    baseUrl:
      (
        baseUrl ||
        DEFAULT_BASE_URL
      ).replace(/\/+$/, ""),

    merchantId,

    merchantSecret,

    enabled:
      configuration?.isEnabled ??
      Boolean(
        merchantId &&
          merchantSecret,
      ),
  };
}

function getErrorMessage(
  data: unknown,
  fallback: string,
): string {
  if (
    data &&
    typeof data === "object"
  ) {
    const record =
      data as Record<
        string,
        unknown
      >;

    for (const key of [
      "message",
      "Message",
      "error",
      "Error",
      "detail",
    ]) {
      if (
        typeof record[key] ===
          "string" &&
        record[key]
      ) {
        return record[key] as string;
      }
    }
  }

  return fallback;
}

export const gofreshpayAdapter:
  PaymentProviderAdapter = {
  code: "gofreshpay",

  name: "GoFreshPay",

  config: {
    code: "gofreshpay",

    name: "GoFreshPay",

    mode:
      process.env.GOFRESHPAY_MODE ===
      "production"
        ? "production"
        : "sandbox",

    baseUrl:
      (
        process.env.GOFRESHPAY_BASE_URL ||
        DEFAULT_BASE_URL
      ).replace(/\/+$/, ""),

    countries: [
      "CD",
    ],

    paymentMethods: [
      "mobile_money",
      "mpesa",
      "orange",
      "airtel",
      "africell",
    ],

    enabled:
      Boolean(
        process.env.GOFRESHPAY_MERCHANT_ID &&
        process.env.GOFRESHPAY_MERCHANT_SECRET,
      ),
  },

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const config =
      await getGoFreshPayConfig();

    if (
      !config.enabled ||
      !config.merchantId ||
      !config.merchantSecret
    ) {
      return {
        success: false,
        status: "failed",
        merchantReference:
          input.merchantReference,
        message:
          "GoFreshPay n'est pas configuré ou est désactivé.",
        errorCode:
          "GOFRESHPAY_NOT_CONFIGURED",
      };
    }

    const customerPhone =
      input.customer?.phone ??
      "";

    const customerName =
      input.customer?.name ??
      "";

    const firstName =
      input.customer?.firstName ??
      customerName
        .split(" ")
        .filter(Boolean)[0] ??
      "";

    const lastName =
      input.customer?.lastName ??
      customerName
        .split(" ")
        .slice(1)
        .join(" ");

    const email =
      input.customer?.email ??
      "";

    const method =
      typeof input.paymentMethod ===
      "string"
        ? input.paymentMethod
        : "mobile_money";

    const payload = {
      merchant_id:
        config.merchantId,

      merchant_secrete:
        config.merchantSecret,

      action:
        "debit",

      method,

      amount:
        input.amount,

      currency:
        input.currency.toUpperCase(),

      customer_number:
        customerPhone,

      reference:
        input.merchantReference,

      firstname:
        firstName,

      lastname:
        lastName,

      email,

      description:
        input.description ??
        `Abonnement PharmaFlow - ${input.merchantReference}`,
    };

    try {
      const response =
        await fetch(
          `${config.baseUrl}/api/v1/gateway`,
          {
            method: "POST",

            headers: {
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
              "GoFreshPay a refusé le paiement.",
            ),
          errorCode:
            `GOFRESHPAY_HTTP_${response.status}`,
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
          record.Trans_Status ??
            record.trans_status ??
            record.status ??
            "Pending",
        );

      const providerTransactionId =
        typeof record.Transaction_ID ===
        "string"
          ? record.Transaction_ID
          : typeof record.transaction_id ===
              "string"
            ? record.transaction_id
            : typeof record.id ===
                "string"
              ? record.id
              : null;

      return {
        success:
          status ===
          "successful",

        status,

        providerTransactionId,

        merchantReference:
          input.merchantReference,

        checkoutUrl:
          typeof record.checkout_url ===
          "string"
            ? record.checkout_url
            : typeof record.url ===
                "string"
              ? record.url
              : null,

        message:
          getErrorMessage(
            record,
            "Paiement GoFreshPay créé.",
          ),

        metadata: {
          provider_response:
            record,
        },
      };
    } catch {
      return {
        success: false,
        status: "failed",
        merchantReference:
          input.merchantReference,
        message:
          "Impossible de contacter GoFreshPay.",
        errorCode:
          "GOFRESHPAY_NETWORK_ERROR",
      };
    }
  },

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const config =
      await getGoFreshPayConfig();

    if (
      !config.enabled ||
      !config.merchantId ||
      !config.merchantSecret
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
          "GoFreshPay n'est pas configuré.",
      };
    }

    if (!input.merchantReference) {
      return {
        success: false,
        status: "failed",
        providerTransactionId:
          input.providerTransactionId ??
          null,
        message:
          "Référence GoFreshPay manquante.",
      };
    }

    const payload = {
      merchant_id:
        config.merchantId,

      merchant_secrete:
        config.merchantSecret,

      action:
        "verify",

      reference:
        input.merchantReference,
    };

    try {
      const response =
        await fetch(
          `${config.baseUrl}/api/v1/gateway`,
          {
            method: "POST",

            headers: {
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
          providerTransactionId:
            input.providerTransactionId ??
            null,
          message:
            getErrorMessage(
              data,
              "Impossible de vérifier GoFreshPay.",
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
          record.Trans_Status ??
            record.trans_status ??
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

      const providerTransactionId =
        typeof record.Transaction_ID ===
        "string"
          ? record.Transaction_ID
          : typeof record.transaction_id ===
              "string"
            ? record.transaction_id
            : input.providerTransactionId ??
              null;

      return {
        success:
          status ===
          "successful",

        status,

        merchantReference:
          input.merchantReference,

        providerTransactionId,

        amount,

        currency,

        message:
          status ===
          "successful"
            ? "Paiement GoFreshPay confirmé."
            : "Statut GoFreshPay récupéré.",

        metadata: {
          provider_response:
            record,
        },
      };
    } catch {
      return {
        success: false,
        status: "pending",
        merchantReference:
          input.merchantReference,
        providerTransactionId:
          input.providerTransactionId ??
          null,
        message:
          "Vérification GoFreshPay temporairement indisponible.",
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
        record.Trans_Status ??
          record.trans_status ??
          record.status ??
          record.payment_status,
      );

    const merchantReference =
      typeof record.reference ===
      "string"
        ? record.reference
        : typeof record.merchant_reference ===
            "string"
          ? record.merchant_reference
          : null;

    const providerTransactionId =
      typeof record.Transaction_ID ===
      "string"
        ? record.Transaction_ID
        : typeof record.transaction_id ===
            "string"
          ? record.transaction_id
          : typeof record.id ===
              "string"
            ? record.id
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

      paymentMethod:
        typeof record.method ===
        "string"
          ? record.method
          : null,

      message:
        "Webhook GoFreshPay reçu.",

      metadata: {
        webhook:
          record,
      },
    };
  },
};

export const gofreshpayProvider =
  gofreshpayAdapter;