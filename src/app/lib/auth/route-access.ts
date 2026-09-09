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

export const ROLE_HOME: Record<
  PharmaFlowRole,
  string
> = {
  owner: "/dashboard",
  admin: "/admin",
  pharmacist: "/pharmacien",
  cashier: "/caisse",
  employee: "/employe",
};

export function isPharmaFlowRole(
  role: string | null | undefined,
): role is PharmaFlowRole {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "pharmacist" ||
    role === "cashier" ||
    role === "employee"
  );
}

export function getRoleHome(
  role: string | null | undefined,
) {
  if (isPharmaFlowRole(role)) {
    return ROLE_HOME[role];
  }

  return "/login";
}

type RouteRule = {
  prefix: string;
  permission?: PharmaFlowPermission;
  roles?: PharmaFlowRole[];
};

export const ROUTE_RULES: RouteRule[] = [
  /*
   * ==============================================
   * ESPACES PRINCIPAUX
   * ==============================================
   */

  {
    prefix: "/dashboard",
    roles: ["owner"],
  },

  {
    prefix: "/admin",
    roles: ["owner", "admin"],
  },

  {
    prefix: "/pharmacien",
    roles: ["pharmacist"],
  },

  {
    prefix: "/caisse",
    roles: ["cashier"],
  },

  {
    prefix: "/employe",
    roles: ["employee"],
  },

  /*
   * ==============================================
   * MODULES
   * ==============================================
   */

  {
    prefix: "/products",
    permission: "products.view",
  },

  {
    prefix: "/stock",
    permission: "stock.view",
  },

  {
    prefix: "/ventes",
    permission: "sales.view",
  },

  {
    prefix: "/rapports",
    permission: "reports.view",
  },

  {
    prefix: "/paiements",
    permission: "payments.view",
  },

  {
    prefix: "/utilisateurs",
    permission: "users.view",
  },

  /*
   * ==============================================
   * PROFIL PERSONNEL
   *
   * IMPORTANT :
   * Cette page est accessible à tous les rôles
   * authentifiés.
   *
   * Elle ne donne pas de droits administratifs.
   * Elle affiche uniquement les données du compte
   * connecté.
   * ==============================================
   */

  {
    prefix: "/parametres",
    roles: [
      "owner",
      "admin",
      "pharmacist",
      "cashier",
      "employee",
    ],
  },
];

export function getRouteRule(
  pathname: string,
): RouteRule | null {
  const sortedRules =
    [...ROUTE_RULES].sort(
      (a, b) =>
        b.prefix.length -
        a.prefix.length,
    );

  return (
    sortedRules.find(
      (rule) =>
        pathname === rule.prefix ||
        pathname.startsWith(
          `${rule.prefix}/`,
        ),
    ) || null
  );
}