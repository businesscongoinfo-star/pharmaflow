import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { yabetooProvider } from "@/app/lib/payments/yabetoo";
import { isSuccessfulPaymentStatus } from "@/app/lib/payments/types";

export const runtime = "nodejs";

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, { status });
}

function timingSafeEqualHex(
  expectedHex: string,
  receivedHex: string,
) {
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const received = Buffer.from(receivedHex, "hex");

    if (expected.length !== received.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      expected,
      received,
    );
  } catch {
    return false;
  }
}

function verifyYabetooSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
) {
  const secret = process.env.YABETOO_SECRET_KEY;

  if (!secret) {
    console.error(
      "[Yabétoo webhook] YABETOO_SECRET_KEY est manquante.",
    );

    return false;
  }

  if (!signature || !timestamp) {
    return false;
  }

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    Math.abs(now - timestampNumber) >
    WEBHOOK_TOLERANCE_SECONDS
  ) {
    console.error(
      "[Yabétoo webhook] Timestamp du webhook expiré.",
    );

    return false;
  }

  const signedPayload =
    `${timestamp}.${rawBody}`;

  const expectedSignature = crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(
      signedPayload,
      "utf8",
    )
    .digest("hex");

  return timingSafeEqualHex(
    expectedSignature,
    signature,
  );
}

function normalizeAmount(
  value: unknown,
) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Number(
    amount.toFixed(2),
  );
}

function normalizeCurrency(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  return (
    value.trim().toUpperCase() ||
    null
  );
}

function getWebhookReference(
  payload: Record<string, any>,
) {
  return (
    payload.merchant_reference ??
    payload.merchantReference ??
    payload.metadata?.merchant_reference ??
    payload.metadata?.merchantReference ??
    payload.reference ??
    payload.metadata?.reference ??
    null
  );
}

function getProviderTransactionId(
  payload: Record<string, any>,
) {
  return (
    payload.provider_transaction_id ??
    payload.providerTransactionId ??
    payload.payment_intent_id ??
    payload.paymentIntentId ??
    payload.id ??
    null
  );
}

function getWebhookAmount(
  payload: Record<string, any>,
) {
  return normalizeAmount(
    payload.amount ??
      payload.payment_intent?.amount ??
      payload.data?.amount ??
      payload.data?.payment_intent?.amount,
  );
}

function getWebhookCurrency(
  payload: Record<string, any>,
) {
  return normalizeCurrency(
    payload.currency ??
      payload.payment_intent?.currency ??
      payload.data?.currency ??
      payload.data?.payment_intent?.currency,
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const rawBody =
      await request.text();

    if (!rawBody) {
      return jsonResponse(
        {
          success: false,
          error:
            "Corps du webhook vide.",
        },
        400,
      );
    }

    const signature =
      request.headers.get(
        "x-yabetoo-webhook-signature",
      );

    const timestamp =
      request.headers.get(
        "x-yabetoo-webhook-timestamp",
      );

    const eventType =
      request.headers.get(
        "x-yabetoo-webhook-event",
      );

    const webhookId =
      request.headers.get(
        "x-yabetoo-webhook-id",
      );

    /*
     * Vérification cryptographique.
     */
    const signatureValid =
      verifyYabetooSignature(
        rawBody,
        signature,
        timestamp,
      );

    if (!signatureValid) {
      console.error(
        "[Yabétoo webhook] Signature invalide.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Signature webhook invalide.",
        },
        401,
      );
    }

    let payload:
      Record<string, any>;

    try {
      payload =
        JSON.parse(rawBody);
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Payload JSON invalide.",
        },
        400,
      );
    }

    const webhookResult =
      yabetooProvider.parseWebhook(
        payload,
      );

    if (!webhookResult) {
      console.error(
        "[Yabétoo webhook] Impossible d'interpréter le webhook.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Webhook Yabétoo invalide.",
        },
        400,
      );
    }

    const merchantReference =
      webhookResult.merchantReference ??
      getWebhookReference(
        payload,
      );

    const providerTransactionId =
      webhookResult.providerTransactionId ??
      getProviderTransactionId(
        payload,
      );

    const status =
      webhookResult.status;

    const amount =
      normalizeAmount(
        webhookResult.amount,
      ) ??
      getWebhookAmount(
        payload,
      );

    const currency =
      normalizeCurrency(
        webhookResult.currency,
      ) ??
      getWebhookCurrency(
        payload,
      );

    if (
      !merchantReference &&
      !providerTransactionId
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Référence de transaction absente.",
        },
        400,
      );
    }

    /*
     * Recherche de la transaction PharmaFlow.
     */
    let transaction: any =
      null;

    if (merchantReference) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .select(
          `
            id,
            pharmacy_id,
            subscription_id,
            provider_id,
            provider,
            provider_transaction_id,
            merchant_reference,
            amount,
            currency,
            payment_method,
            status,
            metadata,
            paid_at
          `,
        )
        .eq(
          "merchant_reference",
          merchantReference,
        )
        .maybeSingle();

      if (error) {
        console.error(
          "[Yabétoo webhook] Erreur recherche référence:",
          error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Erreur interne.",
          },
          500,
        );
      }

      transaction = data;
    }

    if (
      !transaction &&
      providerTransactionId
    ) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .select(
          `
            id,
            pharmacy_id,
            subscription_id,
            provider_id,
            provider,
            provider_transaction_id,
            merchant_reference,
            amount,
            currency,
            payment_method,
            status,
            metadata,
            paid_at
          `,
        )
        .eq(
          "provider_transaction_id",
          providerTransactionId,
        )
        .maybeSingle();

      if (error) {
        console.error(
          "[Yabétoo webhook] Erreur recherche transaction:",
          error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Erreur interne.",
          },
          500,
        );
      }

      transaction = data;
    }

    if (!transaction) {
      console.warn(
        "[Yabétoo webhook] Transaction inconnue:",
        merchantReference ??
          providerTransactionId,
      );

      return jsonResponse({
        success: true,
        ignored: true,
        reason:
          "transaction_not_found",
      });
    }

    /*
     * Vérification du fournisseur.
     */
    if (
      transaction.provider !==
      "yabetoo"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Provider incorrect.",
        },
        409,
      );
    }

    /*
     * Si le paiement est déjà successful,
     * on demande quand même à la fonction SQL de
     * vérifier l'état d'activation.
     */
    if (
      isSuccessfulPaymentStatus(
        transaction.status,
      )
    ) {
      const {
        data:
          activationResult,
        error:
          activationError,
      } =
        await supabaseAdmin.rpc(
          "pf_activate_subscription_from_payment",
          {
            p_payment_transaction_id:
              transaction.id,
          },
        );

      if (
        activationError
      ) {
        console.error(
          "[Yabétoo webhook] Activation déjà successful mais erreur:",
          activationError,
        );
      }

      return jsonResponse({
        success: true,
        alreadyProcessed: true,
        transactionId:
          transaction.id,
        status:
          transaction.status,
        activation:
          activationResult ??
          null,
      });
    }
    /*
     * Vérification du montant.
     */
    if (
      amount !== null &&
      Number(
        transaction.amount,
      ) !== amount
    ) {
      console.error(
        "[Yabétoo webhook] Montant différent.",
        {
          transactionAmount:
            transaction.amount,
          webhookAmount:
            amount,
          transactionId:
            transaction.id,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Montant du paiement différent.",
        },
        409,
      );
    }

    /*
     * Vérification de la devise.
     */
    if (
      currency !== null &&
      normalizeCurrency(
        transaction.currency,
      ) !== currency
    ) {
      console.error(
        "[Yabétoo webhook] Devise différente.",
        {
          transactionCurrency:
            transaction.currency,
          webhookCurrency:
            currency,
          transactionId:
            transaction.id,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Devise du paiement différente.",
        },
        409,
      );
    }

    /*
     * Conservation du webhook complet
     * pour audit.
     */
    const existingMetadata =
      transaction.metadata &&
      typeof transaction.metadata ===
        "object"
        ? transaction.metadata
        : {};

    const metadata = {
      ...existingMetadata,
      webhook: payload,
      webhook_event:
        eventType ?? null,
      webhook_id:
        webhookId ?? null,
      webhook_received_at:
        new Date().toISOString(),
    };

    const updateData: Record<
      string,
      any
    > = {
      status,
      metadata,
      updated_at:
        new Date().toISOString(),
    };

    if (
      providerTransactionId
    ) {
      updateData.provider_transaction_id =
        providerTransactionId;
    }

    if (
      isSuccessfulPaymentStatus(
        status,
      )
    ) {
      updateData.paid_at =
        transaction.paid_at ??
        new Date().toISOString();
    }

    /*
     * Mise à jour de la transaction.
     */
    const {
      data:
        updatedTransaction,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .update(
          updateData,
        )
        .eq(
          "id",
          transaction.id,
        )
        .select(
          `
            id,
            pharmacy_id,
            subscription_id,
            provider,
            provider_transaction_id,
            merchant_reference,
            amount,
            currency,
            payment_method,
            status,
            checkout_url,
            metadata,
            failure_reason,
            paid_at
          `,
        )
        .single();

    if (updateError) {
      console.error(
        "[Yabétoo webhook] Erreur mise à jour:",
        updateError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible de mettre à jour la transaction.",
        },
        500,
      );
    }

    /*
     * Activation uniquement après confirmation
     * réelle du paiement.
     */
    let activation:
      | Record<
          string,
          unknown
        >
      | null = null;

    if (
      isSuccessfulPaymentStatus(
        updatedTransaction.status,
      )
    ) {
      const {
        data:
          activationResult,
        error:
          activationError,
      } =
        await supabaseAdmin.rpc(
          "pf_activate_subscription_from_payment",
          {
            p_payment_transaction_id:
              updatedTransaction.id,
          },
        );

      if (
        activationError
      ) {
        console.error(
          "[Yabétoo webhook] Erreur activation abonnement:",
          activationError,
        );

        activation = {
          success:
            false,
          activated:
            false,
          error:
            "Paiement confirmé, mais l'activation de l'abonnement doit être finalisée.",
        };
      } else {
        activation =
          activationResult;
      }
    }

    return jsonResponse({
      success: true,
      processed: true,
      transaction:
        updatedTransaction,
      activation,
      subscriptionActivationRequired:
        isSuccessfulPaymentStatus(
          updatedTransaction.status,
        ),
    });
  } catch (error) {
    console.error(
      "[Yabétoo webhook] Erreur inattendue:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Erreur interne du serveur.",
      },
      500,
    );
  }
}