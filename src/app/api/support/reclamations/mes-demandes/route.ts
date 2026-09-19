import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  try {
    /*
     * ------------------------------------------------------------
     * 1. Vérifier l'utilisateur connecté
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
          error: "Vous devez être connecté.",
        },
        { status: 401 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 2. Client administrateur serveur
     * ------------------------------------------------------------
     *
     * IMPORTANT :
     * Le client admin est utilisé uniquement côté serveur.
     * On filtre obligatoirement avec client_user_id = user.id.
     *
     * Le client ne peut donc récupérer que SES réclamations.
     */

    const adminClient = createAdminClient();

    /*
     * ------------------------------------------------------------
     * 3. Récupérer les réclamations du client
     * ------------------------------------------------------------
     */

    const {
      data: reclamations,
      error: reclamationsError,
    } = await adminClient
      .from("reclamations")
      .select(
        `
          id,
          reference,
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
        `
      )
      .eq("client_user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (reclamationsError) {
      console.error(
        "[MES RECLAMATIONS] Erreur récupération réclamations:",
        reclamationsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer vos réclamations.",
        },
        { status: 500 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 4. S'il n'y a aucune réclamation
     * ------------------------------------------------------------
     */

    if (!reclamations || reclamations.length === 0) {
      return NextResponse.json({
        success: true,
        reclamations: [],
      });
    }

    /*
     * ------------------------------------------------------------
     * 5. Récupérer les IDs
     * ------------------------------------------------------------
     */

    const reclamationIds = reclamations.map(
      (reclamation) => reclamation.id
    );

    /*
     * ------------------------------------------------------------
     * 6. Récupérer les messages
     * ------------------------------------------------------------
     */

    const {
      data: messages,
      error: messagesError,
    } = await adminClient
      .from("reclamation_messages")
      .select(
        `
          id,
          reclamation_id,
          sender_user_id,
          sender_type,
          message,
          created_at
        `
      )
      .in("reclamation_id", reclamationIds)
      .order("created_at", {
        ascending: true,
      });

    if (messagesError) {
      console.error(
        "[MES RECLAMATIONS] Erreur récupération messages:",
        messagesError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer les réponses du support.",
        },
        { status: 500 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 7. Organiser les messages par réclamation
     * ------------------------------------------------------------
     */

    const messagesByReclamation: Record<
      string,
      Array<{
        id: string;
        reclamation_id: string;
        sender_user_id: string | null;
        sender_type: "client" | "admin" | "system";
        message: string;
        created_at: string;
      }>
    > = {};

    for (const message of messages || []) {
      if (!messagesByReclamation[message.reclamation_id]) {
        messagesByReclamation[message.reclamation_id] = [];
      }

      messagesByReclamation[message.reclamation_id].push(
        message
      );
    }

    /*
     * ------------------------------------------------------------
     * 8. Construire la réponse finale
     * ------------------------------------------------------------
     */

    const result = reclamations.map((reclamation) => ({
      ...reclamation,

      messages:
        messagesByReclamation[reclamation.id] || [],
    }));

    /*
     * ------------------------------------------------------------
     * 9. Retourner les données au client
     * ------------------------------------------------------------
     */

    return NextResponse.json({
      success: true,
      reclamations: result,
    });
  } catch (error) {
    console.error(
      "[MES RECLAMATIONS] Erreur inattendue:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Une erreur inattendue est survenue.",
      },
      { status: 500 }
    );
  }
}