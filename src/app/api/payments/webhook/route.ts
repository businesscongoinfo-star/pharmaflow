import { NextRequest, NextResponse } from "next/server";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  mokoAfrikaAdapter,
  parseMokoCardWebhook,
} from "@/app/lib/payments/moko-afrika";

import {
  yabetooAdapter,
} from "@/app/lib/payments/yabetoo";

import type {
  PaymentProviderCode,
  PaymentWebhookResult,
  VerifyPaymentResult,
} from "@/app/lib/payments/types";

import {
  normalizePaymentStatus,
} from "@/app/lib/payments/types";

/*
|--------------------------------------------------------------------------
| RUNTIME
|--------------------------------------------------------------------------
*/

export const runtime = "nodejs";

/*
|--------------------------------------------------------------------------
| SUPABASE ADMIN
|--------------------------------------------------------------------------
*/

function getSupabaseAdmin(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type PaymentTransactionRow = {
  id: string;

  pharmacy_id:
    | string
    | null;

  subscription_id:
    | string
    | null;

  provider_id:
    | string
    | null;

  provider: string;

  merchant_reference: string;

  provider_transaction_id:
    | string
    | null;

  amount: number;

  currency: string;

  payment_method: string;

  status: string;

  checkout_url:
    | string
    | null;

  customer_name:
    | string
    | null;

  customer_email:
    | string
    | null;

  customer_phone:
    | string
    | null;

  metadata:
    | Record<string, unknown>
    | null;

  failure_reason:
    | string
    | null;

  created_at: string;

  updated_at: string;

  paid_at:
    | string
    | null;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function jsonError(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    },
  );
}

function jsonSuccess(
  message: string,
  data: Record<string, unknown> = {},
) {
  return NextResponse.json({
    success: true,
    message,
    ...data,
  });
}

/*
|--------------------------------------------------------------------------
| PROVIDER NORMALIZATION
|--------------------------------------------------------------------------
*/

function normalizeProvider(
  value: unknown,
): PaymentProviderCode | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const provider =
    value
      .trim()
      .toLowerCase()
      .replace(/-/g, "_");

  if (
    provider === "moko" ||
    provider === "moko_afrika" ||
    provider === "gofreshpay" ||
    provider === "freshpay"
  ) {
    return "moko_afrika";
  }

  if (
    provider === "yabetoo" ||
    provider === "yabétoo" ||
    provider === "yabetoopay"
  ) {
    return "yabetoo";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| CARD WEBHOOK DETECTION
|--------------------------------------------------------------------------
*/

function isMokoCardWebhook(
  request: NextRequest,
  payload: unknown,
): boolean {
  const cardSignature =
    request.headers.get(
      "x-freshpay-signature",
    );

  if (cardSignature) {
    return true;
  }

  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const body =
      payload as Record<
        string,
        unknown
      >;

    if (
      body.transaction_uuid !==
        undefined ||
      body.decision !==
        undefined ||
      body.merchant_reference !==
        undefined
    ) {
      return true;
    }
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| PROVIDER DETECTION
|--------------------------------------------------------------------------
*/

function detectProvider(
  payload: unknown,
  request: NextRequest,
): PaymentProviderCode {
  if (
    isMokoCardWebhook(
      request,
      payload,
    )
  ) {
    return "moko_afrika";
  }

  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const body =
      payload as Record<
        string,
        unknown
      >;

    const explicitProvider =
      normalizeProvider(
        body.provider ??
          body.provider_code ??
          body.payment_provider ??
          body.gateway,
      );

    if (
      explicitProvider
    ) {
      return explicitProvider;
    }

    /*
     * Format FreshPay.
     */

    if (
      typeof body.data ===
      "string"
    ) {
      return "moko_afrika";
    }

    /*
     * Format Moko JSON.
     */

    if (
      body.Trans_Status !==
        undefined ||
      body.PayDRC_Reference !==
        undefined ||
      body.Financial_Institution_id !==
        undefined
    ) {
      return "moko_afrika";
    }

    /*
     * Yabétoo.
     */

    if (
      body.payment_intent !==
        undefined ||
      body.payment_intent_id !==
        undefined
    ) {
      return "yabetoo";
    }
  }

  const headerProvider =
    normalizeProvider(
      request.headers.get(
        "x-payment-provider",
      ) ??
        request.headers.get(
          "x-provider",
        ),
    );

  if (
    headerProvider
  ) {
    return headerProvider;
  }

  return "moko_afrika";
}

/*
|--------------------------------------------------------------------------
| PARSE PROVIDER WEBHOOK
|--------------------------------------------------------------------------
*/

async function parseProviderWebhook(
  provider: PaymentProviderCode,
  payload: unknown,
  rawBody: string,
  headers: Headers,
  request: NextRequest,
): Promise<PaymentWebhookResult> {
  /*
   * MOKO AFRIKA
   */

  if (
    provider ===
    "moko_afrika"
  ) {
    /*
     * CARD WEBHOOK
     *
     * Le parser carte actuel est appelé
     * avec son argument attendu.
     */
    if (
      isMokoCardWebhook(
        request,
        payload,
      )
    ) {
      /*
       * Le parser carte reçoit le raw body.
       *
       * La vérification complémentaire de signature
       * reste gérée par l'adaptateur selon sa
       * configuration actuelle.
       */
      return parseMokoCardWebhook(
        rawBody,
      );
    }

    /*
     * MOBILE MONEY
     */

    if (
      !mokoAfrikaAdapter.parseWebhook
    ) {
      throw new Error(
        "Moko Afrika webhook parser is not configured.",
      );
    }

    /*
     * Le parseWebhook de l'adaptateur actuel
     * accepte un seul argument.
     */
    return mokoAfrikaAdapter.parseWebhook(
      payload,
    );
  }

  /*
   * YABÉTOO
   */

  if (
    provider ===
    "yabetoo"
  ) {
    if (
      !yabetooAdapter.parseWebhook
    ) {
      throw new Error(
        "Yabétoo webhook parser is not configured.",
      );
    }

    /*
     * Même principe :
     * un seul argument pour rester compatible
     * avec la signature actuelle de l'adaptateur.
     */
    return yabetooAdapter.parseWebhook(
      payload,
    );
  }

  throw new Error(
    `Unsupported payment provider: ${provider}`,
  );
}

/*
|--------------------------------------------------------------------------
| FIND TRANSACTION
|--------------------------------------------------------------------------
*/

async function findTransaction(
  supabase: SupabaseClient,
  webhook: PaymentWebhookResult,
): Promise<
  PaymentTransactionRow | null
> {
  /*
   * Recherche prioritaire par référence marchand.
   */

  if (
    webhook.merchantReference
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "payment_transactions",
      )
      .select("*")
      .eq(
        "merchant_reference",
        webhook.merchantReference,
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    if (data) {
      return data as PaymentTransactionRow;
    }
  }

  /*
   * Recherche secondaire par transaction provider.
   */

  if (
    webhook.providerTransactionId
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "payment_transactions",
      )
      .select("*")
      .eq(
        "provider_transaction_id",
        webhook.providerTransactionId,
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    if (data) {
      return data as PaymentTransactionRow;
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| UPDATE TRANSACTION
|--------------------------------------------------------------------------
*/

async function updateTransaction(
  supabase: SupabaseClient,
  transactionId: string,
  values: Record<string, unknown>,
) {
  const {
    error,
  } = await supabase
    .from(
      "payment_transactions",
    )
    .update(values)
    .eq(
      "id",
      transactionId,
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }
}

/*
|--------------------------------------------------------------------------
| VERIFY PAYMENT
|--------------------------------------------------------------------------
*/

async function verifyPayment(
  provider: PaymentProviderCode,
  transaction: PaymentTransactionRow,
): Promise<VerifyPaymentResult> {
  /*
   * MOKO AFRIKA
   */

  if (
    provider ===
    "moko_afrika"
  ) {
    return mokoAfrikaAdapter.verifyPayment(
      {
        pharmacyId:
          transaction.pharmacy_id ??
          "",

        merchantReference:
          transaction.merchant_reference,

        providerTransactionId:
          transaction.provider_transaction_id ??
          undefined,

        expectedAmount:
          transaction.amount,

        expectedCurrency:
          transaction.currency,

        metadata:
          transaction.metadata ??
          undefined,
      },
    );
  }

  /*
   * YABÉTOO
   */

  if (
    provider ===
    "yabetoo"
  ) {
    return yabetooAdapter.verifyPayment(
      {
        pharmacyId:
          transaction.pharmacy_id ??
          "",

        merchantReference:
          transaction.merchant_reference,

        providerTransactionId:
          transaction.provider_transaction_id ??
          undefined,

        expectedAmount:
          transaction.amount,

        expectedCurrency:
          transaction.currency,

        metadata:
          transaction.metadata ??
          undefined,
      },
    );
  }

  return {
    success: false,

    status:
      "failed",

    message:
      "Unsupported payment provider.",
  };
}

/*
|--------------------------------------------------------------------------
| ACTIVATE SUBSCRIPTION
|--------------------------------------------------------------------------
*/

async function activateSubscription(
  supabase: SupabaseClient,
  paymentId: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "pf_activate_subscription_from_payment",
    {
      p_payment_id:
        paymentId,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| SECURITY ERRORS
|--------------------------------------------------------------------------
*/

function isSecurityFailure(
  failureReason:
    | string
    | null
    | undefined,
): boolean {
  if (
    !failureReason
  ) {
    return false;
  }

  return new Set([
    "SIGNATURE_MISSING",
    "INVALID_SIGNATURE_FORMAT",
    "SIGNATURE_TIMESTAMP_EXPIRED",
    "INVALID_SIGNATURE",
    "CALLBACK_SECRET_MISSING",
    "INVALID_JSON",
  ]).has(
    failureReason,
  );
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * Le body brut est lu une seule fois.
     */

    const rawBody =
      await request.text();

    if (
      !rawBody.trim()
    ) {
      return jsonError(
        "Empty webhook body.",
      );
    }

    /*
     * JSON.
     */

    let payload: unknown;

    try {
      payload =
        JSON.parse(
          rawBody,
        );
    } catch {
      return jsonError(
        "Invalid JSON webhook payload.",
      );
    }

    /*
     * Provider.
     */

    const provider =
      detectProvider(
        payload,
        request,
      );

    /*
     * Parser.
     */

    const webhook =
      await parseProviderWebhook(
        provider,
        payload,
        rawBody,
        request.headers,
        request,
      );

    /*
     * Sécurité.
     */

    if (
      isSecurityFailure(
        webhook.failureReason,
      )
    ) {
      console.error(
        "[PAYMENT WEBHOOK] Security failure",
        {
          provider,
          reason:
            webhook.failureReason,
        },
      );

      if (
        webhook.failureReason ===
        "CALLBACK_SECRET_MISSING"
      ) {
        return jsonError(
          "Payment callback secret is not configured.",
          500,
        );
      }

      return jsonError(
        "Invalid payment webhook signature.",
        401,
      );
    }

    /*
     * Erreur chiffrement.
     */

    if (
      webhook.failureReason ===
      "INVALID_ENCRYPTION"
    ) {
      return jsonError(
        "Invalid webhook encryption.",
        400,
      );
    }

    /*
     * Référence obligatoire.
     */

    if (
      !webhook.merchantReference &&
      !webhook.providerTransactionId
    ) {
      return jsonError(
        "Webhook transaction reference is missing.",
      );
    }

    /*
     * Supabase admin.
     */

    const supabase =
      getSupabaseAdmin();

    /*
     * Transaction.
     */

    const transaction =
      await findTransaction(
        supabase,
        webhook,
      );

    /*
     * Transaction inconnue.
     */

    if (!transaction) {
      console.warn(
        "[PAYMENT WEBHOOK] Unknown transaction",
        {
          provider,

          merchantReference:
            webhook.merchantReference,

          providerTransactionId:
            webhook.providerTransactionId,
        },
      );

      return jsonSuccess(
        "Webhook received but transaction was not found.",
        {
          processed: false,
        },
      );
    }

    /*
     * Vérification du fournisseur.
     */

    const storedProvider =
      normalizeProvider(
        transaction.provider,
      );

    if (
      storedProvider &&
      storedProvider !==
        provider
    ) {
      return jsonError(
        "Payment provider mismatch.",
        409,
      );
    }

    /*
     * Métadonnées webhook.
     */

    const existingMetadata =
      transaction.metadata ??
      {};

    const webhookMetadata: Record<
      string,
      unknown
    > = {
      ...existingMetadata,

      webhook_received:
        true,

      webhook_provider:
        provider,

      webhook_payload:
        payload,

      webhook_received_at:
        new Date().toISOString(),
    };

    /*
     * ID provider.
     */

    const providerTransactionId =
      webhook.providerTransactionId ??
      transaction.provider_transaction_id;

    /*
     * Doublon SUCCESS.
     */

    if (
      transaction.status ===
        "successful" &&
      webhook.status ===
        "successful"
    ) {
      console.info(
        "[PAYMENT WEBHOOK] Duplicate successful webhook",
        {
          transactionId:
            transaction.id,

          merchantReference:
            transaction.merchant_reference,

          provider,
        },
      );

      return jsonSuccess(
        "Payment webhook already processed.",
        {
          processed: true,

          duplicate: true,

          status:
            "successful",

          transactionId:
            transaction.id,
        },
      );
    }

    /*
     * FAILED / CANCELLED / EXPIRED
     */

    if (
      webhook.status ===
        "failed" ||
      webhook.status ===
        "cancelled" ||
      webhook.status ===
        "expired"
    ) {
      await updateTransaction(
        supabase,
        transaction.id,
        {
          status:
            webhook.status,

          provider_transaction_id:
            providerTransactionId,

          failure_reason:
            webhook.failureReason ??
            webhook.message ??
            "Payment failed.",

          metadata:
            webhookMetadata,

          updated_at:
            new Date().toISOString(),
        },
      );

      return jsonSuccess(
        "Payment failure received.",
        {
          processed: true,

          status:
            webhook.status,

          transactionId:
            transaction.id,
        },
      );
    }

    /*
     * PENDING / CREATED
     */

    if (
      webhook.status !==
      "successful"
    ) {
      const pendingStatus =
        normalizePaymentStatus(
          webhook.status,
        );

      await updateTransaction(
        supabase,
        transaction.id,
        {
          status:
            pendingStatus,

          provider_transaction_id:
            providerTransactionId,

          metadata:
            webhookMetadata,

          updated_at:
            new Date().toISOString(),
        },
      );

      return jsonSuccess(
        "Payment status received.",
        {
          processed: true,

          status:
            pendingStatus,

          transactionId:
            transaction.id,
        },
      );
    }

    /*
     * SUCCESS
     *
     * Vérification serveur auprès du provider.
     */

    const verified =
      await verifyPayment(
        provider,
        {
          ...transaction,

          provider_transaction_id:
            providerTransactionId,

          metadata:
            webhookMetadata,
        },
      );

    /*
     * Le provider doit confirmer SUCCESS.
     */

    if (
      !verified.success ||
      verified.status !==
        "successful"
    ) {
      const verificationStatus =
        verified.status ===
        "pending"
          ? "pending"
          : "failed";

      await updateTransaction(
        supabase,
        transaction.id,
        {
          status:
            verificationStatus,

          provider_transaction_id:
            verified.providerTransactionId ??
            providerTransactionId,

          failure_reason:
            verified.failureReason ??
            verified.message ??
            "Provider verification did not confirm payment.",

          metadata: {
            ...webhookMetadata,

            verification_result:
              verified.metadata ??
              null,
          },

          updated_at:
            new Date().toISOString(),
        },
      );

      return jsonSuccess(
        "Webhook received but provider verification did not confirm payment.",
        {
          processed: true,

          status:
            verificationStatus,

          transactionId:
            transaction.id,
        },
      );
    }

    /*
     * VALIDATION MONTANT
     */

    if (
      verified.amount !==
        undefined &&
      verified.amount !==
        null &&
      Number(
        verified.amount,
      ) !==
        Number(
          transaction.amount,
        )
    ) {
      await updateTransaction(
        supabase,
        transaction.id,
        {
          status:
            "failed",

          failure_reason:
            "Payment amount mismatch.",

          metadata:
            webhookMetadata,

          updated_at:
            new Date().toISOString(),
        },
      );

      return jsonError(
        "Payment amount mismatch.",
        409,
      );
    }

    /*
     * VALIDATION DEVISE
     */

    if (
      verified.currency &&
      verified.currency.toUpperCase() !==
        transaction.currency.toUpperCase()
    ) {
      await updateTransaction(
        supabase,
        transaction.id,
        {
          status:
            "failed",

          failure_reason:
            "Payment currency mismatch.",

          metadata:
            webhookMetadata,

          updated_at:
            new Date().toISOString(),
        },
      );

      return jsonError(
        "Payment currency mismatch.",
        409,
      );
    }

    /*
     * SUCCESS FINAL
     */

    await updateTransaction(
      supabase,
      transaction.id,
      {
        status:
          "successful",

        provider_transaction_id:
          verified.providerTransactionId ??
          providerTransactionId,

        paid_at:
          transaction.paid_at ??
          new Date().toISOString(),

        failure_reason:
          null,

        metadata: {
          ...webhookMetadata,

          verification_result:
            verified.metadata ??
            null,
        },

        updated_at:
          new Date().toISOString(),
      },
    );

    /*
     * ACTIVATION ABONNEMENT
     */

    let activationResult:
      unknown = null;

    if (
      transaction.subscription_id
    ) {
      activationResult =
        await activateSubscription(
          supabase,
          transaction.id,
        );
    }

    /*
     * RÉPONSE
     */

    return jsonSuccess(
      "Payment successfully verified and processed.",
      {
        processed: true,

        status:
          "successful",

        provider,

        transactionId:
          transaction.id,

        subscriptionActivated:
          Boolean(
            transaction.subscription_id,
          ),

        activationResult,
      },
    );
  } catch (error) {
    console.error(
      "[PAYMENT WEBHOOK]",
      error,
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Internal payment webhook error.",
      500,
    );
  }
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET() {
  return NextResponse.json({
    success: true,

    service:
      "PharmaFlow Payment Webhook",

    status:
      "online",
  });
}