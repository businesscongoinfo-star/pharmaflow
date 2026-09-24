import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAgent } from "@/app/lib/agent/auth";
import { createAdminClient } from "@/app/lib/supabase/admin";

/* ============================================================
   PHARMAFLOW — ESPACE AGENT TECHNIQUE
   ============================================================

   Cette page :

   - authentifie l'agent avec requireAgent()
   - identifie son vrai rôle
   - autorise le rôle technique
   - permet au Super Admin / Admin d'y accéder
   - récupère les tickets réels depuis Supabase
   - affiche les tickets assignés à l'agent
   - utilise les classes CSS globales pf-agent-*
   - ne dépend d'aucune nouvelle table
   - ne dépend d'aucune nouvelle variable d'environnement
   - ne modifie pas le middleware
============================================================ */

/* ============================================================
   TYPES
============================================================ */

type AgentRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

type AgentMember = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
  role?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
  status?: string | null;
  permissions?: unknown;
};

type SupportTicket = {
  id: string;
  ticket_number: string;
  customer_name: string | null;
  customer_email: string | null;
  category: string | null;
  subject: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

/* ============================================================
   RÔLES
============================================================ */

function normalizeRole(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function resolveRole(
  value: unknown,
): AgentRole | null {
  switch (normalizeRole(value)) {
    case "support":
    case "supportagent":
      return "support";

    case "finance":
    case "financier":
    case "financeagent":
      return "finance";

    case "technical":
    case "technique":
    case "technicien":
    case "technicalagent":
      return "technical";

    case "operations":
    case "operation":
    case "operationsagent":
      return "operations";

    case "analyst":
    case "analyste":
    case "analystagent":
      return "analyst";

    case "security":
    case "securite":
    case "securityagent":
      return "security";

    default:
      return null;
  }
}

function isAdministrator(
  value: unknown,
): boolean {
  return [
    "superadmin",
    "superadministrateur",
    "administrator",
    "admin",
  ].includes(
    normalizeRole(value),
  );
}

function getRoleLabel(
  role: AgentRole | null,
): string {
  switch (role) {
    case "support":
      return "Support";

    case "finance":
      return "Finance";

    case "technical":
      return "Technique";

    case "operations":
      return "Opérations";

    case "analyst":
      return "Analyste";

    case "security":
      return "Sécurité";

    default:
      return "Agent";
  }
}

function getRoleIcon(
  role: AgentRole | null,
): string {
  switch (role) {
    case "support":
      return "🎧";

    case "finance":
      return "💳";

    case "technical":
      return "🛠️";

    case "operations":
      return "⚙️";

    case "analyst":
      return "📊";

    case "security":
      return "🔐";

    default:
      return "👤";
  }
}

function getRoleDescription(
  role: AgentRole | null,
): string {
  switch (role) {
    case "technical":
      return (
        "Diagnostic technique, traitement des incidents, " +
        "tickets et accompagnement technique."
      );

    case "support":
      return (
        "Assistance aux pharmacies, traitement des demandes " +
        "et suivi des tickets."
      );

    case "finance":
      return (
        "Suivi des paiements, abonnements, transactions " +
        "et opérations financières."
      );

    case "operations":
      return (
        "Supervision des opérations et coordination " +
        "des activités de la plateforme."
      );

    case "analyst":
      return (
        "Analyse des données, activité de la plateforme " +
        "et indicateurs opérationnels."
      );

    case "security":
      return (
        "Surveillance des accès, sécurité des comptes " +
        "et incidents de sécurité."
      );

    default:
      return "Espace de travail PharmaFlow.";
  }
}

/* ============================================================
   IDENTITÉ
============================================================ */

function getAgentName(
  agent: AgentMember,
): string {
  return (
    agent.full_name?.trim() ||
    agent.name?.trim() ||
    agent.email
      ?.split("@")[0]
      ?.trim() ||
    "Agent PharmaFlow"
  );
}

function getInitials(
  name: string,
): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "PF";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

/* ============================================================
   STATUTS DES TICKETS
============================================================ */

function normalizeStatus(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function getStatusLabel(
  status: string,
): string {
  const value =
    normalizeStatus(status);

  if (
    ["open", "opened", "new"].includes(
      value,
    )
  ) {
    return "Ouvert";
  }

  if (
    [
      "inprogress",
      "processing",
      "assigned",
    ].includes(value)
  ) {
    return "En traitement";
  }

  if (value === "pending") {
    return "En attente";
  }

  if (
    [
      "resolved",
      "completed",
      "done",
    ].includes(value)
  ) {
    return "Résolu";
  }

  if (value === "closed") {
    return "Fermé";
  }

  return status || "Inconnu";
}

function getPriorityLabel(
  priority: string,
): string {
  switch (
    normalizeStatus(priority)
  ) {
    case "critical":
    case "urgent":
      return "Critique";

    case "high":
      return "Élevée";

    case "normal":
    case "medium":
      return "Normale";

    case "low":
      return "Faible";

    default:
      return priority || "Normale";
  }
}

/* ============================================================
   CLASSES VISUELLES
============================================================ */

function getStatusClass(
  status: string,
): string {
  switch (
    normalizeStatus(status)
  ) {
    case "open":
    case "opened":
    case "new":
      return "pf-agent-status-open";

    case "pending":
      return "pf-agent-status-pending";

    case "inprogress":
    case "processing":
    case "assigned":
      return "pf-agent-status-inprogress";

    case "resolved":
    case "completed":
    case "done":
      return "pf-agent-status-resolved";

    case "closed":
      return "pf-agent-status-closed";

    default:
      return "";
  }
}

function getPriorityClass(
  priority: string,
): string {
  switch (
    normalizeStatus(priority)
  ) {
    case "critical":
    case "urgent":
      return "pf-agent-priority-critical";

    case "high":
      return "pf-agent-priority-high";

    case "normal":
    case "medium":
      return "pf-agent-priority-normal";

    case "low":
      return "pf-agent-priority-low";

    default:
      return "pf-agent-priority-normal";
  }
}

/* ============================================================
   PAGE
============================================================ */

export default async function AgentTechniquePage() {
  /* ----------------------------------------------------------
     1. AUTHENTIFICATION
     ---------------------------------------------------------- */

  const authenticatedAgent =
    await requireAgent();

  const member =
    authenticatedAgent as AgentMember;

  /* ----------------------------------------------------------
     2. IDENTIFICATION DU RÔLE RÉEL
     ---------------------------------------------------------- */

  const resolvedRole =
    resolveRole(member.role);

  const administrator =
    isAdministrator(member.role);

  /*
   * Cette page est destinée au rôle technique.
   *
   * Le Super Admin / Admin peut également y accéder.
   */
  if (
    !administrator &&
    resolvedRole !== "technical"
  ) {
    redirect("/agent");
  }

  /*
   * Pour un administrateur, l'espace affiché
   * reste explicitement l'espace technique.
   */
  const displayRole: AgentRole =
    administrator
      ? "technical"
      : resolvedRole ?? "technical";

  /* ----------------------------------------------------------
     3. IDENTITÉ
     ---------------------------------------------------------- */

  const agentName =
    getAgentName(member);

  const initials =
    getInitials(agentName);

  const roleLabel =
    administrator
      ? "Administrateur"
      : getRoleLabel(
          displayRole,
        );

  const roleIcon =
    getRoleIcon(displayRole);

  const roleDescription =
    getRoleDescription(
      displayRole,
    );

  /* ----------------------------------------------------------
     4. SUPABASE ADMIN
     ---------------------------------------------------------- */

  const supabase =
    createAdminClient();

  /* ----------------------------------------------------------
     5. DONNÉES RÉELLES
     ---------------------------------------------------------- */

  const [
    totalResult,
    openResult,
    assignedResult,
    recentResult,
  ] = await Promise.all([
    /*
     * Nombre total de tickets.
     */
    supabase
      .from("support_tickets")
      .select("id", {
        count: "exact",
        head: true,
      }),

    /*
     * Tickets nécessitant encore une action.
     */
    supabase
      .from("support_tickets")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("status", [
        "open",
        "opened",
        "new",
        "pending",
        "in_progress",
        "in-progress",
        "assigned",
      ]),

    /*
     * Tickets assignés à l'agent actuellement connecté.
     */
    supabase
      .from("support_tickets")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "assigned_to",
        member.id,
      )
      .in("status", [
        "open",
        "opened",
        "new",
        "pending",
        "in_progress",
        "in-progress",
        "assigned",
      ]),

    /*
     * Tickets récents.
     */
    supabase
      .from("support_tickets")
      .select(
        `
          id,
          ticket_number,
          customer_name,
          customer_email,
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
      .order(
        "last_message_at",
        {
          ascending: false,
          nullsFirst: false,
        },
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(8),
  ]);

  /* ----------------------------------------------------------
     6. VALEURS KPI
     ---------------------------------------------------------- */

  const totalTickets =
    totalResult.count ?? 0;

  const openTickets =
    openResult.count ?? 0;

  const assignedTickets =
    assignedResult.count ?? 0;

  const recentTickets =
    (recentResult.data ??
      []) as SupportTicket[];

  /*
   * Une erreur de lecture des tickets ne doit pas
   * empêcher l'agent de voir son espace.
   */
  const databaseWarning =
    totalResult.error?.message ||
    openResult.error?.message ||
    assignedResult.error?.message ||
    recentResult.error?.message ||
    null;

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <main className="pf-agent-page">

      <div className="pf-agent-shell">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="pf-agent-header">

          <div className="pf-agent-header-left">

            <Link
              href="/agent"
              className="pf-agent-back"
              aria-label="Retour à l'espace agent"
            >
              ←
            </Link>

            <div className="pf-agent-brand">

              <span className="pf-agent-brand-mark">
                PF
              </span>

              <div>
                <strong>
                  PharmaFlow
                </strong>

                <span>
                  Équipe plateforme
                </span>
              </div>

            </div>

          </div>

          <div className="pf-agent-header-right">

            <span className="pf-agent-online">
              <i />
              Connecté
            </span>

            <div className="pf-agent-user-mini">

              <span className="pf-agent-avatar-small">
                {initials}
              </span>

              <div>

                <strong>
                  {agentName}
                </strong>

                <span>
                  {roleLabel}
                </span>

              </div>

            </div>

          </div>

        </header>

        {/* ====================================================
            CONTENU
        ==================================================== */}

        <div className="pf-agent-content">

          {/* ==================================================
              BREADCRUMB
          ================================================== */}

          <nav
            className="pf-agent-breadcrumb"
            aria-label="Fil d'Ariane"
          >

            <Link href="/agent">
              Espace agent
            </Link>

            <span>
              /
            </span>

            <strong>
              Technique
            </strong>

          </nav>

          {/* ==================================================
              HERO
          ================================================== */}

          <section className="pf-agent-hero">

            <div className="pf-agent-hero-content">

              <span className="pf-agent-eyebrow">
                {roleIcon}
                {" "}
                ESPACE TECHNIQUE
              </span>

              <h1>
                Bonjour {agentName} 👋
              </h1>

              <p>
                {roleDescription}
              </p>

              <div className="pf-agent-hero-meta">

                <span>
                  <i />
                  Compte actif
                </span>

                <span>
                  Rôle :
                  {" "}
                  <strong>
                    {roleLabel}
                  </strong>
                </span>

                {member.email && (
                  <span>
                    {member.email}
                  </span>
                )}

              </div>

            </div>

            <div className="pf-agent-hero-role">

              <div className="pf-agent-role-icon">
                {roleIcon}
              </div>

              <div>

                <span>
                  VOTRE ESPACE
                </span>

                <strong>
                  Technique
                </strong>

                <small>
                  Accès autorisé
                </small>

              </div>

            </div>

          </section>

          {/* ==================================================
              KPI
          ================================================== */}

          <section className="pf-agent-kpi-grid">

            <article className="pf-agent-kpi-card">

              <div className="pf-agent-kpi-icon">
                🎫
              </div>

              <div>

                <span>
                  Tickets
                </span>

                <strong>
                  {totalTickets}
                </strong>

                <small>
                  total enregistrés
                </small>

              </div>

            </article>

            <article className="pf-agent-kpi-card pf-agent-kpi-warning">

              <div className="pf-agent-kpi-icon">
                🔥
              </div>

              <div>

                <span>
                  À traiter
                </span>

                <strong>
                  {openTickets}
                </strong>

                <small>
                  demandes ouvertes
                </small>

              </div>

            </article>

            <article className="pf-agent-kpi-card pf-agent-kpi-success">

              <div className="pf-agent-kpi-icon">
                👤
              </div>

              <div>

                <span>
                  Mes tickets
                </span>

                <strong>
                  {assignedTickets}
                </strong>

                <small>
                  assignés à mon compte
                </small>

              </div>

            </article>

            <article className="pf-agent-kpi-card pf-agent-kpi-info">

              <div className="pf-agent-kpi-icon">
                🛡️
              </div>

              <div>

                <span>
                  Autorisation
                </span>

                <strong>
                  {administrator
                    ? "ADMIN"
                    : "ACTIVE"}
                </strong>

                <small>
                  espace technique
                </small>

              </div>

            </article>

          </section>

          {/* ==================================================
              AVERTISSEMENT
          ================================================== */}

          {databaseWarning && (
            <div className="pf-agent-data-warning">

              <span>
                ⚠️
              </span>

              <div>

                <strong>
                  Données partiellement disponibles
                </strong>

                <p>
                  L'espace technique est accessible,
                  mais les données de tickets ne peuvent
                  pas toutes être chargées actuellement.
                </p>

              </div>

            </div>
          )}

          {/* ==================================================
              TÂCHES TECHNIQUES
          ================================================== */}

          <section className="pf-agent-section">

            <div className="pf-agent-section-heading">

              <div>

                <span>
                  ESPACE DE TRAVAIL
                </span>

                <h2>
                  Tâches techniques
                </h2>

                <p>
                  Accédez directement aux outils nécessaires
                  à votre travail.
                </p>

              </div>

              <div className="pf-agent-task-count">

                <strong>
                  4
                </strong>

                <span>
                  outils disponibles
                </span>

              </div>

            </div>

            <div className="pf-agent-task-grid">

              {/* TICKETS */}

              <Link
                href="/agent/support"
                className="pf-agent-task-card"
              >

                <div className="pf-agent-task-top">

                  <span className="pf-agent-task-icon">
                    🎫
                  </span>

                  <span className="pf-agent-task-arrow">
                    →
                  </span>

                </div>

                <h3>
                  Tickets techniques
                </h3>

                <p>
                  Consulter, analyser et prendre en charge
                  les demandes techniques.
                </p>

                <span className="pf-agent-task-action">
                  Ouvrir les tickets
                  <b>
                    →
                  </b>
                </span>

              </Link>

              {/* INCIDENTS */}

              <Link
                href="/agent/support"
                className="pf-agent-task-card"
              >

                <div className="pf-agent-task-top">

                  <span className="pf-agent-task-icon">
                    🚨
                  </span>

                  <span className="pf-agent-task-arrow">
                    →
                  </span>

                </div>

                <h3>
                  Incidents
                </h3>

                <p>
                  Suivre les incidents signalés par les
                  utilisateurs et intervenir rapidement.
                </p>

                <span className="pf-agent-task-action">
                  Voir les incidents
                  <b>
                    →
                  </b>
                </span>

              </Link>

              {/* DIAGNOSTIC */}

              <Link
                href="/agent/support"
                className="pf-agent-task-card"
              >

                <div className="pf-agent-task-top">

                  <span className="pf-agent-task-icon">
                    🔍
                  </span>

                  <span className="pf-agent-task-arrow">
                    →
                  </span>

                </div>

                <h3>
                  Diagnostic client
                </h3>

                <p>
                  Examiner les problèmes rencontrés par
                  les pharmacies et utilisateurs.
                </p>

                <span className="pf-agent-task-action">
                  Effectuer un diagnostic
                  <b>
                    →
                  </b>
                </span>

              </Link>

              {/* CENTRE */}

              <Link
                href="/agent"
                className="pf-agent-task-card"
              >

                <div className="pf-agent-task-top">

                  <span className="pf-agent-task-icon">
                    🛠️
                  </span>

                  <span className="pf-agent-task-arrow">
                    →
                  </span>

                </div>

                <h3>
                  Centre technique
                </h3>

                <p>
                  Revenir au centre agent pour accéder
                  aux autres outils autorisés.
                </p>

                <span className="pf-agent-task-action">
                  Ouvrir le centre
                  <b>
                    →
                  </b>
                </span>

              </Link>

            </div>

          </section>

          {/* ==================================================
              TICKETS RÉCENTS
          ================================================== */}

          <section className="pf-agent-section">

            <div className="pf-agent-section-heading">

              <div>

                <span>
                  DONNÉES RÉELLES
                </span>

                <h2>
                  Tickets récents
                </h2>

                <p>
                  Dernières demandes enregistrées dans
                  la plateforme PharmaFlow.
                </p>

              </div>

              <Link
                href="/agent/support"
                className="pf-agent-section-link"
              >
                Voir tous les tickets →
              </Link>

            </div>

            <div className="pf-agent-ticket-panel">

              {recentTickets.length === 0 ? (

                <div className="pf-agent-empty">

                  <span>
                    🎫
                  </span>

                  <strong>
                    Aucun ticket récent
                  </strong>

                  <p>
                    Aucun ticket support n'est actuellement
                    disponible.
                  </p>

                </div>

              ) : (

                <div className="pf-agent-ticket-list">

                  {recentTickets.map(
                    (ticket) => (
                      <Link
                        key={ticket.id}
                        href={
                          `/agent/support/ticket/${ticket.id}`
                        }
                        className="pf-agent-ticket-row"
                      >

                        <div className="pf-agent-ticket-number">

                          <span>
                            🎫
                          </span>

                          <div>

                            <strong>
                              {ticket.ticket_number}
                            </strong>

                            <small>
                              {ticket.customer_name ||
                                ticket.customer_email ||
                                "Client non renseigné"}
                            </small>

                          </div>

                        </div>

                        <div className="pf-agent-ticket-subject">

                          <strong>
                            {ticket.subject}
                          </strong>

                          <span>
                            {ticket.category ||
                              "Support"}
                          </span>

                        </div>

                        <span
                          className={
                            `pf-agent-status ` +
                            getStatusClass(
                              ticket.status,
                            )
                          }
                        >
                          {getStatusLabel(
                            ticket.status,
                          )}
                        </span>

                        <span
                          className={
                            `pf-agent-priority ` +
                            getPriorityClass(
                              ticket.priority,
                            )
                          }
                        >
                          {getPriorityLabel(
                            ticket.priority,
                          )}
                        </span>

                        <span className="pf-agent-ticket-arrow">
                          →
                        </span>

                      </Link>
                    ),
                  )}

                </div>

              )}

            </div>

          </section>

          {/* ==================================================
              INFORMATIONS COMPTE
          ================================================== */}

          <section className="pf-agent-account-grid">

            <article className="pf-agent-account-card">

              <div className="pf-agent-account-icon">
                👤
              </div>

              <div>

                <span>
                  IDENTITÉ
                </span>

                <strong>
                  {agentName}
                </strong>

                <small>
                  {member.email ||
                    "Adresse e-mail non renseignée"}
                </small>

              </div>

            </article>

            <article className="pf-agent-account-card">

              <div className="pf-agent-account-icon">
                🛡️
              </div>

              <div>

                <span>
                  RÔLE
                </span>

                <strong>
                  {roleLabel}
                </strong>

                <small>
                  Accès contrôlé par PharmaFlow
                </small>

              </div>

            </article>

            <article className="pf-agent-account-card">

              <div className="pf-agent-account-icon">
                🔒
              </div>

              <div>

                <span>
                  SÉCURITÉ
                </span>

                <strong>
                  Session sécurisée
                </strong>

                <small>
                  Compte équipe authentifié
                </small>

              </div>

            </article>

          </section>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <footer className="pf-agent-footer">

            <span>
              PharmaFlow Africa
            </span>

            <span>
              Espace équipe plateforme
            </span>

            <Link href="/agent">
              Retour à l'espace agent →
            </Link>

          </footer>

        </div>
      </div>
    </main>
  );
}