import crypto from "crypto";

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

/*
|--------------------------------------------------------------------------
| MOKO AFRIKA
|--------------------------------------------------------------------------
|
| Gère :
|
| 1. Mobile Money
|    - M-Pesa
|    - Airtel Money
|    - Orange Money
|    - Africell
|
| 2. Carte bancaire
|    - Visa
|    - Mastercard
|    - Moko Checkout / CyberSource
|
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
|
| Les secrets restent exclusivement côté serveur.
|
| Mobile Money :
|   MOKO_AFRIKA_MERCHANT_ID
|   MOKO_AFRIKA_MERCHANT_SECRET
|
| Callback Mobile Money :
|   MOKO_AFRIKA_WEBHOOK_SECRET
|   MOKO_AFRIKA_WEBHOOK_ENCRYPTION_KEY
|
| Carte :
|   MOKO_AFRIKA_CARD_API_KEY
|   MOKO_AFRIKA_CARD_API_SECRET
|   MOKO_AFRIKA_CARD_CALLBACK_SECRET
|
|--------------------------------------------------------------------------
*/

/* ==========================================================================
   MOBILE MONEY CONFIGURATION
   ========================================================================== */

/*
 * Production historique Moko / PayDRC.
 */
const DEFAULT_MOBILE_MONEY_BASE_URL =
  "https://paydrc.gofreshbakery.net/api/v5";

/*
 * Le nouveau sandbox Moko utilise actuellement :
 *
 * https://api.gofreshpay.com/api/v1/gateway
 *
 * Nous rendons donc le chemin configurable afin de ne pas
 * casser votre configuration de production.
 */
const DEFAULT_MOBILE_MONEY_PATH =
  "/";

function getMobileMoneyBaseUrl(): string {
  return (
    process.env.MOKO_AFRIKA_BASE_URL ||
    DEFAULT_MOBILE_MONEY_BASE_URL
  ).replace(/\/+$/, "");
}

function getMobileMoneyPath(): string {
  const configured =
    (
      process.env.MOKO_AFRIKA_MOBILE_MONEY_PATH ||
      DEFAULT_MOBILE_MONEY_PATH
    ).trim();

  if (!configured) {
    return "/";
  }

  return `/${configured.replace(/^\/+|\/+$/g, "")}`;
}

function getMobileMoneyUrl(): string {
  const base =
    getMobileMoneyBaseUrl();

  const path =
    getMobileMoneyPath();

  if (path === "/") {
    return `${base}/`;
  }

  return `${base}${path}`;
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

function getMobileMoneyCallbackUrl(): string {
  return (
    process.env.MOKO_AFRIKA_CALLBACK_URL ||
    ""
  ).trim();
}

/* ==========================================================================
   MOBILE MONEY WEBHOOK CONFIGURATION
   ========================================================================== */

function getMobileMoneyWebhookSecret(): string {
  return (
    process.env.MOKO_AFRIKA_WEBHOOK_SECRET ||
    process.env.MOKO_AFRIKA_CALLBACK_SECRET ||
    ""
  ).trim();
}

function getMobileMoneyEncryptionKey(): string {
  return (
    process.env.MOKO_AFRIKA_WEBHOOK_ENCRYPTION_KEY ||
    process.env.MOKO_AFRIKA_ENCRYPTION_KEY ||
    ""
  ).trim();
}

/* ==========================================================================
   CARD CONFIGURATION
   ========================================================================== */

function getCardBaseUrl(): string {
  const configured =
    (
      process.env.MOKO_AFRIKA_CARD_BASE_URL ||
      ""
    ).trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (
    getMode() ===
    "production"
  ) {
    return "https://card.gofreshpay.com";
  }

  return "https://sandbox.gofreshpay.com";
}

function getCardApiKey(): string {
  return (
    process.env.MOKO_AFRIKA_CARD_API_KEY ||
    ""
  ).trim();
}

function getCardApiSecret(): string {
  return (
    process.env.MOKO_AFRIKA_CARD_API_SECRET ||
    ""
  ).trim();
}

function getCardCallbackUrl(): string {
  return (
    process.env.MOKO_AFRIKA_CARD_CALLBACK_URL ||
    process.env.MOKO_AFRIKA_CALLBACK_URL ||
    ""
  ).trim();
}

function getCardReturnUrl(): string {
  return (
    process.env.MOKO_AFRIKA_CARD_RETURN_URL ||
    ""
  ).trim();
}

function getCardCancelUrl(): string {
  return (
    process.env.MOKO_AFRIKA_CARD_CANCEL_URL ||
    ""
  ).trim();
}

function getCardCallbackSecret(): string {
  return (
    process.env.MOKO_AFRIKA_CARD_CALLBACK_SECRET ||
    ""
  ).trim();
}

/* ==========================================================================
   COMMON CONFIGURATION
   ========================================================================== */

function getMode():
  | "sandbox"
  | "production" {
  return (
    process.env.MOKO_AFRIKA_MODE ===
    "production"
  )
    ? "production"
    : "sandbox";
}

/* ==========================================================================
   TYPES UTILITIES
   ========================================================================== */

type JsonObject =
  Record<string, unknown>;

function isObject(
  value: unknown,
): value is JsonObject {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function stringValue(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const result =
    String(value).trim();

  return result || null;
}

function numberValue(
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
      Number(
        value
          .trim()
          .replace(",", "."),
      );

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  return null;
}

function upperCurrency(
  value: unknown,
): string | null {
  const currency =
    stringValue(value);

  return currency
    ? currency.toUpperCase()
    : null;
}

function getMetadataString(
  metadata: unknown,
  key: string,
): string {
  if (!isObject(metadata)) {
    return "";
  }

  return (
    stringValue(
      metadata[key],
    ) || ""
  );
}

/* ==========================================================================
   STATUS NORMALIZATION
   ========================================================================== */

function normalizeMokoStatus(
  value: unknown,
) {
  return normalizePaymentStatus(
    value,
  );
}

/* ==========================================================================
   HMAC UTILITIES
   ========================================================================== */

function safeCompareHex(
  received: string,
  expected: string,
): boolean {
  const receivedNormalized =
    received
      .trim()
      .toLowerCase();

  const expectedNormalized =
    expected
      .trim()
      .toLowerCase();

  if (
    !receivedNormalized ||
    !expectedNormalized
  ) {
    return false;
  }

  const receivedBuffer =
    Buffer.from(
      receivedNormalized,
      "hex",
    );

  const expectedBuffer =
    Buffer.from(
      expectedNormalized,
      "hex",
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer,
  );
}

/**
 * Vérification HMAC Mobile Money.
 *
 * Moko documente X-Signature pour les callbacks.
 */
function verifyMobileMoneySignature(
  rawPayload: string,
  receivedSignature: string,
): boolean {
  const secret =
    getMobileMoneyWebhookSecret();

  if (!secret) {
    return false;
  }

  if (!receivedSignature) {
    return false;
  }

  const expected =
    crypto
      .createHmac(
        "sha256",
        secret,
      )
      .update(
        rawPayload,
        "utf8",
      )
      .digest("hex");

  return safeCompareHex(
    receivedSignature,
    expected,
  );
}

/* ==========================================================================
   MOBILE MONEY CALLBACK DECRYPTION
   ========================================================================== */

/**
 * Moko documente un callback pouvant contenir :
 *
 * {
 *   "data": "<ENCRYPTED_PAYLOAD>"
 * }
 *
 * La documentation historique fournit un exemple
 * AES-CBC avec la clé comme IV.
 *
 * Nous supportons :
 *
 * - clé 16 octets -> AES-128-CBC
 * - clé 32 octets -> AES-256-CBC
 *
 * La clé reste exclusivement dans les variables
 * d'environnement serveur.
 */
export function decryptMokoCallbackData(
  encryptedData: string,
): unknown {
  const secret =
    getMobileMoneyEncryptionKey();

  if (!secret) {
    throw new Error(
      "MOKO_AFRIKA_WEBHOOK_ENCRYPTION_KEY manquante.",
    );
  }

  const encrypted =
    Buffer.from(
      encryptedData,
      "base64",
    );

  const key =
    Buffer.from(
      secret,
      "utf8",
    );

  let algorithm:
    | "aes-128-cbc"
    | "aes-256-cbc";

  if (key.length === 16) {
    algorithm =
      "aes-128-cbc";
  } else if (
    key.length === 32
  ) {
    algorithm =
      "aes-256-cbc";
  } else {
    throw new Error(
      "La clé de chiffrement Moko Afrika doit contenir 16 ou 32 octets.",
    );
  }

  /*
   * La documentation Moko montre l'IV égal
   * à la clé pour cet ancien mécanisme de callback.
   */
  const iv =
    key.subarray(
      0,
      16,
    );

  const decipher =
    crypto.createDecipheriv(
      algorithm,
      key,
      iv,
    );

  const decrypted =
    Buffer.concat([
      decipher.update(
        encrypted,
      ),
      decipher.final(),
    ]);

  const text =
    decrypted
      .toString("utf8")
      .trim();

  if (!text) {
    throw new Error(
      "Payload Moko Afrika déchiffré vide.",
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

/* ==========================================================================
   CARD HMAC
   ========================================================================== */

function createCardSignature(
  payload: JsonObject,
  timestamp: string,
): string {
  const message =
    JSON.stringify(payload) +
    timestamp;

  return crypto
    .createHmac(
      "sha256",
      getCardApiSecret(),
    )
    .update(
      message,
      "utf8",
    )
    .digest("hex");
}

function verifyCardCallbackSignature(
  rawBody: string,
  headers: Headers,
): boolean {
  const secret =
    getCardCallbackSecret();

  if (!secret) {
    return false;
  }

  const signatureHeader =
    headers.get(
      "x-freshpay-signature",
    );

  if (!signatureHeader) {
    return false;
  }

  let timestamp = "";
  let receivedSignature =
    "";

  for (
    const part of signatureHeader.split(
      ",",
    )
  ) {
    const separator =
      part.indexOf("=");

    if (
      separator ===
      -1
    ) {
      continue;
    }

    const key =
      part
        .slice(
          0,
          separator,
        )
        .trim();

    const value =
      part
        .slice(
          separator + 1,
        )
        .trim();

    if (
      key === "t"
    ) {
      timestamp =
        value;
    }

    if (
      key === "v1"
    ) {
      receivedSignature =
        value;
    }
  }

  if (
    !timestamp ||
    !receivedSignature
  ) {
    return false;
  }

  const timestampNumber =
    Number(timestamp);

  if (
    Number.isFinite(
      timestampNumber,
    )
  ) {
    const now =
      Math.floor(
        Date.now() /
          1000,
      );

    if (
      Math.abs(
        now -
          timestampNumber,
      ) > 300
    ) {
      return false;
    }
  }

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret,
      )
      .update(
        timestamp +
          rawBody,
        "utf8",
      )
      .digest("hex");

  return safeCompareHex(
    receivedSignature,
    expectedSignature,
  );
}

/* ==========================================================================
   CARD HEADERS
   ========================================================================== */

function getCardHeaders(
  payload: JsonObject,
): Headers {
  const timestamp =
    new Date().toISOString();

  const signature =
    createCardSignature(
      payload,
      timestamp,
    );

  return new Headers({
    "Content-Type":
      "application/json",

    "X-API-Key":
      getCardApiKey(),

    "X-Timestamp":
      timestamp,

    "X-Signature":
      signature,
  });
}

/* ==========================================================================
   CARD BILLING ADDRESS
   ========================================================================== */

function getCardBillingValue(
  input: CreatePaymentInput,
  metadataKey: string,
  envKey: string,
): string {
  const metadataValue =
    getMetadataString(
      input.metadata,
      metadataKey,
    );

  if (
    metadataValue
  ) {
    return metadataValue;
  }

  return (
    process.env[
      envKey
    ] || ""
  ).trim();
}

/* ==========================================================================
   HTTP JSON
   ========================================================================== */

async function parseJsonResponse(
  response: Response,
): Promise<unknown> {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(
      text,
    );
  } catch {
    return {
      raw: text,
    };
  }
}

/* ==========================================================================
   MOBILE MONEY CREATE
   ========================================================================== */

async function createMobileMoneyPayment(
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
      message:
        "Les identifiants Moko Afrika Mobile Money ne sont pas configurés.",
      errorCode:
        "MOKO_MOBILE_MONEY_CONFIG_MISSING",
    };
  }

  const customer =
    input.customer || {};

  const firstName =
    customer.firstName ||
    customer.name ||
    "PharmaFlow";

  const lastName =
    customer.lastName ||
    "";

  const email =
    customer.email ||
    "support@pharmaflow.africa";

  const phone =
    customer.phone ||
    "";

  if (!phone) {
    return {
      success: false,
      status: "failed",
      message:
        "Le numéro de téléphone du client est obligatoire pour Mobile Money.",
      errorCode:
        "CUSTOMER_PHONE_MISSING",
    };
  }

  let method =
    input.paymentMethod;

  if (
    method ===
    "mobile_money"
  ) {
    method =
      "airtel";
  }

  const supportedMethods =
    [
      "mpesa",
      "airtel",
      "orange",
      "africell",
    ];

  if (
    !method ||
    !supportedMethods.includes(
      method,
    )
  ) {
    method =
      "airtel";
  }

  const payload: JsonObject = {
    merchant_id:
      merchantId,

    merchant_secrete:
      merchantSecret,

    amount:
      String(
        input.amount,
      ),

    currency:
      input.currency
        .trim()
        .toUpperCase(),

    action:
      "debit",

    customer_number:
      phone,

    firstname:
      firstName,

    lastname:
      lastName,

    "e-mail":
      email,

    reference:
      input.merchantReference,

    method,

    /*
     * callback_url est optionnel chez Moko.
     */
    ...(getMobileMoneyCallbackUrl()
      ? {
          callback_url:
            getMobileMoneyCallbackUrl(),
        }
      : {}),
  };

  try {
    const response =
      await fetch(
        getMobileMoneyUrl(),
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

    const data =
      await parseJsonResponse(
        response,
      );

    if (
      !response.ok
    ) {
      return {
        success: false,
        status: "failed",
        message:
          isObject(data)
            ? (
                stringValue(
                  data.Comment,
                ) ||
                stringValue(
                  data.message,
                ) ||
                "Moko Afrika a refusé la demande Mobile Money."
              )
            : "Moko Afrika a refusé la demande Mobile Money.",
        errorCode:
          "MOKO_MOBILE_MONEY_HTTP_ERROR",
        metadata: {
          httpStatus:
            response.status,

          providerResponse:
            data,
        },
      };
    }

    const object =
      isObject(data)
        ? data
        : {};

    const status =
      normalizeMokoStatus(
        object.Trans_Status ??
          object.trans_status ??
          object.status ??
          object.Status,
      );

    const providerTransactionId =
      stringValue(
        object.Transaction_id ??
          object.transaction_id ??
          object.TransactionId ??
          object.transactionId ??
          object.PayDRC_Reference ??
          object.paydrc_reference,
      );

    const merchantReference =
      stringValue(
        object.Reference ??
          object.reference ??
          input.merchantReference,
      );

    const message =
      stringValue(
        object.Comment ??
          object.comment ??
          object.message ??
          object.Status_Description ??
          object.Trans_Status_Description,
      );

    /*
     * Une réponse d'initialisation peut être "Success"
     * alors que la transaction n'est pas encore finalisée.
     *
     * Nous ne déclarons donc jamais un paiement réussi
     * uniquement parce que la requête HTTP a répondu 200.
     */
    const success =
      status ===
      "successful";

    return {
      success,

      status:
        status ===
          "failed" ||
        status ===
          "cancelled" ||
        status ===
          "expired"
          ? status
          : success
            ? "successful"
            : "pending",

      providerTransactionId,

      merchantReference,

      message,

      metadata: {
        provider:
          "moko_afrika",

        paymentMethod:
          method,

        providerResponse:
          data,
      },
    };
  } catch (error) {
    console.error(
      "MOKO AFRIKA MOBILE MONEY CREATE ERROR:",
      error,
    );

    return {
      success: false,
      status: "failed",
      message:
        "Impossible de contacter Moko Afrika Mobile Money.",
      errorCode:
        "MOKO_MOBILE_MONEY_NETWORK_ERROR",
    };
  }
}

/* ==========================================================================
   CARD CREATE
   ========================================================================== */

async function createCardPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const apiKey =
    getCardApiKey();

  const apiSecret =
    getCardApiSecret();

  if (
    !apiKey ||
    !apiSecret
  ) {
    return {
      success: false,
      status: "failed",
      message:
        "Les identifiants Moko Checkout carte ne sont pas configurés.",
      errorCode:
        "MOKO_CARD_CONFIG_MISSING",
    };
  }

  const callbackUrl =
    getCardCallbackUrl();

  if (!callbackUrl) {
    return {
      success: false,
      status: "failed",
      message:
        "L'URL callback Moko Checkout carte n'est pas configurée.",
      errorCode:
        "MOKO_CARD_CALLBACK_URL_MISSING",
    };
  }

  const returnUrl =
    getCardReturnUrl();

  const cancelUrl =
    getCardCancelUrl();

  if (
    !returnUrl ||
    !cancelUrl
  ) {
    return {
      success: false,
      status: "failed",
      message:
        "Les URLs de retour et d'annulation Moko Checkout ne sont pas configurées.",
      errorCode:
        "MOKO_CARD_RETURN_URL_MISSING",
    };
  }

  const customer =
    input.customer || {};

  const firstName =
    customer.firstName ||
    customer.name ||
    "PharmaFlow";

  const lastName =
    customer.lastName ||
    "";

  const email =
    customer.email ||
    "";

  const phone =
    customer.phone ||
    "";

  if (!email) {
    return {
      success: false,
      status: "failed",
      message:
        "L'adresse e-mail du client est obligatoire pour un paiement par carte.",
      errorCode:
        "CUSTOMER_EMAIL_MISSING",
    };
  }

  if (!phone) {
    return {
      success: false,
      status: "failed",
      message:
        "Le numéro de téléphone du client est obligatoire pour un paiement par carte.",
      errorCode:
        "CUSTOMER_PHONE_MISSING",
    };
  }

  const addressLine1 =
    getCardBillingValue(
      input,
      "addressLine1",
      "MOKO_AFRIKA_CARD_BILL_TO_ADDRESS_LINE1",
    );

  const city =
    getCardBillingValue(
      input,
      "city",
      "MOKO_AFRIKA_CARD_BILL_TO_CITY",
    );

  const state =
    getCardBillingValue(
      input,
      "state",
      "MOKO_AFRIKA_CARD_BILL_TO_STATE",
    );

  const postalCode =
    getCardBillingValue(
      input,
      "postalCode",
      "MOKO_AFRIKA_CARD_BILL_TO_POSTAL_CODE",
    );

  const country =
    getCardBillingValue(
      input,
      "countryCode",
      "MOKO_AFRIKA_CARD_BILL_TO_COUNTRY",
    ) ||
    customer.countryCode ||
    "";

  if (
    !addressLine1 ||
    !city ||
    !state ||
    !postalCode ||
    !country
  ) {
    return {
      success: false,
      status: "failed",
      message:
        "Les informations d'adresse de facturation sont obligatoires pour le paiement par carte.",
      errorCode:
        "CARD_BILLING_ADDRESS_MISSING",
      metadata: {
        missingBillingFields: {
          addressLine1:
            !addressLine1,

          city:
            !city,

          state:
            !state,

          postalCode:
            !postalCode,

          country:
            !country,
        },
      },
    };
  }

  const currency =
    input.currency
      .trim()
      .toUpperCase();

  if (
    currency !==
      "USD" &&
    currency !==
      "CDF"
  ) {
    return {
      success: false,
      status: "failed",
      message:
        "Moko Checkout accepte actuellement USD ou CDF pour les paiements par carte.",
      errorCode:
        "CARD_CURRENCY_NOT_SUPPORTED",
    };
  }

  const payload: JsonObject = {
    amount:
      input.amount,

    currency,

    merchant_reference:
      input.merchantReference,

    callback_url:
      callbackUrl,

    return_url:
      returnUrl,

    cancel_url:
      cancelUrl,

    bill_to_forename:
      firstName,

    bill_to_surname:
      lastName,

    bill_to_email:
      email,

    bill_to_phone:
      phone,

    bill_to_address_line1:
      addressLine1,

    bill_to_address_city:
      city,

    bill_to_address_state:
      state,

    bill_to_address_postal_code:
      postalCode,

    bill_to_address_country:
      country.toUpperCase(),
  };

  try {
    const response =
      await fetch(
        `${getCardBaseUrl()}/api/v1/payment/orders`,
        {
          method:
            "POST",

          headers:
            getCardHeaders(
              payload,
            ),

          body:
            JSON.stringify(
              payload,
            ),

          cache:
            "no-store",
        },
      );

    const data =
      await parseJsonResponse(
        response,
      );

    if (
      !response.ok
    ) {
      let providerMessage =
        "Moko Checkout a refusé la demande de paiement.";

      if (
        isObject(data)
      ) {
        const error =
          isObject(
            data.error,
          )
            ? data.error
            : null;

        providerMessage =
          stringValue(
            error?.message,
          ) ||
          stringValue(
            data.message,
          ) ||
          providerMessage;
      }

      return {
        success: false,
        status: "failed",
        message:
          providerMessage,
        errorCode:
          "MOKO_CARD_HTTP_ERROR",
        metadata: {
          httpStatus:
            response.status,

          providerResponse:
            data,
        },
      };
    }

    const root =
      isObject(data)
        ? data
        : {};

    const providerData =
      isObject(
        root.data,
      )
        ? root.data
        : {};

    const providerTransactionId =
      stringValue(
        providerData.transaction_uuid,
      );

    const merchantReference =
      stringValue(
        providerData.merchant_reference,
      ) ||
      input.merchantReference;

    const checkoutUrl =
      stringValue(
        providerData.links,
      ) ||
      stringValue(
        providerData.checkout_url,
      ) ||
      stringValue(
        providerData.checkoutUrl,
      ) ||
      stringValue(
        providerData.url,
      );

    const providerStatus =
      normalizeMokoStatus(
        providerData.transaction_status ??
          root.status,
      );

    return {
      success:
        Boolean(
          checkoutUrl,
        ),

      status:
        providerStatus ===
        "failed"
          ? "failed"
          : "pending",

      providerTransactionId,

      merchantReference,

      checkoutUrl,

      message:
        stringValue(
          providerData.message,
        ) ||
        "Paiement carte créé. Redirection vers Moko Checkout.",

      metadata: {
        provider:
          "moko_afrika",

        paymentMethod:
          "card",

        checkoutUrl,

        providerResponse:
          data,
      },
    };
  } catch (error) {
    console.error(
      "MOKO AFRIKA CARD CREATE ERROR:",
      error,
    );

    return {
      success: false,
      status: "failed",
      message:
        "Impossible de contacter Moko Checkout.",
      errorCode:
        "MOKO_CARD_NETWORK_ERROR",
    };
  }
}

/* ==========================================================================
   MOBILE MONEY VERIFY
   ========================================================================== */

async function verifyMobileMoneyPayment(
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
      message:
        "Les identifiants Moko Afrika Mobile Money ne sont pas configurés.",
      failureReason:
        "MOKO_MOBILE_MONEY_CONFIG_MISSING",
    };
  }

  const reference =
    input.merchantReference ||
    input.providerTransactionId;

  if (!reference) {
    return {
      success: false,
      status: "failed",
      message:
        "Une référence Moko Afrika est nécessaire pour vérifier le paiement.",
      failureReason:
        "REFERENCE_MISSING",
    };
  }

  const payload = {
    merchant_id:
      merchantId,

    merchant_secrete:
      merchantSecret,

    action:
      "verify",

    reference,
  };

  try {
    const response =
      await fetch(
        getMobileMoneyUrl(),
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

    const data =
      await parseJsonResponse(
        response,
      );

    if (
      !response.ok
    ) {
      return {
        success: false,
        status: "failed",
        message:
          isObject(data)
            ? (
                stringValue(
                  data.Comment,
                ) ||
                stringValue(
                  data.message,
                ) ||
                "Moko Afrika n'a pas pu vérifier le paiement."
              )
            : "Moko Afrika n'a pas pu vérifier le paiement.",
        failureReason:
          "MOKO_VERIFY_HTTP_ERROR",
        metadata: {
          httpStatus:
            response.status,

          providerResponse:
            data,
        },
      };
    }

    const object =
      isObject(data)
        ? data
        : {};

    const status =
      normalizeMokoStatus(
        object.Trans_Status ??
          object.trans_status ??
          object.status ??
          object.Status,
      );

    const amount =
      numberValue(
        object.Amount ??
          object.amount,
      );

    const currency =
      upperCurrency(
        object.Currency ??
          object.currency,
      );

    const merchantReference =
      stringValue(
        object.Reference ??
          object.reference,
      );

    const providerTransactionId =
      stringValue(
        object.Transaction_id ??
          object.transaction_id ??
          object.PayDRC_Reference ??
          object.paydrc_reference,
      );

    const message =
      stringValue(
        object.Comment ??
          object.comment ??
          object.Trans_Status_Description ??
          object.Status_Description ??
          object.message,
      );

    return {
      success:
        status ===
        "successful",

      status,

      providerTransactionId,

      merchantReference,

      amount,

      currency,

      message,

      failureReason:
        status ===
        "failed"
          ? message
          : null,

      metadata: {
        provider:
          "moko_afrika",

        paymentMethod:
          "mobile_money",

        method:
          stringValue(
            object.Method ??
              object.method,
          ),

        financialInstitutionId:
          stringValue(
            object.Financial_Institution_id,
          ),

        providerResponse:
          data,
      },
    };
  } catch (error) {
    console.error(
      "MOKO AFRIKA MOBILE MONEY VERIFY ERROR:",
      error,
    );

    return {
      success: false,
      status: "failed",
      message:
        "Impossible de contacter Moko Afrika pour vérifier le paiement.",
      failureReason:
        "MOKO_VERIFY_NETWORK_ERROR",
    };
  }
}

/* ==========================================================================
   CARD VERIFY
   ========================================================================== */

async function verifyCardPayment(
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const apiKey =
    getCardApiKey();

  const apiSecret =
    getCardApiSecret();

  if (
    !apiKey ||
    !apiSecret
  ) {
    return {
      success: false,
      status: "failed",
      message:
        "Les identifiants Moko Checkout carte ne sont pas configurés.",
      failureReason:
        "MOKO_CARD_CONFIG_MISSING",
    };
  }

  const transactionUuid =
    input.providerTransactionId;

  if (!transactionUuid) {
    return {
      success: false,
      status: "failed",
      message:
        "Le transaction_uuid Moko Checkout est nécessaire pour vérifier le paiement.",
      failureReason:
        "TRANSACTION_UUID_MISSING",
    };
  }

  const payload: JsonObject = {
    transaction_uuid:
      transactionUuid,
  };

  try {
    const response =
      await fetch(
        `${getCardBaseUrl()}/api/v1/payment/status`,
        {
          method:
            "POST",

          headers:
            getCardHeaders(
              payload,
            ),

          body:
            JSON.stringify(
              payload,
            ),

          cache:
            "no-store",
        },
      );

    const data =
      await parseJsonResponse(
        response,
      );

    if (
      !response.ok
    ) {
      let message =
        "Moko Checkout n'a pas pu vérifier le paiement.";

      if (
        isObject(data)
      ) {
        const error =
          isObject(
            data.error,
          )
            ? data.error
            : null;

        message =
          stringValue(
            error?.message,
          ) ||
          stringValue(
            data.message,
          ) ||
          message;
      }

      return {
        success: false,
        status: "failed",
        message,

        failureReason:
          "MOKO_CARD_STATUS_HTTP_ERROR",

        metadata: {
          httpStatus:
            response.status,

          providerResponse:
            data,
        },
      };
    }

    const root =
      isObject(data)
        ? data
        : {};

    const providerData =
      isObject(
        root.data,
      )
        ? root.data
        : root;

    const status =
      normalizeMokoStatus(
        providerData.transaction_status ??
          providerData.status ??
          root.status,
      );

    const amount =
      numberValue(
        providerData.amount,
      );

    const currency =
      upperCurrency(
        providerData.currency,
      );

    const merchantReference =
      stringValue(
        providerData.merchant_reference ??
          providerData.reference,
      );

    const providerTransactionId =
      stringValue(
        providerData.transaction_uuid,
      ) ||
      transactionUuid;

    const message =
      stringValue(
        providerData.message,
      ) ||
      stringValue(
        root.message,
      );

    const decision =
      stringValue(
        providerData.decision,
      );

    let finalStatus =
      status;

    if (
      decision ===
      "ACCEPT"
    ) {
      finalStatus =
        "successful";
    }

    if (
      decision ===
        "DECLINE" ||
      decision ===
        "ERROR"
    ) {
      finalStatus =
        "failed";
    }

    if (
      decision ===
      "CANCEL"
    ) {
      finalStatus =
        "cancelled";
    }

    if (
      decision ===
      "REVIEW"
    ) {
      finalStatus =
        "pending";
    }

    return {
      success:
        finalStatus ===
        "successful",

      status:
        finalStatus,

      providerTransactionId,

      merchantReference,

      amount,

      currency,

      message,

      failureReason:
        finalStatus ===
        "failed"
          ? message
          : null,

      metadata: {
        provider:
          "moko_afrika",

        paymentMethod:
          "card",

        decision,

        cardType:
          stringValue(
            providerData.card_type,
          ),

        cardLast4:
          stringValue(
            providerData.card_last4,
          ),

        cardBinCountry:
          stringValue(
            providerData.card_bin_country,
          ),

        providerResponse:
          data,
      },
    };
  } catch (error) {
    console.error(
      "MOKO AFRIKA CARD VERIFY ERROR:",
      error,
    );

    return {
      success: false,
      status: "failed",
      message:
        "Impossible de contacter Moko Checkout pour vérifier le paiement.",
      failureReason:
        "MOKO_CARD_STATUS_NETWORK_ERROR",
    };
  }
}

/* ==========================================================================
   MAIN ADAPTER
   ========================================================================== */

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
      getMobileMoneyBaseUrl(),

    countries: [
      "CD",
      "CG",
      "CM",
    ],

    paymentMethods: [
      "mobile_money",
      "mpesa",
      "airtel",
      "orange",
      "africell",
      "card",
    ],

    enabled:
      Boolean(
        (
          getMerchantId() &&
          getMerchantSecret()
        ) ||
        (
          getCardApiKey() &&
          getCardApiSecret()
        ),
      ),
  },

  /* ------------------------------------------------------------------------
     CREATE
     ------------------------------------------------------------------------ */

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    if (
      input.paymentMethodType ===
      "card"
    ) {
      return createCardPayment(
        input,
      );
    }

    return createMobileMoneyPayment(
      input,
    );
  },

  /* ------------------------------------------------------------------------
     VERIFY
     ------------------------------------------------------------------------ */

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const paymentMethod =
      isObject(
        input.metadata,
      )
        ? stringValue(
            input.metadata
              .paymentMethod,
          )
        : null;

    if (
      paymentMethod ===
        "card" ||
      paymentMethod ===
        "visa" ||
      paymentMethod ===
        "mastercard"
    ) {
      return verifyCardPayment(
        input,
      );
    }

    return verifyMobileMoneyPayment(
      input,
    );
  },

  /* ------------------------------------------------------------------------
     WEBHOOK PARSER
     ------------------------------------------------------------------------ */

  parseWebhook(
    payload: unknown,
    headers?: Headers,
  ): PaymentWebhookResult {
    if (
      !isObject(payload)
    ) {
      return {
        success: false,
        status: "failed",
        message:
          "Payload webhook invalide.",
        failureReason:
          "INVALID_WEBHOOK_PAYLOAD",
      };
    }

    /*
     * --------------------------------------------------------------
     * CALLBACK ENCRYPTÉ
     * --------------------------------------------------------------
     *
     * Moko peut envoyer :
     *
     * {
     *   "data": "<ENCRYPTED_PAYLOAD>"
     * }
     *
     * Nous essayons de déchiffrer uniquement si data
     * est une chaîne.
     */
    let normalizedPayload:
      JsonObject = payload;

    if (
      typeof payload.data ===
      "string"
    ) {
      try {
        const decrypted =
          decryptMokoCallbackData(
            payload.data,
          );

        if (
          isObject(
            decrypted,
          )
        ) {
          normalizedPayload =
            decrypted;
        }
      } catch (error) {
        console.error(
          "MOKO AFRIKA CALLBACK DECRYPTION ERROR:",
          error,
        );

        return {
          success: false,
          status: "failed",
          message:
            "Impossible de déchiffrer le callback Moko Afrika.",
          failureReason:
            "MOKO_CALLBACK_DECRYPTION_FAILED",
        };
      }
    }

    /*
     * --------------------------------------------------------------
     * CARD WEBHOOK
     * --------------------------------------------------------------
     */

    const isCardWebhook =
      Boolean(
        headers?.get(
          "x-freshpay-signature",
        ),
      ) ||
      Boolean(
        normalizedPayload.transaction_uuid,
      );

    if (
      isCardWebhook
    ) {
      const status =
        normalizeMokoStatus(
          normalizedPayload.status ??
            normalizedPayload.transaction_status ??
            normalizedPayload.event_type,
        );

      const merchantReference =
        stringValue(
          normalizedPayload.reference ??
            normalizedPayload.merchant_reference,
        );

      const providerTransactionId =
        stringValue(
          normalizedPayload.transaction_uuid,
        );

      const amount =
        numberValue(
          normalizedPayload.amount,
        );

      const currency =
        upperCurrency(
          normalizedPayload.currency,
        );

      const message =
        stringValue(
          normalizedPayload.message,
        );

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

          paymentMethod:
            "card",

          eventType:
            stringValue(
              normalizedPayload.event_type,
            ),

          callbackTimestamp:
            stringValue(
              normalizedPayload.timestamp,
            ),

          customer:
            normalizedPayload.customer ??
            null,
        },
      };
    }

    /*
     * --------------------------------------------------------------
     * MOBILE MONEY WEBHOOK
     * --------------------------------------------------------------
     */

    const status =
      normalizeMokoStatus(
        normalizedPayload.Trans_Status ??
          normalizedPayload.trans_status ??
          normalizedPayload.status ??
          normalizedPayload.payment_status ??
          normalizedPayload.Status,
      );

    const merchantReference =
      stringValue(
        normalizedPayload.Reference ??
          normalizedPayload.reference,
      );

    const providerTransactionId =
      stringValue(
        normalizedPayload.Transaction_id ??
          normalizedPayload.transaction_id ??
          normalizedPayload.TransactionId ??
          normalizedPayload.PayDRC_Reference ??
          normalizedPayload.paydrc_reference,
      );

    const amount =
      numberValue(
        normalizedPayload.Amount ??
          normalizedPayload.amount,
      );

    const currency =
      upperCurrency(
        normalizedPayload.Currency ??
          normalizedPayload.currency,
      );

    const paymentMethod =
      stringValue(
        normalizedPayload.Method ??
          normalizedPayload.method,
      );

    const message =
      stringValue(
        normalizedPayload.Comment ??
          normalizedPayload.comment ??
          normalizedPayload.Trans_Status_Description ??
          normalizedPayload.Status_Description ??
          normalizedPayload.message,
      );

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
        paymentMethod ??
        "mobile_money",

      message,

      failureReason:
        status ===
        "failed"
          ? message
          : null,

      metadata: {
        provider:
          "moko_afrika",

        paymentMethod:
          "mobile_money",

        action:
          stringValue(
            normalizedPayload.Action ??
              normalizedPayload.action,
          ),

        financialInstitutionId:
          stringValue(
            normalizedPayload.Financial_Institution_id,
          ),

        customerNumber:
          stringValue(
            normalizedPayload.Customer_Details ??
              normalizedPayload.Customer_Number ??
              normalizedPayload.customer_number,
          ),
      },
    };
  },

  /* ------------------------------------------------------------------------
     WEBHOOK SIGNATURE
     ------------------------------------------------------------------------ */

  verifyWebhookSignature(
    payload: string,
    headers: Headers,
  ): boolean {
    /*
     * Carte
     */
    if (
      headers.get(
        "x-freshpay-signature",
      )
    ) {
      return verifyCardCallbackSignature(
        payload,
        headers,
      );
    }

    /*
     * Mobile Money
     */
    const mobileSignature =
      headers.get(
        "x-signature",
      );

    if (
      mobileSignature
    ) {
      return verifyMobileMoneySignature(
        payload,
        mobileSignature,
      );
    }

    return false;
  },
};

/*
|--------------------------------------------------------------------------
| Alias conservé pour compatibilité
|--------------------------------------------------------------------------
*/

export const mokoAfrikaProvider =
  mokoAfrikaAdapter;