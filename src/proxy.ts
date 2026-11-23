import { createServerClient } from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  canAccessPath,
  getRoleHome,
  isPharmacyRoute,
  isPharmaFlowRole,
  normalizeRole,
} from "./app/lib/auth/route-access";

/**
 * ============================================================
 * PHARMAFLOW — PROXY GLOBAL (Next.js 16)
 * ============================================================
 *
 * RESPONSABILITÉS
 *
 * 1. Routes publiques
 * 2. Authentification Supabase (rafraîchissement des cookies)
 * 3. Super Admin / Agent plateforme (session obligatoire)
 * 4. Profil pharmacie
 * 5. Autorisation par rôle
 * 6. Statut administratif de la pharmacie
 * 7. Accès manuel accordé par le Super Admin
 * 8. Abonnement actif / essai valide
 *
 * IMPORTANT
 *
 * - Les routes /api sont exclues du matcher : chaque route API
 *   gère elle-même son authentification. Cela évite notamment de
 *   rediriger les webhooks de paiement (appelés sans session) vers
 *   /login.
 * - Le Proxy ne déconnecte jamais automatiquement l'utilisateur
 *   lorsqu'un abonnement expire : il le redirige vers /abonnement.
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
  "/abonnement",
  "/support",
  /*
   * /invitation : le lien d'invitation Supabase transporte le
   * jeton dans le fragment d'URL. La session n'existe donc pas
   * encore au moment où le Proxy reçoit la requête : sans cette
   * exception, l'utilisateur invité était renvoyé vers /login.
   */
  "/invitation",
  "/comment-ca-marche",
  "/confidentialite",
  "/conditions",
];

/**
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
}

function isFutureDate(
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

function hasManualAccess(
  pharmacy: PharmacyRow,
): boolean {
  return (
    pharmacy.manual_access_enabled === true &&
    isFutureDate(pharmacy.manual_access_until)
  );
}

function hasValidSubscription(
  subscription: SubscriptionRow | null,
): boolean {
  if (!subscription) {
    return false;
  }

  const status = String(subscription.status ?? "")
    .trim()
    .toLowerCase();

  if (status === "trial" || status === "trialing") {
    return isFutureDate(
      subscription.trial_ends_at ??
        subscription.expires_at,
    );
  }

  if (status === "active" || status === "paid") {
    return isFutureDate(subscription.expires_at);
  }

  return false;
}

function withNoStore<T extends NextResponse>(
  response: T,
): T {
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0",
  );

  return response;
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();

  url.pathname = "/login";
  url.search = "";
  url.searchParams.set(
    "redirect",
    request.nextUrl.pathname,
  );

  return withNoStore(NextResponse.redirect(url));
}

function redirectToSubscription(
  request: NextRequest,
  reason: string,
) {
  const url = request.nextUrl.clone();

  url.pathname = "/abonnement";
  url.search = "";
  url.searchParams.set("reason", reason);
  url.searchParams.set(
    "redirect",
    request.nextUrl.pathname,
  );

  return withNoStore(NextResponse.redirect(url));
}

/**
 * ============================================================
 * PROXY
 * ============================================================
 */

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /**
   * ----------------------------------------------------------
   * 1. ROUTES PUBLIQUES
   * ----------------------------------------------------------
   */

  if (isPublicRoute(pathname)) {
    return withNoStore(
      NextResponse.next({ request }),
    );
  }

  /**
   * ----------------------------------------------------------
   * 2. CONFIGURATION SUPABASE
   * ----------------------------------------------------------
   */

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "PHARMAFLOW PROXY : NEXT_PUBLIC_SUPABASE_URL ou la clé publique Supabase est manquante.",
    );

    return redirectToLogin(request);
  }

  /**
   * ----------------------------------------------------------
   * 3. CLIENT SUPABASE SSR
   * ----------------------------------------------------------
   */

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
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
   * ----------------------------------------------------------
   * 4. AUTHENTIFICATION
   * ----------------------------------------------------------
   */

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirectToLogin(request);
  }

  /**
   * ----------------------------------------------------------
   * 5. SUPER ADMIN & AGENT PLATEFORME
   * ----------------------------------------------------------
   *
   * Ces espaces ne dépendent pas d'une pharmacie ni d'un
   * abonnement. Le rôle est vérifié par les pages elles-mêmes
   * (requireSuperAdmin / requireAgent) et par les routes API.
   * ----------------------------------------------------------
   */

  if (
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/agent")
  ) {
    return response;
  }

  /**
   * ----------------------------------------------------------
   * 6. HORS ESPACE PHARMACIE
   * ----------------------------------------------------------
   */

  if (!isPharmacyRoute(pathname)) {
    return response;
  }

  /**
   * ----------------------------------------------------------
   * 7. PROFIL PHARMACIE
   * ----------------------------------------------------------
   */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, role, pharmacy_id")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) {
    console.error(
      "PHARMAFLOW PROXY — profil introuvable :",
      profileError,
    );

    return redirectToLogin(request);
  }

  if (!profile.pharmacy_id) {
    return redirectToSubscription(
      request,
      "no_pharmacy",
    );
  }

  /**
   * ----------------------------------------------------------
   * 8. RÔLE & AUTORISATION
   * ----------------------------------------------------------
   */

  const role = normalizeRole(profile.role);

  if (!isPharmaFlowRole(role)) {
    return redirectToLogin(request);
  }

  if (!canAccessPath(role, pathname)) {
    const roleHome = getRoleHome(role);

    if (pathname !== roleHome) {
      const url = request.nextUrl.clone();

      url.pathname = roleHome;
      url.search = "";
      url.searchParams.set(
        "error",
        "access_denied",
      );

      return withNoStore(NextResponse.redirect(url));
    }
  }

  /**
   * ----------------------------------------------------------
   * 9. PHARMACIE
   * ----------------------------------------------------------
   */

  const {
    data: pharmacy,
    error: pharmacyError,
  } = await supabase
    .from("pharmacies")
    .select(
      "id, status, manual_access_enabled, manual_access_until",
    )
    .eq("id", profile.pharmacy_id)
    .maybeSingle<PharmacyRow>();

  if (pharmacyError || !pharmacy) {
    console.error(
      "PHARMAFLOW PROXY — pharmacie introuvable :",
      pharmacyError,
    );

    return redirectToSubscription(
      request,
      "pharmacy_not_found",
    );
  }

  /**
   * ----------------------------------------------------------
   * 10. STATUT DE LA PHARMACIE
   * ----------------------------------------------------------
   */

  const pharmacyStatus = String(
    pharmacy.status ?? "",
  )
    .trim()
    .toLowerCase();

  if (pharmacyStatus === "suspended") {
    return redirectToSubscription(
      request,
      "pharmacy_suspended",
    );
  }

  if (pharmacyStatus !== "active") {
    return redirectToSubscription(
      request,
      "pharmacy_inactive",
    );
  }

  /**
   * ----------------------------------------------------------
   * 11. ACCÈS MANUEL (Super Admin)
   * ----------------------------------------------------------
   */

  if (hasManualAccess(pharmacy)) {
    return response;
  }

  /**
   * ----------------------------------------------------------
   * 12. DERNIER ABONNEMENT
   * ----------------------------------------------------------
   */

  const {
    data: subscriptions,
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
        expires_at,
        created_at
      `,
    )
    .eq("pharmacy_id", profile.pharmacy_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (subscriptionError) {
    console.error(
      "PHARMAFLOW PROXY — abonnement :",
      subscriptionError,
    );

    return redirectToSubscription(
      request,
      "verification",
    );
  }

  const subscription =
    subscriptions && subscriptions.length > 0
      ? (subscriptions[0] as SubscriptionRow)
      : null;

  /**
   * ----------------------------------------------------------
   * 13. ABONNEMENT VALIDE
   * ----------------------------------------------------------
   */

  if (hasValidSubscription(subscription)) {
    return response;
  }

  /**
   * ----------------------------------------------------------
   * 14. ABONNEMENT EXPIRÉ / INVALIDE
   * ----------------------------------------------------------
   *
   * IMPORTANT : aucune déconnexion automatique.
   * ----------------------------------------------------------
   */

  let reason = "expired";

  if (!subscription) {
    reason = "no_subscription";
  } else {
    const status = String(subscription.status ?? "")
      .trim()
      .toLowerCase();

    if (status === "past_due") {
      reason = "past_due";
    } else if (status === "suspended") {
      reason = "suspended";
    } else if (status === "cancelled") {
      reason = "cancelled";
    } else if (
      status === "trial" ||
      status === "trialing"
    ) {
      reason = "trial_expired";
    }
  }

  return redirectToSubscription(request, reason);
}

/**
 * ============================================================
 * MATCHER (Next.js 16)
 * ============================================================
 *
 * Les routes /api sont exclues : elles gèrent leur propre
 * authentification, et les webhooks de paiement doivent rester
 * accessibles sans session.
 * ============================================================
 */

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.png|robots.txt|sitemap.xml|og-image.png|file.svg|globe.svg|next.svg|window.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
