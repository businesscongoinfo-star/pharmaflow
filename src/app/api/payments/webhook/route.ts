import { NextRequest, NextResponse } from "next/server";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  mokoAfrikaAdapter,
} from "@/app/lib/payments/moko-afrika";

import {
  yabetooAdapter,
} from "@/app/lib/payments/yabetoo";

import type {
  PaymentProviderCode,
  PaymentTransactionStatus,
  PaymentWebhookResult,
  VerifyPaymentResult,
} from "@/app/lib/payments/types";

import {
  normalizePaymentStatus,
} from "@/app/lib/payments/types";

/*
|--------------------------------------------------------------------------
| SUPABASE ADMIN
|--------------------------------------------------------------------------
*/

function getSupabaseAdmin(): SupabaseClient {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing",
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
    | Record<
        string,
        unknown
      >
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
  data: Record<
    string,
    unknown
  > = {},
) {
  return NextResponse.json({
    success: true,
    message,
    ...data,
  });
}

function normalizeProvider(
  value: unknown,
): PaymentProviderCode | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const provider =
    value
      .trim()
      .toLowerCase();

  if (
    provider === "moko" ||
    provider === "moko-afrika" ||
    provider === "moko_afrika" ||
    provider === "gofreshpay"
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
| PROVIDER DETECTION
|--------------------------------------------------------------------------
*/

function detectProvider(
  payload: unknown,
  request: NextRequest,
): PaymentProviderCode {
  if (
    payload &&
    typeof payload ===
      "object" &&
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
     * Format FreshPay :
     *
     * {
     *   "data": "..."
     * }
     */

    if (
      typeof body.data ===
      "string"
    ) {
      return "moko_afrika";
    }

    /*
     * Format webhook Moko JSON.
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

  /*
   * Pour cette route unique, le callback
   * FreshPay/Moko est le fallback principal.
   */

  return "moko_afrika";
}

/*
|--------------------------------------------------------------------------
| PARSE PROVIDER WEBHOOK
|--------------------------------------------------------------------------
*/

function parseProviderWebhook(
  provider: PaymentProviderCode,
  payload: unknown,
  headers: Headers,
): PaymentWebhookResult {
  if (
    provider ===
    "moko_afrika"
  ) {
    if (
      !mokoAfrikaAdapter.parseWebhook
    ) {
      throw new Error(
        "Moko Afrika webhook parser is not configured.",
      );
    }

    return mokoAfrikaAdapter.parseWebhook(
      payload,
      headers,
    );
  }

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

    return yabetooAdapter.parseWebhook(
      payload,
      headers,
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
  values: Record<
    string,
    unknown
  >,
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
    status: "failed",
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
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * Le body doit être lu une seule fois.
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
     * Déterminer le provider.
     */

    const provider =
      detectProvider(
        payload,
        request,
      );

    /*
     * Parser et, pour Moko,
     * vérifier la signature + déchiffrer.
     */

    const webhook =
      parseProviderWebhook(
        provider,
        payload,
        request.headers,
      );

    /*
     * Une signature invalide est une erreur
     * de sécurité et ne doit jamais continuer.
     */

    if (
      webhook.failureReason ===
      "INVALID_SIGNATURE"
    ) {
      return jsonError(
        "Invalid webhook signature.",
        401,
      );
    }

    if (
      webhook.failureReason ===
      "INVALID_ENCRYPTION"
    ) {
      return jsonError(
        "Invalid webhook encryption.",
        400,
      );
    }

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
     * Rechercher la transaction créée
     * précédemment par PharmaFlow.
     */

    const transaction =
      await findTransaction(
        supabase,
        webhook,
      );

    /*
     * Un webhook inconnu ne doit jamais créer
     * automatiquement une nouvelle transaction.
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

      /*
       * 200 évite des retries infinis,
       * mais aucune activation n'est effectuée.
       */

      return jsonSuccess(
        "Webhook received but transaction was not found.",
        {
          processed: false,
        },
      );
    }

    /*
     * Vérification provider.
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
     * Fusion metadata.
     */

    const webhookMetadata = {
      ...(transaction.metadata ??
        {}),

      webhook_received:
        true,

      webhook_provider:
        provider,

      webhook_payload:
        payload,
    };

    /*
     * Sauvegarder l'ID provider reçu.
     */

    const providerTransactionId =
      webhook.providerTransactionId ??
      transaction.provider_transaction_id;

    /*
     * Échec / annulation / expiration.
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
     * Pour tout paiement qui n'est pas encore
     * définitivement successful, on conserve pending.
     */

    if (
      webhook.status !==
      "successful"
    ) {
      await updateTransaction(
        supabase,
        transaction.id,
        {
          status:
            normalizePaymentStatus(
              webhook.status,
            ),

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
            normalizePaymentStatus(
              webhook.status,
            ),
          transactionId:
            transaction.id,
        },
      );
    }

    /*
     * IMPORTANT :
     *
     * Même lorsque le callback indique Successful,
     * on vérifie encore la transaction directement
     * auprès du provider.
     */

    const verified =
      await verifyPayment(
        provider,
        {
          ...transaction,

          provider_transaction_id:
            providerTransactionId,
        },
      );

    /*
     * Le provider doit confirmer Successful.
     */

    if (
      !verified.success ||
      verified.status !==
        "successful"
    ) {
      await updateTransaction(
        supabase,
        transaction.id,
        {
          status:
            verified.status ===
            "pending"
              ? "pending"
              : "failed",

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
            verified.status ===
            "pending"
              ? "pending"
              : "failed",

          transactionId:
            transaction.id,
        },
      );
    }

    /*
     * Montant.
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
     * Devise.
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
     * SUCCESS FINAL.
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
     * Une transaction successful peut être reçue
     * plusieurs fois par le provider.
     *
     * Le RPC existant reste notre unique mécanisme
     * d'activation.
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
    status: "online",
  });
}