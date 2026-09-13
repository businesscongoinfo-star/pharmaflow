import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";

import {
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
} from "@/app/lib/payments/types";

import {
  mokoAfrikaAdapter,
} from "@/app/lib/payments/moko-afrika";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

type PaymentTransaction = {
  id: string;
  pharmacy_id: string;
  subscription_id: string | null;
  provider_id: string | null;
  provider: string;
  provider_transaction_id: string | null;
  merchant_reference: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  status: string;
  metadata: JsonObject | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

function jsonResponse(
  data: JsonObject,
  status = 200,
) {
  return NextResponse.json(
    data,
    { status },
  );
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

function normalizeString(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const valueTrimmed =
    value.trim();

  return valueTrimmed.length > 0
    ? valueTrimmed
    : null;
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
    const normalized =
      value
        .trim()
        .replace(",", ".");

    const amount =
      Number(normalized);

    if (
      Number.isFinite(amount)
    ) {
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

function amountsMatch(
  expected: number,
  received: number,
): boolean {
  return (
    Math.abs(
      Number(expected) -
        Number(received),
    ) < 0.01
  );
}

function getRequestValue(
  body: JsonObject,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        key,
      )
    ) {
      return body[key];
    }
  }

  return undefined;
}

async function findTransaction(
  merchantReference: string | null,
  providerTransactionId: string | null,
): Promise<{
  transaction: PaymentTransaction | null;
  error: unknown;
}> {
  if (merchantReference) {
    const result =
      await supabaseAdmin
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
      return {
        transaction: null,
        error: result.error,
      };
    }

    if (result.data) {
      return {
        transaction:
          result.data as PaymentTransaction,
        error: null,
      };
    }
  }

  if (providerTransactionId) {
    const result =
      await supabaseAdmin
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
      return {
        transaction: null,
        error: result.error,
      };
    }

    if (result.data) {
      return {
        transaction:
          result.data as PaymentTransaction,
        error: null,
      };
    }
  }

  return {
    transaction: null,
    error: null,
  };
}

async function activateSubscription(
  transaction: PaymentTransaction,
  metadata: JsonObject,
) {
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
      "MOKO AFRIKA VERIFY ACTIVATION ERROR:",
      activation.error,
    );

    await supabaseAdmin
      .from(
        "payment_transactions",
      )
      .update({
        metadata: {
          ...metadata,
          activation_status:
            "pending",
          activation_error:
            activation.error.message,
          activation_retry_at:
            new Date().toISOString(),
        },
      })
      .eq(
        "id",
        transaction.id,
      );

    return {
      success: false,
      error: activation.error,
    };
  }

  await supabaseAdmin
    .from(
      "payment_transactions",
    )
    .update({
      metadata: {
        ...metadata,
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

  return {
    success: true,
    error: null,
  };
}

export async function POST(
  request: NextRequest,
) {
  try {
    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Corps JSON invalide.",
        },
        400,
      );
    }

    if (!isObject(body)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Format de requête invalide.",
        },
        400,
      );
    }

    /*
     * -----------------------------------------------------
     * PARAMÈTRES DE LA REQUÊTE
     * -----------------------------------------------------
     */

    const merchantReference =
      normalizeString(
        getRequestValue(
          body,
          [
            "merchantReference",
            "merchant_reference",
            "reference",
          ],
        ),
      );

    const providerTransactionId =
      normalizeString(
        getRequestValue(
          body,
          [
            "providerTransactionId",
            "provider_transaction_id",
            "transactionId",
            "transaction_id",
            "transaction_uuid",
          ],
        ),
      );

    const requestedAmount =
      normalizeAmount(
        getRequestValue(
          body,
          [
            "amount",
            "expectedAmount",
            "expected_amount",
          ],
        ),
      );

    const requestedCurrency =
      normalizeCurrency(
        getRequestValue(
          body,
          [
            "currency",
            "expectedCurrency",
            "expected_currency",
          ],
        ),
      );

    /*
     * Au moins une des deux références est nécessaire.
     */
    if (
      !merchantReference &&
      !providerTransactionId
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "merchantReference ou providerTransactionId est requis.",
        },
        400,
      );
    }

    /*
     * -----------------------------------------------------
     * RECHERCHE DE LA TRANSACTION PHARMAFLOW
     * -----------------------------------------------------
     */

    const search =
      await findTransaction(
        merchantReference,
        providerTransactionId,
      );

    if (search.error) {
      console.error(
        "MOKO AFRIKA VERIFY DATABASE SEARCH ERROR:",
        search.error,
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

    const transaction =
      search.transaction;

    if (!transaction) {
      return jsonResponse(
        {
          success: false,
          error:
            "Transaction PharmaFlow introuvable.",
          merchantReference,
          providerTransactionId,
        },
        404,
      );
    }

    /*
     * -----------------------------------------------------
     * VÉRIFICATION DU FOURNISSEUR
     * -----------------------------------------------------
     */

    if (
      transaction.provider !==
      "moko_afrika"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Cette transaction n'appartient pas à Moko Afrika.",
        },
        409,
      );
    }

    /*
     * -----------------------------------------------------
     * PROTECTION CONTRE LA DOUBLE ACTIVATION
     * -----------------------------------------------------
     */

    const existingMetadata =
      isObject(
        transaction.metadata,
      )
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
          verified: true,
          alreadyProcessed:
            true,
          paymentStatus:
            "successful",
          activationStatus:
            "activated",
          transactionId:
            transaction.id,
          merchantReference:
            transaction.merchant_reference,
          amount:
            transaction.amount,
          currency:
            transaction.currency,
        },
        200,
      );
    }

    /*
     * -----------------------------------------------------
     * VÉRIFICATION AUPRÈS DE MOKO AFRIKA
     * -----------------------------------------------------
     */

    const verifyResult =
      await mokoAfrikaAdapter.verifyPayment(
        {
          pharmacyId:
            transaction.pharmacy_id,

          merchantReference:
            transaction.merchant_reference ??
            merchantReference ??
            undefined,

          providerTransactionId:
            transaction.provider_transaction_id ??
            providerTransactionId ??
            undefined,

          expectedAmount:
            requestedAmount ??
            Number(
              transaction.amount,
            ),

          expectedCurrency:
            requestedCurrency ??
            String(
              transaction.currency,
            ).toUpperCase(),

          metadata: {
            transactionId:
              transaction.id,
            subscriptionId:
              transaction.subscription_id,
            paymentMethod:
              transaction.payment_method,
          },
        },
      );

    /*
     * -----------------------------------------------------
     * NORMALISATION DU RÉSULTAT
     * -----------------------------------------------------
     */

    const normalizedStatus =
      normalizePaymentStatus(
        verifyResult.status,
      );

    const verifiedAmount =
      normalizeAmount(
        verifyResult.amount,
      );

    const verifiedCurrency =
      normalizeCurrency(
        verifyResult.currency,
      );

    const verifiedReference =
      normalizeString(
        verifyResult.merchantReference,
      );

    const verifiedProviderTransactionId =
      normalizeString(
        verifyResult.providerTransactionId,
      );

    /*
     * -----------------------------------------------------
     * VÉRIFICATION DU MONTANT
     * -----------------------------------------------------
     */

    if (
      verifiedAmount !== null &&
      !amountsMatch(
        Number(
          transaction.amount,
        ),
        verifiedAmount,
      )
    ) {
      console.error(
        "MOKO AFRIKA VERIFY AMOUNT MISMATCH:",
        {
          transactionId:
            transaction.id,
          expected:
            transaction.amount,
          received:
            verifiedAmount,
        },
      );

      const mismatchMetadata =
        {
          ...existingMetadata,
          verification_status:
            "amount_mismatch",
          verification_amount:
            verifiedAmount,
          verification_currency:
            verifiedCurrency,
          verification_reference:
            verifiedReference,
          verification_provider_transaction_id:
            verifiedProviderTransactionId,
          verification_checked_at:
            new Date().toISOString(),
        };

      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",
          failure_reason:
            "Le montant confirmé par Moko Afrika est différent du montant attendu.",
          metadata:
            mismatchMetadata,
        })
        .eq(
          "id",
          transaction.id,
        );

      return jsonResponse(
        {
          success: false,
          verified: false,
          paymentStatus:
            "failed",
          error:
            "Le montant du paiement ne correspond pas.",
          expectedAmount:
            transaction.amount,
          receivedAmount:
            verifiedAmount,
        },
        409,
      );
    }

    /*
     * -----------------------------------------------------
     * VÉRIFICATION DE LA DEVISE
     * -----------------------------------------------------
     */

    if (
      verifiedCurrency &&
      String(
        transaction.currency,
      ).toUpperCase() !==
        verifiedCurrency
    ) {
      console.error(
        "MOKO AFRIKA VERIFY CURRENCY MISMATCH:",
        {
          transactionId:
            transaction.id,
          expected:
            transaction.currency,
          received:
            verifiedCurrency,
        },
      );

      const mismatchMetadata =
        {
          ...existingMetadata,
          verification_status:
            "currency_mismatch",
          verification_amount:
            verifiedAmount,
          verification_currency:
            verifiedCurrency,
          verification_checked_at:
            new Date().toISOString(),
        };

      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",
          failure_reason:
            "La devise confirmée par Moko Afrika est différente de la devise attendue.",
          metadata:
            mismatchMetadata,
        })
        .eq(
          "id",
          transaction.id,
        );

      return jsonResponse(
        {
          success: false,
          verified: false,
          paymentStatus:
            "failed",
          error:
            "La devise du paiement ne correspond pas.",
          expectedCurrency:
            transaction.currency,
          receivedCurrency:
            verifiedCurrency,
        },
        409,
      );
    }

    /*
     * -----------------------------------------------------
     * MÉTADONNÉES DE VÉRIFICATION
     * -----------------------------------------------------
     */

    const verificationMetadata:
      JsonObject = {
      ...existingMetadata,

      verification_provider:
        "moko_afrika",

      verification_status:
        normalizedStatus,

      verification_checked_at:
        new Date().toISOString(),

      verification_amount:
        verifiedAmount,

      verification_currency:
        verifiedCurrency,

      verification_reference:
        verifiedReference,

      verification_provider_transaction_id:
        verifiedProviderTransactionId,
    };

    if (
      verifyResult.message
    ) {
      verificationMetadata.verification_message =
        verifyResult.message;
    }

    if (
      verifyResult.failureReason
    ) {
      verificationMetadata.verification_failure_reason =
        verifyResult.failureReason;
    }

    /*
     * -----------------------------------------------------
     * CAS 1 : PAIEMENT RÉUSSI
     * -----------------------------------------------------
     */

    if (
      isSuccessfulPaymentStatus(
        normalizedStatus,
      )
    ) {
      const updateResult =
        await supabaseAdmin
          .from(
            "payment_transactions",
          )
          .update({
            status:
              "successful",

            provider_transaction_id:
              verifiedProviderTransactionId ??
              transaction.provider_transaction_id ??
              providerTransactionId,

            paid_at:
              transaction.paid_at ??
              new Date().toISOString(),

            failure_reason:
              null,

            metadata: {
              ...verificationMetadata,
              activation_status:
                "pending",
            },
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "MOKO AFRIKA VERIFY PAYMENT UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer le paiement vérifié.",
          },
          500,
        );
      }

      /*
       * Activation du forfait.
       */
      const activation =
        await activateSubscription(
          transaction,
          {
            ...verificationMetadata,
            activation_status:
              "pending",
          },
        );

      if (!activation.success) {
        /*
         * Le paiement reste successful.
         * L'activation pourra être retentée.
         */
        return jsonResponse(
          {
            success: true,
            verified: true,
            paymentStatus:
              "successful",
            activationStatus:
              "pending",
            transactionId:
              transaction.id,
            merchantReference:
              transaction.merchant_reference,
            message:
              "Paiement confirmé. Activation de l'abonnement en attente.",
          },
          200,
        );
      }

      return jsonResponse(
        {
          success: true,
          verified: true,
          paymentStatus:
            "successful",
          activationStatus:
            "activated",
          transactionId:
            transaction.id,
          merchantReference:
            transaction.merchant_reference,
          providerTransactionId:
            verifiedProviderTransactionId ??
            transaction.provider_transaction_id ??
            providerTransactionId,
          amount:
            verifiedAmount ??
            transaction.amount,
          currency:
            verifiedCurrency ??
            transaction.currency,
          message:
            "Paiement confirmé et abonnement activé.",
        },
        200,
      );
    }

    /*
     * -----------------------------------------------------
     * CAS 2 : PAIEMENT EN ATTENTE
     * -----------------------------------------------------
     */

    if (
      normalizedStatus ===
      "pending"
    ) {
      const updateResult =
        await supabaseAdmin
          .from(
            "payment_transactions",
          )
          .update({
            status:
              "pending",

            provider_transaction_id:
              verifiedProviderTransactionId ??
              transaction.provider_transaction_id ??
              providerTransactionId,

            metadata:
              verificationMetadata,
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "MOKO AFRIKA VERIFY PENDING UPDATE ERROR:",
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
          verified: true,
          paymentStatus:
            "pending",
          activationStatus:
            "not_activated",
          transactionId:
            transaction.id,
          merchantReference:
            transaction.merchant_reference,
          providerTransactionId:
            verifiedProviderTransactionId ??
            transaction.provider_transaction_id ??
            providerTransactionId,
          amount:
            verifiedAmount ??
            transaction.amount,
          currency:
            verifiedCurrency ??
            transaction.currency,
          message:
            verifyResult.message ??
            "Le paiement est encore en attente.",
        },
        200,
      );
    }

    /*
     * -----------------------------------------------------
     * CAS 3 : PAIEMENT ÉCHOUÉ
     * -----------------------------------------------------
     */

    if (
      normalizedStatus ===
      "failed"
    ) {
      const updateResult =
        await supabaseAdmin
          .from(
            "payment_transactions",
          )
          .update({
            status:
              "failed",

            provider_transaction_id:
              verifiedProviderTransactionId ??
              transaction.provider_transaction_id ??
              providerTransactionId,

            failure_reason:
              verifyResult.failureReason ??
              verifyResult.message ??
              "Paiement échoué.",

            metadata:
              verificationMetadata,
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "MOKO AFRIKA VERIFY FAILED UPDATE ERROR:",
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
          verified: true,
          paymentStatus:
            "failed",
          activationStatus:
            "not_activated",
          transactionId:
            transaction.id,
          merchantReference:
            transaction.merchant_reference,
          message:
            verifyResult.failureReason ??
            verifyResult.message ??
            "Le paiement a échoué.",
        },
        200,
      );
    }

    /*
     * -----------------------------------------------------
     * CAS 4 : PAIEMENT ANNULÉ
     * -----------------------------------------------------
     */

    if (
      normalizedStatus ===
      "cancelled"
    ) {
      const updateResult =
        await supabaseAdmin
          .from(
            "payment_transactions",
          )
          .update({
            status:
              "cancelled",

            provider_transaction_id:
              verifiedProviderTransactionId ??
              transaction.provider_transaction_id ??
              providerTransactionId,

            failure_reason:
              verifyResult.failureReason ??
              verifyResult.message ??
              "Paiement annulé.",

            metadata:
              verificationMetadata,
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "MOKO AFRIKA VERIFY CANCELLED UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer l'annulation du paiement.",
          },
          500,
        );
      }

      return jsonResponse(
        {
          success: true,
          verified: true,
          paymentStatus:
            "cancelled",
          activationStatus:
            "not_activated",
          transactionId:
            transaction.id,
          merchantReference:
            transaction.merchant_reference,
          message:
            verifyResult.message ??
            "Le paiement a été annulé.",
        },
        200,
      );
    }

    /*
     * -----------------------------------------------------
     * CAS 5 : PAIEMENT EXPIRÉ
     * -----------------------------------------------------
     */

    if (
      normalizedStatus ===
      "expired"
    ) {
      const updateResult =
        await supabaseAdmin
          .from(
            "payment_transactions",
          )
          .update({
            status:
              "expired",

            provider_transaction_id:
              verifiedProviderTransactionId ??
              transaction.provider_transaction_id ??
              providerTransactionId,

            failure_reason:
              verifyResult.failureReason ??
              verifyResult.message ??
              "Paiement expiré.",

            metadata:
              verificationMetadata,
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "MOKO AFRIKA VERIFY EXPIRED UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Impossible d'enregistrer l'expiration du paiement.",
          },
          500,
        );
      }

      return jsonResponse(
        {
          success: true,
          verified: true,
          paymentStatus:
            "expired",
          activationStatus:
            "not_activated",
          transactionId:
            transaction.id,
          merchantReference:
            transaction.merchant_reference,
          message:
            verifyResult.message ??
            "Le paiement a expiré.",
        },
        200,
      );
    }

    /*
     * -----------------------------------------------------
     * FALLBACK
     * -----------------------------------------------------
     *
     * Si Moko renvoie un statut non reconnu,
     * nous conservons pending par sécurité.
     */
    const fallbackResult =
      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "pending",
          provider_transaction_id:
            verifiedProviderTransactionId ??
            transaction.provider_transaction_id ??
            providerTransactionId,
          metadata:
            verificationMetadata,
        })
        .eq(
          "id",
          transaction.id,
        );

    if (
      fallbackResult.error
    ) {
      console.error(
        "MOKO AFRIKA VERIFY FALLBACK UPDATE ERROR:",
        fallbackResult.error,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible d'enregistrer le résultat de vérification.",
        },
        500,
      );
    }

    return jsonResponse(
      {
        success: true,
        verified: true,
        paymentStatus:
          "pending",
        activationStatus:
          "not_activated",
        transactionId:
          transaction.id,
        merchantReference:
          transaction.merchant_reference,
        message:
          verifyResult.message ??
          "Le statut du paiement reste en attente de confirmation.",
      },
      200,
    );
  } catch (error) {
    console.error(
      "MOKO AFRIKA VERIFY UNEXPECTED ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Erreur interne lors de la vérification du paiement.",
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
      endpoint:
        "/api/payments/verify",
      message:
        "Endpoint de vérification Moko Afrika opérationnel.",
    },
    200,
  );
}