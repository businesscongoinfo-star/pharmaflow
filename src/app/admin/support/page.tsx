"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type TicketStatus =
  | "open"
  | "pending"
  | "closed";

type TicketCategory =
  | "general"
  | "payment"
  | "technical"
  | "complaint"
  | "commercial";

type SupportTicket = {
  id: string;
  ticket_number: string;
  status: string;
  category: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  subject: string | null;
  priority: string | null;
  created_at: string;
  last_message_at: string | null;
};

type SupportMessage = {
  id: string;
  ticketId: string;
  senderType: string;
  message: string;
  createdAt: string;
};

type TicketResponse = {
  success?: boolean;
  tickets?: SupportTicket[];
  ticket?: SupportTicket;
  messages?: SupportMessage[];
  error?: string;
};

const STATUS_LABELS: Record<
  TicketStatus,
  string
> = {
  open: "Ouvert",
  pending: "En attente",
  closed: "Fermé",
};

const CATEGORY_LABELS: Record<
  TicketCategory,
  string
> = {
  general: "Général",
  payment: "Paiement",
  technical: "Technique",
  complaint: "Réclamation",
  commercial: "Commercial",
};

function isTicketStatus(
  value: string,
): value is TicketStatus {
  return (
    value === "open" ||
    value === "pending" ||
    value === "closed"
  );
}

function isTicketCategory(
  value: string,
): value is TicketCategory {
  return (
    value === "general" ||
    value === "payment" ||
    value === "technical" ||
    value === "complaint" ||
    value === "commercial"
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}

function getStatusLabel(
  value: string,
) {
  return isTicketStatus(value)
    ? STATUS_LABELS[value]
    : value;
}

function getCategoryLabel(
  value: string,
) {
  return isTicketCategory(value)
    ? CATEGORY_LABELS[value]
    : value;
}

function getStatusClass(
  status: string,
) {
  if (status === "open") {
    return "open";
  }

  if (status === "pending") {
    return "pending";
  }

  if (status === "closed") {
    return "closed";
  }

  return "default";
}

function getPriorityClass(
  priority: string | null,
) {
  if (
    priority === "high" ||
    priority === "urgent"
  ) {
    return "high";
  }

  return "normal";
}

export default function AdminSupportPage() {
  const [
    tickets,
    setTickets,
  ] = useState<
    SupportTicket[]
  >([]);

  const [
    selectedTicketId,
    setSelectedTicketId,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedTicket,
    setSelectedTicket,
  ] =
    useState<SupportTicket | null>(
      null,
    );

  const [
    messages,
    setMessages,
  ] = useState<
    SupportMessage[]
  >([]);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "all" | TicketStatus
  >("all");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState<
    "all" | TicketCategory
  >("all");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    reply,
    setReply,
  ] = useState("");

  const [
    loadingTickets,
    setLoadingTickets,
  ] = useState(true);

  const [
    loadingConversation,
    setLoadingConversation,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    changingStatus,
    setChangingStatus,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /**
   * =====================================================
   * CHARGER LA LISTE DES TICKETS
   * =====================================================
   */

  const loadTickets = useCallback(
    async (
      silent = false,
    ) => {
      try {
        if (!silent) {
          setLoadingTickets(true);
        }

        const params =
          new URLSearchParams();

        if (
          statusFilter !==
          "all"
        ) {
          params.set(
            "status",
            statusFilter,
          );
        }

        if (
          categoryFilter !==
          "all"
        ) {
          params.set(
            "category",
            categoryFilter,
          );
        }

        const query =
          params.toString();

        const response =
          await fetch(
            query
              ? `/api/admin/support?${query}`
              : "/api/admin/support",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          (await response.json()) as TicketResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Impossible de récupérer les tickets.",
          );
        }

        const nextTickets =
          data.tickets || [];

        setTickets(
          nextTickets,
        );

        /**
         * Si le ticket actuellement ouvert
         * n'est plus présent dans le filtre,
         * on ferme sa sélection.
         */
        if (
          selectedTicketId &&
          !nextTickets.some(
            (ticket) =>
              ticket.id ===
              selectedTicketId,
          )
        ) {
          setSelectedTicketId(
            null,
          );
          setSelectedTicket(null);
          setMessages([]);
        }
      } catch (err) {
        console.error(
          "LOAD ADMIN SUPPORT:",
          err,
        );

        if (!silent) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de récupérer les tickets.",
          );
        }
      } finally {
        if (!silent) {
          setLoadingTickets(
            false,
          );
        }
      }
    },
    [
      categoryFilter,
      selectedTicketId,
      statusFilter,
    ],
  );

  /**
   * =====================================================
   * CHARGER UNE CONVERSATION
   * =====================================================
   */

  const loadConversation =
    useCallback(
      async (
        ticketId: string,
        silent = false,
      ) => {
        try {
          if (!silent) {
            setLoadingConversation(
              true,
            );
          }

          const response =
            await fetch(
              `/api/admin/support?ticketId=${encodeURIComponent(
                ticketId,
              )}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );

          const data =
            (await response.json()) as TicketResponse;

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Impossible de récupérer la conversation.",
            );
          }

          if (
            data.ticket
          ) {
            setSelectedTicket(
              data.ticket,
            );
          }

          setMessages(
            data.messages ||
              [],
          );
        } catch (err) {
          console.error(
            "LOAD ADMIN CONVERSATION:",
            err,
          );

          if (!silent) {
            setError(
              err instanceof Error
                ? err.message
                : "Impossible de récupérer la conversation.",
            );
          }
        } finally {
          if (!silent) {
            setLoadingConversation(
              false,
            );
          }
        }
      },
      [],
    );

  /**
   * =====================================================
   * PREMIER CHARGEMENT + FILTRES
   * =====================================================
   */

  useEffect(() => {
    setError("");

    void loadTickets();
  }, [
    loadTickets,
  ]);

  /**
   * =====================================================
   * ACTUALISATION AUTOMATIQUE DES TICKETS
   * =====================================================
   */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          void loadTickets(
            true,
          );
        },
        15000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    loadTickets,
  ]);

  /**
   * =====================================================
   * ACTUALISATION AUTOMATIQUE DE LA CONVERSATION
   * =====================================================
   */

  useEffect(() => {
    if (
      !selectedTicketId
    ) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void loadConversation(
            selectedTicketId,
            true,
          );
        },
        5000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    loadConversation,
    selectedTicketId,
  ]);

  /**
   * =====================================================
   * SÉLECTIONNER UN TICKET
   * =====================================================
   */

  async function openTicket(
    ticket: SupportTicket,
  ) {
    setSelectedTicketId(
      ticket.id,
    );

    setSelectedTicket(
      ticket,
    );

    setMessages([]);

    setReply("");

    setError("");

    setSuccess("");

    await loadConversation(
      ticket.id,
    );
  }

  /**
   * =====================================================
   * ENVOYER UNE RÉPONSE
   * =====================================================
   */

  async function handleReply(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedTicketId
    ) {
      return;
    }

    const message =
      reply.trim();

    if (!message) {
      setError(
        "Veuillez écrire une réponse.",
      );
      return;
    }

    try {
      setSending(true);
      setError("");
      setSuccess("");

      const response =
        await fetch(
          "/api/admin/support",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                action:
                  "reply",
                ticketId:
                  selectedTicketId,
                message,
              },
            ),
          },
        );

      const data =
        (await response.json()) as TicketResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible d'envoyer la réponse.",
        );
      }

      setReply("");

      setSuccess(
        "Réponse envoyée au client.",
      );

      await loadConversation(
        selectedTicketId,
        true,
      );

      await loadTickets(
        true,
      );
    } catch (err) {
      console.error(
        "SEND ADMIN SUPPORT REPLY:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer la réponse.",
      );
    } finally {
      setSending(false);
    }
  }

  /**
   * =====================================================
   * CHANGER LE STATUT
   * =====================================================
   */

  async function changeStatus(
    status: TicketStatus,
  ) {
    if (
      !selectedTicketId
    ) {
      return;
    }

    try {
      setChangingStatus(
        true,
      );

      setError("");
      setSuccess("");

      const response =
        await fetch(
          "/api/admin/support",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                ticketId:
                  selectedTicketId,
                status,
              },
            ),
          },
        );

      const data =
        (await response.json()) as TicketResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de modifier le statut.",
        );
      }

      if (
        data.ticket
      ) {
        setSelectedTicket(
          data.ticket,
        );
      }

      setSuccess(
        `Ticket ${
          STATUS_LABELS[status].toLowerCase()
        }.`,
      );

      await loadTickets(
        true,
      );
    } catch (err) {
      console.error(
        "CHANGE SUPPORT STATUS:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le statut.",
      );
    } finally {
      setChangingStatus(
        false,
      );
    }
  }

  /**
   * =====================================================
   * RECHERCHE LOCALE
   * =====================================================
   */

  const visibleTickets =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      if (!normalized) {
        return tickets;
      }

      return tickets.filter(
        (ticket) => {
          const content = [
            ticket.ticket_number,
            ticket.customer_name,
            ticket.customer_email ||
              "",
            ticket.customer_phone ||
              "",
            ticket.subject ||
              "",
            ticket.category,
          ]
            .join(" ")
            .toLowerCase();

          return content.includes(
            normalized,
          );
        },
      );
    }, [
      search,
      tickets,
    ]);

  /**
   * =====================================================
   * STATISTIQUES
   * =====================================================
   */

  const statistics =
    useMemo(() => {
      return {
        total:
          tickets.length,

        open:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "open",
          ).length,

        pending:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "pending",
          ).length,

        closed:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "closed",
          ).length,
      };
    }, [
      tickets,
    ]);

  /**
   * =====================================================
   * RENDU
   * =====================================================
   */

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f4f7f6",
        color:
          "#17211f",
        padding:
          "24px",
        boxSizing:
          "border-box",
      }}
    >
      <div
        style={{
          maxWidth:
            "1500px",
          margin:
            "0 auto",
        }}
      >
        {/* =================================================
            EN-TÊTE
        ================================================= */}

        <header
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e1e8e5",
            borderRadius:
              "20px",
            padding:
              "24px",
            marginBottom:
              "20px",
            boxShadow:
              "0 8px 30px rgba(22, 55, 44, 0.06)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                "20px",
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "12px",
                  marginBottom:
                    "8px",
                }}
              >
                <div
                  style={{
                    width:
                      "46px",
                    height:
                      "46px",
                    borderRadius:
                      "14px",
                    background:
                      "#0f766e",
                    color:
                      "#ffffff",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize:
                      "23px",
                    fontWeight:
                      800,
                  }}
                >
                  ?
                </div>

                <div>
                  <h1
                    style={{
                      margin:
                        0,
                      fontSize:
                        "28px",
                      lineHeight:
                        1.2,
                      fontWeight:
                        800,
                    }}
                  >
                    Centre de support
                  </h1>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      color:
                        "#65736f",
                      fontSize:
                        "14px",
                    }}
                  >
                    Gestion des demandes et
                    conversations clients
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadTickets()
              }
              disabled={
                loadingTickets
              }
              style={{
                border:
                  "1px solid #d8e2de",
                background:
                  "#ffffff",
                color:
                  "#155e57",
                borderRadius:
                  "11px",
                padding:
                  "11px 16px",
                fontWeight:
                  700,
                cursor:
                  loadingTickets
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loadingTickets
                ? "Actualisation..."
                : "↻ Actualiser"}
            </button>
          </div>

          {/* =================================================
              STATISTIQUES
          ================================================= */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap:
                "12px",
              marginTop:
                "22px",
            }}
          >
            <StatCard
              label="Total"
              value={
                statistics.total
              }
              icon="▦"
            />

            <StatCard
              label="Ouverts"
              value={
                statistics.open
              }
              icon="●"
            />

            <StatCard
              label="En attente"
              value={
                statistics.pending
              }
              icon="◷"
            />

            <StatCard
              label="Fermés"
              value={
                statistics.closed
              }
              icon="✓"
            />
          </div>
        </header>

        {/* =================================================
            MESSAGES SYSTÈME
        ================================================= */}

        {error && (
          <div
            role="alert"
            style={{
              background:
                "#fff1f1",
              border:
                "1px solid #f2caca",
              color:
                "#a32727",
              padding:
                "13px 16px",
              borderRadius:
                "12px",
              marginBottom:
                "16px",
              fontWeight:
                600,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              background:
                "#effaf6",
              border:
                "1px solid #c8eadf",
              color:
                "#146b58",
              padding:
                "13px 16px",
              borderRadius:
                "12px",
              marginBottom:
                "16px",
              fontWeight:
                600,
            }}
          >
            {success}
          </div>
        )}

        {/* =================================================
            CONTENU PRINCIPAL
        ================================================= */}

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "minmax(320px, 430px) minmax(0, 1fr)",
            gap:
              "20px",
            alignItems:
              "stretch",
          }}
        >
          {/* =================================================
              LISTE DES TICKETS
          ================================================= */}

          <aside
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #e1e8e5",
              borderRadius:
                "20px",
              overflow:
                "hidden",
              minHeight:
                "650px",
              boxShadow:
                "0 8px 30px rgba(22, 55, 44, 0.05)",
            }}
          >
            <div
              style={{
                padding:
                  "18px",
                borderBottom:
                  "1px solid #edf1ef",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap:
                    "10px",
                }}
              >
                <input
                  type="search"
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Rechercher un ticket, client..."
                  style={
                    inputStyle
                  }
                />

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap:
                      "8px",
                  }}
                >
                  <select
                    value={
                      statusFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setStatusFilter(
                        event.target
                          .value as
                          | "all"
                          | TicketStatus,
                      )
                    }
                    style={
                      inputStyle
                    }
                  >
                    <option value="all">
                      Tous les statuts
                    </option>
                    <option value="open">
                      Ouverts
                    </option>
                    <option value="pending">
                      En attente
                    </option>
                    <option value="closed">
                      Fermés
                    </option>
                  </select>

                  <select
                    value={
                      categoryFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setCategoryFilter(
                        event.target
                          .value as
                          | "all"
                          | TicketCategory,
                      )
                    }
                    style={
                      inputStyle
                    }
                  >
                    <option value="all">
                      Toutes catégories
                    </option>
                    <option value="general">
                      Général
                    </option>
                    <option value="payment">
                      Paiement
                    </option>
                    <option value="technical">
                      Technique
                    </option>
                    <option value="complaint">
                      Réclamation
                    </option>
                    <option value="commercial">
                      Commercial
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div
              style={{
                maxHeight:
                  "calc(100vh - 360px)",
                minHeight:
                  "560px",
                overflowY:
                  "auto",
              }}
            >
              {loadingTickets &&
              tickets.length ===
                0 ? (
                <EmptyState
                  icon="◷"
                  title="Chargement..."
                  text="Récupération des demandes."
                />
              ) : visibleTickets.length ===
                0 ? (
                <EmptyState
                  icon="✓"
                  title="Aucune demande"
                  text="Aucun ticket ne correspond aux filtres."
                />
              ) : (
                visibleTickets.map(
                  (
                    ticket,
                  ) => {
                    const selected =
                      ticket.id ===
                      selectedTicketId;

                    return (
                      <button
                        key={
                          ticket.id
                        }
                        type="button"
                        onClick={() =>
                          void openTicket(
                            ticket,
                          )
                        }
                        style={{
                          width:
                            "100%",
                          textAlign:
                            "left",
                          border:
                            "none",
                          borderBottom:
                            "1px solid #edf1ef",
                          background:
                            selected
                              ? "#eef8f5"
                              : "#ffffff",
                          padding:
                            "16px",
                          cursor:
                            "pointer",
                          display:
                            "block",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "flex-start",
                            justifyContent:
                              "space-between",
                            gap:
                              "10px",
                          }}
                        >
                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "12px",
                                color:
                                  "#64736e",
                                fontWeight:
                                  700,
                                marginBottom:
                                  "5px",
                              }}
                            >
                              #
                              {
                                ticket.ticket_number
                              }
                            </div>

                            <div
                              style={{
                                fontWeight:
                                  800,
                                fontSize:
                                  "15px",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                ticket.customer_name
                              }
                            </div>

                            <div
                              style={{
                                color:
                                  "#64736e",
                                fontSize:
                                  "13px",
                                marginTop:
                                  "4px",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {ticket.subject ||
                                getCategoryLabel(
                                  ticket.category,
                                )}
                            </div>
                          </div>

                          <span
                            style={{
                              ...badgeStyle,
                              ...getBadgeStyle(
                                getStatusClass(
                                  ticket.status,
                                ),
                              ),
                            }}
                          >
                            {getStatusLabel(
                              ticket.status,
                            )}
                          </span>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap:
                              "8px",
                            marginTop:
                              "11px",
                            fontSize:
                              "12px",
                            color:
                              "#71807b",
                          }}
                        >
                          <span>
                            {getCategoryLabel(
                              ticket.category,
                            )}
                          </span>

                          <span>
                            {formatDate(
                              ticket.last_message_at ||
                                ticket.created_at,
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  },
                )
              )}
            </div>
          </aside>

          {/* =================================================
              CONVERSATION
          ================================================= */}

          <section
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #e1e8e5",
              borderRadius:
                "20px",
              overflow:
                "hidden",
              minHeight:
                "650px",
              display:
                "flex",
              flexDirection:
                "column",
              boxShadow:
                "0 8px 30px rgba(22, 55, 44, 0.05)",
            }}
          >
            {!selectedTicket ? (
              <EmptyConversation />
            ) : (
              <>
                {/* =========================================
                    HEADER CONVERSATION
                ========================================= */}

                <div
                  style={{
                    padding:
                      "18px 20px",
                    borderBottom:
                      "1px solid #edf1ef",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "flex-start",
                      justifyContent:
                        "space-between",
                      gap:
                        "15px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color:
                            "#64736e",
                          fontSize:
                            "12px",
                          fontWeight:
                            800,
                          marginBottom:
                            "5px",
                        }}
                      >
                        TICKET #
                        {
                          selectedTicket.ticket_number
                        }
                      </div>

                      <h2
                        style={{
                          margin:
                            0,
                          fontSize:
                            "20px",
                          fontWeight:
                            800,
                        }}
                      >
                        {
                          selectedTicket.customer_name
                        }
                      </h2>

                      <div
                        style={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          gap:
                            "8px",
                          marginTop:
                            "9px",
                        }}
                      >
                        <span
                          style={{
                            ...badgeStyle,
                            ...getBadgeStyle(
                              getStatusClass(
                                selectedTicket.status,
                              ),
                            ),
                          }}
                        >
                          {getStatusLabel(
                            selectedTicket.status,
                          )}
                        </span>

                        <span
                          style={{
                            ...badgeStyle,
                            background:
                              "#f1f5f3",
                            color:
                              "#53635e",
                          }}
                        >
                          {getCategoryLabel(
                            selectedTicket.category,
                          )}
                        </span>

                        {selectedTicket.priority && (
                          <span
                            style={{
                              ...badgeStyle,
                              background:
                                selectedTicket.priority ===
                                "high"
                                  ? "#fff1e8"
                                  : "#f1f5f3",
                              color:
                                selectedTicket.priority ===
                                "high"
                                  ? "#a44e1d"
                                  : "#53635e",
                            }}
                          >
                            Priorité{" "}
                            {selectedTicket.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap:
                          "7px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <button
                        type="button"
                        disabled={
                          changingStatus
                        }
                        onClick={() =>
                          void changeStatus(
                            "pending",
                          )
                        }
                        style={
                          secondaryButtonStyle
                        }
                      >
                        En attente
                      </button>

                      <button
                        type="button"
                        disabled={
                          changingStatus
                        }
                        onClick={() =>
                          void changeStatus(
                            "closed",
                          )
                        }
                        style={
                          secondaryButtonStyle
                        }
                      >
                        Fermer
                      </button>

                      {selectedTicket.status ===
                        "closed" && (
                        <button
                          type="button"
                          disabled={
                            changingStatus
                          }
                          onClick={() =>
                            void changeStatus(
                              "open",
                            )
                          }
                          style={
                            primaryButtonStyle
                          }
                        >
                          Rouvrir
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      flexWrap:
                        "wrap",
                      gap:
                        "14px",
                      marginTop:
                        "14px",
                      paddingTop:
                        "13px",
                      borderTop:
                        "1px solid #f0f3f2",
                      fontSize:
                        "13px",
                      color:
                        "#64736e",
                    }}
                  >
                    {selectedTicket.customer_email && (
                      <a
                        href={`mailto:${selectedTicket.customer_email}`}
                        style={
                          contactLinkStyle
                        }
                      >
                        ✉{" "}
                        {
                          selectedTicket.customer_email
                        }
                      </a>
                    )}

                    {selectedTicket.customer_phone && (
                      <a
                        href={`tel:${selectedTicket.customer_phone}`}
                        style={
                          contactLinkStyle
                        }
                      >
                        ☎{" "}
                        {
                          selectedTicket.customer_phone
                        }
                      </a>
                    )}

                    <span>
                      Créé le{" "}
                      {formatDate(
                        selectedTicket.created_at,
                      )}
                    </span>
                  </div>
                </div>

                {/* =========================================
                    MESSAGES
                ========================================= */}

                <div
                  style={{
                    flex:
                      1,
                    minHeight:
                      "420px",
                    maxHeight:
                      "calc(100vh - 470px)",
                    overflowY:
                      "auto",
                    padding:
                      "22px",
                    background:
                      "#f8faf9",
                  }}
                >
                  {loadingConversation ? (
                    <EmptyState
                      icon="◷"
                      title="Chargement de la conversation..."
                      text="Veuillez patienter."
                    />
                  ) : messages.length ===
                    0 ? (
                    <EmptyState
                      icon="?"
                      title="Aucun message"
                      text="Cette conversation ne contient encore aucun message."
                    />
                  ) : (
                    <div
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        gap:
                          "12px",
                      }}
                    >
                      {messages.map(
                        (
                          message,
                        ) => {
                          const isAgent =
                            message.senderType ===
                            "agent";

                          const isCustomer =
                            message.senderType ===
                            "customer";

                          return (
                            <div
                              key={
                                message.id
                              }
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  isAgent
                                    ? "flex-end"
                                    : "flex-start",
                              }}
                            >
                              <div
                                style={{
                                  maxWidth:
                                    "78%",
                                  background:
                                    isAgent
                                      ? "#dff4ed"
                                      : "#ffffff",
                                  border:
                                    "1px solid " +
                                    (isAgent
                                      ? "#c4e7dc"
                                      : "#e2e9e6"),
                                  borderRadius:
                                    isAgent
                                      ? "16px 16px 4px 16px"
                                      : "16px 16px 16px 4px",
                                  padding:
                                    "13px 15px",
                                  boxShadow:
                                    "0 2px 8px rgba(20, 55, 45, 0.04)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize:
                                      "11px",
                                    fontWeight:
                                      800,
                                    color:
                                      isAgent
                                        ? "#146b58"
                                        : "#53635e",
                                    marginBottom:
                                      "6px",
                                  }}
                                >
                                  {isAgent
                                    ? "Conseiller PharmaFlow"
                                    : isCustomer
                                      ? selectedTicket.customer_name
                                      : "Assistant IA"}
                                </div>

                                <div
                                  style={{
                                    whiteSpace:
                                      "pre-wrap",
                                    wordBreak:
                                      "break-word",
                                    fontSize:
                                      "14px",
                                    lineHeight:
                                      1.55,
                                    color:
                                      "#25312e",
                                  }}
                                >
                                  {
                                    message.message
                                  }
                                </div>

                                <div
                                  style={{
                                    fontSize:
                                      "10px",
                                    color:
                                      "#71807b",
                                    marginTop:
                                      "8px",
                                    textAlign:
                                      isAgent
                                        ? "right"
                                        : "left",
                                  }}
                                >
                                  {formatDate(
                                    message.createdAt,
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>

                {/* =========================================
                    RÉPONSE
                ========================================= */}

                <form
                  onSubmit={
                    handleReply
                  }
                  style={{
                    borderTop:
                      "1px solid #e7edeb",
                    padding:
                      "16px",
                    background:
                      "#ffffff",
                  }}
                >
                  <textarea
                    value={
                      reply
                    }
                    onChange={(
                      event,
                    ) =>
                      setReply(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Écrivez votre réponse au client..."
                    rows={
                      4
                    }
                    maxLength={
                      5000
                    }
                    disabled={
                      sending
                    }
                    style={{
                      ...inputStyle,
                      resize:
                        "vertical",
                      minHeight:
                        "100px",
                      lineHeight:
                        1.5,
                    }}
                  />

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap:
                        "12px",
                      marginTop:
                        "10px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize:
                          "12px",
                        color:
                          "#71807b",
                      }}
                    >
                      {reply.length}
                      /5000
                    </span>

                    <button
                      type="submit"
                      disabled={
                        sending ||
                        !reply.trim()
                      }
                      style={{
                        ...primaryButtonStyle,
                        opacity:
                          sending ||
                          !reply.trim()
                            ? 0.6
                            : 1,
                        cursor:
                          sending ||
                          !reply.trim()
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {sending
                        ? "Envoi..."
                        : "Envoyer la réponse →"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

/**
 * =========================================================
 * COMPOSANTS VISUELS
 * =========================================================
 */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div
      style={{
        border:
          "1px solid #e4ebe8",
        borderRadius:
          "14px",
        padding:
          "15px",
        background:
          "#fbfcfc",
        display:
          "flex",
        alignItems:
          "center",
        gap:
          "12px",
      }}
    >
      <div
        style={{
          width:
            "38px",
          height:
            "38px",
          borderRadius:
            "11px",
          background:
            "#e7f5f0",
          color:
            "#0f766e",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontWeight:
            800,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize:
              "12px",
            color:
              "#71807b",
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize:
              "21px",
            fontWeight:
              800,
            marginTop:
              "2px",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        minHeight:
          "220px",
        display:
          "flex",
        flexDirection:
          "column",
        alignItems:
          "center",
        justifyContent:
          "center",
        textAlign:
          "center",
        padding:
          "30px",
        color:
          "#65736f",
      }}
    >
      <div
        style={{
          width:
            "50px",
          height:
            "50px",
          borderRadius:
            "15px",
          background:
            "#eef5f2",
          color:
            "#0f766e",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontWeight:
            800,
          fontSize:
            "20px",
          marginBottom:
            "12px",
        }}
      >
        {icon}
      </div>

      <strong
        style={{
          color:
            "#293633",
          fontSize:
            "15px",
        }}
      >
        {title}
      </strong>

      <span
        style={{
          fontSize:
            "13px",
          marginTop:
            "5px",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function EmptyConversation() {
  return (
    <div
      style={{
        flex:
          1,
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        minHeight:
          "650px",
      }}
    >
      <EmptyState
        icon="💬"
        title="Sélectionnez une demande"
        text="Choisissez un ticket à gauche pour ouvrir la conversation."
      />
    </div>
  );
}

/**
 * =========================================================
 * STYLES LOCAUX
 * =========================================================
 */

const inputStyle: React.CSSProperties =
  {
    width:
      "100%",
    boxSizing:
      "border-box",
    border:
      "1px solid #dce5e1",
    background:
      "#ffffff",
    color:
      "#1e2a27",
    borderRadius:
      "10px",
    padding:
      "11px 12px",
    fontSize:
      "14px",
    outline:
      "none",
  };

const badgeStyle: React.CSSProperties =
  {
    display:
      "inline-flex",
    alignItems:
      "center",
    borderRadius:
      "999px",
    padding:
      "5px 9px",
    fontSize:
      "11px",
    lineHeight:
      1,
    fontWeight:
      800,
    whiteSpace:
      "nowrap",
  };

function getBadgeStyle(
  status: string,
): React.CSSProperties {
  switch (status) {
    case "open":
      return {
        background:
          "#e5f7f0",
        color:
          "#126b58",
      };

    case "pending":
      return {
        background:
          "#fff5dc",
        color:
          "#93630b",
      };

    case "closed":
      return {
        background:
          "#edf0ef",
        color:
          "#596662",
      };

    default:
      return {
        background:
          "#f1f4f3",
        color:
          "#5d6a66",
      };
  }
}

const primaryButtonStyle: React.CSSProperties =
  {
    border:
      "none",
    background:
      "#0f766e",
    color:
      "#ffffff",
    borderRadius:
      "10px",
    padding:
      "11px 15px",
    fontWeight:
      800,
    cursor:
      "pointer",
    fontSize:
      "13px",
  };

const secondaryButtonStyle: React.CSSProperties =
  {
    border:
      "1px solid #d8e2de",
    background:
      "#ffffff",
    color:
      "#3e514b",
    borderRadius:
      "10px",
    padding:
      "10px 12px",
    fontWeight:
      700,
    cursor:
      "pointer",
    fontSize:
      "12px",
  };

const contactLinkStyle: React.CSSProperties =
  {
    color:
      "#0f766e",
    textDecoration:
      "none",
    fontWeight:
      600,
  };