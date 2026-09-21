import { NextResponse } from "next/server";

import {
  requireSuperAdminApi,
} from "@/app/lib/super-admin/auth";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ManualAccessBody = {
  pharmacyId?: unknown;
  enabled?: unknown;
  until?: unknown;
  reason?: unknown;
};

export async function POST(
  request: Request,
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
        error:
          "Accès refusé. Vous devez être Super Admin.",
      },
      {
        status: 403,
      },
    );
  }

  /*
   * ============================================================
   * 2. LECTURE DU BODY
   * ============================================================
   */

  let body: ManualAccessBody;

  try {
    body =
      (await request.json()) as ManualAccessBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Le corps de la requête est invalide.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * ============================================================
   * 3. VALIDATION
   * ============================================================
   */

  const pharmacyId =
    typeof body.pharmacyId === "string"
      ? body.pharmacyId.trim()
      : "";

  const enabled =
    body.enabled === true;

  const until =
    typeof body.until === "string"
      ? body.until.trim()
      : "";

  const reason =
    typeof body.reason === "string"
      ? body.reason.trim()
      : "";

  if (!pharmacyId) {
    return NextResponse.json(
      {
        error:
          "L'identifiant de la pharmacie est obligatoire.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * ============================================================
   * 4. VALIDATION ACTIVATION
   * ============================================================
   */

  if (enabled) {
    if (!until) {
      return NextResponse.json(
        {
          error:
            "La date d'expiration est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }

    const expirationDate =
      new Date(until);

    if (
      Number.isNaN(
        expirationDate.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La date d'expiration est invalide.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      expirationDate.getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "La date d'expiration doit être dans le futur.",
        },
        {
          status: 400,
        },
      );
    }

    if (!reason) {
      return NextResponse.json(
        {
          error:
            "Le motif de l'accès manuel est obligatoire.",
        },
        {
          status: 400,
        },
      );
    }
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
        error:
          "Le client Admin Supabase ne peut pas être initialisé.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 6. VÉRIFICATION PHARMACIE
   * ============================================================
   */

  const {
    data: pharmacy,
    error: pharmacyError,
  } = await supabaseAdmin
    .from("pharmacies")
    .select(
      `
        id,
        name,
        status,
        manual_access_enabled,
        manual_access_until,
        manual_access_reason
      `,
    )
    .eq("id", pharmacyId)
    .maybeSingle();

  if (pharmacyError) {
    console.error(
      "SUPER ADMIN MANUAL ACCESS - PHARMACY READ:",
      pharmacyError,
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer la pharmacie.",
        details:
          pharmacyError.message,
      },
      {
        status: 500,
      },
    );
  }

  if (!pharmacy) {
    return NextResponse.json(
      {
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
   * 7. ANCIENNES VALEURS
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
   * 8. NOUVELLES VALEURS
   * ============================================================
   */

  const newUntil =
    enabled ? until : null;

  const newReason =
    enabled ? reason : reason || null;

  /*
   * ============================================================
   * 9. MISE À JOUR PHARMACIE
   * ============================================================
   */

  const {
    data: updatedPharmacy,
    error: updateError,
  } = await supabaseAdmin
    .from("pharmacies")
    .update({
      manual_access_enabled:
        enabled,

      manual_access_until:
        newUntil,

      manual_access_reason:
        newReason,

      manual_access_by:
        enabled
          ? admin.user_id
          : null,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", pharmacyId)
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
        error:
          "Impossible de modifier l'accès manuel.",
        details:
          updateError.message,
        code:
          updateError.code ?? null,
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 10. JOURNAL D'AUDIT
   * ============================================================
   */

  const action =
    enabled
      ? "manual_access_enabled"
      : "manual_access_disabled";

  const {
    error: auditError,
  } = await supabaseAdmin
    .from("pharmacy_admin_actions")
    .insert({
      pharmacy_id:
        pharmacyId,

      admin_user_id:
        admin.user_id,

      action,

      reason:
        newReason,

      old_status:
        pharmacy.status ?? null,

      new_status:
        pharmacy.status ?? null,

      manual_access_enabled:
        enabled,

      manual_access_until:
        newUntil,
    });

  if (auditError) {
    /*
     * La modification principale a déjà
     * réussi. On journalise l'erreur mais
     * on ne revient pas en arrière.
     */

    console.error(
      "SUPER ADMIN MANUAL ACCESS - AUDIT:",
      auditError,
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

      message: enabled
        ? "Accès manuel activé avec succès."
        : "Accès manuel désactivé avec succès.",

      pharmacy:
        updatedPharmacy,

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