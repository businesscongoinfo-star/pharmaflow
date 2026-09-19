import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type UserProfile = {
  id: string;
  role: string | null;
  pharmacy_id: string | null;
};

type Pharmacy = {
  id: string;
  status: string | null;
  manual_access_enabled: boolean | null;
  manual_access_until: string | null;
};

type Subscription = {
  id: string;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
};

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/invitation",
  "/abonnement",
];

const PLATFORM_PATHS = [
  "/super-admin",
  "/agent",
];

const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/admin",
  "/employe",
  "/employee",
  "/produits",
  "/products",
  "/stock",
  "/ventes",
  "/utilisateurs",
  "/rapports",
  "/paiements",
  "/parametres",
  "/caisse",
  "/pharmacien",
  "/support",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  );
}

function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  );
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  );
}

function isFutureDate(
  value: string | null | undefined,
): boolean {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp > Date.now();
}

function hasManualAccess(
  pharmacy: Pharmacy,
): boolean {
  return (
    pharmacy.manual_access_enabled === true &&
    isFutureDate(pharmacy.manual_access_until)
  );
}

function hasValidSubscription(
  subscription: Subscription | null,
): boolean {
  if (!subscription) {
    return false;
  }

  const status =
    subscription.status?.toLowerCase() ?? "";

  /*
   * Période d'essai
   */
  if (
    status === "trial" ||
    status === "trialing"
  ) {
    return isFutureDate(
      subscription.trial_ends_at,
    );
  }

  /*
   * Abonnement payé / actif.
   *
   * On accepte ici les statuts actifs connus
   * de l'application.
   */
  if (
    status === "active" ||
    status === "paid"
  ) {
    return isFutureDate(
      subscription.expires_at,
    );
  }

  return false;
}

/**
 * Copie les cookies Supabase d'une réponse
 * vers une autre réponse.
 *
 * Important :
 * On ne transmet pas directement ResponseCookie[]
 * à cookies.set(), car Next.js attend un cookie
 * individuel ou un objet ResponseCookie.
 */
function copySupabaseResponseCookies(
  from: NextResponse,
  to: NextResponse,
): void {
  const cookies = from.cookies.getAll();

  for (const cookie of cookies) {
    to.cookies.set({
      name: cookie.name,
      value: cookie.value,
      ...(cookie.path !== undefined
        ? { path: cookie.path }
        : {}),
      ...(cookie.domain !== undefined
        ? { domain: cookie.domain }
        : {}),
      ...(cookie.expires !== undefined
        ? { expires: cookie.expires }
        : {}),
      ...(cookie.httpOnly !== undefined
        ? { httpOnly: cookie.httpOnly }
        : {}),
      ...(cookie.maxAge !== undefined
        ? { maxAge: cookie.maxAge }
        : {}),
      ...(cookie.sameSite !== undefined
        ? { sameSite: cookie.sameSite }
        : {}),
      ...(cookie.secure !== undefined
        ? { secure: cookie.secure }
        : {}),
    });
  }
}

function redirectToLogin(
  request: NextRequest,
): NextResponse {
  const loginUrl = new URL(
    "/login",
    request.url,
  );

  const currentPath =
    `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (currentPath !== "/login") {
    loginUrl.searchParams.set(
      "redirect",
      currentPath,
    );
  }

  return NextResponse.redirect(loginUrl);
}

function redirectToSubscription(
  request: NextRequest,
  reason: string,
): NextResponse {
  const subscriptionUrl = new URL(
    "/abonnement",
    request.url,
  );

  subscriptionUrl.searchParams.set(
    "reason",
    reason,
  );

  const currentPath =
    `${request.nextUrl.pathname}${request.nextUrl.search}`;

  subscriptionUrl.searchParams.set(
    "redirect",
    currentPath,
  );

  return NextResponse.redirect(
    subscriptionUrl,
  );
}

export async function proxy(
  request: NextRequest,
): Promise<NextResponse> {
  const pathname =
    request.nextUrl.pathname;

  /*
   * --------------------------------------------------
   * 1. Routes publiques
   * --------------------------------------------------
   *
   * L'invitation doit absolument être publique.
   *
   * Le token Supabase d'invitation peut être transmis
   * dans le fragment #access_token=...
   * et ce fragment n'est pas envoyé au serveur.
   */
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  /*
   * --------------------------------------------------
   * 2. Espaces plateforme
   * --------------------------------------------------
   *
   * Super Admin et Agent ne dépendent pas
   * de l'abonnement d'une pharmacie.
   *
   * Leur autorisation est vérifiée dans leurs pages
   * et leurs API.
   */
  if (isPlatformPath(pathname)) {
    return NextResponse.next();
  }

  /*
   * --------------------------------------------------
   * 3. Routes qui ne nécessitent pas de protection
   * --------------------------------------------------
   */
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  /*
   * --------------------------------------------------
   * 4. Configuration Supabase Server
   * --------------------------------------------------
   */
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !supabaseUrl ||
    !supabasePublishableKey
  ) {
    console.error(
      "Supabase environment variables are missing.",
    );

    return NextResponse.next();
  }

  let response =
    NextResponse.next({
      request,
    });

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          for (const {
            name,
            value,
            options,
          } of cookiesToSet) {
            request.cookies.set({
              name,
              value,
            });

            response.cookies.set({
              name,
              value,
              ...options,
            });
          }
        },
      },
    },
  );

  /*
   * --------------------------------------------------
   * 5. Vérification de l'utilisateur Supabase
   * --------------------------------------------------
   *
   * getClaims() permet de vérifier les claims
   * de la session côté serveur.
   */
  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims
  ) {
    return redirectToLogin(request);
  }

  const userId =
    typeof claimsData.claims.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    return redirectToLogin(request);
  }

  /*
   * --------------------------------------------------
   * 6. Profil utilisateur
   * --------------------------------------------------
   */
  const {
    data: profileData,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        `
          id,
          role,
          pharmacy_id
        `,
      )
      .eq("id", userId)
      .maybeSingle();

  if (
    profileError ||
    !profileData
  ) {
    return redirectToLogin(request);
  }

  const profile =
    profileData as UserProfile;

  /*
   * --------------------------------------------------
   * 7. Sécurité plateforme
   * --------------------------------------------------
   *
   * Si un compte plateforme possède le rôle
   * super_admin, il n'a pas besoin d'une pharmacie.
   */
  if (
    profile.role === "super_admin"
  ) {
    return response;
  }

  /*
   * --------------------------------------------------
   * 8. Vérification pharmacie
   * --------------------------------------------------
   */
  if (!profile.pharmacy_id) {
    return redirectToLogin(request);
  }

  const {
    data: pharmacyData,
    error: pharmacyError,
  } =
    await supabase
      .from("pharmacies")
      .select(
        `
          id,
          status,
          manual_access_enabled,
          manual_access_until
        `,
      )
      .eq(
        "id",
        profile.pharmacy_id,
      )
      .maybeSingle();

  if (
    pharmacyError ||
    !pharmacyData
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_not_found",
    );
  }

  const pharmacy =
    pharmacyData as Pharmacy;

  /*
   * --------------------------------------------------
   * 9. Pharmacie inactive / suspendue
   * --------------------------------------------------
   *
   * On ne déconnecte PAS l'utilisateur.
   *
   * Il doit pouvoir rester authentifié et accéder
   * à /abonnement pour régulariser sa situation.
   */
  const pharmacyStatus =
    pharmacy.status?.toLowerCase() ??
    "active";

  if (
    pharmacyStatus === "inactive"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_inactive",
    );
  }

  if (
    pharmacyStatus === "suspended"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_suspended",
    );
  }

  if (
    pharmacyStatus !== "active"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_inactive",
    );
  }

  /*
   * --------------------------------------------------
   * 10. Accès manuel Super Admin
   * --------------------------------------------------
   *
   * Un accès manuel futur permet d'ouvrir
   * temporairement l'espace de la pharmacie,
   * même si son abonnement est expiré.
   */
  if (hasManualAccess(pharmacy)) {
    return response;
  }

  /*
   * --------------------------------------------------
   * 11. Dernier abonnement
   * --------------------------------------------------
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
          status,
          trial_started_at,
          trial_ends_at,
          expires_at
        `,
      )
      .eq(
        "pharmacy_id",
        profile.pharmacy_id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  /*
   * --------------------------------------------------
   * 12. Erreur de vérification
   * --------------------------------------------------
   */
  if (subscriptionError) {
    console.error(
      "Subscription verification error:",
      subscriptionError,
    );

    return redirectToSubscription(
      request,
      "verification",
    );
  }

  const subscription =
    subscriptionData as
      | Subscription
      | null;

  /*
   * --------------------------------------------------
   * 13. Abonnement valide
   * --------------------------------------------------
   */
  if (
    hasValidSubscription(
      subscription,
    )
  ) {
    return response;
  }

  /*
   * --------------------------------------------------
   * 14. Détermination du motif du blocage
   * --------------------------------------------------
   */
  let reason =
    "no_subscription";

  if (subscription) {
    const status =
      subscription.status?.toLowerCase() ??
      "";

    if (
      status === "trial" ||
      status === "trialing"
    ) {
      reason = isFutureDate(
        subscription.trial_ends_at,
      )
        ? "trial"
        : "trial_expired";
    } else if (
      status === "active" ||
      status === "paid"
    ) {
      reason = isFutureDate(
        subscription.expires_at,
      )
        ? "active"
        : "expired";
    } else if (
      status === "past_due"
    ) {
      reason = "past_due";
    } else if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      reason = "cancelled";
    } else if (
      status === "suspended"
    ) {
      reason = "suspended";
    } else {
      reason = "expired";
    }
  }

  /*
   * --------------------------------------------------
   * 15. Blocage sans déconnexion
   * --------------------------------------------------
   */
  return redirectToSubscription(
    request,
    reason,
  );
}

/*
 * ----------------------------------------------------
 * Next.js Proxy Matcher
 * ----------------------------------------------------
 *
 * On exclut :
 * - API
 * - _next
 * - fichiers statiques
 * - favicon
 * - images
 * - robots
 * - sitemap
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};