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

function getBaseUrl() {
  return (
    process.env.GOFRESHPAY_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
}

function getMerchantId() {
  return (
    process.env.GOFRESHPAY_MERCHANT_ID ||
    ""
  ).trim();
}

function getMerchantSecret() {
  return (
    process.env.GOFRESHPAY_MERCHANT_SECRET ||
    ""
  ).trim();
}

function getMode() {
  return process.env
    .GOFRESHPAY_MODE ===
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
        return record[key];
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

      mode: getMode(),

      baseUrl:
        getBaseUrl(),

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
          getMerchantId() &&
            getMerchantSecret(),
        ),
    },

    async createPayment(
      input: CreatePaymentInput,
    ): Promise<CreatePaymentResult> {
      const merchantId =
        getMerchantId();

      const merchantSecret =
        getMerchantSecret();

      if (
        !merchantId ||
        !merchantSecret
      ) {
        return {
          success: false,

          status: "failed",

          merchantReference:
            input.merchantReference,

          message:
            "GoFreshPay n'est pas configuré sur le serveur.",

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
          merchantId,

        merchant_secrete:
          merchantSecret,

        action:
          "debit",

        method,

        amount:
          input.amount,

        currency:
          input.currency
            .toUpperCase(),

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

      const url =
        `${getBaseUrl()}/api/v1/gateway`;

      try {
        const response =
          await fetch(
            url,
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

        const rawStatus =
          record.Trans_Status ??
          record.trans_status ??
          record.status ??
          "Pending";

        const status =
          normalizePaymentStatus(
            rawStatus,
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
      } catch (error) {
        console.error(
          "GOFRESHPAY CREATE:",
          error,
        );

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
      const merchantId =
        getMerchantId();

      const merchantSecret =
        getMerchantSecret();

      if (
        !merchantId ||
        !merchantSecret
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
          merchantId,

        merchant_secrete:
          merchantSecret,

        action:
          "verify",

        reference:
          input.merchantReference,
      };

      const url =
        `${getBaseUrl()}/api/v1/gateway`;

      try {
        const response =
          await fetch(
            url,
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
      } catch (error) {
        console.error(
          "GOFRESHPAY VERIFY:",
          error,
        );

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
export const gofreshpayProvider = gofreshpayAdapter;