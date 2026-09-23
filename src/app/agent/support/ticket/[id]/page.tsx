import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAgent } from "@/app/lib/agent/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SupportTicket = {
  id: string;
  ticket_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  category: string;
  subject: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  created_at: string;
};

/*
|--------------------------------------------------------------------------
| STATUTS
|--------------------------------------------------------------------------
*/

const STATUSES = [
  "new",
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
] as const;

type TicketStatus = (typeof STATUSES)[number];

/*
|--------------------------------------------------------------------------
| CATÉGORIES
|--------------------------------------------------------------------------
*/

const CATEGORY_LABELS: Record<string, string> = {
  general: "Question générale",
  technical: "Technique",
  payment: "Paiement",
  subscription: "Abonnement",
  account: "Compte",
  pharmacy: "Pharmacie",
  security: "Sécurité",
  other: "Autre",
};

/*
|--------------------------------------------------------------------------
| OUTILS
|--------------------------------------------------------------------------
*/

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/*
|--------------------------------------------------------------------------
| LABEL STATUT
|--------------------------------------------------------------------------
*/

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "Nouveau",
    open: "Ouvert",
    pending: "En attente",
    in_progress: "En cours",
    resolved: "Résolu",
    closed: "Fermé",
  };

  return labels[status] ?? status;
}

/*
|--------------------------------------------------------------------------
| CLASSE STATUT
|--------------------------------------------------------------------------
*/

function statusClass(status: string) {
  switch (status) {
    case "resolved":
      return "status resolved";

    case "closed":
      return "status closed";

    case "in_progress":
      return "status progress";

    case "pending":
      return "status pending";

    case "new":
      return "status new";

    case "open":
      return "status open";

    default:
      return "status open";
  }
}

/*
|--------------------------------------------------------------------------
| LABEL PRIORITÉ
|--------------------------------------------------------------------------
*/

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    low: "Faible",
    normal: "Normale",
    medium: "Moyenne",
    high: "Haute",
    urgent: "Urgente",
    critical: "Critique",
  };

  return labels[priority] ?? priority;
}

/*
|--------------------------------------------------------------------------
| CLASSE PRIORITÉ
|--------------------------------------------------------------------------
*/

function priorityClass(priority: string) {
  switch (priority) {
    case "urgent":
    case "critical":
      return "priority danger";

    case "high":
      return "priority high";

    case "medium":
      return "priority medium";

    case "low":
      return "priority low";

    default:
      return "priority normal";
  }
}

/*
|--------------------------------------------------------------------------
| LABEL CATÉGORIE
|--------------------------------------------------------------------------
*/

function categoryLabel(category: string) {
  return (
    CATEGORY_LABELS[category] ??
    category
  );
}

/*
|--------------------------------------------------------------------------
| LABEL EXPÉDITEUR
|--------------------------------------------------------------------------
*/

function senderLabel(senderType: string) {
  const value =
    senderType.toLowerCase();

  if (
    value === "agent" ||
    value === "admin" ||
    value === "support" ||
    value === "staff"
  ) {
    return "Agent PharmaFlow";
  }

  if (
    value === "customer" ||
    value === "client" ||
    value === "user"
  ) {
    return "Client";
  }

  return senderType;
}

/*
|--------------------------------------------------------------------------
| CLASSE MESSAGE
|--------------------------------------------------------------------------
*/

function senderClass(senderType: string) {
  const value =
    senderType.toLowerCase();

  if (
    value === "agent" ||
    value === "admin" ||
    value === "support" ||
    value === "staff"
  ) {
    return "message agent";
  }

  return "message customer";
}

/*
|--------------------------------------------------------------------------
| PRENDRE EN CHARGE LE TICKET
|--------------------------------------------------------------------------
*/

async function takeTicket(
  ticketId: string,
) {
  "use server";

  const member =
    await requireAgent();

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("support_tickets")
      .update({
        assigned_to: member.id,
        status: "in_progress",
        updated_at: now,
      })
      .eq("id", ticketId);

  if (error) {
    console.error(
      "Take ticket error:",
      error,
    );

    throw new Error(
      "Impossible de prendre en charge le ticket.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| MODIFIER LE STATUT
|--------------------------------------------------------------------------
*/

async function updateTicketStatus(
  ticketId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const rawStatus =
    String(
      formData.get("status") ?? "",
    ).trim();

  if (
    !STATUSES.includes(
      rawStatus as TicketStatus,
    )
  ) {
    throw new Error(
      "Statut de ticket invalide.",
    );
  }

  const status =
    rawStatus as TicketStatus;

  const supabase =
    createAdminClient();

  const { error } =
    await supabase
      .from("support_tickets")
      .update({
        status,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", ticketId);

  if (error) {
    console.error(
      "Update ticket status error:",
      error,
    );

    throw new Error(
      "Impossible de modifier le statut.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| ENVOYER UNE RÉPONSE
|--------------------------------------------------------------------------
*/

async function sendTicketMessage(
  ticketId: string,
  formData: FormData,
) {
  "use server";

  const member =
    await requireAgent();

  const message =
    String(
      formData.get("message") ?? "",
    ).trim();

  if (!message) {
    throw new Error(
      "Le message ne peut pas être vide.",
    );
  }

  if (message.length > 10000) {
    throw new Error(
      "Le message est trop long.",
    );
  }

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  /*
   * Enregistrer le message.
   */
  const {
    error: messageError,
  } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: ticketId,
      sender_type: "agent",
      sender_id: member.id,
      message,
      created_at: now,
    });

  if (messageError) {
    console.error(
      "Send support message error:",
      messageError,
    );

    throw new Error(
      "Impossible d'envoyer la réponse.",
    );
  }

  /*
   * Mettre à jour le ticket.
   */
  const {
    error: ticketError,
  } = await supabase
    .from("support_tickets")
    .update({
      status: "in_progress",
      assigned_to: member.id,
      updated_at: now,
      last_message_at: now,
    })
    .eq("id", ticketId);

  if (ticketError) {
    console.error(
      "Update ticket after message error:",
      ticketError,
    );

    throw new Error(
      "Le message a été envoyé, mais le ticket n'a pas pu être mis à jour.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| RÉSOUDRE LE TICKET
|--------------------------------------------------------------------------
*/

async function resolveTicket(
  ticketId: string,
) {
  "use server";

  const member =
    await requireAgent();

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("support_tickets")
      .update({
        status: "resolved",
        assigned_to: member.id,
        updated_at: now,
        last_message_at: now,
      })
      .eq("id", ticketId);

  if (error) {
    console.error(
      "Resolve ticket error:",
      error,
    );

    throw new Error(
      "Impossible de résoudre le ticket.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| FERMER LE TICKET
|--------------------------------------------------------------------------
*/

async function closeTicket(
  ticketId: string,
) {
  "use server";

  await requireAgent();

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("support_tickets")
      .update({
        status: "closed",
        updated_at: now,
      })
      .eq("id", ticketId);

  if (error) {
    console.error(
      "Close ticket error:",
      error,
    );

    throw new Error(
      "Impossible de fermer le ticket.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath(
    "/agent/support",
  );

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default async function SupportTicketDetailPage({
  params,
}: PageProps) {
  /*
   * Next.js 16 :
   * params est une Promise.
   */
  const { id } =
    await params;

  /*
   * IMPORTANT :
   * requireAgent() retourne directement
   * l'agent/membre.
   *
   * On ne fait donc PAS :
   * const { member } = await requireAgent();
   */
  const member =
    await requireAgent();

  const supabase =
    createAdminClient();

  /*
   * ==========================================================
   * RÉCUPÉRER LE TICKET
   * ==========================================================
   */

  const {
    data: ticket,
    error: ticketError,
  } = await supabase
    .from("support_tickets")
    .select(
      `
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
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (ticketError) {
    console.error(
      "Support ticket detail error:",
      ticketError,
    );
  }

  if (!ticket) {
    notFound();
  }

  /*
   * ==========================================================
   * RÉCUPÉRER LES MESSAGES
   * ==========================================================
   */

  const {
    data: messages,
    error: messagesError,
  } = await supabase
    .from("support_messages")
    .select(
      `
        id,
        ticket_id,
        sender_type,
        sender_id,
        message,
        created_at
      `,
    )
    .eq("ticket_id", id)
    .order("created_at", {
      ascending: true,
    });

  if (messagesError) {
    console.error(
      "Support messages error:",
      messagesError,
    );
  }

  const ticketData =
    ticket as SupportTicket;

  const ticketMessages =
    (messages ?? []) as SupportMessage[];

  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <main className="ticket-page">
      <div className="page-shell">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="page-header">

          <div className="header-left">

            <Link
              href="/agent/support"
              className="back-button"
              aria-label="Retour au support"
            >
              ←
            </Link>

            <div>
              <div className="eyebrow">
                CENTRE DE SUPPORT
              </div>

              <h1>
                Ticket{" "}
                {ticketData.ticket_number}
              </h1>

              <p>
                Traitement et résolution
                du problème client.
              </p>
            </div>

          </div>

          <Link
            href="/agent"
            className="agent-button"
          >
            👤 Espace Agent
          </Link>

        </header>

        {/* =====================================================
            BARRE STATUT
        ===================================================== */}

        <section className="status-bar">

          <div className="status-group">

            <span
              className={statusClass(
                ticketData.status,
              )}
            >
              {statusLabel(
                ticketData.status,
              )}
            </span>

            <span
              className={priorityClass(
                ticketData.priority,
              )}
            >
              {priorityLabel(
                ticketData.priority,
              )}
            </span>

          </div>

          <div className="status-date">
            Dernière activité :
            <strong>
              {formatDate(
                ticketData.last_message_at,
              )}
            </strong>
          </div>

        </section>

        {/* =====================================================
            GRILLE PRINCIPALE
        ===================================================== */}

        <div className="content-grid">

          {/* ===================================================
              COLONNE PRINCIPALE
          =================================================== */}

          <section className="main-column">

            {/* =================================================
                INFORMATIONS DU TICKET
            ================================================= */}

            <article className="card">

              <div className="card-header">

                <div>
                  <span className="card-kicker">
                    DEMANDE CLIENT
                  </span>

                  <h2>
                    {ticketData.subject ||
                      "Sans objet"}
                  </h2>
                </div>

                <div className="ticket-icon">
                  🎫
                </div>

              </div>

              <div className="ticket-meta-grid">

                <div className="meta-item">
                  <span>
                    Catégorie
                  </span>

                  <strong>
                    {categoryLabel(
                      ticketData.category,
                    )}
                  </strong>
                </div>

                <div className="meta-item">
                  <span>
                    Priorité
                  </span>

                  <strong>
                    {priorityLabel(
                      ticketData.priority,
                    )}
                  </strong>
                </div>

                <div className="meta-item">
                  <span>
                    Créé le
                  </span>

                  <strong>
                    {formatDate(
                      ticketData.created_at,
                    )}
                  </strong>
                </div>

                <div className="meta-item">
                  <span>
                    Mis à jour
                  </span>

                  <strong>
                    {formatDate(
                      ticketData.updated_at,
                    )}
                  </strong>
                </div>

              </div>

            </article>

            {/* =================================================
                CENTRE D'INTERVENTION
            ================================================= */}

            <article className="card intervention-card">

              <div className="intervention-header">

                <div>
                  <span className="card-kicker">
                    ACTION AGENT
                  </span>

                  <h2>
                    Centre d&apos;intervention
                  </h2>

                  <p>
                    Répondez au client et
                    faites évoluer le dossier.
                  </p>
                </div>

                <div className="intervention-icon">
                  ⚡
                </div>

              </div>

              {/* =================================================
                  FORMULAIRE DE RÉPONSE
              ================================================= */}

              <form
                action={sendTicketMessage.bind(
                  null,
                  ticketData.id,
                )}
                className="response-form"
              >

                <label htmlFor="message">
                  Réponse au client
                </label>

                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  maxLength={10000}
                  placeholder="Écrivez votre réponse au client..."
                  required
                />

                <button
                  type="submit"
                  className="primary-action"
                >
                  ✉️ Envoyer la réponse
                </button>

              </form>

              {/* =================================================
                  ACTIONS RAPIDES
              ================================================= */}

              <div className="quick-actions">

                <div className="section-label">
                  Actions rapides
                </div>

                {ticketData.assigned_to !==
                  member.id && (
                  <form
                    action={takeTicket.bind(
                      null,
                      ticketData.id,
                    )}
                  >
                    <button
                      type="submit"
                      className="quick-button blue"
                    >
                      👤 Prendre en charge
                    </button>
                  </form>
                )}

                <form
                  action={updateTicketStatus.bind(
                    null,
                    ticketData.id,
                  )}
                >
                  <input
                    type="hidden"
                    name="status"
                    value="pending"
                  />

                  <button
                    type="submit"
                    className="quick-button orange"
                  >
                    ⏸️ Mettre en attente
                  </button>
                </form>

                <form
                  action={resolveTicket.bind(
                    null,
                    ticketData.id,
                  )}
                >
                  <button
                    type="submit"
                    className="quick-button green"
                  >
                    ✓ Résoudre le ticket
                  </button>
                </form>

                <form
                  action={closeTicket.bind(
                    null,
                    ticketData.id,
                  )}
                >
                  <button
                    type="submit"
                    className="quick-button gray"
                  >
                    🔒 Fermer le ticket
                  </button>
                </form>

              </div>

              {/* =================================================
                  ÉDITEUR DE STATUT
              ================================================= */}

              <div className="status-editor">

                <div className="section-label">
                  Modifier le statut
                </div>

                <form
                  action={updateTicketStatus.bind(
                    null,
                    ticketData.id,
                  )}
                  className="status-form"
                >

                  <select
                    name="status"
                    defaultValue={
                      ticketData.status
                    }
                    aria-label="Nouveau statut"
                  >
                    <option value="new">
                      Nouveau
                    </option>

                    <option value="open">
                      Ouvert
                    </option>

                    <option value="in_progress">
                      En cours
                    </option>

                    <option value="pending">
                      En attente
                    </option>

                    <option value="resolved">
                      Résolu
                    </option>

                    <option value="closed">
                      Fermé
                    </option>
                  </select>

                  <button
                    type="submit"
                    className="secondary-action"
                  >
                    Enregistrer
                  </button>

                </form>

              </div>

            </article>

            {/* =================================================
                HISTORIQUE CONVERSATION
            ================================================= */}

            <article className="card">

              <div className="card-header">

                <div>
                  <span className="card-kicker">
                    HISTORIQUE
                  </span>

                  <h2>
                    Conversation
                  </h2>
                </div>

                <span className="message-count">
                  {ticketMessages.length} message
                  {ticketMessages.length > 1
                    ? "s"
                    : ""}
                </span>

              </div>

              {ticketMessages.length === 0 ? (
                <div className="empty-state">

                  <div className="empty-icon">
                    💬
                  </div>

                  <h3>
                    Aucun message
                  </h3>

                  <p>
                    Envoyez la première
                    réponse au client
                    ci-dessus.
                  </p>

                </div>
              ) : (
                <div className="messages-list">

                  {ticketMessages.map(
                    (message) => (
                      <div
                        key={message.id}
                        className={senderClass(
                          message.sender_type,
                        )}
                      >

                        <div className="message-top">

                          <strong>
                            {senderLabel(
                              message.sender_type,
                            )}
                          </strong>

                          <time>
                            {formatDate(
                              message.created_at,
                            )}
                          </time>

                        </div>

                        <div className="message-body">
                          {message.message}
                        </div>

                      </div>
                    ),
                  )}

                </div>
              )}

            </article>

          </section>

          {/* ===================================================
              SIDEBAR
          =================================================== */}

          <aside className="sidebar">

            {/* =================================================
                CLIENT
            ================================================= */}

            <section className="card">

              <div className="card-title">
                👤 Informations client
              </div>

              <div className="client-profile">

                <div className="avatar">
                  {ticketData.customer_name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {ticketData.customer_name}
                  </strong>

                  <span>
                    Client PharmaFlow
                  </span>
                </div>

              </div>

              <div className="info-list">

                <div>
                  <span>
                    Email
                  </span>

                  {ticketData.customer_email ? (
                    <a
                      href={`mailto:${ticketData.customer_email}`}
                    >
                      {ticketData.customer_email}
                    </a>
                  ) : (
                    <strong>
                      Non renseigné
                    </strong>
                  )}
                </div>

                <div>
                  <span>
                    Téléphone
                  </span>

                  {ticketData.customer_phone ? (
                    <a
                      href={`tel:${ticketData.customer_phone}`}
                    >
                      {ticketData.customer_phone}
                    </a>
                  ) : (
                    <strong>
                      Non renseigné
                    </strong>
                  )}
                </div>

                <div>
                  <span>
                    Catégorie
                  </span>

                  <strong>
                    {categoryLabel(
                      ticketData.category,
                    )}
                  </strong>
                </div>

              </div>

            </section>

            {/* =================================================
                AFFECTATION
            ================================================= */}

            <section className="card">

              <div className="card-title">
                👨‍💼 Affectation
              </div>

              <div className="assignment-box">

                <span>
                  Agent responsable
                </span>

                {ticketData.assigned_to ? (
                  <strong>
                    {ticketData.assigned_to ===
                    member.id
                      ? "Vous"
                      : ticketData.assigned_to}
                  </strong>
                ) : (
                  <strong className="unassigned">
                    Non assigné
                  </strong>
                )}

              </div>

            </section>

            {/* =================================================
                DOSSIER
            ================================================= */}

            <section className="card">

              <div className="card-title">
                📁 Dossier
              </div>

              <div className="info-list">

                <div>
                  <span>
                    Numéro
                  </span>

                  <strong>
                    {ticketData.ticket_number}
                  </strong>
                </div>

                <div>
                  <span>
                    Statut
                  </span>

                  <strong>
                    {statusLabel(
                      ticketData.status,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Priorité
                  </span>

                  <strong>
                    {priorityLabel(
                      ticketData.priority,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Messages
                  </span>

                  <strong>
                    {ticketMessages.length}
                  </strong>
                </div>

              </div>

            </section>

            {/* =================================================
                CONTACT
            ================================================= */}

            <section className="card">

              <div className="card-title">
                ⚡ Contact
              </div>

              {ticketData.customer_email && (
                <a
                  href={`mailto:${ticketData.customer_email}?subject=Re: ${
                    ticketData.subject ??
                    ticketData.ticket_number
                  }`}
                  className="contact-button primary"
                >
                  ✉️ Envoyer un email
                </a>
              )}

              {ticketData.customer_phone && (
                <a
                  href={`tel:${ticketData.customer_phone}`}
                  className="contact-button secondary"
                >
                  📞 Appeler
                </a>
              )}

              {!ticketData.customer_email &&
                !ticketData.customer_phone && (
                  <div className="no-contact">
                    Aucun moyen de contact
                    renseigné.
                  </div>
                )}

            </section>

          </aside>

        </div>
      </div>

      {/* =======================================================
          STYLE
      ======================================================= */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .ticket-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(20,184,166,.10),
              transparent 30%
            ),
            #f7fafb;
          color: #102a2a;
          padding: 28px;
        }

        .page-shell {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
        }

        /* ======================================================
           HEADER
        ====================================================== */

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 22px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .back-button {
          width: 48px;
          height: 48px;
          flex: 0 0 auto;
          border-radius: 14px;
          display: grid;
          place-items: center;
          text-decoration: none;
          font-size: 24px;
          color: #0f766e;
          background: white;
          border: 1px solid #dcebea;
          transition: all .2s ease;
        }

        .back-button:hover {
          background: #eaf8f5;
          transform: translateX(-2px);
        }

        .eyebrow,
        .card-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #0f8b80;
        }

        .page-header h1 {
          margin: 4px 0 3px;
          font-size: 28px;
          line-height: 1.2;
          color: #173b3b;
        }

        .page-header p {
          margin: 0;
          color: #647878;
          font-size: 14px;
        }

        .agent-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 12px;
          text-decoration: none;
          background: #0f766e;
          color: white;
          font-weight: 700;
          font-size: 14px;
          transition: all .2s ease;
          white-space: nowrap;
        }

        .agent-button:hover {
          background: #0b625c;
          transform: translateY(-1px);
        }

        /* ======================================================
           STATUS BAR
        ====================================================== */

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 14px 18px;
          margin-bottom: 20px;
          background: white;
          border: 1px solid #dcebea;
          border-radius: 16px;
        }

        .status-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .status,
        .priority {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
        }

        .status.new {
          background: #f0ecff;
          color: #6d28d9;
        }

        .status.open {
          background: #e8f5ff;
          color: #0369a1;
        }

        .status.progress {
          background: #e9f8f5;
          color: #0f766e;
        }

        .status.pending {
          background: #fff7df;
          color: #a16207;
        }

        .status.resolved {
          background: #eaf8ed;
          color: #15803d;
        }

        .status.closed {
          background: #edf0f2;
          color: #475569;
        }

        .priority.normal {
          background: #eef2f3;
          color: #475569;
        }

        .priority.low {
          background: #f1f5f9;
          color: #64748b;
        }

        .priority.medium {
          background: #fff7df;
          color: #a16207;
        }

        .priority.high {
          background: #fff0e8;
          color: #c2410c;
        }

        .priority.danger {
          background: #feecec;
          color: #b91c1c;
        }

        .status-date {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #738383;
          font-size: 12px;
        }

        .status-date strong {
          color: #405858;
        }

        /* ======================================================
           GRID
        ====================================================== */

        .content-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            350px;
          gap: 20px;
          align-items: start;
        }

        .main-column,
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        /* ======================================================
           CARD
        ====================================================== */

        .card {
          background: white;
          border: 1px solid #dcebea;
          border-radius: 18px;
          padding: 22px;
          box-shadow:
            0 10px 30px
            rgba(15,118,110,.045);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 20px;
        }

        .card-header h2,
        .intervention-header h2 {
          margin: 5px 0 0;
          font-size: 20px;
          line-height: 1.3;
          color: #173b3b;
        }

        .ticket-icon,
        .intervention-icon {
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #e8f7f5;
          font-size: 21px;
        }

        /* ======================================================
           META
        ====================================================== */

        .ticket-meta-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .meta-item {
          padding: 14px;
          background: #f7faf9;
          border-radius: 12px;
          min-width: 0;
        }

        .meta-item span,
        .info-list span,
        .assignment-box span {
          display: block;
          font-size: 11px;
          color: #738383;
          margin-bottom: 5px;
        }

        .meta-item strong {
          display: block;
          font-size: 13px;
          color: #284545;
          word-break: break-word;
        }

        /* ======================================================
           INTERVENTION
        ====================================================== */

        .intervention-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .intervention-header p {
          margin: 7px 0 0;
          color: #718181;
          font-size: 13px;
          line-height: 1.5;
        }

        /* ======================================================
           FORMULAIRE RÉPONSE
        ====================================================== */

        .response-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .response-form label {
          font-size: 13px;
          font-weight: 800;
          color: #344d4c;
        }

        .response-form textarea {
          width: 100%;
          resize: vertical;
          min-height: 150px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid #d8e5e4;
          outline: none;
          font: inherit;
          color: #203a39;
          background: #fbfdfd;
          line-height: 1.55;
          transition: all .2s ease;
        }

        .response-form textarea::placeholder {
          color: #9aabab;
        }

        .response-form textarea:focus {
          border-color: #0f766e;
          box-shadow:
            0 0 0 3px
            rgba(15,118,110,.10);
          background: white;
        }

        .primary-action,
        .secondary-action {
          border: 0;
          cursor: pointer;
          border-radius: 11px;
          padding: 12px 16px;
          font-family: inherit;
          font-weight: 800;
          font-size: 13px;
          transition: all .2s ease;
        }

        .primary-action {
          color: white;
          background: #0f766e;
        }

        .primary-action:hover {
          background: #0b625c;
          transform: translateY(-1px);
        }

        /* ======================================================
           ACTIONS RAPIDES
        ====================================================== */

        .quick-actions {
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid #edf2f2;
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .section-label {
          grid-column: 1 / -1;
          font-size: 12px;
          font-weight: 900;
          color: #344d4c;
          margin-bottom: 2px;
        }

        .quick-actions form {
          width: 100%;
        }

        .quick-button {
          width: 100%;
          border: 0;
          cursor: pointer;
          border-radius: 11px;
          padding: 12px;
          font-family: inherit;
          font-weight: 800;
          font-size: 12px;
          transition: all .2s ease;
        }

        .quick-button:hover {
          transform: translateY(-1px);
        }

        .quick-button.blue {
          background: #eaf5ff;
          color: #0369a1;
        }

        .quick-button.orange {
          background: #fff5df;
          color: #a16207;
        }

        .quick-button.green {
          background: #eaf8ed;
          color: #15803d;
        }

        .quick-button.gray {
          background: #eef1f2;
          color: #475569;
        }

        /* ======================================================
           STATUS EDITOR
        ====================================================== */

        .status-editor {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #edf2f2;
        }

        .status-form {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .status-form select {
          flex: 1;
          min-width: 0;
          padding: 12px;
          border: 1px solid #d8e5e4;
          border-radius: 11px;
          background: white;
          font: inherit;
          outline: none;
          color: #294141;
        }

        .status-form select:focus {
          border-color: #0f766e;
          box-shadow:
            0 0 0 3px
            rgba(15,118,110,.10);
        }

        .secondary-action {
          color: #285050;
          background: #eef5f4;
        }

        .secondary-action:hover {
          background: #e0eeec;
        }

        /* ======================================================
           MESSAGES
        ====================================================== */

        .message-count {
          padding: 7px 10px;
          border-radius: 999px;
          background: #eef8f7;
          color: #0f766e;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .message {
          max-width: 88%;
          padding: 15px;
          border-radius: 14px;
        }

        .message.customer {
          align-self: flex-start;
          background: #f4f7f8;
          border: 1px solid #e4ebec;
        }

        .message.agent {
          align-self: flex-end;
          background: #eaf8f5;
          border: 1px solid #d4eee9;
        }

        .message-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 8px;
        }

        .message-top strong {
          color: #0f766e;
          font-size: 12px;
        }

        .message-top time {
          color: #7a8989;
          font-size: 10px;
          white-space: nowrap;
        }

        .message-body {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          line-height: 1.65;
          font-size: 14px;
          color: #273b3b;
        }

        /* ======================================================
           SIDEBAR
        ====================================================== */

        .card-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 17px;
          color: #294141;
        }

        .client-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 17px;
          border-bottom: 1px solid #edf1f1;
        }

        .avatar {
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #0f766e;
          color: white;
          font-weight: 900;
          font-size: 16px;
        }

        .client-profile strong,
        .client-profile span {
          display: block;
        }

        .client-profile strong {
          font-size: 14px;
          color: #263f3f;
        }

        .client-profile span {
          margin-top: 3px;
          color: #788888;
          font-size: 11px;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 17px;
        }

        .info-list > div {
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f3f3;
        }

        .info-list > div:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .info-list strong,
        .info-list a {
          color: #213939;
          font-size: 13px;
          word-break: break-word;
        }

        .info-list a {
          color: #0f766e;
          text-decoration: none;
        }

        .info-list a:hover {
          text-decoration: underline;
        }

        /* ======================================================
           AFFECTATION
        ====================================================== */

        .assignment-box {
          padding: 14px;
          border-radius: 12px;
          background: #f7faf9;
        }

        .assignment-box strong {
          font-size: 13px;
          color: #284545;
          word-break: break-word;
        }

        .unassigned {
          color: #a16207 !important;
        }

        /* ======================================================
           CONTACT
        ====================================================== */

        .contact-button {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 11px;
          margin-top: 9px;
          border-radius: 11px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition: all .2s ease;
        }

        .contact-button.primary {
          color: white;
          background: #0f766e;
        }

        .contact-button.primary:hover {
          background: #0b625c;
        }

        .contact-button.secondary {
          color: #285050;
          background: #eef5f4;
        }

        .contact-button.secondary:hover {
          background: #e0eeec;
        }

        .no-contact {
          padding: 13px;
          border-radius: 11px;
          background: #f7f9f9;
          color: #819090;
          font-size: 12px;
          text-align: center;
        }

        /* ======================================================
           EMPTY
        ====================================================== */

        .empty-state {
          text-align: center;
          padding: 45px 20px;
          color: #718181;
        }

        .empty-icon {
          width: 55px;
          height: 55px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: #edf7f6;
          font-size: 25px;
        }

        .empty-state h3 {
          margin: 0 0 5px;
          color: #294141;
          font-size: 15px;
        }

        .empty-state p {
          margin: 0;
          font-size: 13px;
        }

        /* ======================================================
           RESPONSIVE
        ====================================================== */

        @media (max-width: 1100px) {

          .content-grid {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            align-items: start;
          }

        }

        @media (max-width: 800px) {

          .ticket-page {
            padding: 18px;
          }

          .page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .agent-button {
            width: 100%;
          }

          .status-bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .status-date {
            flex-wrap: wrap;
          }

          .ticket-meta-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

        }

        @media (max-width: 650px) {

          .sidebar {
            grid-template-columns: 1fr;
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }

          .status-form {
            flex-direction: column;
          }

          .message {
            max-width: 100%;
          }

        }

        @media (max-width: 500px) {

          .ticket-page {
            padding: 12px;
          }

          .page-header h1 {
            font-size: 23px;
          }

          .page-header p {
            font-size: 12px;
          }

          .ticket-meta-grid {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 17px;
            border-radius: 15px;
          }

          .page-header {
            gap: 14px;
          }

          .header-left {
            align-items: flex-start;
          }

          .back-button {
            width: 42px;
            height: 42px;
          }

          .card-header h2,
          .intervention-header h2 {
            font-size: 18px;
          }

          .message-top {
            flex-direction: column;
            gap: 4px;
          }

        }

      `}</style>
    </main>
  );
}