import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole =
  | "owner"
  | "admin"
  | "pharmacist"
  | "cashier"
  | "employee";

type Profile = {
  id: string;
  role: UserRole;
  pharmacy_id: string | null;
};

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
];

const ROLE_HOME: Record<UserRole, string> = {
  owner: "/dashboard",
  admin: "/admin",
  pharmacist: "/pharmacien",
  cashier: "/caisse",
  employee: "/employe",
};

/**
 * Routes nécessitant une permission particulière.
 *
 * Le contrôle est effectué en plus du contrôle de rôle.
 */
const ROUTE_PERMISSIONS: Record<string, string> = {
  "/products": "products.view",
  "/stock": "stock.view",
  "/ventes": "sales.view",
  "/utilisateurs": "users.view",
  "/rapports": "reports.view",
  "/paiements": "payments.view",
  "/parametres": "settings.view",
};

/**
 * Vérifie si un chemin commence réellement
 * par la route protégée.
 *
 * Exemple :
 * /products        → /products
 * /products/123    → /products
 *
 * Mais :
 * /products-test   → ne correspond PAS à /products
 */
function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Détermine la permission nécessaire pour une URL.
 */
function getRequiredPermission(pathname: string): string | null {
  for (const [route, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (matchesRoute(pathname, route)) {
      return permission;
    }
  }

  return null;
}

/**
 * Certaines pages sont réservées à un rôle précis.
 */
function isRoleWorkspaceAllowed(
  pathname: string,
  role: UserRole
): boolean {
  if (matchesRoute(pathname, "/dashboard")) {
    return role === "owner";
  }

  if (matchesRoute(pathname, "/admin")) {
    return role === "owner" || role === "admin";
  }

  if (matchesRoute(pathname, "/pharmacien")) {
    return role === "pharmacist";
  }

  if (matchesRoute(pathname, "/caisse")) {
    return role === "cashier";
  }

  if (matchesRoute(pathname, "/employe")) {
    return role === "employee";
  }

  return true;
}

/**
 * Vérifie si la route est publique.
 */
function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }

    return matchesRoute(pathname, route);
  });
}

/**
 * Vérifie si l'utilisateur possède la permission demandée.
 */
async function hasPermission(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  pharmacyId: string,
  permissionCode: string
) {
  /**
   * 1. Permission accordée directement à l'utilisateur.
   */
  const { data: directPermission, error: directError } =
    await supabase
      .from("user_permissions")
      .select("permission_code, allowed")
      .eq("user_id", userId)
      .eq("permission_code", permissionCode)
      .maybeSingle();

  if (directError) {
    console.error(
      "Erreur permissions utilisateur :",
      directError.message
    );
  }

  if (directPermission) {
    return directPermission.allowed === true;
  }

  /**
   * 2. Sinon, on vérifie la permission liée au rôle.
   */
  const { data: rolePermission, error: roleError } =
    await supabase
      .from("role_permissions")
      .select(
        `
          allowed,
          role,
          permission_code
        `
      )
      .eq("role", await getCurrentRole(supabase, userId))
      .eq("permission_code", permissionCode)
      .maybeSingle();

  if (roleError) {
    console.error(
      "Erreur permissions rôle :",
      roleError.message
    );

    return false;
  }

  if (!rolePermission) {
    return false;
  }

  return rolePermission.allowed === true;
}

/**
 * Récupère le rôle actuel de l'utilisateur.
 */
async function getCurrentRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.role) {
    return null;
  }

  return data.role as UserRole;
}

/**
 * Rafraîchit correctement la session Supabase
 * et protège les routes privées.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  /**
   * IMPORTANT :
   * getUser() permet de vérifier l'utilisateur
   * côté serveur avec Supabase.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /**
   * Les fichiers Next.js et ressources publiques
   * ne doivent pas être bloqués.
   */
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return response;
  }

  /**
   * Les pages publiques restent accessibles
   * sans connexion.
   */
  if (isPublicRoute(pathname)) {
    /**
     * Si un utilisateur connecté arrive sur login/register,
     * on peut le renvoyer directement vers son espace.
     */
    if (
      user &&
      (pathname === "/login" || pathname === "/register")
    ) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, pharmacy_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role) {
        const role = profile.role as UserRole;
        const destination = ROLE_HOME[role];

        if (destination) {
          return NextResponse.redirect(
            new URL(destination, request.url)
          );
        }
      }
    }

    return response;
  }

  /**
   * Toute autre page nécessite une connexion.
   */
  if (!user) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(loginUrl);
  }

  /**
   * Récupération du profil PharmaFlow.
   */
  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("id, role, pharmacy_id")
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    !profile.role ||
    !profile.pharmacy_id
  ) {
    console.error(
      "Profil PharmaFlow introuvable ou incomplet."
    );

    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  const typedProfile = profile as Profile;
  const role = typedProfile.role;

  /**
   * Vérification de l'espace correspondant au rôle.
   */
  if (!isRoleWorkspaceAllowed(pathname, role)) {
    const destination = ROLE_HOME[role];

    return NextResponse.redirect(
      new URL(destination, request.url)
    );
  }

  /**
   * Vérification des permissions centrales.
   */
  const requiredPermission =
    getRequiredPermission(pathname);

  if (requiredPermission) {
    const allowed = await hasPermission(
      supabase,
      typedProfile.id,
      typedProfile.pharmacy_id,
      requiredPermission
    );

    if (!allowed) {
      const destination = ROLE_HOME[role];

      return NextResponse.redirect(
        new URL(destination, request.url)
      );
    }
  }

  /**
   * Tout est correct :
   * l'utilisateur peut continuer.
   */
  return response;
}

/**
 * Le proxy s'applique uniquement aux pages
 * de l'application, pas aux fichiers statiques.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};