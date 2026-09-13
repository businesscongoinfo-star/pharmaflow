import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";

import {
  confirmYabetooPayment,
  type YabetooOperator,
} from "@/app/lib/payments/yabetoo";

/* =========================================================
   TYPES
========================================================= */

type RequestBody = {
  paymentTransactionId?: string;
  operator?: YabetooOperator;
  phone?: string;
};

/* =========================================================
   OPÉRATEURS AUTORISÉS
========================================================= */

const ALLOWED_OPERATORS: YabetooOperator[] = [
  "mtn",
  "airtel",
];

/* =========================================================
   ERREUR JSON
========================================================= */

function jsonError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...extra,
    },
    {
      status,
    },
  );
}

/* =========================================================
   NORMALISATION OPÉRATEUR
========================================================= */

function normalizeOperator(
  value: unknown,
): YabetooOperator | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    !ALLOWED_OPERATORS.includes(
      normalized as YabetooOperator,
    )
  ) {
    return null;
  }

  return normalized as YabetooOperator;
}

/* =========================================================
   NORMALISATION TÉLÉPHONE
========================================================= */

function normalizePhone(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const phone =
    value.trim();

  if (!phone) {
    return null;
  }

  /*
   * Yabétoo attend le numéro au format
   * international.
   *
   * Exemple Congo-Brazzaville :
   * +242061234567
   */

  return phone;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    /* =======================================================
       1. CLIENT SUPABASE
    ======================================================= */

    const supabase =
      await createClient();

    /* =======================================================
       2. UTILISATEUR CONNECTÉ
    ======================================================= */

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Votre session a expiré. Veuillez vous reconnecter.",
        401,
        {
          code:
            "AUTHENTICATION_REQUIRED",
        },
      );
    }

    /* =======================================================
       3. LIRE LA REQUÊTE
    ======================================================= */

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return jsonError(
        "Les données envoyées sont invalides.",
        400,
        {
          code:
            "INVALID_REQUEST_BODY",
        },
      );
    }

    /* =======================================================
       4. ID TRANSACTION
    ======================================================= */

    const paymentTransactionId =
      typeof body.paymentTransactionId ===
      "string"
        ? body.paymentTransactionId.trim()
        : "";

    if (
      !paymentTransactionId
    ) {
      return jsonError(
        "L'identifiant de la transaction de paiement est obligatoire.",
        400,
        {
          code:
            "PAYMENT_TRANSACTION_ID_REQUIRED",
        },
      );
    }

    /* =======================================================
       5. OPÉRATEUR
    ======================================================= */

    const operator =
      normalizeOperator(
        body.operator,
      );

    if (!operator) {
      return jsonError(
        "L'opérateur Mobile Money est invalide. Utilisez MTN ou Airtel.",
        400,
        {
          code:
            "INVALID_YABETOO_OPERATOR",

          supportedOperators:
            [
              "mtn",
              "airtel",
            ],
        },
      );
    }

    /* =======================================================
       6. PROFIL
    ======================================================= */

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from(
          "profiles",
        )
        .select(
          "id, full_name, phone, pharmacy_id",
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
        "YABETOO CONFIRM - profil:",
        profileError,
      );

      return jsonError(
        "Impossible de récupérer votre profil.",
        500,
        {
          code:
            "PROFILE_QUERY_ERROR",
        },
      );
    }

    if (!profile) {
      return jsonError(
        "Votre profil PharmaFlow est introuvable.",
        404,
        {
          code:
            "PROFILE_NOT_FOUND",
        },
      );
    }

    if (
      !profile.pharmacy_id
    ) {
      return jsonError(
        "Aucune pharmacie n'est associée à votre compte.",
        400,
        {
          code:
            "PHARMACY_NOT_ASSOCIATED",
        },
      );
    }

    const pharmacyId =
      profile.pharmacy_id;

    /* =======================================================
       7. TRANSACTION LOCALE
    ======================================================= */

    const {
      data:
        paymentTransaction,
      error:
        transactionError,
    } =
      await supabase
        .from(
          "payment_transactions",
        )
        .select(
          "id, pharmacy_id, subscription_id, provider, merchant_reference, amount, currency, payment_method, status, provider_transaction_id, metadata, failure_reason, created_at, updated_at, paid_at",
        )
        .eq(
          "id",
          paymentTransactionId,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        )
        .maybeSingle();

    if (
      transactionError
    ) {
      console.error(
        "YABETOO CONFIRM - transaction:",
        transactionError,
      );

      return jsonError(
        "Impossible de récupérer la transaction de paiement.",
        500,
        {
          code:
            "PAYMENT_TRANSACTION_QUERY_ERROR",
        },
      );
    }

    if (
      !paymentTransaction
    ) {
      return jsonError(
        "Transaction de paiement introuvable.",
        404,
        {
          code:
            "PAYMENT_TRANSACTION_NOT_FOUND",
        },
      );
    }

    /* =======================================================
       8. VÉRIFICATION FOURNISSEUR
    ======================================================= */

    const provider =
      String(
        paymentTransaction.provider ??
          "",
      )
        .trim()
        .toLowerCase();

    if (
      provider !==
      "yabetoo"
    ) {
      return jsonError(
        "Cette transaction n'utilise pas Yabétoo.",
        400,
        {
          code:
            "INVALID_PAYMENT_PROVIDER",

          provider,
        },
      );
    }

    /* =======================================================
       9. VÉRIFICATION MOYEN DE PAIEMENT
    ======================================================= */

    const paymentMethod =
      String(
        paymentTransaction.payment_method ??
          "",
      )
        .trim()
        .toLowerCase();

    if (
      paymentMethod !==
      "mobile_money"
    ) {
      return jsonError(
        "Cette transaction n'est pas une transaction Mobile Money Yabétoo.",
        400,
        {
          code:
            "INVALID_YABETOO_PAYMENT_METHOD",

          paymentMethod,
        },
      );
    }

    /* =======================================================
       10. TRANSACTION DÉJÀ RÉUSSIE
    ======================================================= */

    if (
      paymentTransaction.status ===
      "successful"
    ) {
      return NextResponse.json({
        success: true,

        message:
          "Cette transaction Yabétoo est déjà confirmée.",

        payment: {
          id:
            paymentTransaction.id,

          merchantReference:
            paymentTransaction.merchant_reference,

          provider:
            "yabetoo",

          providerTransactionId:
            paymentTransaction.provider_transaction_id,

          amount:
            paymentTransaction.amount,

          currency:
            paymentTransaction.currency,

          paymentMethod:
            paymentTransaction.payment_method,

          status:
            "successful",

          alreadySuccessful:
            true,
        },

        subscription: {
          id:
            paymentTransaction.subscription_id,
        },
      });
    }

    /* =======================================================
       11. CLIENT SECRET YABÉTOO
    ======================================================= */

    /*
     * Le client_secret est conservé côté serveur
     * dans metadata lors de la création du paiement.
     *
     * Nous essayons plusieurs variantes afin de rester
     * compatibles avec les anciennes transactions.
     */

    const rawMetadata =
      paymentTransaction.metadata;

    const metadata =
      rawMetadata &&
      typeof rawMetadata ===
        "object"
        ? (rawMetadata as Record<
            string,
            unknown
          >)
        : {};

    const clientSecretFromMetadata =
      typeof metadata.client_secret ===
      "string"
        ? metadata.client_secret.trim()
        : "";

    /*
     * Pour cette route, le client_secret n'est PAS
     * récupéré depuis le navigateur.
     *
     * C'est volontaire :
     * le serveur utilise la valeur conservée
     * au moment de la création.
     */

    if (
      !clientSecretFromMetadata
    ) {
      return jsonError(
        "Le client secret Yabétoo est introuvable pour cette transaction. Veuillez recommencer le paiement.",
        400,
        {
          code:
            "YABETOO_CLIENT_SECRET_NOT_FOUND",

          paymentTransactionId:
            paymentTransaction.id,
        },
      );
    }

    /* =======================================================
       12. ID PAYMENT INTENT
    ======================================================= */

    const providerTransactionId =
      String(
        paymentTransaction.provider_transaction_id ??
          metadata.provider_transaction_id ??
          "",
      ).trim();

    if (
      !providerTransactionId
    ) {
      return jsonError(
        "L'identifiant de l'intention de paiement Yabétoo est introuvable.",
        400,
        {
          code:
            "YABETOO_PAYMENT_INTENT_ID_NOT_FOUND",

          paymentTransactionId:
            paymentTransaction.id,
        },
      );
    }

    /* =======================================================
       13. NUMÉRO MOBILE MONEY
    ======================================================= */

    const phone =
      normalizePhone(
        body.phone,
      ) ??
      normalizePhone(
        profile.phone,
      );

    if (!phone) {
      return jsonError(
        "Veuillez renseigner le numéro Mobile Money utilisé pour le paiement.",
        400,
        {
          code:
            "YABETOO_PHONE_REQUIRED",
        },
      );
    }

    /* =======================================================
       14. NOM CLIENT
    ======================================================= */

    const fullName =
      String(
        profile.full_name ??
          "",
      ).trim();

    const nameParts =
      fullName
        ? fullName.split(
            /\s+/,
          )
        : [];

    const firstName =
      nameParts[0] ??
      "";

    const lastName =
      nameParts
        .slice(1)
        .join(" ");

    /* =======================================================
       15. EMAIL
    ======================================================= */

    const email =
      typeof user.email ===
      "string"
        ? user.email
            .trim()
            .toLowerCase()
        : undefined;

    /* =======================================================
       16. CONFIRMATION YABÉTOO
    ======================================================= */

    console.log(
      "YABETOO CONFIRM - démarrage:",
      {
        paymentTransactionId:
          paymentTransaction.id,

        merchantReference:
          paymentTransaction.merchant_reference,

        providerTransactionId,

        operator,

        /*
         * Ne jamais afficher le client secret
         * dans les logs.
         */

        hasClientSecret:
          Boolean(
            clientSecretFromMetadata,
          ),
      },
    );

    const result =
      await confirmYabetooPayment(
        {
          paymentIntentId:
            providerTransactionId,

          clientSecret:
            clientSecretFromMetadata,

          operator,

          phone,

          firstName,

          lastName,

          email,
        },
      );

    /* =======================================================
       17. MÉTADONNÉES RÉSULTAT
    ======================================================= */

    const updatedMetadata:
      Record<
        string,
        unknown
      > = {
      ...metadata,

      yabetoo_operator:
        operator,

      yabetoo_confirmed_at:
        new Date().toISOString(),

      yabetoo_confirmation_response:
        result.metadata ??
        null,
    };

    /* =======================================================
       18. STATUT LOCAL
    ======================================================= */

    const localStatus =
      result.status ===
      "successful"
        ? "successful"
        : result.status ===
          "failed"
          ? "failed"
          : result.status ===
            "cancelled"
            ? "cancelled"
            : result.status ===
              "expired"
              ? "expired"
              : "pending";

    /* =======================================================
       19. MISE À JOUR TRANSACTION
    ======================================================= */

    const updatePayload:
      Record<
        string,
        unknown
      > = {
      status:
        localStatus,

      provider_transaction_id:
        result.providerTransactionId ??
        providerTransactionId,

      metadata:
        updatedMetadata,
    };

    if (
      localStatus ===
      "successful"
    ) {
      updatePayload.paid_at =
        new Date().toISOString();

      updatePayload.failure_reason =
        null;
    }

    if (
      localStatus ===
        "failed" ||
      localStatus ===
        "cancelled" ||
      localStatus ===
        "expired"
    ) {
      updatePayload.failure_reason =
        result.message ??
        result.failureReason ??
        "Le paiement Yabétoo n'a pas abouti.";
    }

    const {
      data:
        updatedTransaction,
      error:
        updateError,
    } =
      await supabase
        .from(
          "payment_transactions",
        )
        .update(
          updatePayload,
        )
        .eq(
          "id",
          paymentTransaction.id,
        )
        .eq(
          "pharmacy_id",
          pharmacyId,
        )
        .select(
          "id, pharmacy_id, subscription_id, provider, merchant_reference, amount, currency, payment_method, status, provider_transaction_id, metadata, failure_reason, created_at, updated_at, paid_at",
        )
        .single();

    if (
      updateError ||
      !updatedTransaction
    ) {
      console.error(
        "YABETOO CONFIRM - mise à jour transaction:",
        updateError,
      );

      return jsonError(
        "Yabétoo a répondu, mais la transaction PharmaFlow n'a pas pu être mise à jour.",
        500,
        {
          code:
            "PAYMENT_TRANSACTION_UPDATE_ERROR",

          paymentTransactionId:
            paymentTransaction.id,

          merchantReference:
            paymentTransaction.merchant_reference,
        },
      );
    }

    /* =======================================================
       20. PAIEMENT RÉUSSI
    ======================================================= */

    if (
      localStatus ===
      "successful"
    ) {
      return NextResponse.json({
        success: true,

        message:
          "Paiement Mobile Money Yabétoo confirmé avec succès.",

        payment: {
          id:
            updatedTransaction.id,

          merchantReference:
            updatedTransaction.merchant_reference,

          provider:
            updatedTransaction.provider,

          providerTransactionId:
            updatedTransaction.provider_transaction_id,

          amount:
            updatedTransaction.amount,

          currency:
            updatedTransaction.currency,

          paymentMethod:
            updatedTransaction.payment_method,

          status:
            updatedTransaction.status,

          operator,
        },

        subscription: {
          id:
            updatedTransaction.subscription_id,
        },

        /*
         * IMPORTANT :
         *
         * La transaction est confirmée,
         * mais cette route n'active pas encore
         * automatiquement l'abonnement.
         *
         * L'activation sécurisée sera faite
         * après vérification serveur/webhook.
         */
        subscriptionActivation:
          "pending_verification",
      });
    }

    /* =======================================================
       21. PAIEMENT EN ATTENTE
    ======================================================= */

    if (
      localStatus ===
      "pending"
    ) {
      return NextResponse.json(
        {
          success: true,

          message:
            result.message ??
            "Le paiement Mobile Money est en cours de traitement. Veuillez confirmer la demande sur votre téléphone.",

          payment: {
            id:
              updatedTransaction.id,

            merchantReference:
              updatedTransaction.merchant_reference,

            provider:
              updatedTransaction.provider,

            providerTransactionId:
              updatedTransaction.provider_transaction_id,

            amount:
              updatedTransaction.amount,

            currency:
              updatedTransaction.currency,

            paymentMethod:
              updatedTransaction.payment_method,

            status:
              updatedTransaction.status,

            operator,
          },

          subscription: {
            id:
              updatedTransaction.subscription_id,
          },

          subscriptionActivation:
            "pending_payment_confirmation",
        },
        {
          status: 202,
        },
      );
    }

    /* =======================================================
       22. PAIEMENT ÉCHOUÉ / ANNULÉ / EXPIRÉ
    ======================================================= */

    return jsonError(
      result.message ??
        "Le paiement Yabétoo n'a pas abouti.",
      400,
      {
        code:
          result.errorCode ??
          "YABETOO_PAYMENT_FAILED",

        payment: {
          id:
            updatedTransaction.id,

          merchantReference:
            updatedTransaction.merchant_reference,

          provider:
            updatedTransaction.provider,

          providerTransactionId:
            updatedTransaction.provider_transaction_id,

          amount:
            updatedTransaction.amount,

          currency:
            updatedTransaction.currency,

          paymentMethod:
            updatedTransaction.payment_method,

          status:
            updatedTransaction.status,

          operator,
        },

        subscription: {
          id:
            updatedTransaction.subscription_id,
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "YABETOO CONFIRM - erreur inattendue:",
      error,
    );

    return jsonError(
      "Une erreur inattendue est survenue lors de la confirmation du paiement Yabétoo.",
      500,
      {
        code:
          "YABETOO_CONFIRM_UNEXPECTED_ERROR",
      },
    );
  }
}