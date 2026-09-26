import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportCategory =
  | "general"
  | "payment"
  | "technical"
  | "complaint"
  | "commercial";

type CreateTicketBody = {
  action?: "create" | "message";
  name?: string;
  email?: string;
  phone?: string;
  category?: SupportCategory | string;
  message?: string;
  ticketId?: string;
  accessToken?: string;
};

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 180;
const MAX_PHONE_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 4000;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCategory(value: unknown): SupportCategory {
  const category = cleanString(value).toLowerCase();

  if (
    category === "payment" ||
    category === "technical" ||
    category === "complaint" ||
    category === "commercial"
  ) {
    return category;
  }

  return "general";
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateAccessToken(): string {
  return randomBytes(32).toString("hex");
}

function generateTicketNumber(): string {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  const randomPart = randomBytes(4).toString("hex").toUpperCase();

  return `PF-${year}${month}${day}-${randomPart}`;
}

function errorResponse(
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
    { status },
  );
}

/**
 * Vérifie que le ticket appartient bien au visiteur
 * grâce au hash du token d'accès.
 */
async function verifyTicketAccess(
  ticketId: string,
  accessToken: string,
) {
  if (!isValidUuid(ticketId)) {
    return {
      ok: false as const,
      response: errorResponse("Identifiant de ticket invalide.", 400),
    };
  }

  if (!accessToken || accessToken.length < 20) {
    return {
      ok: false as const,
      response: errorResponse("Token d'accès invalide.", 401),
    };
  }

  const supabase = createAdminClient();

  const tokenHash = hashAccessToken(accessToken);

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select(
      `
        id,
        ticket_number,
        customer_name,
        customer_email,
        customer_phone,
        category,
        subject,
        status,
        priority,
        assigned_to,
        created_at,
        updated_at,
        last_message_at
      `,
    )
    .eq("id", ticketId)
    .eq("visitor_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("[SUPPORT] Erreur vérification ticket:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      ok: false as const,
      response: errorResponse(
        "Impossible de vérifier le ticket.",
        500,
        error.message,
      ),
    };
  }

  if (!ticket) {
    return {
      ok: false as const,
      response: errorResponse(
        "Ticket introuvable ou token d'accès invalide.",
        404,
      ),
    };
  }

  return {
    ok: true as const,
    supabase,
    ticket,
  };
}

/**
 * GET
 *
 * Récupère un ticket et toute sa conversation.
 *
 * Exemple :
 * /api/support/tickets?ticketId=...&accessToken=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const ticketId = cleanString(searchParams.get("ticketId"));
    const accessToken = cleanString(searchParams.get("accessToken"));

    if (!ticketId || !accessToken) {
      return errorResponse(
        "ticketId et accessToken sont requis.",
        400,
      );
    }

    const verification = await verifyTicketAccess(
      ticketId,
      accessToken,
    );

    if (!verification.ok) {
      return verification.response;
    }

    const { supabase, ticket } = verification;

    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select(
        `
          id,
          ticket_id,
          sender_type,
          sender_id,
          message,
          created_at
        `,
      )
      .eq("ticket_id", ticket.id)
      .order("created_at", {
        ascending: true,
      });

    if (messagesError) {
      console.error("[SUPPORT] Erreur récupération messages:", {
        code: messagesError.code,
        message: messagesError.message,
        details: messagesError.details,
        hint: messagesError.hint,
      });

      return errorResponse(
        "Impossible de récupérer les messages du ticket.",
        500,
      );
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        customer_email: ticket.customer_email,
        customer_phone: ticket.customer_phone,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        assigned_to: ticket.assigned_to,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        last_message_at: ticket.last_message_at,
      },
      messages: messages ?? [],
    });
  } catch (error) {
    console.error("[SUPPORT] GET unexpected error:", error);

    return errorResponse(
      "Une erreur inattendue est survenue.",
      500,
    );
  }
}

/**
 * POST
 *
 * Deux actions :
 *
 * 1. action = "create"
 *    Création d'un nouveau ticket + premier message client.
 *
 * 2. action = "message"
 *    Ajout d'un nouveau message client à un ticket existant.
 */
export async function POST(request: NextRequest) {
  try {
    let body: CreateTicketBody;

    try {
      body = (await request.json()) as CreateTicketBody;
    } catch {
      return errorResponse("Le corps de la requête est invalide.", 400);
    }

    const action = cleanString(body.action).toLowerCase() || "create";

    if (action !== "create" && action !== "message") {
      return errorResponse("Action de support inconnue.", 400);
    }

    const supabase = createAdminClient();

    /**
     * ============================================================
     * CRÉATION D'UN NOUVEAU TICKET
     * ============================================================
     */
    if (action === "create") {
      const name = cleanString(body.name);
      const email = cleanString(body.email);
      const phone = cleanString(body.phone);
      const message = cleanString(body.message);
      const category = normalizeCategory(body.category);

      if (!name) {
        return errorResponse("Le nom est obligatoire.", 400);
      }

      if (name.length > MAX_NAME_LENGTH) {
        return errorResponse(
          `Le nom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères.`,
          400,
        );
      }

      if (!email && !phone) {
        return errorResponse(
          "Indiquez au moins votre e-mail ou votre téléphone.",
          400,
        );
      }

      if (email && !isValidEmail(email)) {
        return errorResponse(
          "L'adresse e-mail n'est pas valide.",
          400,
        );
      }

      if (email.length > MAX_EMAIL_LENGTH) {
        return errorResponse(
          `L'adresse e-mail ne peut pas dépasser ${MAX_EMAIL_LENGTH} caractères.`,
          400,
        );
      }

      if (phone.length > MAX_PHONE_LENGTH) {
        return errorResponse(
          `Le numéro de téléphone ne peut pas dépasser ${MAX_PHONE_LENGTH} caractères.`,
          400,
        );
      }

      if (!message) {
        return errorResponse(
          "Le message est obligatoire.",
          400,
        );
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        return errorResponse(
          `Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères.`,
          400,
        );
      }

      const ticketNumber = generateTicketNumber();

      /**
       * Token privé permettant au visiteur de consulter
       * sa conversation sans compte utilisateur.
       */
      const accessToken = generateAccessToken();
      const visitorTokenHash = hashAccessToken(accessToken);

      const subject =
        category === "technical"
          ? "Demande d'assistance technique"
          : category === "payment"
            ? "Question concernant un paiement"
            : category === "complaint"
              ? "Réclamation client"
              : category === "commercial"
                ? "Demande commerciale"
                : "Demande de support";

      /**
       * Création du ticket.
       */
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          ticket_number: ticketNumber,
          customer_name: name,
          customer_email: email || null,
          customer_phone: phone || null,
          category,
          subject,
          status: "open",
          priority: "normal",
          visitor_token_hash: visitorTokenHash,
          assigned_to: null,
        })
        .select(
          `
            id,
            ticket_number,
            customer_name,
            customer_email,
            customer_phone,
            category,
            subject,
            status,
            priority,
            assigned_to,
            created_at,
            updated_at,
            last_message_at
          `,
        )
        .single();

      if (ticketError || !ticket) {
        console.error("[SUPPORT] Erreur création ticket:", {
          code: ticketError?.code,
          message: ticketError?.message,
          details: ticketError?.details,
          hint: ticketError?.hint,
        });

        return errorResponse(
          "Impossible de créer le ticket de support.",
          500,
        );
      }

      /**
       * IMPORTANT :
       *
       * La contrainte PostgreSQL de support_messages.sender_type
       * autorise :
       *
       * customer
       * agent
       * system
       *
       * Le client doit donc impérativement utiliser "customer".
       */
      const { data: firstMessage, error: messageError } =
        await supabase
          .from("support_messages")
          .insert({
            ticket_id: ticket.id,
            sender_type: "customer",
            sender_id: null,
            message,
          })
          .select(
            `
              id,
              ticket_id,
              sender_type,
              sender_id,
              message,
              created_at
            `,
          )
          .single();

      if (messageError || !firstMessage) {
        console.error(
          "[SUPPORT] Erreur création premier message:",
          {
            code: messageError?.code,
            message: messageError?.message,
            details: messageError?.details,
            hint: messageError?.hint,
          },
        );

        /**
         * Nettoyage du ticket si le premier message
         * n'a pas pu être enregistré.
         */
        const { error: rollbackError } = await supabase
          .from("support_tickets")
          .delete()
          .eq("id", ticket.id);

        if (rollbackError) {
          console.error(
            "[SUPPORT] Erreur rollback ticket:",
            {
              code: rollbackError.code,
              message: rollbackError.message,
              details: rollbackError.details,
              hint: rollbackError.hint,
            },
          );
        }

        return errorResponse(
          "Impossible d'enregistrer le message initial.",
          500,
        );
      }

      /**
       * Mise à jour de la date du dernier message.
       */
      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({
          last_message_at: firstMessage.created_at,
          updated_at: firstMessage.created_at,
        })
        .eq("id", ticket.id);

      if (updateError) {
        console.error(
          "[SUPPORT] Erreur mise à jour last_message_at:",
          {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
          },
        );
      }

      return NextResponse.json(
        {
          success: true,
          ticket: {
            id: ticket.id,
            ticket_number: ticket.ticket_number,
            customer_name: ticket.customer_name,
            customer_email: ticket.customer_email,
            customer_phone: ticket.customer_phone,
            category: ticket.category,
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            assigned_to: ticket.assigned_to,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            last_message_at:
              firstMessage.created_at ??
              ticket.last_message_at,
          },
          message: firstMessage,
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          accessToken,
        },
        { status: 201 },
      );
    }

    /**
     * ============================================================
     * AJOUT D'UN MESSAGE CLIENT
     * ============================================================
     */
    if (action === "message") {
      const ticketId = cleanString(body.ticketId);
      const accessToken = cleanString(body.accessToken);
      const message = cleanString(body.message);

      if (!ticketId) {
        return errorResponse(
          "L'identifiant du ticket est obligatoire.",
          400,
        );
      }

      if (!accessToken || accessToken.length < 20) {
        return errorResponse(
          "Le token d'accès est invalide.",
          401,
        );
      }

      if (!message) {
        return errorResponse(
          "Le message est obligatoire.",
          400,
        );
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        return errorResponse(
          `Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères.`,
          400,
        );
      }

      const verification = await verifyTicketAccess(
        ticketId,
        accessToken,
      );

      if (!verification.ok) {
        return verification.response;
      }

      const { supabase, ticket } = verification;

      /**
       * IMPORTANT :
       * Message envoyé depuis l'espace client.
       *
       * sender_type = "customer"
       *
       * et NON :
       * sender_type = "user"
       */
      const { data: newMessage, error: messageError } =
        await supabase
          .from("support_messages")
          .insert({
            ticket_id: ticket.id,
            sender_type: "customer",
            sender_id: null,
            message,
          })
          .select(
            `
              id,
              ticket_id,
              sender_type,
              sender_id,
              message,
              created_at
            `,
          )
          .single();

      if (messageError || !newMessage) {
        console.error(
          "[SUPPORT] Erreur ajout message client:",
          {
            code: messageError?.code,
            message: messageError?.message,
            details: messageError?.details,
            hint: messageError?.hint,
          },
        );

        return errorResponse(
          "Impossible d'envoyer le message.",
          500,
        );
      }

      /**
       * Si le client répond à un ticket résolu/fermé,
       * on le remet en statut ouvert afin que l'équipe
       * puisse le traiter à nouveau.
       */
      const currentStatus = String(ticket.status ?? "").toLowerCase();

      const nextStatus =
        currentStatus === "resolved" ||
        currentStatus === "closed"
          ? "open"
          : ticket.status || "open";

      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({
          status: nextStatus,
          updated_at: newMessage.created_at,
          last_message_at: newMessage.created_at,
        })
        .eq("id", ticket.id);

      if (updateError) {
        console.error(
          "[SUPPORT] Erreur mise à jour ticket après message:",
          {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
          },
        );
      }

      return NextResponse.json({
        success: true,
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          status: nextStatus,
          updated_at: newMessage.created_at,
          last_message_at: newMessage.created_at,
        },
        message: newMessage,
      });
    }

    /**
     * Action inconnue.
     */
    return errorResponse(
      "Action de support inconnue.",
      400,
    );
  } catch (error) {
    console.error("[SUPPORT] POST unexpected error:", error);

    return errorResponse(
      "Une erreur inattendue est survenue.",
      500,
    );
  }
}