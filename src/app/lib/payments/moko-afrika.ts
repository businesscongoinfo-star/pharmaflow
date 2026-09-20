import "server-only";

import crypto from "crypto";

import {
  getRuntimeIntegrationValue,
} from "@/app/lib/integrations/config";

import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProviderAdapter,
  VerifyPaymentInput,
  VerifyPaymentResult,
  PaymentWebhookResult,
  ProviderPaymentMethod,
} from "./types";

import {
  normalizePaymentStatus,
} from "./types";

/*
|--------------------------------------------------------------------------
| MOKO AFRIKA / FRESHPAY
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
| 2. Carte
|    - Visa
|    - Mastercard
|
| Configuration :
|
| - platform_integration_configs
| - variables .env en secours
|
|--------------------------------------------------------------------------
*/

/* =========================================================
   CONFIGURATION PAR DÉFAUT
========================================================= */

const DEFAULT_MOBILE_MONEY_BASE_URL =
  "https://api.gofreshpay.com/api/v1/gateway";

const DEFAULT_CARD_SANDBOX_BASE_URL =
  "https://sandbox.gofreshpay.com";

const DEFAULT_CARD_PRODUCTION_BASE_URL =
  "https://card.gofreshpay.com";

/* =========================================================
   TYPES INTERNES
========================================================= */

type MokoMode =
  | "sandbox"
  | "production";

type MokoMobileMoneyConfig = {
  baseUrl: string;
  merchantId: string;
  merchantSecret: string;
  callbackUrl: string;
};

type MokoCardConfig = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  callbackSecret: string;
  callbackUrl: string;
  returnUrl: string;
  cancelUrl: string;
};

/* =========================================================
   OUTILS
========================================================= */

function getMode(): MokoMode {
  const value =
    String(
      process.env.MOKO_AFRIKA_MODE ??
        "sandbox",
    )
      .trim()
      .toLowerCase();

  return value === "production"
    ? "production"
    : "sandbox";
}

async function runtimeValue(
  key: string,
  envName: string,
): Promise<string> {
  return getRuntimeIntegrationValue(
    "moko_afrika",
    key,
    process.env[envName],
  );
}

function normalizeString(
  value: unknown,
): string {
  return String(
    value ?? "",
  ).trim();
}

function normalizeCurrency(
  value: unknown,
): string {
  return normalizeString(
    value,
  ).toUpperCase();
}

/* =========================================================
   CONFIG MOBILE MONEY
========================================================= */

async function getMobileMoneyConfig(): Promise<
  MokoMobileMoneyConfig
> {
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
    baseUrl:
      baseUrl.replace(/\/+$/, ""),
    merchantId,
    merchantSecret,
    callbackUrl,
  };
}

/* =========================================================
   CONFIG CARTE
========================================================= */

async function getCardConfig(): Promise<
  MokoCardConfig
> {
  const mode =
    getMode();

  const defaultBaseUrl =
    mode === "production"
      ? DEFAULT_CARD_PRODUCTION_BASE_URL
      : DEFAULT_CARD_SANDBOX_BASE_URL;

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
    baseUrl:
      baseUrl.replace(/\/+$/, ""),
    apiKey,
    apiSecret,
    callbackSecret,
    callbackUrl,
    returnUrl,
    cancelUrl,
  };
}

/* =========================================================
   EXTRACTION RÉPONSE JSON
========================================================= */

async function readResponseBody(
  response: Response,
): Promise<unknown> {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

function getObject(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function getNestedData(
  value: unknown,
): Record<string, unknown> {
  const root =
    getObject(value);

  return getObject(
    root.data,
  );
}

/* =========================================================
   MESSAGE FOURNISSEUR
========================================================= */

function getProviderMessage(
  payload: unknown,
  fallback: string,
): string {
  const root =
    getObject(payload);

  const data =
    getNestedData(payload);

  const candidates = [
    root.Comment,
    root.comment,
    root.Message,
    root.message,
    root.Error,
    root.error,
    root.Status_Description,
    root.Trans_Status_Description,

    data.Comment,
    data.comment,
    data.Message,
    data.message,
    data.Error,
    data.error,
    data.Status_Description,
    data.Trans_Status_Description,
  ];

  for (const value of candidates) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return fallback;
}

/* =========================================================
   MÉTHODE MOBILE MONEY
========================================================= */

function normalizeMobileMoneyMethod(
  value: unknown,
): string {
  const normalized =
    normalizeString(
      value,
    )
      .toLowerCase()
      .replace(
        /[-\s]/g,
        "_",
      );

  switch (normalized) {
    case "mpesa":
    case "m_pesa":
    case "vodacom":
    case "vodacom_money":
      return "mpesa";

    case "airtel":
    case "airtel_money":
      return "airtel";

    case "orange":
    case "orange_money":
      return "orange";

    case "africell":
    case "africell_money":
      return "africell";

    case "mobile_money":
    case "momo":
      return "mobile_money";

    default:
      return normalized;
  }
}

function getMobileMoneyMethod(
  input: CreatePaymentInput,
): string {
  const metadata =
    input.metadata ?? {};

  const candidates = [
    metadata.provider_method,
    metadata.providerMethod,
    metadata.mobile_money_method,
    metadata.mobileMoneyMethod,
    input.paymentMethod,
  ];

  for (const candidate of candidates) {
    const method =
      normalizeMobileMoneyMethod(
        candidate,
      );

    if (method) {
      return method;
    }
  }

  return "mobile_money";
}

/* =========================================================
   NOM CLIENT
========================================================= */

function resolveCustomerName(
  input: CreatePaymentInput,
): {
  firstName: string;
  lastName: string;
} {
  const customer =
    input.customer;

  const rawFirstName =
    normalizeString(
      customer?.firstName,
    );

  const rawLastName =
    normalizeString(
      customer?.lastName,
    );

  const rawName =
    normalizeString(
      customer?.name,
    );

  let firstName =
    rawFirstName;

  let lastName =
    rawLastName;

  if (!firstName && rawName) {
    const parts =
      rawName.split(/\s+/);

    firstName =
      parts[0] ?? "";

    if (parts.length > 1) {
      lastName =
        parts
          .slice(1)
          .join(" ");
    }
  }

  /*
   * Moko exige parfois les deux champs.
   *
   * Si l'utilisateur possède uniquement
   * un nom, on réutilise ce nom comme
   * surname afin de ne pas bloquer
   * inutilement le paiement.
   */
  if (
    firstName &&
    !lastName
  ) {
    lastName =
      firstName;
  }

  if (
    !firstName &&
    lastName
  ) {
    firstName =
      lastName;
  }

  return {
    firstName,
    lastName,
  };
}

/* =========================================================
   SIGNATURE CARTE
========================================================= */

function createCardSignature(
  body: string,
  timestamp: string,
  secret: string,
): string {
  return crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(
      `${body}${timestamp}`,
      "utf8",
    )
    .digest("hex");
}

/* =========================================================
   SIGNATURE CALLBACK
========================================================= */

function createCallbackSignature(
  body: string,
  timestamp: string,
  secret: string,
): string {
  return crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(
      `${timestamp}${body}`,
      "utf8",
    )
    .digest("hex");
}

/* =========================================================
   COMPARAISON SÉCURISÉE
========================================================= */

function safeCompare(
  a: string,
  b: string,
): boolean {
  const left =
    Buffer.from(
      a,
      "utf8",
    );

  const right =
    Buffer.from(
      b,
      "utf8",
    );

  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    left,
    right,
  );
}

/* =========================================================
   CRÉATION MOBILE MONEY
========================================================= */

async function createMobileMoneyPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const config =
    await getMobileMoneyConfig();

  if (!config.merchantId) {
    return {
      success: false,
      status: "failed",
      message:
        "L'identifiant marchand Moko Afrika n'est pas configuré.",
      errorCode:
        "MOKO_MERCHANT_ID_MISSING",
    };
  }

  if (!config.merchantSecret) {
    return {
      success: false,
      status: "failed",
      message:
        "Le secret marchand Moko Afrika n'est pas configuré.",
      errorCode:
        "MOKO_MERCHANT_SECRET_MISSING",
    };
  }

  const customerNumber =
    normalizeString(
      input.customer?.phone,
    );

  if (!customerNumber) {
    return {
      success: false,
      status: "failed",
      message:
        "Le numéro Mobile Money du client est obligatoire.",
      errorCode:
        "MOKO_CUSTOMER_PHONE_MISSING",
    };
  }

  const {
    firstName,
    lastName,
  } =
    resolveCustomerName(
      input,
    );

  const method =
    getMobileMoneyMethod(
      input,
    );

  const currency =
    normalizeCurrency(
      input.currency,
    );

  const payload: Record<
    string,
    unknown
  > = {
    merchant_id:
      config.merchantId,

    merchant_secrete:
      config.merchantSecret,

    amount:
      String(input.amount),

    currency,

    action:
      "debit",

    customer_number:
      customerNumber,

    firstname:
      firstName,

    lastname:
      lastName,

    email:
      normalizeString(
        input.customer?.email,
      ),

    reference:
      input.merchantReference,

    method,
  };

  if (config.callbackUrl) {
    payload.callback_url =
      config.callbackUrl;
  }

  let response: Response;

  try {
    response =
      await fetch(
        config.baseUrl,
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
  } catch (error) {
    return {
      success: false,
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Impossible de contacter FreshPay.",
      errorCode:
        "MOKO_NETWORK_ERROR",
    };
  }

  const parsed =
    await readResponseBody(
      response,
    );

  const root =
    getObject(parsed);

  const data =
    getNestedData(parsed);

  const transactionId =
    normalizeString(
      root.Transaction_id ??
        root.transaction_id ??
        root.TransactionID ??
        data.Transaction_id ??
        data.transaction_id ??
        data.TransactionID,
    ) || null;

  const statusValue =
    root.Trans_Status ??
    root.trans_status ??
    root.Status ??
    root.status ??
    data.Trans_Status ??
    data.trans_status ??
    data.Status ??
    data.status;

  const status =
    normalizePaymentStatus(
      statusValue,
    );

  if (!response.ok) {
    const providerMessage =
      getProviderMessage(
        parsed,
        `FreshPay HTTP ${response.status}.`,
      );

    return {
      success: false,

      status: "failed",

      providerTransactionId:
        transactionId,

      message:
        providerMessage,

      errorCode:
        `MOKO_HTTP_${response.status}`,

      metadata: {
        httpStatus:
          response.status,

        response:
          parsed,

        endpoint:
          config.baseUrl,

        method,

        currency,

        reference:
          input.merchantReference,

        /*
         * Ne jamais enregistrer le merchantSecret.
         */
      },
    };
  }

  const success =
    status ===
      "successful" ||
    status ===
      "pending" ||
    status ===
      "created";

  return {
    success,

    status:
      success
        ? status
        : "failed",

    providerTransactionId:
      transactionId,

    merchantReference:
      input.merchantReference,

    message:
      getProviderMessage(
        parsed,
        success
          ? "Paiement Mobile Money créé."
          : "FreshPay n'a pas accepté le paiement.",
      ),

    errorCode:
      success
        ? null
        : "MOKO_PAYMENT_REJECTED",

    metadata: {
      response:
        parsed,

      httpStatus:
        response.status,

      endpoint:
        config.baseUrl,

      method,

      currency,

      reference:
        input.merchantReference,
    },
  };
}

/* =========================================================
   VÉRIFICATION MOBILE MONEY
========================================================= */

async function verifyMobileMoneyPayment(
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const config =
    await getMobileMoneyConfig();

  if (!config.merchantId) {
    return {
      success: false,
      status: "failed",
      message:
        "L'identifiant marchand Moko Afrika n'est pas configuré.",
      failureReason:
        "MOKO_MERCHANT_ID_MISSING",
    };
  }

  if (!config.merchantSecret) {
    return {
      success: false,
      status: "failed",
      message:
        "Le secret marchand Moko Afrika n'est pas configuré.",
      failureReason:
        "MOKO_MERCHANT_SECRET_MISSING",
    };
  }

  const reference =
    normalizeString(
      input.merchantReference,
    );

  if (!reference) {
    return {
      success: false,
      status: "failed",
      message:
        "La référence marchand est obligatoire pour vérifier le paiement.",
      failureReason:
        "MOKO_REFERENCE_MISSING",
    };
  }

  const payload = {
    merchant_id:
      config.merchantId,

    merchant_secrete:
      config.merchantSecret,

    action:
      "verify",

    reference,
  };

  let response: Response;

  try {
    response =
      await fetch(
        config.baseUrl,
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
  } catch (error) {
    return {
      success: false,
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Impossible de contacter FreshPay.",
      failureReason:
        "MOKO_NETWORK_ERROR",
    };
  }

  const parsed =
    await readResponseBody(
      response,
    );

  const root =
    getObject(parsed);

  const data =
    getNestedData(parsed);

  const transactionId =
    normalizeString(
      root.Transaction_id ??
        root.transaction_id ??
        root.TransactionID ??
        data.Transaction_id ??
        data.transaction_id ??
        data.TransactionID,
    ) || null;

  const statusValue =
    root.Trans_Status ??
    root.trans_status ??
    root.Status ??
    root.status ??
    data.Trans_Status ??
    data.trans_status ??
    data.Status ??
    data.status;

  const status =
    normalizePaymentStatus(
      statusValue,
    );

  const amountValue =
    root.Amount ??
    root.amount ??
    data.Amount ??
    data.amount;

  const currencyValue =
    root.Currency ??
    root.currency ??
    data.Currency ??
    data.currency;

  const amount =
    amountValue !==
      undefined &&
    amountValue !==
      null
      ? Number(
          amountValue,
        )
      : null;

  const currency =
    normalizeCurrency(
      currencyValue,
    ) || null;

  if (!response.ok) {
    return {
      success: false,

      status: "failed",

      providerTransactionId:
        transactionId,

      merchantReference:
        reference,

      amount:
        Number.isFinite(
          amount ?? NaN,
        )
          ? amount
          : null,

      currency,

      message:
        getProviderMessage(
          parsed,
          `FreshPay HTTP ${response.status}.`,
        ),

      failureReason:
        `MOKO_HTTP_${response.status}`,

      metadata: {
        httpStatus:
          response.status,

        response:
          parsed,

        reference,
      },
    };
  }

  const success =
    status ===
    "successful";

  return {
    success,

    status,

    providerTransactionId:
      transactionId,

    merchantReference:
      reference,

    amount:
      Number.isFinite(
        amount ?? NaN,
      )
        ? amount
        : null,

    currency,

    message:
      getProviderMessage(
        parsed,
        success
          ? "Paiement vérifié avec succès."
          : "Le paiement n'est pas encore confirmé.",
      ),

    failureReason:
      success
        ? null
        : status === "failed"
          ? "Le fournisseur a indiqué que le paiement a échoué."
          : null,

    metadata: {
      response:
        parsed,

      httpStatus:
        response.status,
    },
  };
}

/* =========================================================
   CRÉATION CARTE
========================================================= */

async function createCardPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const config =
    await getCardConfig();

  if (!config.apiKey) {
    return {
      success: false,
      status: "failed",
      message:
        "La clé API carte Moko Afrika n'est pas configurée.",
      errorCode:
        "MOKO_CARD_API_KEY_MISSING",
    };
  }

  if (!config.apiSecret) {
    return {
      success: false,
      status: "failed",
      message:
        "Le secret API carte Moko Afrika n'est pas configuré.",
      errorCode:
        "MOKO_CARD_API_SECRET_MISSING",
    };
  }

  if (!config.callbackUrl) {
    return {
      success: false,
      status: "failed",
      message:
        "L'URL callback carte Moko Afrika n'est pas configurée.",
      errorCode:
        "MOKO_CARD_CALLBACK_URL_MISSING",
    };
  }

  const customer =
    input.customer;

  if (!customer) {
    return {
      success: false,
      status: "failed",
      message:
        "Les informations du client sont obligatoires pour un paiement par carte.",
      errorCode:
        "MOKO_CARD_CUSTOMER_MISSING",
    };
  }

  const {
    firstName,
    lastName,
  } =
    resolveCustomerName(
      input,
    );

  if (
    !firstName ||
    !lastName
  ) {
    return {
      success: false,
      status: "failed",
      message:
        "Le nom du client est obligatoire pour le paiement par carte.",
      errorCode:
        "MOKO_CARD_CUSTOMER_NAME_MISSING",
    };
  }

  const email =
    normalizeString(
      customer.email,
    );

  const phone =
    normalizeString(
      customer.phone,
    );

  const addressLine1 =
    normalizeString(
      customer.addressLine1,
    );

  const city =
    normalizeString(
      customer.city,
    );

  const countryCode =
    normalizeString(
      customer.countryCode,
    ).toUpperCase();

  if (!email) {
    return {
      success: false,
      status: "failed",
      message:
        "L'adresse e-mail du client est obligatoire pour le paiement par carte.",
      errorCode:
        "MOKO_CARD_EMAIL_MISSING",
    };
  }

  if (!phone) {
    return {
      success: false,
      status: "failed",
      message:
        "Le numéro de téléphone du client est obligatoire pour le paiement par carte.",
      errorCode:
        "MOKO_CARD_PHONE_MISSING",
    };
  }

  if (!addressLine1) {
    return {
      success: false,
      status: "failed",
      message:
        "L'adresse de facturation est obligatoire pour le paiement par carte.",
      errorCode:
        "MOKO_CARD_ADDRESS_MISSING",
    };
  }

  if (!city) {
    return {
      success: false,
      status: "failed",
      message:
        "La ville de facturation est obligatoire pour le paiement par carte.",
      errorCode:
        "MOKO_CARD_CITY_MISSING",
    };
  }

  if (!countryCode) {
    return {
      success: false,
      status: "failed",
      message:
        "Le pays de facturation est obligatoire pour le paiement par carte.",
      errorCode:
        "MOKO_CARD_COUNTRY_MISSING",
    };
  }

  const currency =
    normalizeCurrency(
      input.currency,
    );

  if (
    ![
      "USD",
      "CDF",
    ].includes(currency)
  ) {
    return {
      success: false,
      status: "failed",
      message:
        `Moko Afrika Card accepte actuellement USD ou CDF. Devise reçue : ${currency}.`,
      errorCode:
        "MOKO_CARD_CURRENCY_NOT_SUPPORTED",
    };
  }

  const payload: Record<
    string,
    unknown
  > = {
    amount:
      Number(input.amount),

    currency,

    merchant_reference:
      input.merchantReference,

    callback_url:
      config.callbackUrl,

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

    bill_to_address_country:
      countryCode,
  };

  if (config.returnUrl) {
    payload.return_url =
      config.returnUrl;
  }

  if (config.cancelUrl) {
    payload.cancel_url =
      config.cancelUrl;
  }

  const rawBody =
    JSON.stringify(
      payload,
    );

  const timestamp =
    String(
      Date.now(),
    );

  const signature =
    createCardSignature(
      rawBody,
      timestamp,
      config.apiSecret,
    );

  let response: Response;

  try {
    response =
      await fetch(
        `${config.baseUrl}/api/v1/payment/orders`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
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
  } catch (error) {
    return {
      success: false,
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Impossible de contacter Moko Afrika Card.",
      errorCode:
        "MOKO_CARD_NETWORK_ERROR",
    };
  }

  const parsed =
    await readResponseBody(
      response,
    );

  const root =
    getObject(parsed);

  const data =
    getNestedData(parsed);

  const links =
    getObject(
      data.links ??
        root.links,
    );

  const checkoutUrl =
    normalizeString(
      links.checkout ??
        links.checkout_url ??
        data.checkout_url ??
        data.checkoutUrl ??
        root.checkout_url ??
        root.checkoutUrl,
    ) || null;

  const transactionId =
    normalizeString(
      data.transaction_uuid ??
        data.transaction_id ??
        root.transaction_uuid ??
        root.transaction_id,
    ) || null;

  const statusValue =
    data.transaction_status ??
    data.status ??
    root.transaction_status ??
    root.status;

  const status =
    normalizePaymentStatus(
      statusValue,
    );

  if (!response.ok) {
    return {
      success: false,

      status: "failed",

      providerTransactionId:
        transactionId,

      checkoutUrl,

      merchantReference:
        input.merchantReference,

      message:
        getProviderMessage(
          parsed,
          `Moko Afrika Card HTTP ${response.status}.`,
        ),

      errorCode:
        `MOKO_CARD_HTTP_${response.status}`,

      metadata: {
        httpStatus:
          response.status,

        response:
          parsed,

        currency,
      },
    };
  }

  if (!checkoutUrl) {
    return {
      success: false,

      status: "failed",

      providerTransactionId:
        transactionId,

      merchantReference:
        input.merchantReference,

      message:
        "Moko Afrika a créé la demande mais n'a retourné aucune URL de paiement.",

      errorCode:
        "MOKO_CARD_CHECKOUT_URL_MISSING",

      metadata: {
        response:
          parsed,
      },
    };
  }

  return {
    success: true,

    status:
      status ===
      "successful"
        ? "successful"
        : "pending",

    providerTransactionId:
      transactionId,

    merchantReference:
      input.merchantReference,

    checkoutUrl,

    message:
      getProviderMessage(
        parsed,
        "Paiement par carte créé avec succès.",
      ),

    metadata: {
      response:
        parsed,

      httpStatus:
        response.status,

      currency,
    },
  };
}

/* =========================================================
   VÉRIFICATION CARTE
========================================================= */

async function verifyCardPayment(
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  const config =
    await getCardConfig();

  if (!config.apiKey) {
    return {
      success: false,
      status: "failed",
      message:
        "La clé API carte Moko Afrika n'est pas configurée.",
      failureReason:
        "MOKO_CARD_API_KEY_MISSING",
    };
  }

  if (!config.apiSecret) {
    return {
      success: false,
      status: "failed",
      message:
        "Le secret API carte Moko Afrika n'est pas configuré.",
      failureReason:
        "MOKO_CARD_API_SECRET_MISSING",
    };
  }

  const transactionUuid =
    normalizeString(
      input.providerTransactionId,
    );

  if (!transactionUuid) {
    return {
      success: false,
      status: "failed",
      message:
        "L'identifiant de transaction carte est obligatoire.",
      failureReason:
        "MOKO_CARD_TRANSACTION_ID_MISSING",
    };
  }

  const payload = {
    transaction_uuid:
      transactionUuid,
  };

  const rawBody =
    JSON.stringify(
      payload,
    );

  const timestamp =
    String(
      Date.now(),
    );

  const signature =
    createCardSignature(
      rawBody,
      timestamp,
      config.apiSecret,
    );

  let response: Response;

  try {
    response =
      await fetch(
        `${config.baseUrl}/api/v1/payment/status`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
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
  } catch (error) {
    return {
      success: false,
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Impossible de contacter Moko Afrika Card.",
      failureReason:
        "MOKO_CARD_NETWORK_ERROR",
    };
  }

  const parsed =
    await readResponseBody(
      response,
    );

  const root =
    getObject(parsed);

  const data =
    getNestedData(parsed);

  const statusValue =
    data.transaction_status ??
    data.status ??
    root.transaction_status ??
    root.status;

  const status =
    normalizePaymentStatus(
      statusValue,
    );

  const amountValue =
    data.amount ??
    root.amount;

  const currencyValue =
    data.currency ??
    root.currency;

  const amount =
    amountValue !==
      undefined &&
    amountValue !==
      null
      ? Number(
          amountValue,
        )
      : null;

  const currency =
    normalizeCurrency(
      currencyValue,
    ) || null;

  const merchantReference =
    normalizeString(
      data.merchant_reference ??
        data.reference ??
        root.merchant_reference ??
        root.reference,
    ) || null;

  if (!response.ok) {
    return {
      success: false,

      status: "failed",

      providerTransactionId:
        transactionUuid,

      merchantReference,

      amount:
        Number.isFinite(
          amount ?? NaN,
        )
          ? amount
          : null,

      currency,

      message:
        getProviderMessage(
          parsed,
          `Moko Afrika Card HTTP ${response.status}.`,
        ),

      failureReason:
        `MOKO_CARD_HTTP_${response.status}`,

      metadata: {
        httpStatus:
          response.status,

        response:
          parsed,
      },
    };
  }

  const success =
    status ===
    "successful";

  return {
    success,

    status,

    providerTransactionId:
      transactionUuid,

    merchantReference,

    amount:
      Number.isFinite(
        amount ?? NaN,
      )
        ? amount
        : null,

    currency,

    message:
      getProviderMessage(
        parsed,
        success
          ? "Paiement carte confirmé."
          : "Le paiement carte n'est pas encore confirmé.",
      ),

    failureReason:
      success
        ? null
        : status === "failed"
          ? "Moko Afrika a indiqué que le paiement a échoué."
          : null,

    metadata: {
      response:
        parsed,

      httpStatus:
        response.status,
    },
  };
}

/* =========================================================
   PARSING WEBHOOK CARTE
========================================================= */

export function parseMokoCardWebhook(
  payload: unknown,
): PaymentWebhookResult {
  const root =
    getObject(payload);

  const statusValue =
    root.status ??
    root.Status ??
    root.transaction_status ??
    root.transactionStatus ??
    root.decision;

  const status =
    normalizePaymentStatus(
      statusValue,
    );

  const transactionId =
    normalizeString(
      root.transaction_uuid ??
        root.transaction_id ??
        root.transactionId ??
        root.Transaction_id,
    ) || null;

  const merchantReference =
    normalizeString(
      root.merchant_reference ??
        root.merchantReference ??
        root.reference ??
        root.Reference,
    ) || null;

  const amountValue =
    root.amount ??
    root.Amount;

  const currencyValue =
    root.currency ??
    root.Currency;

  const amount =
    amountValue !==
      undefined &&
    amountValue !==
      null
      ? Number(
          amountValue,
        )
      : null;

  const currency =
    normalizeCurrency(
      currencyValue,
    ) || null;

  const message =
    getProviderMessage(
      payload,
      "Webhook Moko Afrika reçu.",
    );

  return {
    success:
      status ===
      "successful",

    status,

    merchantReference,

    providerTransactionId:
      transactionId,

    amount:
      Number.isFinite(
        amount ?? NaN,
      )
        ? amount
        : null,

    currency,

    message,

    failureReason:
      status === "failed"
        ? message
        : null,

    metadata: {
      webhook:
        payload,
    },
  };
}

/* =========================================================
   SIGNATURE WEBHOOK CARTE
========================================================= */

function verifyMokoCardWebhookSignatureFromEnv(
  rawBody: string,
  headers: Headers,
): boolean {
  const signatureHeader =
    headers.get(
      "X-FreshPay-Signature",
    );

  if (!signatureHeader) {
    return false;
  }

  const callbackSecret =
    process.env
      .MOKO_AFRIKA_CARD_CALLBACK_SECRET?.trim();

  if (!callbackSecret) {
    return false;
  }

  const match =
    signatureHeader.match(
      /(?:^|,)t=([^,]+),v1=([^,]+)/,
    );

  if (!match) {
    return false;
  }

  const timestamp =
    match[1];

  const providedSignature =
    match[2];

  const timestampNumber =
    Number(timestamp);

  if (
    !Number.isFinite(
      timestampNumber,
    )
  ) {
    return false;
  }

  const timestampMilliseconds =
    timestampNumber < 100000000000
      ? timestampNumber * 1000
      : timestampNumber;

  const age =
    Math.abs(
      Date.now() -
        timestampMilliseconds,
    );

  /*
   * Tolérance de 5 minutes.
   */
  if (
    age >
    5 * 60 * 1000
  ) {
    return false;
  }

  const expectedSignature =
    createCallbackSignature(
      rawBody,
      timestamp,
      callbackSecret,
    );

  return safeCompare(
    providedSignature,
    expectedSignature,
  );
}

/* =========================================================
   ADAPTATEUR MOKO AFRIKA
========================================================= */

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
      process.env
        .MOKO_AFRIKA_BASE_URL ||
      DEFAULT_MOBILE_MONEY_BASE_URL,

    countries: [
      "CG",
      "CD",
    ],

    /*
     * Moko / FreshPay est actuellement
     * utilisé par PharmaFlow pour CDF
     * et USD.
     *
     * XAF doit passer par le système
     * de conversion de devise avant
     * d'être envoyé à un fournisseur
     * qui ne le supporte pas.
     */
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

    /*
     * La configuration runtime Supabase
     * est vérifiée par engine.ts.
     *
     * On garde true ici pour éviter
     * qu'une absence de secret dans .env
     * désactive Moko alors que les secrets
     * sont enregistrés dans
     * platform_integration_configs.
     */
    enabled: true,
  },

  /* =======================================================
     CRÉER PAIEMENT
  ======================================================= */

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const paymentType =
      String(
        input.paymentMethodType ??
          "",
      )
        .trim()
        .toLowerCase();

    const requestedMethod =
      String(
        input.paymentMethod ??
          "",
      )
        .trim()
        .toLowerCase();

    const isCard =
      paymentType ===
        "card" ||
      requestedMethod ===
        "card" ||
      requestedMethod ===
        "visa" ||
      requestedMethod ===
        "mastercard";

    if (isCard) {
      return createCardPayment(
        input,
      );
    }

    return createMobileMoneyPayment(
      input,
    );
  },

  /* =======================================================
     VÉRIFIER PAIEMENT
  ======================================================= */

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const metadata =
      input.metadata ??
      {};

    const rail =
      normalizeString(
        metadata.rail,
      ).toLowerCase();

    const paymentMethod =
      normalizeString(
        metadata.payment_method,
      ).toLowerCase();

    const isCard =
      rail === "card" ||
      paymentMethod ===
        "card" ||
      Boolean(
        metadata.transaction_uuid,
      );

    if (isCard) {
      return verifyCardPayment(
        input,
      );
    }

    return verifyMobileMoneyPayment(
      input,
    );
  },

  /* =======================================================
     WEBHOOK
  ======================================================= */

  parseWebhook(
    payload: unknown,
    headers?: Headers,
  ): PaymentWebhookResult {
    /*
     * Les webhooks Mobile Money FreshPay
     * sont également acceptés ici.
     */

    const root =
      getObject(payload);

    const hasMobileMoneyFields =
      "Trans_Status" in root ||
      "trans_status" in root ||
      "PayDRC_Reference" in root ||
      "Financial_Institution_id" in root ||
      "Customer_Details" in root;

    if (
      hasMobileMoneyFields
    ) {
      const statusValue =
        root.Trans_Status ??
        root.trans_status ??
        root.Status ??
        root.status;

      const status =
        normalizePaymentStatus(
          statusValue,
        );

      const merchantReference =
        normalizeString(
          root.Reference ??
            root.reference ??
            root.merchant_reference,
        ) || null;

      const transactionId =
        normalizeString(
          root.Transaction_id ??
            root.transaction_id ??
            root.PayDRC_Reference ??
            root.paydrc_reference,
        ) || null;

      const amountValue =
        root.Amount ??
        root.amount;

      const currencyValue =
        root.Currency ??
        root.currency;

      const amount =
        amountValue !==
          undefined &&
        amountValue !==
          null
          ? Number(
              amountValue,
            )
          : null;

      const currency =
        normalizeCurrency(
          currencyValue,
        ) || null;

      const method =
        normalizeMobileMoneyMethod(
          root.Method ??
            root.method,
        );

      const message =
        getProviderMessage(
          payload,
          "Webhook Mobile Money Moko Afrika reçu.",
        );

      return {
        success:
          status ===
          "successful",

        status,

        merchantReference,

        providerTransactionId:
          transactionId,

        amount:
          Number.isFinite(
            amount ?? NaN,
          )
            ? amount
            : null,

        currency,

        paymentMethod:
          method as ProviderPaymentMethod,

        message,

        failureReason:
          status === "failed"
            ? message
            : null,

        metadata: {
          webhook:
            payload,

          method,
        },
      };
    }

    /*
     * Sinon, on traite comme webhook
     * carte.
     */
    const result =
      parseMokoCardWebhook(
        payload,
      );

    /*
     * La validation cryptographique
     * peut être effectuée par la route
     * webhook unifiée avec le secret
     * runtime.
     *
     * Ici on ne modifie pas le résultat.
     */
    void headers;

    return result;
  },

  /* =======================================================
     VÉRIFICATION SIGNATURE WEBHOOK
  ======================================================= */

  verifyWebhookSignature(
    payload: string,
    headers: Headers,
  ): boolean {
    return verifyMokoCardWebhookSignatureFromEnv(
      payload,
      headers,
    );
  },
};

/* =========================================================
   ALIAS COMPATIBILITÉ
========================================================= */

export const mokoAfrikaProvider =
  mokoAfrikaAdapter;