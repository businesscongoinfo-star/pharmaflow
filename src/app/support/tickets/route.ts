import { createHash } from "crypto";
import { randomUUID } from "crypto";

import {
  supabaseAdmin,
} from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

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

function categoryToPriority(
  category: Category,
) {
  if (category === "payment") {
    return "high";
  }

  if (category === "complaint") {
    return "high";
  }

  return "normal";
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as CreateTicketBody;

    const action =
      body.action || "create";

    if (action === "message") {
      return await addCustomerMessage(
        body,
      );
    }

    const name =
      clean(body.name, 120);

    const email =
      clean(body.email, 180);

    const phone =
      clean(body.phone, 50);

    const category =
      body.category || "general";

    const message =
      clean(body.message, 5000);

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

    const accessToken =
      createAccessToken();

    const tokenHash =
      hashToken(accessToken);

    const subject =
      category === "payment"
        ? "Problème de paiement"
        : category === "technical"
          ? "Assistance technique"
          : category ===
              "complaint"
            ? "Réclamation"
            : category ===
                "commercial"
              ? "Demande commerciale"
              : "Demande générale";

    const {
      data: ticket,
      error:
        ticketError,
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
          status: "open",
          priority:
            categoryToPriority(
              category,
            ),
          visitor_token_hash:
            tokenHash,
        })
        .select(
          "id,ticket_number,status,category,created_at",
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

    const {
      error:
        messageError,
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

    if (messageError) {
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

    return Response.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber:
          ticket.ticket_number,
        status:
          ticket.status,
        category:
          ticket.category,
        createdAt:
          ticket.created_at,
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

  const tokenHash =
    hashToken(accessToken);

  const {
    data: ticket,
    error:
      ticketError,
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

  const {
    data: createdMessage,
    error:
      messageError,
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

  return Response.json({
    success: true,
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

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(request.url);

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
      hashToken(accessToken);

    const {
      data: ticket,
      error:
        ticketError,
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

    const {
      data: messages,
      error:
        messagesError,
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
            ascending: true,
          },
        );

    if (messagesError) {
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

    return Response.json({
      success: true,
      ticket,
      messages:
        messages?.map(
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
        ) || [],
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