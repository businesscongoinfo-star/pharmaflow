import { NextResponse } from "next/server";

import {
  parseMokoCardWebhook,
} from "@/app/lib/payments/moko-afrika";

/**
 * ============================================================================
 * MOKO AFRIKA — CARD WEBHOOK
 * ============================================================================
 *
 * Cette route reçoit la notification serveur-à-serveur de Moko Checkout.
 *
 * IMPORTANT :
 * - Le corps brut est lu avant toute transformation JSON.
 * - Le parser Moko vérifie et interprète le callback.
 * - Le callback serveur reste la source de vérité.
 * - On ne fait jamais confiance au navigateur / return_url pour confirmer
 *   un paiement.
 *
 * URL :
 *
 * /api/payments/moko-afrika/card-webhook
 * ============================================================================
 */

export const runtime = "nodejs";

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request,
) {
  try {
    /**
     * ------------------------------------------------------------------------
     * 1. RÉCUPÉRER LE CORPS BRUT
     * ------------------------------------------------------------------------
     *
     * Le raw body est conservé afin que le parser Moko puisse effectuer
     * son traitement correctement.
     */
    const rawBody =
      await request.text();

    if (!rawBody.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "EMPTY_BODY",
          message:
            "Le callback Moko Afrika est vide.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ------------------------------------------------------------------------
     * 2. PARSING MOKO
     * ------------------------------------------------------------------------
     *
     * IMPORTANT :
     *
     * La version actuelle de parseMokoCardWebhook()
     * accepte UN seul argument : le raw body.
     *
     * Ne pas lui transmettre request.headers ici.
     */
    const result =
      await parseMokoCardWebhook(
        rawBody,
      );

    /**
     * ------------------------------------------------------------------------
     * 3. REFUSER LES CALLBACKS INVALIDES
     * ------------------------------------------------------------------------
     */

    if (
      !result.success &&
      result.failureReason
    ) {
      const securityErrors =
        new Set([
          "SIGNATURE_MISSING",
          "INVALID_SIGNATURE_FORMAT",
          "SIGNATURE_TIMESTAMP_EXPIRED",
          "INVALID_SIGNATURE",
          "CALLBACK_SECRET_MISSING",
          "INVALID_JSON",
        ]);

      if (
        securityErrors.has(
          result.failureReason,
        )
      ) {
        console.error(
          "[MOKO CARD WEBHOOK] Callback rejeté:",
          result.failureReason,
        );

        return NextResponse.json(
          {
            success: false,
            error:
              result.failureReason,
          },
          {
            status:
              result.failureReason ===
              "CALLBACK_SECRET_MISSING"
                ? 500
                : 401,
          },
        );
      }
    }

    /**
     * ------------------------------------------------------------------------
     * 4. ERREUR DE CHIFFREMENT
     * ------------------------------------------------------------------------
     */

    if (
      result.failureReason ===
      "INVALID_ENCRYPTION"
    ) {
      console.error(
        "[MOKO CARD WEBHOOK] Chiffrement invalide.",
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "INVALID_ENCRYPTION",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ------------------------------------------------------------------------
     * 5. JOURNALISATION CONTRÔLÉE
     * ------------------------------------------------------------------------
     *
     * NE JAMAIS logger :
     * - API secret
     * - callback secret
     * - numéro complet de carte
     * - CVV
     * - données sensibles inutiles
     */

    console.info(
      "[MOKO CARD WEBHOOK] Notification reçue",
      {
        success:
          result.success,

        status:
          result.status,

        merchantReference:
          result.merchantReference,

        providerTransactionId:
          result.providerTransactionId,

        amount:
          result.amount,

        currency:
          result.currency,

        paymentMethod:
          result.paymentMethod,
      },
    );

    /**
     * ------------------------------------------------------------------------
     * 6. CALLBACK NON SUCCESSFUL
     * ------------------------------------------------------------------------
     *
     * Si le parser indique un échec mais qu'il ne s'agit pas d'une erreur
     * de sécurité, on retourne quand même une réponse contrôlée.
     */

    if (
      !result.success &&
      result.status !==
        "successful"
    ) {
      console.warn(
        "[MOKO CARD WEBHOOK] Callback non confirmé",
        {
          status:
            result.status,

          merchantReference:
            result.merchantReference,

          providerTransactionId:
            result.providerTransactionId,

          reason:
            result.failureReason ??
            result.message ??
            null,
        },
      );
    }

    /**
     * ------------------------------------------------------------------------
     * 7. PAIEMENT CONFIRMÉ
     * ------------------------------------------------------------------------
     *
     * Le webhook principal :
     *
     * /api/payments/webhook
     *
     * reste responsable du raccordement à la transaction PharmaFlow,
     * de la vérification provider et de l'activation de l'abonnement.
     *
     * Cette route dédiée Moko ne crée donc PAS une deuxième transaction.
     */

    if (
      result.status ===
      "successful"
    ) {
      console.info(
        "[MOKO CARD WEBHOOK] Paiement confirmé",
        {
          merchantReference:
            result.merchantReference,

          providerTransactionId:
            result.providerTransactionId,

          amount:
            result.amount,

          currency:
            result.currency,
        },
      );
    }

    /**
     * ------------------------------------------------------------------------
     * 8. PAIEMENT ÉCHOUÉ
     * ------------------------------------------------------------------------
     */

    if (
      result.status ===
      "failed"
    ) {
      console.warn(
        "[MOKO CARD WEBHOOK] Paiement échoué",
        {
          merchantReference:
            result.merchantReference,

          providerTransactionId:
            result.providerTransactionId,

          reason:
            result.failureReason ??
            result.message ??
            null,
        },
      );
    }

    /**
     * ------------------------------------------------------------------------
     * 9. PAIEMENT EN ATTENTE
     * ------------------------------------------------------------------------
     */

    if (
      result.status ===
      "pending"
    ) {
      console.info(
        "[MOKO CARD WEBHOOK] Paiement encore en attente",
        {
          merchantReference:
            result.merchantReference,

          providerTransactionId:
            result.providerTransactionId,
        },
      );
    }

    /**
     * ------------------------------------------------------------------------
     * 10. RÉPONSE À MOKO
     * ------------------------------------------------------------------------
     *
     * Lorsque le callback a été correctement reçu et traité,
     * on répond HTTP 200.
     */

    return NextResponse.json(
      {
        received: true,
        success: true,

        status:
          result.status,

        merchantReference:
          result.merchantReference ??
          null,

        providerTransactionId:
          result.providerTransactionId ??
          null,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "[MOKO CARD WEBHOOK] Erreur interne:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "WEBHOOK_INTERNAL_ERROR",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================================
 * GET
 * ============================================================================
 *
 * Cette URL est exclusivement destinée aux callbacks POST.
 * ============================================================================
 */

export async function GET() {
  return NextResponse.json(
    {
      success: false,

      message:
        "Cette URL est un webhook POST Moko Afrika.",
    },
    {
      status: 405,
    },
  );
}