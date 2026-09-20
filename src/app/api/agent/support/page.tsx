import Link from "next/link";

import { requireAgent } from "@/app/lib/agent/auth";

type Reclamation = {
  id: string;
  reference: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  subject: string;
  message: string;
  status:
    | "open"
    | "in_progress"
    | "waiting_client"
    | "resolved"
    | "closed";
  priority:
    | "low"
    | "normal"
    | "high"
    | "urgent";
  admin_reply: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
};

function hasPermission(
  permissions: Record<string, boolean> | null | undefined,
  permission: string,
) {
  return permissions?.[permission] === true;
}

function statusLabel(status: Reclamation["status"]) {
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

function priorityLabel(priority: Reclamation["priority"]) {
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

async function getReclamations(): Promise<Reclamation[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/agent/support`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return Array.isArray(data.reclamations)
      ? data.reclamations
      : [];
  } catch {
    return [];
  }
}

export default async function AgentSupportPage() {
  const agent = await requireAgent();

  const permissions = agent.permissions ?? {};

  const canView = hasPermission(
    permissions,
    "support.view",
  );

  const canManage = hasPermission(
    permissions,
    "support.manage",
  );

  if (!canView) {
    return (
      <main className="agent-access-denied">
        <div className="agent-denied-card">
          <div className="agent-denied-icon">🔒</div>

          <h1>Accès refusé</h1>

          <p>
            Votre compte ne possède pas la permission
            nécessaire pour accéder au support.
          </p>

          <Link href="/agent">
            ← Retour à mon espace
          </Link>
        </div>

        <style>{`
          .agent-access-denied {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f8fafc;
            font-family: Arial, sans-serif;
          }

          .agent-denied-card {
            width: 100%;
            max-width: 520px;
            padding: 40px;
            text-align: center;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
          }

          .agent-denied-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 18px;
            background: #f1f5f9;
            font-size: 28px;
          }

          .agent-denied-card h1 {
            margin: 0 0 10px;
            color: #0f172a;
            font-size: 28px;
          }

          .agent-denied-card p {
            margin: 0 0 24px;
            color: #64748b;
            line-height: 1.7;
          }

          .agent-denied-card a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 700;
          }
        `}</style>
      </main>
    );
  }

  const reclamations = await getReclamations();

  const openCount = reclamations.filter(
    (item) => item.status === "open",
  ).length;

  const inProgressCount = reclamations.filter(
    (item) => item.status === "in_progress",
  ).length;

  const urgentCount = reclamations.filter(
    (item) =>
      item.priority === "urgent" &&
      !["resolved", "closed"].includes(item.status),
  ).length;

  const resolvedCount = reclamations.filter(
    (item) =>
      item.status === "resolved" ||
      item.status === "closed",
  ).length;

  return (
    <main className="agent-support-page">
      <header className="agent-support-header">
        <div>
          <Link
            href="/agent"
            className="agent-back"
          >
            ← Mon espace
          </Link>

          <div className="agent-title-row">
            <div className="agent-title-icon">
              🛟
            </div>

            <div>
              <h1>Support & Réclamations</h1>

              <p>
                Gérez les demandes et réclamations
                qui nécessitent votre intervention.
              </p>
            </div>
          </div>
        </div>

        <div className="agent-user-box">
          <div className="agent-avatar">
            {agent.full_name
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>{agent.full_name}</strong>

            <span>
              {agent.role}
            </span>
          </div>
        </div>
      </header>

      <section className="agent-support-content">
        <div className="support-stats">
          <div className="support-stat">
            <span className="support-stat-icon">
              📥
            </span>

            <div>
              <strong>{openCount}</strong>
              <span>Demandes ouvertes</span>
            </div>
          </div>

          <div className="support-stat">
            <span className="support-stat-icon">
              🔄
            </span>

            <div>
              <strong>{inProgressCount}</strong>
              <span>En cours</span>
            </div>
          </div>

          <div className="support-stat">
            <span className="support-stat-icon">
              🚨
            </span>

            <div>
              <strong>{urgentCount}</strong>
              <span>Urgentes</span>
            </div>
          </div>

          <div className="support-stat">
            <span className="support-stat-icon">
              ✅
            </span>

            <div>
              <strong>{resolvedCount}</strong>
              <span>Résolues</span>
            </div>
          </div>
        </div>

        <section className="support-panel">
          <div className="support-panel-header">
            <div>
              <h2>Demandes de support</h2>

              <p>
                Toutes les demandes accessibles à votre
                rôle sont affichées ici.
              </p>
            </div>

            {canManage && (
              <span className="permission-badge">
                Gestion activée
              </span>
            )}
          </div>

          {reclamations.length === 0 ? (
            <div className="support-empty">
              <div className="support-empty-icon">
                🎉
              </div>

              <h3>
                Aucune demande pour le moment
              </h3>

              <p>
                Les nouvelles réclamations apparaîtront
                automatiquement dans cet espace.
              </p>
            </div>
          ) : (
            <div className="support-table-wrapper">
              <table className="support-table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Sujet</th>
                    <th>Priorité</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {reclamations.map(
                    (reclamation) => (
                      <tr key={reclamation.id}>
                        <td>
                          <strong>
                            {reclamation.reference}
                          </strong>
                        </td>

                        <td>
                          <div className="client-cell">
                            <strong>
                              {reclamation.client_name ||
                                "Client"}
                            </strong>

                            <span>
                              {reclamation.client_email ||
                                reclamation.client_phone ||
                                "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="subject-cell">
                            {reclamation.subject}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`priority priority-${reclamation.priority}`}
                          >
                            {priorityLabel(
                              reclamation.priority,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status status-${reclamation.status}`}
                          >
                            {statusLabel(
                              reclamation.status,
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="date-cell">
                            {formatDate(
                              reclamation.created_at,
                            )}
                          </span>
                        </td>

                        <td>
                          <Link
                            href={`/agent/support/${reclamation.id}`}
                            className="view-button"
                          >
                            Voir →
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <style>{`
        .agent-support-page {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .agent-support-header {
          min-height: 82px;
          padding: 18px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }

        .agent-back {
          display: inline-block;
          margin-bottom: 10px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }

        .agent-back:hover {
          color: #2563eb;
        }

        .agent-title-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .agent-title-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #eff6ff;
          font-size: 24px;
        }

        .agent-title-row h1 {
          margin: 0 0 4px;
          font-size: 25px;
          letter-spacing: -0.5px;
        }

        .agent-title-row p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .agent-user-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 13px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
        }

        .agent-avatar {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #2563eb;
          color: white;
          font-weight: 800;
        }

        .agent-user-box strong {
          display: block;
          font-size: 13px;
        }

        .agent-user-box span {
          display: block;
          margin-top: 2px;
          color: #64748b;
          font-size: 12px;
          text-transform: capitalize;
        }

        .agent-support-content {
          max-width: 1500px;
          margin: 0 auto;
          padding: 30px 32px 50px;
        }

        .support-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .support-stat {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
        }

        .support-stat-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #f1f5f9;
          font-size: 20px;
        }

        .support-stat strong {
          display: block;
          font-size: 24px;
          line-height: 1;
        }

        .support-stat span:not(.support-stat-icon) {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
        }

        .support-panel {
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.04);
        }

        .support-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .support-panel-header h2 {
          margin: 0 0 6px;
          font-size: 19px;
        }

        .support-panel-header p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .permission-badge {
          padding: 7px 11px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .support-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .support-table {
          width: 100%;
          min-width: 1000px;
          border-collapse: collapse;
        }

        .support-table th {
          padding: 14px 18px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .support-table td {
          padding: 16px 18px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 13px;
        }

        .support-table tbody tr:hover {
          background: #f8fafc;
        }

        .client-cell strong {
          display: block;
        }

        .client-cell span {
          display: block;
          margin-top: 4px;
          color: #94a3b8;
          font-size: 11px;
        }

        .subject-cell {
          max-width: 260px;
          overflow: hidden;
          color: #334155;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .date-cell {
          color: #64748b;
          white-space: nowrap;
          font-size: 12px;
        }

        .priority,
        .status {
          display: inline-flex;
          align-items: center;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
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

        .status-open {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .status-in_progress {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-waiting_client {
          background: #fefce8;
          color: #a16207;
        }

        .status-resolved {
          background: #ecfdf5;
          color: #047857;
        }

        .status-closed {
          background: #f1f5f9;
          color: #475569;
        }

        .view-button {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 9px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .view-button:hover {
          background: #dbeafe;
        }

        .support-empty {
          padding: 80px 24px;
          text-align: center;
        }

        .support-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: #ecfdf5;
          font-size: 28px;
        }

        .support-empty h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .support-empty p {
          max-width: 480px;
          margin: 0 auto;
          color: #64748b;
          line-height: 1.7;
          font-size: 13px;
        }

        @media (max-width: 900px) {
          .support-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .agent-support-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 600px) {
          .agent-support-header,
          .agent-support-content {
            padding-left: 16px;
            padding-right: 16px;
          }

          .support-stats {
            grid-template-columns: 1fr;
          }

          .agent-user-box {
            width: 100%;
          }

          .support-panel-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}