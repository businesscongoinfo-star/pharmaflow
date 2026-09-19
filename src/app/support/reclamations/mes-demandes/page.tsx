"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

type ReclamationStatus =
  | "open"
  | "in_progress"
  | "waiting_client"
  | "resolved"
  | "closed";

type Priority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

type SenderType =
  | "client"
  | "admin"
  | "system";

type ReclamationMessage = {
  id: string;
  reclamation_id: string;
  sender_user_id: string | null;
  sender_type: SenderType;
  message: string;
  created_at: string;
};

type Reclamation = {
  id: string;
  reference: string;
  subject: string;
  message: string;
  status: ReclamationStatus;
  priority: Priority;
  admin_reply: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  messages: ReclamationMessage[];
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  reclamations?: Reclamation[];
};

const STATUS_LABELS: Record<
  ReclamationStatus,
  string
> = {
  open: "Nouvelle",
  in_progress: "En traitement",
  waiting_client: "En attente de votre réponse",
  resolved: "Résolue",
  closed: "Clôturée",
};

const PRIORITY_LABELS: Record<
  Priority,
  string
> = {
  low: "Faible",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClass(
  status: ReclamationStatus
) {
  switch (status) {
    case "open":
      return "status-open";

    case "in_progress":
      return "status-progress";

    case "waiting_client":
      return "status-waiting";

    case "resolved":
      return "status-resolved";

    case "closed":
      return "status-closed";

    default:
      return "status-open";
  }
}

function getPriorityClass(priority: Priority) {
  switch (priority) {
    case "urgent":
      return "priority-urgent";

    case "high":
      return "priority-high";

    case "low":
      return "priority-low";

    default:
      return "priority-normal";
  }
}

export default function MesDemandesPage() {
  const [reclamations, setReclamations] = useState<
    Reclamation[]
  >([]);

  const [selectedId, setSelectedId] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | ReclamationStatus
  >("all");

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const loadReclamations = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          "/api/support/reclamations/mes-demandes",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Impossible de récupérer vos réclamations."
          );
        }

        const items = Array.isArray(data.reclamations)
          ? data.reclamations
          : [];

        setReclamations(items);

        setLastUpdated(new Date());

        setSelectedId((current) => {
          if (
            current &&
            items.some((item) => item.id === current)
          ) {
            return current;
          }

          return items[0]?.id || null;
        });
      } catch (requestError) {
        console.error(
          "[MES DEMANDES]",
          requestError
        );

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Une erreur est survenue."
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadReclamations();

    /*
     * Actualisation automatique toutes les 30 secondes.
     *
     * Cela permet au client de voir une nouvelle réponse
     * du Super Admin sans devoir actualiser manuellement
     * la page.
     */

    const interval = window.setInterval(() => {
      void loadReclamations(false);
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadReclamations]);

  const filteredReclamations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reclamations.filter((item) => {
      const matchesSearch =
        !query ||
        item.reference
          .toLowerCase()
          .includes(query) ||
        item.subject
          .toLowerCase()
          .includes(query) ||
        item.message
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    reclamations,
    search,
    statusFilter,
  ]);

  const selectedReclamation =
    reclamations.find(
      (item) => item.id === selectedId
    ) || null;

  const statistics = useMemo(() => {
    return {
      total: reclamations.length,

      open: reclamations.filter(
        (item) => item.status === "open"
      ).length,

      progress: reclamations.filter(
        (item) =>
          item.status === "in_progress"
      ).length,

      resolved: reclamations.filter(
        (item) =>
          item.status === "resolved" ||
          item.status === "closed"
      ).length,
    };
  }, [reclamations]);

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <div>
            <Link
              href="/support/reclamations"
              className="back-link"
            >
              ← Nouvelle réclamation
            </Link>

            <div className="eyebrow">
              SUPPORT PHARMAFLOW
            </div>

            <h1>Mes réclamations</h1>

            <p>
              Consultez vos demandes, les réponses du
              support et l&apos;état de leur traitement.
            </p>
          </div>

          <Link
            href="/support/reclamations"
            className="new-button"
          >
            <span>＋</span>
            Nouvelle réclamation
          </Link>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>

            <div>
              <span>Total</span>
              <strong>{statistics.total}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🆕</div>

            <div>
              <span>Nouvelles</span>
              <strong>{statistics.open}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔄</div>

            <div>
              <span>En traitement</span>
              <strong>
                {statistics.progress}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✓</div>

            <div>
              <span>Résolues</span>
              <strong>
                {statistics.resolved}
              </strong>
            </div>
          </div>
        </section>

        {error && (
          <div className="error-banner">
            <div>!</div>

            <section>
              <strong>
                Impossible de charger vos réclamations
              </strong>

              <p>{error}</p>

              <button
                type="button"
                onClick={() =>
                  void loadReclamations()
                }
              >
                Réessayer
              </button>
            </section>
          </div>
        )}

        <section className="workspace">
          <aside className="list-panel">
            <div className="list-header">
              <div>
                <span>VOS DEMANDES</span>

                <strong>
                  {filteredReclamations.length}
                </strong>
              </div>

              {lastUpdated && (
                <small>
                  Mis à jour à{" "}
                  {lastUpdated.toLocaleTimeString(
                    "fr-FR",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </small>
              )}
            </div>

            <div className="filters">
              <div className="search-box">
                <span>⌕</span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Rechercher..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "all"
                      | ReclamationStatus
                  )
                }
              >
                <option value="all">
                  Tous les statuts
                </option>

                <option value="open">
                  Nouvelles
                </option>

                <option value="in_progress">
                  En traitement
                </option>

                <option value="waiting_client">
                  En attente
                </option>

                <option value="resolved">
                  Résolues
                </option>

                <option value="closed">
                  Clôturées
                </option>
              </select>
            </div>

            <div className="reclamation-list">
              {loading ? (
                <>
                  <div className="skeleton-item" />
                  <div className="skeleton-item" />
                  <div className="skeleton-item" />
                </>
              ) : filteredReclamations.length === 0 ? (
                <div className="empty-list">
                  <div className="empty-icon">
                    📭
                  </div>

                  <strong>
                    Aucune réclamation
                  </strong>

                  <p>
                    {reclamations.length === 0
                      ? "Vous n'avez encore envoyé aucune réclamation."
                      : "Aucune demande ne correspond à votre recherche."}
                  </p>

                  {reclamations.length === 0 && (
                    <Link
                      href="/support/reclamations"
                      className="empty-button"
                    >
                      Créer une réclamation
                    </Link>
                  )}
                </div>
              ) : (
                filteredReclamations.map(
                  (reclamation) => {
                    const hasAdminReply =
                      reclamation.messages.some(
                        (message) =>
                          message.sender_type ===
                          "admin"
                      ) ||
                      Boolean(
                        reclamation.admin_reply
                      );

                    const isSelected =
                      selectedId ===
                      reclamation.id;

                    return (
                      <button
                        type="button"
                        key={reclamation.id}
                        className={`reclamation-item ${
                          isSelected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedId(
                            reclamation.id
                          )
                        }
                      >
                        <div className="item-top">
                          <span
                            className={`status-badge ${getStatusClass(
                              reclamation.status
                            )}`}
                          >
                            {
                              STATUS_LABELS[
                                reclamation.status
                              ]
                            }
                          </span>

                          {hasAdminReply && (
                            <span className="reply-dot">
                              💬
                            </span>
                          )}
                        </div>

                        <strong>
                          {reclamation.subject}
                        </strong>

                        <span className="reference">
                          {reclamation.reference}
                        </span>

                        <p>
                          {reclamation.message}
                        </p>

                        <div className="item-bottom">
                          <span>
                            {formatDate(
                              reclamation.updated_at
                            )}
                          </span>

                          <span
                            className={`priority-mini ${getPriorityClass(
                              reclamation.priority
                            )}`}
                          >
                            {
                              PRIORITY_LABELS[
                                reclamation.priority
                              ]
                            }
                          </span>
                        </div>
                      </button>
                    );
                  }
                )
              )}
            </div>
          </aside>

          <section className="detail-panel">
            {!selectedReclamation ? (
              <div className="detail-empty">
                <div className="detail-empty-icon">
                  💬
                </div>

                <h2>
                  Sélectionnez une réclamation
                </h2>

                <p>
                  Sélectionnez une demande à gauche pour
                  consulter son historique et les réponses
                  du support.
                </p>
              </div>
            ) : (
              <>
                <div className="detail-header">
                  <div>
                    <div className="reference-line">
                      <span>
                        {selectedReclamation.reference}
                      </span>

                      <span
                        className={`status-badge ${getStatusClass(
                          selectedReclamation.status
                        )}`}
                      >
                        {
                          STATUS_LABELS[
                            selectedReclamation.status
                          ]
                        }
                      </span>
                    </div>

                    <h2>
                      {selectedReclamation.subject}
                    </h2>

                    <p>
                      Créée le{" "}
                      {formatDate(
                        selectedReclamation.created_at
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="refresh-button"
                    onClick={() =>
                      void loadReclamations()
                    }
                    title="Actualiser"
                  >
                    ↻
                  </button>
                </div>

                <div className="detail-meta">
                  <div>
                    <span>Priorité</span>

                    <strong
                      className={getPriorityClass(
                        selectedReclamation.priority
                      )}
                    >
                      {
                        PRIORITY_LABELS[
                          selectedReclamation
                            .priority
                        ]
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Dernière mise à jour</span>

                    <strong>
                      {formatDate(
                        selectedReclamation.updated_at
                      )}
                    </strong>
                  </div>

                  {selectedReclamation.resolved_at && (
                    <div>
                      <span>Résolue le</span>

                      <strong>
                        {formatDate(
                          selectedReclamation.resolved_at
                        )}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="conversation">
                  <div className="conversation-title">
                    <span>
                      CONVERSATION
                    </span>

                    <small>
                      {selectedReclamation.messages
                        .length}{" "}
                      message
                      {selectedReclamation.messages
                        .length > 1
                        ? "s"
                        : ""}
                    </small>
                  </div>

                  <div className="messages">
                    {selectedReclamation.messages
                      .length === 0 ? (
                      <div className="no-messages">
                        <p>
                          Aucun message dans l&apos;historique.
                        </p>
                      </div>
                    ) : (
                      selectedReclamation.messages.map(
                        (message) => {
                          const isAdmin =
                            message.sender_type ===
                            "admin";

                          const isSystem =
                            message.sender_type ===
                            "system";

                          return (
                            <div
                              key={message.id}
                              className={`message-row ${
                                isAdmin
                                  ? "admin-message"
                                  : message.sender_type ===
                                      "client"
                                    ? "client-message"
                                    : "system-message"
                              }`}
                            >
                              <div className="message-avatar">
                                {isAdmin
                                  ? "🛡️"
                                  : isSystem
                                    ? "⚙️"
                                    : "👤"}
                              </div>

                              <div className="message-content">
                                <div className="message-author">
                                  <strong>
                                    {isAdmin
                                      ? "Support PharmaFlow"
                                      : isSystem
                                        ? "Système"
                                        : "Vous"}
                                  </strong>

                                  <span>
                                    {formatDate(
                                      message.created_at
                                    )}
                                  </span>
                                </div>

                                <div className="message-bubble">
                                  {message.message}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )
                    )}

                    {selectedReclamation
                      .admin_reply &&
                      !selectedReclamation.messages.some(
                        (message) =>
                          message.sender_type ===
                            "admin" &&
                          message.message ===
                            selectedReclamation.admin_reply
                      ) && (
                        <div className="message-row admin-message">
                          <div className="message-avatar">
                            🛡️
                          </div>

                          <div className="message-content">
                            <div className="message-author">
                              <strong>
                                Support PharmaFlow
                              </strong>

                              <span>
                                Réponse du support
                              </span>
                            </div>

                            <div className="message-bubble">
                              {
                                selectedReclamation.admin_reply
                              }
                            </div>
                          </div>
                        </div>
                      )}

                    {selectedReclamation.resolution && (
                      <div className="resolution-box">
                        <div className="resolution-icon">
                          ✓
                        </div>

                        <div>
                          <strong>
                            Résolution
                          </strong>

                          <p>
                            {
                              selectedReclamation.resolution
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedReclamation.status ===
                  "waiting_client" && (
                  <div className="waiting-banner">
                    <div>💬</div>

                    <div>
                      <strong>
                        Le support attend votre réponse
                      </strong>

                      <p>
                        Une prochaine étape permettra de
                        répondre directement au support
                        depuis cette conversation.
                      </p>
                    </div>
                  </div>
                )}

                {(selectedReclamation.status ===
                  "resolved" ||
                  selectedReclamation.status ===
                    "closed") && (
                  <div className="resolved-banner">
                    <div>✓</div>

                    <div>
                      <strong>
                        Cette réclamation a été{" "}
                        {selectedReclamation.status ===
                        "closed"
                          ? "clôturée"
                          : "résolue"}
                        .
                      </strong>

                      <p>
                        Vous pouvez consulter l&apos;historique
                        complet de votre demande ci-dessus.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.07),
              transparent 32%
            ),
            #f6f8fb;
          color: #172033;
          padding: 38px 24px 70px;
        }

        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 28px;
        }

        .back-link {
          display: inline-flex;
          margin-bottom: 18px;
          color: #64748b;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .back-link:hover {
          color: #2563eb;
        }

        .eyebrow {
          margin-bottom: 8px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.13em;
        }

        h1 {
          margin: 0;
          color: #111827;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        .header p {
          max-width: 680px;
          margin: 12px 0 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.65;
        }

        .new-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 46px;
          padding: 0 17px;
          border-radius: 12px;
          background: #2563eb;
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.18);
        }

        .new-button:hover {
          background: #1d4ed8;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 18px;
          border: 1px solid #e3e9f2;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.045);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #eff6ff;
          font-size: 18px;
        }

        .stat-card span {
          display: block;
          margin-bottom: 3px;
          color: #64748b;
          font-size: 11px;
          font-weight: 650;
        }

        .stat-card strong {
          display: block;
          color: #111827;
          font-size: 21px;
        }

        .error-banner {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
          padding: 15px;
          border: 1px solid #fecaca;
          border-radius: 14px;
          background: #fef2f2;
          color: #991b1b;
        }

        .error-banner > div {
          width: 26px;
          height: 26px;
          flex: 0 0 26px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fee2e2;
          font-weight: 850;
        }

        .error-banner strong {
          font-size: 13px;
        }

        .error-banner p {
          margin: 4px 0 8px;
          font-size: 12px;
        }

        .error-banner button {
          border: 0;
          padding: 0;
          background: transparent;
          color: #b91c1c;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: underline;
        }

        .workspace {
          display: grid;
          grid-template-columns: 390px minmax(0, 1fr);
          min-height: 680px;
          overflow: hidden;
          border: 1px solid #e1e7f0;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 15px 45px rgba(15, 23, 42, 0.06);
        }

        .list-panel {
          min-width: 0;
          border-right: 1px solid #e7ebf2;
          background: #fbfcfe;
        }

        .list-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 10px;
          padding: 19px 18px 14px;
          border-bottom: 1px solid #edf1f6;
        }

        .list-header > div {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .list-header span {
          color: #64748b;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .list-header strong {
          min-width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
        }

        .list-header small {
          color: #94a3b8;
          font-size: 10px;
        }

        .filters {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-bottom: 1px solid #edf1f6;
        }

        .search-box {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          border: 1px solid #dce3ed;
          border-radius: 10px;
          background: #fff;
        }

        .search-box span {
          color: #94a3b8;
          font-size: 17px;
        }

        .search-box input {
          width: 100%;
          min-width: 0;
          height: 39px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #172033;
          font-family: inherit;
          font-size: 12px;
        }

        .filters select {
          width: 130px;
          border: 1px solid #dce3ed;
          border-radius: 10px;
          background: #fff;
          color: #475569;
          font-family: inherit;
          font-size: 11px;
          outline: 0;
        }

        .reclamation-list {
          max-height: 620px;
          overflow-y: auto;
        }

        .reclamation-item {
          width: 100%;
          display: block;
          padding: 16px;
          border: 0;
          border-bottom: 1px solid #edf1f6;
          background: transparent;
          color: inherit;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
        }

        .reclamation-item:hover {
          background: #f8fafc;
        }

        .reclamation-item.selected {
          background: #eff6ff;
          box-shadow: inset 3px 0 0 #2563eb;
        }

        .item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        .reclamation-item > strong {
          display: block;
          margin-bottom: 5px;
          overflow: hidden;
          color: #1e293b;
          font-size: 13px;
          line-height: 1.4;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reference {
          display: block;
          margin-bottom: 8px;
          color: #2563eb;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 9px;
          font-weight: 750;
        }

        .reclamation-item > p {
          margin: 0;
          display: -webkit-box;
          overflow: hidden;
          color: #64748b;
          font-size: 11px;
          line-height: 1.55;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .item-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 11px;
          color: #94a3b8;
          font-size: 10px;
        }

        .reply-dot {
          font-size: 13px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-open {
          background: #eff6ff;
          color: #2563eb;
        }

        .status-progress {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-waiting {
          background: #fefce8;
          color: #a16207;
        }

        .status-resolved {
          background: #f0fdf4;
          color: #15803d;
        }

        .status-closed {
          background: #f1f5f9;
          color: #475569;
        }

        .priority-mini {
          font-weight: 750;
        }

        .priority-low {
          color: #64748b;
        }

        .priority-normal {
          color: #2563eb;
        }

        .priority-high {
          color: #ea580c;
        }

        .priority-urgent {
          color: #dc2626;
        }

        .detail-panel {
          min-width: 0;
          background: #fff;
        }

        .detail-empty {
          min-height: 680px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
          text-align: center;
        }

        .detail-empty-icon {
          width: 66px;
          height: 66px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          border-radius: 20px;
          background: #eff6ff;
          font-size: 27px;
        }

        .detail-empty h2 {
          margin: 0;
          color: #1e293b;
          font-size: 19px;
        }

        .detail-empty p {
          max-width: 430px;
          margin: 9px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.65;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 25px 27px 20px;
          border-bottom: 1px solid #edf1f6;
        }

        .reference-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 9px;
        }

        .reference-line > span:first-child {
          color: #2563eb;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          font-weight: 800;
        }

        .detail-header h2 {
          margin: 0;
          color: #111827;
          font-size: 22px;
          line-height: 1.3;
        }

        .detail-header p {
          margin: 7px 0 0;
          color: #94a3b8;
          font-size: 11px;
        }

        .refresh-button {
          width: 39px;
          height: 39px;
          flex: 0 0 39px;
          border: 1px solid #dce3ed;
          border-radius: 10px;
          background: #fff;
          color: #475569;
          font-size: 18px;
          cursor: pointer;
        }

        .refresh-button:hover {
          border-color: #93c5fd;
          color: #2563eb;
        }

        .detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 15px 27px;
          border-bottom: 1px solid #edf1f6;
          background: #fbfcfe;
        }

        .detail-meta > div {
          min-width: 140px;
          padding-right: 18px;
          border-right: 1px solid #e5eaf1;
        }

        .detail-meta > div:last-child {
          border-right: 0;
        }

        .detail-meta span {
          display: block;
          margin-bottom: 4px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .detail-meta strong {
          font-size: 12px;
        }

        .conversation {
          padding: 23px 27px 30px;
        }

        .conversation-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .conversation-title span {
          color: #475569;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .conversation-title small {
          color: #94a3b8;
          font-size: 10px;
        }

        .messages {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .message-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .message-avatar {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          font-size: 15px;
        }

        .message-content {
          min-width: 0;
          max-width: 720px;
        }

        .client-message {
          flex-direction: row-reverse;
        }

        .client-message .message-content {
          margin-left: auto;
          text-align: right;
        }

        .client-message .message-bubble {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }

        .admin-message .message-avatar {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .message-author {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .client-message .message-author {
          justify-content: flex-end;
        }

        .message-author strong {
          color: #334155;
          font-size: 11px;
        }

        .message-author span {
          color: #94a3b8;
          font-size: 9px;
        }

        .message-bubble {
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #f8fafc;
          color: #334155;
          font-size: 13px;
          line-height: 1.65;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .system-message {
          justify-content: center;
        }

        .system-message .message-content {
          max-width: 620px;
          width: 100%;
        }

        .system-message .message-author {
          justify-content: center;
        }

        .system-message .message-bubble {
          border-style: dashed;
          background: #fafafa;
          text-align: center;
          color: #64748b;
        }

        .resolution-box {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-top: 5px;
          padding: 15px;
          border: 1px solid #bbf7d0;
          border-radius: 14px;
          background: #f0fdf4;
        }

        .resolution-icon {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #dcfce7;
          color: #15803d;
          font-weight: 900;
        }

        .resolution-box strong {
          display: block;
          color: #166534;
          font-size: 12px;
        }

        .resolution-box p {
          margin: 4px 0 0;
          color: #475569;
          font-size: 12px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .waiting-banner,
        .resolved-banner {
          display: flex;
          gap: 12px;
          margin: 0 27px 25px;
          padding: 14px 16px;
          border-radius: 13px;
        }

        .waiting-banner {
          border: 1px solid #fde68a;
          background: #fffbeb;
        }

        .resolved-banner {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
        }

        .waiting-banner strong,
        .resolved-banner strong {
          display: block;
          color: #334155;
          font-size: 12px;
        }

        .waiting-banner p,
        .resolved-banner p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.55;
        }

        .no-messages {
          padding: 30px;
          border: 1px dashed #dce3ed;
          border-radius: 14px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }

        .empty-list {
          padding: 45px 22px;
          text-align: center;
        }

        .empty-icon {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          margin: 0 auto 14px;
          border-radius: 17px;
          background: #f1f5f9;
          font-size: 23px;
        }

        .empty-list strong {
          display: block;
          color: #334155;
          font-size: 13px;
        }

        .empty-list p {
          margin: 7px auto 17px;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.55;
        }

        .empty-button {
          display: inline-flex;
          min-height: 38px;
          align-items: center;
          justify-content: center;
          padding: 0 13px;
          border-radius: 9px;
          background: #eff6ff;
          color: #2563eb;
          text-decoration: none;
          font-size: 11px;
          font-weight: 750;
        }

        .skeleton-item {
          height: 145px;
          margin: 10px 12px;
          border-radius: 13px;
          background:
            linear-gradient(
              90deg,
              #f1f5f9 25%,
              #e8eef5 37%,
              #f1f5f9 63%
            );
          background-size: 400% 100%;
          animation: skeleton 1.4s ease infinite;
        }

        @keyframes skeleton {
          0% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0 50%;
          }
        }

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .workspace {
            grid-template-columns: 330px minmax(0, 1fr);
          }
        }

        @media (max-width: 800px) {
          .page {
            padding: 25px 14px 50px;
          }

          .header {
            align-items: flex-start;
            flex-direction: column;
            gap: 17px;
          }

          .new-button {
            width: 100%;
          }

          .workspace {
            grid-template-columns: 1fr;
          }

          .list-panel {
            border-right: 0;
            border-bottom: 1px solid #e7ebf2;
          }

          .reclamation-list {
            max-height: 400px;
          }

          .detail-empty {
            min-height: 350px;
          }
        }

        @media (max-width: 560px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .stat-card {
            padding: 13px;
          }

          .stat-icon {
            width: 34px;
            height: 34px;
            flex-basis: 34px;
            font-size: 15px;
          }

          .stat-card strong {
            font-size: 18px;
          }

          .filters {
            flex-direction: column;
          }

          .filters select {
            width: 100%;
            height: 39px;
          }

          .detail-header,
          .detail-meta,
          .conversation {
            padding-left: 17px;
            padding-right: 17px;
          }

          .waiting-banner,
          .resolved-banner {
            margin-left: 17px;
            margin-right: 17px;
          }

          .detail-header h2 {
            font-size: 18px;
          }

          .detail-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .detail-meta > div {
            min-width: 0;
            padding-right: 10px;
            border-right: 0;
          }
        }
      `}</style>
    </main>
  );
}