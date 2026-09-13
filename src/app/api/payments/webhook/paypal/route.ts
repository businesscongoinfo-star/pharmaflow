import { NextRequest, NextResponse } from "next/server";

import { paypalAdapter } from "@/app/lib/payments/paypal";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
) {
  try {
    /*
     * IMPORTANT :
     * On lit le body brut.
     *
     * PayPal signe le contenu original du webhook.
     * Il ne faut donc pas parser puis re-stringifier
     * le body avant la vérification.
     */
    const rawBody =
      await request.text();

    if (!rawBody) {
      return NextResponse.json(
        {
          success: false,
          error: "Webhook PayPal vide.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Conversion des headers NextRequest
     * vers l'objet Headers attendu par
     * l'adaptateur PayPal.
     */
    const headers =
      request.headers;

    /*
     * ============================================================
     * 1. VÉRIFICATION DE LA SIGNATURE PAYPAL
     * ============================================================
     */
    const signatureValid =
      paypalAdapter.verifyWebhookSignature
        ? await paypalAdapter.verifyWebhookSignature(
            rawBody,
            headers,
          )
        : false;

    if (!signatureValid) {
      console.error(
        "PAYPAL WEBHOOK: signature invalide.",
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Signature PayPal invalide.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * ============================================================
     * 2. PARSING DU WEBHOOK
     * ============================================================
     */
    let payload: unknown;

    try {
      payload =
        JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payload PayPal invalide.",
        },
        {
          status: 400,
        },
      );
    }

    const webhook =
      paypalAdapter.parseWebhook
        ? paypalAdapter.parseWebhook(
            payload,
            headers,
          )
        : null;

    if (!webhook) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible d'analyser le webhook PayPal.",
        },
        {
          status: 400,
        },
      );
    }

    const record =
      payload &&
      typeof payload === "object"
        ? (payload as Record<
            string,
            unknown
          >)
        : {};

    const eventId =
      typeof record.id ===
      "string"
        ? record.id
        : null;

    const eventType =
      typeof record.event_type ===
      "string"
        ? record.event_type
        : "";

    /*
     * ============================================================
     * 3. LOG SÉCURISÉ
     * ============================================================
     *
     * Nous ne journalisons pas les secrets.
     */
    console.log(
      "PAYPAL WEBHOOK:",
      {
        eventId,
        eventType,
        status:
          webhook.status,
        merchantReference:
          webhook.merchantReference,
        providerTransactionId:
          webhook.providerTransactionId,
      },
    );

    /*
     * ============================================================
     * 4. ÉVÉNEMENTS QUI NE SIGNIFIENT PAS ENCORE
     *    QUE LE PAIEMENT EST TERMINÉ
     * ============================================================
     */
    if (
      eventType ===
        "CHECKOUT.ORDER.APPROVED" ||
      eventType ===
        "PAYMENT.CAPTURE.PENDING"
    ) {
      /*
       * APPROVED = le client a approuvé.
       *
       * PENDING = paiement encore en attente.
       *
       * Dans les deux cas :
       * NE PAS ACTIVER L'ABONNEMENT.
       */
      return NextResponse.json(
        {
          success: true,
          received: true,
          processed: false,
          status: "pending",
          eventId,
          eventType,
        },
        {
          status: 200,
        },
      );
    }

    /*
     * ============================================================
     * 5. ÉVÉNEMENTS D'ÉCHEC
     * ============================================================
     */
    if (
      eventType ===
        "PAYMENT.CAPTURE.DENIED" ||
      eventType ===
        "PAYMENT.CAPTURE.DECLINED" ||
      eventType ===
        "PAYMENT.CAPTURE.REVERSED" ||
      eventType ===
        "CHECKOUT.ORDER.CANCELLED" ||
      eventType ===
        "CHECKOUT.ORDER.DECLINED"
    ) {
      /*
       * Pour l'instant nous confirmons uniquement
       * la réception.
       *
       * La synchronisation de payment_transactions
       * sera branchée avec le moteur de paiement central.
       */
      return NextResponse.json(
        {
          success: true,
          received: true,
          processed: false,
          status:
            webhook.status,
          eventId,
          eventType,
        },
        {
          status: 200,
        },
      );
    }

    /*
     * ============================================================
     * 6. PAIEMENT CAPTURÉ
     * ============================================================
     */
    if (
      eventType ===
      "PAYMENT.CAPTURE.COMPLETED"
    ) {
      /*
       * À ce stade PayPal nous indique que
       * la capture est terminée.
       *
       * MAIS nous faisons une nouvelle vérification
       * serveur avant toute activation.
       */
      const resource =
        record.resource &&
        typeof record.resource ===
          "object"
          ? (record.resource as Record<
              string,
              unknown
            >)
          : {};

      const supplementaryData =
        resource.supplementary_data;

      let orderId: string | null =
        null;

      if (
        supplementaryData &&
        typeof supplementaryData ===
          "object"
      ) {
        const supplementary =
          supplementaryData as Record<
            string,
            unknown
          >;

        const relatedIds =
          supplementary.related_ids;

        if (
          relatedIds &&
          typeof relatedIds ===
            "object"
        ) {
          const related =
            relatedIds as Record<
              string,
              unknown
            >;

          if (
            typeof related.order_id ===
            "string"
          ) {
            orderId =
              related.order_id;
          }
        }
      }

      /*
       * Si PayPal ne nous fournit pas l'Order ID
       * dans supplementary_data, on ne tente pas
       * une activation hasardeuse.
       */
      if (!orderId) {
        console.error(
          "PAYPAL WEBHOOK: Order ID introuvable dans PAYMENT.CAPTURE.COMPLETED.",
        );

        return NextResponse.json(
          {
            success: true,
            received: true,
            processed: false,
            status:
              "successful",
            eventId,
            eventType,
            warning:
              "Order ID PayPal introuvable. Vérification différée.",
          },
          {
            status: 200,
          },
        );
      }

      /*
       * ========================================================
       * VÉRIFICATION SERVEUR
       * ========================================================
       */
      const verification =
        await paypalAdapter.verifyPayment({
          pharmacyId: "",

          providerTransactionId:
            orderId,

          merchantReference:
            webhook.merchantReference ??
            undefined,

          expectedAmount:
            webhook.amount ??
            undefined,

          expectedCurrency:
            webhook.currency ??
            undefined,
        });

      if (
        !verification.success ||
        verification.status !==
          "successful"
      ) {
        console.error(
          "PAYPAL WEBHOOK: paiement non confirmé après vérification.",
          {
            eventId,
            orderId,
            verification,
          },
        );

        /*
         * Nous retournons 200 car PayPal a bien
         * livré un événement authentique.
         *
         * Le paiement n'est simplement pas encore
         * suffisamment confirmé pour activer
         * l'abonnement.
         */
        return NextResponse.json(
          {
            success: true,
            received: true,
            processed: false,
            status:
              verification.status,
            eventId,
            eventType,
          },
          {
            status: 200,
          },
        );
      }

      /*
       * ========================================================
       * CONTRÔLES FINANCIERS
       * ========================================================
       */
      const expectedAmount =
        webhook.amount;

      const verifiedAmount =
        verification.amount;

      const expectedCurrency =
        webhook.currency
          ?.toUpperCase();

      const verifiedCurrency =
        verification.currency
          ?.toUpperCase();

      if (
        expectedAmount !==
          null &&
        expectedAmount !==
          undefined &&
        verifiedAmount !==
          null &&
        Math.abs(
          Number(
            expectedAmount,
          ) -
            Number(
              verifiedAmount,
            ),
        ) >
          0.01
      ) {
        console.error(
          "PAYPAL WEBHOOK: montant incohérent.",
          {
            eventId,
            expectedAmount,
            verifiedAmount,
          },
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Montant PayPal incohérent.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        expectedCurrency &&
        verifiedCurrency &&
        expectedCurrency !==
          verifiedCurrency
      ) {
        console.error(
          "PAYPAL WEBHOOK: devise incohérente.",
          {
            eventId,
            expectedCurrency,
            verifiedCurrency,
          },
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Devise PayPal incohérente.",
          },
          {
            status: 400,
          },
        );
      }

      /*
       * ========================================================
       * IMPORTANT
       * ========================================================
       *
       * Le paiement est maintenant authentifié,
       * capturé et vérifié.
       *
       * L'activation de l'abonnement sera branchée
       * dans le moteur central payment_transactions
       * afin que PayPal, Moko, GoFreshPay, Yabétoo,
       * FeexPay, CinetPay et PawaPay utilisent
       * EXACTEMENT la même logique d'activation.
       */
      console.log(
        "PAYPAL PAYMENT VERIFIED:",
        {
          eventId,
          orderId,
          merchantReference:
            verification.merchantReference,
          providerTransactionId:
            verification.providerTransactionId,
          amount:
            verification.amount,
          currency:
            verification.currency,
        },
      );

      return NextResponse.json(
        {
          success: true,
          received: true,
          processed: true,
          status:
            "successful",
          eventId,
          eventType,
          merchantReference:
            verification.merchantReference,
          providerTransactionId:
            verification.providerTransactionId,
        },
        {
          status: 200,
        },
      );
    }

    /*
     * ============================================================
     * 7. AUTRES ÉVÉNEMENTS
     * ============================================================
     *
     * On les accepte sans les considérer comme
     * des paiements réussis.
     */
    return NextResponse.json(
      {
        success: true,
        received: true,
        processed: false,
        status:
          webhook.status,
        eventId,
        eventType,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "PAYPAL WEBHOOK ERROR:",
      error,
    );

    /*
     * 500 uniquement pour une véritable erreur
     * interne.
     */
    return NextResponse.json(
      {
        success: false,
        error:
          "Erreur interne lors du traitement du webhook PayPal.",
      },
      {
        status: 500,
      },
    );
  }
}