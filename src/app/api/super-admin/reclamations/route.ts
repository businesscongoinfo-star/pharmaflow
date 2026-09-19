import { NextResponse } from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperAdminApi } from "@/app/lib/super-admin/auth";

type ReclamationStatus =
  | "open"
  | "in_progress"
  | "waiting_client"
  | "resolved"
  | "closed";

type ReclamationPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

function normalizeStatus(
  value: unknown,
): ReclamationStatus | null {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status === "open" ||
    status === "in_progress" ||
    status === "waiting_client" ||
    status === "resolved" ||
    status === "closed"
  ) {
    return status;
  }

  return null;
}

function normalizePriority(
  value: unknown,
): ReclamationPriority | null {
  const priority = String(value || "")
    .trim()
    .toLowerCase();

  if (
    priority === "low" ||
    priority === "normal" ||
    priority === "high" ||
    priority === "urgent"
  ) {
    return priority;
  }

  return null;
}

function jsonError(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    },
  );
}

/**
 * ============================================================
 * GET
 * ============================================================
 *
 * Liste les réclamations.
 *
 * ?id=xxx
 *     → détail d'une réclamation
 *
 * sans id
 *     → liste
 */
export async function GET(
  request: Request,
) {
  const superAdmin =
    await requireSuperAdminApi();

  if (!superAdmin) {
    return jsonError(
      "Accès Super Admin requis.",
      401,
    );
  }

  const url = new URL(request.url);

  const id =
    url.searchParams.get("id");

  const search =
    url.searchParams.get("search")?.trim() ||
    "";

  const status =
    normalizeStatus(
      url.searchParams.get("status"),
    );

  const supabase =
    createAdminClient();

  /**
   * ==========================================================
   * DÉTAIL
   * ==========================================================
   */
  if (id) {
    const {
      data: reclamation,
      error: reclamationError,
    } = await supabase
      .from("reclamations")
      .select(
        `
        id,
        reference,
        pharmacy_id,
        client_user_id,
        client_name,
        client_phone,
        client_email,
        subject,
        message,
        status,
        priority,
        admin_reply,
        resolution,
        created_at,
        updated_at,
        resolved_at,
        closed_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (reclamationError) {
      return jsonError(
        reclamationError.message,
        500,
      );
    }

    if (!reclamation) {
      return jsonError(
        "Réclamation introuvable.",
        404,
      );
    }

    const [
      messagesResult,
      notificationsResult,
    ] = await Promise.all([
      supabase
        .from("reclamation_messages")
        .select(
          `
          id,
          reclamation_id,
          sender_user_id,
          sender_type,
          message,
          created_at
          `,
        )
        .eq(
          "reclamation_id",
          id,
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        ),

      supabase
        .from(
          "reclamation_notifications",
        )
        .select(
          `
          id,
          reclamation_id,
          recipient_user_id,
          channel,
          notification_type,
          message,
          sent_at,
          created_at
          `,
        )
        .eq(
          "reclamation_id",
          id,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),
    ]);

    if (messagesResult.error) {
      return jsonError(
        messagesResult.error.message,
        500,
      );
    }

    if (
      notificationsResult.error
    ) {
      return jsonError(
        notificationsResult.error.message,
        500,
      );
    }

    return NextResponse.json({
      success: true,
      reclamation,
      messages:
        messagesResult.data || [],
      notifications:
        notificationsResult.data || [],
    });
  }

  /**
   * ==========================================================
   * LISTE
   * ==========================================================
   */
  let query = supabase
    .from("reclamations")
    .select(
      `
      id,
      reference,
      pharmacy_id,
      client_user_id,
      client_name,
      client_phone,
      client_email,
      subject,
      message,
      status,
      priority,
      admin_reply,
      resolution,
      created_at,
      updated_at,
      resolved_at,
      closed_at
      `,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(500);

  if (status) {
    query = query.eq(
      "status",
      status,
    );
  }

  if (search) {
    const escaped =
      search
        .replace(/[%_]/g, "\\$&")
        .replace(/,/g, "");

    query = query.or(
      [
        `reference.ilike.%${escaped}%`,
        `client_name.ilike.%${escaped}%`,
        `client_phone.ilike.%${escaped}%`,
        `client_email.ilike.%${escaped}%`,
        `subject.ilike.%${escaped}%`,
      ].join(","),
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    return jsonError(
      error.message,
      500,
    );
  }

  return NextResponse.json({
    success: true,
    reclamations:
      data || [],
  });
}

/**
 * ============================================================
 * POST
 * ============================================================
 *
 * Actions Super Admin :
 *
 * action:
 *   status
 *   reply
 *   priority
 *   resolution
 */
export async function POST(
  request: Request,
) {
  const superAdmin =
    await requireSuperAdminApi();

  if (!superAdmin) {
    return jsonError(
      "Accès Super Admin requis.",
      401,
    );
  }

  let body: Record<
    string,
    unknown
  >;

  try {
    body =
      (await request.json()) as Record<
        string,
        unknown
      >;
  } catch {
    return jsonError(
      "Corps JSON invalide.",
      400,
    );
  }

  const reclamationId =
    typeof body.reclamationId ===
    "string"
      ? body.reclamationId.trim()
      : "";

  const action =
    typeof body.action ===
    "string"
      ? body.action.trim()
      : "";

  if (!reclamationId) {
    return jsonError(
      "Identifiant de réclamation manquant.",
    );
  }

  if (!action) {
    return jsonError(
      "Action manquante.",
    );
  }

  const supabase =
    createAdminClient();

  const {
    data: reclamation,
    error: reclamationError,
  } = await supabase
    .from("reclamations")
    .select(
      `
      id,
      reference,
      pharmacy_id,
      client_user_id,
      client_name,
      client_phone,
      client_email,
      subject,
      message,
      status,
      priority,
      admin_reply,
      resolution
      `,
    )
    .eq(
      "id",
      reclamationId,
    )
    .maybeSingle();

  if (reclamationError) {
    return jsonError(
      reclamationError.message,
      500,
    );
  }

  if (!reclamation) {
    return jsonError(
      "Réclamation introuvable.",
      404,
    );
  }

  /**
   * ==========================================================
   * CHANGEMENT DE STATUT
   * ==========================================================
   */
  if (action === "status") {
    const newStatus =
      normalizeStatus(
        body.status,
      );

    if (!newStatus) {
      return jsonError(
        "Statut invalide.",
      );
    }

    const now =
      new Date().toISOString();

    const updateData: Record<
      string,
      unknown
    > = {
      status: newStatus,
      updated_at: now,
    };

    if (
      newStatus === "resolved"
    ) {
      updateData.resolved_at =
        now;
    }

    if (
      newStatus === "closed"
    ) {
      updateData.closed_at =
        now;
    }

    if (
      newStatus !== "resolved" &&
      newStatus !== "closed"
    ) {
      updateData.resolved_at =
        null;

      updateData.closed_at =
        null;
    }

    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from("reclamations")
      .update(updateData)
      .eq(
        "id",
        reclamationId,
      )
      .select()
      .single();

    if (updateError) {
      return jsonError(
        updateError.message,
        500,
      );
    }

    /**
     * Historique
     */
    const statusMessages: Record<
      ReclamationStatus,
      string
    > = {
      open:
        "Votre réclamation a été enregistrée.",
      in_progress:
        "Votre réclamation est maintenant en cours de traitement.",
      waiting_client:
        "Nous attendons une information ou une réponse de votre part.",
      resolved:
        "Votre réclamation a été résolue.",
      closed:
        "Votre réclamation a été clôturée.",
    };

    const notificationMessage =
      `${reclamation.reference} : ` +
      statusMessages[newStatus];

    await supabase
      .from("reclamation_messages")
      .insert({
        reclamation_id:
          reclamationId,
        sender_user_id:
          superAdmin.user_id,
        sender_type:
          "system",
        message:
          notificationMessage,
      });

    /**
     * Notification dans l'application
     */
    if (
      reclamation.client_user_id
    ) {
      await supabase
        .from(
          "reclamation_notifications",
        )
        .insert({
          reclamation_id:
            reclamationId,
          recipient_user_id:
            reclamation.client_user_id,
          channel:
            "in_app",
          notification_type:
            "status_changed",
          message:
            notificationMessage,
          sent_at:
            now,
        });
    }

    return NextResponse.json({
      success: true,
      message:
        "Statut de la réclamation mis à jour.",
      reclamation: updated,
    });
  }

  /**
   * ==========================================================
   * RÉPONSE ADMIN
   * ==========================================================
   */
  if (action === "reply") {
    const reply =
      typeof body.reply ===
      "string"
        ? body.reply.trim()
        : "";

    if (!reply) {
      return jsonError(
        "La réponse ne peut pas être vide.",
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from("reclamations")
      .update({
        admin_reply:
          reply,
        status:
          "in_progress",
        updated_at:
          now,
      })
      .eq(
        "id",
        reclamationId,
      )
      .select()
      .single();

    if (updateError) {
      return jsonError(
        updateError.message,
        500,
      );
    }

    /**
     * Historique de conversation
     */
    await supabase
      .from("reclamation_messages")
      .insert({
        reclamation_id:
          reclamationId,
        sender_user_id:
          superAdmin.user_id,
        sender_type:
          "admin",
        message:
          reply,
      });

    /**
     * Notification client
     */
    if (
      reclamation.client_user_id
    ) {
      await supabase
        .from(
          "reclamation_notifications",
        )
        .insert({
          reclamation_id:
            reclamationId,
          recipient_user_id:
            reclamation.client_user_id,
          channel:
            "in_app",
          notification_type:
            "admin_reply",
          message:
            `Réponse du support concernant ${reclamation.reference} : ${reply}`,
          sent_at:
            now,
        });
    }

    return NextResponse.json({
      success: true,
      message:
        "Réponse envoyée au dossier.",
      reclamation: updated,
    });
  }

  /**
   * ==========================================================
   * PRIORITÉ
   * ==========================================================
   */
  if (action === "priority") {
    const priority =
      normalizePriority(
        body.priority,
      );

    if (!priority) {
      return jsonError(
        "Priorité invalide.",
      );
    }

    const {
      data: updated,
      error,
    } = await supabase
      .from("reclamations")
      .update({
        priority,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        reclamationId,
      )
      .select()
      .single();

    if (error) {
      return jsonError(
        error.message,
        500,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Priorité modifiée.",
      reclamation: updated,
    });
  }

  /**
   * ==========================================================
   * RÉSOLUTION
   * ==========================================================
   */
  if (action === "resolution") {
    const resolution =
      typeof body.resolution ===
      "string"
        ? body.resolution.trim()
        : "";

    if (!resolution) {
      return jsonError(
        "La résolution ne peut pas être vide.",
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updated,
      error,
    } = await supabase
      .from("reclamations")
      .update({
        resolution,
        status:
          "resolved",
        resolved_at:
          now,
        updated_at:
          now,
      })
      .eq(
        "id",
        reclamationId,
      )
      .select()
      .single();

    if (error) {
      return jsonError(
        error.message,
        500,
      );
    }

    const resolutionMessage =
      `Réclamation ${reclamation.reference} résolue.\n\n${resolution}`;

    await supabase
      .from("reclamation_messages")
      .insert({
        reclamation_id:
          reclamationId,
        sender_user_id:
          superAdmin.user_id,
        sender_type:
          "admin",
        message:
          resolutionMessage,
      });

    if (
      reclamation.client_user_id
    ) {
      await supabase
        .from(
          "reclamation_notifications",
        )
        .insert({
          reclamation_id:
            reclamationId,
          recipient_user_id:
            reclamation.client_user_id,
          channel:
            "in_app",
          notification_type:
            "reclamation_resolved",
          message:
            `Votre réclamation ${reclamation.reference} a été résolue : ${resolution}`,
          sent_at:
            now,
        });
    }

    return NextResponse.json({
      success: true,
      message:
        "Réclamation résolue.",
      reclamation: updated,
    });
  }

  return jsonError(
    "Action non reconnue.",
    400,
  );
}