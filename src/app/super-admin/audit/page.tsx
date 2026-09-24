import Link from "next/link";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperAdmin } from "@/app/lib/super-admin/auth";

import PrintAuditButton from "./PrintAuditButton";

/* ============================================================================
   TYPES
============================================================================ */

type SearchParams = Promise<{
  q?: string;
  type?: string;
  status?: string;
}>;

type TeamMember = {
  id: string;
  role: string | null;
  permissions: Record<string, boolean> | null;
  is_active: boolean | null;
  created_at: string | null;
};

type SupportTicket = {
  id: string;
  ticket_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  category: string | null;
  subject: string | null;
  status: string | null;
  priority: string | null;
  assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_message_at: string | null;
};

type SupportCase = {
  id: string;
  case_number: string | null;
  pharmacy_id: string | null;
  user_id: string | null;
  category: string | null;
  subject: string | null;
  description: string | null;
  priority: string | null;
  status: string | null;
  subscription_id: string | null;
  transaction_id: string | null;
  ai_analysis: string | null;
  ai_recommendation: string | null;
  ai_confidence: number | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AuditActivity = {
  id: string;
  type: "team" | "ticket" | "case";
  title: string;
  description: string;
  reference: string;
  status: string;
  priority: string;
  actor: string;
  createdAt: string | null;
  href: string;
};

/* ============================================================================
   HELPERS
============================================================================ */

function safeString(value: unknown, fallback = "—"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return trimmed || fallback;
}

function normalize(value: unknown): string {
  return safeString(value, "").toLowerCase();
}

function formatDate(value: string | null): string {
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

function formatRole(role: string | null): string {
  const value = normalize(role);

  const roles: Record<string, string> = {
    support: "Support",
    finance: "Finance",
    technical: "Technique",
    technique: "Technique",
    operations: "Opérations",
    analyst: "Analyste",
    security: "Sécurité",
    admin: "Administrateur",
    super_admin: "Super Admin",
  };

  return roles[value] ?? safeString(role, "Équipe plateforme");
}

function formatStatus(status: string | null): string {
  const value = normalize(status);

  const statuses: Record<string, string> = {
    open: "Ouvert",
    opened: "Ouvert",
    pending: "En attente",
    in_progress: "En cours",
    processing: "En traitement",
    resolved: "Résolu",
    closed: "Fermé",
    active: "Actif",
    inactive: "Inactif",
    cancelled: "Annulé",
    canceled: "Annulé",
    waiting: "En attente",
  };

  return statuses[value] ?? safeString(status, "Non défini");
}

function formatPriority(priority: string | null): string {
  const value = normalize(priority);

  const priorities: Record<string, string> = {
    low: "Faible",
    medium: "Normale",
    normal: "Normale",
    high: "Élevée",
    urgent: "Urgente",
    critical: "Critique",
  };

  return priorities[value] ?? safeString(priority, "Normale");
}

function getStatusClass(status: string | null): string {
  const value = normalize(status);

  if (
    value === "resolved" ||
    value === "closed" ||
    value === "active"
  ) {
    return "success";
  }

  if (
    value === "pending" ||
    value === "waiting" ||
    value === "in_progress" ||
    value === "processing"
  ) {
    return "warning";
  }

  if (
    value === "cancelled" ||
    value === "canceled" ||
    value === "inactive"
  ) {
    return "muted";
  }

  return "info";
}

function getPriorityClass(priority: string | null): string {
  const value = normalize(priority);

  if (value === "critical" || value === "urgent") {
    return "danger";
  }

  if (value === "high") {
    return "warning";
  }

  return "neutral";
}

function matchesSearch(
  activity: AuditActivity,
  query: string,
): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    activity.title,
    activity.description,
    activity.reference,
    activity.status,
    activity.priority,
    activity.actor,
    activity.type,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

/* ============================================================================
   PAGE
============================================================================ */

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSuperAdmin();

  const admin = createAdminClient();

  const params = await searchParams;

  const query = safeString(params.q, "").toLowerCase();
  const typeFilter = safeString(params.type, "all").toLowerCase();
  const statusFilter = safeString(params.status, "all").toLowerCase();

  /* --------------------------------------------------------------------------
     FETCH DATA
  -------------------------------------------------------------------------- */

  const [
    teamMembersResult,
    ticketsResult,
    casesResult,
  ] = await Promise.all([
    admin
      .from("platform_team_members")
      .select(`
        id,
        role,
        permissions,
        is_active,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      }),

    admin
      .from("support_tickets")
      .select(`
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
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(100),

    admin
      .from("support_cases")
      .select(`
        id,
        case_number,
        pharmacy_id,
        user_id,
        category,
        subject,
        description,
        priority,
        status,
        subscription_id,
        transaction_id,
        ai_analysis,
        ai_recommendation,
        ai_confidence,
        resolution_note,
        resolved_by,
        resolved_at,
        created_at,
        updated_at
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(100),
  ]);

  /* --------------------------------------------------------------------------
     ERROR HANDLING
  -------------------------------------------------------------------------- */

  if (teamMembersResult.error) {
    console.error(
      "Erreur audit platform_team_members:",
      teamMembersResult.error,
    );
  }

  if (ticketsResult.error) {
    console.error(
      "Erreur audit support_tickets:",
      ticketsResult.error,
    );
  }

  if (casesResult.error) {
    console.error(
      "Erreur audit support_cases:",
      casesResult.error,
    );
  }

  const teamMembers =
    (teamMembersResult.data ?? []) as TeamMember[];

  const tickets =
    (ticketsResult.data ?? []) as SupportTicket[];

  const cases =
    (casesResult.data ?? []) as SupportCase[];

  /* --------------------------------------------------------------------------
     BUILD ACTIVITY FEED
  -------------------------------------------------------------------------- */

  const teamActivities: AuditActivity[] = teamMembers.map(
    (member) => ({
      id: `team-${member.id}`,
      type: "team",
      title: "Membre de l'équipe plateforme",
      description: `Rôle : ${formatRole(member.role)}${
        member.is_active ? " • Compte actif" : " • Compte inactif"
      }`,
      reference: member.id,
      status: member.is_active ? "active" : "inactive",
      priority: "normal",
      actor: "Équipe plateforme",
      createdAt: member.created_at,
      href: `/super-admin/equipe/${member.id}`,
    }),
  );

  const ticketActivities: AuditActivity[] = tickets.map(
    (ticket) => ({
      id: `ticket-${ticket.id}`,
      type: "ticket",
      title:
        safeString(
          ticket.subject,
          "Ticket de support",
        ),
      description: [
        safeString(ticket.customer_name, "Client"),
        ticket.category
          ? `Catégorie : ${ticket.category}`
          : null,
      ]
        .filter(Boolean)
        .join(" • "),
      reference:
        safeString(
          ticket.ticket_number,
          ticket.id,
        ),
      status: safeString(ticket.status, "open"),
      priority: safeString(ticket.priority, "normal"),
      actor: ticket.assigned_to
        ? "Agent assigné"
        : "Non assigné",
      createdAt:
        ticket.last_message_at ??
        ticket.updated_at ??
        ticket.created_at,
      href: `/agent/support/ticket/${ticket.id}`,
    }),
  );

  const caseActivities: AuditActivity[] = cases.map(
    (supportCase) => ({
      id: `case-${supportCase.id}`,
      type: "case",
      title:
        safeString(
          supportCase.subject,
          "Dossier support",
        ),
      description: [
        supportCase.category
          ? `Catégorie : ${supportCase.category}`
          : null,
        supportCase.pharmacy_id
          ? `Pharmacie : ${supportCase.pharmacy_id.slice(
              0,
              8,
            )}…`
          : null,
      ]
        .filter(Boolean)
        .join(" • "),
      reference:
        safeString(
          supportCase.case_number,
          supportCase.id,
        ),
      status: safeString(
        supportCase.status,
        "open",
      ),
      priority: safeString(
        supportCase.priority,
        "normal",
      ),
      actor: supportCase.resolved_by
        ? "Dossier traité"
        : "Support",
      createdAt:
        supportCase.updated_at ??
        supportCase.created_at,
      href: `/agent/support/${supportCase.id}`,
    }),
  );

  /* --------------------------------------------------------------------------
     MERGE + FILTER + SORT
  -------------------------------------------------------------------------- */

  const allActivities = [
    ...teamActivities,
    ...ticketActivities,
    ...caseActivities,
  ].sort((a, b) => {
    const aTime = a.createdAt
      ? new Date(a.createdAt).getTime()
      : 0;

    const bTime = b.createdAt
      ? new Date(b.createdAt).getTime()
      : 0;

    return bTime - aTime;
  });

  const filteredActivities = allActivities.filter(
    (activity) => {
      const matchesType =
        typeFilter === "all" ||
        activity.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        normalize(activity.status) === statusFilter;

      return (
        matchesType &&
        matchesStatus &&
        matchesSearch(activity, query)
      );
    },
  );

  /* --------------------------------------------------------------------------
     STATISTICS
  -------------------------------------------------------------------------- */

  const totalActivities = allActivities.length;

  const activeMembers = teamMembers.filter(
    (member) => member.is_active,
  ).length;

  const totalTickets = tickets.length;

  const openTickets = tickets.filter((ticket) => {
    const status = normalize(ticket.status);

    return (
      status === "open" ||
      status === "opened" ||
      status === "pending" ||
      status === "in_progress" ||
      status === "processing"
    );
  }).length;

  const totalCases = cases.length;

  const openCases = cases.filter((supportCase) => {
    const status = normalize(
      supportCase.status,
    );

    return (
      status === "open" ||
      status === "opened" ||
      status === "pending" ||
      status === "in_progress" ||
      status === "processing"
    );
  }).length;

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <>
      <main className="pf-audit-page">
        <div className="pf-audit-shell">
          {/* ================================================================
              HEADER
          ================================================================ */}

          <header className="pf-audit-header">
            <div>
              <div className="pf-audit-eyebrow">
                <span className="pf-audit-eyebrow-dot" />
                Super Admin
              </div>

              <h1>Audit &amp; activités</h1>

              <p>
                Suivez les principales activités enregistrées
                sur l’espace plateforme PharmaFlow.
              </p>
            </div>

            <div className="pf-audit-header-actions">
              <Link
                href="/super-admin"
                className="pf-audit-button pf-audit-button-secondary"
              >
                ← Tableau de bord
              </Link>

              <PrintAuditButton />
            </div>
          </header>

          {/* ================================================================
              STATISTICS
          ================================================================ */}

          <section className="pf-audit-stats">
            <article className="pf-audit-stat-card">
              <div className="pf-audit-stat-icon">◷</div>

              <div>
                <span>Activités</span>
                <strong>{totalActivities}</strong>
                <small>
                  {filteredActivities.length} affichées
                </small>
              </div>
            </article>

            <article className="pf-audit-stat-card">
              <div className="pf-audit-stat-icon">👥</div>

              <div>
                <span>Équipe plateforme</span>
                <strong>{activeMembers}</strong>
                <small>
                  {teamMembers.length} membre(s)
                </small>
              </div>
            </article>

            <article className="pf-audit-stat-card">
              <div className="pf-audit-stat-icon">🎫</div>

              <div>
                <span>Tickets support</span>
                <strong>{openTickets}</strong>
                <small>
                  {totalTickets} ticket(s)
                </small>
              </div>
            </article>

            <article className="pf-audit-stat-card">
              <div className="pf-audit-stat-icon">📂</div>

              <div>
                <span>Dossiers support</span>
                <strong>{openCases}</strong>
                <small>
                  {totalCases} dossier(s)
                </small>
              </div>
            </article>
          </section>

          {/* ================================================================
              FILTERS
          ================================================================ */}

          <section className="pf-audit-filter-card">
            <form
              method="get"
              className="pf-audit-filters"
            >
              <div className="pf-audit-search">
                <label htmlFor="audit-search">
                  Rechercher
                </label>

                <input
                  id="audit-search"
                  name="q"
                  type="search"
                  defaultValue={
                    params.q ?? ""
                  }
                  placeholder="Référence, sujet, client, agent..."
                />
              </div>

              <div>
                <label htmlFor="audit-type">
                  Type
                </label>

                <select
                  id="audit-type"
                  name="type"
                  defaultValue={
                    params.type ?? "all"
                  }
                >
                  <option value="all">
                    Tous les types
                  </option>

                  <option value="team">
                    Équipe
                  </option>

                  <option value="ticket">
                    Tickets
                  </option>

                  <option value="case">
                    Dossiers
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="audit-status">
                  Statut
                </label>

                <select
                  id="audit-status"
                  name="status"
                  defaultValue={
                    params.status ?? "all"
                  }
                >
                  <option value="all">
                    Tous les statuts
                  </option>

                  <option value="open">
                    Ouvert
                  </option>

                  <option value="pending">
                    En attente
                  </option>

                  <option value="in_progress">
                    En cours
                  </option>

                  <option value="resolved">
                    Résolu
                  </option>

                  <option value="closed">
                    Fermé
                  </option>

                  <option value="active">
                    Actif
                  </option>

                  <option value="inactive">
                    Inactif
                  </option>
                </select>
              </div>

              <button
                type="submit"
                className="pf-audit-button pf-audit-button-primary"
              >
                🔎 Filtrer
              </button>

              <Link
                href="/super-admin/audit"
                className="pf-audit-reset"
              >
                Réinitialiser
              </Link>
            </form>
          </section>

          {/* ================================================================
              ACTIVITY TABLE
          ================================================================ */}

          <section className="pf-audit-panel">
            <div className="pf-audit-panel-header">
              <div>
                <span className="pf-audit-section-label">
                  JOURNAL
                </span>

                <h2>
                  Activités récentes
                </h2>

                <p>
                  Les données sont regroupées à partir
                  des activités actuellement disponibles
                  sur la plateforme.
                </p>
              </div>

              <div className="pf-audit-result-count">
                {filteredActivities.length}
              </div>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="pf-audit-empty">
                <div className="pf-audit-empty-icon">
                  🔍
                </div>

                <h3>
                  Aucune activité trouvée
                </h3>

                <p>
                  Aucun élément ne correspond aux
                  filtres sélectionnés.
                </p>

                <Link
                  href="/super-admin/audit"
                  className="pf-audit-button pf-audit-button-secondary"
                >
                  Effacer les filtres
                </Link>
              </div>
            ) : (
              <div className="pf-audit-table-wrap">
                <table className="pf-audit-table">
                  <thead>
                    <tr>
                      <th>Activité</th>
                      <th>Type</th>
                      <th>Référence</th>
                      <th>Statut</th>
                      <th>Priorité</th>
                      <th>Source</th>
                      <th>Date</th>
                      <th aria-label="Action">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredActivities.map(
                      (activity) => (
                        <tr key={activity.id}>
                          <td>
                            <div className="pf-audit-activity">
                              <div
                                className={`pf-audit-activity-icon pf-audit-type-${activity.type}`}
                              >
                                {activity.type ===
                                  "team" && "👥"}

                                {activity.type ===
                                  "ticket" && "🎫"}

                                {activity.type ===
                                  "case" && "📂"}
                              </div>

                              <div>
                                <strong>
                                  {activity.title}
                                </strong>

                                <span>
                                  {
                                    activity.description
                                  }
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="pf-audit-type-badge">
                              {activity.type ===
                                "team" &&
                                "Équipe"}

                              {activity.type ===
                                "ticket" &&
                                "Ticket"}

                              {activity.type ===
                                "case" &&
                                "Dossier"}
                            </span>
                          </td>

                          <td>
                            <code>
                              {activity.reference}
                            </code>
                          </td>

                          <td>
                            <span
                              className={`pf-audit-badge pf-audit-status-${getStatusClass(
                                activity.status,
                              )}`}
                            >
                              {formatStatus(
                                activity.status,
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`pf-audit-badge pf-audit-priority-${getPriorityClass(
                                activity.priority,
                              )}`}
                            >
                              {formatPriority(
                                activity.priority,
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="pf-audit-actor">
                              {activity.actor}
                            </span>
                          </td>

                          <td>
                            <time
                              dateTime={
                                activity.createdAt ??
                                undefined
                              }
                              className="pf-audit-date"
                            >
                              {formatDate(
                                activity.createdAt,
                              )}
                            </time>
                          </td>

                          <td>
                            <Link
                              href={activity.href}
                              className="pf-audit-view"
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

          {/* ================================================================
              INFORMATION
          ================================================================ */}

          <section className="pf-audit-info">
            <div className="pf-audit-info-icon">
              🛡️
            </div>

            <div>
              <strong>
                Journal d’activité plateforme
              </strong>

              <p>
                Cette vue centralise les activités
                actuellement disponibles dans les
                modules de l’équipe, du support et des
                dossiers. Elle ne prétend pas remplacer
                un journal d’audit immuable tant qu’une
                table d’audit dédiée n’est pas configurée.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* ====================================================================
          STYLES
      ==================================================================== */}

      <style>{`
        .pf-audit-page {
          min-height: 100vh;
          padding: 32px;
          background:
            radial-gradient(
              circle at top right,
              rgba(20, 184, 166, 0.10),
              transparent 34%
            ),
            #f5f8fa;
          color: #102a43;
        }

        .pf-audit-shell {
          width: min(1600px, 100%);
          margin: 0 auto;
        }

        .pf-audit-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .pf-audit-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0f766e;
        }

        .pf-audit-eyebrow-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #14b8a6;
          box-shadow: 0 0 0 5px rgba(20, 184, 166, 0.12);
        }

        .pf-audit-header h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.04em;
          color: #102a43;
        }

        .pf-audit-header p {
          max-width: 700px;
          margin: 12px 0 0;
          color: #627d98;
          font-size: 15px;
          line-height: 1.7;
        }

        .pf-audit-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pf-audit-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
          white-space: nowrap;
        }

        .pf-audit-button:hover {
          transform: translateY(-1px);
        }

        .pf-audit-button-primary {
          color: #ffffff;
          background: #0f766e;
          border-color: #0f766e;
          box-shadow: 0 8px 20px rgba(15, 118, 110, 0.18);
        }

        .pf-audit-button-primary:hover {
          background: #115e59;
        }

        .pf-audit-button-secondary {
          color: #334e68;
          background: #ffffff;
          border-color: #d9e2ec;
          box-shadow: 0 4px 12px rgba(16, 42, 67, 0.05);
        }

        .pf-audit-button-secondary:hover {
          border-color: #9fb3c8;
        }

        .pf-audit-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .pf-audit-stat-card {
          display: flex;
          align-items: center;
          gap: 15px;
          min-height: 116px;
          padding: 20px;
          background: #ffffff;
          border: 1px solid #e6edf3;
          border-radius: 18px;
          box-shadow: 0 8px 30px rgba(16, 42, 67, 0.055);
        }

        .pf-audit-stat-icon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          border-radius: 14px;
          background: #e6fffb;
          font-size: 21px;
        }

        .pf-audit-stat-card span {
          display: block;
          margin-bottom: 4px;
          color: #627d98;
          font-size: 12px;
          font-weight: 700;
        }

        .pf-audit-stat-card strong {
          display: block;
          color: #102a43;
          font-size: 28px;
          line-height: 1;
        }

        .pf-audit-stat-card small {
          display: block;
          margin-top: 6px;
          color: #829ab1;
          font-size: 11px;
        }

        .pf-audit-filter-card {
          margin-bottom: 20px;
          padding: 18px;
          background: #ffffff;
          border: 1px solid #e6edf3;
          border-radius: 18px;
          box-shadow: 0 8px 30px rgba(16, 42, 67, 0.045);
        }

        .pf-audit-filters {
          display: grid;
          grid-template-columns: minmax(240px, 1.6fr) minmax(150px, 0.7fr) minmax(150px, 0.7fr) auto auto;
          align-items: end;
          gap: 12px;
        }

        .pf-audit-filters > div {
          min-width: 0;
        }

        .pf-audit-filters label {
          display: block;
          margin: 0 0 7px;
          color: #486581;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .pf-audit-filters input,
        .pf-audit-filters select {
          width: 100%;
          height: 44px;
          padding: 0 13px;
          border: 1px solid #d9e2ec;
          border-radius: 11px;
          outline: none;
          background: #ffffff;
          color: #102a43;
          font: inherit;
          font-size: 13px;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .pf-audit-filters input:focus,
        .pf-audit-filters select:focus {
          border-color: #14b8a6;
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.10);
        }

        .pf-audit-reset {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          padding: 0 12px;
          color: #627d98;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }

        .pf-audit-reset:hover {
          color: #0f766e;
        }

        .pf-audit-panel {
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e6edf3;
          border-radius: 20px;
          box-shadow: 0 10px 35px rgba(16, 42, 67, 0.055);
        }

        .pf-audit-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          border-bottom: 1px solid #edf2f7;
        }

        .pf-audit-section-label {
          display: block;
          margin-bottom: 7px;
          color: #0f766e;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .pf-audit-panel-header h2 {
          margin: 0;
          color: #102a43;
          font-size: 21px;
          letter-spacing: -0.02em;
        }

        .pf-audit-panel-header p {
          margin: 6px 0 0;
          color: #829ab1;
          font-size: 12px;
          line-height: 1.5;
        }

        .pf-audit-result-count {
          display: grid;
          place-items: center;
          min-width: 42px;
          height: 42px;
          padding: 0 10px;
          border-radius: 12px;
          background: #e6fffb;
          color: #0f766e;
          font-size: 14px;
          font-weight: 900;
        }

        .pf-audit-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .pf-audit-table {
          width: 100%;
          min-width: 1050px;
          border-collapse: collapse;
        }

        .pf-audit-table th {
          padding: 13px 16px;
          text-align: left;
          background: #f8fafc;
          border-bottom: 1px solid #e6edf3;
          color: #627d98;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pf-audit-table td {
          padding: 15px 16px;
          border-bottom: 1px solid #edf2f7;
          color: #334e68;
          font-size: 12px;
          vertical-align: middle;
        }

        .pf-audit-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .pf-audit-table tbody tr {
          transition: background 0.16s ease;
        }

        .pf-audit-table tbody tr:hover {
          background: #fbfefd;
        }

        .pf-audit-activity {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 260px;
        }

        .pf-audit-activity-icon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 11px;
          font-size: 16px;
        }

        .pf-audit-type-team {
          background: #eef2ff;
        }

        .pf-audit-type-ticket {
          background: #e6fffb;
        }

        .pf-audit-type-case {
          background: #fff7ed;
        }

        .pf-audit-activity strong {
          display: block;
          max-width: 300px;
          overflow: hidden;
          color: #243b53;
          font-size: 12px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pf-audit-activity span {
          display: block;
          max-width: 320px;
          margin-top: 3px;
          overflow: hidden;
          color: #829ab1;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pf-audit-type-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 7px;
          background: #f0f4f8;
          color: #486581;
          font-size: 10px;
          font-weight: 800;
        }

        .pf-audit-table code {
          padding: 4px 7px;
          border-radius: 7px;
          background: #f5f7fa;
          color: #486581;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10px;
          white-space: nowrap;
        }

        .pf-audit-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 25px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .pf-audit-status-success {
          background: #ecfdf5;
          color: #047857;
        }

        .pf-audit-status-warning {
          background: #fffbeb;
          color: #b45309;
        }

        .pf-audit-status-info {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .pf-audit-status-muted {
          background: #f1f5f9;
          color: #64748b;
        }

        .pf-audit-priority-danger {
          background: #fef2f2;
          color: #b91c1c;
        }

        .pf-audit-priority-warning {
          background: #fff7ed;
          color: #c2410c;
        }

        .pf-audit-priority-neutral {
          background: #f1f5f9;
          color: #64748b;
        }

        .pf-audit-actor {
          color: #627d98;
          font-size: 11px;
          white-space: nowrap;
        }

        .pf-audit-date {
          color: #627d98;
          font-size: 11px;
          white-space: nowrap;
        }

        .pf-audit-view {
          color: #0f766e;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .pf-audit-view:hover {
          text-decoration: underline;
        }

        .pf-audit-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 360px;
          padding: 40px 20px;
          text-align: center;
        }

        .pf-audit-empty-icon {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          border-radius: 18px;
          background: #f0f4f8;
          font-size: 25px;
        }

        .pf-audit-empty h3 {
          margin: 0;
          color: #243b53;
          font-size: 17px;
        }

        .pf-audit-empty p {
          margin: 7px 0 18px;
          color: #829ab1;
          font-size: 12px;
        }

        .pf-audit-info {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-top: 18px;
          padding: 18px;
          border: 1px solid #d9e2ec;
          border-radius: 16px;
          background: #f8fafc;
        }

        .pf-audit-info-icon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 11px;
          background: #e6fffb;
          font-size: 17px;
        }

        .pf-audit-info strong {
          display: block;
          margin-bottom: 4px;
          color: #334e68;
          font-size: 12px;
          font-weight: 900;
        }

        .pf-audit-info p {
          margin: 0;
          color: #627d98;
          font-size: 11px;
          line-height: 1.6;
        }

        @media (max-width: 1100px) {
          .pf-audit-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pf-audit-filters {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pf-audit-search {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .pf-audit-page {
            padding: 18px 12px;
          }

          .pf-audit-header {
            flex-direction: column;
          }

          .pf-audit-header-actions {
            width: 100%;
            justify-content: stretch;
          }

          .pf-audit-header-actions .pf-audit-button,
          .pf-audit-header-actions .pf-audit-print {
            flex: 1;
          }

          .pf-audit-stats {
            grid-template-columns: 1fr;
          }

          .pf-audit-filters {
            grid-template-columns: 1fr;
          }

          .pf-audit-search {
            grid-column: auto;
          }

          .pf-audit-panel-header {
            padding: 18px;
          }

          .pf-audit-info {
            padding: 15px;
          }
        }

        @media print {
          .pf-audit-page {
            padding: 0;
            background: #ffffff;
          }

          .pf-audit-header-actions,
          .pf-audit-filter-card,
          .pf-audit-info,
          .pf-audit-view {
            display: none !important;
          }

          .pf-audit-panel,
          .pf-audit-stat-card {
            box-shadow: none;
          }

          .pf-audit-table {
            min-width: 0;
          }
        }
      `}</style>
    </>
  );
}