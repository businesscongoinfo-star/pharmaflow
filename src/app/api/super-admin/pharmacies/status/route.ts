import { NextRequest, NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/app/lib/super-admin/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

type PharmacyStatus =
  | "active"
  | "inactive"
  | "suspended";

type RequestBody = {
  pharmacyId?: unknown;
  status?: unknown;
  reason?: unknown;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isValidStatus(
  value: string,
): value is PharmacyStatus {
  return (
    value === "active" ||
    value === "inactive" ||
    value === "suspended"
  );
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

  const newStatus =
    normalizeText(
      body.status,
    ).toLowerCase();

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

  if (!isValidStatus(newStatus)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Le statut demandé est invalide.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * ============================================================
   * 4. CLIENT ADMIN SUPABASE
   * ============================================================
   */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "SUPER ADMIN STATUS - ADMIN CLIENT:",
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
   * 5. RÉCUPÉRATION DE LA PHARMACIE
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
          manual_access_until
        `,
      )
      .eq(
        "id",
        pharmacyId,
      )
      .maybeSingle();

  if (pharmacyError) {
    console.error(
      "SUPER ADMIN STATUS - FETCH:",
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

  const oldStatus =
    String(
      pharmacy.status ?? "",
    ).trim();

  /*
   * ============================================================
   * 6. ÉVITER UNE MODIFICATION INUTILE
   * ============================================================
   */

  if (
    oldStatus === newStatus
  ) {
    return NextResponse.json(
      {
        success: true,
        message:
          "La pharmacie possède déjà ce statut.",
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
          status: newStatus,
        },
      },
      {
        status: 200,
      },
    );
  }

  /*
   * ============================================================
   * 7. MISE À JOUR DU STATUT
   * ============================================================
   */

  const {
    data: updatedPharmacy,
    error: updateError,
  } =
    await supabaseAdmin
      .from("pharmacies")
      .update({
        status: newStatus,
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
          updated_at
        `,
      )
      .single();

  if (updateError) {
    console.error(
      "SUPER ADMIN STATUS - UPDATE:",
      updateError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de modifier le statut de la pharmacie.",
      },
      {
        status: 500,
      },
    );
  }

  /*
   * ============================================================
   * 8. HISTORIQUE SUPER ADMIN
   * ============================================================
   */

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

        action:
          `status_${newStatus}`,

        reason:
          reason || null,

        old_status:
          oldStatus || null,

        new_status:
          newStatus,

        manual_access_enabled:
          pharmacy.manual_access_enabled ??
          false,

        manual_access_until:
          pharmacy.manual_access_until ??
          null,
      });

  /*
   * L'historique ne doit pas annuler une modification
   * déjà effectuée avec succès.
   */

  if (historyError) {
    console.error(
      "SUPER ADMIN STATUS - HISTORY:",
      historyError,
    );
  }

  /*
   * ============================================================
   * 9. RÉPONSE
   * ============================================================
   */

  return NextResponse.json(
    {
      success: true,

      message:
        newStatus === "active"
          ? "La pharmacie a été activée."
          : newStatus === "inactive"
            ? "La pharmacie a été désactivée."
            : "La pharmacie a été suspendue.",

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

        updated_at:
          updatedPharmacy.updated_at,
      },
    },
    {
      status: 200,
    },
  );
}