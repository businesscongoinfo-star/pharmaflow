import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

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
 * PHARMAFLOW — ROUTES PUBLIQUES
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
 * PHARMAFLOW — ROUTES PROTÉGÉES
 * ============================================================
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
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
 * UTILITAIRES
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

function isProtectedPath(
  pathname: string,
): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );
}

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

  if (status === "trial") {
    return isValidFutureDate(
      subscription.trial_ends_at ??
        subscription.expires_at,
    );
  }

  if (status === "active") {
    return isValidFutureDate(
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

  return NextResponse.redirect(url);
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

  return NextResponse.redirect(url);
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
   * ----------------------------------------------------------
   * 1. ROUTES PUBLIQUES
   * ----------------------------------------------------------
   */

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  /**
   * ----------------------------------------------------------
   * 2. ROUTES NON PROTÉGÉES
   * ----------------------------------------------------------
   *
   * Les API sont déjà exclues par le matcher ci-dessous.
   */

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  /**
   * ----------------------------------------------------------
   * 3. VÉRIFICATION DES VARIABLES
   * ----------------------------------------------------------
   */

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !supabaseUrl ||
    !supabasePublishableKey
  ) {
    console.error(
      "PHARMAFLOW PROXY: variables Supabase manquantes.",
    );

    return redirectToLogin(request);
  }

  /**
   * ----------------------------------------------------------
   * 4. CLIENT SUPABASE SSR
   * ----------------------------------------------------------
   */

  let supabaseResponse =
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
   * ----------------------------------------------------------
   * 5. SESSION SUPABASE
   * ----------------------------------------------------------
   */

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  /**
   * ----------------------------------------------------------
   * 6. SESSION INVALIDE / EXPIRÉE
   * ----------------------------------------------------------
   *
   * IMPORTANT :
   * On ne laisse pas une erreur de refresh token casser
   * toute l'application.
   */

  if (
    claimsError ||
    !claimsData?.claims
  ) {
    if (claimsError) {
      console.warn(
        "PHARMAFLOW PROXY AUTH:",
        claimsError.message,
      );
    }

    return redirectToLogin(request);
  }

  const userId =
    typeof claimsData.claims.sub ===
    "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    return redirectToLogin(request);
  }

  /**
   * ----------------------------------------------------------
   * 7. PROFIL
   * ----------------------------------------------------------
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
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

  if (
    profileError ||
    !profile ||
    !profile.pharmacy_id
  ) {
    if (profileError) {
      console.error(
        "PHARMAFLOW PROXY PROFILE:",
        profileError.message,
      );
    }

    return redirectToLogin(request);
  }

  /**
   * ----------------------------------------------------------
   * 8. ABONNEMENT
   * ----------------------------------------------------------
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
   * ----------------------------------------------------------
   * 9. ERREUR ABONNEMENT
   * ----------------------------------------------------------
   */

  if (subscriptionError) {
    console.error(
      "PHARMAFLOW PROXY SUBSCRIPTION:",
      subscriptionError.message,
    );

    return redirectToSubscription(
      request,
      "verification",
    );
  }

  /**
   * ----------------------------------------------------------
   * 10. CONTRÔLE DE L'ABONNEMENT
   * ----------------------------------------------------------
   */

  const hasAccess =
    subscriptionAllowsAccess(
      subscription,
    );

  if (!hasAccess) {
    let reason = "expired";

    if (!subscription) {
      reason = "no_subscription";
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
        reason = "past_due";
      } else if (
        status === "suspended"
      ) {
        reason = "suspended";
      } else if (
        status === "cancelled"
      ) {
        reason = "cancelled";
      } else if (
        status === "trial"
      ) {
        reason = "trial_expired";
      }
    }

    return redirectToSubscription(
      request,
      reason,
    );
  }

  /**
   * ----------------------------------------------------------
   * 11. ACCÈS AUTORISÉ
   * ----------------------------------------------------------
   */

  return supabaseResponse;
}

/**
 * ============================================================
 * NEXT.JS 16 — MATCHER
 * ============================================================
 *
 * IMPORTANT :
 *
 * "api" est exclu.
 *
 * Donc :
 *
 * /api/inscription
 * /api/payments/*
 * /api/support/*
 *
 * ne passent PAS dans ce Proxy.
 * ============================================================
 */

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};