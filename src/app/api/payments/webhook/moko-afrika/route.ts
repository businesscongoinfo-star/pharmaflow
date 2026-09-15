import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";

import {
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
} from "@/app/lib/payments/types";

import { mokoAfrikaAdapter } from "@/app/lib/payments/moko-afrika";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

type PaymentTransaction = {
  id: string;
  pharmacy_id: string;
  subscription_id: string | null;
  provider_id: string | null;
  provider: string;
  provider_transaction_id: string | null;
  merchant_reference: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  status: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

function jsonResponse(
  data: JsonObject,
  status = 200,
) {
  return NextResponse.json(data, { status });
}

function isObject(
  value: unknown,
): value is JsonObject {
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
    if (
      Object.prototype.hasOwnProperty.call(
        object,
        key,
      )
    ) {
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
    const amount = Number(
      value.trim().replace(",", "."),
    );

    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  return null;
}

function normalizeCurrency(
  value: unknown,
): string | null {
  const currency =
    normalizeString(value);

  if (!currency) {
    return null;
  }

  return currency.toUpperCase();
}

/**
 * Moko/FreshPay callback:
 *
 * {
 *   "data": "<BASE64_ENCRYPTED_DATA>"
 * }
 *
 * Le contenu de data doit être vérifié par HMAC
 * avant d'être déchiffré.
 */
function getEncryptedCallbackData(
  body: JsonObject,
): string | null {
  return normalizeString(
    body.data,
  );
}

/**
 * Extraction générique utilisée uniquement
 * comme secours lorsque l'adaptateur n'a pas
 * pu extraire certaines informations.
 */
function extractPayload(
  body: unknown,
): JsonObject {
  if (!isObject(body)) {
    return {};
  }

  const candidates = [
    body.payload,
    body.transaction,
    body.payment,
    body.result,
  ];

  for (const candidate of candidates) {
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
      "Reference",
      "reference",
      "merchant_reference",
      "merchantReference",
      "merchant_ref",
      "merchantReferenceId",
      "order_reference",
      "orderReference",
    ]) ??
    getValue(body, [
      "Reference",
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
      "Transaction_id",
      "transaction_id",
      "transactionId",
      "provider_transaction_id",
      "providerTransactionId",
      "trans_id",
      "Trans_ID",
      "id",
    ]) ??
    getValue(body, [
      "Transaction_id",
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
      "Amount",
      "amount",
      "trans_amount",
      "Trans_Amount",
      "transaction_amount",
    ]) ??
    getValue(body, [
      "Amount",
      "amount",
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
      "Currency",
      "currency",
      "currency_code",
      "currencyCode",
    ]) ??
    getValue(body, [
      "Currency",
      "currency",
      "currency_code",
      "currencyCode",
    ]);

  return normalizeCurrency(value);
}

/**
 * IMPORTANT :
 *
 * Moko distingue notamment :
 *
 * Status
 * Trans_Status
 *
 * La documentation indique que Status peut confirmer
 * la réception alors que Trans_Status représente
 * le statut transactionnel à suivre.
 *
 * Nous privilégions donc TOUJOURS Trans_Status.
 */
function getProviderStatus(
  body: JsonObject,
  payload: JsonObject,
): string | null {
  const transactionStatus =
    getValue(payload, [
      "Trans_Status",
      "trans_status",
      "transaction_status",
      "payment_status",
      "paymentStatus",
    ]) ??
    getValue(body, [
      "Trans_Status",
      "trans_status",
      "transaction_status",
      "payment_status",
      "paymentStatus",
    ]);

  const normalizedTransactionStatus =
    normalizeString(
      transactionStatus,
    );

  if (normalizedTransactionStatus) {
    return normalizedTransactionStatus;
  }

  const genericStatus =
    getValue(payload, [
      "Status",
      "status",
    ]) ??
    getValue(body, [
      "Status",
      "status",
    ]);

  return normalizeString(
    genericStatus,
  );
}

function getPaymentMethod(
  body: JsonObject,
  payload: JsonObject,
): string | null {
  const value =
    getValue(payload, [
      "Method",
      "method",
      "payment_method",
      "paymentMethod",
      "channel",
      "operator",
    ]) ??
    getValue(body, [
      "Method",
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
      "Trans_Status_Description",
      "trans_status_description",
      "Status_Description",
      "status_description",
      "failure_reason",
      "failureReason",
      "error",
      "error_message",
      "errorMessage",
      "Comment",
      "comment",
      "message",
      "Message",
    ]) ??
    getValue(body, [
      "Trans_Status_Description",
      "trans_status_description",
      "Status_Description",
      "status_description",
      "failure_reason",
      "failureReason",
      "error",
      "error_message",
      "errorMessage",
      "Comment",
      "comment",
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

  const normalized =
    value.trim().toLowerCase();

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

function mergeMetadata(
  existing: unknown,
  additions: JsonObject,
): JsonObject {
  return {
    ...(isObject(existing)
      ? existing
      : {}),
    ...additions,
  };
}

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * =====================================================
     * 1. LECTURE DU BODY BRUT
     * =====================================================
     *
     * Important pour ne pas perdre la valeur exacte
     * de body.data utilisée pour la signature.
     */
    const rawBody =
      await request.text();

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

    /*
     * =====================================================
     * 2. EXTRACTION DE DATA
     * =====================================================
     */
    const encryptedData =
      getEncryptedCallbackData(body);

    if (!encryptedData) {
      return jsonResponse(
        {
          success: false,
          error:
            "Champ data chiffré manquant.",
        },
        400,
      );
    }

    /*
     * =====================================================
     * 3. VÉRIFICATION X-SIGNATURE
     * =====================================================
     *
     * Moko indique :
     *
     * HMAC-SHA256(
     *   encrypted_message,
     *   HMAC_KEY
     * )
     *
     * La signature porte donc sur data AVANT
     * le déchiffrement.
     */
    const verifyWebhookSignature =
      mokoAfrikaAdapter.verifyWebhookSignature;

    if (
      typeof verifyWebhookSignature !==
      "function"
    ) {
      console.error(
        "MOKO AFRIKA WEBHOOK SECURITY ERROR: verifyWebhookSignature indisponible.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Vérification de signature Moko Afrika non configurée.",
        },
        500,
      );
    }

    const signatureValid =
      verifyWebhookSignature(
        encryptedData,
        request.headers,
      );

    if (!signatureValid) {
      console.warn(
        "MOKO AFRIKA WEBHOOK INVALID SIGNATURE",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Signature Moko Afrika invalide.",
        },
        401,
      );
    }

    /*
     * À partir d'ici seulement, le callback est
     * considéré comme authentique.
     */

    /*
     * =====================================================
     * 4. DÉCHIFFREMENT + PARSING
     * =====================================================
     */
    let parsedStatus:
      | ReturnType<
          typeof normalizePaymentStatus
        >
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

    let parsedPayload:
      | JsonObject
      | null = null;

    try {
      if (
        typeof mokoAfrikaAdapter.parseWebhook !==
        "function"
      ) {
        throw new Error(
          "parseWebhook Moko Afrika indisponible.",
        );
      }

      const parsed =
        mokoAfrikaAdapter.parseWebhook(
          body,
          request.headers,
        );

      if (!parsed) {
        throw new Error(
          "Webhook Moko Afrika non interprétable.",
        );
      }

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

      if (
        isObject(parsed.metadata)
      ) {
        parsedPayload =
          parsed.metadata;
      }
    } catch (error) {
      console.error(
        "MOKO AFRIKA WEBHOOK DECRYPTION/PARSING ERROR:",
        error,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible de déchiffrer ou d'interpréter le callback Moko Afrika.",
        },
        400,
      );
    }

    /*
     * =====================================================
     * 5. EXTRACTION DE SECOURS
     * =====================================================
     */
    const genericPayload =
      extractPayload(body);

    const merchantReference =
      parsedMerchantReference ??
      getMerchantReference(
        genericPayload,
        genericPayload,
      );

    const providerTransactionId =
      parsedProviderTransactionId ??
      getProviderTransactionId(
        genericPayload,
        genericPayload,
      );

    const amount =
      parsedAmount ??
      getAmount(
        genericPayload,
        genericPayload,
      );

    const currency =
      parsedCurrency ??
      getCurrency(
        genericPayload,
        genericPayload,
      );

    const providerStatus =
      getProviderStatus(
        genericPayload,
        genericPayload,
      );

    const paymentMethod =
      parsedPaymentMethod ??
      getPaymentMethod(
        genericPayload,
        genericPayload,
      );

    const failureReason =
      parsedFailureReason ??
      getFailureReason(
        genericPayload,
        genericPayload,
      );

    /*
     * Si parseWebhook n'a pas déterminé le statut,
     * nous utilisons Trans_Status en priorité.
     */
    const finalStatus =
      parsedStatus ??
      providerStatusToPaymentStatus(
        providerStatus,
      );

    if (
      !merchantReference &&
      !providerTransactionId
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
     * =====================================================
     * 6. RECHERCHE TRANSACTION PHARMAFLOW
     * =====================================================
     */
    let transaction:
      | PaymentTransaction
      | null = null;

    if (merchantReference) {
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
            merchantReference,
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

      transaction =
        result.data as
          | PaymentTransaction
          | null;
    }

    if (
      !transaction &&
      providerTransactionId
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
            providerTransactionId,
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

      transaction =
        result.data as
          | PaymentTransaction
          | null;
    }

    /*
     * =====================================================
     * 7. TRANSACTION INCONNUE
     * =====================================================
     */
    if (!transaction) {
      console.warn(
        "MOKO AFRIKA WEBHOOK UNKNOWN TRANSACTION:",
        {
          merchantReference,
          providerTransactionId,
        },
      );

      /*
       * 200 évite les répétitions infinies
       * du fournisseur pour une transaction
       * qui n'existe pas dans PharmaFlow.
       */
      return jsonResponse(
        {
          success: true,
          received: true,
          processed: false,
          message:
            "Webhook authentifié mais transaction PharmaFlow introuvable.",
        },
        200,
      );
    }

    /*
     * =====================================================
     * 8. VÉRIFICATION FOURNISSEUR
     * =====================================================
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
     * =====================================================
     * 9. MÉTADONNÉES EXISTANTES
     * =====================================================
     */
    const existingMetadata =
      isObject(transaction.metadata)
        ? transaction.metadata
        : {};

    const activationStatus =
      normalizeString(
        existingMetadata.activation_status,
      );

    /*
     * =====================================================
     * 10. IDEMPOTENCE
     * =====================================================
     */
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
     * =====================================================
     * 11. VÉRIFICATION MONTANT
     * =====================================================
     */
    if (
      amount !== null &&
      Number(transaction.amount) !==
        Number(amount)
    ) {
      console.error(
        "MOKO AFRIKA WEBHOOK AMOUNT MISMATCH:",
        {
          expected:
            transaction.amount,
          received:
            amount,
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
          metadata:
            mergeMetadata(
              existingMetadata,
              {
                webhook_amount:
                  amount,
                webhook_currency:
                  currency,
                webhook_received_at:
                  new Date().toISOString(),
              },
            ),
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
     * =====================================================
     * 12. VÉRIFICATION DEVISE
     * =====================================================
     */
    if (
      currency &&
      String(
        transaction.currency,
      ).toUpperCase() !== currency
    ) {
      console.error(
        "MOKO AFRIKA WEBHOOK CURRENCY MISMATCH:",
        {
          expected:
            transaction.currency,
          received:
            currency,
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
          metadata:
            mergeMetadata(
              existingMetadata,
              {
                webhook_amount:
                  amount,
                webhook_currency:
                  currency,
                webhook_received_at:
                  new Date().toISOString(),
              },
            ),
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

    /*
     * =====================================================
     * 13. MÉTADONNÉES WEBHOOK
     * =====================================================
     */
    const normalizedStatus =
      normalizePaymentStatus(
        finalStatus,
      );

    const newMetadata =
      mergeMetadata(
        existingMetadata,
        {
          webhook_provider:
            "moko_afrika",

          webhook_received_at:
            new Date().toISOString(),

          webhook_status:
            normalizedStatus,

          webhook_amount:
            amount,

          webhook_currency:
            currency,

          webhook_payment_method:
            paymentMethod,

          webhook_signature_verified:
            true,
        },
      );

    if (failureReason) {
      newMetadata.webhook_failure_reason =
        failureReason;
    }

    if (parsedPayload) {
      newMetadata.webhook_parsed_metadata =
        parsedPayload;
    }

    /*
     * =====================================================
     * 14. PAIEMENT RÉUSSI
     * =====================================================
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
              providerTransactionId ??
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
       * ===================================================
       * 15. ACTIVATION IDEMPOTENTE
       * ===================================================
       *
       * Le paiement est déjà enregistré comme successful.
       * Si l'activation échoue, le client ne doit surtout
       * pas être obligé de payer une deuxième fois.
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

        return jsonResponse(
          {
            success: true,
            received: true,
            processed: true,
            paymentStatus:
              "successful",
            activationStatus:
              "pending",
            transactionId:
              transaction.id,
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
     * =====================================================
     * 16. PAIEMENT EN ATTENTE
     * =====================================================
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
              providerTransactionId ??
              transaction.provider_transaction_id,

            metadata:
              newMetadata,
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
     * =====================================================
     * 17. ÉCHEC / ANNULATION / EXPIRATION
     * =====================================================
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
            providerTransactionId ??
            transaction.provider_transaction_id,

          failure_reason:
            failureReason ??
            `Paiement ${finalFailureStatus}.`,

          metadata:
            newMetadata,
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
      provider:
        "moko_afrika",
      webhook: true,
      message:
        "Webhook Moko Afrika PharmaFlow opérationnel.",
    },
    200,
  );
}