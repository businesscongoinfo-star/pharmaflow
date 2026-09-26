import {
  createHash,
  randomBytes,
} from "node:crypto";

import { NextResponse } from "next/server";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type SupportCategory =
  | "general"
  | "payment"
  | "technical"
  | "complaint"
  | "commercial";

const ALLOWED_CATEGORIES: SupportCategory[] = [
  "general",
  "payment",
  "technical",
  "complaint",
  "commercial",
];

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_TICKET_ID_LENGTH = 100;
const MAX_ACCESS_TOKEN_LENGTH = 200;

/* =========================================================
   UTILITAIRES
========================================================= */

function cleanText(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizeCategory(
  value: unknown,
): SupportCategory {
  if (
    typeof value === "string" &&
    ALLOWED_CATEGORIES.includes(
      value as SupportCategory,
    )
  ) {
    return value as SupportCategory;
  }

  return "general";
}

function normalizeEmail(
  value: unknown,
): string {
  return cleanText(
    value,
    MAX_EMAIL_LENGTH,
  ).toLowerCase();
}

function isValidEmail(
  email: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

/* =========================================================
   TOKEN VISITEUR
========================================================= */

function hashAccessToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function generateAccessToken(): string {
  return randomBytes(32).toString(
    "hex",
  );
}

/* =========================================================
   NUMÉRO DE TICKET
========================================================= */

function generateTicketNumber(): string {
  const now = new Date();

  const year =
    now.getUTCFullYear();

  const month = String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getUTCDate(),
  ).padStart(2, "0");

  const random =
    randomBytes(4)
      .toString("hex")
      .toUpperCase();

  return `PF-${year}${month}${day}-${random}`;
}

/* =========================================================
   ERREUR JSON
========================================================= */

function errorResponse(
  message: string,
  status = 500,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details
        ? {
            details,
          }
        : {}),
    },
    {
      status,
    },
  );
}

/* =========================================================
   FORMAT MESSAGE
========================================================= */

function formatMessage(
  row: {
    id: string;
    ticket_id: string;
    sender_type: string | null;
    sender_id: string | null;
    message: string | null;
    created_at: string | null;
  },
) {
  let sender:
    | "user"
    | "agent"
    | "ai" = "user";

  if (
    row.sender_type ===
    "agent"
  ) {
    sender = "agent";
  } else if (
    row.sender_type ===
    "ai"
  ) {
    sender = "ai";
  }

  return {
    id: row.id,

    ticketId:
      row.ticket_id,

    sender,

    senderType:
      row.sender_type,

    text:
      row.message ?? "",

    createdAt:
      row.created_at ??
      null,
  };
}

/* =========================================================
   CHARGER UN TICKET
========================================================= */

async function loadTicket(
  ticketId: string,
  accessToken: string,
) {
  const admin =
    createAdminClient();

  const accessTokenHash =
    hashAccessToken(
      accessToken,
    );

  /*
   * IMPORTANT :
   * On vérifie simultanément :
   * - l'id du ticket
   * - le hash du token visiteur
   *
   * Le token original n'est jamais stocké en clair.
   */

  const {
    data: ticket,
    error: ticketError,
  } =
    await admin
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
      .eq(
        "id",
        ticketId,
      )
      .eq(
        "visitor_token_hash",
        accessTokenHash,
      )
      .maybeSingle();

  if (ticketError) {
    throw new Error(
      `Impossible de récupérer le ticket : ${ticketError.message}`,
    );
  }

  if (!ticket) {
    return null;
  }

  const {
    data: messages,
    error: messagesError,
  } =
    await admin
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
    throw new Error(
      `Impossible de récupérer les messages : ${messagesError.message}`,
    );
  }

  return {
    ticket,

    messages:
      (messages ?? []).map(
        formatMessage,
      ),
  };
}

/* =========================================================
   GET
   RÉCUPÉRER UNE CONVERSATION
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(request.url);

    const ticketId =
      cleanText(
        url.searchParams.get(
          "ticketId",
        ),
        MAX_TICKET_ID_LENGTH,
      );

    const accessToken =
      cleanText(
        url.searchParams.get(
          "accessToken",
        ),
        MAX_ACCESS_TOKEN_LENGTH,
      );

    if (
      !ticketId ||
      !accessToken
    ) {
      return errorResponse(
        "Référence de demande ou jeton d'accès manquant.",
        400,
      );
    }

    const result =
      await loadTicket(
        ticketId,
        accessToken,
      );

    if (!result) {
      return errorResponse(
        "Cette demande est introuvable ou le lien d'accès n'est plus valide.",
        404,
      );
    }

    return NextResponse.json(
      {
        success: true,

        ticket: {
          id:
            result.ticket.id,

          ticketNumber:
            result.ticket.ticket_number,

          customerName:
            result.ticket.customer_name,

          customerEmail:
            result.ticket.customer_email,

          customerPhone:
            result.ticket.customer_phone,

          category:
            result.ticket.category,

          subject:
            result.ticket.subject,

          status:
            result.ticket.status,

          priority:
            result.ticket.priority,

          assignedTo:
            result.ticket.assigned_to,

          createdAt:
            result.ticket.created_at,

          updatedAt:
            result.ticket.updated_at,

          lastMessageAt:
            result.ticket.last_message_at,
        },

        messages:
          result.messages,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "PHARMAFLOW SUPPORT GET ERROR:",
      error,
    );

    return errorResponse(
      "Impossible de charger votre conversation.",
      500,
      error instanceof Error
        ? error.message
        : undefined,
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    let body: {
      action?: unknown;

      name?: unknown;

      email?: unknown;

      phone?: unknown;

      category?: unknown;

      message?: unknown;

      ticketId?: unknown;

      accessToken?: unknown;
    };

    /* -----------------------------------------------------
       Lecture JSON
    ----------------------------------------------------- */

    try {
      body =
        await request.json();
    } catch {
      return errorResponse(
        "Requête JSON invalide.",
        400,
      );
    }

    const action =
      cleanText(
        body?.action,
        30,
      );

    /* =====================================================
       ACTION : CREATE
    ===================================================== */

    if (
      action === "create"
    ) {
      const name =
        cleanText(
          body?.name,
          MAX_NAME_LENGTH,
        );

      const email =
        normalizeEmail(
          body?.email,
        );

      const phone =
        cleanText(
          body?.phone,
          MAX_PHONE_LENGTH,
        );

      const category =
        normalizeCategory(
          body?.category,
        );

      const message =
        cleanText(
          body?.message,
          MAX_MESSAGE_LENGTH,
        );

      /* ---------------------------------------------------
         VALIDATION NOM
      --------------------------------------------------- */

      if (!name) {
        return errorResponse(
          "Veuillez indiquer votre nom.",
          400,
        );
      }

      /* ---------------------------------------------------
         VALIDATION CONTACT
      --------------------------------------------------- */

      if (
        !email &&
        !phone
      ) {
        return errorResponse(
          "Indiquez au moins votre e-mail ou votre téléphone.",
          400,
        );
      }

      if (
        email &&
        !isValidEmail(
          email,
        )
      ) {
        return errorResponse(
          "L'adresse e-mail n'est pas valide.",
          400,
        );
      }

      /* ---------------------------------------------------
         VALIDATION MESSAGE
      --------------------------------------------------- */

      if (!message) {
        return errorResponse(
          "Veuillez écrire votre message.",
          400,
        );
      }

      const admin =
        createAdminClient();

      const accessToken =
        generateAccessToken();

      const accessTokenHash =
        hashAccessToken(
          accessToken,
        );

      const ticketNumber =
        generateTicketNumber();

      const now =
        new Date().toISOString();

      /* ===================================================
         1. CRÉER LE TICKET
      =================================================== */

      const {
        data: ticket,
        error: ticketError,
      } =
        await admin
          .from(
            "support_tickets",
          )
          .insert({
            ticket_number:
              ticketNumber,

            customer_name:
              name,

            customer_email:
              email || null,

            customer_phone:
              phone || null,

            category,

            subject:
              message
                .replace(
                  /\s+/g,
                  " ",
                )
                .slice(
                  0,
                  120,
                ),

            status:
              "open",

            priority:
              "normal",

            visitor_token_hash:
              accessTokenHash,

            assigned_to:
              null,

            created_at:
              now,

            updated_at:
              now,

            last_message_at:
              now,
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

      if (
        ticketError ||
        !ticket
      ) {
        console.error(
          "PHARMAFLOW SUPPORT TICKET INSERT ERROR:",
          {
            code:
              ticketError?.code,

            message:
              ticketError?.message,

            details:
              ticketError?.details,

            hint:
              ticketError?.hint,
          },
        );

        return errorResponse(
          "Impossible de créer la demande de support.",
          500,
          ticketError
            ? {
                code:
                  ticketError.code,

                message:
                  ticketError.message,

                details:
                  ticketError.details,

                hint:
                  ticketError.hint,
              }
            : undefined,
        );
      }

      /* ===================================================
         2. ENREGISTRER LE PREMIER MESSAGE
      =================================================== */

      /*
       * IMPORTANT :
       *
       * On n'envoie PAS sender_id ici.
       *
       * Le visiteur n'est pas nécessairement connecté.
       * Si sender_id est nullable dans ta table,
       * PostgreSQL/Supabase utilisera NULL.
       *
       * Cela évite de créer un faux UUID ou de mettre
       * une donnée incorrecte dans sender_id.
       */

      const {
        error:
          messageError,
      } =
        await admin
          .from(
            "support_messages",
          )
          .insert({
            ticket_id:
              ticket.id,

            sender_type:
              "user",

            message,
          });

      if (
        messageError
      ) {
        console.error(
          "PHARMAFLOW SUPPORT MESSAGE INSERT ERROR:",
          {
            code:
              messageError.code,

            message:
              messageError.message,

            details:
              messageError.details,

            hint:
              messageError.hint,
          },
        );

        /*
         * Le ticket vient d'être créé mais son message
         * initial n'a pas été enregistré.
         *
         * On tente donc de supprimer le ticket pour
         * éviter de laisser un ticket vide.
         */

        const {
          error:
            rollbackError,
        } =
          await admin
            .from(
              "support_tickets",
            )
            .delete()
            .eq(
              "id",
              ticket.id,
            );

        if (
          rollbackError
        ) {
          console.error(
            "PHARMAFLOW SUPPORT ROLLBACK ERROR:",
            rollbackError,
          );
        }

        return errorResponse(
          "Impossible d'enregistrer le message initial.",
          500,
          {
            code:
              messageError.code,

            message:
              messageError.message,

            details:
              messageError.details,

            hint:
              messageError.hint,
          },
        );
      }

      /* ===================================================
         3. RÉPONSE CLIENT
      =================================================== */

      return NextResponse.json(
        {
          success: true,

          ticket: {
            id:
              ticket.id,

            ticketNumber:
              ticket.ticket_number,

            status:
              ticket.status,

            category:
              ticket.category,

            subject:
              ticket.subject,

            createdAt:
              ticket.created_at,
          },

          /*
           * Ce token permet au visiteur de continuer
           * la conversation sans compte.
           *
           * Le token original n'est jamais stocké en clair
           * dans la base.
           */

          accessToken,

          message: {
            sender:
              "user",

            text:
              message,
          },
        },
        {
          status: 201,
        },
      );
    }

    /* =====================================================
       ACTION : MESSAGE
       Ajouter un message à une conversation existante
    ===================================================== */

    if (
      action === "message"
    ) {
      const ticketId =
        cleanText(
          body?.ticketId,
          MAX_TICKET_ID_LENGTH,
        );

      const accessToken =
        cleanText(
          body?.accessToken,
          MAX_ACCESS_TOKEN_LENGTH,
        );

      const message =
        cleanText(
          body?.message,
          MAX_MESSAGE_LENGTH,
        );

      if (
        !ticketId
      ) {
        return errorResponse(
          "Identifiant de demande manquant.",
          400,
        );
      }

      if (
        !accessToken
      ) {
        return errorResponse(
          "Jeton d'accès manquant.",
          400,
        );
      }

      if (!message) {
        return errorResponse(
          "Veuillez écrire votre message.",
          400,
        );
      }

      /* ---------------------------------------------------
         Vérifier le ticket
      --------------------------------------------------- */

      const existingTicket =
        await loadTicket(
          ticketId,
          accessToken,
        );

      if (
        !existingTicket
      ) {
        return errorResponse(
          "Cette demande est introuvable ou le lien d'accès n'est plus valide.",
          404,
        );
      }

      const currentStatus =
        String(
          existingTicket
            .ticket
            .status ??
            "",
        ).toLowerCase();

      if (
        currentStatus ===
          "closed" ||
        currentStatus ===
          "cancelled"
      ) {
        return errorResponse(
          "Cette demande est clôturée. Veuillez ouvrir une nouvelle demande.",
          409,
        );
      }

      const admin =
        createAdminClient();

      const now =
        new Date().toISOString();

      /* ---------------------------------------------------
         Enregistrer le nouveau message
      --------------------------------------------------- */

      const {
        data:
          insertedMessage,
        error:
          messageError,
      } =
        await admin
          .from(
            "support_messages",
          )
          .insert({
            ticket_id:
              ticketId,

            sender_type:
              "user",

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

      if (
        messageError ||
        !insertedMessage
      ) {
        console.error(
          "PHARMAFLOW SUPPORT MESSAGE ERROR:",
          {
            code:
              messageError?.code,

            message:
              messageError?.message,

            details:
              messageError?.details,

            hint:
              messageError?.hint,
          },
        );

        return errorResponse(
          "Impossible d'envoyer votre message.",
          500,
          messageError
            ? {
                code:
                  messageError.code,

                message:
                  messageError.message,

                details:
                  messageError.details,

                hint:
                  messageError.hint,
              }
            : undefined,
        );
      }

      /* ---------------------------------------------------
         Actualiser le ticket
      --------------------------------------------------- */

      const {
        error:
          updateError,
      } =
        await admin
          .from(
            "support_tickets",
          )
          .update({
            status:
              "open",

            updated_at:
              now,

            last_message_at:
              now,
          })
          .eq(
            "id",
            ticketId,
          )
          .eq(
            "visitor_token_hash",
            hashAccessToken(
              accessToken,
            ),
          );

      if (
        updateError
      ) {
        console.error(
          "PHARMAFLOW SUPPORT TICKET UPDATE ERROR:",
          {
            code:
              updateError.code,

            message:
              updateError.message,

            details:
              updateError.details,

            hint:
              updateError.hint,
          },
        );

        /*
         * Le message a déjà été enregistré.
         * On ne le supprime pas ici.
         *
         * Le client doit savoir que son message existe.
         */
      }

      return NextResponse.json(
        {
          success: true,

          message:
            formatMessage(
              insertedMessage,
            ),

          ticket: {
            id:
              existingTicket
                .ticket
                .id,

            ticketNumber:
              existingTicket
                .ticket
                .ticket_number,

            status:
              updateError
                ? existingTicket
                    .ticket
                    .status
                : "open",

            updatedAt:
              now,
          },
        },
        {
          status: 201,
        },
      );
    }

    /* =====================================================
       ACTION INCONNUE
    ===================================================== */

    return errorResponse(
      "Action support inconnue.",
      400,
    );
  } catch (error) {
    console.error(
      "PHARMAFLOW SUPPORT TICKETS ROUTE ERROR:",
      error,
    );

    return errorResponse(
      "Une erreur est survenue dans le système de support.",
      500,
      error instanceof Error
        ? error.message
        : undefined,
    );
  }
}