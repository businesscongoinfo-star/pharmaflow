import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAgent } from "@/app/lib/agent/auth";


/* ==========================================================================
   TYPES
   ========================================================================== */

type AgentRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

type AgentPageParams = {
  role: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  permission?: string;
  status?: "active" | "coming";
};

type RoleConfiguration = {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  description: string;
  mission: string;
  tasks: Task[];
};


/* ==========================================================================
   RÔLES AUTORISÉS
   ========================================================================== */

const VALID_ROLES: AgentRole[] = [
  "support",
  "finance",
  "technical",
  "operations",
  "analyst",
  "security",
];


/* ==========================================================================
   CONFIGURATION DES RÔLES
   ========================================================================== */

const ROLE_CONFIG: Record<
  AgentRole,
  RoleConfiguration
> = {

  /* ------------------------------------------------------------------------
     SUPPORT
     ------------------------------------------------------------------------ */

  support: {
    label: "Support client",
    shortLabel: "Support",
    icon: "🎧",
    color: "blue",

    description:
      "Accompagner les pharmacies et les utilisateurs de PharmaFlow dans leurs demandes.",

    mission:
      "Traiter les demandes clients, suivre les tickets, répondre aux utilisateurs et assurer le suivi des incidents.",

    tasks: [
      {
        id: "support-tickets",
        title: "Tickets support",
        description:
          "Consulter, prendre en charge et suivre les demandes des clients.",
        icon: "🎫",
        href: "/agent/support",
        permission: "support.tickets",
        status: "active",
      },
      {
        id: "support-dashboard",
        title: "Centre support",
        description:
          "Accéder à la supervision générale du support PharmaFlow.",
        icon: "💬",
        href: "/agent",
        permission: "support.dashboard",
        status: "active",
      },
    ],
  },


  /* ------------------------------------------------------------------------
     FINANCE
     ------------------------------------------------------------------------ */

  finance: {
    label: "Finance",
    shortLabel: "Finance",
    icon: "💰",
    color: "emerald",

    description:
      "Superviser les abonnements, paiements et transactions financières de PharmaFlow.",

    mission:
      "Contrôler les paiements, suivre les abonnements, identifier les transactions problématiques et assurer la supervision financière.",

    tasks: [
      {
        id: "payments",
        title: "Centre des paiements",
        description:
          "Superviser les transactions de paiement enregistrées sur PharmaFlow.",
        icon: "💳",
        href: "/agent/paiements",
        permission: "finance.payments",
        status: "active",
      },
      {
        id: "subscriptions",
        title: "Abonnements",
        description:
          "Consulter et superviser les abonnements des pharmacies.",
        icon: "📋",
        href: "/agent/abonnements",
        permission: "finance.subscriptions",
        status: "active",
      },
      {
        id: "finance-dashboard",
        title: "Supervision financière",
        description:
          "Accéder au centre de supervision financière.",
        icon: "📊",
        href: "/agent",
        permission: "finance.dashboard",
        status: "active",
      },
    ],
  },


  /* ------------------------------------------------------------------------
     TECHNIQUE
     ------------------------------------------------------------------------ */

  technical: {
    label: "Technique",
    shortLabel: "Technique",
    icon: "🛠️",
    color: "violet",

    description:
      "Gérer les incidents techniques, les problèmes de plateforme et les interventions techniques.",

    mission:
      "Diagnostiquer les problèmes techniques, suivre les incidents, contrôler les services et intervenir lorsque la plateforme rencontre un problème.",

    tasks: [
      {
        id: "technical-dashboard",
        title: "Centre technique",
        description:
          "Accéder au centre de supervision technique de PharmaFlow.",
        icon: "🛠️",
        href: "/agent/technique",
        permission: "technical.dashboard",
        status: "active",
      },
      {
        id: "technical-support",
        title: "Incidents techniques",
        description:
          "Consulter les demandes qui nécessitent une intervention technique.",
        icon: "🚨",
        href: "/agent/support",
        permission: "technical.incidents",
        status: "active",
      },
      {
        id: "technical-monitoring",
        title: "Surveillance plateforme",
        description:
          "Accéder aux outils de supervision disponibles pour l'équipe technique.",
        icon: "🖥️",
        href: "/agent",
        permission: "technical.monitoring",
        status: "active",
      },
    ],
  },


  /* ------------------------------------------------------------------------
     OPERATIONS
     ------------------------------------------------------------------------ */

  operations: {
    label: "Opérations",
    shortLabel: "Opérations",
    icon: "⚙️",
    color: "amber",

    description:
      "Superviser les opérations quotidiennes de la plateforme et coordonner les activités.",

    mission:
      "Suivre les opérations, contrôler les activités quotidiennes et assurer la continuité des processus PharmaFlow.",

    tasks: [
      {
        id: "operations-dashboard",
        title: "Centre des opérations",
        description:
          "Accéder à la supervision opérationnelle de PharmaFlow.",
        icon: "⚙️",
        href: "/agent",
        permission: "operations.dashboard",
        status: "active",
      },
      {
        id: "operations-subscriptions",
        title: "Suivi des abonnements",
        description:
          "Consulter l'état des abonnements et des comptes pharmacies.",
        icon: "📋",
        href: "/agent/abonnements",
        permission: "operations.subscriptions",
        status: "active",
      },
    ],
  },


  /* ------------------------------------------------------------------------
     ANALYST
     ------------------------------------------------------------------------ */

  analyst: {
    label: "Analyste",
    shortLabel: "Analyste",
    icon: "📊",
    color: "cyan",

    description:
      "Analyser les données opérationnelles et financières de PharmaFlow.",

    mission:
      "Produire des analyses, suivre les indicateurs et identifier les tendances importantes de la plateforme.",

    tasks: [
      {
        id: "analyst-dashboard",
        title: "Tableau analytique",
        description:
          "Accéder aux informations disponibles pour l'analyse de la plateforme.",
        icon: "📊",
        href: "/agent",
        permission: "analyst.dashboard",
        status: "active",
      },
      {
        id: "analyst-payments",
        title: "Analyse des paiements",
        description:
          "Consulter les transactions afin d'effectuer les analyses financières.",
        icon: "💳",
        href: "/agent/paiements",
        permission: "analyst.payments",
        status: "active",
      },
      {
        id: "analyst-subscriptions",
        title: "Analyse des abonnements",
        description:
          "Analyser l'activité des abonnements PharmaFlow.",
        icon: "📈",
        href: "/agent/abonnements",
        permission: "analyst.subscriptions",
        status: "active",
      },
    ],
  },


  /* ------------------------------------------------------------------------
     SECURITY
     ------------------------------------------------------------------------ */

  security: {
    label: "Sécurité",
    shortLabel: "Sécurité",
    icon: "🔐",
    color: "red",

    description:
      "Superviser les accès, les événements de sécurité et les incidents sensibles.",

    mission:
      "Contrôler les accès de la plateforme, surveiller les événements sensibles et participer à la protection de PharmaFlow.",

    tasks: [
      {
        id: "security-dashboard",
        title: "Centre de sécurité",
        description:
          "Accéder aux outils de supervision de sécurité.",
        icon: "🔐",
        href: "/agent",
        permission: "security.dashboard",
        status: "active",
      },
      {
        id: "security-incidents",
        title: "Incidents",
        description:
          "Consulter les demandes nécessitant une attention de sécurité.",
        icon: "🚨",
        href: "/agent/support",
        permission: "security.incidents",
        status: "active",
      },
    ],
  },
};


/* ==========================================================================
   COULEURS UI
   ========================================================================== */

function getRoleStyles(
  role: AgentRole,
) {
  switch (role) {
    case "support":
      return {
        badge:
          "border-blue-200 bg-blue-50 text-blue-700",
        icon:
          "bg-blue-50 text-blue-700 ring-blue-100",
        accent:
          "from-blue-600 to-cyan-500",
      };

    case "finance":
      return {
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon:
          "bg-emerald-50 text-emerald-700 ring-emerald-100",
        accent:
          "from-emerald-600 to-teal-500",
      };

    case "technical":
      return {
        badge:
          "border-violet-200 bg-violet-50 text-violet-700",
        icon:
          "bg-violet-50 text-violet-700 ring-violet-100",
        accent:
          "from-violet-600 to-indigo-500",
      };

    case "operations":
      return {
        badge:
          "border-amber-200 bg-amber-50 text-amber-700",
        icon:
          "bg-amber-50 text-amber-700 ring-amber-100",
        accent:
          "from-amber-500 to-orange-500",
      };

    case "analyst":
      return {
        badge:
          "border-cyan-200 bg-cyan-50 text-cyan-700",
        icon:
          "bg-cyan-50 text-cyan-700 ring-cyan-100",
        accent:
          "from-cyan-600 to-blue-500",
      };

    case "security":
      return {
        badge:
          "border-red-200 bg-red-50 text-red-700",
        icon:
          "bg-red-50 text-red-700 ring-red-100",
        accent:
          "from-red-600 to-rose-500",
      };

    default:
      return {
        badge:
          "border-slate-200 bg-slate-50 text-slate-700",
        icon:
          "bg-slate-50 text-slate-700 ring-slate-100",
        accent:
          "from-slate-600 to-slate-500",
      };
  }
}


/* ==========================================================================
   PERMISSION
   ========================================================================== */

function hasPermission(
  member: any,
  permission?: string,
): boolean {

  /*
   * Une tâche sans permission spécifique
   * reste accessible au rôle autorisé.
   */

  if (!permission) {
    return true;
  }

  /*
   * Les permissions peuvent être enregistrées
   * sous forme de tableau.
   */

  if (
    Array.isArray(member?.permissions)
  ) {
    return (
      member.permissions.includes("*") ||
      member.permissions.includes(permission)
    );
  }

  /*
   * Certaines configurations peuvent stocker
   * les permissions sous forme d'objet.
   */

  if (
    member?.permissions &&
    typeof member.permissions === "object"
  ) {
    return Boolean(
      member.permissions[permission] ||
      member.permissions["*"],
    );
  }

  /*
   * Si aucune liste de permissions n'est fournie,
   * on laisse le rôle contrôler l'accès.
   */

  return true;
}


/* ==========================================================================
   PAGE
   ========================================================================== */

export default async function AgentRolePage({
  params,
}: {
  params: Promise<AgentPageParams>;
}) {

  /* ------------------------------------------------------------------------
     AUTHENTIFICATION
     ------------------------------------------------------------------------ */

  const member = await requireAgent();

  const resolvedParams =
    await params;

  const requestedRole =
    resolvedParams.role
      .trim()
      .toLowerCase();


  /* ------------------------------------------------------------------------
     VALIDATION ROUTE
     ------------------------------------------------------------------------ */

  if (
    !VALID_ROLES.includes(
      requestedRole as AgentRole,
    )
  ) {
    notFound();
  }

  const role =
    requestedRole as AgentRole;

  const configuration =
    ROLE_CONFIG[role];


  /* ------------------------------------------------------------------------
     VÉRIFICATION DU RÔLE DE L'AGENT
     ------------------------------------------------------------------------ */

  const memberRole =
    String(
      member?.role ?? "",
    )
      .trim()
      .toLowerCase();


  /*
   * Un Super Admin peut consulter les espaces.
   *
   * Pour un agent normal, la route demandée doit
   * correspondre à son rôle.
   */

  const isSuperAdmin =
    memberRole === "super_admin" ||
    memberRole === "superadmin" ||
    memberRole === "admin";

  if (
    memberRole !== role &&
    !isSuperAdmin
  ) {
    return (
      <main className="agent-payments-page">
        <div className="agent-payments-container">

          <section className="agent-payments-table-card">

            <div className="p-6 sm:p-8 lg:p-10">

              <div className="mx-auto max-w-2xl text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl ring-1 ring-red-100">
                  🔐
                </div>

                <div className="mt-5">

                  <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-red-700">
                    Accès refusé
                  </span>

                  <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
                    Espace non autorisé
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Votre rôle actuel ne vous permet
                    pas d'accéder à cet espace.
                  </p>

                </div>

                <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">

                  <Link
                    href="/agent"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
                  >
                    ← Retour à mon espace
                  </Link>

                </div>

              </div>

            </div>

          </section>

        </div>
      </main>
    );
  }


  /* ------------------------------------------------------------------------
     TÂCHES AUTORISÉES
     ------------------------------------------------------------------------ */

  const accessibleTasks =
    configuration.tasks.filter(
      (task) =>
        hasPermission(
          member,
          task.permission,
        ),
    );


  /* ------------------------------------------------------------------------
     STYLES
     ------------------------------------------------------------------------ */

  const styles =
    getRoleStyles(role);


  /* ------------------------------------------------------------------------
     RENDU
     ------------------------------------------------------------------------ */

  return (
    <main className="agent-payments-page">

      <div className="agent-payments-container">

        {/* ================================================================
            HEADER
        ================================================================= */}

        <section className="agent-payments-header">

          <div className="agent-payments-header-content">

            <div className="agent-payments-eyebrow">

              <span />

              ESPACE ÉQUIPE PHARMAFLOW

            </div>


            <div className="flex items-start gap-4">

              <div
                className={[
                  "hidden h-16 w-16 shrink-0 items-center justify-center",
                  "rounded-2xl text-2xl ring-1 sm:flex",
                  styles.icon,
                ].join(" ")}
              >
                {configuration.icon}
              </div>


              <div className="min-w-0">

                <div className="mb-2 flex flex-wrap items-center gap-2">

                  <span
                    className={[
                      "inline-flex items-center rounded-full border",
                      "px-2.5 py-1 text-[10px] font-bold",
                      "uppercase tracking-[0.1em]",
                      styles.badge,
                    ].join(" ")}
                  >
                    {configuration.shortLabel}
                  </span>

                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                    Agent PharmaFlow
                  </span>

                </div>


                <h1 className="agent-payments-title">
                  {configuration.icon}{" "}
                  {configuration.label}
                </h1>


                <p className="agent-payments-description">
                  {configuration.description}
                </p>


                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">

                  <Link
                    href="/agent"
                    className="font-semibold text-slate-500 transition hover:text-teal-700"
                  >
                    Espace agent
                  </Link>

                  <span className="text-slate-300">
                    /
                  </span>

                  <span className="font-semibold text-slate-700">
                    {configuration.shortLabel}
                  </span>

                </div>


                <div className="mt-3 break-all text-[11px] text-slate-400">

                  Compte :{" "}

                  <span className="font-semibold text-slate-500">
                    {member.email ??
                      member.id}
                  </span>

                </div>

              </div>

            </div>

          </div>


          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">

            <Link
              href="/agent"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 sm:flex-none"
            >
              ← Tableau agent
            </Link>

          </div>

        </section>


        {/* ================================================================
            MISSION
        ================================================================= */}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-start gap-4">

            <div
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center",
                "rounded-xl text-lg ring-1",
                styles.icon,
              ].join(" ")}
            >
              🎯
            </div>


            <div className="min-w-0">

              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                Mission du rôle
              </p>

              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                {configuration.mission}
              </p>

            </div>

          </div>

        </section>


        {/* ================================================================
            STATISTIQUES
        ================================================================= */}

        <section className="agent-payments-stats">

          <div className="agent-payment-stat">

            <div className="agent-payment-stat-label">
              Rôle
            </div>

            <div className="agent-payment-stat-value text-[22px] sm:text-[27px]">
              {configuration.shortLabel}
            </div>

            <div className="agent-payment-stat-meta">
              Fonction attribuée au compte
            </div>

          </div>


          <div className="agent-payment-stat">

            <div className="agent-payment-stat-label">
              Tâches disponibles
            </div>

            <div className="agent-payment-stat-value">
              {accessibleTasks.length}
            </div>

            <div className="agent-payment-stat-meta">
              Selon vos permissions
            </div>

          </div>


          <div className="agent-payment-stat">

            <div className="agent-payment-stat-label">
              Accès
            </div>

            <div className="agent-payment-stat-value text-emerald-600">
              Actif
            </div>

            <div className="agent-payment-stat-meta">
              Session agent autorisée
            </div>

          </div>


          <div className="agent-payment-stat">

            <div className="agent-payment-stat-label">
              Sécurité
            </div>

            <div className="agent-payment-stat-value text-teal-700">
              Contrôlé
            </div>

            <div className="agent-payment-stat-meta">
              Accès basé sur le rôle
            </div>

          </div>

        </section>


        {/* ================================================================
            TÂCHES
        ================================================================= */}

        <section className="agent-payments-table-card">

          <div className="agent-payments-table-header">

            <div>

              <div className="flex items-center gap-3">

                <div
                  className={[
                    "flex h-10 w-10 items-center justify-center",
                    "rounded-xl text-lg ring-1",
                    styles.icon,
                  ].join(" ")}
                >
                  📋
                </div>

                <div>

                  <h2 className="agent-payments-table-title">
                    Mes tâches
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Modules et outils disponibles
                    pour votre rôle.
                  </p>

                </div>

              </div>

            </div>


            <div className="agent-payments-table-count">
              {accessibleTasks.length} accès
            </div>

          </div>


          {accessibleTasks.length === 0 ? (

            <div className="agent-payments-empty">

              <div className="agent-payments-empty-icon">
                🔒
              </div>

              <h3 className="agent-payments-empty-title">
                Aucune tâche disponible
              </h3>

              <p className="agent-payments-empty-description">
                Votre compte ne possède actuellement
                aucune permission correspondant aux
                outils de ce rôle.
              </p>

              <Link
                href="/agent"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
              >
                Retour à l'espace agent
              </Link>

            </div>

          ) : (

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 lg:p-6">

              {accessibleTasks.map(
                (task) => {

                  const isCurrentPage =
                    task.href ===
                    `/agent/${role}`;

                  return (
                    <Link
                      key={task.id}
                      href={task.href}
                      className={[
                        "group relative overflow-hidden",
                        "rounded-2xl border border-slate-200",
                        "bg-white p-5",
                        "shadow-sm",
                        "transition-all duration-200",
                        "hover:-translate-y-1",
                        "hover:border-teal-200",
                        "hover:shadow-lg",
                      ].join(" ")}
                    >

                      <div
                        className={[
                          "absolute left-0 top-0 h-1 w-full",
                          "bg-gradient-to-r",
                          styles.accent,
                        ].join(" ")}
                      />


                      <div className="flex items-start justify-between gap-4">

                        <div
                          className={[
                            "flex h-12 w-12 shrink-0",
                            "items-center justify-center",
                            "rounded-xl text-xl ring-1",
                            styles.icon,
                          ].join(" ")}
                        >
                          {task.icon}
                        </div>


                        <span
                          className={[
                            "rounded-full px-2 py-1",
                            "text-[9px] font-extrabold",
                            isCurrentPage
                              ? "bg-teal-50 text-teal-700"
                              : "bg-slate-50 text-slate-500",
                          ].join(" ")}
                        >
                          {isCurrentPage
                            ? "ACTUEL"
                            : "OUVRIR"}
                        </span>

                      </div>


                      <h3 className="mt-5 text-sm font-extrabold text-slate-900">
                        {task.title}
                      </h3>


                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {task.description}
                      </p>


                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

                        <span className="text-[10px] font-semibold text-emerald-600">
                          ✓ Accès autorisé
                        </span>

                        <span className="text-sm font-bold text-slate-400 transition group-hover:translate-x-1 group-hover:text-teal-600">
                          →
                        </span>

                      </div>

                    </Link>
                  );
                },
              )}

            </div>

          )}

        </section>


        {/* ================================================================
            SÉCURITÉ
        ================================================================= */}

        <section className="agent-payments-info">

          <div className="agent-payments-info-icon">
            🔐
          </div>

          <div className="min-w-0">

            <strong className="font-bold text-slate-700">
              Contrôle des accès
            </strong>

            <div className="mt-1">

              Les modules affichés sont déterminés
              par le rôle de l'agent et par les
              permissions associées à son compte.
              Un agent ne peut pas ouvrir directement
              l'espace d'un autre rôle.

            </div>

          </div>

        </section>


        {/* ================================================================
            FOOTER
        ================================================================= */}

        <footer className="px-1 py-6 text-center">

          <p className="text-[10px] font-medium text-slate-400 sm:text-xs">
            PharmaFlow Africa · Espace équipe ·{" "}
            {configuration.label}
          </p>

        </footer>

      </div>

    </main>
  );
}