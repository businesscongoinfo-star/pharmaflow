import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import { requireAgent } from "@/app/lib/agent/auth";

import { createAdminClient } from "@/app/lib/supabase/admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function hasPermission(
  permissions: Record<string, boolean> | null | undefined,
  permission: string,
) {
  return permissions?.[permission] === true;
}

function statusLabel(
  status: string,
) {
  switch (status) {
    case "open":
      return "Ouverte";

    case "in_progress":
      return "En cours";

    case "waiting_client":
      return "En attente du client";

    case "resolved":
      return "Résolue";

    case "closed":
      return "Fermée";

    default:
      return status;
  }
}

function priorityLabel(
  priority: string,
) {
  switch (priority) {
    case "low":
      return "Faible";

    case "normal":
      return "Normale";

    case "high":
      return "Élevée";

    case "urgent":
      return "Urgente";

    default:
      return priority;
  }
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

export default async function AgentSupportDetailPage({
  params,
}: PageProps) {
  const agent =
    await requireAgent();

  if (
    !hasPermission(
      agent.permissions,
      "support.view",
    )
  ) {
    notFound();
  }

  const {
    id,
  } = await params;

  const admin =
    createAdminClient();

  const {
    data: reclamation,
    error,
  } =
    await admin
      .from("reclamations")
      .select(
        `
          id,
          reference,
          client_name,
          client_email,
          client_phone,
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
        `,
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();

  if (
    error ||
    !reclamation
  ) {
    notFound();
  }

  const {
    data: messages,
  } =
    await admin
      .from(
        "reclamation_messages",
      )
      .select(
        `
          id,
          sender_user_id,
          sender_type,
          message,
          created_at
        `,
      )
      .eq(
        "reclamation_id",
        id,
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      );

  const canManage =
    hasPermission(
      agent.permissions,
      "support.manage",
    );

  return (
    <main className="agent-detail-page">

      <header className="agent-detail-header">

        <div>
          <Link
            href="/agent/support"
            className="back-link"
          >
            ← Support
          </Link>

          <h1>
            {reclamation.subject}
          </h1>

          <p>
            Réclamation{" "}
            <strong>
              {reclamation.reference}
            </strong>
          </p>
        </div>

        <div className="header-badge">
          {statusLabel(
            reclamation.status,
          )}
        </div>

      </header>

      <div className="agent-detail-layout">

        <section className="detail-main">

          <div className="detail-card">

            <div className="detail-card-header">
              <h2>
                Demande du client
              </h2>

              <span
                className={`priority priority-${reclamation.priority}`}
              >
                {priorityLabel(
                  reclamation.priority,
                )}
              </span>
            </div>

            <div className="client-information">

              <div>
                <span>
                  Client
                </span>

                <strong>
                  {reclamation.client_name ||
                    "Non renseigné"}
                </strong>
              </div>

              <div>
                <span>
                  E-mail
                </span>

                <strong>
                  {reclamation.client_email ||
                    "Non renseigné"}
                </strong>
              </div>

              <div>
                <span>
                  Téléphone
                </span>

                <strong>
                  {reclamation.client_phone ||
                    "Non renseigné"}
                </strong>
              </div>

              <div>
                <span>
                  Créée le
                </span>

                <strong>
                  {formatDate(
                    reclamation.created_at,
                  )}
                </strong>
              </div>

            </div>

            <div className="message-box">
              <p>
                {reclamation.message}
              </p>
            </div>

          </div>

          <div className="detail-card">

            <div className="detail-card-header">
              <h2>
                Conversation
              </h2>

              <span className="message-count">
                {messages?.length ?? 0} message(s)
              </span>
            </div>

            <div className="conversation">

              {messages &&
              messages.length > 0 ? (
                messages.map(
                  (
                    message,
                  ) => (
                    <div
                      key={
                        message.id
                      }
                      className={`conversation-message ${message.sender_type}`}
                    >
                      <div className="conversation-meta">
                        <strong>
                          {message.sender_type ===
                          "admin"
                            ? "Équipe PharmaFlow"
                            : message.sender_type ===
                                "client"
                              ? "Client"
                              : "Système"}
                        </strong>

                        <span>
                          {formatDate(
                            message.created_at,
                          )}
                        </span>
                      </div>

                      <p>
                        {
                          message.message
                        }
                      </p>
                    </div>
                  ),
                )
              ) : (
                <div className="no-messages">
                  Aucun message supplémentaire.
                </div>
              )}

            </div>

          </div>

          {reclamation.admin_reply && (
            <div className="detail-card">

              <div className="detail-card-header">
                <h2>
                  Dernière réponse
                </h2>
              </div>

              <div className="reply-box">
                <p>
                  {reclamation.admin_reply}
                </p>
              </div>

            </div>
          )}

          {reclamation.resolution && (
            <div className="detail-card">

              <div className="detail-card-header">
                <h2>
                  Résolution
                </h2>
              </div>

              <div className="resolution-box">
                <p>
                  {reclamation.resolution}
                </p>
              </div>

            </div>
          )}

        </section>

        <aside className="detail-sidebar">

          <div className="detail-card">

            <h2>
              Informations
            </h2>

            <div className="side-row">
              <span>Référence</span>
              <strong>
                {reclamation.reference}
              </strong>
            </div>

            <div className="side-row">
              <span>Statut</span>
              <strong>
                {statusLabel(
                  reclamation.status,
                )}
              </strong>
            </div>

            <div className="side-row">
              <span>Priorité</span>
              <strong>
                {priorityLabel(
                  reclamation.priority,
                )}
              </strong>
            </div>

            <div className="side-row">
              <span>Dernière modification</span>
              <strong>
                {formatDate(
                  reclamation.updated_at,
                )}
              </strong>
            </div>

          </div>

          <div className="detail-card">

            <h2>
              Votre accès
            </h2>

            <div className="permission-info">
              <span>
                👤
              </span>

              <div>
                <strong>
                  {agent.full_name}
                </strong>

                <small>
                  {agent.role}
                </small>
              </div>
            </div>

            <div className="permission-line">
              <span>
                Voir le support
              </span>

              <strong>
                {hasPermission(
                  agent.permissions,
                  "support.view",
                )
                  ? "✓"
                  : "—"}
              </strong>
            </div>

            <div className="permission-line">
              <span>
                Gérer le support
              </span>

              <strong>
                {canManage
                  ? "✓"
                  : "—"}
              </strong>
            </div>

          </div>

        </aside>

      </div>

      <style>{`
        .agent-detail-page {
          min-height: 100vh;
          padding: 30px;
          background: #f8fafc;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .agent-detail-header {
          max-width: 1400px;
          margin: 0 auto 24px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 10px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .agent-detail-header h1 {
          margin: 0 0 7px;
          font-size: 28px;
          letter-spacing: -0.5px;
        }

        .agent-detail-header p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .header-badge {
          padding: 9px 14px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 800;
        }

        .agent-detail-layout {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 24px;
        }

        .detail-main {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .detail-card {
          padding: 24px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.04);
        }

        .detail-card h2 {
          margin: 0;
          font-size: 18px;
        }

        .detail-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .client-information {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .client-information div {
          padding: 13px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
        }

        .client-information span {
          display: block;
          margin-bottom: 5px;
          color: #94a3b8;
          font-size: 11px;
        }

        .client-information strong {
          display: block;
          font-size: 12px;
          word-break: break-word;
        }

        .message-box {
          padding: 20px;
          border-radius: 15px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .message-box p,
        .reply-box p,
        .resolution-box p {
          margin: 0;
          color: #334155;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .priority {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .priority-low {
          background: #f1f5f9;
          color: #475569;
        }

        .priority-normal {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .priority-high {
          background: #fff7ed;
          color: #c2410c;
        }

        .priority-urgent {
          background: #fef2f2;
          color: #b91c1c;
        }

        .message-count {
          color: #64748b;
          font-size: 12px;
        }

        .conversation {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .conversation-message {
          padding: 15px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .conversation-message.admin {
          background: #eff6ff;
          border-color: #dbeafe;
        }

        .conversation-message.client {
          background: #ffffff;
        }

        .conversation-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .conversation-meta strong {
          font-size: 12px;
        }

        .conversation-meta span {
          color: #94a3b8;
          font-size: 11px;
        }

        .conversation-message p {
          margin: 0;
          color: #334155;
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .no-messages {
          padding: 30px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }

        .reply-box {
          padding: 18px;
          border-radius: 14px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
        }

        .resolution-box {
          padding: 18px;
          border-radius: 14px;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
        }

        .detail-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .side-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 13px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .side-row:last-child {
          border-bottom: 0;
        }

        .side-row span {
          color: #64748b;
          font-size: 12px;
        }

        .side-row strong {
          text-align: right;
          font-size: 12px;
        }

        .permission-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          margin-top: 16px;
          margin-bottom: 15px;
          border-radius: 14px;
          background: #f8fafc;
        }

        .permission-info > span {
          font-size: 22px;
        }

        .permission-info strong {
          display: block;
          font-size: 13px;
        }

        .permission-info small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          text-transform: capitalize;
        }

        .permission-line {
          display: flex;
          justify-content: space-between;
          padding: 11px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 12px;
        }

        .permission-line:last-child {
          border-bottom: 0;
        }

        .permission-line strong {
          color: #059669;
        }

        @media (max-width: 1000px) {
          .agent-detail-layout {
            grid-template-columns: 1fr;
          }

          .client-information {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .agent-detail-page {
            padding: 16px;
          }

          .agent-detail-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .client-information {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}