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

const SANDBOX_BASE_URL =
  "https://api-m.sandbox.paypal.com";

const PRODUCTION_BASE_URL =
  "https://api-m.paypal.com";

function getMode() {
  return process.env.PAYPAL_MODE ===
    "production"
    ? "production"
    : "sandbox";
}

function getBaseUrl() {
  return (
    process.env.PAYPAL_BASE_URL ||
    (getMode() === "production"
      ? PRODUCTION_BASE_URL
      : SANDBOX_BASE_URL)
  ).replace(/\/+$/, "");
}

function getClientId() {
  return (
    process.env.PAYPAL_CLIENT_ID ||
    ""
  ).trim();
}

function getClientSecret() {
  return (
    process.env.PAYPAL_CLIENT_SECRET ||
    ""
  ).trim();
}

function getWebhookId() {
  return (
    process.env.PAYPAL_WEBHOOK_ID ||
    ""
  ).trim();
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
      "error_description",
      "error",
      "name",
      "details",
    ]) {
      const value =
        record[key];

      if (
        typeof value ===
          "string" &&
        value.trim()
      ) {
        return value;
      }
    }

    if (
      Array.isArray(
        record.details,
      )
    ) {
      const first =
        record.details[0];

      if (
        first &&
        typeof first ===
          "object"
      ) {
        const detail =
          first as Record<
            string,
            unknown
          >;

        if (
          typeof detail.description ===
            "string" &&
          detail.description
        ) {
          return detail.description;
        }
      }
    }
  }

  return fallback;
}

async function getAccessToken(): Promise<
  string | null
> {
  const clientId =
    getClientId();

  const clientSecret =
    getClientSecret();

  if (
    !clientId ||
    !clientSecret
  ) {
    return null;
  }

  const credentials =
    Buffer.from(
      `${clientId}:${clientSecret}`,
    ).toString("base64");

  const response =
    await fetch(
      `${getBaseUrl()}/v1/oauth2/token`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${credentials}`,

          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept:
            "application/json",
        },

        body:
          "grant_type=client_credentials",

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
    console.error(
      "PAYPAL TOKEN ERROR:",
      data,
    );

    return null;
  }

  if (
    !data ||
    typeof data !== "object"
  ) {
    return null;
  }

  const record =
    data as Record<
      string,
      unknown
    >;

  return typeof record.access_token ===
    "string"
    ? record.access_token
    : null;
}

function getApproveLink(
  data: unknown,
) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return null;
  }

  const record =
    data as Record<
      string,
      unknown
    >;

  const links =
    Array.isArray(
      record.links,
    )
      ? record.links
      : [];

  for (const link of links) {
    if (
      link &&
      typeof link ===
        "object"
    ) {
      const item =
        link as Record<
          string,
          unknown
        >;

      if (
        item.rel ===
          "approve" &&
        typeof item.href ===
          "string"
      ) {
        return item.href;
      }
    }
  }

  return null;
}

function extractAmount(
  record: Record<
    string,
    unknown
  >,
) {
  const purchaseUnits =
    Array.isArray(
      record.purchase_units,
    )
      ? record.purchase_units
      : [];

  const first =
    purchaseUnits[0];

  if (
    !first ||
    typeof first !==
      "object"
  ) {
    return null;
  }

  const unit =
    first as Record<
      string,
      unknown
    >;

  const amount =
    unit.amount;

  if (
    !amount ||
    typeof amount !==
      "object"
  ) {
    return null;
  }

  const amountRecord =
    amount as Record<
      string,
      unknown
    >;

  if (
    typeof amountRecord.value ===
    "number"
  ) {
    return amountRecord.value;
  }

  if (
    typeof amountRecord.value ===
    "string"
  ) {
    const value =
      Number(
        amountRecord.value,
      );

    return Number.isFinite(
      value,
    )
      ? value
      : null;
  }

  return null;
}

function extractCurrency(
  record: Record<
    string,
    unknown
  >,
) {
  const purchaseUnits =
    Array.isArray(
      record.purchase_units,
    )
      ? record.purchase_units
      : [];

  const first =
    purchaseUnits[0];

  if (
    !first ||
    typeof first !==
      "object"
  ) {
    return null;
  }

  const unit =
    first as Record<
      string,
      unknown
    >;

  const amount =
    unit.amount;

  if (
    !amount ||
    typeof amount !==
      "object"
  ) {
    return null;
  }

  const amountRecord =
    amount as Record<
      string,
      unknown
    >;

  return typeof amountRecord.currency_code ===
    "string"
    ? amountRecord.currency_code
    : null;
}

export const paypalAdapter:
  PaymentProviderAdapter = {
  code: "paypal",

  name: "PayPal",

  config: {
    code: "paypal",

    name: "PayPal",

    mode: getMode(),

    baseUrl:
      getBaseUrl(),

    /*
     * PayPal support depends on the merchant
     * account, buyer country and currency.
     *
     * We intentionally do not hard-code a
     * false list of every supported country.
     */
    countries: [],

    currencies: [
      "USD",
      "EUR",
      "GBP",
      "CAD",
      "AUD",
      "JPY",
      "CHF",
      "SGD",
      "HKD",
      "NZD",
    ],

    paymentMethods: [
      "wallet",
      "card",
    ],

    enabled:
      Boolean(
        getClientId() &&
          getClientSecret(),
      ),
  },

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const clientId =
      getClientId();

    const clientSecret =
      getClientSecret();

    if (
      !clientId ||
      !clientSecret
    ) {
      return {
        success: false,

        status: "failed",

        merchantReference:
          input.merchantReference,

        message:
          "PayPal n'est pas configuré sur le serveur.",

        errorCode:
          "PAYPAL_NOT_CONFIGURED",
      };
    }

    /*
     * PayPal Checkout nécessite une devise
     * acceptée par PayPal pour le compte marchand.
     */
    const currency =
      input.currency
        .toUpperCase();

    const amount =
      Number(
        input.amount,
      );

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      return {
        success: false,

        status: "failed",

        merchantReference:
          input.merchantReference,

        message:
          "Montant PayPal invalide.",

        errorCode:
          "PAYPAL_INVALID_AMOUNT",
      };
    }

    const accessToken =
      await getAccessToken();

    if (!accessToken) {
      return {
        success: false,

        status: "failed",

        merchantReference:
          input.merchantReference,

        message:
          "Impossible d'obtenir le jeton d'accès PayPal.",

        errorCode:
          "PAYPAL_AUTH_ERROR",
      };
    }

    const description =
      input.description ??
      `Abonnement PharmaFlow - ${input.merchantReference}`;

    const payload = {
      intent:
        "CAPTURE",

      purchase_units: [
        {
          reference_id:
            input.merchantReference,

          description,

          custom_id:
            input.merchantReference,

          amount: {
            currency_code:
              currency,

            value:
              amount.toFixed(
                2,
              ),
          },
        },
      ],

      application_context: {
        user_action:
          "PAY_NOW",

        shipping_preference:
          "NO_SHIPPING",
      },
    };

    try {
      const response =
        await fetch(
          `${getBaseUrl()}/v2/checkout/orders`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "PayPal-Request-Id":
                input.merchantReference,
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
              "PayPal a refusé la création de la commande.",
            ),

          errorCode:
            `PAYPAL_HTTP_${response.status}`,
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

      const orderId =
        typeof record.id ===
        "string"
          ? record.id
          : null;

      const rawStatus =
        record.status ??
        "CREATED";

      const status =
        normalizePaymentStatus(
          rawStatus,
        );

      const checkoutUrl =
        getApproveLink(
          record,
        );

      return {
        /*
         * La commande PayPal n'est pas encore
         * payée à cette étape.
         */
        success: false,

        status,

        providerTransactionId:
          orderId,

        merchantReference:
          input.merchantReference,

        checkoutUrl,

        message:
          checkoutUrl
            ? "Commande PayPal créée. Redirection vers PayPal."
            : "Commande PayPal créée.",

        metadata: {
          provider_response:
            record,

          paypal_order_id:
            orderId,
        },
      };
    } catch (error) {
      console.error(
        "PAYPAL CREATE:",
        error,
      );

      return {
        success: false,

        status: "failed",

        merchantReference:
          input.merchantReference,

        message:
          "Impossible de contacter PayPal.",

        errorCode:
          "PAYPAL_NETWORK_ERROR",
      };
    }
  },

  async verifyPayment(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const orderId =
      input.providerTransactionId;

    if (!orderId) {
      return {
        success: false,

        status: "failed",

        merchantReference:
          input.merchantReference ??
          null,

        message:
          "Identifiant de commande PayPal manquant.",
      };
    }

    const accessToken =
      await getAccessToken();

    if (!accessToken) {
      return {
        success: false,

        status: "failed",

        merchantReference:
          input.merchantReference ??
          null,

        providerTransactionId:
          orderId,

        message:
          "Impossible d'obtenir le jeton PayPal.",
      };
    }

    try {
      const response =
        await fetch(
          `${getBaseUrl()}/v2/checkout/orders/${encodeURIComponent(
            orderId,
          )}`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

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
            orderId,

          message:
            getErrorMessage(
              data,
              "Impossible de vérifier la commande PayPal.",
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
        extractAmount(
          record,
        );

      const currency =
        extractCurrency(
          record,
        );

      return {
        success:
          status ===
          "successful",

        status,

        merchantReference:
          input.merchantReference ??
          null,

        providerTransactionId:
          orderId,

        amount,

        currency,

        message:
          status ===
          "successful"
            ? "Paiement PayPal confirmé."
            : "Statut PayPal récupéré.",

        metadata: {
          provider_response:
            record,
        },
      };
    } catch (error) {
      console.error(
        "PAYPAL VERIFY:",
        error,
      );

      return {
        success: false,

        status: "pending",

        merchantReference:
          input.merchantReference ??
          null,

        providerTransactionId:
          orderId,

        message:
          "Vérification PayPal temporairement indisponible.",
      };
    }
  },

  parseWebhook(
    payload: unknown,
    headers?: Headers,
  ): PaymentWebhookResult {
    const record =
      payload &&
      typeof payload ===
        "object"
        ? (payload as Record<
            string,
            unknown
          >)
        : {};

    const eventType =
      typeof record.event_type ===
      "string"
        ? record.event_type
        : "";

    let status =
      "pending";

    if (
      eventType ===
        "PAYMENT.CAPTURE.COMPLETED" ||
      eventType ===
        "CHECKOUT.ORDER.COMPLETED"
    ) {
      status =
        "successful";
    } else if (
      eventType ===
        "PAYMENT.CAPTURE.DENIED" ||
      eventType ===
        "PAYMENT.CAPTURE.DECLINED" ||
      eventType ===
        "PAYMENT.CAPTURE.REVERSED"
    ) {
      status =
        "failed";
    } else if (
      eventType ===
        "PAYMENT.CAPTURE.PENDING"
    ) {
      status =
        "pending";
    } else if (
      eventType ===
        "CHECKOUT.ORDER.CANCELLED"
    ) {
      status =
        "cancelled";
    }

    const resource =
      record.resource &&
      typeof record.resource ===
        "object"
        ? (record.resource as Record<
            string,
            unknown
          >)
        : {};

    const resourceId =
      typeof resource.id ===
      "string"
        ? resource.id
        : null;

    const customId =
      typeof resource.custom_id ===
      "string"
        ? resource.custom_id
        : null;

    const supplementaryData =
      resource.supplementary_data;

    const merchantReference =
      customId ??
      (typeof record.custom_id ===
      "string"
        ? record.custom_id
        : null);

    let amount:
      number | null = null;

    let currency:
      string | null = null;

    const resourceAmount =
      resource.amount;

    if (
      resourceAmount &&
      typeof resourceAmount ===
        "object"
    ) {
      const amountRecord =
        resourceAmount as Record<
          string,
          unknown
        >;

      if (
        typeof amountRecord.value ===
        "number"
      ) {
        amount =
          amountRecord.value;
      } else if (
        typeof amountRecord.value ===
        "string"
      ) {
        const parsed =
          Number(
            amountRecord.value,
          );

        amount =
          Number.isFinite(
            parsed,
          )
            ? parsed
            : null;
      }

      if (
        typeof amountRecord.currency_code ===
        "string"
      ) {
        currency =
          amountRecord.currency_code;
      }
    }

    if (
      !currency ||
      amount === null
    ) {
      const purchaseUnit =
        Array.isArray(
          resource.purchase_units,
        )
          ? resource
              .purchase_units[0]
          : null;

      if (
        purchaseUnit &&
        typeof purchaseUnit ===
          "object"
      ) {
        const unit =
          purchaseUnit as Record<
            string,
            unknown
          >;

        const unitAmount =
          unit.amount;

        if (
          unitAmount &&
          typeof unitAmount ===
            "object"
        ) {
          const amountRecord =
            unitAmount as Record<
              string,
              unknown
            >;

          if (
            !currency &&
            typeof amountRecord.currency_code ===
              "string"
          ) {
            currency =
              amountRecord.currency_code;
          }

          if (
            amount === null &&
            typeof amountRecord.value ===
              "string"
          ) {
            const parsed =
              Number(
                amountRecord.value,
              );

            amount =
              Number.isFinite(
                parsed,
              )
                ? parsed
                : null;
          }
        }
      }
    }

    return {
      success:
        status ===
        "successful",

      status:
        normalizePaymentStatus(
          status,
        ),

      merchantReference,

      providerTransactionId:
        resourceId,

      amount,

      currency,

      message:
        `Webhook PayPal reçu${
          eventType
            ? `: ${eventType}`
            : "."
        }`,

      metadata: {
        webhook:
          record,

        event_type:
          eventType,

        webhook_id:
          getWebhookId(),

        supplementary_data:
          supplementaryData,

        headers: headers
          ? {
              transmission_id:
                headers.get(
                  "paypal-transmission-id",
                ),

              transmission_time:
                headers.get(
                  "paypal-transmission-time",
                ),

              cert_url:
                headers.get(
                  "paypal-cert-url",
                ),

              auth_algo:
                headers.get(
                  "paypal-auth-algo",
                ),

              transmission_sig:
                headers.get(
                  "paypal-transmission-sig",
                ),
            }
          : null,
      },
    };
  },
};

export const paypalProvider =
  paypalAdapter;