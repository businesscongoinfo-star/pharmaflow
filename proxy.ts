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

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/abonnement",
];

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

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_PATHS.some((path) => {
    return (
      pathname === path ||
      pathname.startsWith(`${path}/`)
    );
  });
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => {
    return (
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
    );
  });
}

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

  // ------------------------------------------------------------
  // ESSAI GRATUIT
  // ------------------------------------------------------------

  if (status === "trial") {
    return isValidFutureDate(
      subscription.trial_ends_at ||
        subscription.expires_at,
    );
  }

  // ------------------------------------------------------------
  // ABONNEMENT PAYANT
  // ------------------------------------------------------------

  if (status === "active") {
    return isValidFutureDate(
      subscription.expires_at,
    );
  }

  // ------------------------------------------------------------
  // TOUS LES AUTRES STATUTS
  // ------------------------------------------------------------

  return false;
}

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

  return NextResponse.redirect(url);
}

export async function proxy(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname;

  // ------------------------------------------------------------
  // 1. IGNORER LES ROUTES PUBLIQUES
  // ------------------------------------------------------------

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ------------------------------------------------------------
  // 2. IGNORER LES ROUTES QUI NE SONT PAS DES ESPACES
  // ------------------------------------------------------------
  //
  // Les API possèdent leurs propres contrôles d'authentification.
  // Le Proxy ne doit pas intercepter leurs réponses JSON.
  // ------------------------------------------------------------

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // ------------------------------------------------------------
  // 3. CLIENT SUPABASE SSR
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // 4. VÉRIFICATION DE LA SESSION
  // ------------------------------------------------------------
  //
  // Supabase recommande getClaims() pour protéger les pages
  // côté serveur.
  // ------------------------------------------------------------

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
    );
  }

  const userId =
    typeof claimsData.claims.sub ===
    "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    return redirectToLogin(
      request,
    );
  }

  // ------------------------------------------------------------
  // 5. RÉCUPÉRER LE PROFIL
  // ------------------------------------------------------------

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

  if (
    profileError ||
    !profile ||
    !profile.pharmacy_id
  ) {
    return redirectToLogin(
      request,
    );
  }

  // ------------------------------------------------------------
  // 6. RÉCUPÉRER LE DERNIER ABONNEMENT
  // ------------------------------------------------------------
  //
  // IMPORTANT :
  // pharmacy_id vient du profil authentifié.
  //
  // Le navigateur ne peut pas envoyer un pharmacy_id arbitraire
  // pour contourner l'isolation entre pharmacies.
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // 7. ERREUR DE VÉRIFICATION
  // ------------------------------------------------------------
  //
  // On ne laisse pas le Proxy inventer un abonnement.
  //
  // Les API et pages serveur continueront également à vérifier
  // l'abonnement.
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // 8. VÉRIFICATION DE L'ABONNEMENT
  // ------------------------------------------------------------

  const hasAccess =
    subscriptionAllowsAccess(
      subscription,
    );

  // ------------------------------------------------------------
  // 9. ABONNEMENT EXPIRÉ / ABSENT
  // ------------------------------------------------------------

  if (!hasAccess) {
    let reason = "expired";

    if (!subscription) {
      reason = "no_subscription";
    } else {
      const status = String(
        subscription.status || "",
      )
        .trim()
        .toLowerCase();

      if (status === "past_due") {
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

  // ------------------------------------------------------------
  // 10. ACCÈS AUTORISÉ
  // ------------------------------------------------------------

  return supabaseResponse;
}

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

  return NextResponse.redirect(
    url,
  );
}

// ------------------------------------------------------------
// MATCHER NEXT.JS 16
// ------------------------------------------------------------
//
// Le Proxy ignore :
// - fichiers statiques
// - images Next.js
// - favicon
// - API
//
// Les routes API disposent de leur propre authentification.
// ------------------------------------------------------------

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};