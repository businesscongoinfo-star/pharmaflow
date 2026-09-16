import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ============================================================
 * PHARMAFLOW — PROXY GLOBAL
 * ============================================================
 *
 * Responsabilités :
 *
 * - authentification Supabase
 * - protection des routes privées
 * - autorisation par rôle
 * - contrôle de l'abonnement
 * - accès Super Admin
 * - accès Agent plateforme
 *
 * IMPORTANT :
 *
 * L'expiration d'un abonnement NE déconnecte PAS l'utilisateur.
 *
 * L'utilisateur reste connecté et peut accéder à :
 *
 *     /abonnement
 *
 * afin de renouveler son abonnement.
 *
 * Après un paiement validé et un abonnement actif,
 * l'accès au logiciel est automatiquement restauré.
 * ============================================================
 */

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type SubscriptionRow = {
  id: string;
  pharmacy_id: string;
  plan_id: string;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
};

type ProfileRow = {
  id: string;
  pharmacy_id: string | null;
  role: string | null;
};

/**
 * ============================================================
 * ROUTES PUBLIQUES
 * ============================================================
 *
 * Ces routes restent accessibles sans abonnement.
 *
 * /abonnement est volontairement accessible afin qu'un
 * utilisateur dont l'abonnement est expiré puisse renouveler.
 * ============================================================
 */

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/abonnement",
];

/**
 * ============================================================
 * ESPACES PLATEFORME
 * ============================================================
 *
 * Super Admin et Agent plateforme ne dépendent pas de
 * pharmacy_id.
 *
 * Leur autorisation définitive est gérée par leur propre
 * système de sécurité.
 * ============================================================
 */

const PLATFORM_PREFIXES = [
  "/super-admin",
  "/agent",
];

/**
 * ============================================================
 * ROUTES PHARMACIE PROTÉGÉES
 * ============================================================
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
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
  "/admin",
  "/employe",
];

/**
 * ============================================================
 * VÉRIFIER ROUTE PUBLIQUE
 * ============================================================
 */

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  );
}

/**
 * ============================================================
 * VÉRIFIER ESPACE PLATEFORME
 * ============================================================
 */

function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );
}

/**
 * ============================================================
 * VÉRIFIER ROUTE PROTÉGÉE
 * ============================================================
 */

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );
}

/**
 * ============================================================
 * VÉRIFIER DATE FUTURE
 * ============================================================
 */

function isValidFutureDate(
  value: string | null,
): boolean {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp > Date.now()
  );
}

/**
 * ============================================================
 * VÉRIFIER VALIDITÉ ABONNEMENT
 * ============================================================
 *
 * TRIAL :
 *   trial_ends_at doit être dans le futur.
 *
 * ACTIVE :
 *   expires_at doit être dans le futur.
 *
 * Tout autre statut :
 *   accès refusé.
 *
 * IMPORTANT :
 *
 * Aucun signOut() ici.
 * ============================================================
 */

function subscriptionAllowsAccess(
  subscription: SubscriptionRow | null,
): boolean {
  if (!subscription) {
    return false;
  }

  const status = String(
    subscription.status ?? "",
  )
    .trim()
    .toLowerCase();

  /**
   * ----------------------------------------------------------
   * ESSAI GRATUIT
   * ----------------------------------------------------------
   */

  if (status === "trial") {
    return isValidFutureDate(
      subscription.trial_ends_at ??
        subscription.expires_at,
    );
  }

  /**
   * ----------------------------------------------------------
   * ABONNEMENT PAYANT ACTIF
   * ----------------------------------------------------------
   */

  if (status === "active") {
    return isValidFutureDate(
      subscription.expires_at,
    );
  }

  /**
   * ----------------------------------------------------------
   * AUTRES STATUTS
   * ----------------------------------------------------------
   */

  return false;
}

/**
 * ============================================================
 * PAGE D'ACCUEIL SELON LE RÔLE
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
 * AUTORISATION PAR RÔLE
 * ============================================================
 */

function isAllowedByRole(
  pathname: string,
  role: string,
): boolean {
  /**
   * ----------------------------------------------------------
   * DASHBOARD
   * ----------------------------------------------------------
   */

  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  ) {
    return role === "owner";
  }

  /**
   * ----------------------------------------------------------
   * ADMIN
   * ----------------------------------------------------------
   */

  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
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

  if (
    pathname === "/pharmacien" ||
    pathname.startsWith("/pharmacien/")
  ) {
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

  if (
    pathname === "/caisse" ||
    pathname.startsWith("/caisse/")
  ) {
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

  if (
    pathname === "/employe" ||
    pathname.startsWith("/employe/")
  ) {
    return (
      role === "owner" ||
      role === "employee"
    );
  }

  /**
   * ----------------------------------------------------------
   * MODULES PHARMACIE
   * ----------------------------------------------------------
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
  ];

  if (
    pharmacyModules.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`),
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
   * AUTRE ROUTE
   * ----------------------------------------------------------
   */

  return true;
}

/**
 * ============================================================
 * REDIRECTION VERS LOGIN
 * ============================================================
 */

function redirectToLogin(
  request: NextRequest,
) {
  const url = request.nextUrl.clone();

  url.pathname = "/login";
  url.search = "";

  url.searchParams.set(
    "redirect",
    request.nextUrl.pathname,
  );

  const response = NextResponse.redirect(url);

  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0",
  );

  return response;
}

/**
 * ============================================================
 * REDIRECTION VERS ABONNEMENT
 * ============================================================
 */

function redirectToSubscription(
  request: NextRequest,
  reason: string,
) {
  const url = request.nextUrl.clone();

  url.pathname = "/abonnement";
  url.search = "";

  url.searchParams.set(
    "reason",
    reason,
  );

  const response = NextResponse.redirect(url);

  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0",
  );

  return response;
}

/**
 * ============================================================
 * PROXY PRINCIPAL
 * ============================================================
 */

export async function proxy(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  /**
   * ==========================================================
   * 1. ROUTES PUBLIQUES
   * ==========================================================
   */

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  /**
   * ==========================================================
   * 2. ROUTES NON PROTÉGÉES
   * ==========================================================
   *
   * Les API disposent de leurs propres contrôles.
   *
   * Le Proxy ne transforme donc pas leurs réponses JSON.
   */

  if (
    !isProtectedPath(pathname) &&
    !isPlatformPath(pathname)
  ) {
    return NextResponse.next();
  }

  /**
   * ==========================================================
   * 3. CLIENT SUPABASE SSR
   * ==========================================================
   */

  let supabaseResponse =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value,
                );
              },
            );

            supabaseResponse =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                supabaseResponse.cookies.set(
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
   * 4. VÉRIFICATION DE SESSION SUPABASE
   * ==========================================================
   */

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

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

  /**
   * ==========================================================
   * 5. SUPER ADMIN / AGENT PLATEFORME
   * ==========================================================
   *
   * Ces espaces sont indépendants de pharmacy_id.
   */

  if (isPlatformPath(pathname)) {
    supabaseResponse.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return supabaseResponse;
  }

  /**
   * ==========================================================
   * 6. RÉCUPÉRER LE PROFIL PHARMACIE
   * ==========================================================
   */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, pharmacy_id, role",
    )
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  /**
   * ==========================================================
   * 7. PROFIL INTROUVABLE
   * ==========================================================
   *
   * IMPORTANT :
   *
   * On ne fait PAS signOut().
   *
   * La session Supabase reste intacte.
   */

  if (
    profileError ||
    !profile
  ) {
    return redirectToLogin(request);
  }

  /**
   * ==========================================================
   * 8. PHARMACY_ID
   * ==========================================================
   */

  if (!profile.pharmacy_id) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/login";
    url.search = "";

    url.searchParams.set(
      "error",
      "no_pharmacy",
    );

    const response =
      NextResponse.redirect(url);

    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return response;
  }

  /**
   * ==========================================================
   * 9. NORMALISER LE RÔLE
   * ==========================================================
   */

  const role = String(
    profile.role ?? "",
  )
    .trim()
    .toLowerCase();

  /**
   * ==========================================================
   * 10. AUTORISATION PAR RÔLE
   * ==========================================================
   */

  if (
    !isAllowedByRole(
      pathname,
      role,
    )
  ) {
    const roleHome =
      getRoleHome(role);

    /**
     * Rôle inconnu.
     */

    if (roleHome === "/login") {
      return redirectToLogin(request);
    }

    const response =
      NextResponse.redirect(
        new URL(
          roleHome,
          request.url,
        ),
      );

    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    return response;
  }

  /**
   * ==========================================================
   * 11. RÉCUPÉRER LE DERNIER ABONNEMENT
   * ==========================================================
   *
   * Le pharmacy_id vient exclusivement du profil authentifié.
   */

  const {
    data: subscription,
    error: subscriptionError,
  } = await supabase
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
      profile.pharmacy_id,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  /**
   * ==========================================================
   * 12. ERREUR DE VÉRIFICATION
   * ==========================================================
   *
   * En cas d'erreur, aucun accès au workspace.
   *
   * Mais la session reste active.
   */

  if (subscriptionError) {
    console.error(
      "PharmaFlow proxy subscription error:",
      subscriptionError,
    );

    return redirectToSubscription(
      request,
      "verification",
    );
  }

  /**
   * ==========================================================
   * 13. VÉRIFIER L'ABONNEMENT
   * ==========================================================
   */

  const hasAccess =
    subscriptionAllowsAccess(
      subscription,
    );

  /**
   * ==========================================================
   * 14. ABONNEMENT ABSENT / EXPIRÉ / INVALIDE
   * ==========================================================
   *
   * IMPORTANT :
   *
   * L'utilisateur reste connecté.
   *
   * Il est uniquement envoyé vers /abonnement.
   */

  if (!hasAccess) {
    let reason =
      "expired";

    if (!subscription) {
      reason =
        "no_subscription";
    } else {
      const status =
        String(
          subscription.status ?? "",
        )
          .trim()
          .toLowerCase();

      if (
        status === "past_due"
      ) {
        reason =
          "past_due";
      } else if (
        status === "suspended"
      ) {
        reason =
          "suspended";
      } else if (
        status === "cancelled"
      ) {
        reason =
          "cancelled";
      } else if (
        status === "trial"
      ) {
        reason =
          "trial_expired";
      }
    }

    return redirectToSubscription(
      request,
      reason,
    );
  }

  /**
   * ==========================================================
   * 15. ACCÈS AUTORISÉ
   * ==========================================================
   *
   * Conditions :
   *
   * ✓ session valide
   * ✓ profil valide
   * ✓ pharmacy_id valide
   * ✓ rôle autorisé
   * ✓ abonnement valide
   *
   * → accès accordé.
   */

  supabaseResponse.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0",
  );

  return supabaseResponse;
}

/**
 * ============================================================
 * MATCHER NEXT.JS 16
 * ============================================================
 *
 * Le Proxy ignore :
 *
 * - API
 * - fichiers statiques
 * - images Next.js
 * - favicon
 * - CSS
 * - JavaScript
 * - fichiers source maps
 * - fichiers texte/XML
 * ============================================================
 */

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};