import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/app/lib/supabase/admin";

import {
  verifyPayment as verifyPaymentWithEngine,
} from "@/app/lib/payments/engine";

import type {
  PaymentProviderCode,
} from "@/app/lib/payments/types";

import {
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
} from "@/app/lib/payments/types";

export const runtime = "nodejs";

/* =========================================================
   TYPES
========================================================= */

type JsonObject =
  Record<string, unknown>;

type PaymentTransaction = {
  id: string;

  pharmacy_id: string;

  subscription_id:
    | string
    | null;

  provider_id:
    | string
    | null;

  provider: string;

  provider_transaction_id:
    | string
    | null;

  merchant_reference:
    | string
    | null;

  amount: number;

  currency: string;

  payment_method:
    | string
    | null;

  status: string;

  metadata:
    | JsonObject
    | null;

  created_at: string;

  updated_at: string;

  paid_at:
    | string
    | null;
};

type RequestBody = {
  merchantReference?:
    | string
    | null;

  merchant_reference?:
    | string
    | null;

  reference?:
    | string
    | null;

  providerTransactionId?:
    | string
    | null;

  provider_transaction_id?:
    | string
    | null;

  transactionId?:
    | string
    | null;

  transaction_id?:
    | string
    | null;

  transaction_uuid?:
    | string
    | null;

  amount?:
    | number
    | string
    | null;

  expectedAmount?:
    | number
    | string
    | null;

  expected_amount?:
    | number
    | string
    | null;

  currency?:
    | string
    | null;

  expectedCurrency?:
    | string
    | null;

  expected_currency?:
    | string
    | null;

  provider?:
    | string
    | null;
};

/* =========================================================
   JSON RESPONSE
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

    if (
      Number.isFinite(
        amount,
      )
    ) {
      return amount;
    }
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

  if (!currency) {
    return null;
  }

  return currency
    .toUpperCase();
}

/* =========================================================
   AMOUNT COMPARISON
========================================================= */

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

/* =========================================================
   PROVIDER
========================================================= */

function normalizeProvider(
  value: unknown,
): PaymentProviderCode | null {
  const provider =
    normalizeString(
      value,
    )?.toLowerCase();

  if (!provider) {
    return null;
  }

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
  if (
    isObject(value)
  ) {
    return value;
  }

  return {};
}

/* =========================================================
   FIND TRANSACTION
========================================================= */

async function findTransaction(
  merchantReference:
    | string
    | null,
  providerTransactionId:
    | string
    | null,
  provider:
    | PaymentProviderCode
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
   * 1. RECHERCHE PAR MERCHANT REFERENCE
   * -------------------------------------------------------
   */

  if (
    merchantReference
  ) {
    let query =
      supabaseAdmin
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
        );

    if (provider) {
      query =
        query.eq(
          "provider",
          provider,
        );
    }

    const {
      data,
      error,
    } =
      await query.maybeSingle();

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
   * 2. RECHERCHE PAR PROVIDER TRANSACTION ID
   * -------------------------------------------------------
   */

  if (
    providerTransactionId
  ) {
    let query =
      supabaseAdmin
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
        );

    if (provider) {
      query =
        query.eq(
          "provider",
          provider,
        );
    }

    const {
      data,
      error,
    } =
      await query.maybeSingle();

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
   ACTIVATION ABONNEMENT
========================================================= */

async function activateSubscription(
  transaction:
    PaymentTransaction,
  metadata:
    JsonObject,
) {
  const activation =
    await supabaseAdmin.rpc(
      "pf_activate_subscription_from_payment",
      {
        p_payment_id:
          transaction.id,
      },
    );

  if (
    activation.error
  ) {
    console.error(
      "PAYMENT VERIFY ACTIVATION ERROR:",
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
            activation.error
              .message,

          activation_retry_at:
            new Date()
              .toISOString(),
        },
      })
      .eq(
        "id",
        transaction.id,
      );

    return {
      success: false,

      error:
        activation.error,
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
          activation.data ??
          null,

        activated_at:
          new Date()
            .toISOString(),
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

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest,
) {
  try {
    /* =======================================================
       1. JSON
    ======================================================= */

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

    if (
      !isObject(body)
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Format de requête invalide.",
        },
        400,
      );
    }

    const requestBody =
      body as RequestBody;

    /* =======================================================
       2. RÉFÉRENCE MARCHAND
    ======================================================= */

    const merchantReference =
      normalizeString(
        requestBody.merchantReference ??
          requestBody.merchant_reference ??
          requestBody.reference,
      );

    /* =======================================================
       3. ID FOURNISSEUR
    ======================================================= */

    const providerTransactionId =
      normalizeString(
        requestBody.providerTransactionId ??
          requestBody.provider_transaction_id ??
          requestBody.transactionId ??
          requestBody.transaction_id ??
          requestBody.transaction_uuid,
      );

    /* =======================================================
       4. FOURNISSEUR OPTIONNEL
    ======================================================= */

    const requestedProvider =
      normalizeProvider(
        requestBody.provider,
      );

    /* =======================================================
       5. MONTANT DEMANDÉ
    ======================================================= */

    const requestedAmount =
      normalizeAmount(
        requestBody.amount ??
          requestBody.expectedAmount ??
          requestBody.expected_amount,
      );

    /* =======================================================
       6. DEVISE DEMANDÉE
    ======================================================= */

    const requestedCurrency =
      normalizeCurrency(
        requestBody.currency ??
          requestBody.expectedCurrency ??
          requestBody.expected_currency,
      );

    /* =======================================================
       7. RÉFÉRENCE OBLIGATOIRE
    ======================================================= */

    if (
      !merchantReference &&
      !providerTransactionId
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "merchantReference ou providerTransactionId est requis.",

          code:
            "PAYMENT_REFERENCE_REQUIRED",
        },
        400,
      );
    }

    /* =======================================================
       8. RECHERCHE TRANSACTION
    ======================================================= */

    const search =
      await findTransaction(
        merchantReference,
        providerTransactionId,
        requestedProvider,
      );

    if (
      search.error
    ) {
      console.error(
        "PAYMENT VERIFY DATABASE SEARCH ERROR:",
        search.error,
      );

      return jsonResponse(
        {
          success: false,

          error:
            "Erreur lors de la recherche de la transaction.",

          code:
            "PAYMENT_TRANSACTION_SEARCH_ERROR",
        },
        500,
      );
    }

    const transaction =
      search.transaction;

    if (
      !transaction
    ) {
      return jsonResponse(
        {
          success: false,

          verified: false,

          error:
            "Transaction PharmaFlow introuvable.",

          code:
            "PAYMENT_TRANSACTION_NOT_FOUND",

          merchantReference,

          providerTransactionId,

          provider:
            requestedProvider,
        },
        404,
      );
    }

    /* =======================================================
       9. FOURNISSEUR RÉEL
    ======================================================= */

    const transactionProvider =
      normalizeProvider(
        transaction.provider,
      );

    if (
      !transactionProvider
    ) {
      return jsonResponse(
        {
          success: false,

          verified: false,

          error:
            "Le fournisseur de paiement de cette transaction est invalide.",

          code:
            "INVALID_PAYMENT_PROVIDER",

          transactionId:
            transaction.id,

          provider:
            transaction.provider,
        },
        409,
      );
    }

    /* =======================================================
       10. PROTECTION CONTRE UN MAUVAIS PROVIDER
    ======================================================= */

    if (
      requestedProvider &&
      requestedProvider !==
        transactionProvider
    ) {
      return jsonResponse(
        {
          success: false,

          verified: false,

          error:
            "Le fournisseur demandé ne correspond pas au fournisseur de la transaction.",

          code:
            "PAYMENT_PROVIDER_MISMATCH",

          transactionId:
            transaction.id,

          requestedProvider,

          transactionProvider,
        },
        409,
      );
    }

    /* =======================================================
       11. MÉTADONNÉES EXISTANTES
    ======================================================= */

    const existingMetadata =
      normalizeMetadata(
        transaction.metadata,
      );

    /* =======================================================
       12. DÉJÀ ACTIVÉ
    ======================================================= */

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

          provider:
            transactionProvider,

          providerTransactionId:
            transaction.provider_transaction_id,

          amount:
            transaction.amount,

          currency:
            transaction.currency,
        },
        200,
      );
    }

    /* =======================================================
       13. VÉRIFICATION MONTANT DEMANDÉ
    ======================================================= */

    if (
      requestedAmount !==
        null &&
      !amountsMatch(
        Number(
          transaction.amount,
        ),
        requestedAmount,
      )
    ) {
      return jsonResponse(
        {
          success: false,

          verified: false,

          paymentStatus:
            "failed",

          error:
            "Le montant demandé ne correspond pas au montant de la transaction.",

          code:
            "REQUESTED_AMOUNT_MISMATCH",

          expectedAmount:
            transaction.amount,

          requestedAmount,
        },
        409,
      );
    }

    /* =======================================================
       14. VÉRIFICATION DEVISE DEMANDÉE
    ======================================================= */

    if (
      requestedCurrency &&
      String(
        transaction.currency,
      )
        .trim()
        .toUpperCase() !==
        requestedCurrency
    ) {
      return jsonResponse(
        {
          success: false,

          verified: false,

          paymentStatus:
            "failed",

          error:
            "La devise demandée ne correspond pas à la devise de la transaction.",

          code:
            "REQUESTED_CURRENCY_MISMATCH",

          expectedCurrency:
            transaction.currency,

          requestedCurrency,
        },
        409,
      );
    }

    /* =======================================================
       15. VÉRIFICATION SERVEUR-À-SERVEUR
    ======================================================= */

    let verifyResult;

    try {
      verifyResult =
        await verifyPaymentWithEngine(
          transactionProvider,
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
              Number(
                transaction.amount,
              ),

            expectedCurrency:
              String(
                transaction.currency,
              )
                .trim()
                .toUpperCase(),

            metadata: {
              transactionId:
                transaction.id,

              subscriptionId:
                transaction.subscription_id,

              paymentMethod:
                transaction.payment_method,

              provider:
                transactionProvider,
            },
          },
        );
    } catch (
      verificationError
    ) {
      console.error(
        "PAYMENT VERIFY PROVIDER ERROR:",
        {
          provider:
            transactionProvider,

          transactionId:
            transaction.id,

          error:
            verificationError,
        },
      );

      const errorMessage =
        verificationError instanceof
        Error
          ? verificationError.message
          : "Impossible de vérifier la transaction auprès du fournisseur.";

      /*
       * Le paiement ne doit surtout pas
       * être marqué successful lorsqu'une
       * vérification serveur échoue.
       */
      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .update({
          metadata: {
            ...existingMetadata,

            verification_status:
              "verification_error",

            verification_provider:
              transactionProvider,

            verification_error:
              errorMessage,

            verification_checked_at:
              new Date()
                .toISOString(),
          },
        })
        .eq(
          "id",
          transaction.id,
        );

      return jsonResponse(
        {
          success: false,

          verified: false,

          error:
            "Le fournisseur n'a pas pu confirmer le paiement.",

          code:
            "PAYMENT_PROVIDER_VERIFICATION_ERROR",

          provider:
            transactionProvider,

          transactionId:
            transaction.id,

          message:
            errorMessage,
        },
        502,
      );
    }

    /* =======================================================
       16. NORMALISER LE STATUT
    ======================================================= */

    const normalizedStatus =
      normalizePaymentStatus(
        verifyResult.status,
      );

    /* =======================================================
       17. DONNÉES VÉRIFIÉES
    ======================================================= */

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

    /* =======================================================
       18. VÉRIFICATION MONTANT FOURNISSEUR
    ======================================================= */

    if (
      verifiedAmount !==
        null &&
      !amountsMatch(
        Number(
          transaction.amount,
        ),
        verifiedAmount,
      )
    ) {
      console.error(
        "PAYMENT VERIFY AMOUNT MISMATCH:",
        {
          provider:
            transactionProvider,

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

          verification_provider:
            transactionProvider,

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
            new Date()
              .toISOString(),
        };

      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",

          failure_reason:
            "Le montant confirmé par le fournisseur est différent du montant attendu.",

          metadata:
            mismatchMetadata,

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

          verified: false,

          paymentStatus:
            "failed",

          activationStatus:
            "not_activated",

          error:
            "Le montant du paiement ne correspond pas.",

          expectedAmount:
            transaction.amount,

          receivedAmount:
            verifiedAmount,

          provider:
            transactionProvider,

          transactionId:
            transaction.id,
        },
        409,
      );
    }

    /* =======================================================
       19. VÉRIFICATION DEVISE FOURNISSEUR
    ======================================================= */

    if (
      verifiedCurrency &&
      String(
        transaction.currency,
      )
        .trim()
        .toUpperCase() !==
        verifiedCurrency
    ) {
      console.error(
        "PAYMENT VERIFY CURRENCY MISMATCH:",
        {
          provider:
            transactionProvider,

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

          verification_provider:
            transactionProvider,

          verification_status:
            "currency_mismatch",

          verification_amount:
            verifiedAmount,

          verification_currency:
            verifiedCurrency,

          verification_reference:
            verifiedReference,

          verification_provider_transaction_id:
            verifiedProviderTransactionId,

          verification_checked_at:
            new Date()
              .toISOString(),
        };

      await supabaseAdmin
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",

          failure_reason:
            "La devise confirmée par le fournisseur est différente de la devise attendue.",

          metadata:
            mismatchMetadata,

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

          verified: false,

          paymentStatus:
            "failed",

          activationStatus:
            "not_activated",

          error:
            "La devise du paiement ne correspond pas.",

          expectedCurrency:
            transaction.currency,

          receivedCurrency:
            verifiedCurrency,

          provider:
            transactionProvider,

          transactionId:
            transaction.id,
        },
        409,
      );
    }

    /* =======================================================
       20. MÉTADONNÉES DE VÉRIFICATION
    ======================================================= */

    const verificationMetadata:
      JsonObject = {
      ...existingMetadata,

      verification_provider:
        transactionProvider,

      verification_status:
        normalizedStatus,

      verification_checked_at:
        new Date()
          .toISOString(),

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

    /* =======================================================
       21. PAIEMENT RÉUSSI
    ======================================================= */

    if (
      isSuccessfulPaymentStatus(
        normalizedStatus,
      )
    ) {
      const finalProviderTransactionId =
        verifiedProviderTransactionId ??
        transaction.provider_transaction_id ??
        providerTransactionId ??
        null;

      const finalMerchantReference =
        verifiedReference ??
        transaction.merchant_reference ??
        merchantReference ??
        null;

      const successfulMetadata =
        {
          ...verificationMetadata,

          activation_status:
            "pending",
        };

      const updateResult =
        await supabaseAdmin
          .from(
            "payment_transactions",
          )
          .update({
            status:
              "successful",

            provider_transaction_id:
              finalProviderTransactionId,

            merchant_reference:
              finalMerchantReference,

            paid_at:
              transaction.paid_at ??
              new Date()
                .toISOString(),

            failure_reason:
              null,

            metadata:
              successfulMetadata,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "PAYMENT VERIFY SUCCESS UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,

            error:
              "Impossible d'enregistrer le paiement vérifié.",

            code:
              "PAYMENT_SUCCESS_UPDATE_ERROR",

            transactionId:
              transaction.id,
          },
          500,
        );
      }

      /* =====================================================
         ACTIVATION ABONNEMENT
      ===================================================== */

      const activation =
        await activateSubscription(
          transaction,
          successfulMetadata,
        );

      if (
        !activation.success
      ) {
        /*
         * Le paiement reste successful.
         * Seule l'activation reste pending.
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
              finalMerchantReference,

            provider:
              transactionProvider,

            providerTransactionId:
              finalProviderTransactionId,

            amount:
              verifiedAmount ??
              transaction.amount,

            currency:
              verifiedCurrency ??
              transaction.currency,

            message:
              "Paiement confirmé. L'activation de l'abonnement est en attente.",
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
            finalMerchantReference,

          provider:
            transactionProvider,

          providerTransactionId:
            finalProviderTransactionId,

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

    /* =======================================================
       22. PAIEMENT EN ATTENTE
    ======================================================= */

    if (
      normalizedStatus ===
      "pending"
    ) {
      const pendingMetadata =
        {
          ...verificationMetadata,

          activation_status:
            "not_activated",
        };

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
              providerTransactionId ??
              null,

            metadata:
              pendingMetadata,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "PAYMENT VERIFY PENDING UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,

            error:
              "Impossible d'enregistrer le statut pending.",

            code:
              "PAYMENT_PENDING_UPDATE_ERROR",
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

          provider:
            transactionProvider,

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

    /* =======================================================
       23. PAIEMENT ÉCHOUÉ
    ======================================================= */

    if (
      normalizedStatus ===
      "failed"
    ) {
      const failureReason =
        verifyResult.failureReason ??
        verifyResult.message ??
        "Paiement échoué.";

      const failedMetadata =
        {
          ...verificationMetadata,

          activation_status:
            "not_activated",
        };

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
              providerTransactionId ??
              null,

            failure_reason:
              failureReason,

            metadata:
              failedMetadata,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "PAYMENT VERIFY FAILED UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,

            error:
              "Impossible d'enregistrer l'échec du paiement.",

            code:
              "PAYMENT_FAILED_UPDATE_ERROR",
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

          provider:
            transactionProvider,

          providerTransactionId:
            verifiedProviderTransactionId ??
            transaction.provider_transaction_id ??
            providerTransactionId,

          message:
            failureReason,
        },
        200,
      );
    }

    /* =======================================================
       24. PAIEMENT ANNULÉ
    ======================================================= */

    if (
      normalizedStatus ===
      "cancelled"
    ) {
      const failureReason =
        verifyResult.failureReason ??
        verifyResult.message ??
        "Paiement annulé.";

      const cancelledMetadata =
        {
          ...verificationMetadata,

          activation_status:
            "not_activated",
        };

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
              providerTransactionId ??
              null,

            failure_reason:
              failureReason,

            metadata:
              cancelledMetadata,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "PAYMENT VERIFY CANCELLED UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,

            error:
              "Impossible d'enregistrer l'annulation du paiement.",

            code:
              "PAYMENT_CANCELLED_UPDATE_ERROR",
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

          provider:
            transactionProvider,

          providerTransactionId:
            verifiedProviderTransactionId ??
            transaction.provider_transaction_id ??
            providerTransactionId,

          message:
            failureReason,
        },
        200,
      );
    }

    /* =======================================================
       25. PAIEMENT EXPIRÉ
    ======================================================= */

    if (
      normalizedStatus ===
      "expired"
    ) {
      const failureReason =
        verifyResult.failureReason ??
        verifyResult.message ??
        "Paiement expiré.";

      const expiredMetadata =
        {
          ...verificationMetadata,

          activation_status:
            "not_activated",
        };

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
              providerTransactionId ??
              null,

            failure_reason:
              failureReason,

            metadata:
              expiredMetadata,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            transaction.id,
          );

      if (
        updateResult.error
      ) {
        console.error(
          "PAYMENT VERIFY EXPIRED UPDATE ERROR:",
          updateResult.error,
        );

        return jsonResponse(
          {
            success: false,

            error:
              "Impossible d'enregistrer l'expiration du paiement.",

            code:
              "PAYMENT_EXPIRED_UPDATE_ERROR",
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

          provider:
            transactionProvider,

          providerTransactionId:
            verifiedProviderTransactionId ??
            transaction.provider_transaction_id ??
            providerTransactionId,

          message:
            failureReason,
        },
        200,
      );
    }

    /* =======================================================
       26. STATUT INCONNU
    ======================================================= */

    const fallbackMetadata =
      {
        ...verificationMetadata,

        activation_status:
          "not_activated",

        verification_status:
          "pending",
      };

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
            providerTransactionId ??
            null,

          metadata:
            fallbackMetadata,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          transaction.id,
        );

    if (
      fallbackResult.error
    ) {
      console.error(
        "PAYMENT VERIFY FALLBACK UPDATE ERROR:",
        fallbackResult.error,
      );

      return jsonResponse(
        {
          success: false,

          error:
            "Impossible d'enregistrer le résultat de vérification.",

          code:
            "PAYMENT_VERIFY_FALLBACK_ERROR",
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

        provider:
          transactionProvider,

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
          "Le statut du paiement reste en attente de confirmation.",
      },
      200,
    );
  } catch (error) {
    console.error(
      "PAYMENT VERIFY UNEXPECTED ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,

        verified: false,

        error:
          "Erreur interne lors de la vérification du paiement.",

        code:
          "PAYMENT_VERIFY_UNEXPECTED_ERROR",
      },
      500,
    );
  }
}

/* =========================================================
   GET — TEST ENDPOINT
========================================================= */

export async function GET() {
  return jsonResponse(
    {
      success: true,

      endpoint:
        "/api/payments/verify",

      service:
        "PharmaFlow Payment Verification",

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