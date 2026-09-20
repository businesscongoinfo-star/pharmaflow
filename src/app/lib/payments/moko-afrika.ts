import "server-only";

import crypto from "crypto";

import {
  getRuntimeIntegrationValue,
} from "@/app/lib/integrations/config";

import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProviderAdapter,
  PaymentWebhookResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "./types";

import {
  normalizePaymentStatus,
} from "./types";

/*
|--------------------------------------------------------------------------
| MOKO AFRIKA / FRESHPAY
|--------------------------------------------------------------------------
|
| Ce provider gère deux rails :
|
| 1. MOBILE MONEY
|    FreshPay Gateway
|    POST /api/v1/gateway
|
| 2. CARTE
|    Moko Checkout
|    POST /api/v1/payment/orders
|    POST /api/v1/payment/status
|
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
|
| Les secrets restent exclusivement côté serveur.
|
| Le type de paiement est déterminé par :
|
| metadata.rail = "card"
| metadata.rail = "mobile_money"
|
| On ne déduit PAS le rail à partir du format du
| transaction_uuid.
|
|--------------------------------------------------------------------------
*/

/* ==========================================================================
 * TYPES
 * ========================================================================== */

type JsonRecord = Record<string, unknown>;

/* ==========================================================================
 * URLS PAR DÉFAUT
 * ========================================================================== */

const DEFAULT_MOBILE_MONEY_BASE_URL =
  "https://api.gofreshpay.com/api/v1/gateway";

const DEFAULT_CARD_BASE_URL =
  "https://sandbox.gofreshpay.com";

const DEFAULT_CARD_PRODUCTION_BASE_URL =
  "https://card.gofreshpay.com";

/* ==========================================================================
 * HELPERS
 * ========================================================================== */

function clean(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function asRecord(
  value: unknown,
): JsonRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as JsonRecord;
}

function toNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
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

  return null;
}

function getNestedString(
  object: JsonRecord,
  key: string,
): string {
  return clean(object[key]);
}

function getEnv(
  name: string,
): string {
  return clean(
    process.env[name],
  );
}

function getMode():
  | "sandbox"
  | "production" {
  const mode =
    getEnv(
      "MOKO_AFRIKA_MODE",
    ).toLowerCase();

  return mode ===
    "production"
    ? "production"
    : "sandbox";
}

/* ==========================================================================
 * RUNTIME CONFIGURATION
 * ========================================================================== */

async function runtimeValue(
  key: string,
  envName: string,
): Promise<string> {
  try {
    const value =
      await getRuntimeIntegrationValue(
        "moko_afrika",
        key,
        getEnv(envName),
      );

    return clean(value);
  } catch {
    return getEnv(envName);
  }
}

/* ==========================================================================
 * MOBILE MONEY CONFIGURATION
 * ========================================================================== */

async function getMobileMoneyConfig() {
  const mode =
    getMode();

  const baseUrl =
    (await runtimeValue(
      "baseUrl",
      "MOKO_AFRIKA_BASE_URL",
    )) ||
    DEFAULT_MOBILE_MONEY_BASE_URL;

  const merchantId =
    await runtimeValue(
      "merchantId",
      "MOKO_AFRIKA_MERCHANT_ID",
    );

  const merchantSecret =
    await runtimeValue(
      "merchantSecret",
      "MOKO_AFRIKA_MERCHANT_SECRET",
    );

  const callbackUrl =
    await runtimeValue(
      "callbackUrl",
      "MOKO_AFRIKA_CALLBACK_URL",
    );

  return {
    mode,

    baseUrl:
      baseUrl.replace(
        /\/+$/,
        "",
      ),

    merchantId,

    merchantSecret,

    callbackUrl,
  };
}

/* ==========================================================================
 * CARD CONFIGURATION
 * ========================================================================== */

async function getCardConfig() {
  const mode =
    getMode();

  const defaultBaseUrl =
    mode === "production"
      ? DEFAULT_CARD_PRODUCTION_BASE_URL
      : DEFAULT_CARD_BASE_URL;

  const baseUrl =
    (await runtimeValue(
      "cardBaseUrl",
      "MOKO_AFRIKA_CARD_BASE_URL",
    )) ||
    defaultBaseUrl;

  const apiKey =
    await runtimeValue(
      "cardApiKey",
      "MOKO_AFRIKA_CARD_API_KEY",
    );

  const apiSecret =
    await runtimeValue(
      "cardApiSecret",
      "MOKO_AFRIKA_CARD_API_SECRET",
    );

  const callbackSecret =
    await runtimeValue(
      "cardCallbackSecret",
      "MOKO_AFRIKA_CARD_CALLBACK_SECRET",
    );

  const callbackUrl =
    await runtimeValue(
      "cardCallbackUrl",
      "MOKO_AFRIKA_CARD_CALLBACK_URL",
    );

  const returnUrl =
    await runtimeValue(
      "cardReturnUrl",
      "MOKO_AFRIKA_CARD_RETURN_URL",
    );

  const cancelUrl =
    await runtimeValue(
      "cardCancelUrl",
      "MOKO_AFRIKA_CARD_CANCEL_URL",
    );

  return {
    mode,

    baseUrl:
      baseUrl.replace(
        /\/+$/,
        "",
      ),

    apiKey,

    apiSecret,

    callbackSecret,

    callbackUrl,

    returnUrl,

    cancelUrl,
  };
}

/* ==========================================================================
 * SIGNATURE MOKO CHECKOUT
 *
 * Requête :
 *
 * JSON_BODY + timestamp
 *
 * HMAC-SHA256
 * ========================================================================== */

function createMokoRequestSignature(
  rawBody: string,
  timestamp: string,
  secret: string,
): string {
  return crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(
      `${rawBody}${timestamp}`,
      "utf8",
    )
    .digest("hex");
}

/* ==========================================================================
 * SIGNATURE CALLBACK
 *
 * timestamp + rawBody
 * ========================================================================== */

function createCallbackSignature(
  rawBody: string,
  timestamp: string,
  callbackSecret: string,
): string {
  return crypto
    .createHmac(
      "sha256",
      callbackSecret,
    )
    .update(
      `${timestamp}${rawBody}`,
      "utf8",
    )
    .digest("hex");
}

/* ==========================================================================
 * TIMESTAMP CALLBACK
 * ========================================================================== */

function verifyTimestamp(
  timestamp: string,
): boolean {
  const parsed =
    Number(timestamp);

  if (
    !Number.isFinite(parsed)
  ) {
    return false;
  }

  const now =
    Math.floor(
      Date.now() / 1000,
    );

  return (
    Math.abs(
      now - parsed,
    ) <= 30
  );
}

/* ==========================================================================
 * CARD — CREATE CHECKOUT
 * ========================================================================== */

async function createCardPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const config =
    await getCardConfig();

  /* ------------------------------------------------------------------------
   * API KEY
   * ---------------------------------------------------------------------- */

  if (!config.apiKey) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Moko Afrika Card API Key non configurée.",

      errorCode:
        "MOKO_CARD_API_KEY_MISSING",
    };
  }

  /* ------------------------------------------------------------------------
   * API SECRET
   * ---------------------------------------------------------------------- */

  if (!config.apiSecret) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Moko Afrika Card API Secret non configurée.",

      errorCode:
        "MOKO_CARD_API_SECRET_MISSING",
    };
  }

  /* ------------------------------------------------------------------------
   * CALLBACK
   * ---------------------------------------------------------------------- */

  if (!config.callbackUrl) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Moko Afrika Card Callback URL non configurée.",

      errorCode:
        "MOKO_CARD_CALLBACK_URL_MISSING",
    };
  }

  /* ------------------------------------------------------------------------
   * CLIENT
   * ---------------------------------------------------------------------- */

  if (!input.customer) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Les informations client sont obligatoires pour Moko Checkout.",

      errorCode:
        "MOKO_CARD_CUSTOMER_MISSING",
    };
  }

  const customer =
    input.customer;

  const firstName =
    customer.firstName ||
    customer.name
      ?.split(" ")[0] ||
    "";

  const lastName =
    customer.lastName ||
    customer.name
      ?.split(" ")
      .slice(1)
      .join(" ") ||
    "";

  const phone =
    clean(
      customer.phone,
    );

  if (
    !firstName ||
    !lastName
  ) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Le prénom et le nom du client sont obligatoires.",

      errorCode:
        "MOKO_CARD_CUSTOMER_NAME_MISSING",
    };
  }

  if (
    !clean(
      customer.email,
    )
  ) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "L'adresse email du client est obligatoire.",

      errorCode:
        "MOKO_CARD_CUSTOMER_EMAIL_MISSING",
    };
  }

  if (!phone) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Le téléphone du client est obligatoire.",

      errorCode:
        "MOKO_CARD_CUSTOMER_PHONE_MISSING",
    };
  }

  if (
    !clean(
      customer.addressLine1,
    )
  ) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "L'adresse du client est obligatoire.",

      errorCode:
        "MOKO_CARD_ADDRESS_MISSING",
    };
  }

  if (
    !clean(
      customer.city,
    )
  ) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "La ville du client est obligatoire.",

      errorCode:
        "MOKO_CARD_CITY_MISSING",
    };
  }

  if (
    !clean(
      customer.countryCode,
    )
  ) {
    return {
      success: false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Le code pays du client est obligatoire.",

      errorCode:
        "MOKO_CARD_COUNTRY_MISSING",
    };
  }

  /* ------------------------------------------------------------------------
   * DEVISE
   * ---------------------------------------------------------------------- */

  const currency =
    clean(
      input.currency,
    ).toUpperCase() ||
    "USD";

  /* ------------------------------------------------------------------------
   * PAYLOAD
   * ---------------------------------------------------------------------- */

  const rawPayload:
    JsonRecord = {
    amount:
      Number(
        input.amount,
      ),

    currency,

    merchant_reference:
      input.merchantReference,

    callback_url:
      config.callbackUrl,

    ...(config.returnUrl
      ? {
          return_url:
            config.returnUrl,
        }
      : {}),

    ...(config.cancelUrl
      ? {
          cancel_url:
            config.cancelUrl,
        }
      : {}),

    bill_to_forename:
      firstName,

    bill_to_surname:
      lastName,

    bill_to_email:
      clean(
        customer.email,
      ),

    bill_to_phone:
      phone,

    bill_to_address_line1:
      clean(
        customer.addressLine1,
      ),

    bill_to_address_city:
      clean(
        customer.city,
      ),

    bill_to_address_country:
      clean(
        customer.countryCode,
      ).toUpperCase(),

    ...(customer.state
      ? {
          bill_to_address_state:
            clean(
              customer.state,
            ),
        }
      : {}),

    ...(customer.postalCode
      ? {
          bill_to_address_postal_code:
            clean(
              customer.postalCode,
            ),
        }
      : {}),
  };

  /*
   * Le rail est explicitement card.
   */

  const rawBody =
    JSON.stringify(
      rawPayload,
    );

  /* ------------------------------------------------------------------------
   * TIMESTAMP
   * ---------------------------------------------------------------------- */

  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /\.\d+Z$/,
        "Z",
      );

  /* ------------------------------------------------------------------------
   * SIGNATURE
   * ---------------------------------------------------------------------- */

  const signature =
    createMokoRequestSignature(
      rawBody,
      timestamp,
      config.apiSecret,
    );

  /* ------------------------------------------------------------------------
   * ENDPOINT
   * ---------------------------------------------------------------------- */

  const endpoint =
    `${config.baseUrl}/api/v1/payment/orders`;

  try {
    const response =
      await fetch(
        endpoint,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-API-Key":
              config.apiKey,

            "X-Timestamp":
              timestamp,

            "X-Signature":
              signature,
          },

          body:
            rawBody,

          cache:
            "no-store",
        },
      );

    const responseText =
      await response.text();

    let responseJson:
      unknown = {};

    try {
      responseJson =
        responseText
          ? JSON.parse(
              responseText,
            )
          : {};
    } catch {
      responseJson = {};
    }

    const root =
      asRecord(
        responseJson,
      );

    const data =
      asRecord(
        root.data,
      );

    /* ----------------------------------------------------------------------
     * CHECKOUT URL
     * -------------------------------------------------------------------- */

    const checkoutUrl =
      getNestedString(
        data,
        "links",
      ) ||
      getNestedString(
        data,
        "checkout_url",
      ) ||
      getNestedString(
        root,
        "checkout_url",
      );

    /* ----------------------------------------------------------------------
     * TRANSACTION UUID
     * -------------------------------------------------------------------- */

    const transactionUuid =
      getNestedString(
        data,
        "transaction_uuid",
      ) ||
      getNestedString(
        root,
        "transaction_uuid",
      );

    /* ----------------------------------------------------------------------
     * STATUS
     * -------------------------------------------------------------------- */

    const transactionStatus =
      normalizePaymentStatus(
        getNestedString(
          data,
          "transaction_status",
        ) ||
          getNestedString(
            root,
            "transaction_status",
          ) ||
          "pending",
      );

    /* ----------------------------------------------------------------------
     * HTTP ERROR
     * -------------------------------------------------------------------- */

    if (!response.ok) {
      const detail =
        getNestedString(
          root,
          "detail",
        ) ||
        getNestedString(
          root,
          "message",
        ) ||
        `Moko Afrika a retourné HTTP ${response.status}.`;

      return {
        success:
          false,

        status:
          "failed",

        providerTransactionId:
          transactionUuid ||
          null,

        merchantReference:
          input.merchantReference,

        message:
          detail,

        errorCode:
          `MOKO_HTTP_${response.status}`,

        metadata: {
          provider:
            "moko_afrika",

          rail:
            "card",

          response:
            responseJson,
        },
      };
    }

    /* ----------------------------------------------------------------------
     * CHECKOUT URL MANQUANTE
     * -------------------------------------------------------------------- */

    if (!checkoutUrl) {
      return {
        success:
          false,

        status:
          "failed",

        providerTransactionId:
          transactionUuid ||
          null,

        merchantReference:
          input.merchantReference,

        message:
          "Moko Afrika n'a pas retourné l'URL Hosted Checkout.",

        errorCode:
          "MOKO_CHECKOUT_URL_MISSING",

        metadata: {
          provider:
            "moko_afrika",

          rail:
            "card",

          response:
            responseJson,
        },
      };
    }

    /* ----------------------------------------------------------------------
     * SUCCESS DE CRÉATION
     * -------------------------------------------------------------------- */

    return {
      success:
        true,

      status:
        transactionStatus ===
        "successful"
          ? "successful"
          : "pending",

      providerTransactionId:
        transactionUuid ||
        null,

      merchantReference:
        input.merchantReference,

      checkoutUrl,

      message:
        "Checkout Moko Afrika créé. Redirection du client vers la page de paiement.",

      metadata: {
        provider:
          "moko_afrika",

        rail:
          "card",

        response:
          responseJson,
      },
    };
  } catch (error) {
    return {
      success:
        false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        error instanceof Error
          ? error.message
          : "Erreur réseau Moko Afrika.",

      errorCode:
        "MOKO_NETWORK_ERROR",

      metadata: {
        provider:
          "moko_afrika",

        rail:
          "card",
      },
    };
  }
}

/* ==========================================================================
 * CARD — VERIFY STATUS
 * ========================================================================== */

async function verifyCardPayment(
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const config =
    await getCardConfig();

  if (
    !config.apiKey ||
    !config.apiSecret
  ) {
    return {
      success:
        false,

      status:
        "failed",

      providerTransactionId:
        input.providerTransactionId ||
        null,

      merchantReference:
        input.merchantReference ||
        null,

      message:
        "Les identifiants Moko Checkout ne sont pas configurés.",

      failureReason:
        "MOKO_CARD_CREDENTIALS_MISSING",
    };
  }

  if (
    !input.providerTransactionId
  ) {
    return {
      success:
        false,

      status:
        "failed",

      merchantReference:
        input.merchantReference ||
        null,

      message:
        "transaction_uuid requis pour vérifier le paiement Moko.",

      failureReason:
        "TRANSACTION_UUID_MISSING",
    };
  }

  const payload = {
    transaction_uuid:
      input.providerTransactionId,
  };

  const rawBody =
    JSON.stringify(
      payload,
    );

  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /\.\d+Z$/,
        "Z",
      );

  const signature =
    createMokoRequestSignature(
      rawBody,
      timestamp,
      config.apiSecret,
    );

  try {
    const response =
      await fetch(
        `${config.baseUrl}/api/v1/payment/status`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-API-Key":
              config.apiKey,

            "X-Timestamp":
              timestamp,

            "X-Signature":
              signature,
          },

          body:
            rawBody,

          cache:
            "no-store",
        },
      );

    const responseText =
      await response.text();

    let responseJson:
      unknown = {};

    try {
      responseJson =
        responseText
          ? JSON.parse(
              responseText,
            )
          : {};
    } catch {
      responseJson = {};
    }

    const root =
      asRecord(
        responseJson,
      );

    const data =
      asRecord(
        root.data,
      );

    const providerStatus =
      getNestedString(
        data,
        "transaction_status",
      ) ||
      getNestedString(
        root,
        "transaction_status",
      );

    const normalizedStatus =
      normalizePaymentStatus(
        providerStatus,
      );

    const amount =
      toNumber(
        data.amount,
      ) ??
      toNumber(
        root.amount,
      );

    const currency =
      getNestedString(
        data,
        "currency",
      ) ||
      getNestedString(
        root,
        "currency",
      ) ||
      null;

    const merchantReference =
      getNestedString(
        data,
        "merchant_reference",
      ) ||
      getNestedString(
        root,
        "merchant_reference",
      ) ||
      input.merchantReference ||
      null;

    if (!response.ok) {
      return {
        success:
          false,

        status:
          "failed",

        providerTransactionId:
          input.providerTransactionId,

        merchantReference,

        amount,

        currency,

        message:
          getNestedString(
            root,
            "detail",
          ) ||
          getNestedString(
            root,
            "message",
          ) ||
          `Erreur Moko HTTP ${response.status}.`,

        failureReason:
          `MOKO_HTTP_${response.status}`,

        metadata: {
          provider:
            "moko_afrika",

          rail:
            "card",

          response:
            responseJson,
        },
      };
    }

    return {
      success:
        normalizedStatus ===
        "successful",

      status:
        normalizedStatus,

      providerTransactionId:
        getNestedString(
          data,
          "transaction_uuid",
        ) ||
        input.providerTransactionId,

      merchantReference,

      amount,

      currency,

      message:
        getNestedString(
          data,
          "message",
        ) ||
        getNestedString(
          root,
          "message",
        ) ||
        null,

      failureReason:
        normalizedStatus ===
        "failed"
          ? getNestedString(
              data,
              "message",
            ) || null
          : null,

      metadata: {
        provider:
          "moko_afrika",

        rail:
          "card",

        decision:
          getNestedString(
            data,
            "decision",
          ) || null,

        cardType:
          getNestedString(
            data,
            "card_type",
          ) || null,

        cardLast4:
          getNestedString(
            data,
            "card_last4",
          ) || null,

        cardScheme:
          getNestedString(
            data,
            "card_scheme",
          ) || null,

        response:
          responseJson,
      },
    };
  } catch (error) {
    return {
      success:
        false,

      status:
        "failed",

      providerTransactionId:
        input.providerTransactionId,

      merchantReference:
        input.merchantReference ||
        null,

      message:
        error instanceof Error
          ? error.message
          : "Erreur réseau Moko Afrika.",

      failureReason:
        "MOKO_NETWORK_ERROR",

      metadata: {
        provider:
          "moko_afrika",

        rail:
          "card",
      },
    };
  }
}

/* ==========================================================================
 * MOBILE MONEY — CREATE
 * ========================================================================== */

async function createMobileMoneyPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const config =
    await getMobileMoneyConfig();

  if (
    !config.merchantId
  ) {
    return {
      success:
        false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Moko Afrika Merchant ID non configuré.",

      errorCode:
        "MOKO_MERCHANT_ID_MISSING",
    };
  }

  if (
    !config.merchantSecret
  ) {
    return {
      success:
        false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Moko Afrika Merchant Secret non configuré.",

      errorCode:
        "MOKO_MERCHANT_SECRET_MISSING",
    };
  }

  const method =
    clean(
      input.paymentMethod,
    ) ||
    "mobile_money";

  const customerNumber =
    clean(
      input.customer?.phone,
    );

  if (
    !customerNumber
  ) {
    return {
      success:
        false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        "Le numéro Mobile Money du client est obligatoire.",

      errorCode:
        "MOKO_CUSTOMER_NUMBER_MISSING",
    };
  }

  const payload:
    JsonRecord = {
    merchant_id:
      config.merchantId,

    merchant_secrete:
      config.merchantSecret,

    amount:
      String(
        input.amount,
      ),

    currency:
      input.currency,

    action:
      "debit",

    customer_number:
      customerNumber,

    firstname:
      input.customer
        ?.firstName ||
      input.customer
        ?.name ||
      "",

    lastname:
      input.customer
        ?.lastName ||
      "",

    email:
      input.customer
        ?.email ||
      "",

    reference:
      input.merchantReference,

    method,

    ...(config.callbackUrl
      ? {
          callback_url:
            config.callbackUrl,
        }
      : {}),
  };

  try {
    const response =
      await fetch(
        config.baseUrl,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
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

    const responseText =
      await response.text();

    let responseJson:
      unknown = {};

    try {
      responseJson =
        responseText
          ? JSON.parse(
              responseText,
            )
          : {};
    } catch {
      responseJson = {};
    }

    const root =
      asRecord(
        responseJson,
      );

    const transactionId =
      getNestedString(
        root,
        "Transaction_id",
      ) ||
      getNestedString(
        root,
        "transaction_id",
      );

    const providerStatus =
      getNestedString(
        root,
        "Trans_Status",
      ) ||
      getNestedString(
        root,
        "Status",
      );

    const normalized =
      normalizePaymentStatus(
        providerStatus,
      );

    if (
      !response.ok
    ) {
      return {
        success:
          false,

        status:
          "failed",

        providerTransactionId:
          transactionId ||
          null,

        merchantReference:
          input.merchantReference,

        message:
          getNestedString(
            root,
            "Comment",
          ) ||
          getNestedString(
            root,
            "message",
          ) ||
          `FreshPay HTTP ${response.status}.`,

        errorCode:
          `FRESHPAY_HTTP_${response.status}`,

        metadata: {
          provider:
            "moko_afrika",

          rail:
            "mobile_money",

          response:
            responseJson,
        },
      };
    }

    /*
     * FreshPay :
     *
     * Status = Success
     *
     * signifie que la requête a été reçue.
     * Le statut final doit être vérifié.
     */

    return {
      success:
        true,

      status:
        normalized ===
        "successful"
          ? "successful"
          : "pending",

      providerTransactionId:
        transactionId ||
        null,

      merchantReference:
        input.merchantReference,

      message:
        getNestedString(
          root,
          "Comment",
        ) ||
        "Demande de paiement reçue par FreshPay.",

      metadata: {
        provider:
          "moko_afrika",

        rail:
          "mobile_money",

        response:
          responseJson,
      },
    };
  } catch (error) {
    return {
      success:
        false,

      status:
        "failed",

      merchantReference:
        input.merchantReference,

      message:
        error instanceof Error
          ? error.message
          : "Erreur réseau FreshPay.",

      errorCode:
        "FRESHPAY_NETWORK_ERROR",

      metadata: {
        provider:
          "moko_afrika",

        rail:
          "mobile_money",
      },
    };
  }
}

/* ==========================================================================
 * MOBILE MONEY — VERIFY
 * ========================================================================== */

async function verifyMobileMoneyPayment(
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const config =
    await getMobileMoneyConfig();

  if (
    !config.merchantId ||
    !config.merchantSecret
  ) {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "Les identifiants FreshPay ne sont pas configurés.",

      failureReason:
        "FRESHPAY_CREDENTIALS_MISSING",
    };
  }

  if (
    !input.merchantReference
  ) {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "La référence marchand est obligatoire.",

      failureReason:
        "MERCHANT_REFERENCE_MISSING",
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
        config.baseUrl,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
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

    const responseText =
      await response.text();

    let responseJson:
      unknown = {};

    try {
      responseJson =
        responseText
          ? JSON.parse(
              responseText,
            )
          : {};
    } catch {
      responseJson = {};
    }

    const root =
      asRecord(
        responseJson,
      );

    const providerStatus =
      getNestedString(
        root,
        "Trans_Status",
      );

    const normalized =
      normalizePaymentStatus(
        providerStatus,
      );

    const amount =
      toNumber(
        root.Amount,
      );

    const currency =
      getNestedString(
        root,
        "Currency",
      ) || null;

    const transactionId =
      getNestedString(
        root,
        "Transaction_id",
      ) || null;

    if (
      !response.ok
    ) {
      return {
        success:
          false,

        status:
          "failed",

        providerTransactionId:
          transactionId,

        merchantReference:
          input.merchantReference,

        amount,

        currency,

        message:
          getNestedString(
            root,
            "Trans_Status_Description",
          ) ||
          getNestedString(
            root,
            "Comment",
          ) ||
          `FreshPay HTTP ${response.status}.`,

        failureReason:
          `FRESHPAY_HTTP_${response.status}`,

        metadata: {
          provider:
            "moko_afrika",

          rail:
            "mobile_money",

          response:
            responseJson,
        },
      };
    }

    return {
      success:
        normalized ===
        "successful",

      status:
        normalized,

      providerTransactionId:
        transactionId,

      merchantReference:
        getNestedString(
          root,
          "Reference",
        ) ||
        input.merchantReference,

      amount,

      currency,

      message:
        getNestedString(
          root,
          "Trans_Status_Description",
        ) ||
        getNestedString(
          root,
          "Comment",
        ) ||
        null,

      failureReason:
        normalized ===
        "failed"
          ? getNestedString(
              root,
              "Trans_Status_Description",
            ) || null
          : null,

      metadata: {
        provider:
          "moko_afrika",

        rail:
          "mobile_money",

        method:
          getNestedString(
            root,
            "Method",
          ) || null,

        response:
          responseJson,
      },
    };
  } catch (error) {
    return {
      success:
        false,

      status:
        "failed",

      merchantReference:
        input.merchantReference ||
        null,

      providerTransactionId:
        input.providerTransactionId ||
        null,

      message:
        error instanceof Error
          ? error.message
          : "Erreur réseau FreshPay.",

      failureReason:
        "FRESHPAY_NETWORK_ERROR",

      metadata: {
        provider:
          "moko_afrika",

        rail:
          "mobile_money",
      },
    };
  }
}

/* ==========================================================================
 * PUBLIC ADAPTER
 * ========================================================================== */

export const mokoAfrikaAdapter:
  PaymentProviderAdapter = {
  code:
    "moko_afrika",

  name:
    "Moko Afrika",

  config: {
    code:
      "moko_afrika",

    name:
      "Moko Afrika",

    mode:
      getMode(),

    baseUrl:
      getEnv(
        "MOKO_AFRIKA_BASE_URL",
      ) ||
      DEFAULT_MOBILE_MONEY_BASE_URL,

    countries: [
      "CD",
    ],

    currencies: [
      "USD",
      "CDF",
    ],

    paymentMethods: [
      "mobile_money",
      "visa",
      "mastercard",
      "card",
    ],

    enabled:
      Boolean(
        getEnv(
          "MOKO_AFRIKA_MERCHANT_SECRET",
        ) ||
          getEnv(
            "MOKO_AFRIKA_CARD_API_SECRET",
          ),
      ),
  },

  /* ========================================================================
   * CREATE PAYMENT
   * ====================================================================== */

  async createPayment(
    input,
  ) {
    /*
     * CARTE
     */

    if (
      input.paymentMethodType ===
        "card" ||
      input.paymentMethod ===
        "card" ||
      input.paymentMethod ===
        "visa" ||
      input.paymentMethod ===
        "mastercard"
    ) {
      return createCardPayment(
        input,
      );
    }

    /*
     * MOBILE MONEY
     */

    return createMobileMoneyPayment(
      input,
    );
  },

  /* ========================================================================
   * VERIFY PAYMENT
   * ====================================================================== */

  async verifyPayment(
    input,
  ) {
    /*
     * IMPORTANT :
     *
     * Le rail est déterminé à partir de metadata.rail.
     *
     * Exemple :
     *
     * metadata: {
     *   rail: "card"
     * }
     *
     * ou :
     *
     * metadata: {
     *   rail: "mobile_money"
     * }
     */

    const metadata =
      input.metadata &&
      typeof input.metadata ===
        "object"
        ? input.metadata
        : {};

    const rail =
      typeof metadata.rail ===
      "string"
        ? metadata.rail
            .trim()
            .toLowerCase()
        : "";

    /*
     * CARTE
     */

    if (
      rail === "card" ||
      rail === "visa" ||
      rail === "mastercard"
    ) {
      return verifyCardPayment(
        input,
      );
    }

    /*
     * MOBILE MONEY
     */

    return verifyMobileMoneyPayment(
      input,
    );
  },

  /* ========================================================================
   * VERIFY WEBHOOK SIGNATURE
   * ====================================================================== */

  verifyWebhookSignature(
    payload: string,
    headers: Headers,
  ): boolean {
    const header =
      headers.get(
        "X-FreshPay-Signature",
      ) ||
      headers.get(
        "x-freshpay-signature",
      );

    const callbackSecret =
      getEnv(
        "MOKO_AFRIKA_CARD_CALLBACK_SECRET",
      );

    if (
      !header ||
      !callbackSecret
    ) {
      return false;
    }

    const match =
      /^t=(\d+),v1=(.+)$/.exec(
        header.trim(),
      );

    if (!match) {
      return false;
    }

    const timestamp =
      match[1];

    const receivedSignature =
      match[2];

    if (
      !verifyTimestamp(
        timestamp,
      )
    ) {
      return false;
    }

    const expectedSignature =
      createCallbackSignature(
        payload,
        timestamp,
        callbackSecret,
      );

    if (
      expectedSignature.length !==
      receivedSignature.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(
        expectedSignature,
      ),
      Buffer.from(
        receivedSignature,
      ),
    );
  },
};

/* ==========================================================================
 * MOKO CARD WEBHOOK PARSER
 * ==========================================================================
 *
 * Utilisé par :
 *
 * /api/payments/webhook
 *
 * ou :
 *
 * /api/payments/moko-afrika/card-webhook
 *
 * Le raw body est obligatoire afin de vérifier correctement
 * X-FreshPay-Signature.
 * ========================================================================== */

export async function parseMokoCardWebhook(
  rawBody: string,
  headers: Headers,
): Promise<PaymentWebhookResult> {
  const config =
    await getCardConfig();

  /* ------------------------------------------------------------------------
   * SIGNATURE
   * ---------------------------------------------------------------------- */

  const header =
    headers.get(
      "X-FreshPay-Signature",
    ) ||
    headers.get(
      "x-freshpay-signature",
    );

  if (!header) {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "Signature Moko Afrika absente.",

      failureReason:
        "SIGNATURE_MISSING",
    };
  }

  /* ------------------------------------------------------------------------
   * CALLBACK SECRET
   * ---------------------------------------------------------------------- */

  if (
    !config.callbackSecret
  ) {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "Moko Afrika Callback Secret non configuré.",

      failureReason:
        "CALLBACK_SECRET_MISSING",
    };
  }

  /* ------------------------------------------------------------------------
   * FORMAT SIGNATURE
   *
   * t=timestamp,v1=signature
   * ---------------------------------------------------------------------- */

  const match =
    /^t=(\d+),v1=(.+)$/.exec(
      header.trim(),
    );

  if (!match) {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "Format de signature Moko Afrika invalide.",

      failureReason:
        "INVALID_SIGNATURE_FORMAT",
    };
  }

  const timestamp =
    match[1];

  const receivedSignature =
    match[2];

  /* ------------------------------------------------------------------------
   * TIMESTAMP
   * ---------------------------------------------------------------------- */

  if (
    !verifyTimestamp(
      timestamp,
    )
  ) {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "Timestamp du callback Moko Afrika expiré.",

      failureReason:
        "SIGNATURE_TIMESTAMP_EXPIRED",
    };
  }

  /* ------------------------------------------------------------------------
   * SIGNATURE ATTENDUE
   * ---------------------------------------------------------------------- */

  const expectedSignature =
    createCallbackSignature(
      rawBody,
      timestamp,
      config.callbackSecret,
    );

  if (
    expectedSignature.length !==
    receivedSignature.length
  ) {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "Signature Moko Afrika invalide.",

      failureReason:
        "INVALID_SIGNATURE",
    };
  }

  const signaturesEqual =
    crypto.timingSafeEqual(
      Buffer.from(
        expectedSignature,
      ),
      Buffer.from(
        receivedSignature,
      ),
    );

  if (
    !signaturesEqual
  ) {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "Signature Moko Afrika invalide.",

      failureReason:
        "INVALID_SIGNATURE",
    };
  }

  /* ------------------------------------------------------------------------
   * JSON
   * ---------------------------------------------------------------------- */

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        rawBody,
      );
  } catch {
    return {
      success:
        false,

      status:
        "failed",

      message:
        "Payload JSON Moko Afrika invalide.",

      failureReason:
        "INVALID_JSON",
    };
  }

  const data =
    asRecord(
      parsed,
    );

  /* ------------------------------------------------------------------------
   * STATUS
   * ---------------------------------------------------------------------- */

  const providerStatus =
    getNestedString(
      data,
      "status",
    );

  const status =
    normalizePaymentStatus(
      providerStatus,
    );

  /* ------------------------------------------------------------------------
   * AMOUNT
   * ---------------------------------------------------------------------- */

  const amount =
    toNumber(
      data.amount,
    );

  /* ------------------------------------------------------------------------
   * CURRENCY
   * ---------------------------------------------------------------------- */

  const currency =
    getNestedString(
      data,
      "currency",
    ) ||
    null;

  /* ------------------------------------------------------------------------
   * REFERENCE
   * ---------------------------------------------------------------------- */

  const reference =
    getNestedString(
      data,
      "reference",
    ) ||
    null;

  /* ------------------------------------------------------------------------
   * TRANSACTION UUID
   * ---------------------------------------------------------------------- */

  const transactionUuid =
    getNestedString(
      data,
      "transaction_uuid",
    ) ||
    null;

  /* ------------------------------------------------------------------------
   * DECISION
   * ---------------------------------------------------------------------- */

  const decision =
    getNestedString(
      data,
      "decision",
    ) ||
    null;

  /* ------------------------------------------------------------------------
   * MESSAGE
   * ---------------------------------------------------------------------- */

  const message =
    getNestedString(
      data,
      "message",
    ) ||
    null;

  /* ------------------------------------------------------------------------
   * RESULT
   * ---------------------------------------------------------------------- */

  return {
    success:
      status ===
      "successful",

    status,

    merchantReference:
      reference,

    providerTransactionId:
      transactionUuid,

    amount,

    currency,

    paymentMethod:
      "card",

    message,

    failureReason:
      status ===
      "failed"
        ? message
        : null,

    metadata: {
      provider:
        "moko_afrika",

      rail:
        "card",

      decision,

      customerName:
        getNestedString(
          data,
          "customer_name",
        ) ||
        null,

      customerEmail:
        getNestedString(
          data,
          "customer_email",
        ) ||
        null,

      cardType:
        getNestedString(
          data,
          "card_type",
        ) ||
        null,

      cardLast4:
        getNestedString(
          data,
          "card_last4",
        ) ||
        null,

      cardScheme:
        getNestedString(
          data,
          "card_scheme",
        ) ||
        null,

      raw:
        data,
    },
  };
}

/* ==========================================================================
 * COMPATIBILITY ALIAS
 * ========================================================================== */

export const mokoAfrikaProvider =
  mokoAfrikaAdapter;