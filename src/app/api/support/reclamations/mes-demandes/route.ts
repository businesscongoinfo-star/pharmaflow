import { NextResponse } from "next/server";

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type ReclamationMessage = {
  id: string;
  reclamation_id: string;
  sender_user_id: string | null;
  sender_type: "client" | "admin" | "system";
  message: string;
  created_at: string;
};

export async function GET() {
  try {
    /*
     * ============================================================
     * 1. VÉRIFIER L'UTILISATEUR CONNECTÉ
     * ============================================================
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
     * ============================================================
     * 2. CLIENT ADMINISTRATEUR SERVEUR
     * ============================================================
     *
     * Ce client est utilisé uniquement côté serveur.
     *
     * IMPORTANT :
     * Nous filtrons toujours avec :
     *
     * client_user_id = user.id
     *
     * afin que le client ne puisse récupérer que ses propres
     * réclamations.
     */

    const adminClient = createAdminClient();

    /*
     * ============================================================
     * 3. RÉCUPÉRER LES RÉCLAMATIONS DU CLIENT
     * ============================================================
     *
     * IMPORTANT :
     * La table "reclamations" ne contient pas de colonne "message".
     *
     * Le contenu des messages est récupéré séparément depuis :
     *
     * reclamation_messages
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
          error: "Impossible de récupérer vos réclamations.",
        },
        { status: 500 }
      );
    }

    /*
     * ============================================================
     * 4. AUCUNE RÉCLAMATION
     * ============================================================
     */

    if (!reclamations || reclamations.length === 0) {
      return NextResponse.json({
        success: true,
        reclamations: [],
      });
    }

    /*
     * ============================================================
     * 5. RÉCUPÉRER LES IDS DES RÉCLAMATIONS
     * ============================================================
     */

    const reclamationIds = reclamations.map(
      (reclamation) => reclamation.id
    );

    /*
     * ============================================================
     * 6. RÉCUPÉRER LES MESSAGES
     * ============================================================
     *
     * Les messages sont récupérés uniquement pour les réclamations
     * appartenant déjà à l'utilisateur connecté.
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
     * ============================================================
     * 7. ORGANISER LES MESSAGES PAR RÉCLAMATION
     * ============================================================
     */

    const messagesByReclamation: Record<
      string,
      ReclamationMessage[]
    > = {};

    for (const message of (messages || []) as ReclamationMessage[]) {
      if (!messagesByReclamation[message.reclamation_id]) {
        messagesByReclamation[message.reclamation_id] = [];
      }

      messagesByReclamation[message.reclamation_id].push(message);
    }

    /*
     * ============================================================
     * 8. CONSTRUIRE LA RÉPONSE FINALE
     * ============================================================
     *
     * La page cliente attend :
     *
     * {
     *   id,
     *   reference,
     *   subject,
     *   message,
     *   status,
     *   priority,
     *   admin_reply,
     *   resolution,
     *   created_at,
     *   updated_at,
     *   resolved_at,
     *   closed_at,
     *   messages
     * }
     *
     * Comme "message" n'existe pas directement dans "reclamations",
     * nous construisons ce champ à partir du premier message client.
     */

    const result = reclamations.map((reclamation) => {
      const reclamationMessages =
        messagesByReclamation[reclamation.id] || [];

      /*
       * Premier message envoyé par le client.
       *
       * On cherche le premier message dont sender_type = "client".
       */

      const firstClientMessage =
        reclamationMessages.find(
          (message) => message.sender_type === "client"
        ) || null;

      /*
       * Si aucun message client n'est trouvé, on utilise une chaîne
       * vide plutôt que d'inventer un contenu.
       */

      const initialMessage =
        firstClientMessage?.message || "";

      return {
        ...reclamation,

        message: initialMessage,

        messages: reclamationMessages,
      };
    });

    /*
     * ============================================================
     * 9. RÉPONSE API
     * ============================================================
     */

    return NextResponse.json(
      {
        success: true,
        reclamations: result,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[MES RECLAMATIONS] Erreur inattendue:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Une erreur inattendue est survenue.",
      },
      {
        status: 500,
      }
    );
  }
}