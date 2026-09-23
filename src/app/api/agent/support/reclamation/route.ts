import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAgent } from "@/app/lib/agent/auth";

type ReclamationUpdate = {
  status?: string;
  priority?: string;
  admin_reply?: string | null;
  resolution?: string | null;
};

const ALLOWED_STATUSES = [
  "new",
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
];

const ALLOWED_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
];

function hasPermission(
  permissions: Record<string, boolean>,
  permission: string,
) {
  return permissions?.[permission] === true;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Récupère les réclamations existantes.
*/

export async function GET() {
  try {
    const member = await requireAgent();

    const permissions = member.permissions ?? {};

    const canView =
      hasPermission(permissions, "support.view") ||
      hasPermission(permissions, "support.manage");

    if (!canView) {
      return NextResponse.json(
        {
          success: false,
          error: "Accès refusé.",
        },
        { status: 403 },
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("reclamations")
      .select(`
        id,
        reference,
        pharmacy_id,
        client_user_id,
        client_name,
        client_phone,
        client_email,
        subject,
        status,
        priority,
        admin_reply,
        resolution,
        created_at,
        updated_at,
        resolved_at,
        closed_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "[AGENT SUPPORT RECLAMATION GET]",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (error) {
    console.error(
      "[AGENT SUPPORT RECLAMATION GET]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne.",
      },
      { status: 500 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
| Modification d'une réclamation par un agent.
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: NextRequest,
) {
  try {
    const member = await requireAgent();

    const permissions = member.permissions ?? {};

    const canManage =
      hasPermission(permissions, "support.manage");

    if (!canManage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous ne disposez pas de la permission support.manage.",
        },
        { status: 403 },
      );
    }

    const body =
      (await request.json()) as {
        reclamationId?: string;
        status?: string;
        priority?: string;
        admin_reply?: string | null;
        resolution?: string | null;
      };

    const reclamationId =
      body.reclamationId?.trim();

    if (!reclamationId) {
      return NextResponse.json(
        {
          success: false,
          error: "reclamationId est obligatoire.",
        },
        { status: 400 },
      );
    }

    const update: ReclamationUpdate = {};

    if (body.status !== undefined) {
      if (
        !ALLOWED_STATUSES.includes(
          body.status,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Statut de réclamation invalide.",
          },
          { status: 400 },
        );
      }

      update.status = body.status;
    }

    if (body.priority !== undefined) {
      if (
        !ALLOWED_PRIORITIES.includes(
          body.priority,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Priorité invalide.",
          },
          { status: 400 },
        );
      }

      update.priority = body.priority;
    }

    if (
      body.admin_reply !== undefined
    ) {
      update.admin_reply =
        body.admin_reply?.trim() || null;
    }

    if (
      body.resolution !== undefined
    ) {
      update.resolution =
        body.resolution?.trim() || null;
    }

    if (
      update.status === "resolved"
    ) {
      update.resolution =
        update.resolution ?? null;
    }

    const supabase = createAdminClient();

    const { data: current, error: currentError } =
      await supabase
        .from("reclamations")
        .select(`
          id,
          status,
          resolved_at,
          closed_at
        `)
        .eq("id", reclamationId)
        .maybeSingle();

    if (currentError) {
      return NextResponse.json(
        {
          success: false,
          error: currentError.message,
        },
        { status: 500 },
      );
    }

    if (!current) {
      return NextResponse.json(
        {
          success: false,
          error: "Réclamation introuvable.",
        },
        { status: 404 },
      );
    }

    if (
      update.status === "resolved"
    ) {
      (
        update as Record<string, unknown>
      ).resolved_at =
        new Date().toISOString();

      (
        update as Record<string, unknown>
      ).closed_at = null;
    }

    if (
      update.status === "closed"
    ) {
      (
        update as Record<string, unknown>
      ).closed_at =
        new Date().toISOString();

      if (!current.resolved_at) {
        (
          update as Record<string, unknown>
        ).resolved_at =
          new Date().toISOString();
      }
    }

    if (
      update.status &&
      update.status !== "resolved" &&
      update.status !== "closed"
    ) {
      (
        update as Record<string, unknown>
      ).resolved_at = null;

      (
        update as Record<string, unknown>
      ).closed_at = null;
    }

    const { data, error } =
      await supabase
        .from("reclamations")
        .update({
          ...update,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", reclamationId)
        .select(`
          id,
          reference,
          pharmacy_id,
          client_user_id,
          client_name,
          client_phone,
          client_email,
          subject,
          status,
          priority,
          admin_reply,
          resolution,
          created_at,
          updated_at,
          resolved_at,
          closed_at
        `)
        .single();

    if (error) {
      console.error(
        "[AGENT SUPPORT RECLAMATION PATCH]",
        error,
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Réclamation mise à jour avec succès.",
      data,
    });
  } catch (error) {
    console.error(
      "[AGENT SUPPORT RECLAMATION PATCH]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne.",
      },
      { status: 500 },
    );
  }
}