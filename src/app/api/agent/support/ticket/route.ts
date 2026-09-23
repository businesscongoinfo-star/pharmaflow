import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAgent } from "@/app/lib/agent/auth";

function hasPermission(
  permissions: Record<string, boolean>,
  permission: string,
) {
  return permissions?.[permission] === true;
}

function createVisitorToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashVisitorToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
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
      .from("support_tickets")
      .select(`
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
      `)
      .order("last_message_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "[AGENT SUPPORT TICKET GET]",
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
      "[AGENT SUPPORT TICKET GET]",
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
| POST
|--------------------------------------------------------------------------
| Création d'un ticket support.
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest,
) {
  try {
    const member = await requireAgent();

    const permissions = member.permissions ?? {};

    const canManage =
      hasPermission(
        permissions,
        "support.manage",
      );

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
        customer_name?: string;
        customer_email?: string | null;
        customer_phone?: string | null;
        category?: string;
        subject?: string | null;
        priority?: string;
      };

    const customerName =
      body.customer_name?.trim();

    const category =
      body.category?.trim();

    if (!customerName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom du client est obligatoire.",
        },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La catégorie est obligatoire.",
        },
        { status: 400 },
      );
    }

    const visitorToken =
      createVisitorToken();

    const visitorTokenHash =
      hashVisitorToken(visitorToken);

    const supabase = createAdminClient();

    const ticketNumber =
      `TKT-${Date.now()}`;

    const now =
      new Date().toISOString();

    const { data, error } =
      await supabase
        .from("support_tickets")
        .insert({
          ticket_number: ticketNumber,
          customer_name: customerName,
          customer_email:
            body.customer_email?.trim() ||
            null,
          customer_phone:
            body.customer_phone?.trim() ||
            null,
          category,
          subject:
            body.subject?.trim() || null,
          status: "open",
          priority:
            body.priority || "medium",
          visitor_token_hash:
            visitorTokenHash,
          assigned_to: member.id,
          created_at: now,
          updated_at: now,
          last_message_at: now,
        })
        .select(`
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
        `)
        .single();

    if (error) {
      console.error(
        "[AGENT SUPPORT TICKET POST]",
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

    return NextResponse.json(
      {
        success: true,
        message:
          "Ticket créé avec succès.",
        data,
        visitor_token:
          visitorToken,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[AGENT SUPPORT TICKET POST]",
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