import { NextRequest, NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/app/lib/super-admin/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

type RequestBody = {
  pharmacyId?: unknown;
  enabled?: unknown;
  until?: unknown;
  reason?: unknown;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

export async function POST(
  request: NextRequest,
) {
  /*
   * ============================================================
   * 1. VÉRIFICATION SUPER ADMIN
   * ============================================================
   */

  const admin =
    await requireSuperAdminApi();

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        error: "Accès non autorisé.",
      },
      {
        status: 401,
      },
    );
  }

  /*
   * ============================================================
   * 2. LECTURE DE LA REQUÊTE
   * ============================================================
   */

  let body: RequestBody;

  try {
    body =
      (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Données JSON invalides.",
      },
      {
        status: 400,
      },
    );
  }

  const pharmacyId =
    normalizeText(
      body.pharmacyId,
    );

  const enabled =
    normalizeBoolean(
      body.enabled,
    );

  const until =
    normalizeText(
      body.until,
    );

  const reason =
    normalizeText(
      body.reason,
    );

  /*
   * ============================================================
   * 3. VALIDATION
   * ============================================================
   */

  if (!pharmacyId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "L'identifiant de la pharmacie est obligatoire.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * Si on active l'accès manuel, une date de fin
   * et un motif sont obligatoires.
   */

  if (enabled && !until) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Une date de fin est obligatoire pour l'accès manuel.",
      },
      {
        status: 400,
      },
    );
  }

  if (enabled && !reason) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Le motif de l'activation manuelle est obligatoire.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * ============================================================
   * 4. VALIDATION DE LA DATE
   * ============================================================
   */

  let manualAccessUntil:
    | string
    | null = null;

  if (enabled) {
    const parsedDate =
      new Date(until);

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La date de fin de l'accès manuel est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * L'accès manuel doit toujours être dans le futur.
     */

    if (
      parsedDate.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La date de fin doit être dans le futur.",
        },
        {
          status: 400,
        },
      );
    }

    manualAccessUntil =
      parsedDate.toISOString();
  }

  /*
   * ============================================================
   * 5. CLIENT ADMIN SUPABASE
   * ============================================================
   */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "SUPER ADMIN MANUAL ACCESS - ADMIN CLIENT:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "La configuration serveur Supabase est incomplète.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 6. RÉCUPÉRATION DE LA PHARMACIE
   * ============================================================
   */

  const {
    data: pharmacy,
    error: pharmacyError,
  } =
    await supabaseAdmin
      .from("pharmacies")
      .select(
        `
          id,
          name,
          status,
          manual_access_enabled,
          manual_access_until,
          manual_access_reason,
          manual_access_by
        `,
      )
      .eq(
        "id",
        pharmacyId,
      )
      .maybeSingle();

  if (pharmacyError) {
    console.error(
      "SUPER ADMIN MANUAL ACCESS - FETCH:",
      pharmacyError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de récupérer la pharmacie.",
      },
      {
        status: 500,
      },
    );
  }

  if (!pharmacy) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Pharmacie introuvable.",
      },
      {
        status: 404,
      },
    );
  }

  /*
   * ============================================================
   * 7. ANCIEN ÉTAT
   * ============================================================
   */

  const oldEnabled =
    Boolean(
      pharmacy.manual_access_enabled,
    );

  const oldUntil =
    pharmacy.manual_access_until ??
    null;

  /*
   * ============================================================
   * 8. NOUVEL ÉTAT
   * ============================================================
   */

  const newEnabled =
    enabled;

  const newUntil =
    enabled
      ? manualAccessUntil
      : null;

  const newReason =
    enabled
      ? reason
      : null;

  /*
   * ============================================================
   * 9. MISE À JOUR DE LA PHARMACIE
   * ============================================================
   */

  const {
    data: updatedPharmacy,
    error: updateError,
  } =
    await supabaseAdmin
      .from("pharmacies")
      .update({
        manual_access_enabled:
          newEnabled,

        manual_access_until:
          newUntil,

        manual_access_reason:
          newReason,

        manual_access_by:
          newEnabled
            ? admin.user_id
            : null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        pharmacyId,
      )
      .select(
        `
          id,
          name,
          status,
          manual_access_enabled,
          manual_access_until,
          manual_access_reason,
          manual_access_by,
          updated_at
        `,
      )
      .single();

  if (updateError) {
    console.error(
      "SUPER ADMIN MANUAL ACCESS - UPDATE:",
      updateError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de modifier l'accès manuel.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 10. HISTORIQUE
   * ============================================================
   */

  const action =
    newEnabled
      ? "manual_access_enabled"
      : "manual_access_disabled";

  const historyReason =
    newEnabled
      ? newReason
      : reason ||
        "Accès manuel désactivé par le Super Admin.";

  const {
    error: historyError,
  } =
    await supabaseAdmin
      .from(
        "pharmacy_admin_actions",
      )
      .insert({
        pharmacy_id:
          pharmacyId,

        admin_user_id:
          admin.user_id,

        action,

        reason:
          historyReason,

        old_status:
          pharmacy.status ??
          null,

        new_status:
          pharmacy.status ??
          null,

        manual_access_enabled:
          newEnabled,

        manual_access_until:
          newUntil,
      });

  /*
   * L'écriture de l'historique ne doit pas annuler
   * l'action principale si elle a déjà réussi.
   */

  if (historyError) {
    console.error(
      "SUPER ADMIN MANUAL ACCESS - HISTORY:",
      historyError,
    );
  }

  /*
   * ============================================================
   * 11. RÉPONSE
   * ============================================================
   */

  return NextResponse.json(
    {
      success: true,

      message:
        newEnabled
          ? "L'accès manuel a été activé."
          : "L'accès manuel a été désactivé.",

      pharmacy: {
        id:
          updatedPharmacy.id,

        name:
          updatedPharmacy.name,

        status:
          updatedPharmacy.status,

        manual_access_enabled:
          updatedPharmacy.manual_access_enabled,

        manual_access_until:
          updatedPharmacy.manual_access_until,

        manual_access_reason:
          updatedPharmacy.manual_access_reason,

        manual_access_by:
          updatedPharmacy.manual_access_by,

        updated_at:
          updatedPharmacy.updated_at,
      },

      previous: {
        manual_access_enabled:
          oldEnabled,

        manual_access_until:
          oldUntil,
      },
    },
    {
      status: 200,
    },
  );
}