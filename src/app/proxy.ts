import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* ==========================================================================
 * TYPES
 * ========================================================================== */

type UserRole =
  | "owner"
  | "admin"
  | "pharmacist"
  | "cashier"
  | "employee";

type Profile = {
  id: string;
  role: UserRole;
  pharmacy_id: string | null;
};

type Subscription = {
  id: string;
  pharmacy_id: string;
  plan_id: string;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  created_at?: string | null;
};

/* ==========================================================================
 * ROUTES PUBLIQUES
 * ========================================================================== */

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/abonnement",
];

/* ==========================================================================
 * ESPACES PAR RÔLE
 * ========================================================================== */

const ROLE_HOME: Record<UserRole, string> = {
  owner: "/dashboard",
  admin: "/admin",
  pharmacist: "/pharmacien",
  cashier: "/caisse",
  employee: "/employe",
};

/* ==========================================================================
 * ROUTES AVEC PERMISSIONS
 * ========================================================================== */

const ROUTE_PERMISSIONS: Record<string, string> = {
  "/products": "products.view",
  "/produits": "products.view",
  "/stock": "stock.view",
  "/ventes": "sales.view",
  "/utilisateurs": "users.view",
  "/rapports": "reports.view",
  "/paiements": "payments.view",
  "/parametres": "settings.view",
};

/* ==========================================================================
 * ROUTES NÉCESSITANT UN ABONNEMENT VALIDE
 * ========================================================================== */

const SUBSCRIPTION_PROTECTED_ROUTES = [
  "/dashboard",
  "/admin",
  "/products",
  "/produits",
  "/stock",
  "/ventes",
  "/utilisateurs",
  "/rapports",
  "/paiements",
  "/parametres",
  "/caisse",
  "/pharmacien",
  "/employe",
];

/* ==========================================================================
 * UTILITAIRES ROUTES
 * ========================================================================== */

/**
 * Vérifie qu'une URL correspond réellement à une route.
 *
 * /products       → true
 * /products/123   → true
 * /products-test  → false
 */
function matchesRoute(
  pathname: string,
  route: string
): boolean {
  return (
    pathname === route ||
    pathname.startsWith(`${route}/`)
  );
}

/**
 * Vérifie si la route nécessite un abonnement valide.
 */
function requiresValidSubscription(
  pathname: string
): boolean {
  return SUBSCRIPTION_PROTECTED_ROUTES.some(
    (route) =>
      matchesRoute(pathname, route)
  );
}

/**
 * Vérifie si la route est publique.
 */
function isPublicRoute(
  pathname: string
): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }

    return matchesRoute(
      pathname,
      route
    );
  });
}

/**
 * Détermine la permission requise pour une route.
 */
function getRequiredPermission(
  pathname: string
): string | null {
  for (const [
    route,
    permission,
  ] of Object.entries(
    ROUTE_PERMISSIONS
  )) {
    if (
      matchesRoute(
        pathname,
        route
      )
    ) {
      return permission;
    }
  }

  return null;
}

/* ==========================================================================
 * CONTRÔLE DES RÔLES
 * ========================================================================== */

function isRoleWorkspaceAllowed(
  pathname: string,
  role: UserRole
): boolean {
  /**
   * Dashboard propriétaire.
   */
  if (
    matchesRoute(
      pathname,
      "/dashboard"
    )
  ) {
    return role === "owner";
  }

  /**
   * Administration.
   *
   * Owner et admin peuvent accéder.
   */
  if (
    matchesRoute(
      pathname,
      "/admin"
    )
  ) {
    return (
      role === "owner" ||
      role === "admin"
    );
  }

  /**
   * Espace pharmacien.
   */
  if (
    matchesRoute(
      pathname,
      "/pharmacien"
    )
  ) {
    return role === "pharmacist";
  }

  /**
   * Espace caisse.
   */
  if (
    matchesRoute(
      pathname,
      "/caisse"
    )
  ) {
    return role === "cashier";
  }

  /**
   * Espace employé.
   */
  if (
    matchesRoute(
      pathname,
      "/employe"
    )
  ) {
    return role === "employee";
  }

  return true;
}

/* ==========================================================================
 * DATES / ABONNEMENT
 * ========================================================================== */

/**
 * Vérifie qu'une date est valide et future.
 */
function isValidFutureDate(
  value: string | null | undefined
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
 * Détermine si l'abonnement permet l'accès.
 *
 * IMPORTANT :
 * Cette fonction ne déconnecte jamais l'utilisateur.
 */
function subscriptionAllowsAccess(
  subscription: Subscription | null
): boolean {
  if (!subscription) {
    return false;
  }

  const status = String(
    subscription.status ?? ""
  )
    .trim()
    .toLowerCase();

  /**
   * Période d'essai.
   */
  if (
    status === "trial" ||
    status === "trialing"
  ) {
    return isValidFutureDate(
      subscription.trial_ends_at ??
        subscription.expires_at
    );
  }

  /**
   * Abonnement payé.
   */
  if (
    status === "active" ||
    status === "paid"
  ) {
    return isValidFutureDate(
      subscription.expires_at
    );
  }

  /**
   * Tout autre statut bloque l'espace
   * de travail.
   */
  return false;
}

/**
 * Détermine la raison du blocage.
 */
function getSubscriptionBlockReason(
  subscription: Subscription | null
): string {
  if (!subscription) {
    return "no_subscription";
  }

  const status = String(
    subscription.status ?? ""
  )
    .trim()
    .toLowerCase();

  if (
    status === "trial" ||
    status === "trialing"
  ) {
    return "trial_expired";
  }

  if (status === "past_due") {
    return "past_due";
  }

  if (status === "suspended") {
    return "suspended";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  return "expired";
}

/**
 * Redirection vers la page abonnement.
 *
 * IMPORTANT :
 * Aucun signOut ici.
 */
function redirectToSubscription(
  request: NextRequest,
  reason: string
) {
  const url =
    new URL(
      "/abonnement",
      request.url
    );

  url.searchParams.set(
    "reason",
    reason
  );

  return NextResponse.redirect(
    url
  );
}

/* ==========================================================================
 * RÔLE
 * ========================================================================== */

async function getCurrentRole(
  supabase: ReturnType<
    typeof createServerClient
  >,
  userId: string
): Promise<UserRole | null> {
  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (
    error ||
    !data?.role
  ) {
    return null;
  }

  return data.role as UserRole;
}

/* ==========================================================================
 * PERMISSIONS
 * ========================================================================== */

async function hasPermission(
  supabase: ReturnType<
    typeof createServerClient
  >,
  userId: string,
  permissionCode: string
): Promise<boolean> {
  /**
   * 1. Permission directe utilisateur.
   */
  const {
    data: directPermission,
    error: directError,
  } = await supabase
    .from("user_permissions")
    .select(
      "permission_code, allowed"
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "permission_code",
      permissionCode
    )
    .maybeSingle();

  if (directError) {
    console.error(
      "Erreur permissions utilisateur :",
      directError.message
    );
  }

  /**
   * Une permission utilisateur explicite
   * a priorité.
   */
  if (directPermission) {
    return (
      directPermission.allowed === true
    );
  }

  /**
   * 2. Récupération du rôle.
   */
  const role =
    await getCurrentRole(
      supabase,
      userId
    );

  if (!role) {
    return false;
  }

  /**
   * 3. Permission du rôle.
   */
  const {
    data: rolePermission,
    error: roleError,
  } =
    await supabase
      .from("role_permissions")
      .select(
        `
          allowed,
          role,
          permission_code
        `
      )
      .eq(
        "role",
        role
      )
      .eq(
        "permission_code",
        permissionCode
      )
      .maybeSingle();

  if (roleError) {
    console.error(
      "Erreur permissions rôle :",
      roleError.message
    );

    return false;
  }

  if (!rolePermission) {
    return false;
  }

  return (
    rolePermission.allowed === true
  );
}

/* ==========================================================================
 * ABONNEMENT
 * ========================================================================== */

async function getCurrentSubscription(
  supabase: ReturnType<
    typeof createServerClient
  >,
  pharmacyId: string
): Promise<{
  subscription: Subscription | null;
  error: string | null;
}> {
  const {
    data,
    error,
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
      `
    )
    .eq(
      "pharmacy_id",
      pharmacyId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      subscription: null,
      error: error.message,
    };
  }

  return {
    subscription:
      data as Subscription | null,
    error: null,
  };
}

/* ==========================================================================
 * PROXY PRINCIPAL
 * ========================================================================== */

export async function proxy(
  request: NextRequest
) {
  /**
   * Réponse initiale.
   */
  let response =
    NextResponse.next({
      request,
    });

  /**
   * Client Supabase côté serveur.
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
            cookiesToSet
          ) {
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

  /**
   * Vérification de la session
   * directement auprès de Supabase.
   */
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  /* ------------------------------------------------------------------------
   * FICHIERS STATIQUES
   * --------------------------------------------------------------------- */

  if (
    pathname.startsWith(
      "/_next"
    ) ||
    pathname.startsWith(
      "/favicon"
    ) ||
    pathname.includes(".")
  ) {
    return response;
  }

  /* ------------------------------------------------------------------------
   * ROUTES PUBLIQUES
   * --------------------------------------------------------------------- */

  if (
    isPublicRoute(pathname)
  ) {
    /**
     * Un utilisateur déjà connecté qui ouvre
     * login/register est renvoyé vers son espace.
     */
    if (
      user &&
      (
        pathname ===
          "/login" ||
        pathname ===
          "/register"
      )
    ) {
      const {
        data: publicProfile,
      } =
        await supabase
          .from("profiles")
          .select(
            "id, role, pharmacy_id"
          )
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

      if (
        publicProfile?.role
      ) {
        const role =
          publicProfile.role as UserRole;

        const destination =
          ROLE_HOME[role];

        if (destination) {
          return NextResponse.redirect(
            new URL(
              destination,
              request.url
            )
          );
        }
      }
    }

    /**
     * /abonnement reste accessible,
     * même lorsque l'abonnement est expiré.
     */
    return response;
  }

  /* ------------------------------------------------------------------------
   * UTILISATEUR NON CONNECTÉ
   * --------------------------------------------------------------------- */

  if (!user) {
    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    /**
     * On conserve la destination demandée.
     */
    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  /* ------------------------------------------------------------------------
   * PROFIL
   * --------------------------------------------------------------------- */

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
        user.id
      )
      .maybeSingle();

  /**
   * Le profil est obligatoire pour utiliser PharmaFlow.
   *
   * Ce n'est PAS un contrôle d'abonnement.
   * On déconnecte uniquement si le profil est réellement
   * absent ou inexploitable.
   */
  if (
    profileError ||
    !profile ||
    !profile.role ||
    !profile.pharmacy_id
  ) {
    console.error(
      "Profil PharmaFlow introuvable ou incomplet."
    );

    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  /**
   * Après cette vérification, pharmacy_id
   * est garanti comme étant une chaîne.
   */
  const typedProfile =
    profile as Profile;

  const role =
    typedProfile.role;

  const pharmacyId =
    typedProfile.pharmacy_id;

  /**
   * Cette variable est explicitement vérifiée
   * pour satisfaire TypeScript.
   */
  if (!pharmacyId) {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  /* ------------------------------------------------------------------------
   * CONTRÔLE ABONNEMENT
   * --------------------------------------------------------------------- */

  if (
    requiresValidSubscription(
      pathname
    )
  ) {
    const {
      subscription,
      error:
        subscriptionError,
    } =
      await getCurrentSubscription(
        supabase,
        pharmacyId
      );

    /**
     * En cas d'erreur Supabase :
     *
     * - on bloque l'accès
     * - on conserve la session
     * - on envoie vers abonnement
     */
    if (
      subscriptionError
    ) {
      console.error(
        "Erreur vérification abonnement :",
        subscriptionError
      );

      return redirectToSubscription(
        request,
        "verification"
      );
    }

    /**
     * Aucun abonnement ou abonnement expiré.
     *
     * IMPORTANT :
     * Aucun signOut().
     */
    if (
      !subscriptionAllowsAccess(
        subscription
      )
    ) {
      const reason =
        getSubscriptionBlockReason(
          subscription
        );

      return redirectToSubscription(
        request,
        reason
      );
    }
  }

  /* ------------------------------------------------------------------------
   * CONTRÔLE DU RÔLE
   * --------------------------------------------------------------------- */

  if (
    !isRoleWorkspaceAllowed(
      pathname,
      role
    )
  ) {
    const destination =
      ROLE_HOME[role];

    return NextResponse.redirect(
      new URL(
        destination,
        request.url
      )
    );
  }

  /* ------------------------------------------------------------------------
   * CONTRÔLE DES PERMISSIONS
   * --------------------------------------------------------------------- */

  const requiredPermission =
    getRequiredPermission(
      pathname
    );

  if (
    requiredPermission
  ) {
    const allowed =
      await hasPermission(
        supabase,
        typedProfile.id,
        requiredPermission
      );

    if (!allowed) {
      const destination =
        ROLE_HOME[role];

      return NextResponse.redirect(
        new URL(
          destination,
          request.url
        )
      );
    }
  }

  /* ------------------------------------------------------------------------
   * ACCÈS AUTORISÉ
   * --------------------------------------------------------------------- */

  return response;
}

/* ==========================================================================
 * MATCHER NEXT.JS
 * ========================================================================== */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};