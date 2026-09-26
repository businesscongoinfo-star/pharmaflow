"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

/* ============================================================
   TYPES
============================================================ */

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

/* ============================================================
   CONSTANTES
============================================================ */

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

/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/* ============================================================
   FORMAT HEURE
============================================================ */

function formatTime(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* ============================================================
   STATUT
============================================================ */

function getStatusClass(
  status: string | null | undefined
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

function getStatusLabel(
  status: string | null | undefined
) {
  if (
    status &&
    status in STATUS_LABELS
  ) {
    return STATUS_LABELS[
      status as ReclamationStatus
    ];
  }

  return status || "Inconnu";
}

/* ============================================================
   PRIORITÉ
============================================================ */

function getPriorityClass(
  priority: string | null | undefined
) {
  switch (priority) {
    case "urgent":
      return "priority-urgent";

    case "high":
      return "priority-high";

    case "low":
      return "priority-low";

    case "normal":
      return "priority-normal";

    default:
      return "priority-normal";
  }
}

function getPriorityLabel(
  priority: string | null | undefined
) {
  if (
    priority &&
    priority in PRIORITY_LABELS
  ) {
    return PRIORITY_LABELS[
      priority as Priority
    ];
  }

  return priority || "Normale";
}

/* ============================================================
   NORMALISATION
============================================================ */

function normalizeReclamation(
  value: Reclamation
): Reclamation {
  return {
    ...value,

    reference:
      value.reference || "Sans référence",

    subject:
      value.subject || "Sans objet",

    message:
      value.message || "",

    status:
      value.status || "open",

    priority:
      value.priority || "normal",

    admin_reply:
      value.admin_reply || null,

    resolution:
      value.resolution || null,

    messages:
      Array.isArray(value.messages)
        ? value.messages
        : [],
  };
}

/* ============================================================
   COMPOSANT
============================================================ */

export default function MesDemandesPage() {
  const [
    reclamations,
    setReclamations,
  ] = useState<Reclamation[]>([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState<string | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "all" | ReclamationStatus
  >("all");

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(null);

  /* ==========================================================
     CHARGEMENT
  ========================================================== */

  const loadReclamations = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const response = await fetch(
          "/api/support/reclamations/mes-demandes",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        let data: ApiResponse = {};

        try {
          data =
            (await response.json()) as ApiResponse;
        } catch {
          throw new Error(
            "Le serveur a retourné une réponse invalide."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Impossible de récupérer vos réclamations."
          );
        }

        if (data.success === false) {
          throw new Error(
            data.error ||
              "Impossible de récupérer vos réclamations."
          );
        }

        const items = Array.isArray(
          data.reclamations
        )
          ? data.reclamations.map(
              normalizeReclamation
            )
          : [];

        setReclamations(items);

        setLastUpdated(new Date());

        /*
         * Garder la réclamation actuellement sélectionnée
         * si elle existe encore.
         *
         * Sinon sélectionner automatiquement la première.
         */

        setSelectedId((current) => {
          if (
            current &&
            items.some(
              (item) =>
                item.id === current
            )
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

        setRefreshing(false);
      }
    },
    []
  );

  /* ==========================================================
     CHARGEMENT INITIAL + AUTO REFRESH
  ========================================================== */

  useEffect(() => {
    void loadReclamations();

    const interval =
      window.setInterval(() => {
        void loadReclamations(false);
      }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadReclamations]);

  /* ==========================================================
     RECHERCHE + FILTRE
  ========================================================== */

  const filteredReclamations =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return reclamations.filter(
        (item) => {
          const searchableText = [
            item.reference,
            item.subject,
            item.message,
            item.admin_reply || "",
            item.resolution || "",
            ...item.messages.map(
              (message) =>
                message.message
            ),
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchableText.includes(
              query
            );

          const matchesStatus =
            statusFilter === "all" ||
            item.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      reclamations,
      search,
      statusFilter,
    ]);

  /* ==========================================================
     RÉCLAMATION SÉLECTIONNÉE
  ========================================================== */

  const selectedReclamation =
    useMemo(() => {
      return (
        reclamations.find(
          (item) =>
            item.id === selectedId
        ) || null
      );
    }, [
      reclamations,
      selectedId,
    ]);

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const statistics = useMemo(() => {
    return {
      total: reclamations.length,

      open: reclamations.filter(
        (item) =>
          item.status === "open"
      ).length,

      progress: reclamations.filter(
        (item) =>
          item.status ===
          "in_progress"
      ).length,

      waiting: reclamations.filter(
        (item) =>
          item.status ===
          "waiting_client"
      ).length,

      resolved: reclamations.filter(
        (item) =>
          item.status ===
            "resolved" ||
          item.status === "closed"
      ).length,
    };
  }, [reclamations]);

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <main className="page">
      <div className="container">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="header">

          <div className="header-content">

            <Link
              href="/support/reclamations"
              className="back-link"
            >
              ← Nouvelle réclamation
            </Link>

            <div className="eyebrow">
              SUPPORT PHARMAFLOW
            </div>

            <h1>
              Mes réclamations
            </h1>

            <p>
              Consultez vos demandes,
              les réponses du support
              et l&apos;état de leur
              traitement.
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

        {/* ====================================================
            STATISTIQUES
        ==================================================== */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon">
              📋
            </div>

            <div className="stat-content">

              <span>
                Total
              </span>

              <strong>
                {statistics.total}
              </strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              🆕
            </div>

            <div className="stat-content">

              <span>
                Nouvelles
              </span>

              <strong>
                {statistics.open}
              </strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              🔄
            </div>

            <div className="stat-content">

              <span>
                En traitement
              </span>

              <strong>
                {statistics.progress}
              </strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              ⏳
            </div>

            <div className="stat-content">

              <span>
                En attente
              </span>

              <strong>
                {statistics.waiting}
              </strong>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              ✓
            </div>

            <div className="stat-content">

              <span>
                Résolues
              </span>

              <strong>
                {statistics.resolved}
              </strong>

            </div>

          </div>

        </section>

        {/* ====================================================
            ERREUR
        ==================================================== */}

        {error && (
          <div className="error-banner">

            <div className="error-icon">
              !
            </div>

            <div className="error-content">

              <strong>
                Impossible de charger vos
                réclamations
              </strong>

              <p>
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadReclamations()
                }
              >
                Réessayer
              </button>

            </div>

          </div>
        )}

        {/* ====================================================
            ESPACE PRINCIPAL
        ==================================================== */}

        <section className="workspace">

          {/* ==================================================
              LISTE
          ================================================== */}

          <aside className="list-panel">

            <div className="list-header">

              <div className="list-title">

                <span>
                  VOS DEMANDES
                </span>

                <strong>
                  {
                    filteredReclamations.length
                  }
                </strong>

              </div>

              <div className="update-info">

                {refreshing ? (
                  <span className="refreshing">
                    Actualisation...
                  </span>
                ) : lastUpdated ? (
                  <small>
                    Mis à jour à{" "}
                    {formatTime(
                      lastUpdated.toISOString()
                    )}
                  </small>
                ) : null}

              </div>

            </div>

            {/* =================================================
                FILTRES
            ================================================= */}

            <div className="filters">

              <div className="search-box">

                <span className="search-icon">
                  ⌕
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Rechercher une demande..."
                  aria-label="Rechercher une réclamation"
                />

                {search && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() =>
                      setSearch("")
                    }
                    aria-label="Effacer la recherche"
                  >
                    ×
                  </button>
                )}

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
                aria-label="Filtrer par statut"
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

            {/* =================================================
                LISTE DES RÉCLAMATIONS
            ================================================= */}

            <div className="reclamation-list">

              {loading ? (
                <>
                  <div className="skeleton-item" />
                  <div className="skeleton-item" />
                  <div className="skeleton-item" />
                </>
              ) : filteredReclamations.length ===
                0 ? (
                <div className="empty-list">

                  <div className="empty-icon">
                    📭
                  </div>

                  <strong>
                    Aucune réclamation
                  </strong>

                  <p>
                    {reclamations.length ===
                    0
                      ? "Vous n'avez encore envoyé aucune réclamation."
                      : "Aucune demande ne correspond à votre recherche ou à votre filtre."}
                  </p>

                  {reclamations.length ===
                    0 && (
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
                      Boolean(
                        reclamation.admin_reply
                      ) ||
                      reclamation.messages.some(
                        (message) =>
                          message.sender_type ===
                          "admin"
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
                            {getStatusLabel(
                              reclamation.status
                            )}
                          </span>

                          {hasAdminReply && (
                            <span
                              className="reply-indicator"
                              title="Le support a répondu"
                            >
                              💬
                            </span>
                          )}

                        </div>

                        <strong className="item-subject">
                          {reclamation.subject}
                        </strong>

                        <span className="reference">
                          {reclamation.reference}
                        </span>

                        <p className="item-message">
                          {reclamation.message ||
                            "Aucun message initial."}
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
                            {getPriorityLabel(
                              reclamation.priority
                            )}
                          </span>

                        </div>

                      </button>
                    );
                  }
                )
              )}

            </div>

          </aside>

          {/* ==================================================
              DÉTAIL
          ================================================== */}

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
                  Sélectionnez une demande à
                  gauche pour consulter son
                  historique et les réponses
                  du support PharmaFlow.
                </p>

              </div>

            ) : (

              <>

                {/* ============================================
                    EN-TÊTE DÉTAIL
                ============================================ */}

                <div className="detail-header">

                  <div className="detail-heading">

                    <div className="reference-line">

                      <span className="detail-reference">
                        {
                          selectedReclamation.reference
                        }
                      </span>

                      <span
                        className={`status-badge ${getStatusClass(
                          selectedReclamation.status
                        )}`}
                      >
                        {getStatusLabel(
                          selectedReclamation.status
                        )}
                      </span>

                    </div>

                    <h2>
                      {
                        selectedReclamation.subject
                      }
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
                    className={`refresh-button ${
                      refreshing
                        ? "is-refreshing"
                        : ""
                    }`}
                    onClick={() =>
                      void loadReclamations(
                        false
                      )
                    }
                    disabled={refreshing}
                    title="Actualiser"
                    aria-label="Actualiser les réclamations"
                  >
                    ↻
                  </button>

                </div>

                {/* ============================================
                    MÉTADONNÉES
                ============================================ */}

                <div className="detail-meta">

                  <div className="meta-card">

                    <span>
                      Priorité
                    </span>

                    <strong
                      className={getPriorityClass(
                        selectedReclamation.priority
                      )}
                    >
                      {getPriorityLabel(
                        selectedReclamation.priority
                      )}
                    </strong>

                  </div>

                  <div className="meta-card">

                    <span>
                      Dernière mise à jour
                    </span>

                    <strong>
                      {formatDate(
                        selectedReclamation.updated_at
                      )}
                    </strong>

                  </div>

                  {selectedReclamation.resolved_at && (
                    <div className="meta-card">

                      <span>
                        Résolue le
                      </span>

                      <strong>
                        {formatDate(
                          selectedReclamation.resolved_at
                        )}
                      </strong>

                    </div>
                  )}

                  {selectedReclamation.closed_at && (
                    <div className="meta-card">

                      <span>
                        Clôturée le
                      </span>

                      <strong>
                        {formatDate(
                          selectedReclamation.closed_at
                        )}
                      </strong>

                    </div>
                  )}

                </div>

                {/* ============================================
                    CONVERSATION
                ============================================ */}

                <div className="conversation">

                  <div className="conversation-title">

                    <div>

                      <span>
                        CONVERSATION
                      </span>

                      <h3>
                        Échanges avec PharmaFlow
                      </h3>

                    </div>

                    <small>
                      {
                        selectedReclamation
                          .messages.length
                      }{" "}
                      message
                      {
                        selectedReclamation
                          .messages.length > 1
                          ? "s"
                          : ""
                      }
                    </small>

                  </div>

                  <div className="messages">

                    {selectedReclamation
                      .messages.length ===
                    0 ? (

                      <div className="no-messages">

                        <div className="no-message-icon">
                          💬
                        </div>

                        <strong>
                          Aucun message dans
                          l&apos;historique
                        </strong>

                        <p>
                          Votre demande a bien été
                          enregistrée. Les échanges
                          apparaîtront ici lorsqu&apos;ils
                          seront disponibles.
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

                          const isClient =
                            message.sender_type ===
                            "client";

                          return (
                            <div
                              key={message.id}
                              className={`message-row ${
                                isAdmin
                                  ? "admin-message"
                                  : isClient
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
                                  {
                                    message.message
                                  }
                                </div>

                              </div>

                            </div>
                          );
                        }
                      )
                    )}

                    {/* ========================================
                        ADMIN_REPLY DE SECOURS
                    ======================================== */}

                    {selectedReclamation
                      .admin_reply &&
                      !selectedReclamation.messages.some(
                        (message) =>
                          message.sender_type ===
                            "admin" &&
                          message.message.trim() ===
                            selectedReclamation.admin_reply?.trim()
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

                    {/* ========================================
                        RÉSOLUTION
                    ======================================== */}

                    {selectedReclamation.resolution && (
                      <div className="resolution-box">

                        <div className="resolution-icon">
                          ✓
                        </div>

                        <div className="resolution-content">

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

                {/* ============================================
                    ATTENTE CLIENT
                ============================================ */}

                {selectedReclamation.status ===
                  "waiting_client" && (

                  <div className="waiting-banner">

                    <div className="banner-icon">
                      💬
                    </div>

                    <div>

                      <strong>
                        Le support attend votre
                        réponse
                      </strong>

                      <p>
                        Votre réclamation nécessite
                        une réponse ou une
                        information complémentaire.
                        Vous pourrez poursuivre la
                        conversation lorsque la
                        réponse client sera disponible
                        dans PharmaFlow.
                      </p>

                    </div>

                  </div>
                )}

                {/* ============================================
                    RÉSOLUE / CLÔTURÉE
                ============================================ */}

                {(
                  selectedReclamation.status ===
                    "resolved" ||
                  selectedReclamation.status ===
                    "closed"
                ) && (

                  <div className="resolved-banner">

                    <div className="banner-icon">
                      ✓
                    </div>

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
                        Vous pouvez consulter
                        l&apos;historique complet de
                        votre demande ci-dessus.
                      </p>

                    </div>

                  </div>
                )}

              </>
            )}

          </section>

        </section>

      </div>

      {/* ======================================================
          STYLES
      ====================================================== */}

      <style jsx>{`

        /* ====================================================
           BASE
        ==================================================== */

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
          max-width: 1380px;
          margin: 0 auto;
        }

        /* ====================================================
           HEADER
        ==================================================== */

        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 28px;
        }

        .header-content {
          min-width: 0;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          margin-bottom: 18px;
          color: #64748b;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          transition: color 0.2s ease;
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
          padding: 0 18px;
          border-radius: 12px;
          background: #2563eb;
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
          white-space: nowrap;
          box-shadow:
            0 10px 24px
            rgba(37, 99, 235, 0.18);
          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .new-button:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .new-button span {
          font-size: 18px;
          line-height: 1;
        }

        /* ====================================================
           STATISTIQUES
        ==================================================== */

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          padding: 18px;
          border: 1px solid #e3e9f2;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 10px 28px
            rgba(15, 23, 42, 0.045);
        }

        .stat-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #eff6ff;
          font-size: 18px;
        }

        .stat-content {
          min-width: 0;
        }

        .stat-card span {
          display: block;
          margin-bottom: 3px;
          color: #64748b;
          font-size: 11px;
          font-weight: 650;
          white-space: nowrap;
        }

        .stat-card strong {
          display: block;
          color: #111827;
          font-size: 21px;
          line-height: 1.1;
        }

        /* ====================================================
           ERREUR
        ==================================================== */

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

        .error-icon {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fee2e2;
          color: #b91c1c;
          font-weight: 850;
        }

        .error-content {
          min-width: 0;
        }

        .error-content strong {
          display: block;
          font-size: 13px;
        }

        .error-content p {
          margin: 4px 0 8px;
          color: #991b1b;
          font-size: 12px;
          line-height: 1.5;
        }

        .error-content button {
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

        /* ====================================================
           WORKSPACE
        ==================================================== */

        .workspace {
          display: grid;
          grid-template-columns:
            400px minmax(0, 1fr);
          min-height: 720px;
          overflow: hidden;
          border: 1px solid #e1e7f0;
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 15px 45px
            rgba(15, 23, 42, 0.06);
        }

        /* ====================================================
           LISTE
        ==================================================== */

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
          min-height: 67px;
          padding: 15px 18px 14px;
          border-bottom: 1px solid #edf1f6;
        }

        .list-title {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .list-title span {
          color: #64748b;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .list-title strong {
          min-width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
        }

        .update-info {
          color: #94a3b8;
          font-size: 10px;
          white-space: nowrap;
        }

        .refreshing {
          color: #2563eb;
          font-weight: 700;
        }

        /* ====================================================
           FILTRES
        ==================================================== */

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
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .search-box:focus-within {
          border-color: #93c5fd;
          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, 0.08);
        }

        .search-icon {
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

        .search-box input::placeholder {
          color: #94a3b8;
        }

        .clear-search {
          width: 23px;
          height: 23px;
          flex: 0 0 23px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
        }

        .filters select {
          width: 140px;
          height: 39px;
          padding: 0 8px;
          border: 1px solid #dce3ed;
          border-radius: 10px;
          background: #fff;
          color: #475569;
          font-family: inherit;
          font-size: 11px;
          outline: 0;
          cursor: pointer;
        }

        /* ====================================================
           LISTE RÉCLAMATIONS
        ==================================================== */

        .reclamation-list {
          max-height: 650px;
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
          transition:
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .reclamation-item:hover {
          background: #f8fafc;
        }

        .reclamation-item.selected {
          background: #eff6ff;
          box-shadow:
            inset 3px 0 0 #2563eb;
        }

        .item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        .item-subject {
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
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
          font-size: 9px;
          font-weight: 750;
        }

        .item-message {
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

        .reply-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }

        /* ====================================================
           BADGES
        ==================================================== */

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
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

        /* ====================================================
           DÉTAIL
        ==================================================== */

        .detail-panel {
          min-width: 0;
          background: #fff;
        }

        .detail-empty {
          min-height: 720px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
          text-align: center;
        }

        .detail-empty-icon {
          width: 68px;
          height: 68px;
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

        /* ====================================================
           DÉTAIL HEADER
        ==================================================== */

        .detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 25px 27px 20px;
          border-bottom: 1px solid #edf1f6;
        }

        .detail-heading {
          min-width: 0;
        }

        .reference-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 9px;
        }

        .detail-reference {
          color: #2563eb;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
          font-size: 10px;
          font-weight: 800;
        }

        .detail-header h2 {
          margin: 0;
          color: #111827;
          font-size: 22px;
          line-height: 1.3;
          word-break: break-word;
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
          display: grid;
          place-items: center;
          border: 1px solid #dce3ed;
          border-radius: 10px;
          background: #fff;
          color: #475569;
          font-size: 18px;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            color 0.2s ease;
        }

        .refresh-button:hover:not(:disabled) {
          border-color: #93c5fd;
          color: #2563eb;
        }

        .refresh-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .refresh-button.is-refreshing {
          animation: rotate-refresh 0.9s
            linear infinite;
        }

        @keyframes rotate-refresh {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* ====================================================
           META
        ==================================================== */

        .detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0;
          padding: 15px 27px;
          border-bottom: 1px solid #edf1f6;
          background: #fbfcfe;
        }

        .meta-card {
          min-width: 150px;
          padding: 0 18px;
          border-right: 1px solid #e5eaf1;
        }

        .meta-card:first-child {
          padding-left: 0;
        }

        .meta-card:last-child {
          border-right: 0;
        }

        .meta-card span {
          display: block;
          margin-bottom: 4px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .meta-card strong {
          font-size: 12px;
        }

        /* ====================================================
           CONVERSATION
        ==================================================== */

        .conversation {
          padding: 23px 27px 30px;
        }

        .conversation-title {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .conversation-title > div {
          min-width: 0;
        }

        .conversation-title span {
          display: block;
          color: #2563eb;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        .conversation-title h3 {
          margin: 4px 0 0;
          color: #334155;
          font-size: 15px;
        }

        .conversation-title small {
          color: #94a3b8;
          font-size: 10px;
          white-space: nowrap;
        }

        .messages {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* ====================================================
           MESSAGES
        ==================================================== */

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
          width: 100%;
          max-width: 620px;
        }

        .system-message .message-author {
          justify-content: center;
        }

        .system-message .message-bubble {
          border-style: dashed;
          background: #fafafa;
          color: #64748b;
          text-align: center;
        }

        /* ====================================================
           PAS DE MESSAGE
        ==================================================== */

        .no-messages {
          padding: 30px 20px;
          border: 1px dashed #dce3ed;
          border-radius: 14px;
          text-align: center;
        }

        .no-message-icon {
          margin-bottom: 8px;
          font-size: 22px;
        }

        .no-messages strong {
          display: block;
          color: #475569;
          font-size: 12px;
        }

        .no-messages p {
          max-width: 430px;
          margin: 6px auto 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.55;
        }

        /* ====================================================
           RÉSOLUTION
        ==================================================== */

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

        .resolution-content {
          min-width: 0;
        }

        .resolution-content strong {
          display: block;
          color: #166534;
          font-size: 12px;
        }

        .resolution-content p {
          margin: 4px 0 0;
          color: #475569;
          font-size: 12px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* ====================================================
           BANNIÈRES
        ==================================================== */

        .waiting-banner,
        .resolved-banner {
          display: flex;
          gap: 12px;
          align-items: flex-start;
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

        .banner-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.75);
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

        /* ====================================================
           EMPTY LIST
        ==================================================== */

        .empty-list {
          padding: 55px 22px;
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
          max-width: 280px;
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
          transition:
            background 0.2s ease;
        }

        .empty-button:hover {
          background: #dbeafe;
        }

        /* ====================================================
           SKELETON
        ==================================================== */

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
          animation:
            skeleton 1.4s ease infinite;
        }

        @keyframes skeleton {
          0% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0 50%;
          }
        }

        /* ====================================================
           TABLETTE
        ==================================================== */

        @media (max-width: 1200px) {

          .stats-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .workspace {
            grid-template-columns:
              350px minmax(0, 1fr);
          }

        }

        /* ====================================================
           TABLETTE PETITE
        ==================================================== */

        @media (max-width: 1000px) {

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .workspace {
            grid-template-columns:
              330px minmax(0, 1fr);
          }

        }

        /* ====================================================
           MOBILE
        ==================================================== */

        @media (max-width: 800px) {

          .page {
            padding:
              25px
              14px
              50px;
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
            border-bottom:
              1px solid #e7ebf2;
          }

          .reclamation-list {
            max-height: 420px;
          }

          .detail-empty {
            min-height: 350px;
          }

          .detail-header,
          .detail-meta,
          .conversation {
            padding-left: 20px;
            padding-right: 20px;
          }

          .waiting-banner,
          .resolved-banner {
            margin-left: 20px;
            margin-right: 20px;
          }

        }

        /* ====================================================
           PETIT MOBILE
        ==================================================== */

        @media (max-width: 560px) {

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
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

          .stat-card span {
            font-size: 10px;
          }

          .stat-card strong {
            font-size: 18px;
          }

          .filters {
            flex-direction: column;
          }

          .filters select {
            width: 100%;
          }

          .list-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .update-info {
            align-self: flex-end;
          }

          .detail-header {
            padding:
              19px
              17px;
          }

          .detail-header h2 {
            font-size: 18px;
          }

          .detail-meta {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 15px;
            padding:
              15px
              17px;
          }

          .meta-card {
            min-width: 0;
            padding: 0;
            border-right: 0;
          }

          .conversation {
            padding:
              20px
              17px
              25px;
          }

          .waiting-banner,
          .resolved-banner {
            margin-left: 17px;
            margin-right: 17px;
          }

          .message-content {
            max-width: calc(
              100% - 44px
            );
          }

          .message-bubble {
            font-size: 12px;
          }

          .conversation-title {
            align-items: flex-start;
            flex-direction: column;
          }

        }

        /* ====================================================
           TRÈS PETIT MOBILE
        ==================================================== */

        @media (max-width: 380px) {

          .page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 14px;
          }

          .detail-meta {
            grid-template-columns: 1fr;
          }

          .detail-header {
            gap: 10px;
          }

          .refresh-button {
            width: 36px;
            height: 36px;
            flex-basis: 36px;
          }

        }

      `}</style>

    </main>
  );
}