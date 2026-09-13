import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

function getRoleHome(
  role: string
) {
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

function isAllowed(
  pathname: string,
  role: string
) {
  /* ================================================
     PROPRIÉTAIRE
     ================================================ */

  if (
    pathname.startsWith(
      "/dashboard"
    )
  ) {
    return role === "owner";
  }

  /* ================================================
     ADMINISTRATION
     ================================================ */

  if (
    pathname.startsWith("/admin")
  ) {
    return (
      role === "owner" ||
      role === "admin"
    );
  }

  /* ================================================
     PHARMACIEN
     ================================================ */

  if (
    pathname.startsWith(
      "/pharmacien"
    )
  ) {
    return (
      role === "owner" ||
      role === "pharmacist"
    );
  }

  /* ================================================
     CAISSE
     ================================================ */

  if (
    pathname.startsWith("/caisse")
  ) {
    return (
      role === "owner" ||
      role === "cashier"
    );
  }

  /* ================================================
     EMPLOYÉ
     ================================================ */

  if (
    pathname.startsWith("/employe")
  ) {
    return (
      role === "owner" ||
      role === "employee"
    );
  }

  /* ================================================
     MODULES PHARMACIE EXISTANTS
     ================================================ */

  const pharmacyModules = [
    "/products",
    "/stock",
    "/ventes",
    "/utilisateurs",
  ];

  if (
    pharmacyModules.some(
      (path) =>
        pathname.startsWith(path)
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

export async function middleware(
  request: NextRequest
) {
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
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                request.cookies.set(
                  name,
                  value
                );

                response =
                  NextResponse.next({
                    request,
                  });

                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith(
      "/login"
    ) ||
    pathname.startsWith(
      "/register"
    ) ||
    pathname.startsWith(
      "/forgot-password"
    );

  /* ================================================
     PAS CONNECTÉ
     ================================================ */

  if (!user) {
    if (isPublicRoute) {
      return response;
    }

    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";

    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  /* ================================================
     UTILISATEUR DÉJÀ CONNECTÉ
     ================================================ */

  if (
    isPublicRoute &&
    pathname !== "/"
  ) {
    const {
      data: profile,
    } =
      await supabase
        .from("profiles")
        .select(
          "role, pharmacy_id"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();

      const loginUrl =
        request.nextUrl.clone();

      loginUrl.pathname = "/login";

      return NextResponse.redirect(
        loginUrl
      );
    }

    return NextResponse.redirect(
      new URL(
        getRoleHome(
          profile.role
        ),
        request.url
      )
    );
  }

  /* ================================================
     RÉCUPÉRER LE RÔLE
     ================================================ */

  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select(
        "role, pharmacy_id"
      )
      .eq("id", user.id)
      .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  /* ================================================
     VÉRIFICATION PHARMACIE
     ================================================ */

  if (!profile.pharmacy_id) {
    return NextResponse.redirect(
      new URL(
        "/login?error=no_pharmacy",
        request.url
      )
    );
  }

  /* ================================================
     VÉRIFICATION DU RÔLE
     ================================================ */

  if (
    !isAllowed(
      pathname,
      profile.role
    )
  ) {
    return NextResponse.redirect(
      new URL(
        getRoleHome(
          profile.role
        ),
        request.url
      )
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Exclut les ressources Next.js
     * et les fichiers statiques.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};