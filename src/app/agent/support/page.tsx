import Link from "next/link";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAgent } from "@/app/lib/agent/auth";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

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
  visitor_token_hash: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

type SupportCase = {
  id: string;
  case_number: string;
  pharmacy_id: string | null;
  user_id: string | null;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  subscription_id: string | null;
  transaction_id: string | null;
  ai_analysis: string | null;
  ai_recommendation: string | null;
  ai_confidence: number | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupportItem = {
  id: string;
  source:
    | "reclamation"
    | "ticket"
    | "case";
  reference: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  pharmacyId: string | null;
  createdAt: string;
  updatedAt: string;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function hasPermission(
  permissions: Record<string, boolean>,
  permission: string,
) {
  return permissions[permission] === true;
}

function normalizePermissions(
  permissions: unknown,
): Record<string, boolean> {
  if (
    permissions &&
    typeof permissions === "object" &&
    !Array.isArray(permissions)
  ) {
    return permissions as Record<
      string,
      boolean
    >;
  }

  if (Array.isArray(permissions)) {
    return permissions.reduce<
      Record<string, boolean>
    >((result, permission) => {
      if (
        typeof permission === "string"
      ) {
        result[permission] = true;
      }

      return result;
    }, {});
  }

  return {};
}

function normalizeRole(
  role: unknown,
) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isTechnicalAgent(
  role: unknown,
) {
  const normalizedRole =
    normalizeRole(role);

  return (
    normalizedRole === "technical" ||
    normalizedRole === "technique" ||
    normalizedRole === "technicien"
  );
}

function isPlatformAdministrator(
  role: unknown,
) {
  const normalizedRole =
    normalizeRole(role);

  return (
    normalizedRole === "superadmin" ||
    normalizedRole === "platformadmin" ||
    normalizedRole === "administrator" ||
    normalizedRole === "admin"
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusLabel(
  status: string | null,
) {
  switch (status) {
    case "new":
      return "Nouvelle";

    case "open":
      return "Ouverte";

    case "in_progress":
      return "En cours";

    case "pending":
      return "En attente";

    case "resolved":
      return "Résolue";

    case "closed":
      return "Fermée";

    default:
      return status || "Inconnue";
  }
}

function getPriorityLabel(
  priority: string | null,
) {
  switch (priority) {
    case "urgent":
      return "Urgente";

    case "high":
      return "Haute";

    case "medium":
      return "Moyenne";

    case "low":
      return "Faible";

    default:
      return priority || "Normale";
  }
}

function getCategoryLabel(
  category: string | null,
) {
  switch (category) {
    case "technical":
      return "Technique";

    case "payment":
      return "Paiement";

    case "subscription":
      return "Abonnement";

    case "account":
      return "Compte";

    case "pharmacy":
      return "Pharmacie";

    case "security":
      return "Sécurité";

    case "general":
      return "Général";

    case "billing":
      return "Facturation";

    default:
      return category || "Général";
  }
}

function statusClass(
  status: string | null,
) {
  switch (status) {
    case "new":
      return "new";

    case "open":
      return "open";

    case "in_progress":
      return "progress";

    case "pending":
      return "pending";

    case "resolved":
      return "resolved";

    case "closed":
      return "closed";

    default:
      return "default";
  }
}

function priorityClass(
  priority: string | null,
) {
  switch (priority) {
    case "urgent":
      return "urgent";

    case "high":
      return "high";

    case "medium":
      return "medium";

    case "low":
      return "low";

    default:
      return "medium";
  }
}

function sourceLabel(
  source: SupportItem["source"],
) {
  switch (source) {
    case "reclamation":
      return "Réclamation";

    case "ticket":
      return "Ticket";

    case "case":
      return "Dossier support";

    default:
      return "Support";
  }
}

function sourceClass(
  source: SupportItem["source"],
) {
  switch (source) {
    case "reclamation":
      return "reclamation";

    case "ticket":
      return "ticket";

    case "case":
      return "case";

    default:
      return "case";
  }
}

function getItemHref(
  item: SupportItem,
) {
  if (
    item.source ===
    "reclamation"
  ) {
    return `/agent/support/reclamation/${item.id}`;
  }

  if (
    item.source ===
    "ticket"
  ) {
    return `/agent/support/ticket/${item.id}`;
  }

  return `/agent/support/${item.id}`;
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default async function AgentSupportPage() {
  /*
  |--------------------------------------------------------------------------
  | AGENT CONNECTÉ
  |--------------------------------------------------------------------------
  */

  const member =
    await requireAgent();

  const permissions =
    normalizePermissions(
      member.permissions,
    );

  const technicalAgent =
    isTechnicalAgent(
      member.role,
    );

  const platformAdministrator =
    isPlatformAdministrator(
      member.role,
    );

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS EFFECTIVES
  |--------------------------------------------------------------------------
  |
  | IMPORTANT :
  |
  | Un agent technique doit pouvoir accéder au
  | centre support pour diagnostiquer et traiter
  | les incidents/tickets techniques.
  |
  | On ne modifie pas les permissions stockées
  | dans la base de données.
  |
  | On applique uniquement les permissions
  | effectives pour cette page.
  |
  */

  const canViewByPermission =
    hasPermission(
      permissions,
      "support.view",
    );

  const canManageByPermission =
    hasPermission(
      permissions,
      "support.manage",
    );

  const canView =
    canViewByPermission ||
    technicalAgent ||
    platformAdministrator;

  const canManage =
    canManageByPermission ||
    technicalAgent ||
    platformAdministrator;

  /*
  |--------------------------------------------------------------------------
  | PROTECTION
  |--------------------------------------------------------------------------
  */

  if (!canView && !canManage) {
    return (
      <main className="support-denied">
        <div className="support-denied-card">
          <div className="support-denied-icon">
            🔐
          </div>

          <span className="support-denied-eyebrow">
            ESPACE AGENT
          </span>

          <h1>
            Accès refusé
          </h1>

          <p>
            Votre compte agent ne dispose
            pas des permissions nécessaires
            pour accéder au centre de support.
          </p>

          <Link
            href="/agent"
            className="support-back-button"
          >
            ← Retour à l'espace Agent
          </Link>
        </div>

        <style>
          {supportStyles}
        </style>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SUPABASE ADMIN
  |--------------------------------------------------------------------------
  */

  const supabase =
    createAdminClient();

  /*
  |--------------------------------------------------------------------------
  | RÉCUPÉRATION DES 3 SOURCES
  |--------------------------------------------------------------------------
  */

  const [
    reclamationsResult,
    ticketsResult,
    casesResult,
  ] = await Promise.all([
    supabase
      .from("reclamations")
      .select(`
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
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),

    supabase
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
        visitor_token_hash,
        assigned_to,
        created_at,
        updated_at,
        last_message_at
      `)
      .order(
        "last_message_at",
        {
          ascending: false,
        },
      ),

    supabase
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
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),
  ]);

  /*
  |--------------------------------------------------------------------------
  | ERREURS DATABASE
  |--------------------------------------------------------------------------
  */

  const databaseErrors = [
    reclamationsResult.error,
    ticketsResult.error,
    casesResult.error,
  ].filter(Boolean);

  if (
    databaseErrors.length > 0
  ) {
    console.error(
      "[AGENT SUPPORT]",
      databaseErrors,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DONNÉES
  |--------------------------------------------------------------------------
  */

  const reclamations =
    (reclamationsResult.data ??
      []) as Reclamation[];

  const tickets =
    (ticketsResult.data ??
      []) as SupportTicket[];

  const cases =
    (casesResult.data ??
      []) as SupportCase[];

  /*
  |--------------------------------------------------------------------------
  | NORMALISATION — RÉCLAMATIONS
  |--------------------------------------------------------------------------
  */

  const reclamationItems:
    SupportItem[] =
    reclamations.map(
      (item) => ({
        id: item.id,

        source:
          "reclamation",

        reference:
          item.reference,

        subject:
          item.subject ||
          "Réclamation sans objet",

        description:
          item.resolution ||
          item.admin_reply ||
          "Réclamation transmise par le client.",

        status:
          item.status,

        priority:
          item.priority,

        category:
          "general",

        customerName:
          item.client_name ||
          "Client",

        customerEmail:
          item.client_email,

        customerPhone:
          item.client_phone,

        pharmacyId:
          item.pharmacy_id,

        createdAt:
          item.created_at,

        updatedAt:
          item.updated_at,
      }),
    );

  /*
  |--------------------------------------------------------------------------
  | NORMALISATION — TICKETS
  |--------------------------------------------------------------------------
  */

  const ticketItems:
    SupportItem[] =
    tickets.map(
      (item) => ({
        id: item.id,

        source:
          "ticket",

        reference:
          item.ticket_number,

        subject:
          item.subject ||
          "Ticket sans objet",

        description:
          `Demande ${getCategoryLabel(
            item.category,
          )}.`,

        status:
          item.status,

        priority:
          item.priority,

        category:
          item.category,

        customerName:
          item.customer_name,

        customerEmail:
          item.customer_email,

        customerPhone:
          item.customer_phone,

        pharmacyId:
          null,

        createdAt:
          item.created_at,

        updatedAt:
          item.updated_at,
      }),
    );

  /*
  |--------------------------------------------------------------------------
  | NORMALISATION — DOSSIERS
  |--------------------------------------------------------------------------
  */

  const caseItems:
    SupportItem[] =
    cases.map(
      (item) => ({
        id: item.id,

        source:
          "case",

        reference:
          item.case_number,

        subject:
          item.subject,

        description:
          item.description,

        status:
          item.status,

        priority:
          item.priority,

        category:
          item.category,

        customerName:
          "Pharmacie PharmaFlow",

        customerEmail:
          null,

        customerPhone:
          null,

        pharmacyId:
          item.pharmacy_id,

        createdAt:
          item.created_at,

        updatedAt:
          item.updated_at,
      }),
    );

  /*
  |--------------------------------------------------------------------------
  | FUSION
  |--------------------------------------------------------------------------
  */

  const allItems =
    [
      ...reclamationItems,
      ...ticketItems,
      ...caseItems,
    ].sort(
      (a, b) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    );

  /*
  |--------------------------------------------------------------------------
  | STATISTIQUES
  |--------------------------------------------------------------------------
  */

  const totalCases =
    allItems.length;

  const newCases =
    allItems.filter(
      (item) =>
        item.status ===
        "new",
    ).length;

  const openCases =
    allItems.filter(
      (item) =>
        item.status ===
          "open" ||
        item.status ===
          "in_progress",
    ).length;

  const pendingCases =
    allItems.filter(
      (item) =>
        item.status ===
        "pending",
    ).length;

  const resolvedCases =
    allItems.filter(
      (item) =>
        item.status ===
          "resolved" ||
        item.status ===
          "closed",
    ).length;

  const urgentCases =
    allItems.filter(
      (item) =>
        item.priority ===
        "urgent",
    ).length;

  const reclamationCount =
    reclamations.length;

  const ticketCount =
    tickets.length;

  const supportCaseCount =
    cases.length;

  /*
  |--------------------------------------------------------------------------
  | LIBELLÉ DU RÔLE
  |--------------------------------------------------------------------------
  */

  const agentRoleLabel =
    technicalAgent
      ? "Agent Technique"
      : platformAdministrator
        ? "Administrateur Plateforme"
        : canManage
          ? "Agent Support"
          : "Agent";

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <main className="support-page">
      {/* ================================================================
          HEADER
      ================================================================ */}

      <header className="support-header">
        <div className="support-header-left">
          <Link
            href="/agent"
            className="support-back"
          >
            ← Espace Agent
          </Link>

          <div className="support-title">
            <span className="support-eyebrow">
              CENTRE DE SUPPORT
            </span>

            <h1>
              Support & Réclamations
            </h1>

            <p>
              Gérez les réclamations,
              tickets et dossiers des
              pharmacies PharmaFlow.
            </p>
          </div>
        </div>

        <div className="support-agent-box">
          <div className="support-agent-avatar">
            {member.full_name
              ?.trim()
              .charAt(0)
              .toUpperCase() ||
              "A"}
          </div>

          <div>
            <strong>
              {member.full_name}
            </strong>

            <span>
              {agentRoleLabel}
            </span>
          </div>
        </div>
      </header>

      {/* ================================================================
          TOOLBAR
      ================================================================ */}

      <section className="support-toolbar">
        <div>
          <strong>
            Centre opérationnel
          </strong>

          <span>
            {canManage
              ? "Vous pouvez consulter et gérer les demandes."
              : "Vous disposez d'un accès en consultation."}
          </span>
        </div>

        <div className="support-toolbar-actions">
          <div className="toolbar-source">
            🧾 {reclamationCount}{" "}
            réclamation
            {reclamationCount >
            1
              ? "s"
              : ""}
          </div>

          <div className="toolbar-source">
            🎫 {ticketCount}{" "}
            ticket
            {ticketCount >
            1
              ? "s"
              : ""}
          </div>

          <div className="toolbar-source">
            📂 {supportCaseCount}{" "}
            dossier
            {supportCaseCount >
            1
              ? "s"
              : ""}
          </div>

          <Link
            href="/agent"
            className="support-toolbar-button"
          >
            ← Tableau de bord
          </Link>
        </div>
      </section>

      {/* ================================================================
          STATISTIQUES
      ================================================================ */}

      <section className="support-stats">
        <div className="support-stat">
          <div className="support-stat-icon">
            📂
          </div>

          <div>
            <span>
              Toutes les demandes
            </span>

            <strong>
              {totalCases}
            </strong>
          </div>
        </div>

        <div className="support-stat">
          <div className="support-stat-icon blue">
            🆕
          </div>

          <div>
            <span>
              Nouvelles
            </span>

            <strong>
              {newCases}
            </strong>
          </div>
        </div>

        <div className="support-stat">
          <div className="support-stat-icon orange">
            ⏳
          </div>

          <div>
            <span>
              En cours
            </span>

            <strong>
              {openCases}
            </strong>
          </div>
        </div>

        <div className="support-stat">
          <div className="support-stat-icon yellow">
            🕐
          </div>

          <div>
            <span>
              En attente
            </span>

            <strong>
              {pendingCases}
            </strong>
          </div>
        </div>

        <div className="support-stat">
          <div className="support-stat-icon green">
            ✓
          </div>

          <div>
            <span>
              Résolues
            </span>

            <strong>
              {resolvedCases}
            </strong>
          </div>
        </div>

        <div className="support-stat">
          <div className="support-stat-icon red">
            🚨
          </div>

          <div>
            <span>
              Urgentes
            </span>

            <strong>
              {urgentCases}
            </strong>
          </div>
        </div>
      </section>

      {/* ================================================================
          SOURCES
      ================================================================ */}

      <section className="support-source-summary">
        <div className="source-card reclamation">
          <div className="source-icon">
            🧾
          </div>

          <div>
            <span>
              Réclamations
            </span>

            <strong>
              {reclamationCount}
            </strong>

            <small>
              Depuis la table
              reclamations
            </small>
          </div>
        </div>

        <div className="source-card ticket">
          <div className="source-icon">
            🎫
          </div>

          <div>
            <span>
              Tickets support
            </span>

            <strong>
              {ticketCount}
            </strong>

            <small>
              Depuis support_tickets
            </small>
          </div>
        </div>

        <div className="source-card case">
          <div className="source-icon">
            📂
          </div>

          <div>
            <span>
              Dossiers support
            </span>

            <strong>
              {supportCaseCount}
            </strong>

            <small>
              Depuis support_cases
            </small>
          </div>
        </div>
      </section>

      {/* ================================================================
          LISTE
      ================================================================ */}

      <section className="support-section">
        <div className="support-section-header">
          <div>
            <span className="support-section-eyebrow">
              DOSSIERS DE SUPPORT
            </span>

            <h2>
              Toutes les demandes
            </h2>

            <p>
              Les réclamations et
              tickets sont centralisés
              dans cet espace.
            </p>
          </div>

          <div className="support-count">
            {totalCases} demande
            {totalCases >
            1
              ? "s"
              : ""}
          </div>
        </div>

        {allItems.length ===
        0 ? (
          <div className="support-empty">
            <div className="support-empty-icon">
              🛟
            </div>

            <h3>
              Aucune demande pour le moment
            </h3>

            <p>
              Les réclamations et
              tickets des pharmacies
              apparaîtront
              automatiquement ici
              lorsqu'ils seront créés.
            </p>
          </div>
        ) : (
          <div className="support-list">
            {allItems.map(
              (item) => (
                <article
                  key={`${item.source}-${item.id}`}
                  className="support-case"
                >
                  <div className="support-case-main">
                    <div className="support-case-top">
                      <span
                        className={`support-source-badge source-${sourceClass(
                          item.source,
                        )}`}
                      >
                        {sourceLabel(
                          item.source,
                        )}
                      </span>

                      <div className="support-case-number">
                        {
                          item.reference
                        }
                      </div>

                      <span
                        className={`support-badge status-${statusClass(
                          item.status,
                        )}`}
                      >
                        {getStatusLabel(
                          item.status,
                        )}
                      </span>

                      <span
                        className={`support-badge priority-${priorityClass(
                          item.priority,
                        )}`}
                      >
                        {getPriorityLabel(
                          item.priority,
                        )}
                      </span>
                    </div>

                    <h3>
                      {item.subject}
                    </h3>

                    <p className="support-case-description">
                      {item.description ||
                        "Aucune description fournie."}
                    </p>

                    <div className="support-case-meta">
                      <span>
                        👤{" "}
                        {
                          item.customerName
                        }
                      </span>

                      {item.customerPhone ? (
                        <span>
                          📞{" "}
                          {
                            item.customerPhone
                          }
                        </span>
                      ) : null}

                      {item.customerEmail ? (
                        <span>
                          ✉️{" "}
                          {
                            item.customerEmail
                          }
                        </span>
                      ) : null}

                      <span>
                        📁{" "}
                        {getCategoryLabel(
                          item.category,
                        )}
                      </span>

                      {item.pharmacyId ? (
                        <span>
                          🏥 Pharmacie :{" "}
                          {item.pharmacyId.slice(
                            0,
                            8,
                          )}
                        </span>
                      ) : null}

                      <span>
                        📅{" "}
                        {formatDate(
                          item.createdAt,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="support-case-action">
                    <Link
                      href={getItemHref(
                        item,
                      )}
                      className="support-open-button"
                    >
                      Ouvrir
                      <span>
                        →
                      </span>
                    </Link>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {/* ================================================================
          PERMISSIONS
      ================================================================ */}

      <section className="support-permission">
        <div className="support-permission-icon">
          🔐
        </div>

        <div>
          <strong>
            Permissions effectives
          </strong>

          <p>
            {technicalAgent
              ? "Votre rôle Technique vous permet de consulter et de traiter les demandes du centre de support."
              : canManage
                ? "Votre compte possède les permissions de consultation et de gestion du support."
                : "Votre compte possède actuellement un accès en consultation au support."}
          </p>

          <div className="support-permission-tags">
            {canView ? (
              <span>
                ✓ support.view
              </span>
            ) : null}

            {canManage ? (
              <span>
                ✓ support.manage
              </span>
            ) : null}

            {technicalAgent ? (
              <span>
                ✓ technical
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <style>
        {supportStyles}
      </style>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const supportStyles = `
  .support-page {
    min-height: 100vh;
    background: #f6f8fb;
    color: #172033;
    padding-bottom: 50px;
  }

  .support-header {
    padding: 26px 36px;
    background: #ffffff;
    border-bottom: 1px solid #e5eaf0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 25px;
  }

  .support-header-left {
    min-width: 0;
  }

  .support-back {
    display: inline-flex;
    align-items: center;
    margin-bottom: 18px;
    color: #0f766e;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
  }

  .support-title h1 {
    margin: 6px 0;
    color: #172033;
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: -0.7px;
  }

  .support-title p {
    margin: 0;
    color: #697586;
    font-size: 13px;
  }

  .support-eyebrow,
  .support-section-eyebrow {
    display: block;
    color: #0f766e;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .support-agent-box {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e5eaf0;
    border-radius: 14px;
  }

  .support-agent-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #e7f5f2;
    color: #0f766e;
    font-weight: 800;
  }

  .support-agent-box strong {
    display: block;
    color: #344054;
    font-size: 12px;
  }

  .support-agent-box span {
    display: block;
    margin-top: 3px;
    color: #8a94a6;
    font-size: 10px;
  }

  .support-toolbar,
  .support-stats,
  .support-source-summary,
  .support-section,
  .support-permission {
    width: min(1180px, calc(100% - 48px));
    margin-left: auto;
    margin-right: auto;
  }

  .support-toolbar {
    margin-top: 24px;
    padding: 17px 19px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .support-toolbar strong {
    display: block;
    color: #344054;
    font-size: 13px;
  }

  .support-toolbar span {
    display: block;
    margin-top: 4px;
    color: #8a94a6;
    font-size: 11px;
  }

  .support-toolbar-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 7px;
  }

  .toolbar-source {
    padding: 8px 10px;
    background: #f8fafc;
    border: 1px solid #e5eaf0;
    border-radius: 8px;
    color: #667085;
    font-size: 9px;
    font-weight: 700;
  }

  .support-toolbar-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 9px;
    background: #0f766e;
    color: #ffffff;
    text-decoration: none;
    font-size: 10px;
    font-weight: 800;
  }

  .support-stats {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 11px;
  }

  .support-stat {
    min-width: 0;
    padding: 15px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .support-stat-icon {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: #e7f5f2;
  }

  .support-stat-icon.blue {
    background: #eef6ff;
  }

  .support-stat-icon.orange {
    background: #fff5e8;
  }

  .support-stat-icon.yellow {
    background: #fffbea;
  }

  .support-stat-icon.green {
    background: #edf9f0;
  }

  .support-stat-icon.red {
    background: #fff0f0;
  }

  .support-stat span {
    display: block;
    color: #8a94a6;
    font-size: 9px;
  }

  .support-stat strong {
    display: block;
    margin-top: 2px;
    color: #273142;
    font-size: 18px;
  }

  .support-source-summary {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 11px;
  }

  .source-card {
    padding: 15px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .source-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: #f1f5f9;
  }

  .source-card.reclamation .source-icon {
    background: #fff4ed;
  }

  .source-card.ticket .source-icon {
    background: #eef6ff;
  }

  .source-card.case .source-icon {
    background: #edf9f0;
  }

  .source-card span {
    display: block;
    color: #7a8597;
    font-size: 10px;
  }

  .source-card strong {
    display: block;
    margin-top: 2px;
    color: #273142;
    font-size: 20px;
  }

  .source-card small {
    display: block;
    margin-top: 2px;
    color: #98a2b3;
    font-size: 8px;
  }

  .support-section {
    margin-top: 22px;
  }

  .support-section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 13px;
  }

  .support-section-header h2 {
    margin: 5px 0 3px;
    color: #172033;
    font-size: 20px;
  }

  .support-section-header p {
    margin: 0;
    color: #7a8597;
    font-size: 12px;
  }

  .support-count {
    color: #7a8597;
    font-size: 11px;
  }

  .support-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .support-case {
    padding: 17px 18px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .support-case:hover {
    border-color: #cbd8d6;
    box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
  }

  .support-case-main {
    min-width: 0;
    flex: 1;
  }

  .support-case-top {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
  }

  .support-case-number {
    color: #0f766e;
    font-size: 10px;
    font-weight: 800;
  }

  .support-source-badge {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
  }

  .source-reclamation {
    background: #fff0e8;
    color: #c2410c;
  }

  .source-ticket {
    background: #eef6ff;
    color: #2563eb;
  }

  .source-case {
    background: #edf9f0;
    color: #15803d;
  }

  .support-badge {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 800;
  }

  .status-new {
    background: #eef6ff;
    color: #2563eb;
  }

  .status-open {
    background: #e9f8f4;
    color: #0f766e;
  }

  .status-progress {
    background: #fff5e8;
    color: #c2410c;
  }

  .status-pending {
    background: #fffbea;
    color: #a16207;
  }

  .status-resolved {
    background: #edf9f0;
    color: #15803d;
  }

  .status-closed {
    background: #f1f5f9;
    color: #64748b;
  }

  .status-default {
    background: #f1f5f9;
    color: #475467;
  }

  .priority-urgent {
    background: #fff0f0;
    color: #dc2626;
  }

  .priority-high {
    background: #fff5e8;
    color: #c2410c;
  }

  .priority-medium {
    background: #eef6ff;
    color: #2563eb;
  }

  .priority-low {
    background: #edf9f0;
    color: #15803d;
  }

  .support-case h3 {
    margin: 9px 0 4px;
    color: #273142;
    font-size: 14px;
  }

  .support-case-description {
    max-width: 850px;
    margin: 0;
    color: #718096;
    font-size: 11px;
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .support-case-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 10px;
    color: #98a2b3;
    font-size: 9px;
  }

  .support-case-action {
    flex: 0 0 auto;
  }

  .support-open-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 38px;
    padding: 0 13px;
    border-radius: 10px;
    background: #0f766e;
    color: #ffffff;
    text-decoration: none;
    font-size: 11px;
    font-weight: 800;
  }

  .support-open-button span {
    font-size: 14px;
  }

  .support-empty {
    padding: 55px 25px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 17px;
    text-align: center;
  }

  .support-empty-icon {
    font-size: 38px;
  }

  .support-empty h3 {
    margin: 10px 0 0;
    color: #344054;
    font-size: 16px;
  }

  .support-empty p {
    max-width: 500px;
    margin: 7px auto 0;
    color: #7a8597;
    font-size: 12px;
    line-height: 1.6;
  }

  .support-permission {
    margin-top: 18px;
    padding: 15px 17px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 14px;
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }

  .support-permission-icon {
    font-size: 18px;
  }

  .support-permission strong {
    display: block;
    color: #344054;
    font-size: 12px;
  }

  .support-permission p {
    margin: 3px 0 8px;
    color: #7a8597;
    font-size: 10px;
  }

  .support-permission-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .support-permission-tags span {
    padding: 4px 7px;
    border-radius: 6px;
    background: #edf9f0;
    color: #15803d;
    font-size: 9px;
    font-weight: 700;
  }

  .support-denied {
    min-height: 100vh;
    background: #f6f8fb;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .support-denied-card {
    width: min(480px, 100%);
    padding: 36px 28px;
    background: #ffffff;
    border: 1px solid #e4e9ef;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
  }

  .support-denied-icon {
    font-size: 38px;
  }

  .support-denied-eyebrow {
    display: block;
    margin-top: 12px;
    color: #0f766e;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .support-denied-card h1 {
    margin: 7px 0 0;
    font-size: 23px;
  }

  .support-denied-card p {
    margin: 10px 0 22px;
    color: #697586;
    font-size: 13px;
    line-height: 1.65;
  }

  .support-back-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 18px;
    border-radius: 11px;
    background: #0f766e;
    color: #ffffff;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
  }

  @media (max-width: 1100px) {
    .support-stats {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 850px) {
    .support-source-summary {
      grid-template-columns: 1fr;
    }

    .support-toolbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .support-toolbar-actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 760px) {
    .support-header {
      padding: 22px 18px;
      align-items: flex-start;
      flex-direction: column;
    }

    .support-agent-box {
      width: 100%;
      box-sizing: border-box;
    }

    .support-toolbar,
    .support-section,
    .support-stats,
    .support-source-summary,
    .support-permission {
      width: calc(100% - 28px);
    }

    .support-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .support-case {
      align-items: flex-start;
      flex-direction: column;
    }

    .support-case-action {
      width: 100%;
    }

    .support-open-button {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }

  @media (max-width: 480px) {
    .support-stats {
      grid-template-columns: 1fr;
    }

    .support-title h1 {
      font-size: 25px;
    }
  }
`;