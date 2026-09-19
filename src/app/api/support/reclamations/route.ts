import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type Priority = "low" | "normal" | "high" | "urgent";

type CreateReclamationBody = {
  subject?: unknown;
  message?: unknown;
  priority?: unknown;
};

function generateReclamationReference() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");

  const minutes = String(now.getMinutes()).padStart(2, "0");

  const seconds = String(now.getSeconds()).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `REC-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

function isValidPriority(value: unknown): value is Priority {
  return (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "urgent"
  );
}

export async function POST(request: Request) {
  try {
    /*
     * ------------------------------------------------------------
     * 1. Vérifier la session utilisateur
     * ------------------------------------------------------------
     */

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Vous devez être connecté pour envoyer une réclamation.",
        },
        { status: 401 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 2. Lire les données du formulaire
     * ------------------------------------------------------------
     */

    let body: CreateReclamationBody;

    try {
      body = (await request.json()) as CreateReclamationBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Les données envoyées sont invalides.",
        },
        { status: 400 }
      );
    }

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const priority = isValidPriority(body.priority)
      ? body.priority
      : "normal";

    /*
     * ------------------------------------------------------------
     * 3. Validation serveur
     * ------------------------------------------------------------
     */

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          error: "Le sujet est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (subject.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Le sujet doit contenir au moins 3 caractères.",
        },
        { status: 400 }
      );
    }

    if (subject.length > 150) {
      return NextResponse.json(
        {
          success: false,
          error: "Le sujet ne peut pas dépasser 150 caractères.",
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "La description est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La description doit contenir au moins 10 caractères.",
        },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La description ne peut pas dépasser 5000 caractères.",
        },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 4. Récupérer le profil de l'utilisateur
     * ------------------------------------------------------------
     *
     * On utilise uniquement pharmacy_id ici.
     * Le nom et les coordonnées restent également disponibles
     * depuis auth.users si nécessaire plus tard.
     */

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("pharmacy_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "[SUPPORT RECLAMATIONS] Erreur profil:",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer les informations de votre compte.",
        },
        { status: 500 }
      );
    }

    const pharmacyId =
      typeof profile?.pharmacy_id === "string"
        ? profile.pharmacy_id
        : null;

    /*
     * ------------------------------------------------------------
     * 5. Vérifier la pharmacie si le compte y est rattaché
     * ------------------------------------------------------------
     */

    const adminClient = createAdminClient();

    let pharmacyName: string | null = null;

    if (pharmacyId) {
      const { data: pharmacy, error: pharmacyError } =
        await adminClient
          .from("pharmacies")
          .select("id, name, status")
          .eq("id", pharmacyId)
          .maybeSingle();

      if (pharmacyError) {
        console.error(
          "[SUPPORT RECLAMATIONS] Erreur pharmacie:",
          pharmacyError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Impossible de vérifier votre établissement.",
          },
          { status: 500 }
        );
      }

      if (!pharmacy) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Votre compte n'est associé à aucune pharmacie valide.",
          },
          { status: 403 }
        );
      }

      if (
        pharmacy.status === "inactive" ||
        pharmacy.status === "suspended"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Votre établissement est actuellement désactivé ou suspendu.",
          },
          { status: 403 }
        );
      }

      pharmacyName = pharmacy.name;
    }

    /*
     * ------------------------------------------------------------
     * 6. Informations utilisateur
     * ------------------------------------------------------------
     */

    const metadata = user.user_metadata || {};

    const clientName =
      typeof metadata.full_name === "string"
        ? metadata.full_name.trim()
        : typeof metadata.name === "string"
          ? metadata.name.trim()
          : null;

    const clientPhone =
      typeof metadata.phone === "string"
        ? metadata.phone.trim()
        : null;

    const clientEmail =
      typeof user.email === "string"
        ? user.email.trim()
        : null;

    /*
     * ------------------------------------------------------------
     * 7. Générer la référence unique
     * ------------------------------------------------------------
     */

    const reference = generateReclamationReference();

    /*
     * ------------------------------------------------------------
     * 8. Créer la réclamation
     * ------------------------------------------------------------
     */

    const { data: reclamation, error: reclamationError } =
      await adminClient
        .from("reclamations")
        .insert({
          reference,
          pharmacy_id: pharmacyId,
          client_user_id: user.id,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          subject,
          message,
          status: "open",
          priority,
        })
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
            created_at,
            updated_at
          `
        )
        .single();

    if (reclamationError || !reclamation) {
      console.error(
        "[SUPPORT RECLAMATIONS] Erreur création:",
        reclamationError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible d'enregistrer votre réclamation. Veuillez réessayer.",
        },
        { status: 500 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 9. Ajouter le premier message dans l'historique
     * ------------------------------------------------------------
     */

    const { error: messageError } = await adminClient
      .from("reclamation_messages")
      .insert({
        reclamation_id: reclamation.id,
        sender_user_id: user.id,
        sender_type: "client",
        message,
      });

    if (messageError) {
      console.error(
        "[SUPPORT RECLAMATIONS] Erreur historique:",
        messageError
      );

      /*
       * La réclamation existe déjà.
       * On ne la supprime pas simplement parce que
       * l'historique a échoué.
       */
    }

    /*
     * ------------------------------------------------------------
     * 10. Notification interne Super Admin
     * ------------------------------------------------------------
     */

    const notificationMessage = pharmacyName
      ? `Nouvelle réclamation ${reference} de ${pharmacyName}.`
      : `Nouvelle réclamation ${reference}.`;

    const { error: notificationError } = await adminClient
      .from("reclamation_notifications")
      .insert({
        reclamation_id: reclamation.id,
        recipient_user_id: null,
        channel: "in_app",
        notification_type: "new_reclamation",
        message: notificationMessage,
        sent_at: new Date().toISOString(),
      });

    if (notificationError) {
      console.error(
        "[SUPPORT RECLAMATIONS] Erreur notification:",
        notificationError
      );
    }

    /*
     * ------------------------------------------------------------
     * 11. Réponse
     * ------------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,
        reference: reclamation.reference,
        reclamation: {
          id: reclamation.id,
          reference: reclamation.reference,
          subject: reclamation.subject,
          status: reclamation.status,
          priority: reclamation.priority,
          created_at: reclamation.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[SUPPORT RECLAMATIONS] Erreur inattendue:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Une erreur inattendue est survenue. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}