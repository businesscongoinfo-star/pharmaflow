/**
 * ============================================================
 * PHARMAFLOW — SOURCE UNIQUE DES RÔLES & ACCÈS AUX ROUTES
 * ============================================================
 *
 * Ce fichier est utilisé par :
 *
 * - le Proxy (proxy.ts)
 * - la page de connexion (src/app/login/page.tsx)
 *
 * IMPORTANT :
 *
 * Toute modification des espaces par rôle doit être faite ICI
 * afin d'éviter les divergences entre le serveur et le client.
 * ============================================================
 */

export type PharmaFlowRole =
  | "owner"
  | "admin"
  | "pharmacist"
  | "cashier"
  | "employee";

export type PharmaFlowPermission =
  | "sales.view"
  | "sales.create"
  | "sales.cancel"
  | "sales.print"
  | "products.view"
  | "products.create"
  | "products.update"
  | "products.delete"
  | "stock.view"
  | "stock.entry"
  | "stock.exit"
  | "stock.adjust"
  | "stock.history"
  | "reports.view"
  | "reports.daily"
  | "reports.weekly"
  | "reports.monthly"
  | "reports.yearly"
  | "reports.print"
  | "reports.export"
  | "users.view"
  | "users.create"
  | "users.update"
  | "users.delete"
  | "payments.view"
  | "payments.manage"
  | "settings.view"
  | "settings.update";

const ALL_ROLES: PharmaFlowRole[] = [
  "owner",
  "admin",
  "pharmacist",
  "cashier",
  "employee",
];

/**
 * Modules partagés de la pharmacie.
 *
 * Les URLs réelles de l'application sont en français
 * (/produits, /ventes, ...). L'ancien préfixe "/products"
 * ne correspondait à aucune page et empêchait donc la
 * vérification d'accès de s'appliquer.
 */
export const PHARMACY_MODULES = [
  "/produits",
  "/stock",
  "/ventes",
  "/utilisateurs",
  "/rapports",
  "/paiements",
  "/parametres",
] as const;

/**
 * Espaces réservés à certains rôles.
 */
const ROLE_SPACES: Record<PharmaFlowRole, string[]> = {
  owner: [
    "/dashboard",
    "/admin",
    "/pharmacien",
    "/caisse",
    ...PHARMACY_MODULES,
  ],

  admin: [
    "/dashboard",
    "/admin",
    ...PHARMACY_MODULES,
  ],

  pharmacist: [
    "/pharmacien",
    "/produits",
    "/stock",
    "/ventes",
    "/rapports",
    "/parametres",
  ],

  cashier: [
    "/caisse",
    "/produits",
    "/ventes",
    "/parametres",
  ],

  employee: [
    "/caisse",
    "/produits",
    "/ventes",
    "/parametres",
  ],
};

/**
 * Page d'accueil de chaque rôle.
 *
 * IMPORTANT :
 *
 * Chaque destination DOIT correspondre à une page réelle.
 * ("/admin" et "/employe" ne possédaient aucune page et
 * renvoyaient donc une 404 après connexion.)
 */
export const ROLE_HOME: Record<PharmaFlowRole, string> = {
  owner: "/dashboard",
  admin: "/dashboard",
  pharmacist: "/pharmacien",
  cashier: "/caisse",
  employee: "/caisse",
};

export function isPharmaFlowRole(
  role: string | null | undefined,
): role is PharmaFlowRole {
  return ALL_ROLES.includes(
    String(role ?? "").trim().toLowerCase() as PharmaFlowRole,
  );
}

export function normalizeRole(
  role: string | null | undefined,
): string {
  return String(role ?? "").trim().toLowerCase();
}

export function getRoleHome(
  role: string | null | undefined,
): string {
  const normalized = normalizeRole(role);

  if (isPharmaFlowRole(normalized)) {
    return ROLE_HOME[normalized];
  }

  return "/login";
}

/**
 * Liste des préfixes autorisés pour un rôle.
 */
export function getAllowedPrefixes(
  role: string | null | undefined,
): string[] {
  const normalized = normalizeRole(role);

  if (!isPharmaFlowRole(normalized)) {
    return [];
  }

  return ROLE_SPACES[normalized];
}

function matchesPrefix(
  pathname: string,
  prefix: string,
): boolean {
  return (
    pathname === prefix ||
    pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Indique si une route appartient à l'espace pharmacie
 * (donc soumise aux contrôles de rôle et d'abonnement).
 */
export function isPharmacyRoute(
  pathname: string,
): boolean {
  return [
    "/dashboard",
    "/admin",
    "/pharmacien",
    "/caisse",
    "/employe",
    ...PHARMACY_MODULES,
  ].some((prefix) => matchesPrefix(pathname, prefix));
}

/**
 * Vérifie qu'un rôle peut accéder à une route.
 *
 * Une route hors espace pharmacie est laissée aux
 * protections de la page elle-même (Super Admin, Agent…).
 */
export function canAccessPath(
  role: string | null | undefined,
  pathname: string,
): boolean {
  if (!isPharmacyRoute(pathname)) {
    return true;
  }

  return getAllowedPrefixes(role).some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

/**
 * Vérifie qu'une redirection demandée (?redirect=...)
 * reste dans l'espace autorisé du rôle.
 *
 * Protection contre les redirections ouvertes.
 */
export function getAllowedRedirect(
  role: string | null | undefined,
  requestedRedirect: string | null,
): string {
  const roleHome = getRoleHome(role);

  if (roleHome === "/login" || !requestedRedirect) {
    return roleHome;
  }

  if (
    !requestedRedirect.startsWith("/") ||
    requestedRedirect.startsWith("//") ||
    requestedRedirect.startsWith("/\\")
  ) {
    return roleHome;
  }

  const normalized = requestedRedirect
    .split("?")[0]
    .split("#")[0];

  if (canAccessPath(role, normalized)) {
    return requestedRedirect;
  }

  return roleHome;
}

/**
 * Compatibilité : ancien système de règles par préfixe.
 */
type RouteRule = {
  prefix: string;
  permission?: PharmaFlowPermission;
  roles?: PharmaFlowRole[];
};

export const ROUTE_RULES: RouteRule[] = [
  { prefix: "/dashboard", roles: ["owner", "admin"] },
  { prefix: "/admin", roles: ["owner", "admin"] },
  { prefix: "/pharmacien", roles: ["owner", "pharmacist"] },
  { prefix: "/caisse", roles: ["owner", "cashier", "employee"] },
  { prefix: "/produits", permission: "products.view" },
  { prefix: "/stock", permission: "stock.view" },
  { prefix: "/ventes", permission: "sales.view" },
  { prefix: "/rapports", permission: "reports.view" },
  { prefix: "/paiements", permission: "payments.view" },
  { prefix: "/utilisateurs", permission: "users.view" },
  { prefix: "/parametres", roles: ALL_ROLES },
];

export function getRouteRule(
  pathname: string,
): RouteRule | null {
  const sortedRules = [...ROUTE_RULES].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );

  return (
    sortedRules.find((rule) =>
      matchesPrefix(pathname, rule.prefix),
    ) || null
  );
}
