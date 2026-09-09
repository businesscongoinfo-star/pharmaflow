import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  getRoleHome,
  getRouteRule,
  isPharmaFlowRole,
} from "../auth/route-access";

export async function updateSession(
  request: NextRequest
) {
  /*
   * Réponse par défaut.
   *
   * Elle permet à Supabase de renouveler
   * correctement les cookies de session.
   */

  let response =
    NextResponse.next({
      request,
    });

  /*
   * Client Supabase SSR.
   *
   * IMPORTANT :
   * on utilise uniquement la clé publishable
   * côté navigateur / SSR utilisateur.
   *
   * La clé secrète n'est jamais utilisée ici.
   */

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
            _headers
          ) {
            /*
             * Les nouveaux cookies doivent être
             * placés dans la requête.
             */

            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            /*
             * Puis dans la réponse envoyée
             * au navigateur.
             */

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
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

  /*
   * Routes publiques.
   */

  const pathname =
    request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith(
      "/login/"
    ) ||
    pathname === "/register" ||
    pathname.startsWith(
      "/register/"
    ) ||
    pathname.startsWith(
      "/auth/"
    ) ||
    pathname.startsWith(
      "/api/inscription"
    );

  /*
   * Vérification de l'identité.
   *
   * getClaims vérifie le JWT côté serveur
   * selon le mécanisme recommandé actuellement
   * par Supabase pour protéger les pages.
   */

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const claims =
    claimsData?.claims;

  /*
   * Si l'utilisateur n'est pas connecté.
   */

  if (!claims || claimsError) {
    if (!isPublicRoute) {
      const loginUrl =
        request.nextUrl.clone();

      loginUrl.pathname =
        "/login";

      loginUrl.searchParams.set(
        "error",
        "session_required"
      );

      return NextResponse.redirect(
        loginUrl
      );
    }

    return response;
  }

  /*
   * Les utilisateurs déjà connectés
   * ne doivent pas rester sur login/register.
   */

  if (
    isPublicRoute &&
    (pathname === "/login" ||
      pathname.startsWith(
        "/login/"
      ) ||
      pathname === "/register" ||
      pathname.startsWith(
        "/register/"
      ))
  ) {
    /*
     * On récupère le profil afin
     * de connaître son espace.
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(
          "id, role, pharmacy_id"
        )
        .eq(
          "id",
          claims.sub
        )
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      !profile.pharmacy_id ||
      !isPharmaFlowRole(
        profile.role
      )
    ) {
      return response;
    }

    const destination =
      getRoleHome(
        profile.role
      );

    return NextResponse.redirect(
      new URL(
        destination,
        request.url
      )
    );
  }

  /*
   * Les routes publiques continuent
   * normalement leur traitement.
   */

  if (isPublicRoute) {
    return response;
  }

  /*
   * Récupération du profil connecté.
   */

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "id, role, pharmacy_id"
      )
      .eq(
        "id",
        claims.sub
      )
      .maybeSingle();

  /*
   * Profil introuvable ou incomplet.
   */

  if (
    profileError ||
    !profile ||
    !profile.pharmacy_id ||
    !isPharmaFlowRole(
      profile.role
    )
  ) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/login";

    loginUrl.searchParams.set(
      "error",
      "profile_required"
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  /*
   * Vérification de la route demandée.
   */

  const rule =
    getRouteRule(pathname);

  /*
   * Si aucune règle n'est définie,
   * on laisse la page continuer.
   *
   * Les pages pourront ensuite être
   * ajoutées progressivement au système.
   */

  if (!rule) {
    return response;
  }

  /*
   * -------------------------------------------------------
   * 1. ROUTE PROTÉGÉE PAR RÔLE
   * -------------------------------------------------------
   */

  if (rule.roles) {
    const allowed =
      rule.roles.includes(
        profile.role
      );

    if (!allowed) {
      const destination =
        getRoleHome(
          profile.role
        );

      /*
       * Évite une boucle de redirection.
       */

      if (
        pathname !==
        destination
      ) {
        const redirectUrl =
          request.nextUrl.clone();

        redirectUrl.pathname =
          destination;

        redirectUrl.searchParams.set(
          "error",
          "access_denied"
        );

        return NextResponse.redirect(
          redirectUrl
        );
      }
    }

    return response;
  }

  /*
   * -------------------------------------------------------
   * 2. ROUTE PROTÉGÉE PAR PERMISSION
   * -------------------------------------------------------
   */

  if (rule.permission) {
    const {
      data: hasPermission,
      error: permissionError,
    } =
      await supabase.rpc(
        "pf_has_permission",
        {
          requested_permission:
            rule.permission,
        }
      );

    /*
     * Une erreur RPC est considérée
     * comme un refus d'accès.
     *
     * On ne laisse jamais une erreur
     * de permission ouvrir une page.
     */

    if (
      permissionError ||
      hasPermission !== true
    ) {
      const destination =
        getRoleHome(
          profile.role
        );

      /*
       * Si la destination est déjà
       * la page actuelle, on évite
       * une boucle.
       */

      if (
        pathname !==
        destination
      ) {
        const redirectUrl =
          request.nextUrl.clone();

        redirectUrl.pathname =
          destination;

        redirectUrl.searchParams.set(
          "error",
          "permission_denied"
        );

        return NextResponse.redirect(
          redirectUrl
        );
      }
    }
  }

  /*
   * Accès autorisé.
   */

  return response;
}