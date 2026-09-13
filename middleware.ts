import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";


/* =========================================================
   REDIRECTION SELON LE RÔLE
   ========================================================= */

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


/* =========================================================
   PERMISSIONS PAR MODULE
   ========================================================= */

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


  /* ================================================
     PAR DÉFAUT
     ================================================ */

  return true;
}


/* =========================================================
   ROUTES PUBLIQUES ACCESSIBLES À TOUT LE MONDE
   ========================================================= */

function isPublicRoute(
  pathname: string
) {
  return (
    pathname === "/" ||

    pathname.startsWith(
      "/support"
    ) ||

    pathname.startsWith(
      "/confidentialite"
    ) ||

    pathname.startsWith(
      "/conditions"
    ) ||

    pathname.startsWith(
      "/securite"
    )
  );
}


/* =========================================================
   ROUTES D'AUTHENTIFICATION
   =========================================================
   Ces pages sont accessibles sans connexion,
   MAIS un utilisateur déjà connecté doit être
   redirigé vers son espace.
   ========================================================= */

function isAuthRoute(
  pathname: string
) {
  return (
    pathname.startsWith(
      "/login"
    ) ||

    pathname.startsWith(
      "/register"
    ) ||

    pathname.startsWith(
      "/forgot-password"
    )
  );
}


/* =========================================================
   API PUBLIQUES DU CENTRE D'ASSISTANCE
   ========================================================= */

function isPublicApiRoute(
  pathname: string
) {
  return (
    pathname.startsWith(
      "/api/support"
    )
  );
}


/* =========================================================
   MIDDLEWARE
   ========================================================= */

export async function middleware(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    });


  /* ================================================
     SUPABASE SERVER CLIENT
     ================================================ */

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


  /* ================================================
     URL ACTUELLE
     ================================================ */

  const pathname =
    request.nextUrl.pathname;


  /* ================================================
     ROUTES PUBLIQUES
     ================================================ */

  const publicRoute =
    isPublicRoute(
      pathname
    );


  const authRoute =
    isAuthRoute(
      pathname
    );


  const publicApiRoute =
    isPublicApiRoute(
      pathname
    );


  /* =================================================
     API SUPPORT PUBLIQUE
     =================================================
     
     L'IA et les tickets du Centre d'assistance
     doivent pouvoir fonctionner même lorsqu'un
     visiteur n'est pas connecté.
     ================================================= */

  if (
    publicApiRoute
  ) {
    return response;
  }


  /* ================================================
     RÉCUPÉRER L'UTILISATEUR
     ================================================ */

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();


  /* =================================================
     VISITEUR NON CONNECTÉ
     ================================================= */

  if (!user) {

    /* -----------------------------------------------
       Page publique
       ----------------------------------------------- */

    if (
      publicRoute
    ) {
      return response;
    }


    /* -----------------------------------------------
       Page d'authentification
       ----------------------------------------------- */

    if (
      authRoute
    ) {
      return response;
    }


    /* -----------------------------------------------
       Page privée
       ----------------------------------------------- */

    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/login";

    /*
     * On conserve le chemin demandé
     * pour permettre une redirection
     * après connexion.
     */
    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(
      loginUrl
    );
  }


  /* =================================================
     UTILISATEUR DÉJÀ CONNECTÉ
     ================================================= */

  /* -----------------------------------------------
     Les routes publiques restent accessibles
     même connecté.
     
     Exemple :
     /support
     /confidentialite
     /conditions
     ----------------------------------------------- */

  if (
    publicRoute
  ) {
    return response;
  }


  /* =================================================
     LOGIN / REGISTER / FORGOT PASSWORD
     =================================================
     
     Un utilisateur déjà connecté ne doit pas
     rester sur ces pages.
     ================================================= */

  if (
    authRoute
  ) {

    const {
      data: profile,
    } =
      await supabase
        .from("profiles")
        .select(
          "role, pharmacy_id"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();


    /* -----------------------------------------------
       Profil introuvable
       ----------------------------------------------- */

    if (!profile) {

      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/login",
          request.url
        )
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


  /* =================================================
     RÉCUPÉRER LE PROFIL
     ================================================= */

  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select(
        "role, pharmacy_id"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();


  /* =================================================
     PROFIL INTROUVABLE
     ================================================= */

  if (!profile) {

    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }


  /* =================================================
     VÉRIFICATION PHARMACIE
     ================================================= */

  if (
    !profile.pharmacy_id
  ) {
    return NextResponse.redirect(
      new URL(
        "/login?error=no_pharmacy",
        request.url
      )
    );
  }


  /* =================================================
     VÉRIFICATION DU RÔLE
     ================================================= */

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


  /* =================================================
     AUTORISÉ
     ================================================= */

  return response;
}


/* =========================================================
   MATCHER
   ========================================================= */

export const config = {
  matcher: [
    /*
     * Exclut les ressources Next.js
     * et les fichiers statiques.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};