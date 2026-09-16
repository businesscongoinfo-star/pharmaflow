import crypto from "crypto";

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
| Produit utilisé ici :
|
| PAYMENTS
| - Mobile Money
| - PayIn / C2B
| - Check Status / Verify
| - Callback
|
| Le produit Card Payments de Moko Afrika possède
| une API et une authentification différentes.
| Il sera intégré séparément.
|
|--------------------------------------------------------------------------
*/

const DEFAULT_SANDBOX_URL =
  "https://api.gofreshpay.com/api/v1/gateway";

const DEFAULT_PRODUCTION_URL =
  "https://paydrc.gofreshbakery.net/api/v5/";

/*
|--------------------------------------------------------------------------
| ENVIRONMENT
|--------------------------------------------------------------------------
*/

function getMode():
  | "sandbox"
  | "production" {
  return (
    process.env.MOKO_AFRIKA_MODE ===
    "production"
      ? "production"
      : "sandbox"
  );
}

function getBaseUrl(): string {
  const configured =
    process.env.MOKO_AFRIKA_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return getMode() === "production"
    ? DEFAULT_PRODUCTION_URL.replace(
        /\/+$/,
        "",
      )
    : DEFAULT_SANDBOX_URL;
}

function getMerchantId(): string {
  return (
    process.env.MOKO_AFRIKA_MERCHANT_ID?.trim() ??
    ""
  );
}

function getMerchantSecret(): string {
  return (
    process.env.MOKO_AFRIKA_MERCHANT_SECRET?.trim() ??
    ""
  );
}

function getCallbackUrl(): string {
  return (
    process.env.MOKO_AFRIKA_CALLBACK_URL?.trim() ??
    ""
  );
}

/*
|--------------------------------------------------------------------------
| WEBHOOK SECURITY
|--------------------------------------------------------------------------
|
| FreshPay documente :
|
| X-Signature = HMAC-SHA256
| body.data   = payload chiffré
|
| Le document fournit également un exemple
| AES-CBC avec une clé de 16 octets et IV = clé.
|
*/

function getWebhookAesKey(): Buffer | null {
  const value =
    process.env.MOKO_AFRIKA_WEBHOOK_AES_KEY?.trim() ||
    process.env.MOKO_AFRIKA_AES_KEY?.trim() ||
    process.env.FRESHPAY_SECRET_KEY?.trim();

  if (!value) {
    return null;
  }

  const buffer =
    Buffer.from(value, "utf8");

  /*
   * Le document FreshPay montre une clé de
   * 16 octets pour AES-CBC.
   *
   * On refuse une clé de taille incorrecte
   * plutôt que de tronquer silencieusement
   * un secret.
   */

  if (buffer.length !== 16) {
    return null;
  }

  return buffer;
}

function getWebhookHmacKey(): string {
  return (
    process.env.MOKO_AFRIKA_WEBHOOK_HMAC_KEY?.trim() ||
    process.env.MOKO_AFRIKA_WEBHOOK_SECRET?.trim() ||
    process.env.FRESHPAY_HMAC_KEY?.trim() ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| GENERIC HELPERS
|--------------------------------------------------------------------------
*/

type RecordLike =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is RecordLike {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getString(
  data: unknown,
  ...keys: string[]
): string | null {
  if (!isRecord(data)) {
    return null;
  }

  for (const key of keys) {
    const value = data[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
  }

  return null;
}

function getNumber(
  data: unknown,
  ...keys: string[]
): number | null {
  if (!isRecord(data)) {
    return null;
  }

  for (const key of keys) {
    const value = data[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (typeof value === "string") {
      const parsed =
        Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getErrorMessage(
  data: unknown,
): string {
  return (
    getString(
      data,
      "Trans_Status_Description",
      "Status_Description",
      "Comment",
      "message",
      "error",
    ) ??
    "Moko Afrika payment error"
  );
}

/*
|--------------------------------------------------------------------------
| PAYMENT METHOD
|--------------------------------------------------------------------------
*/

function normalizeMokoMethod(
  input: CreatePaymentInput,
): string {
  const method =
    String(
      input.paymentMethod ??
        "",
    )
      .trim()
      .toLowerCase();

  if (
    [
      "mpesa",
      "vodacom",
    ].includes(method)
  ) {
    return "mpesa";
  }

  if (
    [
      "airtel",
    ].includes(method)
  ) {
    return "airtel";
  }

  if (
    [
      "orange",
    ].includes(method)
  ) {
    return "orange";
  }

  if (
    [
      "africell",
      "afrimoney",
    ].includes(method)
  ) {
    return "africell";
  }

  if (method) {
    return method;
  }

  return "airtel";
}

/*
|--------------------------------------------------------------------------
| REQUEST
|--------------------------------------------------------------------------
*/

async function mokoRequest(
  body: Record<string, unknown>,
): Promise<unknown> {
  const merchantId =
    getMerchantId();

  const merchantSecret =
    getMerchantSecret();

  if (!merchantId) {
    throw new Error(
      "MOKO_AFRIKA_MERCHANT_ID is missing",
    );
  }

  if (!merchantSecret) {
    throw new Error(
      "MOKO_AFRIKA_MERCHANT_SECRET is missing",
    );
  }

  const response =
    await fetch(
      getBaseUrl(),
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          merchant_id:
            merchantId,

          merchant_secrete:
            merchantSecret,

          ...body,
        }),
        cache: "no-store",
      },
    );

  const text =
    await response.text();

  let data: unknown;

  try {
    data =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    data = {
      raw: text,
    };
  }

  if (!response.ok) {
    throw new Error(
      `Moko Afrika HTTP ${response.status}: ${getErrorMessage(data)}`,
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| CREATE MOBILE MONEY PAYMENT
|--------------------------------------------------------------------------
*/

async function createMobileMoneyPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const customer =
    input.customer ?? {};

  const phone =
    customer.phone?.trim();

  if (!phone) {
    return {
      success: false,
      status: "failed",
      errorCode:
        "MOKO_PHONE_REQUIRED",
      message:
        "Le numéro Mobile Money du client est obligatoire.",
    };
  }

  const firstname =
    customer.firstName ??
    customer.name ??
    "";

  const lastname =
    customer.lastName ??
    "";

  const email =
    customer.email ??
    "";

  const method =
    normalizeMokoMethod(
      input,
    );

  const callbackUrl =
    getCallbackUrl();

  const payload: Record<
    string,
    unknown
  > = {
    action: "debit",

    method,

    amount:
      String(input.amount),

    currency:
      input.currency.toUpperCase(),

    customer_number:
      phone,

    reference:
      input.merchantReference,

    firstname,

    lastname,

    "e-mail":
      email,
  };

  if (callbackUrl) {
    payload.callback_url =
      callbackUrl;
  }

  /*
   * Les informations PharmaFlow complémentaires
   * restent dans metadata et ne sont pas envoyées
   * arbitrairement à FreshPay.
   */

  try {
    const data =
      await mokoRequest(
        payload,
      );

    const transactionId =
      getString(
        data,
        "Transaction_id",
        "transaction_id",
        "id",
      );

    const returnedReference =
      getString(
        data,
        "Reference",
        "reference",
      ) ??
      input.merchantReference;

    /*
     * IMPORTANT :
     *
     * Status = Success signifie seulement que
     * FreshPay a reçu la demande.
     *
     * Le paiement réel sera ensuite confirmé
     * par Callback ou Verify.
     */

    const status =
      normalizePaymentStatus(
        getString(
          data,
          "Trans_Status",
        ) ??
          "pending",
      );

    return {
      success: true,

      status,

      providerTransactionId:
        transactionId,

      merchantReference:
        returnedReference,

      message:
        getString(
          data,
          "Comment",
          "message",
        ) ??
        "Demande de paiement envoyée à Moko Afrika.",

      metadata: {
        moko_method:
          method,

        moko_raw_response:
          data,
      },
    };
  } catch (error) {
    return {
      success: false,

      status: "failed",

      errorCode:
        "MOKO_CREATE_FAILED",

      message:
        error instanceof Error
          ? error.message
          : "Impossible de créer le paiement Moko Afrika.",
    };
  }
}

/*
|--------------------------------------------------------------------------
| CREATE PAYMENT
|--------------------------------------------------------------------------
*/

async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  if (
    input.paymentMethodType !==
    "mobile_money"
  ) {
    return {
      success: false,
      status: "failed",
      errorCode:
        "MOKO_CARD_NOT_CONFIGURED",
      message:
        "Le produit Card Payments Moko Afrika utilise une API séparée. Il sera connecté avec son contrat Card dédié.",
    };
  }

  return createMobileMoneyPayment(
    input,
  );
}

/*
|--------------------------------------------------------------------------
| VERIFY PAYMENT
|--------------------------------------------------------------------------
*/

async function verifyPayment(
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const reference =
    input.merchantReference ??
    input.providerTransactionId;

  if (!reference) {
    return {
      success: false,
      status: "failed",
      message:
        "Une référence Moko Afrika est nécessaire pour vérifier le paiement.",
      failureReason:
        "Missing transaction reference",
    };
  }

  try {
    const data =
      await mokoRequest({
        action: "verify",
        reference,
      });

    const statusValue =
      getString(
        data,
        "Trans_Status",
      );

    const status =
      normalizePaymentStatus(
        statusValue,
      );

    const amount =
      getNumber(
        data,
        "Amount",
        "amount",
      );

    const currency =
      getString(
        data,
        "Currency",
        "currency",
      )?.toUpperCase() ??
      null;

    const transactionId =
      getString(
        data,
        "Transaction_id",
        "transaction_id",
      );

    const returnedReference =
      getString(
        data,
        "Reference",
        "reference",
      );

    /*
     * Vérification du montant attendu.
     */

    if (
      input.expectedAmount !==
        undefined &&
      amount !== null &&
      Number(amount) !==
        Number(input.expectedAmount)
    ) {
      return {
        success: false,
        status: "failed",
        providerTransactionId:
          transactionId,
        merchantReference:
          returnedReference ??
          input.merchantReference ??
          null,
        amount,
        currency,
        message:
          "Le montant retourné par Moko Afrika ne correspond pas au montant attendu.",
        failureReason:
          "AMOUNT_MISMATCH",
        metadata: {
          moko_raw_response:
            data,
        },
      };
    }

    /*
     * Vérification de la devise.
     */

    if (
      input.expectedCurrency &&
      currency &&
      currency.toUpperCase() !==
        input.expectedCurrency.toUpperCase()
    ) {
      return {
        success: false,
        status: "failed",
        providerTransactionId:
          transactionId,
        merchantReference:
          returnedReference ??
          input.merchantReference ??
          null,
        amount,
        currency,
        message:
          "La devise retournée par Moko Afrika ne correspond pas à la devise attendue.",
        failureReason:
          "CURRENCY_MISMATCH",
        metadata: {
          moko_raw_response:
            data,
        },
      };
    }

    return {
      success:
        status ===
        "successful",

      status,

      providerTransactionId:
        transactionId,

      merchantReference:
        returnedReference ??
        input.merchantReference ??
        null,

      amount,

      currency,

      message:
        getString(
          data,
          "Trans_Status_Description",
          "Comment",
        ),

      failureReason:
        status ===
        "failed"
          ? getErrorMessage(
              data,
            )
          : null,

      metadata: {
        moko_raw_response:
          data,
      },
    };
  } catch (error) {
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
        error instanceof Error
          ? error.message
          : "Erreur lors de la vérification Moko Afrika.",

      failureReason:
        "MOKO_VERIFY_FAILED",
    };
  }
}

/*
|--------------------------------------------------------------------------
| HMAC
|--------------------------------------------------------------------------
*/

function verifyMokoWebhookSignature(
  payload: string,
  headers: Headers,
): boolean {
  const signature =
    headers.get(
      "x-signature",
    )?.trim();

  const hmacKey =
    getWebhookHmacKey();

  if (
    !signature ||
    !hmacKey
  ) {
    return false;
  }

  const calculated =
    crypto
      .createHmac(
        "sha256",
        hmacKey,
      )
      .update(
        payload,
        "utf8",
      )
      .digest("hex");

  const receivedBuffer =
    Buffer.from(
      signature,
      "utf8",
    );

  const calculatedBuffer =
    Buffer.from(
      calculated,
      "utf8",
    );

  if (
    receivedBuffer.length !==
    calculatedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    calculatedBuffer,
  );
}

/*
|--------------------------------------------------------------------------
| AES DECRYPTION
|--------------------------------------------------------------------------
*/

function decryptMokoWebhookData(
  encryptedData: string,
): unknown {
  const key =
    getWebhookAesKey();

  if (!key) {
    throw new Error(
      "FreshPay webhook AES key is missing or invalid. Expected a 16-byte UTF-8 key.",
    );
  }

  const encrypted =
    Buffer.from(
      encryptedData,
      "base64",
    );

  /*
   * Le document FreshPay montre :
   *
   * AES-CBC
   * IV = SECRET_KEY
   *
   * et un exemple Node en aes-128-cbc.
   */

  const decipher =
    crypto.createDecipheriv(
      "aes-128-cbc",
      key,
      key,
    );

  let decrypted =
    decipher.update(
      encrypted,
      undefined,
      "utf8",
    );

  decrypted +=
    decipher.final(
      "utf8",
    );

  return JSON.parse(
    decrypted,
  );
}

/*
|--------------------------------------------------------------------------
| WEBHOOK PARSER
|--------------------------------------------------------------------------
*/

function parseWebhook(
  payload: unknown,
  headers?: Headers,
): PaymentWebhookResult {
  /*
   * Cas standard :
   *
   * {
   *   data: "<encrypted>"
   * }
   */

  if (
    isRecord(payload) &&
    typeof payload.data ===
      "string"
  ) {
    if (!headers) {
      return {
        success: false,
        status: "failed",
        message:
          "Headers requis pour vérifier la signature du callback Moko Afrika.",
        failureReason:
          "MISSING_HEADERS",
      };
    }

    const encryptedData =
      payload.data;

    const signatureValid =
      verifyMokoWebhookSignature(
        encryptedData,
        headers,
      );

    if (!signatureValid) {
      return {
        success: false,
        status: "failed",
        message:
          "Signature du callback Moko Afrika invalide.",
        failureReason:
          "INVALID_SIGNATURE",
      };
    }

    try {
      const decrypted =
        decryptMokoWebhookData(
          encryptedData,
        );

      return parsePlainWebhook(
        decrypted,
      );
    } catch (error) {
      return {
        success: false,
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de déchiffrer le callback Moko Afrika.",
        failureReason:
          "INVALID_ENCRYPTION",
      };
    }
  }

  /*
   * Compatibilité avec les réponses webhook JSON
   * directement exposées par le nouveau portail Moko.
   */

  return parsePlainWebhook(
    payload,
  );
}

/*
|--------------------------------------------------------------------------
| PLAIN WEBHOOK
|--------------------------------------------------------------------------
*/

function parsePlainWebhook(
  payload: unknown,
): PaymentWebhookResult {
  const merchantReference =
    getString(
      payload,
      "Reference",
      "reference",
      "thirdparty_reference",
    );

  const providerTransactionId =
    getString(
      payload,
      "Transaction_id",
      "transaction_id",
      "PayDRC_Reference",
      "paydrc_reference",
    );

  const amount =
    getNumber(
      payload,
      "Amount",
      "amount",
    );

  const currency =
    getString(
      payload,
      "Currency",
      "currency",
    )?.toUpperCase() ??
    null;

  const method =
    getString(
      payload,
      "Method",
      "method",
    );

  const rawStatus =
    getString(
      payload,
      "Trans_Status",
      "trans_status",
      "status",
    );

  const status =
    normalizePaymentStatus(
      rawStatus,
    );

  const failureReason =
    status === "failed"
      ? getString(
          payload,
          "Trans_Status_Description",
          "Status_Description",
          "Comment",
        )
      : null;

  return {
    success:
      status === "successful",

    status,

    merchantReference,

    providerTransactionId,

    amount,

    currency,

    paymentMethod:
      method as
        | PaymentWebhookResult["paymentMethod"]
        | null,

    message:
      getString(
        payload,
        "Comment",
        "Status_Description",
        "Trans_Status_Description",
      ),

    failureReason,

    metadata: {
      moko_webhook:
        payload,
    },
  };
}

/*
|--------------------------------------------------------------------------
| ADAPTER
|--------------------------------------------------------------------------
*/

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
      "CG",
      "CM",
    ],

    currencies: [
      "CDF",
      "USD",
    ],

    paymentMethods: [
      "mobile_money",
      "mpesa",
      "airtel",
      "orange",
      "africell",
      "vodacom",
    ],

    enabled:
      Boolean(
        getMerchantId() &&
        getMerchantSecret(),
      ),
  },

  createPayment,

  verifyPayment,

  parseWebhook,

  verifyWebhookSignature:
    verifyMokoWebhookSignature,
};

/*
|--------------------------------------------------------------------------
| ALIASES
|--------------------------------------------------------------------------
*/

export const mokoAfrikaProvider =
  mokoAfrikaAdapter;