import { NextResponse } from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  requireSuperAdminApi,
} from "@/app/lib/super-admin/auth";

/**
 * ============================================================
 * PHARMAFLOW
 * SUPER ADMIN — CHANGEMENT DU STATUT D'UNE PHARMACIE
 * ============================================================
 *
 * Statuts autorisés :
 *
 *   active
 *   inactive
 *   suspended
 *
 * Cette route est la source officielle pour modifier :
 *
 *   pharmacies.status
 *
 * Elle enregistre également chaque modification dans :
 *
 *   pharmacy_admin_actions
 *
 * IMPORTANT :
 *
 * Cette route ne déconnecte aucun utilisateur.
 *
 * Elle modifie uniquement le statut administratif
 * de la pharmacie.
 * ============================================================
 */

type PharmacyStatus =
  | "active"
  | "inactive"
  | "suspended";

type RequestBody = {
  pharmacyId?: unknown;
  status?: unknown;
  reason?: unknown;
};

/**
 * ============================================================
 * NORMALISER LE STATUT
 * ============================================================
 */

function normalizeStatus(
  value: unknown,
): PharmacyStatus | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const status =
    value
      .trim()
      .toLowerCase();

  if (
    status === "active" ||
    status === "inactive" ||
    status === "suspended"
  ) {
    return status;
  }

  return null;
}

/**
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: Request,
) {
  /**
   * ==========================================================
   * 1. VÉRIFICATION SUPER ADMIN
   * ==========================================================
   */

  const superAdmin =
    await requireSuperAdminApi();

  if (!superAdmin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Accès refusé. Vous devez être Super Admin.",
      },
      {
        status: 401,
      },
    );
  }

  /**
   * ==========================================================
   * 2. LECTURE DU BODY
   * ==========================================================
   */

  let body: RequestBody;

  try {
    body =
      (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error:
          "Le corps de la requête est invalide.",
      },
      {
        status: 400,
      },
    );
  }

  /**
   * ==========================================================
   * 3. PHARMACY ID
   * ==========================================================
   */

  if (
    typeof body.pharmacyId !==
      "string" ||
    !body.pharmacyId.trim()
  ) {
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

  const pharmacyId =
    body.pharmacyId.trim();

  /**
   * ==========================================================
   * 4. STATUT
   * ==========================================================
   */

  const status =
    normalizeStatus(
      body.status,
    );

  if (!status) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Statut invalide. Les valeurs autorisées sont : active, inactive, suspended.",
      },
      {
        status: 400,
      },
    );
  }

  /**
   * ==========================================================
   * 5. MOTIF
   * ==========================================================
   */

  const reasonFromRequest =
    typeof body.reason ===
    "string"
      ? body.reason.trim()
      : "";

  const reason =
    reasonFromRequest ||
    getDefaultReason(
      status,
    );

  /**
   * ==========================================================
   * 6. CLIENT ADMIN SUPABASE
   * ==========================================================
   *
   * Le client admin est utilisé ici parce que cette opération
   * est une opération Super Admin.
   */

  const supabase =
    createAdminClient();

  /**
   * ==========================================================
   * 7. RÉCUPÉRER LA PHARMACIE
   * ==========================================================
   */

  const {
    data: pharmacy,
    error:
      pharmacyFetchError,
  } =
    await supabase
      .from("pharmacies")
      .select(
        `
          id,
          name,
          status
        `,
      )
      .eq(
        "id",
        pharmacyId,
      )
      .maybeSingle();

  if (
    pharmacyFetchError
  ) {
    console.error(
      "PharmaFlow — erreur récupération pharmacie :",
      pharmacyFetchError,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de récupérer la pharmacie.",
        details:
          pharmacyFetchError.message,
      },
      {
        status: 500,
      },
    );
  }

  /**
   * ==========================================================
   * 8. PHARMACIE INTROUVABLE
   * ==========================================================
   */

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

  /**
   * ==========================================================
   * 9. ANCIEN STATUT
   * ==========================================================
   */

  const oldStatus =
    String(
      pharmacy.status || "",
    )
      .trim()
      .toLowerCase();

  /**
   * ==========================================================
   * 10. AUCUN CHANGEMENT
   * ==========================================================
   *
   * Si la pharmacie est déjà dans le statut demandé,
   * inutile de refaire une modification SQL.
   */

  if (
    oldStatus === status
  ) {
    return NextResponse.json(
      {
        success: true,
        message:
          `La pharmacie "${pharmacy.name}" est déjà dans le statut "${status}".`,
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
          status,
        },
        changed: false,
      },
      {
        status: 200,
      },
    );
  }

  /**
   * ==========================================================
   * 11. MODIFIER LE STATUT
   * ==========================================================
   */

  const {
    data:
      updatedPharmacy,
    error:
      updateError,
  } =
    await supabase
      .from("pharmacies")
      .update({
        status,
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
          updated_at
        `,
      )
      .single();

  /**
   * ==========================================================
   * 12. ERREUR DE MODIFICATION
   * ==========================================================
   */

  if (
    updateError ||
    !updatedPharmacy
  ) {
    console.error(
      "PharmaFlow — erreur modification statut :",
      updateError,
    );

    /**
     * Message spécifique si la contrainte SQL existe encore.
     */
    const message =
      updateError?.message ||
      "";

    if (
      message.includes(
        "pharmacies_status_check",
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La base de données refuse ce statut. Vérifiez la contrainte pharmacies_status_check dans Supabase.",
          details:
            message,
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de modifier le statut de la pharmacie.",
        details:
          message ||
          "Erreur inconnue.",
      },
      {
        status: 500,
      },
    );
  }

  /**
   * ==========================================================
   * 13. ENREGISTRER L'ACTION ADMIN
   * ==========================================================
   */

  const {
    error:
      auditError,
  } =
    await supabase
      .from(
        "pharmacy_admin_actions",
      )
      .insert({
        pharmacy_id:
          pharmacyId,

        admin_user_id:
          superAdmin.user_id,

        action:
          getAuditAction(
            status,
          ),

        reason,

        old_status:
          oldStatus || null,

        new_status:
          status,

        manual_access_enabled:
          null,

        manual_access_until:
          null,
      });

  /**
   * ==========================================================
   * 14. ERREUR AUDIT
   * ==========================================================
   *
   * La modification du statut a déjà été effectuée.
   *
   * Nous essayons donc de restaurer l'ancien statut afin
   * d'éviter une modification sans trace administrative.
   */

  if (auditError) {
    console.error(
      "PharmaFlow — erreur audit statut :",
      auditError,
    );

    /**
     * Tentative de rollback.
     */
    if (
      oldStatus ===
        "active" ||
      oldStatus ===
        "inactive" ||
      oldStatus ===
        "suspended"
    ) {
      const {
        error:
          rollbackError,
      } =
        await supabase
          .from(
            "pharmacies",
          )
          .update({
            status:
              oldStatus,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            pharmacyId,
          );

      if (
        rollbackError
      ) {
        console.error(
          "PharmaFlow — erreur rollback statut :",
          rollbackError,
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Le statut n'a pas pu être enregistré correctement dans l'historique administrateur.",
        details:
          auditError.message,
      },
      {
        status: 500,
      },
    );
  }

  /**
   * ==========================================================
   * 15. RÉPONSE FINALE
   * ==========================================================
   */

  return NextResponse.json(
    {
      success: true,

      message:
        getSuccessMessage(
          status,
        ),

      changed: true,

      pharmacy: {
        id:
          updatedPharmacy.id,

        name:
          updatedPharmacy.name,

        status:
          updatedPharmacy.status,

        updated_at:
          updatedPharmacy.updated_at,
      },

      audit: {
        action:
          getAuditAction(
            status,
          ),

        old_status:
          oldStatus || null,

        new_status:
          status,

        reason,

        admin_user_id:
          superAdmin.user_id,
      },
    },
    {
      status: 200,
    },
  );
}

/**
 * ============================================================
 * MOTIF PAR DÉFAUT
 * ============================================================
 */

function getDefaultReason(
  status: PharmacyStatus,
): string {
  switch (status) {
    case "active":
      return "Pharmacie activée depuis le panneau Super Admin.";

    case "inactive":
      return "Pharmacie désactivée depuis le panneau Super Admin.";

    case "suspended":
      return "Pharmacie suspendue depuis le panneau Super Admin.";
  }
}

/**
 * ============================================================
 * ACTION D'AUDIT
 * ============================================================
 */

function getAuditAction(
  status: PharmacyStatus,
): string {
  switch (status) {
    case "active":
      return "pharmacy_activated";

    case "inactive":
      return "pharmacy_deactivated";

    case "suspended":
      return "pharmacy_suspended";
  }
}

/**
 * ============================================================
 * MESSAGE UTILISATEUR
 * ============================================================
 */

function getSuccessMessage(
  status: PharmacyStatus,
): string {
  switch (status) {
    case "active":
      return "La pharmacie a été activée avec succès.";

    case "inactive":
      return "La pharmacie a été désactivée avec succès.";

    case "suspended":
      return "La pharmacie a été suspendue avec succès.";
  }
}