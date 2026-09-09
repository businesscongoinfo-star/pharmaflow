import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";

import {
  verifyPayment,
} from "@/app/lib/payments/engine";

type TransactionRow = {
  id: string;
  pharmacy_id: string;
  subscription_id: string | null;
  provider_id: string | null;
  provider: string;
  provider_transaction_id: string | null;
  merchant_reference: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  checkout_url: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  metadata: Record<string, unknown> | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

type PlanRow = {
  id: string;
  plan_code: string;
  plan_name: string;
  duration_days: number;
  is_active: boolean;
};

type PlanPriceRow = {
  plan_id: string;
  currency_code: string;
  price: number;
  is_active: boolean;
};

type RequestBody = {
  transactionId?: string;
  merchantReference?: string;
};

type ProviderCode =
  | "yabetoo"
  | "gofreshpay"
  | "moko_afrika";

function normalizeText(
  value: unknown,
): string {
  return String(
    value ?? "",
  ).trim();
}

function normalizeUpper(
  value: unknown,
): string {
  return normalizeText(
    value,
  ).toUpperCase();
}

function normalizeLower(
  value: unknown,
): string {
  return normalizeText(
    value,
  ).toLowerCase();
}

function isSuccessfulStatus(
  status: unknown,
): boolean {
  return [
    "successful",
    "succeeded",
    "success",
    "paid",
    "completed",
    "complete",
    "approved",
    "successfully_paid",
  ].includes(
    normalizeLower(
      status,
    ),
  );
}

function isPendingStatus(
  status: unknown,
): boolean {
  return [
    "created",
    "pending",
    "processing",
    "submitted",
    "in_progress",
    "in_progress_payment",
    "requires_payment_method",
    "requires_confirmation",
  ].includes(
    normalizeLower(
      status,
    ),
  );
}

function isFailedStatus(
  status: unknown,
): boolean {
  return [
    "failed",
    "failure",
    "declined",
    "rejected",
    "error",
  ].includes(
    normalizeLower(
      status,
    ),
  );
}

function isCancelledStatus(
  status: unknown,
): boolean {
  return [
    "cancelled",
    "canceled",
    "cancel",
  ].includes(
    normalizeLower(
      status,
    ),
  );
}

function isExpiredStatus(
  status: unknown,
): boolean {
  return [
    "expired",
    "timeout",
    "timed_out",
  ].includes(
    normalizeLower(
      status,
    ),
  );
}

function isSupportedProvider(
  value: string,
): value is ProviderCode {
  return [
    "yabetoo",
    "gofreshpay",
    "moko_afrika",
  ].includes(
    value,
  );
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    /*
     * ==========================================================
     * 1. CLIENT SUPABASE
     * ==========================================================
     */

    const supabase =
      await createClient();

    /*
     * ==========================================================
     * 2. AUTHENTIFICATION
     * ==========================================================
     */

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !authData.user
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Utilisateur non authentifié.",
          code:
            "UNAUTHENTICATED",
        },
        401,
      );
    }

    const user =
      authData.user;

    /*
     * ==========================================================
     * 3. LECTURE DU BODY
     * ==========================================================
     */

    let body: RequestBody = {};

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Requête invalide.",
          code:
            "INVALID_JSON",
        },
        400,
      );
    }

    const transactionId =
      normalizeText(
        body.transactionId,
      );

    const merchantReference =
      normalizeText(
        body.merchantReference,
      );

    if (
      !transactionId &&
      !merchantReference
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "transactionId ou merchantReference est requis.",
          code:
            "TRANSACTION_REFERENCE_REQUIRED",
        },
        400,
      );
    }

    /*
     * ==========================================================
     * 4. PROFIL DE L'UTILISATEUR
     * ==========================================================
     *
     * pharmacy_id est récupéré depuis Supabase.
     *
     * Le navigateur ne peut pas choisir la pharmacie à vérifier.
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "id, pharmacy_id",
        )
        .eq(
          "id",
          user.id,
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "PharmaFlow verify profile error:",
        profileError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible de récupérer votre profil.",
          code:
            "PROFILE_QUERY_FAILED",
        },
        500,
      );
    }

    if (
      !profile ||
      !profile.pharmacy_id
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Votre profil PharmaFlow n'est pas correctement configuré.",
          code:
            "PROFILE_NOT_CONFIGURED",
        },
        403,
      );
    }

    const pharmacyId =
      profile.pharmacy_id;

    /*
     * ==========================================================
     * 5. RECHERCHE DE LA TRANSACTION
     * ==========================================================
     *
     * IMPORTANT :
     *
     * La transaction est toujours filtrée par pharmacy_id.
     *
     * Cela garantit l'isolation entre les pharmacies.
     */

    let transactionQuery =
      supabase
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
            checkout_url,
            customer_name,
            customer_email,
            customer_phone,
            metadata,
            failure_reason,
            created_at,
            updated_at,
            paid_at
          `,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        );

    if (
      transactionId
    ) {
      transactionQuery =
        transactionQuery.eq(
          "id",
          transactionId,
        );
    } else {
      transactionQuery =
        transactionQuery.eq(
          "merchant_reference",
          merchantReference,
        );
    }

    const {
      data: transaction,
      error:
        transactionError,
    } =
      await transactionQuery
        .maybeSingle<TransactionRow>();

    if (
      transactionError
    ) {
      console.error(
        "PharmaFlow verify transaction query error:",
        transactionError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible de récupérer la transaction.",
          code:
            "TRANSACTION_QUERY_FAILED",
        },
        500,
      );
    }

    if (
      !transaction
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Transaction de paiement introuvable.",
          code:
            "TRANSACTION_NOT_FOUND",
        },
        404,
      );
    }

    /*
     * ==========================================================
     * 6. VÉRIFICATION TENANT
     * ==========================================================
     */

    if (
      transaction.pharmacy_id !==
      pharmacyId
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Cette transaction n'appartient pas à votre pharmacie.",
          code:
            "TRANSACTION_ACCESS_DENIED",
        },
        403,
      );
    }

    /*
     * ==========================================================
     * 7. INFORMATIONS DE BASE
     * ==========================================================
     */

    const provider =
      normalizeLower(
        transaction.provider,
      );

    if (
      !isSupportedProvider(
        provider,
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le fournisseur de paiement associé à cette transaction n'est pas pris en charge.",
          code:
            "UNSUPPORTED_PAYMENT_PROVIDER",
        },
        400,
      );
    }

    const amount =
      Number(
        transaction.amount,
      );

    const currency =
      normalizeUpper(
        transaction.currency,
      );

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le montant de la transaction est invalide.",
          code:
            "INVALID_TRANSACTION_AMOUNT",
        },
        500,
      );
    }

    if (!currency) {
      return jsonResponse(
        {
          success: false,
          error:
            "La devise de la transaction est invalide.",
          code:
            "INVALID_TRANSACTION_CURRENCY",
        },
        500,
      );
    }

    /*
     * ==========================================================
     * 8. MÉTADONNÉES DU PAIEMENT
     * ==========================================================
     */

    const metadata =
      transaction.metadata &&
      typeof transaction.metadata ===
        "object"
        ? transaction.metadata
        : {};

    const planId =
      normalizeText(
        metadata.plan_id,
      );

    const billingCycle =
      normalizeLower(
        metadata.billing_cycle,
      );

    if (
      !planId
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le plan d'abonnement associé à cette transaction est introuvable.",
          code:
            "SUBSCRIPTION_PLAN_ID_MISSING",
        },
        500,
      );
    }

    if (
      billingCycle !==
        "monthly" &&
      billingCycle !==
        "yearly"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "La période d'abonnement associée à cette transaction est invalide.",
          code:
            "INVALID_BILLING_CYCLE",
        },
        500,
      );
    }

    /*
     * ==========================================================
     * 9. PLAN ACTUEL
     * ==========================================================
     */

    const {
      data: plan,
      error: planError,
    } =
      await supabase
        .from(
          "subscription_plans",
        )
        .select(
          `
            id,
            plan_code,
            plan_name,
            duration_days,
            is_active
          `,
        )
        .eq(
          "id",
          planId,
        )
        .eq(
          "is_active",
          true,
        )
        .maybeSingle<PlanRow>();

    if (
      planError
    ) {
      console.error(
        "PharmaFlow verify plan query error:",
        planError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible de vérifier le plan d'abonnement.",
          code:
            "PLAN_QUERY_FAILED",
        },
        500,
      );
    }

    if (
      !plan
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le plan associé à ce paiement n'est plus disponible.",
          code:
            "PLAN_NOT_FOUND",
        },
        400,
      );
    }

    /*
     * ==========================================================
     * 10. CONTRÔLE DU CODE DU PLAN
     * ==========================================================
     */

    if (
      normalizeLower(
        plan.plan_code,
      ) !==
      billingCycle
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le plan associé au paiement ne correspond pas à la période payée.",
          code:
            "PLAN_MISMATCH",
        },
        400,
      );
    }

    /*
     * ==========================================================
     * 11. PRIX OFFICIEL
     * ==========================================================
     *
     * Le prix est relu depuis subscription_plan_prices.
     *
     * Le client ne peut donc pas modifier le montant à payer.
     */

    const {
      data: planPrice,
      error:
        planPriceError,
    } =
      await supabase
        .from(
          "subscription_plan_prices",
        )
        .select(
          `
            plan_id,
            currency_code,
            price,
            is_active
          `,
        )
        .eq(
          "plan_id",
          plan.id,
        )
        .eq(
          "currency_code",
          currency,
        )
        .eq(
          "is_active",
          true,
        )
        .maybeSingle<PlanPriceRow>();

    if (
      planPriceError
    ) {
      console.error(
        "PharmaFlow verify plan price query error:",
        planPriceError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Impossible de vérifier le tarif de l'abonnement.",
          code:
            "PLAN_PRICE_QUERY_FAILED",
        },
        500,
      );
    }

    if (
      !planPrice
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Aucun tarif actif n'est configuré pour cette devise.",
          code:
            "PLAN_PRICE_NOT_FOUND",
        },
        500,
      );
    }

    const expectedAmount =
      Number(
        planPrice.price,
      );

    if (
      !Number.isFinite(
        expectedAmount,
      ) ||
      expectedAmount <= 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Le tarif de l'abonnement est invalide.",
          code:
            "INVALID_PLAN_PRICE",
        },
        500,
      );
    }

    /*
     * ==========================================================
     * 12. CONTRÔLE DU MONTANT LOCAL
     * ==========================================================
     */

    if (
      Math.abs(
        amount -
          expectedAmount,
      ) >= 0.01
    ) {
      console.error(
        "PharmaFlow local amount mismatch:",
        {
          transactionId:
            transaction.id,
          amount,
          expectedAmount,
          currency,
        },
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Le montant enregistré pour cette transaction ne correspond pas au tarif officiel.",
          code:
            "AMOUNT_MISMATCH",
        },
        400,
      );
    }

    /*
     * ==========================================================
     * 13. TRANSACTION DÉJÀ ACTIVÉE
     * ==========================================================
     *
     * Cette vérification rend l'opération idempotente.
     */

    const activationStatus =
      normalizeLower(
        metadata.activation_status,
      );

    if (
      isSuccessfulStatus(
        transaction.status,
      ) &&
      activationStatus ===
        "activated"
    ) {
      return jsonResponse(
        {
          success: true,
          verified: true,
          activated: true,
          alreadyProcessed: true,

          message:
            "Le paiement et l'abonnement sont déjà confirmés.",

          transaction: {
            id:
              transaction.id,

            merchantReference:
              transaction.merchant_reference,

            provider:
              transaction.provider,

            providerTransactionId:
              transaction.provider_transaction_id,

            amount,

            currency,

            paymentMethod:
              transaction.payment_method,

            status:
              "successful",

            paidAt:
              transaction.paid_at,
          },

          subscription: {
            id:
              metadata.activated_subscription_id ??
              transaction.subscription_id ??
              null,

            planId:
              metadata.activated_plan_id ??
              plan.id,

            planCode:
              metadata.activated_plan_code ??
              plan.plan_code,

            billingCycle:
              metadata.activated_billing_cycle ??
              billingCycle,

            status:
              "active",

            startsAt:
              metadata.activated_starts_at ??
              null,

            expiresAt:
              metadata.activated_expires_at ??
              null,
          },
        },
        200,
      );
    }

    /*
     * ==========================================================
     * 14. VÉRIFICATION FOURNISSEUR
     * ==========================================================
     *
     * Nous ne faisons confiance ni au navigateur ni au statut
     * local "successful".
     *
     * Le fournisseur doit confirmer le paiement.
     */

    let verificationResult;

    try {
      verificationResult =
        await verifyPayment(
          provider,
          {
            pharmacyId,

            merchantReference:
              transaction.merchant_reference,

            providerTransactionId:
              transaction.provider_transaction_id ??
              undefined,

            expectedAmount:
              expectedAmount,

            expectedCurrency:
              currency,

            metadata: {
              ...metadata,

              transaction_id:
                transaction.id,

              pharmacy_id:
                pharmacyId,
            },
          },
        );
    } catch (verificationError) {
      console.error(
        "PharmaFlow provider verification error:",
        verificationError,
      );

      return jsonResponse(
        {
          success: false,

          verified: false,

          activated: false,

          error:
            "Le fournisseur de paiement n'a pas pu confirmer cette transaction pour le moment.",

          code:
            "PROVIDER_VERIFICATION_FAILED",

          transaction: {
            id:
              transaction.id,

            merchantReference:
              transaction.merchant_reference,

            provider:
              transaction.provider,

            status:
              transaction.status,
          },
        },
        502,
      );
    }

    /*
     * ==========================================================
     * 15. RÉSULTAT DE LA VÉRIFICATION
     * ==========================================================
     */

    const verifiedStatus =
      normalizeLower(
        verificationResult.status,
      );

    const verifiedProviderTransactionId =
      verificationResult.providerTransactionId ??
      transaction.provider_transaction_id ??
      null;

    const verifiedAmount =
      verificationResult.amount !==
        undefined &&
      verificationResult.amount !==
        null
        ? Number(
            verificationResult.amount,
          )
        : amount;

    const verifiedCurrency =
      normalizeUpper(
        verificationResult.currency ??
          currency,
      );

    /*
     * ==========================================================
     * 16. CONTRÔLE DU MONTANT FOURNISSEUR
     * ==========================================================
     */

    if (
      !Number.isFinite(
        verifiedAmount,
      ) ||
      Math.abs(
        verifiedAmount -
          expectedAmount,
      ) >= 0.01
    ) {
      console.error(
        "PharmaFlow provider amount mismatch:",
        {
          transactionId:
            transaction.id,

          expectedAmount,

          verifiedAmount,

          currency,
        },
      );

      await supabase
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",

          failure_reason:
            "Le montant confirmé par le fournisseur ne correspond pas au tarif officiel.",

          metadata: {
            ...metadata,

            verification:
              "amount_mismatch",

            verified_amount:
              verifiedAmount,

            expected_amount:
              expectedAmount,

            verified_at:
              new Date().toISOString(),
          },
        })
        .eq(
          "id",
          transaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        );

      return jsonResponse(
        {
          success: false,

          verified: false,

          activated: false,

          error:
            "Le montant confirmé par le fournisseur ne correspond pas au montant attendu.",

          code:
            "VERIFIED_AMOUNT_MISMATCH",
        },
        400,
      );
    }

    /*
     * ==========================================================
     * 17. CONTRÔLE DE LA DEVISE FOURNISSEUR
     * ==========================================================
     */

    if (
      verifiedCurrency !==
      currency
    ) {
      console.error(
        "PharmaFlow provider currency mismatch:",
        {
          transactionId:
            transaction.id,

          expectedCurrency:
            currency,

          verifiedCurrency,
        },
      );

      await supabase
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",

          failure_reason:
            "La devise confirmée par le fournisseur ne correspond pas à la devise attendue.",

          metadata: {
            ...metadata,

            verification:
              "currency_mismatch",

            verified_currency:
              verifiedCurrency,

            expected_currency:
              currency,

            verified_at:
              new Date().toISOString(),
          },
        })
        .eq(
          "id",
          transaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        );

      return jsonResponse(
        {
          success: false,

          verified: false,

          activated: false,

          error:
            "La devise confirmée par le fournisseur ne correspond pas à la devise attendue.",

          code:
            "VERIFIED_CURRENCY_MISMATCH",
        },
        400,
      );
    }
    /*
     * ==========================================================
     * 18. PAIEMENT CONFIRMÉ
     * ==========================================================
     */

    if (
      isSuccessfulStatus(
        verifiedStatus,
      )
    ) {
      const paidAt =
        new Date().toISOString();

      const updatedMetadata = {
        ...metadata,

        verification:
          "successful",

        verified_at:
          paidAt,

        verified_status:
          verifiedStatus,

        verified_amount:
          verifiedAmount,

        verified_currency:
          verifiedCurrency,
      };

      /*
       * --------------------------------------------------------
       * Enregistrer le paiement comme successful
       * --------------------------------------------------------
       */

      const {
        data: updatedTransaction,
        error:
          transactionUpdateError,
      } =
        await supabase
          .from(
            "payment_transactions",
          )
          .update({
            status:
              "successful",

            provider_transaction_id:
              verifiedProviderTransactionId,

            failure_reason:
              null,

            metadata:
              updatedMetadata,

            paid_at:
              paidAt,
          })
          .eq(
            "id",
            transaction.id,
          )
          .eq(
            "pharmacy_id",
            pharmacyId,
          )
          .select(
            `
              id,
              merchant_reference,
              provider,
              provider_transaction_id,
              amount,
              currency,
              payment_method,
              status,
              paid_at
            `,
          )
          .single();

      if (
        transactionUpdateError ||
        !updatedTransaction
      ) {
        console.error(
          "PharmaFlow successful payment update error:",
          transactionUpdateError,
        );

        return jsonResponse(
          {
            success: false,

            verified: true,

            activated: false,

            error:
              "Le paiement a été confirmé par le fournisseur, mais son enregistrement n'a pas pu être finalisé.",

            code:
              "PAYMENT_UPDATE_FAILED",

            transactionId:
              transaction.id,
          },
          500,
        );
      }

      /*
       * ========================================================
       * 19. ACTIVATION DE L'ABONNEMENT
       * ========================================================
       *
       * L'activation est effectuée côté serveur avec
       * supabaseAdmin.
       *
       * Le navigateur ne peut jamais appeler directement
       * la fonction SQL privilégiée.
       */

      const {
        data: activationResult,
        error:
          activationError,
      } =
        await supabaseAdmin.rpc(
          "pf_activate_subscription_from_payment",
          {
            p_payment_id:
              transaction.id,
          },
        );

      if (
        activationError
      ) {
        console.error(
          "PharmaFlow subscription activation error:",
          activationError,
        );

        return jsonResponse(
          {
            success: false,

            verified: true,

            activated: false,

            activationPending:
              true,

            error:
              "Le paiement est confirmé, mais l'activation de votre abonnement est encore en attente.",

            code:
              "SUBSCRIPTION_ACTIVATION_FAILED",

            transaction: {
              id:
                updatedTransaction.id,

              merchantReference:
                updatedTransaction.merchant_reference,

              provider:
                updatedTransaction.provider,

              providerTransactionId:
                updatedTransaction.provider_transaction_id,

              amount:
                Number(
                  updatedTransaction.amount,
                ),

              currency:
                updatedTransaction.currency,

              paymentMethod:
                updatedTransaction.payment_method,

              status:
                "successful",

              paidAt:
                updatedTransaction.paid_at,
            },
          },
          500,
        );
      }

      /*
       * ========================================================
       * 20. TRAITER LE RÉSULTAT SQL
       * ========================================================
       */

      const activation =
        activationResult &&
        typeof activationResult ===
          "object"
          ? activationResult as Record<
              string,
              unknown
            >
          : null;

      const activationSubscriptionId =
        activation?.subscription_id ??
        transaction.subscription_id ??
        null;

      const activationPlanId =
        activation?.plan_id ??
        plan.id;

      const activationPlanCode =
        activation?.plan_code ??
        plan.plan_code;

      const activationBillingCycle =
        activation?.billing_cycle ??
        billingCycle;

      const activationStartsAt =
        activation?.starts_at ??
        null;

      const activationExpiresAt =
        activation?.expires_at ??
        null;

      const alreadyActivated =
        Boolean(
          activation?.already_activated,
        );

      /*
       * --------------------------------------------------------
       * Mettre également à jour les métadonnées locales.
       *
       * Cela permet à une prochaine vérification de savoir
       * que l'activation a déjà été effectuée.
       * --------------------------------------------------------
       */

      const finalMetadata = {
        ...updatedMetadata,

        activation_status:
          "activated",

        activated_at:
          new Date().toISOString(),

        activated_subscription_id:
          activationSubscriptionId,

        activated_plan_id:
          activationPlanId,

        activated_plan_code:
          activationPlanCode,

        activated_billing_cycle:
          activationBillingCycle,

        activated_starts_at:
          activationStartsAt,

        activated_expires_at:
          activationExpiresAt,
      };

      const {
        error:
          metadataUpdateError,
      } =
        await supabase
          .from(
            "payment_transactions",
          )
          .update({
            metadata:
              finalMetadata,
          })
          .eq(
            "id",
            transaction.id,
          )
          .eq(
            "pharmacy_id",
            pharmacyId,
          );

      if (
        metadataUpdateError
      ) {
        /*
         * L'abonnement a déjà été activé.
         *
         * Une erreur de mise à jour des métadonnées ne doit
         * surtout pas faire croire que le paiement a échoué.
         */

        console.error(
          "PharmaFlow activation metadata update warning:",
          metadataUpdateError,
        );
      }

      /*
       * ========================================================
       * 21. RÉPONSE SUCCÈS
       * ========================================================
       */

      return jsonResponse(
        {
          success: true,

          verified: true,

          activated: true,

          alreadyProcessed:
            alreadyActivated,

          message:
            alreadyActivated
              ? "Le paiement était déjà confirmé et l'abonnement est actif."
              : "Paiement confirmé et abonnement activé avec succès.",

          transaction: {
            id:
              updatedTransaction.id,

            merchantReference:
              updatedTransaction.merchant_reference,

            provider:
              updatedTransaction.provider,

            providerTransactionId:
              updatedTransaction.provider_transaction_id,

            amount:
              Number(
                updatedTransaction.amount,
              ),

            currency:
              updatedTransaction.currency,

            paymentMethod:
              updatedTransaction.payment_method,

            status:
              "successful",

            paidAt:
              updatedTransaction.paid_at,
          },

          subscription: {
            id:
              activationSubscriptionId,

            planId:
              activationPlanId,

            planCode:
              activationPlanCode,

            billingCycle:
              activationBillingCycle,

            amount:
              expectedAmount,

            currency,

            status:
              "active",

            startsAt:
              activationStartsAt,

            expiresAt:
              activationExpiresAt,
          },
        },
        200,
      );
    }

    /*
     * ==========================================================
     * 22. PAIEMENT EN ATTENTE
     * ==========================================================
     */

    if (
      isPendingStatus(
        verifiedStatus,
      )
    ) {
      const pendingMetadata = {
        ...metadata,

        verification:
          "pending",

        verified_at:
          new Date().toISOString(),

        verified_status:
          verifiedStatus,

        provider_transaction_id:
          verifiedProviderTransactionId,
      };

      const {
        data: pendingTransaction,
        error:
          pendingUpdateError,
      } =
        await supabase
          .from(
            "payment_transactions",
          )
          .update({
            status:
              "pending",

            provider_transaction_id:
              verifiedProviderTransactionId,

            metadata:
              pendingMetadata,
          })
          .eq(
            "id",
            transaction.id,
          )
          .eq(
            "pharmacy_id",
            pharmacyId,
          )
          .select(
            `
              id,
              merchant_reference,
              provider,
              provider_transaction_id,
              amount,
              currency,
              payment_method,
              status
            `,
          )
          .single();

      if (
        pendingUpdateError
      ) {
        console.error(
          "PharmaFlow pending transaction update error:",
          pendingUpdateError,
        );
      }

      return jsonResponse(
        {
          success: true,

          verified: false,

          activated: false,

          activationPending:
            false,

          message:
            "Le paiement est toujours en attente de confirmation.",

          transaction: {
            id:
              pendingTransaction?.id ??
              transaction.id,

            merchantReference:
              pendingTransaction?.merchant_reference ??
              transaction.merchant_reference,

            provider:
              pendingTransaction?.provider ??
              transaction.provider,

            providerTransactionId:
              pendingTransaction?.provider_transaction_id ??
              verifiedProviderTransactionId,

            amount:
              Number(
                pendingTransaction?.amount ??
                  transaction.amount,
              ),

            currency:
              pendingTransaction?.currency ??
              transaction.currency,

            paymentMethod:
              pendingTransaction?.payment_method ??
              transaction.payment_method,

            status:
              "pending",
          },
        },
        200,
      );
    }

    /*
     * ==========================================================
     * 23. PAIEMENT ÉCHOUÉ
     * ==========================================================
     */

    if (
      isFailedStatus(
        verifiedStatus,
      )
    ) {
      const failureReason =
        normalizeText(
          verificationResult.failureReason,
        ) ||
        "Le paiement n'a pas été confirmé par le fournisseur.";

      const failedMetadata = {
        ...metadata,

        verification:
          "failed",

        verified_at:
          new Date().toISOString(),

        verified_status:
          verifiedStatus,

        provider_transaction_id:
          verifiedProviderTransactionId,
      };

      await supabase
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "failed",

          provider_transaction_id:
            verifiedProviderTransactionId,

          failure_reason:
            failureReason,

          metadata:
            failedMetadata,
        })
        .eq(
          "id",
          transaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        );

      return jsonResponse(
        {
          success: false,

          verified: false,

          activated: false,

          message:
            "Le paiement a échoué.",

          error:
            failureReason,

          code:
            "PAYMENT_FAILED",

          transaction: {
            id:
              transaction.id,

            merchantReference:
              transaction.merchant_reference,

            provider:
              transaction.provider,

            providerTransactionId:
              verifiedProviderTransactionId,

            amount,

            currency,

            paymentMethod:
              transaction.payment_method,

            status:
              "failed",
          },
        },
        200,
      );
    }

    /*
     * ==========================================================
     * 24. PAIEMENT ANNULÉ
     * ==========================================================
     */

    if (
      isCancelledStatus(
        verifiedStatus,
      )
    ) {
      const cancelledMetadata = {
        ...metadata,

        verification:
          "cancelled",

        verified_at:
          new Date().toISOString(),

        verified_status:
          verifiedStatus,

        provider_transaction_id:
          verifiedProviderTransactionId,
      };

      await supabase
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "cancelled",

          provider_transaction_id:
            verifiedProviderTransactionId,

          failure_reason:
            "Le paiement a été annulé.",

          metadata:
            cancelledMetadata,
        })
        .eq(
          "id",
          transaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        );

      return jsonResponse(
        {
          success: false,

          verified: false,

          activated: false,

          message:
            "Le paiement a été annulé.",

          code:
            "PAYMENT_CANCELLED",

          transaction: {
            id:
              transaction.id,

            merchantReference:
              transaction.merchant_reference,

            provider:
              transaction.provider,

            providerTransactionId:
              verifiedProviderTransactionId,

            amount,

            currency,

            paymentMethod:
              transaction.payment_method,

            status:
              "cancelled",
          },
        },
        200,
      );
    }

    /*
     * ==========================================================
     * 25. PAIEMENT EXPIRÉ
     * ==========================================================
     */

    if (
      isExpiredStatus(
        verifiedStatus,
      )
    ) {
      const expiredMetadata = {
        ...metadata,

        verification:
          "expired",

        verified_at:
          new Date().toISOString(),

        verified_status:
          verifiedStatus,

        provider_transaction_id:
          verifiedProviderTransactionId,
      };

      await supabase
        .from(
          "payment_transactions",
        )
        .update({
          status:
            "expired",

          provider_transaction_id:
            verifiedProviderTransactionId,

          failure_reason:
            "Le paiement a expiré.",

          metadata:
            expiredMetadata,
        })
        .eq(
          "id",
          transaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        );

      return jsonResponse(
        {
          success: false,

          verified: false,

          activated: false,

          message:
            "Le paiement a expiré.",

          code:
            "PAYMENT_EXPIRED",

          transaction: {
            id:
              transaction.id,

            merchantReference:
              transaction.merchant_reference,

            provider:
              transaction.provider,

            providerTransactionId:
              verifiedProviderTransactionId,

            amount,

            currency,

            paymentMethod:
              transaction.payment_method,

            status:
              "expired",
          },
        },
        200,
      );
    }

    /*
     * ==========================================================
     * 26. STATUT INCONNU
     * ==========================================================
     *
     * Par sécurité, un statut inconnu n'est jamais considéré
     * comme successful.
     *
     * La transaction reste pending.
     */

    console.warn(
      "PharmaFlow unknown provider payment status:",
      {
        transactionId:
          transaction.id,

        provider,

        status:
          verifiedStatus,
      },
    );

    const unknownStatusMetadata = {
      ...metadata,

      verification:
        "unknown",

      verified_at:
        new Date().toISOString(),

      verified_status:
        verifiedStatus,

      provider_transaction_id:
        verifiedProviderTransactionId,
    };

    await supabase
      .from(
        "payment_transactions",
      )
      .update({
        status:
          "pending",

        provider_transaction_id:
          verifiedProviderTransactionId,

        metadata:
          unknownStatusMetadata,
      })
      .eq(
        "id",
        transaction.id,
      )
      .eq(
        "pharmacy_id",
        pharmacyId,
      );

    return jsonResponse(
      {
        success: true,

        verified: false,

        activated: false,

        activationPending:
          false,

        message:
          "Le fournisseur n'a pas encore retourné un statut définitif. La transaction reste en attente.",

        transaction: {
          id:
            transaction.id,

          merchantReference:
            transaction.merchant_reference,

          provider:
            transaction.provider,

          providerTransactionId:
            verifiedProviderTransactionId,

          amount,

          currency,

          paymentMethod:
            transaction.payment_method,

          status:
            "pending",
        },
      },
      200,
    );
  } catch (error) {
    /*
     * ==========================================================
     * 27. ERREUR INTERNE
     * ==========================================================
     */

    console.error(
      "PharmaFlow /api/payments/verify error:",
      error,
    );

    return jsonResponse(
      {
        success: false,

        error:
          "Une erreur interne est survenue pendant la vérification du paiement.",

        code:
          "INTERNAL_PAYMENT_VERIFY_ERROR",
      },
      500,
    );
  }
}