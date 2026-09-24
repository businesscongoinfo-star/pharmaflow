// ============================================================
// src/app/lib/agent/permissions.ts
// ============================================================
// PHARMAFLOW — SYSTÈME CENTRAL DES RÔLES ET PERMISSIONS AGENTS
// ============================================================

import "server-only";

/* ============================================================
   TYPES
============================================================ */

export type AgentRole =
  | "support"
  | "finance"
  | "technical"
  | "operations"
  | "analyst"
  | "security";

export type AgentPermission =
  | "callTickets"
  | "serveClients"
  | "completeTickets"
  | "viewClients"
  | "viewStatistics"
  | "viewPayments"
  | "managePayments"
  | "viewSubscriptions"
  | "manageSubscriptions"
  | "viewTechnical"
  | "manageTechnical"
  | "viewOperations"
  | "manageOperations"
  | "viewAnalytics"
  | "viewSecurity"
  | "manageSecurity";

export type AgentPermissions = Partial<
  Record<AgentPermission, boolean>
>;

/* ============================================================
   NORMALISATION
============================================================ */

export function normalizeAgentRole(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/* ============================================================
   RÉSOLUTION DU RÔLE
============================================================ */

export function resolveAgentRole(
  value: unknown,
): AgentRole | null {
  const role =
    normalizeAgentRole(value);

  switch (role) {
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

/* ============================================================
   ADMINISTRATEUR PLATEFORME
============================================================ */

export function isPlatformAdministrator(
  value: unknown,
): boolean {
  const role =
    normalizeAgentRole(value);

  return [
    "superadmin",
    "superadministrateur",
    "administrator",
    "admin",
  ].includes(role);
}

/* ============================================================
   PERMISSIONS
============================================================ */

export function parseAgentPermissions(
  value: unknown,
): AgentPermissions {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as AgentPermissions;
}

/* ============================================================
   PERMISSIONS PAR DÉFAUT DES RÔLES
============================================================ */

const ROLE_PERMISSIONS: Record<
  AgentRole,
  AgentPermission[]
> = {
  support: [
    "callTickets",
    "serveClients",
    "completeTickets",
    "viewClients",
    "viewStatistics",
  ],

  finance: [
    "viewPayments",
    "managePayments",
    "viewSubscriptions",
    "manageSubscriptions",
    "viewStatistics",
  ],

  technical: [
    "callTickets",
    "serveClients",
    "completeTickets",
    "viewClients",
    "viewTechnical",
    "manageTechnical",
    "viewStatistics",
  ],

  operations: [
    "callTickets",
    "serveClients",
    "completeTickets",
    "viewClients",
    "viewOperations",
    "manageOperations",
    "viewSubscriptions",
    "viewStatistics",
  ],

  analyst: [
    "viewClients",
    "viewPayments",
    "viewSubscriptions",
    "viewOperations",
    "viewAnalytics",
    "viewStatistics",
  ],

  security: [
    "viewClients",
    "viewSecurity",
    "manageSecurity",
    "viewStatistics",
  ],
};

/* ============================================================
   VÉRIFICATION D'UNE PERMISSION
============================================================ */

export function agentCan(
  roleValue: unknown,
  permissionsValue: unknown,
  permission: AgentPermission,
): boolean {
  if (
    isPlatformAdministrator(
      roleValue,
    )
  ) {
    return true;
  }

  const role =
    resolveAgentRole(
      roleValue,
    );

  if (!role) {
    return false;
  }

  const permissions =
    parseAgentPermissions(
      permissionsValue,
    );

  /*
   * Une permission explicitement enregistrée
   * dans la base est prioritaire.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      permissions,
      permission,
    )
  ) {
    return (
      permissions[permission] === true
    );
  }

  /*
   * Sinon on utilise les permissions
   * prévues pour le rôle.
   */
  return ROLE_PERMISSIONS[
    role
  ].includes(permission);
}

/* ============================================================
   ESPACES AGENTS
============================================================ */

export type AgentArea =
  | "dashboard"
  | "support"
  | "technical"
  | "finance"
  | "payments"
  | "subscriptions"
  | "operations"
  | "analytics"
  | "security";

/* ============================================================
   ACCÈS AUX ESPACES
============================================================ */

export function canAccessAgentArea(
  roleValue: unknown,
  permissionsValue: unknown,
  area: AgentArea,
): boolean {
  if (
    isPlatformAdministrator(
      roleValue,
    )
  ) {
    return true;
  }

  const role =
    resolveAgentRole(
      roleValue,
    );

  if (!role) {
    return false;
  }

  switch (area) {
    case "dashboard":
      return true;

    /* --------------------------------------------------------
       SUPPORT
    -------------------------------------------------------- */

    case "support":
      return (
        role === "support" ||
        role === "technical" ||
        role === "operations" ||
        agentCan(
          role,
          permissionsValue,
          "callTickets",
        )
      );

    /* --------------------------------------------------------
       TECHNIQUE
    -------------------------------------------------------- */

    case "technical":
      return (
        role === "technical" ||
        agentCan(
          role,
          permissionsValue,
          "viewTechnical",
        )
      );

    /* --------------------------------------------------------
       FINANCE
    -------------------------------------------------------- */

    case "finance":
    case "payments":
      return (
        role === "finance" ||
        agentCan(
          role,
          permissionsValue,
          "viewPayments",
        )
      );

    /* --------------------------------------------------------
       ABONNEMENTS
    -------------------------------------------------------- */

    case "subscriptions":
      return (
        role === "finance" ||
        role === "operations" ||
        agentCan(
          role,
          permissionsValue,
          "viewSubscriptions",
        )
      );

    /* --------------------------------------------------------
       OPÉRATIONS
    -------------------------------------------------------- */

    case "operations":
      return (
        role === "operations" ||
        agentCan(
          role,
          permissionsValue,
          "viewOperations",
        )
      );

    /* --------------------------------------------------------
       ANALYSE
    -------------------------------------------------------- */

    case "analytics":
      return (
        role === "analyst" ||
        agentCan(
          role,
          permissionsValue,
          "viewAnalytics",
        )
      );

    /* --------------------------------------------------------
       SÉCURITÉ
    -------------------------------------------------------- */

    case "security":
      return (
        role === "security" ||
        agentCan(
          role,
          permissionsValue,
          "viewSecurity",
        )
      );

    default:
      return false;
  }
}

/* ============================================================
   ACCÈS AUX FONCTIONS
============================================================ */

export function canExecuteAgentTask(
  roleValue: unknown,
  permissionsValue: unknown,
  permission: AgentPermission,
): boolean {
  return agentCan(
    roleValue,
    permissionsValue,
    permission,
  );
}

/* ============================================================
   PAGE D'ACCUEIL DU RÔLE
============================================================ */

export function getAgentHome(
  roleValue: unknown,
): string {
  if (
    isPlatformAdministrator(
      roleValue,
    )
  ) {
    return "/agent";
  }

  const role =
    resolveAgentRole(
      roleValue,
    );

  switch (role) {
    case "support":
      return "/agent/support";

    case "finance":
      return "/agent/paiements";

    case "technical":
      return "/agent/technique";

    case "operations":
      return "/agent";

    case "analyst":
      return "/agent";

    case "security":
      return "/agent";

    default:
      return "/agent";
  }
}

/* ============================================================
   LIBELLÉ DU RÔLE
============================================================ */

export function getAgentRoleLabel(
  roleValue: unknown,
): string {
  const role =
    resolveAgentRole(
      roleValue,
    );

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

/* ============================================================
   COULEUR / STYLE DU RÔLE
============================================================ */

export function getAgentRoleColor(
  roleValue: unknown,
): string {
  const role =
    resolveAgentRole(
      roleValue,
    );

  switch (role) {
    case "technical":
      return "blue";

    case "support":
      return "violet";

    case "finance":
      return "emerald";

    case "operations":
      return "orange";

    case "analyst":
      return "cyan";

    case "security":
      return "red";

    default:
      return "slate";
  }
}

/* ============================================================
   NORMALISATION DES PERMISSIONS
============================================================ */

export function getEffectiveAgentPermissions(
  roleValue: unknown,
  permissionsValue: unknown,
): AgentPermissions {
  if (
    isPlatformAdministrator(
      roleValue,
    )
  ) {
    return {
      callTickets: true,
      serveClients: true,
      completeTickets: true,
      viewClients: true,
      viewStatistics: true,
      viewPayments: true,
      managePayments: true,
      viewSubscriptions: true,
      manageSubscriptions: true,
      viewTechnical: true,
      manageTechnical: true,
      viewOperations: true,
      manageOperations: true,
      viewAnalytics: true,
      viewSecurity: true,
      manageSecurity: true,
    };
  }

  const role =
    resolveAgentRole(
      roleValue,
    );

  if (!role) {
    return {};
  }

  const result: AgentPermissions = {};

  for (
    const permission of ROLE_PERMISSIONS[
      role
    ]
  ) {
    result[permission] = true;
  }

  /*
   * Les permissions explicitement définies
   * dans la base remplacent les valeurs par défaut.
   */
  const databasePermissions =
    parseAgentPermissions(
      permissionsValue,
    );

  for (
    const permission of Object.keys(
      databasePermissions,
    ) as AgentPermission[]
  ) {
    result[permission] =
      databasePermissions[
        permission
      ];
  }

  return result;
}