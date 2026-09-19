import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

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

type PharmacyRow = {
  id: string;
  status: string | null;
  manual_access_enabled: boolean | null;
  manual_access_until: string | null;
};

/**
 * ============================================================
 * ROUTES PUBLIQUES
 * ============================================================
 *
 * Ces pages restent accessibles sans abonnement.
 *
 * IMPORTANT :
 *
 * /abonnement reste accessible lorsque :
 *
 * - l'abonnement est expiré
 * - la pharmacie est inactive
 * - la pharmacie est suspendue
 *
 * afin que l'utilisateur puisse voir la raison du blocage
 * et régulariser sa situation.
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
 * ESPACES PHARMACIE PROTÉGÉS
 * ============================================================
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/employe",
  "/products",
  "/stock",
  "/ventes",
  "/utilisateurs",
  "/rapports",
  "/paiements",
  "/parametres",
  "/caisse",
  "/pharmacien",
];

/**
 * ============================================================
 * ROUTE PUBLIQUE
 * ============================================================
 */

function isPublicPath(
  pathname: string,
): boolean {
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
 * ROUTE PROTÉGÉE
 * ============================================================
 */

function isProtectedPath(
  pathname: string,
): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );
}

/**
 * ============================================================
 * DATE FUTURE
 * ============================================================
 */

function isValidFutureDate(
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
 * VÉRIFIER L'ABONNEMENT
 * ============================================================
 */

function subscriptionAllowsAccess(
  subscription: SubscriptionRow | null,
): boolean {
  if (!subscription) {
    return false;
  }

  const status = String(
    subscription.status || "",
  )
    .trim()
    .toLowerCase();

  /**
   * ----------------------------------------------------------
   * ESSAI GRATUIT
   * ----------------------------------------------------------
   */

  if (
    status === "trial" ||
    status === "trialing"
  ) {
    return isValidFutureDate(
      subscription.trial_ends_at ||
        subscription.expires_at,
    );
  }

  /**
   * ----------------------------------------------------------
   * ABONNEMENT PAYANT
   * ----------------------------------------------------------
   */

  if (
    status === "active" ||
    status === "paid"
  ) {
    return isValidFutureDate(
      subscription.expires_at,
    );
  }

  return false;
}

/**
 * ============================================================
 * ACCÈS MANUEL SUPER ADMIN
 * ============================================================
 */

function manualAccessAllowsAccess(
  pharmacy: PharmacyRow | null,
): boolean {
  if (!pharmacy) {
    return false;
  }

  if (
    pharmacy.manual_access_enabled !==
    true
  ) {
    return false;
  }

  return isValidFutureDate(
    pharmacy.manual_access_until,
  );
}

/**
 * ============================================================
 * COPIER LES COOKIES SUPABASE
 * ============================================================
 *
 * IMPORTANT :
 *
 * Lorsque getClaims() rafraîchit la session, Supabase peut
 * modifier les cookies.
 *
 * Si nous faisons ensuite une redirection, nous devons
 * transférer ces cookies vers la nouvelle réponse.
 */

function copySupabaseResponseCookies(
  from: NextResponse,
  to: NextResponse,
): NextResponse {
  const cookies =
    from.cookies.getAll();

  cookies.forEach((cookie) => {
    to.cookies.set(
      cookie.name,
      cookie.value,
    );
  });

  /**
   * Conserver également les headers de cache liés à
   * l'authentification lorsqu'ils existent.
   */

  for (const header of [
    "cache-control",
    "expires",
    "pragma",
  ]) {
    const value =
      from.headers.get(header);

    if (value) {
      to.headers.set(
        header,
        value,
      );
    }
  }

  return to;
}

/**
 * ============================================================
 * REDIRECTION ABONNEMENT
 * ============================================================
 *
 * IMPORTANT :
 *
 * L'utilisateur reste connecté.
 */

function redirectToSubscription(
  request: NextRequest,
  reason: string,
  supabaseResponse?: NextResponse,
) {
  const url =
    request.nextUrl.clone();

  url.pathname =
    "/abonnement";

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
    NextResponse.redirect(
      url,
    );

  /**
   * Conserver les cookies Supabase.
   */

  if (supabaseResponse) {
    return copySupabaseResponseCookies(
      supabaseResponse,
      response,
    );
  }

  return response;
}

/**
 * ============================================================
 * REDIRECTION LOGIN
 * ============================================================
 */

function redirectToLogin(
  request: NextRequest,
  supabaseResponse?: NextResponse,
) {
  const url =
    request.nextUrl.clone();

  url.pathname =
    "/login";

  url.search = "";

  url.searchParams.set(
    "redirect",
    request.nextUrl.pathname,
  );

  const response =
    NextResponse.redirect(
      url,
    );

  if (supabaseResponse) {
    return copySupabaseResponseCookies(
      supabaseResponse,
      response,
    );
  }

  return response;
}

/**
 * ============================================================
 * PROXY
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

  if (
    isPublicPath(pathname)
  ) {
    return NextResponse.next();
  }

  /**
   * ==========================================================
   * 2. ROUTES NON PROTÉGÉES
   * ==========================================================
   *
   * Les API possèdent leur propre authentification.
   *
   * Le Super Admin possède également son propre système
   * d'autorisation.
   */

  if (
    !isProtectedPath(pathname)
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
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
   * 4. VÉRIFIER LA SESSION
   * ==========================================================
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
    return redirectToLogin(
      request,
      supabaseResponse,
    );
  }

  /**
   * ==========================================================
   * 5. IDENTIFIANT UTILISATEUR
   * ==========================================================
   */

  const userId =
    typeof claimsData.claims.sub ===
    "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    return redirectToLogin(
      request,
      supabaseResponse,
    );
  }

  /**
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
        "id, pharmacy_id, role",
      )
      .eq(
        "id",
        userId,
      )
      .maybeSingle<ProfileRow>();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "PharmaFlow proxy profile error:",
      profileError,
    );

    return redirectToLogin(
      request,
      supabaseResponse,
    );
  }

  /**
   * ==========================================================
   * 7. RÔLES PLATEFORME
   * ==========================================================
   *
   * Ces rôles ne dépendent pas de l'abonnement d'une
   * pharmacie.
   */

  const role =
    String(
      profile.role || "",
    )
      .trim()
      .toLowerCase();

  if (
    role === "super_admin" ||
    role === "platform_admin"
  ) {
    return supabaseResponse;
  }

  /**
   * ==========================================================
   * 8. PHARMACIE ASSOCIÉE
   * ==========================================================
   */

  if (
    !profile.pharmacy_id
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_not_found",
      supabaseResponse,
    );
  }

  /**
   * ==========================================================
   * 9. RÉCUPÉRER LA PHARMACIE
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
      "PharmaFlow proxy pharmacy error:",
      pharmacyError,
    );

    return redirectToSubscription(
      request,
      "pharmacy_not_found",
      supabaseResponse,
    );
  }

  /**
   * ==========================================================
   * 10. STATUT ADMINISTRATIF
   * ==========================================================
   *
   * ACTIVE
   *   → peut continuer
   *
   * INACTIVE
   *   → accès bloqué
   *
   * SUSPENDED
   *   → accès bloqué
   *
   * IMPORTANT :
   *
   * Aucune déconnexion.
   */

  const pharmacyStatus =
    String(
      pharmacy.status || "",
    )
      .trim()
      .toLowerCase();

  /**
   * PHARMACIE DÉSACTIVÉE
   */

  if (
    pharmacyStatus ===
    "inactive"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_inactive",
      supabaseResponse,
    );
  }

  /**
   * PHARMACIE SUSPENDUE
   */

  if (
    pharmacyStatus ===
    "suspended"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_suspended",
      supabaseResponse,
    );
  }

  /**
   * STATUT INCONNU
   */

  if (
    pharmacyStatus !==
    "active"
  ) {
    return redirectToSubscription(
      request,
      "pharmacy_inactive",
      supabaseResponse,
    );
  }

  /**
   * ==========================================================
   * 11. ACCÈS MANUEL
   * ==========================================================
   *
   * L'accès manuel ne fonctionne QUE si la pharmacie est
   * active.
   *
   * Le statut a déjà été vérifié juste au-dessus.
   */

  const hasManualAccess =
    manualAccessAllowsAccess(
      pharmacy,
    );

  if (
    hasManualAccess
  ) {
    return supabaseResponse;
  }

  /**
   * ==========================================================
   * 12. DERNIER ABONNEMENT
   * ==========================================================
   */

  const {
    data: subscription,
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
   * 13. ERREUR DE VÉRIFICATION
   * ==========================================================
   */

  if (
    subscriptionError
  ) {
    console.error(
      "PharmaFlow proxy subscription error:",
      subscriptionError,
    );

    return redirectToSubscription(
      request,
      "verification",
      supabaseResponse,
    );
  }

  /**
   * ==========================================================
   * 14. ABONNEMENT VALIDE
   * ==========================================================
   */

  const hasSubscriptionAccess =
    subscriptionAllowsAccess(
      subscription,
    );

  if (
    hasSubscriptionAccess
  ) {
    return supabaseResponse;
  }

  /**
   * ==========================================================
   * 15. DÉTERMINER LA RAISON
   * ==========================================================
   */

  let reason =
    "expired";

  if (!subscription) {
    reason =
      "no_subscription";
  } else {
    const subscriptionStatus =
      String(
        subscription.status || "",
      )
        .trim()
        .toLowerCase();

    if (
      subscriptionStatus ===
      "past_due"
    ) {
      reason =
        "past_due";
    } else if (
      subscriptionStatus ===
      "suspended"
    ) {
      reason =
        "suspended";
    } else if (
      subscriptionStatus ===
      "cancelled"
    ) {
      reason =
        "cancelled";
    } else if (
      subscriptionStatus ===
        "trial" ||
      subscriptionStatus ===
        "trialing"
    ) {
      reason =
        "trial_expired";
    }
  }

  /**
   * ==========================================================
   * 16. ACCÈS REFUSÉ
   * ==========================================================
   *
   * IMPORTANT :
   *
   * Aucun signOut.
   *
   * La session reste active.
   */

  return redirectToSubscription(
    request,
    reason,
    supabaseResponse,
  );
}

/**
 * ============================================================
 * CONFIGURATION NEXT.JS 16
 * ============================================================
 */

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};