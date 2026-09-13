import { createHash, randomUUID } from "crypto";

import {
  supabaseAdmin,
} from "@/app/lib/supabase/admin";

export const runtime = "nodejs";


/* =========================================================
   TYPES
   ========================================================= */

type Category =
  | "general"
  | "payment"
  | "technical"
  | "complaint"
  | "commercial";


type CreateTicketBody = {
  action?: "create" | "message";

  ticketId?: string;
  accessToken?: string;

  name?: string;
  email?: string;
  phone?: string;

  category?: Category;

  message?: string;
};


/* =========================================================
   OUTILS
   ========================================================= */

function clean(
  value: unknown,
  maxLength: number,
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}


function hashToken(
  token: string,
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}


function validEmail(
  email: string,
) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}


function createAccessToken() {
  return (
    randomUUID().replaceAll(
      "-",
      "",
    ) +
    randomUUID().replaceAll(
      "-",
      "",
    )
  );
}


function isValidCategory(
  value: unknown,
): value is Category {
  return (
    value === "general" ||
    value === "payment" ||
    value === "technical" ||
    value === "complaint" ||
    value === "commercial"
  );
}


function categoryToPriority(
  category: Category,
) {
  if (
    category === "payment" ||
    category === "complaint"
  ) {
    return "high";
  }

  return "normal";
}


function categoryToSubject(
  category: Category,
) {
  switch (category) {
    case "payment":
      return "Problème de paiement";

    case "technical":
      return "Assistance technique";

    case "complaint":
      return "Réclamation";

    case "commercial":
      return "Demande commerciale";

    default:
      return "Demande générale";
  }
}


/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as CreateTicketBody;

    const action =
      body.action || "create";


    /* =====================================================
       MESSAGE DANS UN TICKET EXISTANT
       ===================================================== */

    if (action === "message") {
      return await addCustomerMessage(
        body,
      );
    }


    /* =====================================================
       CRÉATION D'UN NOUVEAU TICKET
       ===================================================== */

    const name =
      clean(
        body.name,
        120,
      );

    const email =
      clean(
        body.email,
        180,
      );

    const phone =
      clean(
        body.phone,
        50,
      );

    const category =
      isValidCategory(
        body.category,
      )
        ? body.category
        : "general";

    const message =
      clean(
        body.message,
        5000,
      );


    /* =====================================================
       VALIDATION NOM
       ===================================================== */

    if (!name) {
      return Response.json(
        {
          error:
            "Veuillez indiquer votre nom.",
        },
        {
          status: 400,
        },
      );
    }


    /* =====================================================
       VALIDATION CONTACT
       ===================================================== */

    if (!email && !phone) {
      return Response.json(
        {
          error:
            "Veuillez indiquer un e-mail ou un numéro de téléphone.",
        },
        {
          status: 400,
        },
      );
    }


    /* =====================================================
       VALIDATION EMAIL
       ===================================================== */

    if (!validEmail(email)) {
      return Response.json(
        {
          error:
            "L'adresse e-mail n'est pas valide.",
        },
        {
          status: 400,
        },
      );
    }


    /* =====================================================
       VALIDATION MESSAGE
       ===================================================== */

    if (!message) {
      return Response.json(
        {
          error:
            "Veuillez écrire votre message.",
        },
        {
          status: 400,
        },
      );
    }


    /* =====================================================
       TOKEN PRIVÉ DU VISITEUR
       ===================================================== */

    const accessToken =
      createAccessToken();

    const tokenHash =
      hashToken(
        accessToken,
      );


    /* =====================================================
       INFORMATIONS DU TICKET
       ===================================================== */

    const subject =
      categoryToSubject(
        category,
      );

    const priority =
      categoryToPriority(
        category,
      );

    const now =
      new Date().toISOString();


    /* =====================================================
       CRÉER LE TICKET
       ===================================================== */

    const {
      data: ticket,
      error: ticketError,
    } =
      await supabaseAdmin
        .from(
          "support_tickets",
        )
        .insert({
          customer_name:
            name,

          customer_email:
            email || null,

          customer_phone:
            phone || null,

          category,

          subject,

          status:
            "open",

          priority,

          visitor_token_hash:
            tokenHash,

          last_message_at:
            now,
        })
        .select(
          "id,ticket_number,status,category,created_at,last_message_at",
        )
        .single();


    if (
      ticketError ||
      !ticket
    ) {
      console.error(
        "SUPPORT TICKET CREATE:",
        ticketError,
      );

      return Response.json(
        {
          error:
            "Impossible de créer la demande de support.",
        },
        {
          status: 500,
        },
      );
    }


    /* =====================================================
       PREMIER MESSAGE CLIENT
       ===================================================== */

    const {
      error: messageError,
    } =
      await supabaseAdmin
        .from(
          "support_messages",
        )
        .insert({
          ticket_id:
            ticket.id,

          sender_type:
            "customer",

          message,
        });


    /* =====================================================
       SI LE MESSAGE ÉCHOUE
       ===================================================== */

    if (messageError) {

      /*
       * On supprime le ticket incomplet
       * afin de ne pas laisser une demande
       * vide dans le système.
       */

      await supabaseAdmin
        .from(
          "support_tickets",
        )
        .delete()
        .eq(
          "id",
          ticket.id,
        );


      console.error(
        "SUPPORT FIRST MESSAGE:",
        messageError,
      );

      return Response.json(
        {
          error:
            "Impossible d'enregistrer votre message.",
        },
        {
          status: 500,
        },
      );
    }


    /* =====================================================
       RÉPONSE
       ===================================================== */

    return Response.json({
      success:
        true,

      ticket: {
        id:
          ticket.id,

        ticketNumber:
          ticket.ticket_number,

        status:
          ticket.status,

        category:
          ticket.category,

        createdAt:
          ticket.created_at,

        lastMessageAt:
          ticket.last_message_at,
      },

      accessToken,
    });

  } catch (error) {

    console.error(
      "SUPPORT CREATE ERROR:",
      error,
    );

    return Response.json(
      {
        error:
          "Une erreur est survenue.",
      },
      {
        status: 500,
      },
    );
  }
}


/* =========================================================
   AJOUTER UN MESSAGE CLIENT
   ========================================================= */

async function addCustomerMessage(
  body: CreateTicketBody,
) {
  const ticketId =
    clean(
      body.ticketId,
      80,
    );

  const accessToken =
    clean(
      body.accessToken,
      200,
    );

  const message =
    clean(
      body.message,
      5000,
    );


  /* =====================================================
     VALIDATION SESSION
     ===================================================== */

  if (
    !ticketId ||
    !accessToken
  ) {
    return Response.json(
      {
        error:
          "Session de support invalide.",
      },
      {
        status: 401,
      },
    );
  }


  /* =====================================================
     VALIDATION MESSAGE
     ===================================================== */

  if (!message) {
    return Response.json(
      {
        error:
          "Le message est vide.",
      },
      {
        status: 400,
      },
    );
  }


  /* =====================================================
     VÉRIFICATION DU TOKEN
     ===================================================== */

  const tokenHash =
    hashToken(
      accessToken,
    );


  const {
    data: ticket,
    error: ticketError,
  } =
    await supabaseAdmin
      .from(
        "support_tickets",
      )
      .select(
        "id,status",
      )
      .eq(
        "id",
        ticketId,
      )
      .eq(
        "visitor_token_hash",
        tokenHash,
      )
      .maybeSingle();


  if (
    ticketError ||
    !ticket
  ) {
    return Response.json(
      {
        error:
          "Demande de support introuvable.",
      },
      {
        status: 404,
      },
    );
  }


  /* =====================================================
     TICKET FERMÉ
     ===================================================== */

  if (
    ticket.status ===
      "closed"
  ) {
    return Response.json(
      {
        error:
          "Cette demande est fermée.",
      },
      {
        status: 409,
      },
    );
  }


  /* =====================================================
     CRÉER LE MESSAGE
     ===================================================== */

  const {
    data: createdMessage,
    error: messageError,
  } =
    await supabaseAdmin
      .from(
        "support_messages",
      )
      .insert({
        ticket_id:
          ticket.id,

        sender_type:
          "customer",

        message,
      })
      .select(
        "id,sender_type,message,created_at",
      )
      .single();


  if (
    messageError ||
    !createdMessage
  ) {
    console.error(
      "SUPPORT MESSAGE CREATE:",
      messageError,
    );

    return Response.json(
      {
        error:
          "Impossible d'envoyer le message.",
      },
      {
        status: 500,
      },
    );
  }


  /* =====================================================
     ROUVRIR LE TICKET
     ===================================================== */

  const {
    error: updateError,
  } =
    await supabaseAdmin
      .from(
        "support_tickets",
      )
      .update({
        status:
          "open",

        last_message_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        ticket.id,
      );


  if (updateError) {
    console.error(
      "SUPPORT TICKET UPDATE:",
      updateError,
    );
  }


  /* =====================================================
     RÉPONSE
     ===================================================== */

  return Response.json({
    success:
      true,

    message: {
      id:
        createdMessage.id,

      sender:
        "user",

      text:
        createdMessage.message,

      createdAt:
        createdMessage.created_at,
    },
  });
}


/* =========================================================
   GET — RÉCUPÉRER LA CONVERSATION
   ========================================================= */

export async function GET(
  request: Request,
) {
  try {

    const url =
      new URL(
        request.url,
      );


    const ticketId =
      clean(
        url.searchParams.get(
          "ticketId",
        ),
        80,
      );


    const accessToken =
      clean(
        url.searchParams.get(
          "accessToken",
        ),
        200,
      );


    /* =====================================================
       VALIDATION SESSION
       ===================================================== */

    if (
      !ticketId ||
      !accessToken
    ) {
      return Response.json(
        {
          error:
            "Session de support invalide.",
        },
        {
          status: 401,
        },
      );
    }


    const tokenHash =
      hashToken(
        accessToken,
      );


    /* =====================================================
       RÉCUPÉRER LE TICKET
       ===================================================== */

    const {
      data: ticket,
      error: ticketError,
    } =
      await supabaseAdmin
        .from(
          "support_tickets",
        )
        .select(
          "id,ticket_number,status,category,customer_name,created_at,last_message_at",
        )
        .eq(
          "id",
          ticketId,
        )
        .eq(
          "visitor_token_hash",
          tokenHash,
        )
        .maybeSingle();


    if (
      ticketError ||
      !ticket
    ) {
      return Response.json(
        {
          error:
            "Demande introuvable.",
        },
        {
          status: 404,
        },
      );
    }


    /* =====================================================
       RÉCUPÉRER LES MESSAGES
       ===================================================== */

    const {
      data: messages,
      error: messagesError,
    } =
      await supabaseAdmin
        .from(
          "support_messages",
        )
        .select(
          "id,sender_type,message,created_at",
        )
        .eq(
          "ticket_id",
          ticket.id,
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );


    if (messagesError) {
      console.error(
        "SUPPORT GET MESSAGES:",
        messagesError,
      );

      return Response.json(
        {
          error:
            "Impossible de récupérer les messages.",
        },
        {
          status: 500,
        },
      );
    }


    /* =====================================================
       FORMATAGE DES MESSAGES
       ===================================================== */

    const formattedMessages =
      (
        messages || []
      ).map(
        (item) => ({
          id:
            item.id,

          sender:
            item.sender_type ===
            "customer"
              ? "user"
              : item.sender_type ===
                  "agent"
                ? "agent"
                : "ai",

          text:
            item.message,

          createdAt:
            item.created_at,
        }),
      );


    /* =====================================================
       RÉPONSE
       ===================================================== */

    return Response.json({
      success:
        true,

      ticket,

      messages:
        formattedMessages,
    });

  } catch (error) {

    console.error(
      "SUPPORT GET ERROR:",
      error,
    );

    return Response.json(
      {
        error:
          "Impossible de récupérer la demande.",
      },
      {
        status: 500,
      },
    );
  }
}