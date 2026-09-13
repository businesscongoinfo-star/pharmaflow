import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabase/admin";

import {
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
} from "../../../lib/payments/types";

import { mokoAfrikaAdapter } from "../../../lib/payments/moko-afrika";

export const runtime = "nodejs";

type PaymentTransactionRow = {
  id: string;
  pharmacy_id: string;
  subscription_id: string | null;
  merchant_reference: string | null;
  provider_transaction_id: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
};

function json(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, { status });
}

function getHeader(
  headers: Headers,
  name: string,
): string | null {
  const value = headers.get(name);
  return value?.trim() || null;
}

function isCardWebhook(headers: Headers, payload: unknown): boolean {
  const signature =
    getHeader(headers, "x-freshpay-signature") ||
    getHeader(headers, "X-FreshPay-Signature");

  if (signature) {
    return true;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "transaction_uuid" in payload
  ) {
    return true;
  }

  return false;
}

function getWebhookReference(payload: any): string | null {
  return (
    payload?.merchant_reference ??
    payload?.reference ??
    payload?.merchantReference ??
    payload?.order_reference ??
    null
  );
}

function getProviderTransactionId(payload: any): string | null {
  return (
    payload?.transaction_uuid ??
    payload?.transaction_id ??
    payload?.Transaction_id ??
    payload?.provider_transaction_id ??
    null
  );
}

function getWebhookAmount(payload: any): number | null {
  const raw =
    payload?.amount ??
    payload?.Amount ??
    payload?.data?.amount ??
    null;

  if (raw === null || raw === undefined) {
    return null;
  }

  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
}

function getWebhookCurrency(payload: any): string | null {
  const value =
    payload?.currency ??
    payload?.Currency ??
    payload?.data?.currency ??
    null;

  if (!value) {
    return null;
  }

  return String(value).trim().toUpperCase();
}

function getWebhookStatus(payload: any): string {
  return String(
    payload?.status ??
      payload?.Status ??
      payload?.transaction_status ??
      payload?.Trans_Status ??
      payload?.data?.transaction_status ??
      payload?.event_type ??
      "",
  )
    .trim()
    .toLowerCase();
}

async function findPaymentTransaction(
  merchantReference: string | null,
  providerTransactionId: string | null,
): Promise<PaymentTransactionRow | null> {
  if (
    !merchantReference &&
    !providerTransactionId
  ) {
    return null;
  }

  let query = supabaseAdmin
    .from("payment_transactions")
    .select(
      [
        "id",
        "pharmacy_id",
        "subscription_id",
        "merchant_reference",
        "provider_transaction_id",
        "amount",
        "currency",
        "status",
        "metadata",
      ].join(","),
    )
    .eq("provider", "moko_afrika")
    .limit(1);

  if (merchantReference) {
    query = query.eq(
      "merchant_reference",
      merchantReference,
    );
  } else if (providerTransactionId) {
    query = query.eq(
      "provider_transaction_id",
      providerTransactionId,
    );
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(
      "[Moko Webhook] Recherche transaction:",
      error,
    );

    return null;
  }

  return normalizePaymentTransaction(data);
}

async function findPaymentByProviderTransactionId(
  providerTransactionId: string,
): Promise<PaymentTransactionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("payment_transactions")
    .select(
      [
        "id",
        "pharmacy_id",
        "subscription_id",
        "merchant_reference",
        "provider_transaction_id",
        "amount",
        "currency",
        "status",
        "metadata",
      ].join(","),
    )
    .eq("provider", "moko_afrika")
    .eq(
      "provider_transaction_id",
      providerTransactionId,
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[Moko Webhook] Recherche transaction provider:",
      error,
    );

    return null;
  }

}

async function activateSubscription(
  paymentId: string,
) {
  const { data, error } = await supabaseAdmin.rpc(
    "pf_activate_subscription_from_payment",
    {
      p_payment_id: paymentId,
    },
  );

  if (error) {
    console.error(
      "[Moko Webhook] Activation abonnement:",
      error,
    );

    return {
      success: false,
      data: null,
      error,
    };
  }

  return {
    success: true,
    data,
    error: null,
  };
}

async function handleWebhook(
  request: NextRequest,
) {
  /*
   * IMPORTANT :
   * On lit d'abord le corps brut.
   * Ne pas utiliser request.json() avant la vérification
   * de signature du webhook carte.
   */
  const rawBody = await request.text();

  if (!rawBody) {
    return json(
      {
        success: false,
        message: "Empty webhook body",
      },
      400,
    );
  }

  let payload: any;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error(
      "[Moko Webhook] JSON invalide",
    );

    return json(
      {
        success: false,
        message: "Invalid JSON",
      },
      400,
    );
  }

  const headers = request.headers;

  /*
   * Carte Moko Checkout :
   * vérification obligatoire de X-FreshPay-Signature.
   *
   * On passe directement request.headers.
   * NE PAS transformer Headers en objet { ...headers }.
   */
  const cardWebhook = isCardWebhook(
    headers,
    payload,
  );

  if (cardWebhook) {
    const signaturePresent =
      !!getHeader(
        headers,
        "x-freshpay-signature",
      );

    if (!signaturePresent) {
      console.error(
        "[Moko Webhook] Signature carte absente",
      );

      return json(
        {
          success: false,
          message: "Missing webhook signature",
        },
        401,
      );
    }

    const signatureValid =
      mokoAfrikaAdapter.verifyWebhookSignature?.(
        rawBody,
        headers,
      ) ?? false;

    if (!signatureValid) {
      console.error(
        "[Moko Webhook] Signature carte invalide",
      );

      return json(
        {
          success: false,
          message: "Invalid webhook signature",
        },
        401,
      );
    }
  }

  /*
   * Normalisation du callback Moko.
   */
  const parsed =
    mokoAfrikaAdapter.parseWebhook?.(
      payload,
      headers,
    );

  if (!parsed) {
    return json(
      {
        success: false,
        message: "Unable to parse Moko webhook",
      },
      400,
    );
  }

  if (!parsed.success) {
    return json(
      {
        success: false,
        message:
          parsed.message ||
          "Webhook parsing failed",
      },
      400,
    );
  }

  const merchantReference =
    parsed.merchantReference ||
    getWebhookReference(payload);

  const providerTransactionId =
    parsed.providerTransactionId ||
    getProviderTransactionId(payload);

  const webhookAmount =
    parsed.amount ??
    getWebhookAmount(payload);

  const webhookCurrency =
    parsed.currency ||
    getWebhookCurrency(payload);

  const webhookStatus =
    parsed.status ||
    normalizePaymentStatus(
      getWebhookStatus(payload),
    );

  /*
   * Recherche de la transaction locale.
   */
  let transaction =
    await findPaymentTransaction(
      merchantReference,
      providerTransactionId,
    );

  /*
   * Fallback important :
   * certains callbacks ne renvoient pas exactement
   * le merchant_reference attendu.
   */
  if (
    !transaction &&
    providerTransactionId
  ) {
    transaction =
      await findPaymentByProviderTransactionId(
        providerTransactionId,
      );
  }

  if (!transaction) {
    console.error(
      "[Moko Webhook] Transaction inconnue:",
      {
        merchantReference,
        providerTransactionId,
      },
    );

    /*
     * On retourne 200 afin d'éviter des retries
     * interminables d'un webhook impossible à rattacher.
     *
     * La transaction n'est PAS activée.
     */
    return json({
      success: true,
      received: true,
      processed: false,
      message:
        "Webhook received but transaction not found",
    });
  }

  /*
   * Vérification montant/devise lorsque Moko
   * les fournit dans le callback.
   */
  if (
    webhookAmount !== null &&
    transaction.amount !== null
  ) {
    const expectedAmount =
      Number(transaction.amount);

    if (
      !Number.isFinite(expectedAmount) ||
      Math.abs(
        webhookAmount - expectedAmount,
      ) > 0.000001
    ) {
      console.error(
        "[Moko Webhook] Montant différent:",
        {
          paymentId: transaction.id,
          expectedAmount,
          webhookAmount,
        },
      );

      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "failed",
          failure_reason:
            "Webhook amount mismatch",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      return json(
        {
          success: false,
          message: "Amount mismatch",
        },
        400,
      );
    }
  }

  if (
    webhookCurrency &&
    transaction.currency &&
    webhookCurrency !==
      String(transaction.currency)
        .trim()
        .toUpperCase()
  ) {
    console.error(
      "[Moko Webhook] Devise différente:",
      {
        paymentId: transaction.id,
        expectedCurrency:
          transaction.currency,
        webhookCurrency,
      },
    );

    await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: "failed",
        failure_reason:
          "Webhook currency mismatch",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    return json(
      {
        success: false,
        message: "Currency mismatch",
      },
      400,
    );
  }

  /*
   * On effectue une vérification serveur-à-serveur
   * auprès de Moko avant toute activation.
   *
   * Le callback seul ne suffit donc pas.
   */
  let verifiedStatus =
    normalizePaymentStatus(
      webhookStatus,
    );

  let verification = null;

  if (
    providerTransactionId ||
    merchantReference
  ) {
    verification =
      await mokoAfrikaAdapter.verifyPayment({
        pharmacyId:
          transaction.pharmacy_id,
        merchantReference:
          transaction.merchant_reference ||
          merchantReference ||
          undefined,
        providerTransactionId:
          transaction.provider_transaction_id ||
          providerTransactionId ||
          undefined,
        expectedAmount:
          transaction.amount ??
          webhookAmount ??
          undefined,
        expectedCurrency:
          transaction.currency ||
          webhookCurrency ||
          undefined,
      });

    if (verification) {
      verifiedStatus =
        normalizePaymentStatus(
          verification.status,
        );
    }
  }

  /*
   * Si Moko confirme explicitement le paiement,
   * on considère la transaction comme successful.
   */
  const successful =
    isSuccessfulPaymentStatus(
      verifiedStatus,
    );

  /*
   * Statuts non définitifs :
   * on conserve pending/created.
   */
  if (!successful) {
    const normalizedStatus =
      normalizePaymentStatus(
        verifiedStatus,
      );

    const updateData: Record<
      string,
      unknown
    > = {
      status: normalizedStatus,
      updated_at:
        new Date().toISOString(),
    };

    if (
      normalizedStatus === "failed" ||
      normalizedStatus === "cancelled" ||
      normalizedStatus === "expired"
    ) {
      updateData.failure_reason =
        verification?.failureReason ||
        parsed.failureReason ||
        parsed.message ||
        "Payment not successful";
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("payment_transactions")
        .update(updateData)
        .eq("id", transaction.id);

    if (updateError) {
      console.error(
        "[Moko Webhook] Mise à jour transaction:",
        updateError,
      );

      return json(
        {
          success: false,
          message:
            "Unable to update transaction",
        },
        500,
      );
    }

    return json({
      success: true,
      received: true,
      processed: true,
      payment_id: transaction.id,
      status: normalizedStatus,
      activated: false,
    });
  }

  /*
   * À partir d'ici le paiement est confirmé.
   *
   * Protection contre une double activation.
   */
  const currentMetadata =
    transaction.metadata || {};

  const activationStatus =
    String(
      currentMetadata.activation_status ??
        "",
    );

  if (
    activationStatus === "activated"
  ) {
    return json({
      success: true,
      received: true,
      processed: true,
      payment_id: transaction.id,
      status: "successful",
      activated: true,
      already_processed: true,
    });
  }

  /*
   * Première étape : enregistrer le paiement
   * comme successful.
   */
  const successfulMetadata = {
    ...currentMetadata,
    activation_status:
      "processing",
    webhook_received_at:
      new Date().toISOString(),
  };

  const { error: paymentUpdateError } =
    await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: "successful",
        provider_transaction_id:
          transaction.provider_transaction_id ||
          providerTransactionId ||
          verification?.providerTransactionId ||
          null,
        merchant_reference:
          transaction.merchant_reference ||
          merchantReference ||
          verification?.merchantReference ||
          null,
        paid_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
        metadata:
          successfulMetadata,
      })
      .eq("id", transaction.id);

  if (paymentUpdateError) {
    console.error(
      "[Moko Webhook] Enregistrement paiement:",
      paymentUpdateError,
    );

    return json(
      {
        success: false,
        message:
          "Unable to save successful payment",
      },
      500,
    );
  }

  /*
   * Activation atomique côté serveur.
   *
   * Le RPC doit appliquer les règles d'abonnement :
   * - essai terminé / abonnement existant
   * - renouvellement anticipé
   * - bonus
   * - période mensuelle
   * - période annuelle
   */
  const activation =
    await activateSubscription(
      transaction.id,
    );

  if (!activation.success) {
    /*
     * Le paiement reste successful.
     * On ne le transforme surtout PAS en failed.
     *
     * Cela permet au Super Admin / système de
     * réconciliation de traiter les paiements encaissés
     * dont l'activation n'a pas encore été effectuée.
     */
    await supabaseAdmin
      .from("payment_transactions")
      .update({
        metadata: {
          ...successfulMetadata,
          activation_status:
            "activation_failed",
          activation_error:
            activation.error?.message ||
            "Subscription activation failed",
          activation_failed_at:
            new Date().toISOString(),
        },
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", transaction.id);

    return json(
      {
        success: true,
        received: true,
        processed: true,
        payment_id: transaction.id,
        status: "successful",
        activated: false,
        activation_pending: true,
      },
      200,
    );
  }

  /*
   * Activation terminée.
   */
  const finalMetadata = {
    ...successfulMetadata,
    activation_status:
      "activated",
    activated_at:
      new Date().toISOString(),
  };

  await supabaseAdmin
    .from("payment_transactions")
    .update({
      metadata: finalMetadata,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", transaction.id);

  return json({
    success: true,
    received: true,
    processed: true,
    payment_id: transaction.id,
    status: "successful",
    activated: true,
  });
}

export async function POST(
  request: NextRequest,
) {
  try {
    return await handleWebhook(request);
  } catch (error) {
    console.error(
      "[Moko Webhook] Unexpected error:",
      error,
    );

    /*
     * 500 uniquement en cas d'erreur serveur.
     * Moko pourra alors réessayer le webhook.
     */
    return json(
      {
        success: false,
        message:
          "Internal webhook error",
      },
      500,
    );
  }
}

export async function GET() {
  return json({
    success: true,
    service:
      "PharmaFlow Moko Afrika webhook",
    provider: "moko_afrika",
    status: "ready",
  });
}

function normalizePaymentTransaction(data: { error: true; } & "Received a generic string"): PaymentTransactionRow | PromiseLike<PaymentTransactionRow> {
  throw new Error("Function not implemented.");
}
