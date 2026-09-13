import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";
import {
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
} from "@/app/lib/payments/types";
import { mokoAfrikaAdapter } from "@/app/lib/payments/moko-afrika";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function jsonResponse(
  data: JsonObject,
  status = 200,
) {
  return NextResponse.json(data, { status });
}

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getValue(
  object: JsonObject,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      return object[key];
    }
  }

  return undefined;
}

function normalizeString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.trim();

  return result.length > 0 ? result : null;
}

function normalizeAmount(
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
    value.trim() !== ""
  ) {
    const normalized = value
      .trim()
      .replace(",", ".");

    const amount = Number(normalized);

    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  return null;
}

function normalizeCurrency(
  value: unknown,
): string | null {
  const currency = normalizeString(value);

  if (!currency) {
    return null;
  }

  return currency.toUpperCase();
}

function extractPayload(
  body: unknown,
): JsonObject {
  if (!isObject(body)) {
    return {};
  }

  const nestedCandidates = [
    body.data,
    body.payload,
    body.transaction,
    body.payment,
    body.result,
  ];

  for (const candidate of nestedCandidates) {
    if (isObject(candidate)) {
      return candidate;
    }
  }

  return body;
}

function getMerchantReference(
  body: JsonObject,
  payload: JsonObject,
): string | null {
  const value =
    getValue(payload, [
      "reference",
      "merchant_reference",
      "merchantReference",
      "merchant_ref",
      "merchantReferenceId",
      "order_reference",
      "orderReference",
    ]) ??
    getValue(body, [
      "reference",
      "merchant_reference",
      "merchantReference",
      "merchant_ref",
      "merchantReferenceId",
      "order_reference",
      "orderReference",
    ]);

  return normalizeString(value);
}

function getProviderTransactionId(
  body: JsonObject,
  payload: JsonObject,
): string | null {
  const value =
    getValue(payload, [
      "transaction_id",
      "transactionId",
      "provider_transaction_id",
      "providerTransactionId",
      "trans_id",
      "Trans_ID",
      "id",
    ]) ??
    getValue(body, [
      "transaction_id",
      "transactionId",
      "provider_transaction_id",
      "providerTransactionId",
      "trans_id",
      "Trans_ID",
      "id",
    ]);

  return normalizeString(value);
}

function getAmount(
  body: JsonObject,
  payload: JsonObject,
): number | null {
  const value =
    getValue(payload, [
      "amount",
      "Amount",
      "trans_amount",
      "Trans_Amount",
      "transaction_amount",
    ]) ??
    getValue(body, [
      "amount",
      "Amount",
      "trans_amount",
      "Trans_Amount",
      "transaction_amount",
    ]);

  return normalizeAmount(value);
}

function getCurrency(
  body: JsonObject,
  payload: JsonObject,
): string | null {
  const value =
    getValue(payload, [
      "currency",
      "Currency",
      "currency_code",
      "currencyCode",
    ]) ??
    getValue(body, [
      "currency",
      "Currency",
      "currency_code",
      "currencyCode",
    ]);

  return normalizeCurrency(value);
}

function getProviderStatus(
  body: JsonObject,
  payload: JsonObject,
): string | null {
  const value =
    getValue(payload, [
      "status",
      "Status",
      "trans_status",
      "Trans_Status",
      "transaction_status",
      "payment_status",
      "paymentStatus",
    ]) ??
    getValue(body, [
      "status",
      "Status",
      "trans_status",
      "Trans_Status",
      "transaction_status",
      "payment_status",
      "paymentStatus",
    ]);

  return normalizeString(value);
}

function getPaymentMethod(
  body: JsonObject,
  payload: JsonObject,
): string | null {
  const value =
    getValue(payload, [
      "method",
      "payment_method",
      "paymentMethod",
      "channel",
      "operator",
    ]) ??
    getValue(body, [
      "method",
      "payment_method",
      "paymentMethod",
      "channel",
      "operator",
    ]);

  return normalizeString(value);
}

function getFailureReason(
  body: JsonObject,
  payload: JsonObject,
): string | null {
  const value =
    getValue(payload, [
      "failure_reason",
      "failureReason",
      "error",
      "error_message",
      "errorMessage",
      "message",
      "Message",
    ]) ??
    getValue(body, [
      "failure_reason",
      "failureReason",
      "error",
      "error_message",
      "errorMessage",
      "message",
      "Message",
    ]);

  return normalizeString(value);
}

function providerStatusToPaymentStatus(
  value: string | null,
) {
  if (!value) {
    return "pending";
  }

  const normalized = value
    .trim()
    .toLowerCase();

  if (
    normalized === "successful" ||
    normalized === "success" ||
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "paid" ||
    normalized === "approved" ||
    normalized === "succeeded"
  ) {
    return "successful";
  }

  if (
    normalized === "failed" ||
    normalized === "failure" ||
    normalized === "declined" ||
    normalized === "rejected" ||
    normalized === "error"
  ) {
    return "failed";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled"
  ) {
    return "cancelled";
  }

  if (
    normalized === "expired" ||
    normalized === "timeout" ||
    normalized === "timed_out"
  ) {
    return "expired";
  }

  return "pending";
}
export async function POST(
  request: NextRequest,
) {
  try {
    const rawBody = await request.text();

    if (!rawBody.trim()) {
      return jsonResponse(
        {
          success: false,
          error: "Webhook vide.",
        },
        400,
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Webhook JSON invalide.",
        },
        400,
      );
    }

    if (!isObject(body)) {
      return jsonResponse(
        {
          success: false,
          error: "Format webhook invalide.",
        },
        400,
      );
    }

    const payload = extractPayload(body);

    const merchantReference =
      getMerchantReference(
        body,
        payload,
      );

    const providerTransactionId =
      getProviderTransactionId(
        body,
        payload,
      );

    const amount =
      getAmount(
        body,
        payload,
      );

    const currency =
      getCurrency(
        body,
        payload,
      );

    const providerStatus =
      getProviderStatus(
        body,
        payload,
      );

    const paymentMethod =
      getPaymentMethod(
        body,
        payload,
      );

    const failureReason =
      getFailureReason(
        body,
        payload,
      );

    /*
     * Si l'adaptateur Moko Afrika sait interpréter
     * directement le webhook, on lui laisse la priorité.
     */
    let parsedStatus:
      | ReturnType<typeof normalizePaymentStatus>
      | null = null;

    let parsedMerchantReference:
      | string
      | null = null;

    let parsedProviderTransactionId:
      | string
      | null = null;

    let parsedAmount:
      | number
      | null = null;

    let parsedCurrency:
      | string
      | null = null;
let parsedPaymentMethod:
  | string
  | null = null;

let parsedFailureReason:
  | string
  | null = null;

try {
  if (
    typeof mokoAfrikaAdapter.parseWebhook ===
    "function"
  ) {
    const parsed =
      mokoAfrikaAdapter.parseWebhook(
        body,
        request.headers,
      );

    if (parsed) {
      parsedStatus =
        normalizePaymentStatus(
          parsed.status,
        );

      parsedMerchantReference =
        normalizeString(
          parsed.merchantReference,
        );

      parsedProviderTransactionId =
        normalizeString(
          parsed.providerTransactionId,
        );

      parsedAmount =
        normalizeAmount(
          parsed.amount,
        );

      parsedCurrency =
        normalizeCurrency(
          parsed.currency,
        );

      parsedPaymentMethod =
        normalizeString(
          parsed.paymentMethod,
        );

      parsedFailureReason =
        normalizeString(
          parsed.failureReason,
        );
    }
  }
} catch {
  /*
   * Le format du webhook peut varier selon
   * la version du compte fournisseur.
   *
   * Nous continuons avec l'extraction générique
   * ci-dessus.
   */
}

    const finalMerchantReference =
      parsedMerchantReference ??
      merchantReference;

    const finalProviderTransactionId =
      parsedProviderTransactionId ??
      providerTransactionId;

    const finalAmount =
      parsedAmount ??
      amount;

    const finalCurrency =
      parsedCurrency ??
      currency;

    const finalPaymentMethod =
      parsedPaymentMethod ??
      paymentMethod;

    const finalFailureReason =
      parsedFailureReason ??
      failureReason;

    const finalStatus =
      parsedStatus ??
      providerStatusToPaymentStatus(
        providerStatus,
      );

    if (
      !finalMerchantReference &&
      !finalProviderTransactionId
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Référence de paiement introuvable.",
        },
        400,
      );
    }

    /*
     * Recherche de la transaction PharmaFlow.
     *
     * On essaie d'abord la référence marchande,
     * puis l'identifiant fournisseur.
     */
    let transaction: any = null;

    if (finalMerchantReference) {
      const result =
        await supabaseAdmin
          .from("payment_transactions")
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
              created_at,
              updated_at,
              paid_at
            `,
          )
          .eq(
            "merchant_reference",
            finalMerchantReference,
          )
          .maybeSingle();

      if (result.error) {
        console.error(
          "MOKO AFRIKA WEBHOOK DATABASE ERROR:",
          result.error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Erreur lors de la recherche de la transaction.",
          },
          500,
        );
      }

      transaction = result.data;
    }

    if (
      !transaction &&
      finalProviderTransactionId
    ) {
      const result =
        await supabaseAdmin
          .from("payment_transactions")
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
              created_at,
              updated_at,
              paid_at
            `,
          )
          .eq(
            "provider_transaction_id",
            finalProviderTransactionId,
          )
          .eq(
            "provider",
            "moko_afrika",
          )
          .maybeSingle();

      if (result.error) {
        console.error(
          "MOKO AFRIKA WEBHOOK DATABASE ERROR:",
          result.error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Erreur lors de la recherche de la transaction.",
          },
          500,
        );
      }

      transaction = result.data;
    }

    if (!transaction) {
      console.warn(
        "MOKO AFRIKA WEBHOOK UNKNOWN TRANSACTION:",
        {
          merchantReference:
            finalMerchantReference,
          providerTransactionId:
            finalProviderTransactionId,
        },
      );

      /*
       * Nous retournons 200 pour éviter qu'un fournisseur
       * renvoie indéfiniment le même webhook.
       */
      return jsonResponse(
        {
          success: true,
          received: true,
          processed: false,
          message:
            "Webhook reçu mais transaction PharmaFlow introuvable.",
        },
        200,
      );
    }

    /*
     * Sécurité : la transaction doit appartenir
     * au fournisseur Moko Afrika.
     */
    if (
      transaction.provider !==
      "moko_afrika"
    ) {
      console.error(
        "MOKO AFRIKA WEBHOOK PROVIDER MISMATCH:",
        transaction.provider,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Le fournisseur de la transaction ne correspond pas.",
        },
        409,
      );
    }

    /*
     * Protection contre une activation déjà effectuée.
     */
    const existingMetadata =
      isObject(transaction.metadata)
        ? transaction.metadata
        : {};

    const activationStatus =
      normalizeString(
        existingMetadata.activation_status,
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
          alreadyProcessed: true,
          transactionId:
            transaction.id,
          merchantReference:
            transaction.merchant_reference,
        },
        200,
      );
    }

    /*
     * Vérification du montant.
     *
     * Si le fournisseur renvoie un montant,
     * il doit correspondre au montant attendu.
     */
    if (
      finalAmount !== null &&
      Number(transaction.amount) !==
        Number(finalAmount)
    ) {
      console.error(
        "MOKO AFRIKA WEBHOOK AMOUNT MISMATCH:",
        {
          expected:
            transaction.amount,
          received:
            finalAmount,
          transactionId:
            transaction.id,
        },
      );

      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "failed",
          failure_reason:
            "Montant du webhook différent du montant attendu.",
          metadata: {
            ...existingMetadata,
            webhook_amount:
              finalAmount,
            webhook_currency:
              finalCurrency,
            webhook_received_at:
              new Date().toISOString(),
          },
        })
        .eq(
          "id",
          transaction.id,
        );

      return jsonResponse(
        {
          success: false,
          error:
            "Le montant du paiement ne correspond pas.",
        },
        409,
      );
    }

    /*
     * Vérification de la devise.
     */
    if (
      finalCurrency &&
      String(transaction.currency)
        .toUpperCase() !==
        finalCurrency
    ) {
      console.error(
        "MOKO AFRIKA WEBHOOK CURRENCY MISMATCH:",
        {
          expected:
            transaction.currency,
          received:
            finalCurrency,
          transactionId:
            transaction.id,
        },
      );

      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "failed",
          failure_reason:
            "Devise du webhook différente de la devise attendue.",
          metadata: {
            ...existingMetadata,
            webhook_amount:
              finalAmount,
            webhook_currency:
              finalCurrency,
            webhook_received_at:
              new Date().toISOString(),
          },
        })
        .eq(
          "id",
          transaction.id,
        );

      return jsonResponse(
        {
          success: false,
          error:
            "La devise du paiement ne correspond pas.",
        },
        409,
      );
    }

    const normalizedStatus =
      normalizePaymentStatus(
        finalStatus,
      );

    const newMetadata: JsonObject = {
      ...existingMetadata,
      webhook_provider:
        "moko_afrika",
      webhook_received_at:
        new Date().toISOString(),
      webhook_status:
        normalizedStatus,
      webhook_amount:
        finalAmount,
      webhook_currency:
        finalCurrency,
      webhook_payment_method:
        finalPaymentMethod,
    };

    if (finalFailureReason) {
      newMetadata.webhook_failure_reason =
        finalFailureReason;
    }

    /*
     * CAS 1 : paiement réussi.
     */
    if (
      isSuccessfulPaymentStatus(
        normalizedStatus,
      )
    ) {
      const updateResult =
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            status: "successful",
            provider_transaction_id:
              finalProviderTransactionId ??
              transaction.provider_transaction_id,
            paid_at:
              transaction.paid_at ??
              new Date().toISOString(),
            failure_reason: null,
            metadata: {
              ...newMetadata,
              activation_status:
                "pending",
            },
          })
          .eq(
            "id",
            transaction.id,
          );

      if (updateResult.error) {
        console.error(
          "MOKO AFRIKA PAYMENT UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer le paiement.",
          },
          500,
        );
      }

      /*
       * Activation du forfait après paiement confirmé.
       *
       * La fonction SQL est idempotente :
       * un même paiement ne doit pas prolonger
       * plusieurs fois l'abonnement.
       */
      const activation =
        await supabaseAdmin.rpc(
          "pf_activate_subscription_from_payment",
          {
            p_payment_id:
              transaction.id,
          },
        );

      if (activation.error) {
        console.error(
          "MOKO AFRIKA SUBSCRIPTION ACTIVATION ERROR:",
          activation.error,
        );

        await supabaseAdmin
          .from("payment_transactions")
          .update({
            metadata: {
              ...newMetadata,
              activation_status:
                "pending",
              activation_error:
                activation.error.message,
            },
          })
          .eq(
            "id",
            transaction.id,
          );

        /*
         * Le paiement reste successful.
         * L'activation peut être retentée sans
         * demander au client de payer une deuxième fois.
         */
        return jsonResponse(
          {
            success: true,
            received: true,
            processed: true,
            paymentStatus:
              "successful",
            activationStatus:
              "pending",
            message:
              "Paiement confirmé. Activation de l'abonnement en attente.",
          },
          200,
        );
      }

      await supabaseAdmin
        .from("payment_transactions")
        .update({
          metadata: {
            ...newMetadata,
            activation_status:
              "activated",
            activation_result:
              activation.data ?? null,
            activated_at:
              new Date().toISOString(),
          },
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
          paymentStatus:
            "successful",
          activationStatus:
            "activated",
          transactionId:
            transaction.id,
          merchantReference:
            transaction.merchant_reference,
        },
        200,
      );
    }

    /*
     * CAS 2 : paiement en attente.
     */
    if (
      normalizedStatus ===
      "pending"
    ) {
      const updateResult =
        await supabaseAdmin
          .from("payment_transactions")
          .update({
            status: "pending",
            provider_transaction_id:
              finalProviderTransactionId ??
              transaction.provider_transaction_id,
            metadata: newMetadata,
          })
          .eq(
            "id",
            transaction.id,
          );

      if (updateResult.error) {
        console.error(
          "MOKO AFRIKA PENDING UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer le statut pending.",
          },
          500,
        );
      }

      return jsonResponse(
        {
          success: true,
          received: true,
          processed: true,
          paymentStatus:
            "pending",
          transactionId:
            transaction.id,
        },
        200,
      );
    }

    /*
     * CAS 3 : paiement échoué, annulé ou expiré.
     */
    const finalFailureStatus =
      normalizedStatus ===
      "cancelled"
        ? "cancelled"
        : normalizedStatus ===
            "expired"
          ? "expired"
          : "failed";

    const updateResult =
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status:
            finalFailureStatus,
          provider_transaction_id:
            finalProviderTransactionId ??
            transaction.provider_transaction_id,
          failure_reason:
            finalFailureReason ??
            `Paiement ${finalFailureStatus}.`,
          metadata: newMetadata,
        })
        .eq(
          "id",
          transaction.id,
        );

    if (updateResult.error) {
      console.error(
        "MOKO AFRIKA FAILED UPDATE ERROR:",
        updateResult.error,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible d'enregistrer l'échec du paiement.",
        },
        500,
      );
    }

    return jsonResponse(
      {
        success: true,
        received: true,
        processed: true,
        paymentStatus:
          finalFailureStatus,
        transactionId:
          transaction.id,
      },
      200,
    );
  } catch (error) {
    console.error(
      "MOKO AFRIKA WEBHOOK UNEXPECTED ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Erreur interne lors du traitement du webhook.",
      },
      500,
    );
  }
}

export async function GET() {
  return jsonResponse(
    {
      success: true,
      provider: "moko_afrika",
      webhook: true,
      message:
        "Webhook Moko Afrika PharmaFlow opérationnel.",
    },
    200,
  );
}
