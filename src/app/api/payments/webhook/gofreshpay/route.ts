import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { isSuccessfulPaymentStatus } from "@/app/lib/payments/types";

export const runtime = "nodejs";

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, { status });
}

function normalizeAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Number(amount.toFixed(2));
}

function normalizeCurrency(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim().toUpperCase() || null;
}

function getValue(
  payload: Record<string, any>,
  keys: string[],
) {
  for (const key of keys) {
    const value = payload[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function getMerchantReference(
  payload: Record<string, any>,
) {
  return getValue(payload, [
    "Reference",
    "reference",
    "merchant_reference",
    "merchantReference",
    "Merchant_Reference",
  ]);
}

function getProviderTransactionId(
  payload: Record<string, any>,
) {
  return getValue(payload, [
    "Transaction_id",
    "transaction_id",
    "transactionId",
    "PayDRC_Reference",
    "paydrc_reference",
    "provider_transaction_id",
  ]);
}

function getAmount(
  payload: Record<string, any>,
) {
  return normalizeAmount(
    getValue(payload, [
      "Amount",
      "amount",
      "transaction_amount",
    ]),
  );
}

function getCurrency(
  payload: Record<string, any>,
) {
  return normalizeCurrency(
    getValue(payload, [
      "Currency",
      "currency",
      "transaction_currency",
    ]),
  );
}

function timingSafeEqualHex(
  expectedHex: string,
  receivedHex: string,
) {
  try {
    const expected = Buffer.from(
      expectedHex,
      "hex",
    );

    const received = Buffer.from(
      receivedHex,
      "hex",
    );

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

function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
) {
  const secret =
    process.env.GOFRESHPAY_WEBHOOK_SECRET;

  /*
   * Le mécanisme exact de signature dépend
   * de la configuration du compte GoFreshPay.
   *
   * Si aucun secret n'est configuré, on ne prétend
   * pas effectuer une vérification cryptographique.
   */
  if (!secret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(
      rawBody,
      "utf8",
    )
    .digest("hex");

  const normalizedSignature =
    signature.replace(
      /^sha256=/i,
      "",
    );

  return (
    timingSafeEqualHex(
      expectedSignature,
      normalizedSignature,
    )
  );
}

function getSignature(
  request: NextRequest,
) {
  return (
    request.headers.get(
      "x-gofreshpay-signature",
    ) ??
    request.headers.get(
      "x-webhook-signature",
    ) ??
    request.headers.get(
      "x-signature",
    )
  );
}

function normalizeProviderStatus(
  payload: Record<string, any>,
) {
  const status = String(
    getValue(payload, [
      "Trans_Status",
      "trans_status",
      "Status",
      "status",
      "transaction_status",
    ]) ?? "",
  )
    .trim()
    .toLowerCase();

  if (
    [
      "successful",
      "success",
      "succeeded",
      "completed",
      "complete",
      "paid",
    ].includes(status)
  ) {
    return "successful" as const;
  }

  if (
    [
      "failed",
      "failure",
      "declined",
      "rejected",
      "error",
    ].includes(status)
  ) {
    return "failed" as const;
  }

  if (
    [
      "cancelled",
      "canceled",
    ].includes(status)
  ) {
    return "cancelled" as const;
  }

  if (
    [
      "expired",
      "timeout",
    ].includes(status)
  ) {
    return "expired" as const;
  }

  return "pending" as const;
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
      getSignature(request);

    if (
      !verifyWebhookSignature(
        rawBody,
        signature,
      )
    ) {
      console.error(
        "[GoFreshPay webhook] Signature invalide.",
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

    const merchantReference =
      getMerchantReference(
        payload,
      );

    const providerTransactionId =
      getProviderTransactionId(
        payload,
      );

    const amount =
      getAmount(payload);

    const currency =
      getCurrency(payload);

    const status =
      normalizeProviderStatus(
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

    let transaction:
      any = null;

    /*
     * Recherche par référence PharmaFlow.
     */
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
          String(
            merchantReference,
          ),
        )
        .maybeSingle();

      if (error) {
        console.error(
          "[GoFreshPay webhook] Erreur recherche référence:",
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

    /*
     * Recherche de secours par identifiant
     * de transaction fournisseur.
     */
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
          String(
            providerTransactionId,
          ),
        )
        .maybeSingle();

      if (error) {
        console.error(
          "[GoFreshPay webhook] Erreur recherche transaction:",
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
    /*
     * Transaction inconnue.
     */
    if (!transaction) {
      console.warn(
        "[GoFreshPay webhook] Transaction inconnue:",
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
     * Sécurité :
     * cette transaction doit avoir été créée
     * pour GoFreshPay.
     */
    if (
      transaction.provider !==
      "gofreshpay"
    ) {
      console.error(
        "[GoFreshPay webhook] Provider incorrect:",
        transaction.provider,
      );

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
     * Si déjà successful, on appelle quand même
     * la fonction d'activation.
     *
     * La fonction SQL empêchera une double activation.
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

      if (activationError) {
        console.error(
          "[GoFreshPay webhook] Erreur activation:",
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
        "[GoFreshPay webhook] Montant différent.",
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
        "[GoFreshPay webhook] Devise différente.",
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
     * Conservation du webhook pour audit.
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
        String(
          providerTransactionId,
        );
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

    if (
      status === "failed"
    ) {
      updateData.failure_reason =
        "Le fournisseur a refusé le paiement.";
    }

    /*
     * Mise à jour de payment_transactions.
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
        "[GoFreshPay webhook] Erreur mise à jour:",
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
     * Activation uniquement lorsque le paiement
     * est réellement successful.
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

      if (activationError) {
        console.error(
          "[GoFreshPay webhook] Erreur activation abonnement:",
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
      "[GoFreshPay webhook] Erreur inattendue:",
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