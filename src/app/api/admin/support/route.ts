import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAdmin } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

type SupportStatus =
  | "open"
  | "pending"
  | "closed";

type SupportCategory =
  | "general"
  | "payment"
  | "technical"
  | "complaint"
  | "commercial";

type SupportBody = {
  action?: "reply" | "status";
  ticketId?: string;
  message?: string;
  status?: SupportStatus;
};

type AuthProfile = {
  id: string;
  role: string;
  pharmacy_id: string | null;
};

type AdminSupportTicket = {
  id: string;
  ticket_number: string;
  status: string;
  category: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  subject: string | null;
  priority: string | null;
  created_at: string;
  last_message_at: string | null;
};

type SupportTicketStatus = {
  id: string;
  status: SupportStatus;
};

type AdminSupportMessage = {
  id: string;
  ticket_id: string;
  sender_type: string;
  message: string;
  created_at: string;
};

/**
 * =========================================================
 * UTILITAIRES
 * =========================================================
 */

function clean(
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

function isSupportStatus(
  value: string,
): value is SupportStatus {
  return (
    value === "open" ||
    value === "pending" ||
    value === "closed"
  );
}

function isSupportCategory(
  value: string,
): value is SupportCategory {
  return (
    value === "general" ||
    value === "payment" ||
    value === "technical" ||
    value === "complaint" ||
    value === "commercial"
  );
}

/**
 * =========================================================
 * AUTHENTIFICATION ADMIN
 * =========================================================
 */

async function requireAdmin() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options,
                );
              },
            );
          } catch {
            // Aucun traitement nécessaire ici.
            // Les cookies peuvent être en lecture seule
            // selon le contexte Next.js.
          }
        },
      },
    },
  );

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  const user = authData?.user;

  if (authError || !user) {
    return {
      authorized: false as const,
      response: Response.json(
        {
          error:
            "Vous devez être connecté.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id,role,pharmacy_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profileData
  ) {
    return {
      authorized: false as const,
      response: Response.json(
        {
          error:
            "Profil administrateur introuvable.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  const profile =
    profileData as unknown as AuthProfile;

  if (
    profile.role !== "owner" &&
    profile.role !== "admin"
  ) {
    return {
      authorized: false as const,
      response: Response.json(
        {
          error:
            "Accès réservé aux administrateurs.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  return {
    authorized: true as const,
    user,
    profile,
  };
}

/**
 * =========================================================
 * GET
 *
 * GET /api/admin/support
 * → liste des tickets
 *
 * GET /api/admin/support?ticketId=ID
 * → ticket + conversation
 * =========================================================
 */

export async function GET(
  request: Request,
) {
  try {
    const auth =
      await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    const url =
      new URL(request.url);

    const ticketId = clean(
      url.searchParams.get(
        "ticketId",
      ),
      100,
    );

    const status = clean(
      url.searchParams.get(
        "status",
      ),
      30,
    );

    const category = clean(
      url.searchParams.get(
        "category",
      ),
      30,
    );

    /**
     * =====================================================
     * TICKET UNIQUE + MESSAGES
     * =====================================================
     */

    if (ticketId) {
      const {
        data: ticketData,
        error: ticketError,
      } =
        await supabaseAdmin
          .from(
            "support_tickets",
          )
          .select(
            [
              "id",
              "ticket_number",
              "status",
              "category",
              "customer_name",
              "customer_email",
              "customer_phone",
              "subject",
              "priority",
              "created_at",
              "last_message_at",
            ].join(","),
          )
          .eq(
            "id",
            ticketId,
          )
          .maybeSingle();

      if (
        ticketError ||
        !ticketData
      ) {
        console.error(
          "ADMIN SUPPORT TICKET ERROR:",
          ticketError,
        );

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

      const ticket =
        ticketData as unknown as AdminSupportTicket;

      const {
        data: messagesData,
        error: messagesError,
      } =
        await supabaseAdmin
          .from(
            "support_messages",
          )
          .select(
            [
              "id",
              "ticket_id",
              "sender_type",
              "message",
              "created_at",
            ].join(","),
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

      if (
        messagesError
      ) {
        console.error(
          "ADMIN SUPPORT MESSAGES ERROR:",
          messagesError,
        );

        return Response.json(
          {
            error:
              "Impossible de récupérer la conversation.",
          },
          {
            status: 500,
          },
        );
      }

      const messages =
        (messagesData || []) as unknown as AdminSupportMessage[];

      return Response.json({
        success: true,

        ticket,

        messages:
          messages.map(
            (message) => ({
              id: message.id,
              ticketId:
                message.ticket_id,
              senderType:
                message.sender_type,
              message:
                message.message,
              createdAt:
                message.created_at,
            }),
          ),
      });
    }

    /**
     * =====================================================
     * LISTE DES TICKETS
     * =====================================================
     */

    let query =
      supabaseAdmin
        .from(
          "support_tickets",
        )
        .select(
          [
            "id",
            "ticket_number",
            "status",
            "category",
            "customer_name",
            "customer_email",
            "customer_phone",
            "subject",
            "priority",
            "created_at",
            "last_message_at",
          ].join(","),
        )
        .order(
          "last_message_at",
          {
            ascending: false,
            nullsFirst: false,
          },
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

    if (
      isSupportStatus(status)
    ) {
      query =
        query.eq(
          "status",
          status,
        );
    }

    if (
      isSupportCategory(category)
    ) {
      query =
        query.eq(
          "category",
          category,
        );
    }

    const {
      data: ticketsData,
      error: ticketsError,
    } = await query;

    if (ticketsError) {
      console.error(
        "ADMIN SUPPORT LIST ERROR:",
        ticketsError,
      );

      return Response.json(
        {
          error:
            "Impossible de récupérer les demandes de support.",
        },
        {
          status: 500,
        },
      );
    }

    const tickets =
      (ticketsData || []) as unknown as AdminSupportTicket[];

    return Response.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error(
      "ADMIN SUPPORT GET ERROR:",
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

/**
 * =========================================================
 * POST
 *
 * Répondre à un ticket.
 *
 * POST /api/admin/support
 * {
 *   action: "reply",
 *   ticketId: "...",
 *   message: "..."
 * }
 * =========================================================
 */

export async function POST(
  request: Request,
) {
  try {
    const auth =
      await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    let body: SupportBody;

    try {
      body =
        (await request.json()) as SupportBody;
    } catch {
      return Response.json(
        {
          error:
            "Données JSON invalides.",
        },
        {
          status: 400,
        },
      );
    }

    const action =
      body.action || "reply";

    if (action !== "reply") {
      return Response.json(
        {
          error:
            "Action non supportée.",
        },
        {
          status: 400,
        },
      );
    }

    const ticketId =
      clean(
        body.ticketId,
        100,
      );

    const message =
      clean(
        body.message,
        5000,
      );

    if (!ticketId) {
      return Response.json(
        {
          error:
            "Le ticket est obligatoire.",
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
            "Le message est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================================
     * VÉRIFICATION DU TICKET
     * =====================================================
     */

    const {
      data: ticketData,
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
        .maybeSingle();

    if (
      ticketError ||
      !ticketData
    ) {
      console.error(
        "ADMIN SUPPORT TICKET CHECK ERROR:",
        ticketError,
      );

      return Response.json(
        {
          error:
            "Ticket introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    const ticket =
      ticketData as unknown as SupportTicketStatus;

    /**
     * Si le ticket est fermé,
     * une nouvelle réponse le rouvre.
     */

    const newStatus: SupportStatus =
      ticket.status === "closed"
        ? "open"
        : ticket.status;

    /**
     * =====================================================
     * ENREGISTRER LA RÉPONSE DE L'ADMIN
     * =====================================================
     */

    const {
      data: messageData,
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
            "agent",
          message,
        })
        .select(
          "id,ticket_id,sender_type,message,created_at",
        )
        .single();

    if (
      messageError ||
      !messageData
    ) {
      console.error(
        "ADMIN SUPPORT REPLY ERROR:",
        messageError,
      );

      return Response.json(
        {
          error:
            "Impossible d'envoyer la réponse.",
        },
        {
          status: 500,
        },
      );
    }

    const createdMessage =
      messageData as unknown as AdminSupportMessage;

    /**
     * =====================================================
     * METTRE À JOUR LE TICKET
     * =====================================================
     */

    const {
      data: updatedTicketData,
      error: updateError,
    } =
      await supabaseAdmin
        .from(
          "support_tickets",
        )
        .update({
          status:
            newStatus,
          last_message_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          ticket.id,
        )
        .select(
          [
            "id",
            "ticket_number",
            "status",
            "category",
            "customer_name",
            "customer_email",
            "customer_phone",
            "subject",
            "priority",
            "created_at",
            "last_message_at",
          ].join(","),
        )
        .single();

    if (updateError) {
      console.error(
        "ADMIN SUPPORT UPDATE ERROR:",
        updateError,
      );

      /**
       * La réponse a déjà été enregistrée.
       * On ne la supprime pas automatiquement.
       * Le ticket pourra être synchronisé lors
       * du prochain chargement.
       */
    }

    const updatedTicket =
      updatedTicketData
        ? (updatedTicketData as unknown as AdminSupportTicket)
        : null;

    return Response.json({
      success: true,

      message: {
        id:
          createdMessage.id,

        ticketId:
          createdMessage.ticket_id,

        senderType:
          createdMessage.sender_type,

        message:
          createdMessage.message,

        createdAt:
          createdMessage.created_at,
      },

      ticket:
        updatedTicket,
    });
  } catch (error) {
    console.error(
      "ADMIN SUPPORT POST ERROR:",
      error,
    );

    return Response.json(
      {
        error:
          "Impossible d'envoyer la réponse.",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * =========================================================
 * PATCH
 *
 * Modifier le statut d'un ticket.
 *
 * PATCH /api/admin/support
 * {
 *   ticketId: "...",
 *   status: "closed"
 * }
 * =========================================================
 */

export async function PATCH(
  request: Request,
) {
  try {
    const auth =
      await requireAdmin();

    if (!auth.authorized) {
      return auth.response;
    }

    let body: SupportBody;

    try {
      body =
        (await request.json()) as SupportBody;
    } catch {
      return Response.json(
        {
          error:
            "Données JSON invalides.",
        },
        {
          status: 400,
        },
      );
    }

    const ticketId =
      clean(
        body.ticketId,
        100,
      );

    const statusValue =
      clean(
        body.status,
        30,
      );

    if (!ticketId) {
      return Response.json(
        {
          error:
            "Le ticket est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isSupportStatus(
        statusValue,
      )
    ) {
      return Response.json(
        {
          error:
            "Statut de ticket invalide.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================================
     * MISE À JOUR DU STATUT
     * =====================================================
     */

    const {
      data: ticketData,
      error: updateError,
    } =
      await supabaseAdmin
        .from(
          "support_tickets",
        )
        .update({
          status:
            statusValue,
          last_message_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          ticketId,
        )
        .select(
          [
            "id",
            "ticket_number",
            "status",
            "category",
            "customer_name",
            "customer_email",
            "customer_phone",
            "subject",
            "priority",
            "created_at",
            "last_message_at",
          ].join(","),
        )
        .single();

    if (
      updateError ||
      !ticketData
    ) {
      console.error(
        "ADMIN SUPPORT STATUS ERROR:",
        updateError,
      );

      return Response.json(
        {
          error:
            "Impossible de modifier le statut du ticket.",
        },
        {
          status: 500,
        },
      );
    }

    const ticket =
      ticketData as unknown as AdminSupportTicket;

    return Response.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error(
      "ADMIN SUPPORT PATCH ERROR:",
      error,
    );

    return Response.json(
      {
        error:
          "Impossible de modifier le ticket.",
      },
      {
        status: 500,
      },
    );
  }
}