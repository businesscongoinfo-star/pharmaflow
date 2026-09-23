import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAgent } from "@/app/lib/agent/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Reclamation = {
  id: string;
  reference: string;
  pharmacy_id: string | null;
  client_user_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  subject: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

const STATUSES = [
  "new",
  "open",
  "pending",
  "in_progress",
  "resolved",
  "closed",
] as const;

const PRIORITIES = [
  "low",
  "normal",
  "medium",
  "high",
  "urgent",
  "critical",
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "Nouvelle",
    open: "Ouverte",
    pending: "En attente",
    in_progress: "En cours",
    resolved: "Résolue",
    closed: "Fermée",
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

    default:
      return "priority normal";
  }
}

/* =========================================================
   RÉPONSE ADMINISTRATIVE
========================================================= */

async function saveAdminReply(
  reclamationId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const reply = String(
    formData.get("admin_reply") ?? "",
  ).trim();

  if (!reply) {
    throw new Error(
      "La réponse ne peut pas être vide.",
    );
  }

  if (reply.length > 10000) {
    throw new Error(
      "La réponse est trop longue.",
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reclamations")
    .update({
      admin_reply: reply,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reclamationId);

  if (error) {
    console.error(
      "Save reclamation reply error:",
      error,
    );

    throw new Error(
      "Impossible d'enregistrer la réponse.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/* =========================================================
   RÉSOLUTION
========================================================= */

async function resolveReclamation(
  reclamationId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const resolution = String(
    formData.get("resolution") ?? "",
  ).trim();

  if (!resolution) {
    throw new Error(
      "La résolution ne peut pas être vide.",
    );
  }

  if (resolution.length > 10000) {
    throw new Error(
      "La résolution est trop longue.",
    );
  }

  const now = new Date().toISOString();

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reclamations")
    .update({
      resolution,
      status: "resolved",
      resolved_at: now,
      updated_at: now,
    })
    .eq("id", reclamationId);

  if (error) {
    console.error(
      "Resolve reclamation error:",
      error,
    );

    throw new Error(
      "Impossible de résoudre la réclamation.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/* =========================================================
   FERMER
========================================================= */

async function closeReclamation(
  reclamationId: string,
) {
  "use server";

  await requireAgent();

  const now = new Date().toISOString();

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reclamations")
    .update({
      status: "closed",
      closed_at: now,
      updated_at: now,
    })
    .eq("id", reclamationId);

  if (error) {
    console.error(
      "Close reclamation error:",
      error,
    );

    throw new Error(
      "Impossible de fermer la réclamation.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/* =========================================================
   STATUT
========================================================= */

async function updateReclamationStatus(
  reclamationId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const status = String(
    formData.get("status") ?? "",
  );

  if (
    !STATUSES.includes(
      status as (typeof STATUSES)[number],
    )
  ) {
    throw new Error(
      "Statut de réclamation invalide.",
    );
  }

  const supabase = createAdminClient();

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "resolved") {
    update.resolved_at =
      new Date().toISOString();
  }

  if (status === "closed") {
    update.closed_at =
      new Date().toISOString();
  }

  const { error } = await supabase
    .from("reclamations")
    .update(update)
    .eq("id", reclamationId);

  if (error) {
    console.error(
      "Update reclamation status error:",
      error,
    );

    throw new Error(
      "Impossible de modifier le statut.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/* =========================================================
   PRIORITÉ
========================================================= */

async function updateReclamationPriority(
  reclamationId: string,
  formData: FormData,
) {
  "use server";

  await requireAgent();

  const priority = String(
    formData.get("priority") ?? "",
  );

  if (
    !PRIORITIES.includes(
      priority as (typeof PRIORITIES)[number],
    )
  ) {
    throw new Error(
      "Priorité de réclamation invalide.",
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reclamations")
    .update({
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reclamationId);

  if (error) {
    console.error(
      "Update reclamation priority error:",
      error,
    );

    throw new Error(
      "Impossible de modifier la priorité.",
    );
  }

  revalidatePath(
    `/agent/support/reclamation/${reclamationId}`,
  );

  revalidatePath("/agent/support");

  redirect(
    `/agent/support/reclamation/${reclamationId}`,
  );
}

/* =========================================================
   PAGE
========================================================= */

export default async function ReclamationDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  await requireAgent();

  const supabase = createAdminClient();

  const { data: reclamation, error } =
    await supabase
      .from("reclamations")
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
          status,
          priority,
          admin_reply,
          resolution,
          created_at,
          updated_at,
          resolved_at,
          closed_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

  if (error) {
    console.error(
      "Reclamation detail error:",
      error,
    );
  }

  if (!reclamation) {
    notFound();
  }

  const item = reclamation as Reclamation;

  return (
    <main className="reclamation-page">

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
                Réclamation {item.reference}
              </h1>

              <p>
                Traitement et résolution du dossier
                client.
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

        {/* STATUS */}
        <section className="status-bar">

          <div className="status-group">

            <span
              className={statusClass(
                item.status,
              )}
            >
              {statusLabel(item.status)}
            </span>

            <span
              className={priorityClass(
                item.priority,
              )}
            >
              {priorityLabel(
                item.priority,
              )}
            </span>

          </div>

          <div className="status-date">
            Dernière modification :
            <strong>
              {formatDate(item.updated_at)}
            </strong>
          </div>

        </section>

        <div className="content-grid">

          {/* =================================================
              MAIN
          ================================================= */}

          <section className="main-column">

            {/* DOSSIER */}
            <article className="card">

              <div className="card-header">

                <div>

                  <span className="card-kicker">
                    RÉCLAMATION
                  </span>

                  <h2>
                    {item.subject}
                  </h2>

                </div>

                <div className="reclamation-icon">
                  ⚠️
                </div>

              </div>

              <div className="reference-box">

                <span>
                  Référence
                </span>

                <strong>
                  {item.reference}
                </strong>

              </div>

              <div className="meta-grid">

                <div>
                  <span>
                    Créée le
                  </span>

                  <strong>
                    {formatDate(
                      item.created_at,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Modifiée le
                  </span>

                  <strong>
                    {formatDate(
                      item.updated_at,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Résolue le
                  </span>

                  <strong>
                    {formatDate(
                      item.resolved_at,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Fermée le
                  </span>

                  <strong>
                    {formatDate(
                      item.closed_at,
                    )}
                  </strong>
                </div>

              </div>

            </article>

            {/* =================================================
                CENTRE DE RÉSOLUTION
            ================================================= */}

            <article className="card intervention-card">

              <div className="intervention-header">

                <div>

                  <span className="card-kicker">
                    ACTION AGENT
                  </span>

                  <h2>
                    Centre de résolution
                  </h2>

                  <p>
                    Répondez au client et traitez
                    directement la réclamation.
                  </p>

                </div>

                <div className="intervention-icon">
                  ⚡
                </div>

              </div>

              {/* RÉPONSE */}
              <form
                action={saveAdminReply.bind(
                  null,
                  item.id,
                )}
                className="response-form"
              >

                <label htmlFor="admin_reply">
                  Réponse au client
                </label>

                <textarea
                  id="admin_reply"
                  name="admin_reply"
                  rows={6}
                  defaultValue={
                    item.admin_reply ?? ""
                  }
                  placeholder="Écrivez votre réponse au client..."
                  required
                />

                <button
                  type="submit"
                  className="primary-action"
                >
                  ✉️ Enregistrer et envoyer
                </button>

              </form>

              {/* RÉSOLUTION */}
              <form
                action={resolveReclamation.bind(
                  null,
                  item.id,
                )}
                className="resolution-form"
              >

                <label htmlFor="resolution">
                  Résolution du problème
                </label>

                <textarea
                  id="resolution"
                  name="resolution"
                  rows={5}
                  defaultValue={
                    item.resolution ?? ""
                  }
                  placeholder="Décrivez précisément comment le problème a été résolu..."
                  required
                />

                <button
                  type="submit"
                  className="resolve-button"
                >
                  ✓ Résoudre la réclamation
                </button>

              </form>

              {/* ACTIONS */}
              <div className="quick-actions">

                <div className="section-label">
                  Actions rapides
                </div>

                <form
                  action={updateReclamationStatus.bind(
                    null,
                    item.id,
                  )}
                >

                  <input
                    type="hidden"
                    name="status"
                    value="in_progress"
                  />

                  <button
                    type="submit"
                    className="quick-button blue"
                  >
                    🔄 Mettre en cours
                  </button>

                </form>

                <form
                  action={updateReclamationStatus.bind(
                    null,
                    item.id,
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
                  action={closeReclamation.bind(
                    null,
                    item.id,
                  )}
                >

                  <button
                    type="submit"
                    className="quick-button gray"
                  >
                    🔒 Fermer le dossier
                  </button>

                </form>

              </div>

            </article>

            {/* STATUT */}
            <article className="card">

              <div className="card-title">
                📊 Gestion du statut
              </div>

              <form
                action={updateReclamationStatus.bind(
                  null,
                  item.id,
                )}
                className="status-form"
              >

                <select
                  name="status"
                  defaultValue={item.status}
                >

                  <option value="new">
                    Nouvelle
                  </option>

                  <option value="open">
                    Ouverte
                  </option>

                  <option value="in_progress">
                    En cours
                  </option>

                  <option value="pending">
                    En attente
                  </option>

                  <option value="resolved">
                    Résolue
                  </option>

                  <option value="closed">
                    Fermée
                  </option>

                </select>

                <button
                  type="submit"
                  className="secondary-action"
                >
                  Enregistrer le statut
                </button>

              </form>

            </article>

          </section>

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside className="sidebar">

            {/* CLIENT */}
            <section className="card">

              <div className="card-title">
                👤 Client
              </div>

              <div className="client-profile">

                <div className="avatar">
                  {(item.client_name ||
                    "C")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <strong>
                    {item.client_name ||
                      "Client non renseigné"}
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

                  {item.client_email ? (
                    <a
                      href={`mailto:${item.client_email}`}
                    >
                      {item.client_email}
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

                  {item.client_phone ? (
                    <a
                      href={`tel:${item.client_phone}`}
                    >
                      {item.client_phone}
                    </a>
                  ) : (
                    <strong>
                      Non renseigné
                    </strong>
                  )}
                </div>

                <div>
                  <span>
                    Utilisateur
                  </span>

                  <strong>
                    {item.client_user_id ||
                      "Non associé"}
                  </strong>
                </div>

              </div>

            </section>

            {/* PHARMACIE */}
            <section className="card">

              <div className="card-title">
                🏥 Pharmacie
              </div>

              <div className="info-list">

                <div>
                  <span>
                    Pharmacy ID
                  </span>

                  <strong>
                    {item.pharmacy_id ||
                      "Non associé"}
                  </strong>
                </div>

                <div>
                  <span>
                    Référence
                  </span>

                  <strong>
                    {item.reference}
                  </strong>
                </div>

              </div>

            </section>

            {/* PRIORITÉ */}
            <section className="card">

              <div className="card-title">
                🚨 Priorité
              </div>

              <form
                action={updateReclamationPriority.bind(
                  null,
                  item.id,
                )}
              >

                <select
                  name="priority"
                  defaultValue={
                    item.priority
                  }
                  className="full-select"
                >

                  <option value="low">
                    Faible
                  </option>

                  <option value="normal">
                    Normale
                  </option>

                  <option value="medium">
                    Moyenne
                  </option>

                  <option value="high">
                    Haute
                  </option>

                  <option value="urgent">
                    Urgente
                  </option>

                  <option value="critical">
                    Critique
                  </option>

                </select>

                <button
                  type="submit"
                  className="secondary-action full-button"
                >
                  Modifier la priorité
                </button>

              </form>

            </section>

            {/* CONTACT */}
            <section className="card">

              <div className="card-title">
                ⚡ Contact
              </div>

              {item.client_email && (
                <a
                  href={`mailto:${item.client_email}?subject=Re: ${item.subject}`}
                  className="contact-button primary"
                >
                  ✉️ Email
                </a>
              )}

              {item.client_phone && (
                <a
                  href={`tel:${item.client_phone}`}
                  className="contact-button secondary"
                >
                  📞 Appeler
                </a>
              )}

            </section>

          </aside>

        </div>
      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .reclamation-page {
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
        }

        .back-button {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          text-decoration: none;
          font-size: 24px;
          color: #0f766e;
          background: white;
          border: 1px solid #dcebea;
        }

        .eyebrow,
        .card-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #0f8b80;
        }

        h1 {
          margin: 4px 0 3px;
          font-size: 28px;
        }

        .page-header p {
          margin: 0;
          color: #647878;
          font-size: 14px;
        }

        .agent-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 12px;
          text-decoration: none;
          background: #0f766e;
          color: white;
          font-weight: 700;
          font-size: 14px;
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
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
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
          gap: 5px;
          color: #738383;
          font-size: 12px;
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
        }

        .reclamation-icon,
        .intervention-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #fff7df;
          font-size: 21px;
        }

        .reference-box {
          padding: 15px;
          border-radius: 13px;
          background: #f7faf9;
          margin-bottom: 14px;
        }

        .reference-box span {
          display: block;
          font-size: 11px;
          color: #748383;
          margin-bottom: 5px;
        }

        .reference-box strong {
          font-size: 15px;
          color: #0f766e;
        }

        .meta-grid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 12px;
        }

        .meta-grid > div {
          padding: 14px;
          background: #f7faf9;
          border-radius: 12px;
        }

        .meta-grid span,
        .info-list span {
          display: block;
          font-size: 11px;
          color: #738383;
          margin-bottom: 5px;
        }

        .meta-grid strong {
          font-size: 13px;
        }

        .response-form,
        .resolution-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .resolution-form {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid #edf2f2;
        }

        .response-form label,
        .resolution-form label {
          font-size: 13px;
          font-weight: 800;
        }

        textarea {
          width: 100%;
          resize: vertical;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid #d8e5e4;
          outline: none;
          font: inherit;
          color: #203a39;
          background: #fbfdfd;
        }

        textarea:focus,
        select:focus {
          border-color: #0f766e;
          box-shadow:
            0 0 0 3px
            rgba(15,118,110,.10);
        }

        .primary-action,
        .resolve-button,
        .secondary-action {
          border: 0;
          cursor: pointer;
          border-radius: 11px;
          padding: 12px 16px;
          font-weight: 800;
          font-size: 13px;
        }

        .primary-action {
          color: white;
          background: #0f766e;
        }

        .resolve-button {
          color: white;
          background: #15803d;
        }

        .quick-actions {
          margin-top: 22px;
          padding-top: 20px;
          border-top: 1px solid #edf2f2;
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .section-label {
          grid-column: 1 / -1;
          font-size: 12px;
          font-weight: 900;
          color: #344d4c;
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

        .quick-button.gray {
          background: #eef1f2;
          color: #475569;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 17px;
        }

        .status-form {
          display: flex;
          gap: 10px;
        }

        select {
          padding: 12px;
          border: 1px solid #d8e5e4;
          border-radius: 11px;
          background: white;
          font: inherit;
          outline: none;
        }

        .status-form select {
          flex: 1;
        }

        .secondary-action {
          color: #285050;
          background: #eef5f4;
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
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #0f766e;
          color: white;
          font-weight: 900;
        }

        .client-profile strong,
        .client-profile span {
          display: block;
        }

        .client-profile strong {
          font-size: 14px;
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

        .full-select {
          width: 100%;
        }

        .full-button {
          width: 100%;
          margin-top: 9px;
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

        @media (max-width: 1000px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .reclamation-page {
            padding: 15px;
          }

          .page-header,
          .status-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .agent-button {
            width: 100%;
            justify-content: center;
          }

          .meta-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }

          .status-form {
            flex-direction: column;
          }
        }

        @media (max-width: 450px) {
          .meta-grid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 23px;
          }
        }

      `}</style>
    </main>
  );
}