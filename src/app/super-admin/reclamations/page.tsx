"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ReclamationStatus =
  | "open"
  | "in_progress"
  | "waiting_client"
  | "resolved"
  | "closed";

type ReclamationPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

type Reclamation = {
  id: string;
  reference: string;
  pharmacy_id: string | null;
  client_user_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  subject: string;
  message: string;
  status: ReclamationStatus;
  priority: ReclamationPriority;
  admin_reply: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

type ReclamationMessage = {
  id: string;
  reclamation_id: string;
  sender_user_id: string | null;
  sender_type:
    | "client"
    | "admin"
    | "system";
  message: string;
  created_at: string;
};

type Notification = {
  id: string;
  channel: string;
  notification_type: string;
  message: string;
  sent_at: string | null;
  created_at: string;
};

type DetailResponse = {
  success: boolean;
  reclamation: Reclamation;
  messages: ReclamationMessage[];
  notifications: Notification[];
};

const statusLabels: Record<
  ReclamationStatus,
  string
> = {
  open: "Nouvelle",
  in_progress:
    "En cours",
  waiting_client:
    "En attente du client",
  resolved: "Résolue",
  closed: "Fermée",
};

const priorityLabels: Record<
  ReclamationPriority,
  string
> = {
  low: "Faible",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

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

function statusClass(
  status: ReclamationStatus,
) {
  return `status status-${status}`;
}

function priorityClass(
  priority: ReclamationPriority,
) {
  return `priority priority-${priority}`;
}

export default function SuperAdminReclamations() {
  const [
    reclamations,
    setReclamations,
  ] = useState<Reclamation[]>([]);

  const [
    selected,
    setSelected,
  ] = useState<Reclamation | null>(
    null,
  );

  const [
    messages,
    setMessages,
  ] = useState<
    ReclamationMessage[]
  >([]);

  const [
    notifications,
    setNotifications,
  ] = useState<
    Notification[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "" | ReclamationStatus
  >("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    reply,
    setReply,
  ] = useState("");

  const [
    resolution,
    setResolution,
  ] = useState("");

  const [
    priority,
    setPriority,
  ] =
    useState<ReclamationPriority>(
      "normal",
    );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadReclamations =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const params =
            new URLSearchParams();

          if (search.trim()) {
            params.set(
              "search",
              search.trim(),
            );
          }

          if (statusFilter) {
            params.set(
              "status",
              statusFilter,
            );
          }

          const response =
            await fetch(
              `/api/super-admin/reclamations?${params.toString()}`,
              {
                cache: "no-store",
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
                "Impossible de charger les réclamations.",
            );
          }

          setReclamations(
            data.reclamations || [],
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Erreur inconnue.",
          );
        } finally {
          setLoading(false);
        }
      },
      [search, statusFilter],
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadReclamations();
        },
        250,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    loadReclamations,
  ]);

  const loadDetail =
    useCallback(
      async (
        reclamation: Reclamation,
      ) => {
        try {
          setDetailLoading(true);
          setError("");
          setSuccessMessage("");

          const response =
            await fetch(
              `/api/super-admin/reclamations?id=${reclamation.id}`,
              {
                cache: "no-store",
              },
            );

          const data =
            (await response.json()) as
              | DetailResponse
              | {
                  error?: string;
                };

          if (!response.ok) {
            throw new Error(
              "error" in data
                ? data.error ||
                    "Impossible de charger le dossier."
                : "Impossible de charger le dossier.",
            );
          }

          const detail =
            data as DetailResponse;

          setSelected(
            detail.reclamation,
          );

          setMessages(
            detail.messages || [],
          );

          setNotifications(
            detail.notifications ||
              [],
          );

          setReply(
            detail.reclamation.admin_reply ||
              "",
          );

          setResolution(
            detail.reclamation.resolution ||
              "",
          );

          setPriority(
            detail.reclamation.priority ||
              "normal",
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Erreur inconnue.",
          );
        } finally {
          setDetailLoading(
            false,
          );
        }
      },
      [],
    );

  async function performAction(
    action: string,
    payload: Record<
      string,
      unknown
    > = {},
  ) {
    if (!selected) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccessMessage("");

      const response =
        await fetch(
          "/api/super-admin/reclamations",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              reclamationId:
                selected.id,
              action,
              ...payload,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "L'opération a échoué.",
        );
      }

      setSuccessMessage(
        data?.message ||
          "Modification enregistrée.",
      );

      await loadReclamations();

      if (selected) {
        await loadDetail(
          selected,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur inconnue.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReply() {
    if (!reply.trim()) {
      setError(
        "Écrivez une réponse avant de l'envoyer.",
      );
      return;
    }

    await performAction(
      "reply",
      {
        reply:
          reply.trim(),
      },
    );
  }

  async function handleResolution() {
    if (!resolution.trim()) {
      setError(
        "Écrivez la résolution avant de valider.",
      );
      return;
    }

    await performAction(
      "resolution",
      {
        resolution:
          resolution.trim(),
      },
    );
  }

  async function handleStatus(
    status: ReclamationStatus,
  ) {
    await performAction(
      "status",
      {
        status,
      },
    );
  }

  async function handlePriority(
    value: ReclamationPriority,
  ) {
    setPriority(value);

    await performAction(
      "priority",
      {
        priority: value,
      },
    );
  }

  const statistics =
    useMemo(() => {
      return {
        total:
          reclamations.length,
        open:
          reclamations.filter(
            (item) =>
              item.status ===
              "open",
          ).length,
        progress:
          reclamations.filter(
            (item) =>
              item.status ===
              "in_progress",
          ).length,
        resolved:
          reclamations.filter(
            (item) =>
              item.status ===
              "resolved",
          ).length,
        urgent:
          reclamations.filter(
            (item) =>
              item.priority ===
                "urgent" &&
              item.status !==
                "closed",
          ).length,
      };
    }, [reclamations]);

  return (
    <main className="reclamations-page">
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .reclamations-page {
          min-height: 100vh;
          padding: 32px;
          background:
            linear-gradient(
              180deg,
              #f7f9fc 0%,
              #eef2f7 100%
            );
          color: #172033;
        }

        .container {
          max-width: 1500px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 26px;
        }

        .eyebrow {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #64748b;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: 32px;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .subtitle {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 15px;
        }

        .refresh-button {
          border: 0;
          border-radius: 12px;
          padding: 12px 16px;
          background: #172033;
          color: white;
          cursor: pointer;
          font-weight: 700;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .stat {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px;
          box-shadow:
            0 8px 24px
              rgba(15, 23, 42, 0.05);
        }

        .stat-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .stat-value {
          margin-top: 8px;
          font-size: 27px;
          font-weight: 850;
        }

        .workspace {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(420px, 0.72fr);
          gap: 20px;
          align-items: start;
        }

        .card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow:
            0 10px 30px
              rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .toolbar {
          display: flex;
          gap: 10px;
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .search {
          flex: 1;
          min-width: 0;
          border: 1px solid #cbd5e1;
          border-radius: 11px;
          padding: 11px 13px;
          outline: none;
        }

        .filter {
          border: 1px solid #cbd5e1;
          border-radius: 11px;
          padding: 11px 12px;
          background: white;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 13px 16px;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        td {
          padding: 15px 16px;
          border-top: 1px solid #eef2f7;
          vertical-align: top;
          font-size: 13px;
        }

        tr.clickable {
          cursor: pointer;
          transition:
            background 0.15s ease;
        }

        tr.clickable:hover {
          background: #f8fafc;
        }

        tr.selected {
          background: #eef6ff;
        }

        .reference {
          font-weight: 850;
          color: #0f172a;
        }

        .subject {
          font-weight: 750;
        }

        .client {
          color: #475569;
          margin-top: 4px;
        }

        .status,
        .priority {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-open {
          background: #e0f2fe;
          color: #0369a1;
        }

        .status-in_progress {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-waiting_client {
          background: #f3e8ff;
          color: #7e22ce;
        }

        .status-resolved {
          background: #dcfce7;
          color: #15803d;
        }

        .status-closed {
          background: #e2e8f0;
          color: #475569;
        }

        .priority-low {
          background: #f1f5f9;
          color: #475569;
        }

        .priority-normal {
          background: #e0f2fe;
          color: #0369a1;
        }

        .priority-high {
          background: #ffedd5;
          color: #c2410c;
        }

        .priority-urgent {
          background: #fee2e2;
          color: #b91c1c;
        }

        .detail {
          position: sticky;
          top: 20px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
        }

        .detail-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-reference {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .detail-reference strong {
          font-size: 19px;
        }

        .detail-subject {
          margin-top: 8px;
          font-size: 18px;
          font-weight: 800;
        }

        .detail-section {
          padding: 18px 20px;
          border-bottom: 1px solid #eef2f7;
        }

        .section-title {
          font-size: 12px;
          font-weight: 850;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 12px;
        }

        .message-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 14px;
        }

        .actions-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .action-button {
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 10px;
          padding: 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 750;
        }

        .action-button:hover {
          background: #f8fafc;
        }

        .action-button.primary {
          background: #172033;
          color: white;
          border-color: #172033;
        }

        .action-button.success {
          background: #15803d;
          color: white;
          border-color: #15803d;
        }

        textarea {
          width: 100%;
          min-height: 115px;
          resize: vertical;
          border: 1px solid #cbd5e1;
          border-radius: 11px;
          padding: 12px;
          font: inherit;
          outline: none;
        }

        .send {
          margin-top: 9px;
          width: 100%;
          border: 0;
          border-radius: 11px;
          padding: 12px;
          background: #172033;
          color: white;
          cursor: pointer;
          font-weight: 800;
        }

        .timeline {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .timeline-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
        }

        .timeline-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 7px;
          font-size: 11px;
          color: #64748b;
        }

        .timeline-type {
          font-weight: 850;
          color: #334155;
        }

        .notice {
          margin-bottom: 18px;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
        }

        .notice.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .notice.success {
          background: #dcfce7;
          color: #166534;
        }

        .empty {
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        .loading {
          padding: 50px;
          text-align: center;
          color: #64748b;
        }

        .contact {
          display: grid;
          gap: 7px;
          font-size: 13px;
          color: #475569;
        }

        .select {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px;
          background: white;
        }

        @media (max-width: 1100px) {
          .stats {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .workspace {
            grid-template-columns: 1fr;
          }

          .detail {
            position: static;
            max-height: none;
          }
        }

        @media (max-width: 700px) {
          .reclamations-page {
            padding: 16px;
          }

          .header {
            flex-direction: column;
          }

          .stats {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .toolbar {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="container">
        <header className="header">
          <div>
            <div className="eyebrow">
              SUPER ADMIN · SUPPORT
            </div>

            <h1>
              Réclamations
            </h1>

            <p className="subtitle">
              Gérez les demandes clients,
              répondez, suivez les
              traitements et clôturez les
              dossiers.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={() =>
              void loadReclamations()
            }
            disabled={loading}
          >
            ↻ Actualiser
          </button>
        </header>

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="notice success">
            {successMessage}
          </div>
        )}

        <section className="stats">
          <div className="stat">
            <div className="stat-label">
              Total
            </div>
            <div className="stat-value">
              {statistics.total}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">
              Nouvelles
            </div>
            <div className="stat-value">
              {statistics.open}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">
              En traitement
            </div>
            <div className="stat-value">
              {statistics.progress}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">
              Résolues
            </div>
            <div className="stat-value">
              {statistics.resolved}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">
              Urgentes
            </div>
            <div className="stat-value">
              {statistics.urgent}
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="card">
            <div className="toolbar">
              <input
                className="search"
                placeholder="Rechercher par code, client, téléphone ou sujet..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
              />

              <select
                className="filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | ""
                      | ReclamationStatus,
                  )
                }
              >
                <option value="">
                  Tous les statuts
                </option>

                <option value="open">
                  Nouvelles
                </option>

                <option value="in_progress">
                  En cours
                </option>

                <option value="waiting_client">
                  Attente client
                </option>

                <option value="resolved">
                  Résolues
                </option>

                <option value="closed">
                  Fermées
                </option>
              </select>
            </div>

            {loading ? (
              <div className="loading">
                Chargement des
                réclamations...
              </div>
            ) : reclamations.length ===
              0 ? (
              <div className="empty">
                Aucune réclamation trouvée.
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Référence
                      </th>

                      <th>
                        Client
                      </th>

                      <th>
                        Sujet
                      </th>

                      <th>
                        Priorité
                      </th>

                      <th>
                        Statut
                      </th>

                      <th>
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {reclamations.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className={`clickable ${
                            selected?.id ===
                            item.id
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            void loadDetail(
                              item,
                            )
                          }
                        >
                          <td>
                            <div className="reference">
                              {item.reference}
                            </div>
                          </td>

                          <td>
                            <div className="subject">
                              {item.client_name ||
                                "Client"}
                            </div>

                            <div className="client">
                              {item.client_phone ||
                                item.client_email ||
                                "—"}
                            </div>
                          </td>

                          <td>
                            {item.subject}
                          </td>

                          <td>
                            <span
                              className={priorityClass(
                                item.priority,
                              )}
                            >
                              {
                                priorityLabels[
                                  item
                                    .priority
                                ]
                              }
                            </span>
                          </td>

                          <td>
                            <span
                              className={statusClass(
                                item.status,
                              )}
                            >
                              {
                                statusLabels[
                                  item.status
                                ]
                              }
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              item.created_at,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="card detail">
            {detailLoading ? (
              <div className="loading">
                Chargement du dossier...
              </div>
            ) : !selected ? (
              <div className="empty">
                <div
                  style={{
                    fontSize: 40,
                    marginBottom: 12,
                  }}
                >
                  🎫
                </div>

                <strong>
                  Sélectionnez une
                  réclamation
                </strong>

                <p>
                  Les détails, messages,
                  actions et notifications
                  apparaîtront ici.
                </p>
              </div>
            ) : (
              <>
                <div className="detail-header">
                  <div className="detail-reference">
                    <strong>
                      {
                        selected.reference
                      }
                    </strong>

                    <span
                      className={statusClass(
                        selected.status,
                      )}
                    >
                      {
                        statusLabels[
                          selected.status
                        ]
                      }
                    </span>
                  </div>

                  <div className="detail-subject">
                    {selected.subject}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                    }}
                  >
                    <span
                      className={priorityClass(
                        selected.priority,
                      )}
                    >
                      {
                        priorityLabels[
                          selected.priority
                        ]
                      }
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    Client
                  </div>

                  <div className="contact">
                    <strong>
                      {selected.client_name ||
                        "Non renseigné"}
                    </strong>

                    <span>
                      📱{" "}
                      {selected.client_phone ||
                        "Téléphone non renseigné"}
                    </span>

                    <span>
                      ✉️{" "}
                      {selected.client_email ||
                        "Email non renseigné"}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    Réclamation
                  </div>

                  <div className="message-box">
                    {selected.message}
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    Statut
                  </div>

                  <div className="actions-grid">
                    <button
                      className="action-button"
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        void handleStatus(
                          "open",
                        )
                      }
                    >
                      🔵 Nouvelle
                    </button>

                    <button
                      className="action-button"
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        void handleStatus(
                          "in_progress",
                        )
                      }
                    >
                      🟠 En cours
                    </button>

                    <button
                      className="action-button"
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        void handleStatus(
                          "waiting_client",
                        )
                      }
                    >
                      🟣 Attente client
                    </button>

                    <button
                      className="action-button success"
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        void handleStatus(
                          "resolved",
                        )
                      }
                    >
                      ✅ Résoudre
                    </button>

                    <button
                      className="action-button"
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        void handleStatus(
                          "closed",
                        )
                      }
                    >
                      ⚫ Fermer
                    </button>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    Priorité
                  </div>

                  <select
                    className="select"
                    value={priority}
                    disabled={
                      actionLoading
                    }
                    onChange={(event) =>
                      void handlePriority(
                        event.target
                          .value as ReclamationPriority,
                      )
                    }
                  >
                    <option value="low">
                      Faible
                    </option>

                    <option value="normal">
                      Normale
                    </option>

                    <option value="high">
                      Haute
                    </option>

                    <option value="urgent">
                      Urgente
                    </option>
                  </select>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    Répondre au client
                  </div>

                  <textarea
                    value={reply}
                    onChange={(event) =>
                      setReply(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Écrivez la réponse à envoyer au client..."
                    disabled={
                      actionLoading
                    }
                  />

                  <button
                    className="send"
                    disabled={
                      actionLoading ||
                      !reply.trim()
                    }
                    onClick={() =>
                      void handleReply()
                    }
                  >
                    📤 Envoyer la réponse
                  </button>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    Résolution
                  </div>

                  <textarea
                    value={resolution}
                    onChange={(event) =>
                      setResolution(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Décrivez comment le problème a été réglé..."
                    disabled={
                      actionLoading
                    }
                  />

                  <button
                    className="send"
                    disabled={
                      actionLoading ||
                      !resolution.trim()
                    }
                    onClick={() =>
                      void handleResolution()
                    }
                  >
                    ✅ Enregistrer la
                    résolution
                  </button>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    Historique
                  </div>

                  <div className="timeline">
                    {messages.length ===
                    0 ? (
                      <div
                        style={{
                          color:
                            "#64748b",
                          fontSize: 13,
                        }}
                      >
                        Aucun message
                        enregistré.
                      </div>
                    ) : (
                      messages.map(
                        (item) => (
                          <div
                            className="timeline-item"
                            key={
                              item.id
                            }
                          >
                            <div className="timeline-meta">
                              <span className="timeline-type">
                                {item.sender_type ===
                                "admin"
                                  ? "👤 Super Admin"
                                  : item.sender_type ===
                                      "client"
                                    ? "👤 Client"
                                    : "⚙️ Système"}
                              </span>

                              <span>
                                {formatDate(
                                  item.created_at,
                                )}
                              </span>
                            </div>

                            <div
                              style={{
                                whiteSpace:
                                  "pre-wrap",
                                lineHeight:
                                  1.5,
                                fontSize:
                                  13,
                              }}
                            >
                              {
                                item.message
                              }
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    Notifications
                  </div>

                  <div className="timeline">
                    {notifications.length ===
                    0 ? (
                      <div
                        style={{
                          color:
                            "#64748b",
                          fontSize: 13,
                        }}
                      >
                        Aucune notification
                        enregistrée.
                      </div>
                    ) : (
                      notifications.map(
                        (item) => (
                          <div
                            className="timeline-item"
                            key={
                              item.id
                            }
                          >
                            <div className="timeline-meta">
                              <span className="timeline-type">
                                🔔{" "}
                                {
                                  item.channel
                                }
                              </span>

                              <span>
                                {formatDate(
                                  item.created_at,
                                )}
                              </span>
                            </div>

                            <div
                              style={{
                                fontSize:
                                  13,
                                lineHeight:
                                  1.5,
                              }}
                            >
                              {
                                item.message
                              }
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}