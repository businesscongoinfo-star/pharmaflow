import { NextResponse } from "next/server";

import {
  requireSuperAdminApi,
} from "@/app/lib/super-admin/auth";

import {
  createAdminClient,
} from "@/app/lib/supabase/admin";

export async function POST(
  request: Request,
) {
  try {
    /* =========================================================
       VÉRIFICATION SUPER ADMIN
       ========================================================= */

    const admin =
      await requireSuperAdminApi();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Accès non autorisé. Vous devez être Super Admin.",
        },
        {
          status: 401,
        },
      );
    }

    /* =========================================================
       LECTURE DE LA REQUÊTE
       ========================================================= */

    let body: {
      pharmacyId?: unknown;
    };

    try {
      body = await request.json();
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

    const pharmacyId =
      typeof body.pharmacyId === "string"
        ? body.pharmacyId.trim()
        : "";

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

    const supabase =
      createAdminClient();

    /* =========================================================
       RÉCUPÉRER LA PHARMACIE
       ========================================================= */

    const {
      data: pharmacy,
      error: pharmacyError,
    } = await supabase
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

    if (pharmacyError) {
      console.error(
        "Erreur récupération pharmacie:",
        pharmacyError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            pharmacyError.message ||
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

    /* =========================================================
       PROTECTION
       ========================================================= */

    if (
      String(
        pharmacy.status || "",
      ).toLowerCase() === "active"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cette pharmacie est encore active. Désactivez-la avant de la supprimer.",
        },
        {
          status: 409,
        },
      );
    }

    /* =========================================================
       SUPPRESSION
       ========================================================= */

    const {
      error: deleteError,
    } = await supabase
      .from("pharmacies")
      .delete()
      .eq(
        "id",
        pharmacyId,
      );

    if (deleteError) {
      console.error(
        "Erreur suppression pharmacie:",
        deleteError,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Suppression impossible : " +
            deleteError.message,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * IMPORTANT :
     * L'audit est tenté après suppression.
     *
     * Si pharmacy_admin_actions possède une FK vers
     * pharmacies(id), il est normal que cet audit ne puisse
     * plus être enregistré après suppression.
     *
     * La suppression reste donc la priorité.
     */

    console.log(
      `Pharmacie supprimée par le Super Admin ${admin.id}: ${pharmacy.name}`,
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "La pharmacie a été supprimée avec succès.",
        pharmacyId,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Erreur API suppression pharmacie:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Une erreur interne est survenue.",
      },
      {
        status: 500,
      },
    );
  }
}