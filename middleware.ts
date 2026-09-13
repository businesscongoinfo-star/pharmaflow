import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

function isAllowed(pathname: string, role: string) {
  /*
   * ---------------------------------------------------------
   * SUPER ADMIN / AGENT
   * ---------------------------------------------------------
   *
   * Ces espaces ne dépendent pas de pharmacy_id.
   * Leur autorisation réelle est vérifiée dans leurs propres
   * fonctions requireSuperAdmin / requireSuperAdminApi.
   */
  if (pathname.startsWith("/super-admin")) {
    return true;
  }

  if (pathname.startsWith("/agent")) {
    return true;
  }

  /*
   * ---------------------------------------------------------
   * ESPACES PAR RÔLE
   * ---------------------------------------------------------
   */

  if (pathname.startsWith("/dashboard")) {
    return role === "owner";
  }

  if (pathname.startsWith("/admin")) {
    return role === "owner" || role === "admin";
  }

  if (pathname.startsWith("/pharmacien")) {
    return role === "owner" || role === "pharmacist";
  }

  if (pathname.startsWith("/caisse")) {
    return role === "owner" || role === "cashier";
  }

  if (pathname.startsWith("/employe")) {
    return role === "owner" || role === "employee";
  }

  /*
   * ---------------------------------------------------------
   * MODULES PHARMACIE
   * ---------------------------------------------------------
   */

  const pharmacyModules = [
    "/produits",
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

  return true;
}

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              request.cookies.set(name, value);

              response = NextResponse.next({
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

  const pathname = request.nextUrl.pathname;

  /*
   * ---------------------------------------------------------
   * ROUTES PUBLIQUES
   * ---------------------------------------------------------
   */

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/confidentialite") ||
    pathname.startsWith("/conditions");

  /*
   * ---------------------------------------------------------
   * API PUBLIQUES / AUTO-AUTHENTIFIANTES
   * ---------------------------------------------------------
   *
   * Ces routes doivent atteindre leur Route Handler
   * directement et retourner leur propre JSON.
   */

  const isPublicApi =
    pathname.startsWith("/api/auth/platform-access") ||
    pathname.startsWith("/api/auth/inscription") ||
    pathname.startsWith("/api/subscription/status") ||
    pathname.startsWith("/api/support/ai") ||
    pathname.startsWith("/api/support/tickets");

  if (isPublicApi) {
    response.headers.set(
      "Cache-Control",
      "private, no-store",
    );

    return response;
  }

  /*
   * ---------------------------------------------------------
   * RÉCUPÉRATION DE LA SESSION
   * ---------------------------------------------------------
   */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * ---------------------------------------------------------
   * UTILISATEUR NON CONNECTÉ
   * ---------------------------------------------------------
   */

  if (!user) {
    if (isPublicRoute) {
      return response;
    }

    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.searchParams.set(
      "redirect",
      pathname,
    );

    return NextResponse.redirect(loginUrl);
  }

  /*
   * ---------------------------------------------------------
   * ESPACES PLATEFORME
   * ---------------------------------------------------------
   *
   * IMPORTANT :
   *
   * Un Super Admin n'a pas besoin de pharmacy_id.
   * On laisse donc la page Super Admin effectuer sa propre
   * vérification via requireSuperAdmin().
   *
   * Même principe pour les agents plateforme.
   */

  if (
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/agent")
  ) {
    response.headers.set(
      "Cache-Control",
      "private, no-store",
    );

    return response;
  }

  /*
   * ---------------------------------------------------------
   * ROUTES LOGIN / REGISTER / FORGOT PASSWORD
   * ---------------------------------------------------------
   */

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  if (isAuthRoute) {
    const {
      data: profile,
    } = await supabase
      .from("profiles")
      .select("role, pharmacy_id")
      .eq("id", user.id)
      .maybeSingle();

    /*
     * Si aucun profil pharmacie n'existe, on laisse
     * le parcours plateforme gérer le Super Admin / Agent.
     */
    if (!profile) {
      return response;
    }

    return NextResponse.redirect(
      new URL(
        getRoleHome(profile.role),
        request.url,
      ),
    );
  }

  /*
   * ---------------------------------------------------------
   * PROFIL PHARMACIE
   * ---------------------------------------------------------
   */

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select("role, pharmacy_id")
    .eq("id", user.id)
    .maybeSingle();

  /*
   * Pas de profil :
   * on renvoie vers login.
   */
  if (!profile) {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/login", request.url),
    );
  }

  /*
   * ---------------------------------------------------------
   * PHARMACY_ID OBLIGATOIRE UNIQUEMENT POUR LES COMPTES
   * PHARMACIE
   * ---------------------------------------------------------
   */

  if (!profile.pharmacy_id) {
    return NextResponse.redirect(
      new URL(
        "/login?error=no_pharmacy",
        request.url,
      ),
    );
  }

  /*
   * ---------------------------------------------------------
   * AUTORISATION PAR RÔLE
   * ---------------------------------------------------------
   */

  if (
    !isAllowed(
      pathname,
      profile.role,
    )
  ) {
    return NextResponse.redirect(
      new URL(
        getRoleHome(profile.role),
        request.url,
      ),
    );
  }

  /*
   * ---------------------------------------------------------
   * CACHE
   * ---------------------------------------------------------
   */

  response.headers.set(
    "Cache-Control",
    "private, no-store",
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};