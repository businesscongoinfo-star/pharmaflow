import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

/* =========================================================
   TYPES
========================================================= */

type JsonObject =
  Record<string, unknown>;

type PaymentProvider =
  | "moko_afrika"
  | "yabetoo"
  | "gofreshpay";

type PaymentTransaction = {
  id: string;

  pharmacy_id: string;

  subscription_id:
    | string
    | null;

  provider:
    | string
    | null;

  merchant_reference:
    | string
    | null;

  provider_transaction_id:
    | string
    | null;

  amount:
    | number
    | null;

  currency:
    | string
    | null;

  payment_method:
    | string
    | null;

  status:
    | string
    | null;

  metadata:
    | JsonObject
    | null;

  paid_at:
    | string
    | null;

  created_at:
    | string
    | null;

  updated_at:
    | string
    | null;
};

/* =========================================================
   RESPONSE
========================================================= */

function jsonResponse(
  data: JsonObject,
  status = 200,
) {
  return NextResponse.json(
    data,
    {
      status,
    },
  );
}

/* =========================================================
   OBJECT
========================================================= */

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

/* =========================================================
   STRING
========================================================= */

function normalizeString(
  value: unknown,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const result =
    value.trim();

  return result
    ? result
    : null;
}

/* =========================================================
   AMOUNT
========================================================= */

function normalizeAmount(
  value: unknown,
): number | null {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    const normalized =
      value
        .trim()
        .replace(",", ".");

    const amount =
      Number(
        normalized,
      );

    return Number.isFinite(
      amount,
    )
      ? amount
      : null;
  }

  return null;
}

/* =========================================================
   CURRENCY
========================================================= */

function normalizeCurrency(
  value: unknown,
): string | null {
  const currency =
    normalizeString(
      value,
    );

  return currency
    ? currency.toUpperCase()
    : null;
}

/* =========================================================
   PROVIDER
========================================================= */

function normalizeProvider(
  value: unknown,
): PaymentProvider | null {
  const provider =
    normalizeString(
      value,
    )?.toLowerCase();

  if (
    provider ===
    "moko_afrika"
  ) {
    return "moko_afrika";
  }

  if (
    provider ===
    "yabetoo"
  ) {
    return "yabetoo";
  }

  if (
    provider ===
    "gofreshpay"
  ) {
    return "gofreshpay";
  }

  return null;
}

/* =========================================================
   METADATA
========================================================= */

function normalizeMetadata(
  value: unknown,
): JsonObject {
  return isObject(value)
    ? value
    : {};
}

/* =========================================================
   GET NESTED VALUE
========================================================= */

function getNestedValue(
  object: unknown,
  paths: string[][],
): unknown {
  for (
    const path of paths
  ) {
    let current =
      object;

    let found = true;

    for (
      const key of path
    ) {
      if (
        !isObject(
          current,
        ) ||
        !Object.prototype.hasOwnProperty.call(
          current,
          key,
        )
      ) {
        found = false;
        break;
      }

      current =
        current[key];
    }

    if (found) {
      return current;
    }
  }

  return undefined;
}

/* =========================================================
   GET REFERENCE
========================================================= */

function getMerchantReference(
  payload: JsonObject,
): string | null {
  const value =
    getNestedValue(
      payload,
      [
        ["merchant_reference"],
        ["merchantReference"],
        ["reference"],
        ["order_reference"],
        ["merchant_ref"],
        ["data", "merchant_reference"],
        ["data", "merchantReference"],
        ["data", "reference"],
      ],
    );

  return normalizeString(
    value,
  );
}

/* =========================================================
   GET PROVIDER TRANSACTION ID
========================================================= */

function getProviderTransactionId(
  payload: JsonObject,
): string | null {
  const value =
    getNestedValue(
      payload,
      [
        ["provider_transaction_id"],
        ["providerTransactionId"],
        ["transaction_uuid"],
        ["transaction_id"],
        ["transactionId"],
        ["Transaction_id"],
        ["data", "provider_transaction_id"],
        ["data", "providerTransactionId"],
        ["data", "transaction_uuid"],
        ["data", "transaction_id"],
      ],
    );

  return normalizeString(
    value,
  );
}

/* =========================================================
   GET AMOUNT
========================================================= */

function getWebhookAmount(
  payload: JsonObject,
): number | null {
  const value =
    getNestedValue(
      payload,
      [
        ["amount"],
        ["Amount"],
        ["data", "amount"],
      ],
    );

  return normalizeAmount(
    value,
  );
}

/* =========================================================
   GET CURRENCY
========================================================= */

function getWebhookCurrency(
  payload: JsonObject,
): string | null {
  const value =
    getNestedValue(
      payload,
      [
        ["currency"],
        ["Currency"],
        ["data", "currency"],
      ],
    );

  return normalizeCurrency(
    value,
  );
}

/* =========================================================
   GET STATUS
========================================================= */

function getWebhookStatus(
  payload: JsonObject,
): string | null {
  const value =
    getNestedValue(
      payload,
      [
        ["status"],
        ["Status"],
        ["transaction_status"],
        ["transactionStatus"],
        ["Trans_Status"],
        ["data", "status"],
        ["data", "transaction_status"],
        ["event_type"],
        ["event"],
      ],
    );

  return normalizeString(
    value,
  )?.toLowerCase() ??
    null;
}

/* =========================================================
   FIND TRANSACTION
========================================================= */

async function findPaymentTransaction(
  merchantReference:
    | string
    | null,
  providerTransactionId:
    | string
    | null,
): Promise<{
  transaction:
    | PaymentTransaction
    | null;

  error:
    | unknown
    | null;
}> {
  /*
   * -------------------------------------------------------
   * RECHERCHE PAR MERCHANT REFERENCE
   * -------------------------------------------------------
   */

  if (
    merchantReference
  ) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .select(
          `
            id,
            pharmacy_id,
            subscription_id,
            provider,
            merchant_reference,
            provider_transaction_id,
            amount,
            currency,
            payment_method,
            status,
            metadata,
            paid_at,
            created_at,
            updated_at
          `,
        )
        .eq(
          "merchant_reference",
          merchantReference,
        )
        .maybeSingle();

    if (error) {
      return {
        transaction:
          null,
        error,
      };
    }

    if (data) {
      return {
        transaction:
          data as PaymentTransaction,
        error: null,
      };
    }
  }

  /*
   * -------------------------------------------------------
   * RECHERCHE PAR PROVIDER TRANSACTION ID
   * -------------------------------------------------------
   */

  if (
    providerTransactionId
  ) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .select(
          `
            id,
            pharmacy_id,
            subscription_id,
            provider,
            merchant_reference,
            provider_transaction_id,
            amount,
            currency,
            payment_method,
            status,
            metadata,
            paid_at,
            created_at,
            updated_at
          `,
        )
        .eq(
          "provider_transaction_id",
          providerTransactionId,
        )
        .maybeSingle();

    if (error) {
      return {
        transaction:
          null,
        error,
      };
    }

    if (data) {
      return {
        transaction:
          data as PaymentTransaction,
        error: null,
      };
    }
  }

  return {
    transaction:
      null,
    error: null,
  };
}

/* =========================================================
   VERIFY INTERNALLY
========================================================= */

async function verifyThroughInternalEndpoint(
  request: NextRequest,
  transaction:
    PaymentTransaction,
) {
  const origin =
    new URL(
      request.url,
    ).origin;

  const verifyUrl =
    `${origin}/api/payments/verify`;

  const payload = {
    merchantReference:
      transaction.merchant_reference ??
      undefined,

    providerTransactionId:
      transaction.provider_transaction_id ??
      undefined,

    amount:
      transaction.amount ??
      undefined,

    currency:
      transaction.currency ??
      undefined,

    provider:
      transaction.provider ??
      undefined,
  };

  const verification =
    await fetch(
      verifyUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload,
          ),

        cache: "no-store",
      },
    );

  let data:
    | JsonObject
    | null =
    null;

  try {
    const parsed =
      await verification.json();

    if (
      isObject(parsed)
    ) {
      data = parsed;
    }
  } catch {
    data = null;
  }

  return {
    response:
      verification,

    data,
  };
}

/* =========================================================
   AMOUNT CHECK
========================================================= */

function amountMatches(
  expected:
    | number
    | null,
  received:
    | number
    | null,
): boolean {
  if (
    expected ===
      null ||
    received ===
      null
  ) {
    return true;
  }

  return (
    Math.abs(
      Number(expected) -
        Number(received),
    ) < 0.01
  );
}

/* =========================================================
   CURRENCY CHECK
========================================================= */

function currencyMatches(
  expected:
    | string
    | null,
  received:
    | string
    | null,
): boolean {
  if (
    !expected ||
    !received
  ) {
    return true;
  }

  return (
    expected
      .trim()
      .toUpperCase() ===
    received
      .trim()
      .toUpperCase()
  );
}

/* =========================================================
   WEBHOOK HANDLER
========================================================= */

async function handleWebhook(
  request: NextRequest,
) {
  /*
   * -------------------------------------------------------
   * 1. CORPS BRUT
   * -------------------------------------------------------
   */

  const rawBody =
    await request.text();

  if (!rawBody) {
    return jsonResponse(
      {
        success: false,

        message:
          "Empty webhook body",
      },
      400,
    );
  }

  /*
   * -------------------------------------------------------
   * 2. JSON
   * -------------------------------------------------------
   */

  let payload:
    | JsonObject
    | null =
    null;

  try {
    const parsed =
      JSON.parse(
        rawBody,
      );

    if (
      !isObject(parsed)
    ) {
      return jsonResponse(
        {
          success: false,

          message:
            "Invalid webhook payload",
        },
        400,
      );
    }

    payload = parsed;
  } catch {
    return jsonResponse(
      {
        success: false,

        message:
          "Invalid JSON",
      },
      400,
    );
  }

  /*
   * -------------------------------------------------------
   * 3. EXTRACTION
   * -------------------------------------------------------
   */

  const merchantReference =
    getMerchantReference(
      payload,
    );

  const providerTransactionId =
    getProviderTransactionId(
      payload,
    );

  const webhookAmount =
    getWebhookAmount(
      payload,
    );

  const webhookCurrency =
    getWebhookCurrency(
      payload,
    );

  const webhookStatus =
    getWebhookStatus(
      payload,
    );

  /*
   * -------------------------------------------------------
   * 4. LOG NON SENSIBLE
   * -------------------------------------------------------
   */

  console.log(
    "[Payment Webhook] received:",
    {
      merchantReference,

      providerTransactionId,

      amount:
        webhookAmount,

      currency:
        webhookCurrency,

      status:
        webhookStatus,
    },
  );

  /*
   * -------------------------------------------------------
   * 5. RÉFÉRENCE
   * -------------------------------------------------------
   */

  if (
    !merchantReference &&
    !providerTransactionId
  ) {
    return jsonResponse(
      {
        success: true,

        received: true,

        processed: false,

        message:
          "Webhook reçu mais aucune référence de transaction exploitable.",
      },
      200,
    );
  }

  /*
   * -------------------------------------------------------
   * 6. RECHERCHE TRANSACTION
   * -------------------------------------------------------
   */

  const search =
    await findPaymentTransaction(
      merchantReference,
      providerTransactionId,
    );

  if (
    search.error
  ) {
    console.error(
      "[Payment Webhook] Database search error:",
      search.error,
    );

    return jsonResponse(
      {
        success: false,

        message:
          "Unable to search payment transaction.",
      },
      500,
    );
  }

  const transaction =
    search.transaction;

  /*
   * -------------------------------------------------------
   * 7. TRANSACTION INCONNUE
   * -------------------------------------------------------
   */

  if (
    !transaction
  ) {
    console.warn(
      "[Payment Webhook] Transaction not found:",
      {
        merchantReference,

        providerTransactionId,
      },
    );

    /*
     * On retourne 200 pour éviter une boucle
     * de retry inutile du fournisseur.
     *
     * Aucun abonnement n'est activé.
     */
    return jsonResponse(
      {
        success: true,

        received: true,

        processed: false,

        message:
          "Webhook received but transaction not found.",
      },
      200,
    );
  }

  /*
   * -------------------------------------------------------
   * 8. FOURNISSEUR
   * -------------------------------------------------------
   */

  const provider =
    normalizeProvider(
      transaction.provider,
    );

  if (
    !provider
  ) {
    console.error(
      "[Payment Webhook] Unknown provider:",
      transaction.provider,
    );

    return jsonResponse(
      {
        success: false,

        received: true,

        processed: false,

        message:
          "Unknown payment provider.",

        transactionId:
          transaction.id,

        provider:
          transaction.provider,
      },
      409,
    );
  }

  /*
   * -------------------------------------------------------
   * 9. VÉRIFICATION MONTANT WEBHOOK
   * -------------------------------------------------------
   */

  if (
    !amountMatches(
      transaction.amount,
      webhookAmount,
    )
  ) {
    console.error(
      "[Payment Webhook] Amount mismatch:",
      {
        transactionId:
          transaction.id,

        expected:
          transaction.amount,

        received:
          webhookAmount,
      },
    );

    await supabaseAdmin
      .from(
        "payment_transactions",
      )
      .update({
        status:
          "failed",

        failure_reason:
          "Webhook amount mismatch.",

        metadata: {
          ...normalizeMetadata(
            transaction.metadata,
          ),

          webhook_verification:
            "amount_mismatch",

          webhook_amount:
            webhookAmount,

          webhook_received_at:
            new Date()
              .toISOString(),
        },

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        transaction.id,
      );

    return jsonResponse(
      {
        success: false,

        received: true,

        processed: false,

        message:
          "Amount mismatch.",

        transactionId:
          transaction.id,
      },
      409,
    );
  }

  /*
   * -------------------------------------------------------
   * 10. VÉRIFICATION DEVISE WEBHOOK
   * -------------------------------------------------------
   */

  if (
    !currencyMatches(
      transaction.currency,
      webhookCurrency,
    )
  ) {
    console.error(
      "[Payment Webhook] Currency mismatch:",
      {
        transactionId:
          transaction.id,

        expected:
          transaction.currency,

        received:
          webhookCurrency,
      },
    );

    await supabaseAdmin
      .from(
        "payment_transactions",
      )
      .update({
        status:
          "failed",

        failure_reason:
          "Webhook currency mismatch.",

        metadata: {
          ...normalizeMetadata(
            transaction.metadata,
          ),

          webhook_verification:
            "currency_mismatch",

          webhook_currency:
            webhookCurrency,

          webhook_received_at:
            new Date()
              .toISOString(),
        },

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        transaction.id,
      );

    return jsonResponse(
      {
        success: false,

        received: true,

        processed: false,

        message:
          "Currency mismatch.",

        transactionId:
          transaction.id,
      },
      409,
    );
  }

  /*
   * -------------------------------------------------------
   * 11. PROTECTION DOUBLE ACTIVATION
   * -------------------------------------------------------
   */

  const metadata =
    normalizeMetadata(
      transaction.metadata,
    );

  const activationStatus =
    normalizeString(
      metadata.activation_status,
    );

  if (
    transaction.status ===
      "successful" &&
    activationStatus ===
      "activated"
  ) {
    return jsonResponse(
      {
        success: true,

        received: true,

        processed: true,

        alreadyProcessed:
          true,

        paymentId:
          transaction.id,

        provider,

        status:
          "successful",

        activated:
          true,
      },
      200,
    );
  }

  /*
   * -------------------------------------------------------
   * 12. MISE À JOUR INFORMATIONS WEBHOOK
   * -------------------------------------------------------
   */

  const webhookMetadata = {
    ...metadata,

    webhook_received:
      true,

    webhook_received_at:
      new Date()
        .toISOString(),

    webhook_status:
      webhookStatus,

    webhook_amount:
      webhookAmount,

    webhook_currency:
      webhookCurrency,

    webhook_provider:
      provider,
  };

  /*
   * -------------------------------------------------------
   * 13. SAUVEGARDER L'ID FOURNISSEUR
   * -------------------------------------------------------
   */

  const providerIdToSave =
    providerTransactionId ??
    transaction.provider_transaction_id ??
    null;

  const merchantReferenceToSave =
    merchantReference ??
    transaction.merchant_reference ??
    null;

  const { error: webhookUpdateError } =
    await supabaseAdmin
      .from(
        "payment_transactions",
      )
      .update({
        provider_transaction_id:
          providerIdToSave,

        merchant_reference:
          merchantReferenceToSave,

        metadata:
          webhookMetadata,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        transaction.id,
      );

  if (
    webhookUpdateError
  ) {
    console.error(
      "[Payment Webhook] Failed to save webhook data:",
      webhookUpdateError,
    );

    return jsonResponse(
      {
        success: false,

        message:
          "Unable to save webhook information.",

        transactionId:
          transaction.id,
      },
      500,
    );
  }

  /*
   * -------------------------------------------------------
   * 14. VÉRIFICATION SERVEUR
   * -------------------------------------------------------
   *
   * IMPORTANT :
   *
   * Le webhook n'active jamais directement
   * l'abonnement.
   *
   * Il demande à /api/payments/verify
   * de vérifier réellement le paiement
   * auprès du fournisseur.
   */

  let verification;

  try {
    verification =
      await verifyThroughInternalEndpoint(
        request,
        {
          ...transaction,

          provider_transaction_id:
            providerIdToSave,

          merchant_reference:
            merchantReferenceToSave,
        },
      );
  } catch (error) {
    console.error(
      "[Payment Webhook] Internal verification error:",
      error,
    );

    return jsonResponse(
      {
        success: false,

        message:
          "Internal payment verification failed.",

        transactionId:
          transaction.id,
      },
      500,
    );
  }

  /*
   * -------------------------------------------------------
   * 15. RÉPONSE VERIFICATION
   * -------------------------------------------------------
   */

  const verificationData =
    verification.data;

  /*
   * Le endpoint verify peut retourner
   * 200 même pour un paiement pending/failed.
   *
   * Nous regardons donc success,
   * verified et paymentStatus.
   */

  const verified =
    verificationData?.verified ===
    true;

  const paymentStatus =
    normalizeString(
      verificationData?.paymentStatus,
    );

  const activationStatusFromVerification =
    normalizeString(
      verificationData?.activationStatus,
    );

  /*
   * -------------------------------------------------------
   * 16. VERIFICATION SUCCESSFUL
   * -------------------------------------------------------
   */

  if (
    verified &&
    paymentStatus ===
      "successful"
  ) {
    return jsonResponse(
      {
        success: true,

        received: true,

        processed: true,

        paymentId:
          transaction.id,

        provider,

        status:
          "successful",

        activated:
          activationStatusFromVerification ===
          "activated",

        activationStatus:
          activationStatusFromVerification ??
          "pending",

        verification:
          verificationData,
      },
      200,
    );
  }

  /*
   * -------------------------------------------------------
   * 17. PENDING
   * -------------------------------------------------------
   */

  if (
    paymentStatus ===
    "pending"
  ) {
    return jsonResponse(
      {
        success: true,

        received: true,

        processed: true,

        paymentId:
          transaction.id,

        provider,

        status:
          "pending",

        activated:
          false,

        message:
          "Payment is still pending.",
      },
      200,
    );
  }

  /*
   * -------------------------------------------------------
   * 18. FAILED
   * -------------------------------------------------------
   */

  if (
    paymentStatus ===
    "failed" ||
    paymentStatus ===
      "cancelled" ||
    paymentStatus ===
      "expired"
  ) {
    return jsonResponse(
      {
        success: true,

        received: true,

        processed: true,

        paymentId:
          transaction.id,

        provider,

        status:
          paymentStatus,

        activated:
          false,

        message:
          "Payment was not successful.",
      },
      200,
    );
  }

  /*
   * -------------------------------------------------------
   * 19. VERIFICATION IMPOSSIBLE
   * -------------------------------------------------------
   */

  console.warn(
    "[Payment Webhook] Verification unresolved:",
    {
      transactionId:
        transaction.id,

      provider,

      verificationStatus:
        verification.response.status,

      verificationData,
    },
  );

  /*
   * On ne transforme pas un paiement
   * en failed simplement parce que
   * la vérification est temporairement
   * indisponible.
   */
  await supabaseAdmin
    .from(
      "payment_transactions",
    )
    .update({
      metadata: {
        ...webhookMetadata,

        verification_status:
          "pending",

        verification_http_status:
          verification.response.status,

        verification_checked_at:
          new Date()
            .toISOString(),
      },

      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "id",
      transaction.id,
    );

  return jsonResponse(
    {
      success: true,

      received: true,

      processed: true,

      paymentId:
        transaction.id,

      provider,

      status:
        "pending",

      activated:
        false,

      message:
        "Webhook received. Payment verification is pending.",
    },
    200,
  );
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest,
) {
  try {
    return await handleWebhook(
      request,
    );
  } catch (error) {
    console.error(
      "[Payment Webhook] Unexpected error:",
      error,
    );

    /*
     * 500 uniquement lorsqu'il y a
     * réellement une erreur serveur.
     *
     * Le fournisseur pourra alors
     * réessayer son webhook.
     */

    return jsonResponse(
      {
        success: false,

        message:
          "Internal webhook error.",
      },
      500,
    );
  }
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  return jsonResponse(
    {
      success: true,

      service:
        "PharmaFlow Payment Webhook",

      providers: [
        "moko_afrika",
        "yabetoo",
        "gofreshpay",
      ],

      status:
        "ready",
    },
    200,
  );
}