import OpenAI from "openai";

import {
  buildPharmaFlowSupportPrompt,
  normalizePharmaFlowLocale,
  normalizeSupportCategory,
  sanitizeSupportHistory,
  sanitizeSupportMessage,
} from "@/app/lib/pharmaflow/support-knowledge";


/* =========================================================
   CLIENT OPENAI
   ========================================================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


/* =========================================================
   TYPES
   ========================================================= */

type SupportRequestBody = {
  locale?: string;
  category?: string;
  message?: unknown;
  history?: unknown;
};


/* =========================================================
   RÉPONSE D'ERREUR
   ========================================================= */

function errorResponse(
  message: string,
  status = 500
) {
  return Response.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    }
  );
}


/* =========================================================
   DÉTECTION DES DEMANDES NON CONFIRMÉES
   ========================================================= */

function containsUnconfirmedFeatureQuestion(
  message: string
): boolean {
  const text = message.toLowerCase();

  const suspiciousTerms = [
    "siret",
    "ifin",
    "ifu",
    "licence",
    "license",
    "autorisation",
    "importer 5000",
    "importation",
    "import automatique",
    "fournisseur",
    "fournisseurs",
    "client",
    "clients",
    "facture",
    "factures",
    "abonnement",
    "essai gratuit",
    "trial",
    "paypal",
    "stripe",
    "migration",
    "api externe",
  ];

  return suspiciousTerms.some(
    (term) => text.includes(term)
  );
}


/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: Request
) {
  try {

    /* -------------------------------------------------------
       1. CLÉ OPENAI
       ------------------------------------------------------- */

    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "PHARMAFLOW SUPPORT AI : OPENAI_API_KEY manquante."
      );

      return errorResponse(
        "Le service d'assistance IA n'est pas configuré.",
        500
      );
    }


    /* -------------------------------------------------------
       2. LECTURE JSON
       ------------------------------------------------------- */

    let body: SupportRequestBody;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Requête invalide.",
        400
      );
    }


    /* -------------------------------------------------------
       3. LANGUE
       ------------------------------------------------------- */

    const locale =
      normalizePharmaFlowLocale(
        body.locale
      );


    /* -------------------------------------------------------
       4. CATÉGORIE
       ------------------------------------------------------- */

    const category =
      normalizeSupportCategory(
        body.category
      );


    /* -------------------------------------------------------
       5. MESSAGE
       ------------------------------------------------------- */

    const userMessage =
      sanitizeSupportMessage(
        body.message
      );

    if (!userMessage) {
      return errorResponse(
        locale === "fr"
          ? "Veuillez saisir votre question."
          : "Please enter your question.",
        400
      );
    }


    /* -------------------------------------------------------
       6. HISTORIQUE
       ------------------------------------------------------- */

    const history =
      sanitizeSupportHistory(
        body.history
      );


    /* -------------------------------------------------------
       7. CONTEXTE PHARMAFLOW
       ------------------------------------------------------- */

    const pharmaFlowPrompt =
      buildPharmaFlowSupportPrompt(
        locale,
        category
      );


    /* -------------------------------------------------------
       8. INFORMATION SUPPLÉMENTAIRE
       ------------------------------------------------------- */

    const unconfirmedQuestion =
      containsUnconfirmedFeatureQuestion(
        userMessage
      );


    /*
     * Cette information n'affirme PAS que la fonctionnalité
     * n'existe pas.
     *
     * Elle indique simplement au modèle qu'il doit être
     * particulièrement strict lorsque la question concerne
     * une fonctionnalité qui n'est pas confirmée.
     */

    const safetyInstruction =
      locale === "fr"
        ? `
ATTENTION :

La question de l'utilisateur peut concerner une fonctionnalité
qui n'est pas explicitement confirmée dans la base.

Ne suppose surtout pas que cette fonctionnalité existe.

Si elle n'est pas confirmée dans la base PharmaFlow,
dis clairement que tu ne peux pas la confirmer.

Ne transforme jamais une hypothèse en fait.
        `.trim()
        : `
WARNING:

The user's question may concern a feature that is not explicitly
confirmed in the knowledge base.

Do not assume that this feature exists.

If it is not confirmed in the PharmaFlow knowledge base,
clearly state that you cannot confirm it.

Never turn an assumption into a fact.
        `.trim();


    /* -------------------------------------------------------
       9. INSTRUCTIONS FINALES
       ------------------------------------------------------- */

    const instructions = `
${pharmaFlowPrompt}

=========================================================
CONTRÔLE SUPPLÉMENTAIRE
=========================================================

${safetyInstruction}

Question potentiellement non confirmée :
${unconfirmedQuestion ? "OUI" : "NON"}

Même lorsque cette valeur est NON, les règles
anti-hallucination restent obligatoires.
    `.trim();


    /* -------------------------------------------------------
       10. CONVERSATION
       ------------------------------------------------------- */

    const conversation = [
      ...history,
      {
        role: "user" as const,
        content: userMessage,
      },
    ];


    /* -------------------------------------------------------
       11. MODÈLE
       ------------------------------------------------------- */

    const model =
      process.env.OPENAI_SUPPORT_MODEL ||
      "gpt-5.6-luna";
      /* -------------------------------------------------------
       12. APPEL OPENAI
       ------------------------------------------------------- */

    const response =
      await openai.responses.create({
        model,

        instructions,

        input: conversation,

        max_output_tokens: 1200,
      });


    /* -------------------------------------------------------
       13. RÉCUPÉRATION DU TEXTE
       ------------------------------------------------------- */

    const answer =
      response.output_text?.trim() || "";


    /* -------------------------------------------------------
       14. RÉPONSE VIDE
       ------------------------------------------------------- */

    if (!answer) {
      console.error(
        "PHARMAFLOW SUPPORT AI : réponse vide.",
        response
      );

      return errorResponse(
        locale === "fr"
          ? "Je n'ai pas pu générer une réponse. Veuillez réessayer."
          : "I could not generate an answer. Please try again.",
        500
      );
    }


    /* -------------------------------------------------------
       15. RÉPONSE
       ------------------------------------------------------- */

    return Response.json({
      success: true,

      answer,

      category,

      locale,

      model,
    });

  } catch (error) {

    /* -------------------------------------------------------
       16. GESTION DES ERREURS
       ------------------------------------------------------- */

    console.error(
      "PHARMAFLOW SUPPORT AI ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(
      "PHARMAFLOW SUPPORT AI DETAILS:",
      message
    );

    return errorResponse(
      "Une erreur est survenue avec l'assistant IA.",
      500
    );
  }
}