import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

/**
 * ============================================================
 * PHARMAFLOW — MIDDLEWARE GLOBAL
 * ============================================================
 *
 * RESPONSABILITÉS
 *
 * 1. Routes publiques
 * 2. API publiques
 * 3. Authentification Supabase
 * 4. Super Admin
 * 5. Agent plateforme
 * 6. Profils pharmacie
 * 7. Autorisation par rôle
 * 8. Statut administratif pharmacie
 * 9. Accès manuel accordé par Super Admin
 * 10. Abonnement actif / essai valide
 * 11. Blocage si abonnement expiré
 *
 * IMPORTANT :
 *
 * Le middleware ne déconnecte jamais automatiquement
 * l'utilisateur lorsqu'un abonnement expire.
 * ============================================================
 */

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type ProfileRow = {
  id: string;
  role: string | null;
  pharmacy_id: string | null;
};

type PharmacyRow = {
  id: string;
  status: string | null;
  manual_access_enabled: boolean | null;
  manual_access_until: string | null;
};

type SubscriptionRow = {
  id: string;
  pharmacy_id: string;
  plan_id: string;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  created_at?: string | null;
};

/**
 * ============================================================
 * ROUTES PUBLIQUES
 * ============================================================
 */

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/support",
  "/confidentialite",
  "/conditions",
  "/abonnement",
];

/**
 * ============================================================
 * API PUBLIQUES
 * ============================================================
 *
 * IMPORTANT :
 *
 * /api/inscription est l'endpoint réellement utilisé
 * par la page /register.
 *
 * Il doit rester accessible sans session Supabase.
 * ============================================================
 */

const PUBLIC_API_ROUTES = [
  "/api/auth/platform-access",
  "/api/auth/inscription",
  "/api/inscription",
  "/api/subscription/status",
  "/api/support/ai",
  "/api/support/tickets",
];

/**
 * ============================================================
 * ESPACES PHARMACIE
 * ============================================================
 */

const PHARMACY_MODULES = [
  "/dashboard",
  "/admin",
  "/pharmacien",
  "/caisse",
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
];

/**
 * ============================================================
 * ROUTE PUBLIQUE ?
 * ============================================================
 */

function isPublicRoute(
  pathname: string,
): boolean {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
}

/**
 * ============================================================
 * API PUBLIQUE ?
 * ============================================================
 */

function isPublicApi(
  pathname: string,
): boolean {
  return PUBLIC_API_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
}

/**
 * ============================================================
 * ROUTE PHARMACIE ?
 * ============================================================
 */

function isPharmacyRoute(
  pathname: string,
): boolean {
  return PHARMACY_MODULES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
}

/**
 * ============================================================
 * HOME SELON LE RÔLE
 * ============================================================
 */

function getRoleHome(
  role: string,
): string {
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
   * OWNER
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
    pathname.startsWith("/employe/") ||
    pathname === "/employee" ||
    pathname.startsWith("/employee/")
  ) {
    return (
      role === "owner" ||
      role === "employee"
    );
  }

  /**
   * ----------------------------------------------------------
   * MODULES
   * ----------------------------------------------------------
   */

  if (
    pathname === "/produits" ||
    pathname.startsWith("/produits/") ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/stock" ||
    pathname.startsWith("/stock/") ||
    pathname === "/ventes" ||
    pathname.startsWith("/ventes/") ||
    pathname === "/utilisateurs" ||
    pathname.startsWith("/utilisateurs/") ||
    pathname === "/rapports" ||
    pathname.startsWith("/rapports/") ||
    pathname === "/paiements" ||
    pathname.startsWith("/paiements/") ||
    pathname === "/parametres" ||
    pathname.startsWith("/parametres/")
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

/**
 * ============================================================
 * DATE FUTURE
 * ============================================================
 */

function isFutureDate(
  value: string | null,
): boolean {
  if (!value) {
    return false;
  }

  const timestamp =
    new Date(value).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp > Date.now()
  );
}

/**
 * ============================================================
 * ACCÈS MANUEL
 * ============================================================
 */

function hasManualAccess(
  pharmacy: PharmacyRow,
): boolean {
  return (
    pharmacy.manual_access_enabled === true &&
    isFutureDate(
      pharmacy.manual_access_until,
    )
  );
}

/**
 * ============================================================
 * ABONNEMENT VALIDE
 * ============================================================
 */

function hasValidSubscription(
  subscription:
    | SubscriptionRow
    | null,
): boolean {
  if (!subscription) {
    return false;
  }

  const status =
    String(
      subscription.status || "",
    )
      .trim()
      .toLowerCase();

  /**
   * ESSAI GRATUIT
   */

  if (
    status === "trial" ||
    status === "trialing"
  ) {
    return isFutureDate(
      subscription.trial_ends_at ||
        subscription.expires_at,
    );
  }

  /**
   * ABONNEMENT PAYÉ
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
 * ============================================================
 * REDIRECTION LOGIN
 * ============================================================
 */

function redirectToLogin(
  request: NextRequest,
) {
  const url =
    request.nextUrl.clone();

  url.pathname = "/login";

  url.search = "";

  url.searchParams.set(
    "redirect",
    request.nextUrl.pathname,
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
 * ============================================================
 * REDIRECTION ABONNEMENT
 * ============================================================
 */

function redirectToSubscription(
  request: NextRequest,
  reason: string,
) {
  const url =
    request.nextUrl.clone();

  url.pathname = "/abonnement";

  url.search = "";

  url.searchParams.set(
    "reason",
    reason,
  );

  url.searchParams.set(
    "redirect",
    request.nextUrl.pathname,
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
   * 1. API PUBLIQUE
   * ==========================================================
   *
   * IMPORTANT :
   *
   * Cette condition est exécutée AVANT toute tentative
   * d'authentification Supabase.
   *
   * Cela empêche notamment /api/inscription d'être redirigé
   * vers /login lorsqu'il n'existe pas encore de session.
   */

  if (isPublicApi(pathname)) {
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
   * 2. ROUTE PUBLIQUE
   * ==========================================================
   */

  if (isPublicRoute(pathname)) {
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
   * 3. CLIENT SUPABASE
   * ==========================================================
   */

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  /**
   * Si les variables publiques Supabase ne sont pas présentes,
   * on ne tente pas d'appeler Supabase avec des valeurs
   * undefined.
   */

  if (
    !supabaseUrl ||
    !supabasePublishableKey
  ) {
    console.error(
      "PharmaFlow middleware: variables Supabase manquantes.",
    );

    return redirectToLogin(
      request,
    );
  }

  let response =
    NextResponse.next({
      request,
    });

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
              }) => {
                request.cookies.set(
                  name,
                  value,
                );
              },
            );

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
   * 4. AUTHENTIFICATION
   * ==========================================================
   */

  const {
    data: {
      user,
    },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !user
  ) {
    return redirectToLogin(
      request,
    );
  }

  /**
   * ==========================================================
   * 5. SUPER ADMIN
   * ==========================================================
   */

  if (
    pathname.startsWith(
      "/super-admin",
    )
  ) {
    return response;
  }

  /**
   * ==========================================================
   * 6. AGENT PLATEFORME
   * ==========================================================
   */

  if (
    pathname.startsWith(
      "/agent",
    )
  ) {
    return response;
  }

  /**
   * ==========================================================
   * 7. SI CE N'EST PAS UNE ROUTE PHARMACIE
   * ==========================================================
   */

  if (
    !isPharmacyRoute(pathname)
  ) {
    return response;
  }

  /**
   * ==========================================================
   * 8. PROFIL PHARMACIE
   * ==========================================================
   */

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "id, role, pharmacy_id",
      )
      .eq(
        "id",
        user.id,
      )
      .maybeSingle<ProfileRow>();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "PharmaFlow profile error:",
      profileError,
    );

    return redirectToLogin(
      request,
    );
  }

  /**
   * ==========================================================
   * 9. PHARMACY_ID
   * ==========================================================
   */

  if (
    !profile.pharmacy_id
  ) {
    return redirectToSubscription(
      request,
      "no_pharmacy",
    );
  }

  /**
   * ==========================================================
   * 10. RÔLE
   * ==========================================================
   */

  const role =
    String(
      profile.role || "",
    )
      .trim()
      .toLowerCase();

  /**
   * ==========================================================
   * 11. AUTORISATION DU RÔLE
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

    return NextResponse.redirect(
      new URL(
        roleHome,
        request.url,
      ),
    );
  }

  /**
   * ==========================================================
   * 12. RÉCUPÉRER LA PHARMACIE
   * ==========================================================
   */

  const {
    data: pharmacy,
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
      .maybeSingle<PharmacyRow>();

  if (
    pharmacyError ||
    !pharmacy
  ) {
    console.error(
      "PharmaFlow pharmacy error:",
      pharmacyError,
    );

    return redirectToSubscription(
      request,
      "pharmacy_not_found",
    );
  }

  /**
   * ==========================================================
   * 13. STATUT ADMINISTRATIF
   * ==========================================================
   */

  const pharmacyStatus =
    String(
      pharmacy.status || "",
    )
      .trim()
      .toLowerCase();

  if (
    pharmacyStatus ===
    "inactive"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_inactive",
    );
  }

  if (
    pharmacyStatus ===
    "suspended"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_suspended",
    );
  }

  if (
    pharmacyStatus !==
    "active"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_inactive",
    );
  }

  /**
   * ==========================================================
   * 14. ACCÈS MANUEL SUPER ADMIN
   * ==========================================================
   */

  if (
    hasManualAccess(
      pharmacy,
    )
  ) {
    return response;
  }

  /**
   * ==========================================================
   * 15. DERNIER ABONNEMENT
   * ==========================================================
   */

  const {
    data: subscriptions,
    error:
      subscriptionError,
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
          expires_at,
          created_at
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
      .limit(1);

  if (
    subscriptionError
  ) {
    console.error(
      "PharmaFlow subscription error:",
      subscriptionError,
    );

    return redirectToSubscription(
      request,
      "verification",
    );
  }

  const subscription =
    subscriptions &&
    subscriptions.length > 0
      ? (subscriptions[0] as SubscriptionRow)
      : null;

  /**
   * ==========================================================
   * 16. ABONNEMENT VALIDE
   * ==========================================================
   */

  if (
    hasValidSubscription(
      subscription,
    )
  ) {
    return response;
  }

  /**
   * ==========================================================
   * 17. ABONNEMENT EXPIRÉ / INVALIDE
   * ==========================================================
   */

  let reason =
    "expired";

  if (!subscription) {
    reason =
      "no_subscription";
  } else {
    const status =
      String(
        subscription.status || "",
      )
        .trim()
        .toLowerCase();

    if (
      status === "trial" ||
      status === "trialing"
    ) {
      reason =
        "trial_expired";
    } else if (
      status === "past_due"
    ) {
      reason =
        "past_due";
    } else if (
      status === "cancelled"
    ) {
      reason =
        "cancelled";
    } else if (
      status === "suspended"
    ) {
      reason =
        "suspended";
    }
  }

  /**
   * IMPORTANT :
   *
   * Ne jamais faire :
   *
   * await supabase.auth.signOut()
   *
   * L'utilisateur reste connecté.
   */

  return redirectToSubscription(
    request,
    reason,
  );
}

/**
 * ============================================================
 * MATCHER
 * ============================================================
 *
 * Le middleware peut intercepter les API, mais les API
 * déclarées dans PUBLIC_API_ROUTES sont immédiatement
 * autorisées avant toute vérification de session.
 *
 * Cela permet notamment à :
 *
 * /api/inscription
 *
 * de fonctionner sans utilisateur connecté.
 * ============================================================
 */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};