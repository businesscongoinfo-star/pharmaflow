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

/**
 * MOKO AFRIKA
 *
 * API Production v5
 *
 * IMPORTANT :
 * - Aucun secret ne doit être écrit directement dans ce fichier.
 * - Les identifiants doivent rester dans les variables d'environnement.
 * - Les paiements Moko Afrika sont asynchrones.
 */

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_BASE_URL =
  "https://paydrc.gofreshbakery.net/api/v5";

function getBaseUrl(): string {
  return (
    process.env.MOKO_AFRIKA_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
}

function getMerchantId(): string {
  return (
    process.env.MOKO_AFRIKA_MERCHANT_ID ||
    ""
  ).trim();
}

function getMerchantSecret(): string {
  return (
    process.env.MOKO_AFRIKA_MERCHANT_SECRET ||
    ""
  ).trim();
}

function getCallbackUrl(): string {
  return (
    process.env.MOKO_AFRIKA_CALLBACK_URL ||
    ""
  ).trim();
}

function getMode(): "production" | "sandbox" {
  return process.env.MOKO_AFRIKA_MODE ===
    "production"
    ? "production"
    : "sandbox";
}

/* -------------------------------------------------------------------------- */
/* OUTILS                                                                     */
/* -------------------------------------------------------------------------- */

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

    const possibleKeys = [
      "message",
      "Message",
      "error",
      "Error",
      "detail",
      "Comment",
      "Status_Description",
      "resultCodeDescription",
      "resultCodeErrorDescription",
    ];

    for (const key of possibleKeys) {
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

function getString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    if (
      typeof record[key] ===
        "string" &&
      record[key]
    ) {
      return record[key] as string;
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
      typeof value ===
      "number"
    ) {
      return Number.isFinite(value)
        ? value
        : null;
    }

    if (
      typeof value ===
      "string" &&
      value.trim() !== ""
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

function getRecord(
  data: unknown,
): Record<string, unknown> {
  if (
    data &&
    typeof data === "object"
  ) {
    return data as Record<
      string,
      unknown
    >;
  }

  return {};
}

/* -------------------------------------------------------------------------- */
/* ADAPTER                                                                    */
/* -------------------------------------------------------------------------- */

export const mokoAfrikaAdapter:
  PaymentProviderAdapter = {
    code: "moko_afrika",

    name: "Moko Afrika",

    config: {
      code: "moko_afrika",

      name: "Moko Afrika",

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

    /* ---------------------------------------------------------------------- */
    /* CREATE PAYMENT                                                         */
    /* ---------------------------------------------------------------------- */

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
            "Moko Afrika n'est pas configuré sur le serveur.",

          errorCode:
            "MOKO_AFRIKA_NOT_CONFIGURED",
        };
      }

      const customerPhone =
        input.customer?.phone ??
        "";

      const customerName =
        input.customer?.name ??
        "";

      const firstName =
        input.customer?.firstName ||
        customerName
          .split(" ")
          .filter(Boolean)[0] ||
        "";

      const lastName =
        input.customer?.lastName ||
        customerName
          .split(" ")
          .filter(Boolean)
          .slice(1)
          .join(" ") ||
        "";

      const email =
        input.customer?.email ??
        "";

      /**
       * Le système PharmaFlow peut fournir :
       *
       * mobile_money
       * mpesa
       * orange
       * airtel
       * africell
       *
       * Pour Moko Afrika, mobile_money doit être
       * converti vers une méthode concrète.
       */
      let method =
        typeof input.paymentMethod ===
        "string"
          ? input.paymentMethod
          : "mobile_money";

      if (
        method ===
        "mobile_money"
      ) {
        method =
          "airtel";
      }

      const callbackUrl =
        getCallbackUrl();

      /**
       * API Moko Afrika v5
       *
       * La documentation utilise "e-mail".
       */
      const payload: Record<
        string,
        unknown
      > = {
        merchant_id:
          merchantId,

        merchant_secrete:
          merchantSecret,

        amount:
          String(input.amount),

        currency:
          input.currency
            .trim()
            .toUpperCase(),

        action:
          "debit",

        customer_number:
          customerPhone,

        firstname:
          firstName,

        lastname:
          lastName,

        "e-mail":
          email,

        reference:
          input.merchantReference,

        method,

        callback_url:
          callbackUrl,
      };

      const url =
        getBaseUrl();

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

              cache:
                "no-store",
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

        if (!response.ok) {
          return {
            success: false,

            status: "failed",

            merchantReference:
              input.merchantReference,

            message:
              getErrorMessage(
                data,
                "Moko Afrika a refusé la demande de paiement.",
              ),

            errorCode:
              `MOKO_AFRIKA_HTTP_${response.status}`,

            metadata: {
              provider_response:
                record,
            },
          };
        }

        /**
         * IMPORTANT :
         *
         * Moko Afrika indique que la réponse initiale
         * est une confirmation de réception de la demande.
         *
         * Elle ne signifie pas forcément que le paiement
         * est déjà réussi.
         */
        const rawStatus =
          getString(
            record,
            "Trans_Status",
            "trans_status",
            "status",
            "Status",
          ) ||
          "pending";

        const status =
          normalizePaymentStatus(
            rawStatus,
          );

        const providerTransactionId =
          getString(
            record,
            "Transaction_id",
            "Transaction_ID",
            "transaction_id",
            "transactionId",
            "id",
          );

        const responseReference =
          getString(
            record,
            "Reference",
            "reference",
          );

        return {
          success:
            status ===
            "successful",

          status,

          providerTransactionId,

          merchantReference:
            responseReference ||
            input.merchantReference,

          checkoutUrl:
            getString(
              record,
              "checkout_url",
              "checkoutUrl",
              "url",
            ),

          message:
            getErrorMessage(
              record,
              "Demande de paiement Moko Afrika reçue.",
            ),

          metadata: {
            provider_response:
              record,

            payment_method:
              method,
          },
        };
      } catch (error) {
        console.error(
          "MOKO AFRIKA CREATE:",
          error,
        );

        return {
          success: false,

          status: "failed",

          merchantReference:
            input.merchantReference,

          message:
            "Impossible de contacter Moko Afrika.",

          errorCode:
            "MOKO_AFRIKA_NETWORK_ERROR",
        };
      }
    },

    /* ---------------------------------------------------------------------- */
    /* VERIFY PAYMENT                                                         */
    /* ---------------------------------------------------------------------- */

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
            "Moko Afrika n'est pas configuré.",
        };
      }

      if (
        !input.merchantReference &&
        !input.providerTransactionId
      ) {
        return {
          success: false,

          status: "failed",

          merchantReference:
            null,

          providerTransactionId:
            null,

          message:
            "Référence Moko Afrika manquante.",
        };
      }

      /**
       * Pour le endpoint verify, Moko Afrika
       * attend une référence.
       */
      const reference =
        input.merchantReference ||
        input.providerTransactionId ||
        "";

      const payload = {
        merchant_id:
          merchantId,

        merchant_secrete:
          merchantSecret,

        action:
          "verify",

        reference,
      };

      const url =
        getBaseUrl();

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

              cache:
                "no-store",
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

        if (!response.ok) {
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
              getErrorMessage(
                data,
                "Impossible de vérifier le paiement Moko Afrika.",
              ),

            metadata: {
              provider_response:
                record,
            },
          };
        }

        const rawStatus =
          getString(
            record,
            "Trans_Status",
            "trans_status",
            "status",
            "Status",
          ) ||
          "pending";

        const status =
          normalizePaymentStatus(
            rawStatus,
          );

        const amount =
          getNumber(
            record,
            "Amount",
            "amount",
          );

        const currency =
          getString(
            record,
            "Currency",
            "currency",
          );

        const providerTransactionId =
          getString(
            record,
            "Transaction_id",
            "Transaction_ID",
            "transaction_id",
            "transactionId",
          ) ||
          input.providerTransactionId ||
          null;

        const merchantReference =
          getString(
            record,
            "Reference",
            "reference",
          ) ||
          input.merchantReference ||
          null;

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
            status ===
            "successful"
              ? "Paiement Moko Afrika confirmé."
              : status ===
                  "failed"
                ? "Paiement Moko Afrika échoué."
                : "Paiement Moko Afrika toujours en attente.",

          metadata: {
            provider_response:
              record,
          },
        };
      } catch (error) {
        console.error(
          "MOKO AFRIKA VERIFY:",
          error,
        );

        return {
          success: false,

          status: "pending",

          merchantReference:
            input.merchantReference ??
            null,

          providerTransactionId:
            input.providerTransactionId ??
            null,

          message:
            "Vérification Moko Afrika temporairement indisponible.",
        };
      }
    },

    /* ---------------------------------------------------------------------- */
    /* WEBHOOK                                                                */
    /* ---------------------------------------------------------------------- */

    parseWebhook(
      payload: unknown,
      headers?: Headers,
    ): PaymentWebhookResult {
      void headers;

      const record =
        getRecord(payload);

      const status =
        normalizePaymentStatus(
          record.Trans_Status ??
            record.trans_status ??
            record.status ??
            record.payment_status ??
            record.Status,
        );

      const merchantReference =
        getString(
          record,
          "Reference",
          "reference",
          "merchant_reference",
        );

      const providerTransactionId =
        getString(
          record,
          "Transaction_id",
          "Transaction_ID",
          "transaction_id",
          "transactionId",
          "PayDRC_Reference",
          "id",
        );

      const amount =
        getNumber(
          record,
          "Amount",
          "amount",
        );

      const currency =
        getString(
          record,
          "Currency",
          "currency",
        );

      const paymentMethod =
        getString(
          record,
          "Method",
          "method",
        );

      const message =
        getString(
          record,
          "Trans_Status_Description",
          "Status_Description",
          "Comment",
          "message",
          "Message",
        ) ||
        "Webhook Moko Afrika reçu.";

      return {
        success:
          status ===
          "successful",

        status,

        merchantReference,

        providerTransactionId,

        amount,

        currency,

        paymentMethod,

        message,

        metadata: {
          webhook:
            record,
        },
      };
    },
  };

/**
 * Alias conservé pour compatibilité avec le reste
 * du projet si ce nom est déjà utilisé ailleurs.
 */
export const mokoAfrikaProvider =
  mokoAfrikaAdapter;