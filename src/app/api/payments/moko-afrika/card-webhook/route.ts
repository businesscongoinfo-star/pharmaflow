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
 * - On lit le corps BRUT avant toute transformation JSON.
 * - La signature doit être vérifiée sur le corps brut.
 * - Le callback Moko est la source de vérité du paiement.
 * - On ne fait jamais confiance au navigateur / return_url pour confirmer
 *   un paiement.
 *
 * URL :
 *
 * /api/payments/moko-afrika/card-webhook
 * ============================================================================
 */

export const runtime = "nodejs";

export async function POST(
  request: Request,
) {
  try {
    /**
     * ------------------------------------------------------------------------
     * 1. Récupérer le corps BRUT
     * ------------------------------------------------------------------------
     *
     * NE PAS utiliser request.json() avant la vérification.
     *
     * La signature HMAC dépend du JSON brut reçu.
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
     * 2. Vérification + parsing Moko
     * ------------------------------------------------------------------------
     */
    const result =
      await parseMokoCardWebhook(
        rawBody,
        request.headers,
      );

    /**
     * ------------------------------------------------------------------------
     * 3. Refuser immédiatement les callbacks invalides
     * ------------------------------------------------------------------------
     */
    if (!result.success &&
        result.failureReason) {
      const securityErrors = new Set([
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
     * 4. Journalisation contrôlée
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
        success: result.success,
        status: result.status,
        merchantReference:
          result.merchantReference,
        providerTransactionId:
          result.providerTransactionId,
        amount: result.amount,
        currency: result.currency,
        paymentMethod:
          result.paymentMethod,
      },
    );

    /**
     * ------------------------------------------------------------------------
     * 5. Paiement confirmé
     * ------------------------------------------------------------------------
     *
     * IMPORTANT :
     *
     * Ici, le callback est authentifié.
     *
     * Le prochain niveau consiste à mettre à jour LA transaction PharmaFlow
     * déjà créée avec merchantReference / providerTransactionId.
     *
     * Nous ne créons volontairement PAS une deuxième table de transactions
     * ici : PharmaFlow doit continuer à utiliser son moteur de paiement
     * existant.
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
          amount: result.amount,
          currency: result.currency,
        },
      );

      /**
       * TODO — raccordement à la transaction PharmaFlow existante.
       *
       * Exemple logique :
       *
       * 1. retrouver la transaction par merchantReference
       * 2. vérifier pharmacy_id / montant / devise
       * 3. vérifier l'idempotence
       * 4. passer le statut à "successful"
       * 5. enregistrer providerTransactionId
       * 6. enregistrer les métadonnées Moko
       * 7. déclencher éventuellement l'activation de l'abonnement
       *
       * Nous ne mettons pas de requête Supabase inventée ici parce que
       * le nom exact et les colonnes de ta table de transactions existante
       * doivent être respectés.
       */
    }

    /**
     * ------------------------------------------------------------------------
     * 6. Paiement échoué
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
            result.failureReason,
        },
      );

      /**
       * Même principe :
       *
       * mettre à jour la transaction PharmaFlow existante en "failed".
       */
    }

    /**
     * ------------------------------------------------------------------------
     * 7. Paiement encore en attente
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
     * 8. Réponse à Moko
     * ------------------------------------------------------------------------
     *
     * Moko doit recevoir une réponse HTTP 200 lorsque le callback a été
     * correctement reçu et vérifié.
     */
    return NextResponse.json(
      {
        received: true,
        success: true,
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
        error: "WEBHOOK_INTERNAL_ERROR",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================================
 * Refuser les autres méthodes
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