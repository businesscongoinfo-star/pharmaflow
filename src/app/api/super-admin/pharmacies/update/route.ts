import { NextResponse } from "next/server";

import { requireSuperAdminApi } from "@/app/lib/super-admin/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

const ALLOWED_STATUSES = [
  "active",
  "inactive",
  "suspended",
] as const;

type AllowedStatus =
  (typeof ALLOWED_STATUSES)[number];

type UpdatePayload = {
  pharmacyId?: unknown;
  name?: unknown;
  country_code?: unknown;
  city?: unknown;
  address?: unknown;
  currency_code?: unknown;
  language?: unknown;
  status?: unknown;
};

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

/**
 * GET volontairement explicite.
 *
 * Cette route est une API POST.
 * Si quelqu'un ouvre directement l'URL dans
 * le navigateur, on retourne une réponse claire
 * au lieu d'une page 404.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Cette route est une API de mise à jour. Utilisez une requête POST depuis le formulaire.",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    // ========================================================
    // 1. AUTHENTIFICATION SUPER ADMIN
    // ========================================================

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
        }
      );
    }

    // ========================================================
    // 2. RÉCUPÉRATION DES DONNÉES
    // ========================================================

    let payload: UpdatePayload;

    const contentType =
      request.headers.get("content-type") || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      payload =
        (await request.json()) as UpdatePayload;
    } else {
      const formData =
        await request.formData();

      payload = {
        pharmacyId:
          formData.get("pharmacyId"),
        name:
          formData.get("name"),
        country_code:
          formData.get("country_code"),
        city:
          formData.get("city"),
        address:
          formData.get("address"),
        currency_code:
          formData.get("currency_code"),
        language:
          formData.get("language"),
        status:
          formData.get("status"),
      };
    }

    // ========================================================
    // 3. NETTOYAGE
    // ========================================================

    const pharmacyId =
      cleanString(payload.pharmacyId);

    const name =
      cleanString(payload.name);

    const countryCode =
      cleanString(
        payload.country_code
      ).toUpperCase();

    const city =
      cleanString(payload.city);

    const address =
      cleanString(payload.address);

    const currencyCode =
      cleanString(
        payload.currency_code
      ).toUpperCase();

    const language =
      cleanString(payload.language);

    const statusValue =
      cleanString(payload.status);

    // ========================================================
    // 4. VALIDATIONS
    // ========================================================

    if (!pharmacyId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identifiant de pharmacie manquant.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le nom de la pharmacie est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (!countryCode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le code pays est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (!city) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La ville est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (!currencyCode) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La devise est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      language &&
      !["fr", "en"].includes(
        language
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La langue sélectionnée est invalide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ALLOWED_STATUSES.includes(
        statusValue as AllowedStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le statut sélectionné est invalide.",
        },
        {
          status: 400,
        }
      );
    }

    const status =
      statusValue as AllowedStatus;

    // ========================================================
    // 5. CLIENT ADMIN SUPABASE
    // ========================================================

    const supabase =
      createAdminClient();

    // ========================================================
    // 6. VÉRIFICATION DE LA PHARMACIE
    // ========================================================

    const {
      data: existingPharmacy,
      error: existingError,
    } = await supabase
      .from("pharmacies")
      .select(`
        id,
        name,
        country_code,
        city,
        address,
        currency_code,
        owner_id,
        status,
        language
      `)
      .eq("id", pharmacyId)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Erreur récupération pharmacie:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer la pharmacie.",
          details:
            existingError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!existingPharmacy) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pharmacie introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // 7. MISE À JOUR
    // ========================================================

    const updateData = {
      name,
      country_code: countryCode,
      city,
      address: address || null,
      currency_code: currencyCode,
      language: language || "fr",
      status,
      updated_at:
        new Date().toISOString(),
    };

    const {
      data: updatedPharmacy,
      error: updateError,
    } = await supabase
      .from("pharmacies")
      .update(updateData)
      .eq("id", pharmacyId)
      .select(`
        id,
        name,
        country_code,
        city,
        address,
        currency_code,
        owner_id,
        status,
        language,
        created_at,
        updated_at,
        manual_access_enabled,
        manual_access_until,
        manual_access_reason,
        manual_access_by
      `)
      .single();

    if (updateError) {
      console.error(
        "Erreur mise à jour pharmacie:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible d'enregistrer les modifications.",
          details:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // 8. JOURNAL ADMINISTRATEUR
    // ========================================================

    if (
      existingPharmacy.status !==
      status
    ) {
      const {
        error: auditError,
      } = await supabase
        .from("pharmacy_admin_actions")
        .insert({
          pharmacy_id: pharmacyId,
          admin_user_id: admin.id,
          action: "status_changed",
          reason:
            "Modification depuis la fiche Super Admin",
          old_status:
            existingPharmacy.status,
          new_status: status,
        });

      if (auditError) {
        /*
         * La pharmacie a bien été modifiée.
         * Une erreur de journalisation ne doit
         * pas annuler la modification principale.
         */
        console.error(
          "Erreur journalisation statut:",
          auditError
        );
      }
    }

    // ========================================================
    // 9. RÉPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        message:
          "La pharmacie a été mise à jour avec succès.",
        pharmacy:
          updatedPharmacy,
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    console.error(
      "Erreur API update pharmacy:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Une erreur interne est survenue.",
      },
      {
        status: 500,
      }
    );
  }
}