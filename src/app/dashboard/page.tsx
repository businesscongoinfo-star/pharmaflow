"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createClient } from "../lib/supabase/client";

import {
  getLocaleFromCountry,
  type SupportedLocale,
} from "../lib/i18n/country-language";

/* ============================================================
   TYPES
============================================================ */

type UserRole =
  | "owner"
  | "admin"
  | "pharmacist"
  | "cashier"
  | "employee";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole | string | null;
  pharmacy_id: string | null;
};

type Pharmacy = {
  id: string;
  name: string;
  country_code: string | null;
  city: string | null;
  currency_code: string | null;
  status: string | null;
};

type Subscription = {
  id: string;
  status: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  plan_id: string | null;
};

type SubscriptionInfo = {
  status: string;
  daysRemaining: number;
  endDate: string | null;
  isTrial: boolean;
  isPaid: boolean;
};

type Product = {
  id: string;
  name: string;
  stock_quantity: number;
  minimum_stock: number;
  selling_price: number;
  is_active: boolean;
};

type Sale = {
  id: string;
  sale_number: string;
  total: number;
  status: string;
  created_at: string;
};

/* ============================================================
   NAVIGATION
============================================================ */

const navigation = [
  {
    key: "dashboard",
    icon: "▦",
    href: "/dashboard",
  },
  {
    key: "products",
    icon: "◈",
    href: "/produits",
  },
  {
    key: "stock",
    icon: "▣",
    href: "/stock",
  },
  {
    key: "sales",
    icon: "▤",
    href: "/ventes",
  },
  {
    key: "users",
    icon: "♙",
    href: "/utilisateurs",
  },
  {
    key: "reports",
    icon: "◒",
    href: "/rapports",
  },
  {
    key: "payments",
    icon: "▱",
    href: "/paiements",
  },
  {
    key: "settings",
    icon: "⚙",
    href: "/parametres",
  },
];

/* ============================================================
   REDIRECTION PAR RÔLE
============================================================ */

function getRoleRedirect(
  role: string | null | undefined,
) {
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

/* ============================================================
   VÉRIFICATION ABONNEMENT
============================================================ */

/**
 * Détermine si l'utilisateur peut actuellement accéder
 * à l'espace PharmaFlow.
 *
 * Règles :
 * - active : accès si non expiré
 * - paid : accès si non expiré
 * - trial / trialing : accès uniquement si l'essai est encore actif
 * - cancelled : accès uniquement jusqu'à expires_at
 * - tout autre statut : accès refusé
 */
function hasValidSubscription(
  subscription: Subscription | null,
): boolean {
  if (!subscription) {
    return false;
  }

  const status = String(
    subscription.status || "",
  )
    .trim()
    .toLowerCase();

  /* ----------------------------------------------------------
     STATUTS AUTORISÉS
  ---------------------------------------------------------- */

  const allowedStatuses = [
    "active",
    "paid",
    "trial",
    "trialing",
    "cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    return false;
  }

  /* ----------------------------------------------------------
     PÉRIODE D'ESSAI
  ---------------------------------------------------------- */

  if (
    status === "trial" ||
    status === "trialing"
  ) {
    /*
     * Une période d'essai doit obligatoirement
     * avoir une date de fin valide.
     */
    if (!subscription.trial_ends_at) {
      return false;
    }

    const trialEndsAt = new Date(
      subscription.trial_ends_at,
    ).getTime();

    if (!Number.isFinite(trialEndsAt)) {
      return false;
    }

    if (trialEndsAt <= Date.now()) {
      return false;
    }

    /*
     * Si expires_at existe également,
     * elle doit elle aussi être valide.
     */
    if (subscription.expires_at) {
      const expiresAt = new Date(
        subscription.expires_at,
      ).getTime();

      if (!Number.isFinite(expiresAt)) {
        return false;
      }

      if (expiresAt <= Date.now()) {
        return false;
      }
    }

    return true;
  }

  /* ----------------------------------------------------------
     ABONNEMENT PAYÉ / ACTIF / ANNULÉ
  ---------------------------------------------------------- */

  /*
   * Pour un abonnement normal, nous exigeons
   * une date d'expiration valide.
   *
   * Cela empêche un abonnement mal configuré
   * de donner un accès illimité par erreur.
   */
  if (!subscription.expires_at) {
    return false;
  }

  const expiresAt = new Date(
    subscription.expires_at,
  ).getTime();

  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  /*
   * Même si l'abonnement est "cancelled",
   * le client peut conserver son accès jusqu'à
   * la fin de la période déjà payée.
   */
  if (expiresAt <= Date.now()) {
    return false;
  }

  return true;
}

/* ============================================================
   PAGE DASHBOARD
============================================================ */

export default function DashboardPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  /* ==========================================================
     TRADUCTIONS
  ========================================================== */

  const tCommon =
    useTranslations("common");

  const tNav =
    useTranslations("navigation");

  const tDashboard =
    useTranslations("dashboard");

  const tProducts =
    useTranslations("products");

  const tStock =
    useTranslations("stock");

  const tSales =
    useTranslations("sales");

  const tUsers =
    useTranslations("users");

  const tReports =
    useTranslations("reports");

  const tPharmacy =
    useTranslations("pharmacy");

  /* ==========================================================
     ÉTATS
  ========================================================== */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [redirecting, setRedirecting] =
    useState(false);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [todaySales, setTodaySales] =
    useState<Sale[]>([]);

  const [error, setError] =
    useState("");

  /* ==========================================================
     CHARGEMENT DU DASHBOARD
  ========================================================== */

  const loadDashboard =
    useCallback(
      async (silent = false) => {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
        setRedirecting(false);

        try {
          /* ==================================================
             UTILISATEUR CONNECTÉ
          ================================================== */

          const {
            data: {
              user,
            },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            router.replace(
              "/login",
            );

            return;
          }

          /* ==================================================
             PROFIL
          ================================================== */

          const {
            data: profileData,
            error: profileError,
          } =
            await supabase
              .from("profiles")
              .select(
                `
                id,
                full_name,
                phone,
                role,
                pharmacy_id
                `,
              )
              .eq(
                "id",
                user.id,
              )
              .maybeSingle();

          if (profileError) {
            throw new Error(
              profileError.message,
            );
          }

          if (!profileData) {
            throw new Error(
              "Votre profil utilisateur est introuvable.",
            );
          }

          const currentRole =
            String(
              profileData.role ||
                "",
            ).toLowerCase();

          /* ==================================================
             PROTECTION DU DASHBOARD PROPRIÉTAIRE
          ================================================== */

          if (
            currentRole !==
            "owner"
          ) {
            setRedirecting(true);

            const destination =
              getRoleRedirect(
                currentRole,
              );

            router.replace(
              destination,
            );

            return;
          }

          setProfile(
            profileData as Profile,
          );

          /* ==================================================
             PHARMACY ID
          ================================================== */

          if (
            !profileData.pharmacy_id
          ) {
            throw new Error(
              "Votre compte n'est associé à aucune pharmacie.",
            );
          }

          const pharmacyId =
            profileData.pharmacy_id;

          /* ==================================================
             PHARMACIE
          ================================================== */

          const {
            data: pharmacyData,
            error: pharmacyError,
          } =
            await supabase
              .from("pharmacies")
              .select(
                `
                id,
                name,
                country_code,
                city,
                currency_code,
                status
                `,
              )
              .eq(
                "id",
                pharmacyId,
              )
              .maybeSingle();

          if (pharmacyError) {
            throw new Error(
              pharmacyError.message,
            );
          }

          if (!pharmacyData) {
            throw new Error(
              "La pharmacie associée à votre compte est introuvable.",
            );
          }

          const currentPharmacy =
            pharmacyData as Pharmacy;

          setPharmacy(
            currentPharmacy,
          );

          /* ==================================================
             PROTECTION STATUT PHARMACIE
          ================================================== */

          const pharmacyStatus =
            String(
              currentPharmacy.status ||
                "",
            )
              .trim()
              .toLowerCase();

          /*
           * Une pharmacie active ou en période d'essai
           * peut utiliser le Dashboard.
           */
          if (
            pharmacyStatus &&
            pharmacyStatus !== "active" &&
            pharmacyStatus !== "trial"
          ) {
            setRedirecting(true);

            router.replace(
              "/paiements?subscription=required",
            );

            return;
          }

          /* ==================================================
             VÉRIFICATION ABONNEMENT
          ================================================== */

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
                expires_at,
                plan_id
                `,
              )
              .eq(
                "pharmacy_id",
                pharmacyId,
              )
              .order(
                "created_at",
                {
                  ascending: false,
                },
              )
              .limit(1)
              .maybeSingle();

          if (
            subscriptionError
          ) {
            throw new Error(
              subscriptionError.message,
            );
          }

          const currentSubscription =
            subscriptionData as
              | Subscription
              | null;

          setSubscription(
            currentSubscription,
          );

          /* --------------------------------------------------
             CONTRÔLE D'ACCÈS
          -------------------------------------------------- */

          if (
            !hasValidSubscription(
              currentSubscription,
            )
          ) {
            setRedirecting(true);

            /*
             * Nettoyage des données locales avant
             * de rediriger vers le paiement.
             */
            setProducts([]);
            setSales([]);
            setTodaySales([]);

            router.replace(
              "/paiements?subscription=required",
            );

            return;
          }

          /* ==================================================
             PRODUITS
          ================================================== */

          const {
            data: productsData,
            error: productsError,
          } =
            await supabase
              .from("products")
              .select(
                `
                id,
                name,
                stock_quantity,
                minimum_stock,
                selling_price,
                is_active
                `,
              )
              .eq(
                "pharmacy_id",
                pharmacyId,
              )
              .eq(
                "is_active",
                true,
              )
              .order(
                "name",
                {
                  ascending: true,
                },
              );

          if (productsError) {
            throw new Error(
              productsError.message,
            );
          }

          setProducts(
            (productsData ||
              []) as Product[],
          );

          /* ==================================================
             VENTES RÉCENTES
          ================================================== */

          const {
            data: recentSalesData,
            error: recentSalesError,
          } =
            await supabase
              .from("sales")
              .select(
                `
                id,
                sale_number,
                total,
                status,
                created_at
                `,
              )
              .eq(
                "pharmacy_id",
                pharmacyId,
              )
              .order(
                "created_at",
                {
                  ascending: false,
                },
              )
              .limit(5);

          if (
            recentSalesError
          ) {
            throw new Error(
              recentSalesError.message,
            );
          }

          setSales(
            (recentSalesData ||
              []) as Sale[],
          );

          /* ==================================================
             VENTES DU JOUR
          ================================================== */

          const startOfToday =
            new Date();

          startOfToday.setHours(
            0,
            0,
            0,
            0,
          );

          const {
            data: todaySalesData,
            error: todaySalesError,
          } =
            await supabase
              .from("sales")
              .select(
                `
                id,
                sale_number,
                total,
                status,
                created_at
                `,
              )
              .eq(
                "pharmacy_id",
                pharmacyId,
              )
              .gte(
                "created_at",
                startOfToday.toISOString(),
              )
              .order(
                "created_at",
                {
                  ascending: false,
                },
              );

          if (
            todaySalesError
          ) {
            throw new Error(
              todaySalesError.message,
            );
          }

          setTodaySales(
            (todaySalesData ||
              []) as Sale[],
          );
        } catch (err) {
          console.error(
            "Dashboard:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : tDashboard(
                  "loadError",
                ),
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        router,
        supabase,
        tDashboard,
      ],
    );

  /* ==========================================================
     INITIALISATION
  ========================================================== */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const activeProducts =
    products.length;

  const totalStock =
    products.reduce(
      (
        total,
        product,
      ) =>
        total +
        Number(
          product.stock_quantity ||
            0,
        ),
      0,
    );

  const lowStockProducts =
    products.filter(
      (product) => {
        const quantity =
          Number(
            product.stock_quantity ||
              0,
          );

        const minimum =
          Number(
            product.minimum_stock ||
              0,
          );

        return (
          quantity > 0 &&
          quantity <= minimum
        );
      },
    );

  const outOfStockProducts =
    products.filter(
      (product) =>
        Number(
          product.stock_quantity ||
            0,
        ) <= 0,
    );

  const lowStock =
    lowStockProducts.length;

  const outOfStock =
    outOfStockProducts.length;

  /* ==========================================================
     VENTES VALIDES DU JOUR
  ========================================================== */

  const validTodaySales =
    todaySales.filter(
      (sale) => {
        const status =
          String(
            sale.status ||
              "",
          ).toLowerCase();

        return (
          status !==
            "cancelled" &&
          status !==
            "refunded"
        );
      },
    );

  const totalSalesToday =
    validTodaySales.reduce(
      (
        total,
        sale,
      ) =>
        total +
        Number(
          sale.total ||
            0,
        ),
      0,
    );

  const numberOfSalesToday =
    validTodaySales.length;

  /* ==========================================================
     LOCALE
  ========================================================== */

  const locale: SupportedLocale =
    getLocaleFromCountry(
      pharmacy?.country_code,
    );

  const intlLocale =
    locale === "en"
      ? "en-US"
      : "fr-FR";

  /* ==========================================================
     INFORMATIONS ABONNEMENT
  ========================================================== */

  const subscriptionInfo =
    useMemo<SubscriptionInfo>(() => {
      if (!subscription) {
        return {
          status: "none",
          daysRemaining: 0,
          endDate: null,
          isTrial: false,
          isPaid: false,
        };
      }

      const status = String(
        subscription.status || "",
      )
        .trim()
        .toLowerCase();

      const isTrial =
        status === "trial" ||
        status === "trialing";

      const isPaid =
        status === "active" ||
        status === "paid" ||
        status === "cancelled";

      const endDate = isTrial
        ? subscription.trial_ends_at
        : subscription.expires_at;

      if (!endDate) {
        return {
          status,
          daysRemaining: 0,
          endDate: null,
          isTrial,
          isPaid,
        };
      }

      const endTimestamp =
        new Date(endDate).getTime();

      if (!Number.isFinite(endTimestamp)) {
        return {
          status,
          daysRemaining: 0,
          endDate,
          isTrial,
          isPaid,
        };
      }

      const difference =
        endTimestamp - Date.now();

      const daysRemaining =
        Math.max(
          0,
          Math.ceil(
            difference /
              (1000 * 60 * 60 * 24),
          ),
        );

      return {
        status,
        daysRemaining,
        endDate,
        isTrial,
        isPaid,
      };
    }, [subscription]);

  const subscriptionEndDate =
    subscriptionInfo.endDate
      ? new Intl.DateTimeFormat(
          intlLocale,
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          },
        ).format(
          new Date(
            subscriptionInfo.endDate,
          ),
        )
      : "—";

  /* ==========================================================
     FORMAT MONNAIE
  ========================================================== */

  function formatMoney(
    value: number,
  ) {
    const currency =
      pharmacy?.currency_code ||
      "XAF";

    return (
      new Intl.NumberFormat(
        intlLocale,
        {
          maximumFractionDigits: 0,
        },
      ).format(
        Number(value || 0),
      ) +
      ` ${currency}`
    );
  }

  /* ==========================================================
     FORMAT DATE
  ========================================================== */

  function formatDate(
    value: string,
  ) {
    return new Intl.DateTimeFormat(
      intlLocale,
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(
      new Date(value),
    );
  }

  /* ==========================================================
     DATE DU JOUR
  ========================================================== */

  function formatShortDate() {
    return new Intl.DateTimeFormat(
      intlLocale,
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ).format(
      new Date(),
    );
  }

  /* ==========================================================
     INITIALES
  ========================================================== */

  function getInitials(
    name:
      | string
      | null
      | undefined,
  ) {
    if (!name) {
      return "PF";
    }

    const parts =
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (
      parts.length === 1
    ) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      parts[0][0] +
      parts[
        parts.length - 1
      ][0]
    ).toUpperCase();
  }

  /* ==========================================================
     STATUT VENTE
  ========================================================== */

  function getStatusLabel(
    status:
      | string
      | null
      | undefined,
  ) {
    const value =
      String(
        status || "",
      ).toLowerCase();

    const statuses: Record<
      string,
      string
    > = {
      completed:
        tSales("completed"),

      paid:
        tSales("paid"),

      pending:
        tSales("pending"),

      cancelled:
        tSales("cancelled"),

      refunded:
        tSales("refunded"),

      active:
        tCommon("active"),
    };

    return (
      statuses[value] ||
      status ||
      "—"
    );
  }

  /* ==========================================================
     CLASSE STATUT
  ========================================================== */

  function getStatusClass(
    status:
      | string
      | null
      | undefined,
  ) {
    const value =
      String(
        status || "",
      ).toLowerCase();

    if (
      value ===
        "cancelled" ||
      value ===
        "refunded"
    ) {
      return "pf-status-danger";
    }

    if (
      value ===
      "pending"
    ) {
      return "pf-status-warning";
    }

    return "pf-status-success";
  }

  /* ==========================================================
     DÉCONNEXION
  ========================================================== */

  async function logout() {
    await supabase.auth.signOut();

    router.replace(
      "/login",
    );
  }

  /* ==========================================================
     CHARGEMENT / REDIRECTION
  ========================================================== */

  if (
    loading ||
    redirecting
  ) {
    return (
      <main className="pf-dashboard-loading">

        <div className="pf-loading-card">

          <div className="pf-loading-logo">
            <span>✚</span>
          </div>

          <div className="pf-spinner" />

          <h2>
            {tCommon("loading")}
          </h2>

          <p>
            {redirecting
              ? tDashboard(
                  "redirecting",
                )
              : tCommon("loading")}
          </p>

        </div>

      </main>
    );
  }

  /* ==========================================================
     INTERFACE
  ========================================================== */

  return (
    <main className="pf-app-shell">

      {/* ======================================================
          OVERLAY MOBILE
      ====================================================== */}

      {mobileMenu && (
        <button
          type="button"
          aria-label={tCommon("close")}
          className="pf-mobile-overlay"
          onClick={() =>
            setMobileMenu(false)
          }
        />
      )}

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`pf-sidebar ${
          mobileMenu
            ? "pf-sidebar-mobile-open"
            : ""
        }`}
      >

        {/* BRAND */}

        <div className="pf-sidebar-brand">

          <button
            type="button"
            className="pf-brand-button"
            onClick={() =>
              router.push(
                "/dashboard",
              )
            }
          >

            <span className="pf-brand-mark">
              ✚
            </span>

            <span>

              <strong>
                Pharma<span>Flow</span>
              </strong>

              <small>
                {tDashboard(
                  "pharmacyManagement",
                )}
              </small>

            </span>

          </button>

        </div>

        {/* PHARMACIE */}

        <div className="pf-sidebar-pharmacy">

          <div className="pf-pharmacy-icon">
            ✚
          </div>

          <div className="pf-pharmacy-mini-info">

            <span>
              {tPharmacy("pharmacy")}
            </span>

            <strong>
              {pharmacy?.name ||
                tPharmacy("name")}
            </strong>

            <small>

              {pharmacy?.city ||
                "—"}

              {pharmacy?.country_code
                ? ` • ${pharmacy.country_code}`
                : ""}

            </small>

          </div>

          <span className="pf-online-dot" />

        </div>

        {/* NAVIGATION */}

        <nav className="pf-sidebar-nav">

          <p className="pf-nav-title">
            {tDashboard(
              "mainMenu",
            )}
          </p>

          {navigation.map(
            (item) => {

              const active =
                item.href ===
                "/dashboard";

              const labels: Record<
                string,
                string
              > = {
                dashboard:
                  tNav("dashboard"),

                products:
                  tNav("products"),

                stock:
                  tNav("stock"),

                sales:
                  tNav("sales"),

                users:
                  tNav("users"),

                reports:
                  tNav("reports"),

                payments:
                  tNav("payments"),

                settings:
                  tNav("settings"),
              };

              return (
                <button
                  key={
                    item.href
                  }
                  type="button"
                  onClick={() => {
                    setMobileMenu(
                      false,
                    );

                    router.push(
                      item.href,
                    );
                  }}
                  className={`pf-nav-item ${
                    active
                      ? "pf-nav-item-active"
                      : ""
                  }`}
                >

                  <span className="pf-nav-icon">
                    {item.icon}
                  </span>

                  <span>
                    {labels[
                      item.key
                    ]}
                  </span>

                  {active && (
                    <span className="pf-nav-active-dot" />
                  )}

                </button>
              );
            },
          )}

        </nav>

        {/* SUPPORT */}

        <div className="pf-sidebar-support">

          <div className="pf-support-icon">
            ?
          </div>

          <div>

            <strong>
              {tDashboard(
                "needHelp",
              )}
            </strong>

            <span>
              {tDashboard(
                "supportAvailable",
              )}
            </span>

          </div>

        </div>

        {/* UTILISATEUR */}

        <div className="pf-sidebar-user">

          <div className="pf-avatar">

            {getInitials(
              profile?.full_name,
            )}

          </div>

          <div className="pf-user-details">

            <strong>
              {profile?.full_name ||
                tUsers("owner")}
            </strong>

            <span>
              {tUsers("owner")}
            </span>

          </div>

          <button
            type="button"
            title={tNav("logout")}
            onClick={logout}
            className="pf-logout-icon"
          >
            ↪
          </button>

        </div>

      </aside>

      {/* ======================================================
          CONTENU PRINCIPAL
      ====================================================== */}

      <section className="pf-app-main">

        {/* HEADER */}

        <header className="pf-app-header">

          <div className="pf-header-left">

            <button
              type="button"
              className="pf-mobile-menu-button"
              onClick={() =>
                setMobileMenu(
                  true,
                )
              }
              aria-label={tDashboard(
                "openMenu",
              )}
            >
              ☰
            </button>

            <div>

              <span className="pf-header-label">
                {tNav(
                  "dashboard",
                ).toUpperCase()}
              </span>

              <h1>

                {tDashboard(
                  "hello",
                )}{" "}

                {profile?.full_name
                  ?.split(" ")[0] ||
                  tDashboard(
                    "you",
                  )}{" "}

                <span>
                  👋
                </span>

              </h1>

            </div>

          </div>

          <div className="pf-header-actions">

            <button
              type="button"
              className="pf-header-icon-button"
              title={tCommon("refresh")}
              onClick={() =>
                loadDashboard(
                  true,
                )
              }
            >

              <span
                className={
                  refreshing
                    ? "pf-refresh-spin"
                    : ""
                }
              >
                ↻
              </span>

            </button>

            <button
              type="button"
              className="pf-header-icon-button pf-notification-button"
              title={tDashboard(
                "notifications",
              )}
            >

              ♧

              <span />

            </button>

            <div className="pf-header-divider" />

            <div className="pf-header-profile">

              <div className="pf-avatar pf-avatar-small">

                {getInitials(
                  profile?.full_name,
                )}

              </div>

              <div>

                <strong>
                  {profile?.full_name ||
                    tUsers("owner")}
                </strong>

                <span>
                  {tUsers("owner")}
                </span>

              </div>

            </div>

          </div>

        </header>

        {/* ====================================================
            CONTENU DU DASHBOARD
        ==================================================== */}

        <div className="pf-dashboard-content">

          {/* ==================================================
              ERREUR
          ================================================== */}

          {error && (
            <div className="pf-dashboard-alert">

              <div className="pf-alert-icon">
                !
              </div>

              <div>

                <strong>
                  {tDashboard(
                    "loadErrorTitle",
                  )}
                </strong>

                <p>
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  loadDashboard()
                }
              >
                {tCommon("refresh")}
              </button>

            </div>
          )}

          {/* ==================================================
              INTRODUCTION
          ================================================== */}

          <section className="pf-dashboard-intro">

            <div>

              <p className="pf-date-label">
                {formatShortDate()}
              </p>

              <h2>
                {tDashboard(
                  "overview",
                )}
              </h2>

              <p>

                {tDashboard(
                  "activityOf",
                )}{" "}

                <strong>
                  {pharmacy?.name ||
                    tPharmacy("pharmacy")}
                </strong>{" "}

                {tDashboard(
                  "today",
                )}

              </p>

            </div>

            <div className="pf-intro-actions">

              {/* AJOUTER PRODUIT */}

              <button
                type="button"
                className="pf-secondary-button"
                onClick={() =>
                  router.push(
                    "/produits",
                  )
                }
              >

                <span>
                  ＋
                </span>

                {tProducts(
                  "addProduct",
                )}

              </button>

              {/* NOUVELLE VENTE */}

              <button
                type="button"
                className="pf-primary-button"
                onClick={() =>
                  router.push(
                    "/ventes",
                  )
                }
              >

                <span>
                  ▤
                </span>

                {tSales(
                  "newSale",
                )}

              </button>

            </div>

          </section>

          {/* ==================================================
              INFORMATIONS PHARMACIE
          ================================================== */}

          <section className="pf-pharmacy-banner">

            <div className="pf-banner-main">

              <div className="pf-banner-logo">
                ✚
              </div>

              <div>

                <span>
                  {tDashboard(
                    "pharmacySpace",
                  )}
                </span>

                <h3>
                  {pharmacy?.name ||
                    tPharmacy("pharmacy")}
                </h3>

                <p>

                  {pharmacy?.city ||
                    "—"}

                  {pharmacy?.country_code
                    ? ` • ${pharmacy.country_code}`
                    : ""}

                  {" • "}

                  {pharmacy?.currency_code ||
                    "XAF"}

                </p>

              </div>

            </div>

            <div className="pf-banner-status">

              <span className="pf-status-dot" />

              <div>

                <span>
                  {tCommon(
                    "status",
                  ).toUpperCase()}
                </span>

                <strong>

                  {pharmacy?.status ===
                  "active"
                    ? tDashboard(
                        "pharmacyActive",
                      )
                    : pharmacy?.status ||
                      tCommon("active")}

                </strong>

              </div>

            </div>

          </section>

          {/* ==================================================
              ABONNEMENT
          ================================================== */}

          <section
            className={`pf-subscription-card ${
              subscriptionInfo.daysRemaining <= 3
                ? "pf-subscription-warning"
                : ""
            }`}
          >

            <div className="pf-subscription-main">

              <div className="pf-subscription-icon">
                ⏳
              </div>

              <div className="pf-subscription-content">

                <span className="pf-subscription-label">
                  {subscriptionInfo.isTrial
                    ? "ESSAI GRATUIT"
                    : "ABONNEMENT"}
                </span>

                <h3>
                  {subscriptionInfo.daysRemaining > 0
                    ? subscriptionInfo.isTrial
                      ? `Il vous reste ${subscriptionInfo.daysRemaining} jour${
                          subscriptionInfo.daysRemaining > 1
                            ? "s"
                            : ""
                        } d’essai gratuit`
                      : `Il vous reste ${subscriptionInfo.daysRemaining} jour${
                          subscriptionInfo.daysRemaining > 1
                            ? "s"
                            : ""
                        } sur votre abonnement`
                    : "Votre abonnement a expiré"}
                </h3>

                <p>
                  {subscriptionInfo.endDate
                    ? `Valable jusqu’au ${subscriptionEndDate}`
                    : "Aucune date d’expiration disponible"}
                </p>

              </div>

            </div>

            <div className="pf-subscription-right">

              <div className="pf-subscription-days">

                <strong>
                  {subscriptionInfo.daysRemaining}
                </strong>

                <span>
                  {subscriptionInfo.daysRemaining > 1
                    ? "jours restants"
                    : "jour restant"}
                </span>

              </div>

              <button
                type="button"
                className="pf-subscription-button"
                onClick={() =>
                  router.push(
                    "/abonnement",
                  )
                }
              >

                <span>
                  💳
                </span>

                {subscriptionInfo.isTrial
                  ? "Choisir un abonnement"
                  : "Payer en avance"}

                <span>
                  →
                </span>

              </button>

            </div>

          </section>

          {/* ==================================================
              INDICATEURS PRINCIPAUX
          ================================================== */}

          <section className="pf-kpi-grid">

            {/* PRODUITS */}

            <DashboardStat
              icon="◈"
              iconClass="pf-kpi-teal"
              label={tDashboard(
                "activeProducts",
              )}
              value={activeProducts.toLocaleString(
                intlLocale,
              )}
              description={tDashboard(
                "availableReferences",
              )}
              onClick={() =>
                router.push(
                  "/produits",
                )
              }
            />

            {/* STOCK */}

            <DashboardStat
              icon="▣"
              iconClass="pf-kpi-blue"
              label={tDashboard(
                "stockUnits",
              )}
              value={totalStock.toLocaleString(
                intlLocale,
              )}
              description={tDashboard(
                "totalAvailableQuantity",
              )}
              onClick={() =>
                router.push(
                  "/stock",
                )
              }
            />

            {/* ALERTES */}

            <DashboardStat
              icon="!"
              iconClass={
                lowStock > 0
                  ? "pf-kpi-orange"
                  : "pf-kpi-green"
              }
              label={tDashboard(
                "stockAlerts",
              )}
              value={(
                lowStock +
                outOfStock
              ).toLocaleString(
                intlLocale,
              )}
              description={
                outOfStock > 0
                  ? tDashboard(
                      "outOfStockAndLow",
                      {
                        outOfStock,
                        lowStock,
                      },
                    )
                  : lowStock > 0
                    ? tDashboard(
                        "productsToWatch",
                        {
                          count:
                            lowStock,
                        },
                      )
                    : tDashboard(
                        "healthyStock",
                      )
              }
              warning={
                lowStock +
                  outOfStock >
                0
              }
              onClick={() =>
                router.push(
                  "/stock",
                )
              }
            />

            {/* VENTES */}

            <DashboardStat
              icon="₣"
              iconClass="pf-kpi-green"
              label={tDashboard(
                "todaySales",
              )}
              value={formatMoney(
                totalSalesToday,
              )}
              description={tDashboard(
                "salesToday",
                {
                  count:
                    numberOfSalesToday,
                },
              )}
              success
              onClick={() =>
                router.push(
                  "/ventes",
                )
              }
            />

          </section>

          {/* ==================================================
              GRILLE PRINCIPALE
          ================================================== */}

          <section className="pf-main-dashboard-grid">

            {/* =================================================
                VENTES RÉCENTES
            ================================================= */}

            <div className="pf-panel pf-sales-panel">

              <div className="pf-panel-header">

                <div>

                  <span className="pf-panel-eyebrow">
                    {tDashboard(
                      "activity",
                    ).toUpperCase()}
                  </span>

                  <h3>
                    {tSales(
                      "recentSales",
                    )}
                  </h3>

                  <p>
                    {tDashboard(
                      "recentTransactions",
                    )}
                  </p>

                </div>

                <button
                  type="button"
                  className="pf-link-button"
                  onClick={() =>
                    router.push(
                      "/ventes",
                    )
                  }
                >

                  {tDashboard(
                    "viewAll",
                  )}

                  <span>
                    →
                  </span>

                </button>

              </div>

              <div className="pf-table-wrapper">

                <table className="pf-dashboard-table">

                  <thead>

                    <tr>

                      <th>
                        {tSales(
                          "sale",
                        )}
                      </th>

                      <th>
                        {tCommon(
                          "date",
                        )}
                      </th>

                      <th>
                        {tSales(
                          "total",
                        )}
                      </th>

                      <th>
                        {tCommon(
                          "status",
                        )}
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {sales.length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={4}
                          className="pf-empty-cell"
                        >

                          <div className="pf-empty-state">

                            <div>
                              ▤
                            </div>

                            <strong>
                              {tSales(
                                "noSales",
                              )}
                            </strong>

                            <span>
                              {tDashboard(
                                "salesAppearHere",
                              )}
                            </span>

                          </div>

                        </td>

                      </tr>

                    ) : (

                      sales.map(
                        (sale) => (

                          <tr
                            key={
                              sale.id
                            }
                          >

                            <td>

                              <div className="pf-sale-number">

                                <span>
                                  #
                                </span>

                                <strong>
                                  {sale.sale_number}
                                </strong>

                              </div>

                            </td>

                            <td>

                              <span className="pf-date-value">

                                {formatDate(
                                  sale.created_at,
                                )}

                              </span>

                            </td>

                            <td>

                              <strong className="pf-sale-total">

                                {formatMoney(
                                  Number(
                                    sale.total ||
                                      0,
                                  ),
                                )}

                              </strong>

                            </td>

                            <td>

                              <span
                                className={`pf-status-badge ${getStatusClass(
                                  sale.status,
                                )}`}
                              >

                                <span />

                                {getStatusLabel(
                                  sale.status,
                                )}

                              </span>

                            </td>

                          </tr>

                        ),
                      )

                    )}

                  </tbody>

                </table>

              </div>

            </div>

            {/* =================================================
                ÉTAT DU STOCK
            ================================================= */}

            <div className="pf-panel pf-stock-panel">

              <div className="pf-panel-header">

                <div>

                  <span className="pf-panel-eyebrow">
                    {tDashboard(
                      "inventory",
                    ).toUpperCase()}
                  </span>

                  <h3>
                    {tStock(
                      "title",
                    )}
                  </h3>

                  <p>
                    {tDashboard(
                      "productsNeedAttention",
                    )}
                  </p>

                </div>

                <button
                  type="button"
                  className="pf-link-button"
                  onClick={() =>
                    router.push(
                      "/stock",
                    )
                  }
                >

                  {tNav(
                    "stock",
                  )}

                  <span>
                    →
                  </span>

                </button>

              </div>

              {/* RÉSUMÉ STOCK */}

              <div className="pf-stock-summary">

                <div className="pf-stock-summary-card pf-stock-good">

                  <span>
                    {tDashboard(
                      "activeProducts",
                    )}
                  </span>

                  <strong>
                    {activeProducts}
                  </strong>

                </div>

                <div className="pf-stock-summary-card pf-stock-warning">

                  <span>
                    {tStock(
                      "lowStock",
                    )}
                  </span>

                  <strong>
                    {lowStock}
                  </strong>

                </div>

                <div className="pf-stock-summary-card pf-stock-danger">

                  <span>
                    {tStock(
                      "outOfStock",
                    )}
                  </span>

                  <strong>
                    {outOfStock}
                  </strong>

                </div>

              </div>

              {/* LISTE STOCK */}

              <div className="pf-stock-list">

                {products
                  .filter(
                    (product) =>
                      Number(
                        product.stock_quantity,
                      ) <=
                      Number(
                        product.minimum_stock,
                      ),
                  )
                  .slice(0, 5)
                  .map(
                    (product) => {

                      const quantity =
                        Number(
                          product.stock_quantity ||
                            0,
                        );

                      const minimum =
                        Number(
                          product.minimum_stock ||
                            0,
                        );

                      const isOut =
                        quantity <= 0;

                      return (

                        <div
                          key={
                            product.id
                          }
                          className="pf-stock-item"
                        >

                          <div className="pf-stock-product-icon">

                            {isOut
                              ? "!"
                              : "◈"}

                          </div>

                          <div className="pf-stock-product">

                            <strong>
                              {product.name}
                            </strong>

                            <span>

                              {tStock(
                                "minimumRequired",
                              )}{" "}

                              {minimum}

                            </span>

                          </div>

                          <div
                            className={`pf-stock-quantity ${
                              isOut
                                ? "danger"
                                : "warning"
                            }`}
                          >

                            <strong>
                              {quantity}
                            </strong>

                            <span>
                              {tStock(
                                "units",
                              )}
                            </span>

                          </div>

                        </div>

                      );
                    },
                  )}

                {/* AUCUNE ALERTE */}

                {lowStock === 0 &&
                  outOfStock === 0 && (

                    <div className="pf-stock-empty">

                      <div>
                        ✓
                      </div>

                      <strong>
                        {tDashboard(
                          "everythingGood",
                        )}
                      </strong>

                      <span>
                        {tDashboard(
                          "noProductNeedsAttention",
                        )}
                      </span>

                    </div>

                  )}

              </div>

            </div>

          </section>

          {/* ==================================================
              ACTIONS RAPIDES
          ================================================== */}

          <section className="pf-quick-section">

            <div className="pf-section-heading">

              <div>

                <span>
                  {tDashboard(
                    "productivity",
                  ).toUpperCase()}
                </span>

                <h3>
                  {tDashboard(
                    "quickActions",
                  )}
                </h3>

              </div>

            </div>

            <div className="pf-quick-grid">

              <QuickAction
                icon="◈"
                title={tDashboard(
                  "manageProducts",
                )}
                description={tDashboard(
                  "manageProductsDescription",
                )}
                href="/produits"
              />

              <QuickAction
                icon="▣"
                title={tDashboard(
                  "manageStock",
                )}
                description={tDashboard(
                  "manageStockDescription",
                )}
                href="/stock"
              />

              <QuickAction
                icon="▤"
                title={tSales(
                  "newSale",
                )}
                description={tDashboard(
                  "newSaleDescription",
                )}
                href="/ventes"
                primary
              />

              <QuickAction
                icon="◒"
                title={tReports(
                  "title",
                )}
                description={tDashboard(
                  "reportsDescription",
                )}
                href="/rapports"
              />

            </div>

          </section>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <footer className="pf-dashboard-footer">

            <div>

              <span className="pf-footer-mark">
                ✚
              </span>

              <strong>
                Pharma<span>Flow</span>
              </strong>

              <span>
                {tDashboard(
                  "pharmacyManagement",
                )}
              </span>

            </div>

            <span>

              ©️{" "}
              {new Date().getFullYear()}{" "}
              PharmaFlow

            </span>

          </footer>

        </div>

      </section>

    </main>
  );
}

/* ============================================================
   COMPOSANT KPI
============================================================ */

function DashboardStat({
  icon,
  iconClass,
  label,
  value,
  description,
  warning = false,
  success = false,
  onClick,
}: {
  icon: string;
  iconClass: string;
  label: string;
  value: string;
  description: string;
  warning?: boolean;
  success?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`pf-kpi-card ${
        warning
          ? "pf-kpi-card-warning"
          : ""
      } ${
        success
          ? "pf-kpi-card-success"
          : ""
      }`}
      onClick={onClick}
    >

      <div className="pf-kpi-top">

        <div
          className={`pf-kpi-icon ${iconClass}`}
        >
          {icon}
        </div>

        <span className="pf-kpi-arrow">
          ↗️
        </span>

      </div>

      <div className="pf-kpi-label">
        {label}
      </div>

      <div className="pf-kpi-value">
        {value}
      </div>

      <div className="pf-kpi-description">
        {description}
      </div>

    </button>
  );
}

/* ============================================================
   ACTION RAPIDE
============================================================ */

function QuickAction({
  icon,
  title,
  description,
  href,
  primary = false,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  const router =
    useRouter();

  return (
    <button
      type="button"
      className={`pf-quick-card ${
        primary
          ? "pf-quick-card-primary"
          : ""
      }`}
      onClick={() =>
        router.push(href)
      }
    >

      <div className="pf-quick-icon">
        {icon}
      </div>

      <div className="pf-quick-content">

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

      <span className="pf-quick-arrow">
        →
      </span>

    </button>
  );
}