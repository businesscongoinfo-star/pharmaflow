import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* ============================================================
   REDIRECTION PAR RÔLE
============================================================ */

function getRoleHome(role: string) {
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

/* ============================================================
   AUTORISATIONS DES MODULES
============================================================ */

function isAllowed(
  pathname: string,
  role: string,
) {
  if (
    pathname.startsWith("/dashboard")
  ) {
    return role === "owner";
  }

  if (
    pathname.startsWith("/admin")
  ) {
    return (
      role === "owner" ||
      role === "admin"
    );
  }

  if (
    pathname.startsWith("/pharmacien")
  ) {
    return (
      role === "owner" ||
      role === "pharmacist"
    );
  }

  if (
    pathname.startsWith("/caisse")
  ) {
    return (
      role === "owner" ||
      role === "cashier"
    );
  }

  if (
    pathname.startsWith("/employe")
  ) {
    return (
      role === "owner" ||
      role === "employee"
    );
  }

  const pharmacyModules = [
    "/produits",
    "/stock",
    "/ventes",
    "/utilisateurs",
  ];

  if (
    pharmacyModules.some(
      (path) =>
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

  return true;
}

/* ============================================================
   ROUTES PUBLIQUES
============================================================ */

function isPublicRoute(
  pathname: string,
) {
  return (
    pathname === "/" ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/confidentialite") ||
    pathname.startsWith("/conditions")
  );
}

/* ============================================================
   ROUTES D'AUTHENTIFICATION
============================================================ */

function isAuthRoute(
  pathname: string,
) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith(
      "/forgot-password",
    )
  );
}

/* ============================================================
   API QUI DOIVENT ÊTRE LAISSÉES PASSER
============================================================ */

/*
 * IMPORTANT :
 *
 * Ces routes font leur propre vérification côté serveur.
 *
 * Si le middleware les intercepte avant leur Route Handler,
 * il peut provoquer une redirection /login au lieu de retourner
 * le JSON attendu par le frontend.
 */

function isPublicApiRoute(
  pathname: string,
) {
  const publicApiRoutes = [
    "/api/auth/platform-access",
    "/api/auth/inscription",

    "/api/subscription/status",

    "/api/support/ai",
    "/api/support/tickets",
  ];

  return publicApiRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`,
      ),
  );
}

/* ============================================================
   MIDDLEWARE
============================================================ */

export async function middleware(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  /*
   * ==========================================================
   * 1. API PUBLIQUES / AUTO-AUTHENTIFIÉES
   * ==========================================================
   *
   * On laisse directement les Route Handlers traiter
   * leur propre authentification.
   *
   * Cela est particulièrement important pour :
   *
   * /api/auth/platform-access
   * /api/subscription/status
   * /api/auth/inscription
   * /api/support/*
   */

  if (
    isPublicApiRoute(pathname)
  ) {
    return NextResponse.next();
  }

  /*
   * ==========================================================
   * 2. CLIENT SUPABASE SSR
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
                  NextResponse.next(
                    {
                      request,
                    },
                  );

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

  /*
   * ==========================================================
   * 3. UTILISATEUR COURANT
   * ==========================================================
   *
   * getUser() vérifie réellement l'utilisateur auprès
   * de Supabase Auth.
   */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  /*
   * ==========================================================
   * 4. VISITEUR NON CONNECTÉ
   * ==========================================================
   */

  if (!user) {
    /*
     * Pages publiques accessibles sans connexion.
     */

    if (
      isPublicRoute(pathname) ||
      isAuthRoute(pathname)
    ) {
      response.headers.set(
        "Cache-Control",
        "private, no-store",
      );

      return response;
    }

    /*
     * Toute autre page nécessite une connexion.
     */

    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/login";

    loginUrl.searchParams.set(
      "redirect",
      pathname,
    );

    return NextResponse.redirect(
      loginUrl,
    );
  }

  /*
   * ==========================================================
   * 5. UTILISATEUR DÉJÀ CONNECTÉ
   * ==========================================================
   *
   * Les pages publiques restent accessibles.
   *
   * Les pages d'authentification redirigent vers l'espace
   * correspondant au rôle.
   */

  if (
    isPublicRoute(pathname)
  ) {
    response.headers.set(
      "Cache-Control",
      "private, no-store",
    );

    return response;
  }

  /*
   * ==========================================================
   * 6. PROFIL
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

  /*
   * ==========================================================
   * 7. PROFIL INTROUVABLE
   * ==========================================================
   */

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "MIDDLEWARE PROFILE ERROR:",
      profileError,
    );

    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url,
      ),
    );
  }

  /*
   * ==========================================================
   * 8. ROUTES LOGIN / REGISTER / FORGOT PASSWORD
   * ==========================================================
   */

  if (
    isAuthRoute(pathname)
  ) {
    return NextResponse.redirect(
      new URL(
        getRoleHome(
          profile.role,
        ),
        request.url,
      ),
    );
  }

  /*
   * ==========================================================
   * 9. PHARMACY OBLIGATOIRE
   * ==========================================================
   *
   * Les comptes pharmacie doivent avoir un pharmacy_id.
   *
   * Les comptes plateforme sont traités par leurs propres
   * APIs et espaces.
   */

  if (
    !profile.pharmacy_id
  ) {
    return NextResponse.redirect(
      new URL(
        "/login?error=no_pharmacy",
        request.url,
      ),
    );
  }

  /*
   * ==========================================================
   * 10. AUTORISATION DU MODULE
   * ==========================================================
   */

  const role =
    String(
      profile.role ?? "",
    )
      .trim()
      .toLowerCase();

  if (
    !isAllowed(
      pathname,
      role,
    )
  ) {
    return NextResponse.redirect(
      new URL(
        getRoleHome(role),
        request.url,
      ),
    );
  }

  /*
   * ==========================================================
   * 11. PAS DE CACHE POUR LES ROUTES AUTHENTIFIÉES
   * ==========================================================
   */

  response.headers.set(
    "Cache-Control",
    "private, no-store",
  );

  return response;
}

/* ============================================================
   MATCHER
============================================================ */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};