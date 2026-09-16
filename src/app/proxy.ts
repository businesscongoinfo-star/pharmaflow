import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextRequest,
  NextResponse,
} from "next/server";

/* ============================================================
   TYPES
============================================================ */

type ProfileRow = {
  id: string;
  pharmacy_id: string | null;
  role: string | null;
};

type SubscriptionRow = {
  id: string;
  pharmacy_id: string;
  plan_id: string | null;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
};

/* ============================================================
   ROUTES PUBLIQUES
============================================================ */

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/abonnement",
  "/support",
  "/confidentialite",
  "/conditions",
]);

/* ============================================================
   ROUTES PLATEFORME
============================================================ */

const PLATFORM_PREFIXES = [
  "/super-admin",
  "/agent",
];

/* ============================================================
   ROUTES PROTÉGÉES PHARMACIE
============================================================ */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/pharmacien",
  "/caisse",
  "/employe",
  "/products",
  "/produits",
  "/stock",
  "/ventes",
  "/utilisateurs",
  "/rapports",
  "/paiements",
  "/parametres",
];

/* ============================================================
   NORMALISATION
============================================================ */

function normalizeRole(
  role: string | null | undefined,
) {
  return String(
    role ?? "",
  )
    .trim()
    .toLowerCase();
}

/* ============================================================
   TEST ROUTE
============================================================ */

function matchesPrefix(
  pathname: string,
  prefixes: string[],
) {
  return prefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(
        `${prefix}/`,
      ),
  );
}

/* ============================================================
   ROUTE PUBLIQUE
============================================================ */

function isPublicPath(
  pathname: string,
) {
  return (
    PUBLIC_PATHS.has(
      pathname,
    ) ||
    pathname.startsWith(
      "/_next/",
    ) ||
    pathname.startsWith(
      "/favicon",
    ) ||
    pathname.startsWith(
      "/icons/",
    ) ||
    pathname.startsWith(
      "/images/",
    ) ||
    pathname.startsWith(
      "/fonts/",
    )
  );
}

/* ============================================================
   ROUTE PLATEFORME
============================================================ */

function isPlatformPath(
  pathname: string,
) {
  return matchesPrefix(
    pathname,
    PLATFORM_PREFIXES,
  );
}

/* ============================================================
   ROUTE PROTÉGÉE
============================================================ */

function isProtectedPath(
  pathname: string,
) {
  return matchesPrefix(
    pathname,
    PROTECTED_PREFIXES,
  );
}

/* ============================================================
   AUTORISATION PAR RÔLE
============================================================ */

function isAllowedByRole(
  pathname: string,
  role: string,
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  /*
   * ==========================================================
   * ESPACE PROPRIÉTAIRE
   * ==========================================================
   */

  if (
    pathname ===
      "/dashboard" ||
    pathname.startsWith(
      "/dashboard/",
    )
  ) {
    return (
      normalizedRole ===
      "owner"
    );
  }

  /*
   * ==========================================================
   * ESPACE ADMIN
   * ==========================================================
   */

  if (
    pathname ===
      "/admin" ||
    pathname.startsWith(
      "/admin/",
    )
  ) {
    return (
      normalizedRole ===
        "owner" ||
      normalizedRole ===
        "admin"
    );
  }

  /*
   * ==========================================================
   * ESPACE PHARMACIEN
   * ==========================================================
   */

  if (
    pathname ===
      "/pharmacien" ||
    pathname.startsWith(
      "/pharmacien/",
    )
  ) {
    return (
      normalizedRole ===
        "owner" ||
      normalizedRole ===
        "pharmacist"
    );
  }

  /*
   * ==========================================================
   * ESPACE CAISSE
   * ==========================================================
   */

  if (
    pathname ===
      "/caisse" ||
    pathname.startsWith(
      "/caisse/",
    )
  ) {
    return (
      normalizedRole ===
        "owner" ||
      normalizedRole ===
        "cashier"
    );
  }

  /*
   * ==========================================================
   * ESPACE EMPLOYÉ
   * ==========================================================
   */

  if (
    pathname ===
      "/employe" ||
    pathname.startsWith(
      "/employe/",
    )
  ) {
    return (
      normalizedRole ===
        "owner" ||
      normalizedRole ===
        "employee"
    );
  }

  /*
   * ==========================================================
   * MODULES PHARMACIE
   *
   * Ces modules sont accessibles aux rôles opérationnels
   * définis par ton architecture actuelle.
   * ==========================================================
   */

  if (
    matchesPrefix(
      pathname,
      [
        "/products",
        "/produits",
        "/stock",
        "/ventes",
        "/utilisateurs",
        "/rapports",
        "/paiements",
        "/parametres",
      ],
    )
  ) {
    return [
      "owner",
      "admin",
      "pharmacist",
      "cashier",
    ].includes(
      normalizedRole,
    );
  }

  /*
   * Par défaut, on refuse.
   */
  return false;
}

/* ============================================================
   ABONNEMENT VALIDE
============================================================ */

function subscriptionAllowsAccess(
  subscription:
    | SubscriptionRow
    | null,
) {
  if (
    !subscription
  ) {
    return false;
  }

  const status =
    String(
      subscription.status ??
        "",
    )
      .trim()
      .toLowerCase();

  /*
   * ==========================================================
   * ESSAI
   * ==========================================================
   */

  if (
    status ===
      "trial" ||
    status ===
      "trialing"
  ) {
    const endDate =
      subscription.trial_ends_at ??
      subscription.expires_at;

    if (!endDate) {
      return false;
    }

    const timestamp =
      new Date(
        endDate,
      ).getTime();

    return (
      Number.isFinite(
        timestamp,
      ) &&
      timestamp >
        Date.now()
    );
  }

  /*
   * ==========================================================
   * ABONNEMENT PAYÉ
   * ==========================================================
   */

  if (
    status ===
      "active" ||
    status ===
      "paid"
  ) {
    if (
      !subscription.expires_at
    ) {
      return false;
    }

    const timestamp =
      new Date(
        subscription.expires_at,
      ).getTime();

    return (
      Number.isFinite(
        timestamp,
      ) &&
      timestamp >
        Date.now()
    );
  }

  /*
   * Tout autre statut ne donne pas accès.
   */
  return false;
}

/* ============================================================
   REDIRECTION LOGIN
============================================================ */

function redirectToLogin(
  request: NextRequest,
  destination?: string,
) {
  const url =
    request.nextUrl.clone();

  url.pathname =
    "/login";

  url.search = "";

  const redirect =
    destination ??
    request.nextUrl.pathname;

  if (
    redirect &&
    redirect.startsWith(
      "/",
    ) &&
    !redirect.startsWith(
      "//",
    )
  ) {
    url.searchParams.set(
      "redirect",
      redirect,
    );
  }

  return NextResponse.redirect(
    url,
  );
}

/* ============================================================
   REDIRECTION ABONNEMENT
============================================================ */

function redirectToSubscription(
  request: NextRequest,
  reason: string,
) {
  const url =
    request.nextUrl.clone();

  url.pathname =
    "/abonnement";

  url.search = "";

  /*
   * On conserve exactement la page que l'utilisateur
   * voulait ouvrir.
   *
   * Exemple :
   *
   * /dashboard
   *
   * devient :
   *
   * /abonnement?reason=expired&redirect=/dashboard
   */

  url.searchParams.set(
    "reason",
    reason,
  );

  const requestedPath =
    request.nextUrl.pathname;

  if (
    requestedPath.startsWith(
      "/",
    ) &&
    !requestedPath.startsWith(
      "//",
    )
  ) {
    url.searchParams.set(
      "redirect",
      requestedPath,
    );
  }

  return NextResponse.redirect(
    url,
  );
}

/* ============================================================
   PROXY PRINCIPAL
============================================================ */

export async function proxy(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  /*
   * ==========================================================
   * 1. ROUTES PUBLIQUES
   * ==========================================================
   */

  if (
    isPublicPath(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  /*
   * ==========================================================
   * 2. ROUTES API
   *
   * Le matcher ci-dessous exclut déjà /api.
   * Cette sécurité supplémentaire permet d'éviter qu'une
   * future modification du matcher ne bloque les APIs.
   * ==========================================================
   */

  if (
    pathname.startsWith(
      "/api/",
    )
  ) {
    return NextResponse.next();
  }

  /*
   * ==========================================================
   * 3. ROUTES NON PROTÉGÉES
   * ==========================================================
   */

  if (
    !isProtectedPath(
      pathname,
    ) &&
    !isPlatformPath(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  /*
   * ==========================================================
   * 4. CONFIGURATION SUPABASE
   * ==========================================================
   */

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  /*
   * Si la configuration Supabase n'existe pas,
   * on ne donne pas accès aux routes protégées.
   */

  if (
    !supabaseUrl ||
    !supabasePublishableKey
  ) {
    console.error(
      "PharmaFlow proxy: configuration Supabase manquante.",
    );

    return redirectToLogin(
      request,
    );
  }

  /*
   * ==========================================================
   * 5. RESPONSE
   * ==========================================================
   */

  let response =
    NextResponse.next({
      request,
    });

  /*
   * ==========================================================
   * 6. CLIENT SUPABASE SSR
   * ==========================================================
   */

  const supabase =
    createServerClient(
      supabaseUrl,
      supabasePublishableKey,
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
   * 7. IDENTITÉ UTILISATEUR
   *
   * getClaims() permet de récupérer l'identité de la session
   * sans considérer l'abonnement comme un état d'authentification.
   * ==========================================================
   */

  let userId: string | null =
    null;

  try {
    const {
      data: claimsData,
    } =
      await supabase.auth.getClaims();

    userId =
      claimsData?.claims?.sub ??
      null;
  } catch (
    authError
  ) {
    console.error(
      "PharmaFlow proxy auth:",
      authError,
    );

    return redirectToLogin(
      request,
    );
  }

  /*
   * ==========================================================
   * 8. UTILISATEUR NON CONNECTÉ
   * ==========================================================
   */

  if (!userId) {
    return redirectToLogin(
      request,
    );
  }

  /*
   * ==========================================================
   * 9. ROUTES PLATEFORME
   *
   * Super Admin / Agent ne dépendent pas de l'abonnement
   * d'une pharmacie.
   *
   * Leur propre système d'autorisation reste responsable
   * de ces espaces.
   * ==========================================================
   */

  if (
    isPlatformPath(
      pathname,
    )
  ) {
    return response;
  }

  /*
   * ==========================================================
   * 10. PROFIL UTILISATEUR
   * ==========================================================
   */

  const {
    data: profileData,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "id, pharmacy_id, role",
      )
      .eq(
        "id",
        userId,
      )
      .maybeSingle();

  if (
    profileError
  ) {
    console.error(
      "PharmaFlow proxy profile:",
      profileError,
    );

    return redirectToLogin(
      request,
    );
  }

  if (
    !profileData
  ) {
    return redirectToLogin(
      request,
    );
  }

  const profile =
    profileData as ProfileRow;

  /*
   * ==========================================================
   * 11. PHARMACY_ID
   *
   * On stocke la valeur dans une constante après le test.
   *
   * Cela évite également l'erreur TypeScript :
   *
   * string | null → string
   * ==========================================================
   */

  const pharmacyId =
    profile.pharmacy_id;

  if (!pharmacyId) {
    return redirectToLogin(
      request,
    );
  }

  /*
   * ==========================================================
   * 12. RÔLE
   * ==========================================================
   */

  const role =
    normalizeRole(
      profile.role,
    );

  /*
   * ==========================================================
   * 13. AUTORISATION PAR RÔLE
   *
   * On vérifie le rôle AVANT l'abonnement.
   *
   * Exemple :
   *
   * un caissier ne peut pas devenir owner simplement
   * en modifiant l'URL /dashboard.
   * ==========================================================
   */

  if (
    !isAllowedByRole(
      pathname,
      role,
    )
  ) {
    /*
     * On renvoie l'utilisateur vers son espace officiel.
     *
     * Aucun signOut.
     */

    const roleHome =
      getRoleHomeForProxy(
        role,
      );

    if (
      roleHome
    ) {
      const url =
        request.nextUrl.clone();

      url.pathname =
        roleHome;

      url.search = "";

      return NextResponse.redirect(
        url,
      );
    }

    return redirectToLogin(
      request,
    );
  }

  /*
   * ==========================================================
   * 14. ABONNEMENT
   *
   * IMPORTANT :
   *
   * On récupère le dernier abonnement de la pharmacie.
   *
   * Un abonnement absent ou expiré bloque seulement l'accès
   * aux espaces protégés.
   *
   * Il ne détruit JAMAIS la session.
   * ==========================================================
   */

  const {
    data: subscriptionData,
    error: subscriptionError,
  } =
    await supabase
      .from("subscriptions")
      .select(
        `
          id,
          pharmacy_id,
          plan_id,
          status,
          trial_started_at,
          trial_ends_at,
          expires_at
        `,
      )
      .eq(
        "pharmacy_id",
        pharmacyId,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      )
      .limit(1)
      .maybeSingle();

  /*
   * ==========================================================
   * 15. ERREUR DE VÉRIFICATION
   * ==========================================================
   */

  if (
    subscriptionError
  ) {
    console.error(
      "PharmaFlow proxy subscription:",
      subscriptionError,
    );

    return redirectToSubscription(
      request,
      "verification",
    );
  }

  /*
   * ==========================================================
   * 16. PAS D'ABONNEMENT
   * ==========================================================
   */

  if (
    !subscriptionData
  ) {
    return redirectToSubscription(
      request,
      "no_subscription",
    );
  }

  const subscription =
    subscriptionData as SubscriptionRow;

  /*
   * ==========================================================
   * 17. ABONNEMENT EXPIRÉ / INVALIDE
   * ==========================================================
   */

  if (
    !subscriptionAllowsAccess(
      subscription,
    )
  ) {
    const status =
      String(
        subscription.status ??
          "",
      )
        .trim()
        .toLowerCase();

    let reason =
      "subscription_required";

    if (
      status ===
        "expired" ||
      status ===
        "cancelled"
    ) {
      reason =
        "subscription_expired";
    }

    if (
      status ===
      "blocked"
    ) {
      reason =
        "subscription_blocked";
    }

    return redirectToSubscription(
      request,
      reason,
    );
  }

  /*
   * ==========================================================
   * 18. TOUT EST VALIDE
   *
   * Utilisateur :
   * - connecté
   * - profil valide
   * - pharmacie valide
   * - rôle autorisé
   * - abonnement valide
   *
   * → accès accordé.
   * ==========================================================
   */

  return response;
}

/* ============================================================
   ESPACE PRINCIPAL SELON LE RÔLE
============================================================ */

function getRoleHomeForProxy(
  role: string,
) {
  switch (
    normalizeRole(
      role,
    )
  ) {
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
      return null;
  }
}

/* ============================================================
   MATCHER
============================================================ */

export const config = {
  matcher: [
    /*
     * Toutes les pages sauf :
     *
     * - API
     * - fichiers statiques
     * - images
     * - favicon
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|otf)$).*)",
  ],
};