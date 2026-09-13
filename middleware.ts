import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ============================================================
 * PHARMAFLOW — MIDDLEWARE GLOBAL
 * ============================================================
 *
 * Responsabilités :
 *
 * - routes publiques
 * - authentification Supabase
 * - comptes pharmacie
 * - rôles pharmacie
 * - Super Admin / Agent plateforme
 * - APIs publiques / auto-authentifiantes
 * - protection des routes privées
 * - compatibilité navigateur / mobile / tablette / desktop
 *
 * IMPORTANT :
 *
 * Le middleware ne décide PAS si un utilisateur est Super Admin.
 * La vérification définitive est effectuée dans :
 *
 *   src/app/lib/super-admin/auth.ts
 *
 * avec platform_admins.
 *
 * Le middleware ne doit donc jamais exiger pharmacy_id
 * pour /super-admin ou /agent.
 * ============================================================
 */

/**
 * ============================================================
 * REDIRECTION PAR RÔLE PHARMACIE
 * ============================================================
 */
function getRoleHome(role: string): string {
  switch (role) {
    case "owner":
      return "/dashboard";

    case "admin":
      return "/admin";

    case "pharmacist":
      return "/pharmacien";

    case "cashier":
      return "/caisse";

    case "employee":
      return "/employe";

    default:
      return "/login";
  }
}

/**
 * ============================================================
 * AUTORISATION DES ROUTES PHARMACIE
 * ============================================================
 */
function isAllowed(
  pathname: string,
  role: string,
): boolean {
  /**
   * ----------------------------------------------------------
   * DASHBOARD PROPRIÉTAIRE
   * ----------------------------------------------------------
   */
  if (pathname.startsWith("/dashboard")) {
    return role === "owner";
  }

  /**
   * ----------------------------------------------------------
   * ADMINISTRATION
   * ----------------------------------------------------------
   */
  if (pathname.startsWith("/admin")) {
    return (
      role === "owner" ||
      role === "admin"
    );
  }

  /**
   * ----------------------------------------------------------
   * PHARMACIEN
   * ----------------------------------------------------------
   */
  if (pathname.startsWith("/pharmacien")) {
    return (
      role === "owner" ||
      role === "pharmacist"
    );
  }

  /**
   * ----------------------------------------------------------
   * CAISSE
   * ----------------------------------------------------------
   */
  if (pathname.startsWith("/caisse")) {
    return (
      role === "owner" ||
      role === "cashier"
    );
  }

  /**
   * ----------------------------------------------------------
   * EMPLOYÉ
   * ----------------------------------------------------------
   */
  if (pathname.startsWith("/employe")) {
    return (
      role === "owner" ||
      role === "employee"
    );
  }

  /**
   * ----------------------------------------------------------
   * MODULES PHARMACIE
   * ----------------------------------------------------------
   *
   * Les routes actuelles de PharmaFlow utilisent principalement
   * les noms français.
   *
   * /produits
   * /stock
   * /ventes
   * /utilisateurs
   * /rapports
   * /paiements
   * /parametres
   * /abonnement
   *
   * /products est également conservé par sécurité si une
   * ancienne route existe encore quelque part.
   */
  const pharmacyModules = [
    "/produits",
    "/products",
    "/stock",
    "/ventes",
    "/utilisateurs",
    "/rapports",
    "/paiements",
    "/parametres",
    "/abonnement",
  ];

  if (
    pharmacyModules.some((path) =>
      pathname.startsWith(path),
    )
  ) {
    return (
      role === "owner" ||
      role === "admin" ||
      role === "pharmacist" ||
      role === "cashier"
    );
  }

  /**
   * ----------------------------------------------------------
   * AUTRES ROUTES
   * ----------------------------------------------------------
   */
  return true;
}

/**
 * ============================================================
 * MIDDLEWARE
 * ============================================================
 */
export async function middleware(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  /**
   * ==========================================================
   * ROUTES PUBLIQUES
   * ==========================================================
   *
   * Aucun contrôle d'authentification n'est nécessaire ici.
   *
   * Cela évite également de provoquer inutilement une lecture
   * ou un refresh de session Supabase sur les pages publiques.
   */
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/confidentialite") ||
    pathname.startsWith("/conditions");

  if (isPublicRoute) {
    const response =
      NextResponse.next({
        request,
      });

    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300",
    );

    return response;
  }

  /**
   * ==========================================================
   * APIs PUBLIQUES / AUTO-AUTHENTIFIANTES
   * ==========================================================
   *
   * Ces routes doivent atteindre directement leur Route Handler.
   *
   * Elles ne doivent PAS être transformées en redirection HTML
   * par le middleware.
   *
   * C'est particulièrement important pour :
   *
   * /api/auth/platform-access
   * /api/auth/inscription
   * /api/subscription/status
   * /api/support/ai
   * /api/support/tickets
   */
  const isPublicApi =
    pathname.startsWith(
      "/api/auth/platform-access",
    ) ||
    pathname.startsWith(
      "/api/auth/inscription",
    ) ||
    pathname.startsWith(
      "/api/subscription/status",
    ) ||
    pathname.startsWith(
      "/api/support/ai",
    ) ||
    pathname.startsWith(
      "/api/support/tickets",
    );

  if (isPublicApi) {
    const response =
      NextResponse.next({
        request,
      });

    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return response;
  }

  /**
   * ==========================================================
   * CLIENT SUPABASE SERVEUR
   * ==========================================================
   */
  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet,
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                request.cookies.set(
                  name,
                  value,
                );

                response =
                  NextResponse.next({
                    request,
                  });

                response.cookies.set(
                  name,
                  value,
                  options,
                );
              },
            );
          },
        },
      },
    );

  /**
   * ==========================================================
   * SESSION SUPABASE
   * ==========================================================
   *
   * getUser() vérifie la session auprès de Supabase Auth.
   */
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  /**
   * ==========================================================
   * UTILISATEUR NON CONNECTÉ
   * ==========================================================
   */
  if (!user) {
    /**
     * --------------------------------------------------------
     * ROUTES D'AUTHENTIFICATION
     * --------------------------------------------------------
     *
     * Elles restent accessibles sans session.
     */
    const isAuthRoute =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith(
        "/forgot-password",
      );

    if (isAuthRoute) {
      return response;
    }

    /**
     * --------------------------------------------------------
     * TOUTE AUTRE ROUTE PRIVÉE
     * --------------------------------------------------------
     */
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    /**
     * On conserve la destination demandée.
     */
    loginUrl.searchParams.set(
      "redirect",
      pathname,
    );

    const redirectResponse =
      NextResponse.redirect(
        loginUrl,
      );

    redirectResponse.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return redirectResponse;
  }

  /**
   * ==========================================================
   * UTILISATEUR CONNECTÉ
   * ==========================================================
   *
   * IMPORTANT :
   *
   * Nous NE redirigeons PAS automatiquement /login vers
   * /dashboard ici.
   *
   * Pourquoi ?
   *
   * Parce que le login PharmaFlow doit pouvoir déterminer :
   *
   *   1. compte pharmacie
   *   2. Super Admin
   *   3. Agent plateforme
   *
   * Le Super Admin n'est pas un compte pharmacie classique.
   *
   * Le parcours /login + /api/auth/platform-access peut donc
   * effectuer cette décision correctement.
   */
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith(
      "/forgot-password",
    );

  if (isAuthRoute) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return response;
  }

  /**
   * ==========================================================
   * ESPACE SUPER ADMIN
   * ==========================================================
   *
   * CRITIQUE :
   *
   * Un Super Admin n'a PAS besoin de pharmacy_id.
   *
   * On laisse donc la page/API Super Admin effectuer sa propre
   * vérification avec :
   *
   * getCurrentSuperAdmin()
   * requireSuperAdmin()
   * requireSuperAdminApi()
   *
   * qui vérifient platform_admins.
   */
  if (
    pathname.startsWith(
      "/super-admin",
    )
  ) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return response;
  }

  /**
   * ==========================================================
   * ESPACE AGENT PLATEFORME
   * ==========================================================
   *
   * Même principe :
   *
   * Un agent plateforme n'est pas une pharmacie.
   *
   * Son autorisation doit être contrôlée dans son espace
   * plateforme.
   */
  if (
    pathname.startsWith(
      "/agent",
    )
  ) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return response;
  }

  /**
   * ==========================================================
   * PROFIL PHARMACIE
   * ==========================================================
   */
  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "role, pharmacy_id",
      )
      .eq(
        "id",
        user.id,
      )
      .maybeSingle();

  /**
   * ==========================================================
   * PROFIL INTROUVABLE
   * ==========================================================
   */
  if (
    profileError ||
    !profile
  ) {
    /**
     * Pour une route privée pharmacie, un profil absent
     * signifie que l'utilisateur ne possède pas de profil
     * pharmacie valide.
     *
     * On nettoie la session pour éviter une session bloquée.
     */
    await supabase.auth.signOut();

    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    loginUrl.search = "";

    const redirectResponse =
      NextResponse.redirect(
        loginUrl,
      );

    redirectResponse.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return redirectResponse;
  }

  /**
   * ==========================================================
   * PHARMACY_ID
   * ==========================================================
   *
   * Cette vérification concerne UNIQUEMENT les routes
   * pharmacie puisque Super Admin / Agent ont déjà été traités
   * plus haut.
   */
  if (!profile.pharmacy_id) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    loginUrl.search = "";

    loginUrl.searchParams.set(
      "error",
      "no_pharmacy",
    );

    const redirectResponse =
      NextResponse.redirect(
        loginUrl,
      );

    redirectResponse.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return redirectResponse;
  }

  /**
   * ==========================================================
   * AUTORISATION PAR RÔLE
   * ==========================================================
   */
  if (
    !isAllowed(
      pathname,
      profile.role,
    )
  ) {
    const roleHome =
      getRoleHome(
        profile.role,
      );

    const redirectResponse =
      NextResponse.redirect(
        new URL(
          roleHome,
          request.url,
        ),
      );

    redirectResponse.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return redirectResponse;
  }

  /**
   * ==========================================================
   * ROUTE PRIVÉE AUTORISÉE
   * ==========================================================
   */
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0",
  );

  return response;
}

/**
 * ============================================================
 * MATCHER
 * ============================================================
 *
 * Le middleware s'applique aux pages et APIs privées,
 * mais ignore les ressources statiques Next.js.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};