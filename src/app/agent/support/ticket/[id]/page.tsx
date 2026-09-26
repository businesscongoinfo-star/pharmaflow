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

type TeamMember = {
  id: string;
  role: string | null;
  permissions: unknown;
  is_active: boolean | null;
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
| RÔLES / PERMISSIONS
|--------------------------------------------------------------------------
*/

function normalizeRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizePermissions(
  permissions: unknown,
): Record<string, boolean> {
  if (
    permissions &&
    typeof permissions === "object" &&
    !Array.isArray(permissions)
  ) {
    return permissions as Record<string, boolean>;
  }

  if (Array.isArray(permissions)) {
    return permissions.reduce<Record<string, boolean>>(
      (result, permission) => {
        if (typeof permission === "string") {
          result[permission] = true;
        }

        return result;
      },
      {},
    );
  }

  return {};
}

function isTechnical(role: unknown) {
  const value = normalizeRole(role);

  return (
    value === "technical" ||
    value === "technique" ||
    value === "technicien" ||
    value === "technicalagent"
  );
}

function isAdministrator(role: unknown) {
  const value = normalizeRole(role);

  return (
    value === "superadmin" ||
    value === "superadministrateur" ||
    value === "platformadmin" ||
    value === "administrator" ||
    value === "admin"
  );
}

function canManageSupport(
  role: unknown,
  permissions: unknown,
) {
  const normalizedPermissions =
    normalizePermissions(permissions);

  return (
    normalizedPermissions["support.manage"] === true ||
    isTechnical(role) ||
    isAdministrator(role)
  );
}

function canAssignSupport(
  role: unknown,
  permissions: unknown,
) {
  return canManageSupport(
    role,
    permissions,
  );
}

/*
|--------------------------------------------------------------------------
| OUTILS
|--------------------------------------------------------------------------
*/

function formatDate(
  value: string | null | undefined,
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

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
    default:
      return "status open";
  }
}

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

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

function senderLabel(senderType: string) {
  const value = senderType.toLowerCase();

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

  if (value === "system") {
    return "Système PharmaFlow";
  }

  return senderType;
}

function senderClass(senderType: string) {
  const value = senderType.toLowerCase();

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
| VÉRIFICATION CENTRALISÉE
|--------------------------------------------------------------------------
*/

async function requireSupportManager() {
  const member = await requireAgent();

  const allowed = canManageSupport(
    member.role,
    member.permissions,
  );

  if (!allowed) {
    throw new Error(
      "Vous n'êtes pas autorisé à gérer les tickets support.",
    );
  }

  return member;
}

/*
|--------------------------------------------------------------------------
| PRENDRE EN CHARGE
|--------------------------------------------------------------------------
*/

async function takeTicket(ticketId: string) {
  "use server";

  const member =
    await requireSupportManager();

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
      "[SUPPORT] takeTicket:",
      error,
    );

    throw new Error(
      "Impossible de prendre en charge le ticket.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| ASSIGNER / TRANSFÉRER
|--------------------------------------------------------------------------
*/

async function assignTicket(
  ticketId: string,
  formData: FormData,
) {
  "use server";

  const member =
    await requireSupportManager();

  const assignedTo =
    String(
      formData.get("assigned_to") ?? "",
    ).trim();

  if (!assignedTo) {
    throw new Error(
      "Membre de l'équipe invalide.",
    );
  }

  const supabase =
    createAdminClient();

  /*
   * Vérifier que le membre existe réellement
   * et qu'il est actif.
   */
  const {
    data: target,
    error: targetError,
  } = await supabase
    .from("platform_team_members")
    .select(
      `
        id,
        role,
        permissions,
        is_active,
        created_at
      `,
    )
    .eq("id", assignedTo)
    .maybeSingle();

  if (targetError) {
    console.error(
      "[SUPPORT] target member:",
      targetError,
    );

    throw new Error(
      "Impossible de vérifier le membre sélectionné.",
    );
  }

  if (!target) {
    throw new Error(
      "Le membre sélectionné n'existe pas.",
    );
  }

  if (target.is_active === false) {
    throw new Error(
      "Ce membre de l'équipe est désactivé.",
    );
  }

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("support_tickets")
      .update({
        assigned_to: target.id,
        status: "in_progress",
        updated_at: now,
      })
      .eq("id", ticketId);

  if (error) {
    console.error(
      "[SUPPORT] assignTicket:",
      error,
    );

    throw new Error(
      "Impossible de transférer le ticket.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath("/agent/support");

  revalidatePath("/agent/technique");

  void member;

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

  await requireSupportManager();

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

  const supabase =
    createAdminClient();

  const now =
    new Date().toISOString();

  const { error } =
    await supabase
      .from("support_tickets")
      .update({
        status:
          rawStatus as TicketStatus,
        updated_at: now,
      })
      .eq("id", ticketId);

  if (error) {
    console.error(
      "[SUPPORT] updateStatus:",
      error,
    );

    throw new Error(
      "Impossible de modifier le statut.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| RÉPONDRE
|--------------------------------------------------------------------------
*/

async function sendTicketMessage(
  ticketId: string,
  formData: FormData,
) {
  "use server";

  const member =
    await requireSupportManager();

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
      "[SUPPORT] sendMessage:",
      messageError,
    );

    throw new Error(
      "Impossible d'envoyer la réponse.",
    );
  }

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
      "[SUPPORT] updateAfterMessage:",
      ticketError,
    );

    throw new Error(
      "Le message a été envoyé, mais le ticket n'a pas pu être mis à jour.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| RÉSOUDRE
|--------------------------------------------------------------------------
*/

async function resolveTicket(
  ticketId: string,
) {
  "use server";

  const member =
    await requireSupportManager();

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
      "[SUPPORT] resolve:",
      error,
    );

    throw new Error(
      "Impossible de résoudre le ticket.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/ticket/${ticketId}`,
  );
}

/*
|--------------------------------------------------------------------------
| FERMER
|--------------------------------------------------------------------------
*/

async function closeTicket(
  ticketId: string,
) {
  "use server";

  await requireSupportManager();

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
      "[SUPPORT] close:",
      error,
    );

    throw new Error(
      "Impossible de fermer le ticket.",
    );
  }

  revalidatePath(
    `/agent/support/ticket/${ticketId}`,
  );

  revalidatePath("/agent/support");

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
  const { id } = await params;

  const member =
    await requireAgent();

  const canManage =
    canManageSupport(
      member.role,
      member.permissions,
    );

  if (!canManage) {
    redirect("/agent/support");
  }

  const supabase =
    createAdminClient();

  /*
   * TICKET
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
      "[SUPPORT] ticket:",
      ticketError,
    );
  }

  if (!ticket) {
    notFound();
  }

  /*
   * MESSAGES
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
      "[SUPPORT] messages:",
      messagesError,
    );
  }

  /*
   * MEMBRES DE L'ÉQUIPE
   *
   * On ne récupère que les membres actifs.
   */

  const {
    data: teamMembers,
    error: teamError,
  } = await supabase
    .from("platform_team_members")
    .select(
      `
        id,
        role,
        permissions,
        is_active,
        created_at
      `,
    )
    .eq("is_active", true)
    .order("created_at", {
      ascending: true,
    });

  if (teamError) {
    console.error(
      "[SUPPORT] team:",
      teamError,
    );
  }

  const ticketData =
    ticket as SupportTicket;

  const ticketMessages =
    (messages ?? []) as SupportMessage[];

  const activeMembers =
    (teamMembers ?? []) as TeamMember[];

  /*
   * Les rôles réellement utiles au transfert.
   *
   * On ne suppose pas qu'une colonne "team" existe.
   */

  const transferableMembers =
    activeMembers.filter(
      (item) => {
        const role =
          normalizeRole(item.role);

        return (
          role === "support" ||
          role === "supportagent" ||
          role === "technical" ||
          role === "technique" ||
          role === "technicien" ||
          role === "technicalagent" ||
          role === "operations" ||
          role === "operationsagent" ||
          role === "superadmin" ||
          role === "superadministrateur" ||
          role === "platformadmin" ||
          role === "administrator" ||
          role === "admin"
        );
      },
    );

  return (
    <main className="ticket-page">
      <div className="page-shell">

        {/* HEADER */}

        <header className="page-header">
          <div className="header-left">
            <Link
              href="/agent/support"
              className="back-button"
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
                Traitement et résolution du problème client.
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

        {/* STATUT */}

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

        <div className="content-grid">

          {/* COLONNE PRINCIPALE */}

          <section className="main-column">

            {/* INFORMATIONS */}

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
                  <span>Catégorie</span>
                  <strong>
                    {categoryLabel(
                      ticketData.category,
                    )}
                  </strong>
                </div>

                <div className="meta-item">
                  <span>Priorité</span>
                  <strong>
                    {priorityLabel(
                      ticketData.priority,
                    )}
                  </strong>
                </div>

                <div className="meta-item">
                  <span>Créé le</span>
                  <strong>
                    {formatDate(
                      ticketData.created_at,
                    )}
                  </strong>
                </div>

                <div className="meta-item">
                  <span>Mis à jour</span>
                  <strong>
                    {formatDate(
                      ticketData.updated_at,
                    )}
                  </strong>
                </div>
              </div>
            </article>

            {/* INTERVENTION */}

            <article className="card intervention-card">

              <div className="intervention-header">
                <div>
                  <span className="card-kicker">
                    ACTION AGENT
                  </span>

                  <h2>
                    Centre d'intervention
                  </h2>

                  <p>
                    Répondez au client et faites évoluer le dossier.
                  </p>
                </div>

                <div className="intervention-icon">
                  ⚡
                </div>
              </div>

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

              {/* TRANSFERT */}

              <div className="assignment-editor">

                <div className="section-label">
                  🔄 Transférer le ticket
                </div>

                <p className="assignment-help">
                  Affectez ce ticket à un membre actif de l'équipe Support,
                  Technique ou Administration.
                </p>

                {transferableMembers.length === 0 ? (
                  <div className="no-team">
                    Aucun membre actif disponible pour le transfert.
                  </div>
                ) : (
                  <form
                    action={assignTicket.bind(
                      null,
                      ticketData.id,
                    )}
                    className="assignment-form"
                  >
                    <select
                      name="assigned_to"
                      defaultValue={
                        ticketData.assigned_to ?? ""
                      }
                      required
                      aria-label="Membre responsable"
                    >
                      <option value="">
                        Sélectionner un responsable
                      </option>

                      {transferableMembers.map(
                        (teamMember) => (
                          <option
                            key={teamMember.id}
                            value={teamMember.id}
                          >
                            {teamMember.role ||
                              "Membre équipe"}{" "}
                            —{" "}
                            {teamMember.id ===
                            ticketData.assigned_to
                              ? "Responsable actuel"
                              : teamMember.id.slice(
                                  0,
                                  8,
                                )}
                          </option>
                        ),
                      )}
                    </select>

                    <button
                      type="submit"
                      className="secondary-action"
                    >
                      🔄 Affecter
                    </button>
                  </form>
                )}
              </div>

              {/* STATUT */}

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

            {/* CONVERSATION */}

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
                    Envoyez la première réponse au client.
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

          {/* SIDEBAR */}

          <aside className="sidebar">

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
                  <span>Email</span>

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
                  <span>Téléphone</span>

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
                  <span>Catégorie</span>

                  <strong>
                    {categoryLabel(
                      ticketData.category,
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {/* AFFECTATION */}

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

            {/* DOSSIER */}

            <section className="card">

              <div className="card-title">
                📁 Dossier
              </div>

              <div className="info-list">

                <div>
                  <span>Numéro</span>

                  <strong>
                    {ticketData.ticket_number}
                  </strong>
                </div>

                <div>
                  <span>Statut</span>

                  <strong>
                    {statusLabel(
                      ticketData.status,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Priorité</span>

                  <strong>
                    {priorityLabel(
                      ticketData.priority,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Messages</span>

                  <strong>
                    {ticketMessages.length}
                  </strong>
                </div>
              </div>
            </section>

            {/* CONTACT */}

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
                    Aucun moyen de contact renseigné.
                  </div>
                )}
            </section>
          </aside>
        </div>
      </div>

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
          white-space: nowrap;
        }

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
        }

        .primary-action {
          color: white;
          background: #0f766e;
        }

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

        .assignment-editor,
        .status-editor {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #edf2f2;
        }

        .assignment-help {
          margin: 6px 0 10px;
          color: #718181;
          font-size: 12px;
          line-height: 1.5;
        }

        .assignment-form,
        .status-form {
          display: flex;
          gap: 10px;
        }

        .assignment-form select,
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

        .secondary-action {
          color: #285050;
          background: #eef5f4;
          white-space: nowrap;
        }

        .no-team {
          padding: 12px;
          border-radius: 10px;
          background: #fff8e8;
          color: #946200;
          font-size: 12px;
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

        .message-count {
          padding: 7px 10px;
          border-radius: 999px;
          background: #eef8f7;
          color: #0f766e;
          font-size: 12px;
          font-weight: 800;
        }

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
        }

        .contact-button.primary {
          color: white;
          background: #0f766e;
        }

        .contact-button.secondary {
          color: #285050;
          background: #eef5f4;
        }

        .no-contact {
          padding: 13px;
          border-radius: 11px;
          background: #f7f9f9;
          color: #819090;
          font-size: 12px;
          text-align: center;
        }

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

          .assignment-form,
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

          .ticket-meta-grid {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 17px;
            border-radius: 15px;
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