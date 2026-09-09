"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/client";

/* =========================================================
   TYPES
   ========================================================= */

type Language = "fr" | "en";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  pharmacy_id: string | null;
  language: Language | null;
};

type Pharmacy = {
  id: string;
  name: string;
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
};

type Sale = {
  id: string;
  sale_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  stock_quantity: number;
  minimum_stock: number;
  selling_price: number;
  is_active: boolean;
};

type Subscription = {
  id: string;
  pharmacy_id: string;
  plan_id: string | null;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
};

/* =========================================================
   SUPABASE
   ========================================================= */

const supabase = createClient();

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeLanguage(
  value: unknown,
): Language {
  if (value === "en") {
    return "en";
  }

  return "fr";
}

function saveLocaleCookie(
  language: Language,
) {
  document.cookie =
    `pf_locale=${language}; path=/; max-age=31536000; samesite=lax`;
}

function formatMoney(
  value: number,
  currency: string,
  language: Language,
) {
  const amount = Number(value || 0);

  const safeCurrency =
    currency &&
    currency.length === 3
      ? currency
      : "XAF";

  try {
    return new Intl.NumberFormat(
      language === "en"
        ? "en-US"
        : "fr-FR",
      {
        style: "currency",
        currency: safeCurrency,
        maximumFractionDigits: 0,
      },
    ).format(amount);
  } catch {
    return `${amount.toLocaleString(
      language === "en"
        ? "en-US"
        : "fr-FR",
    )} ${safeCurrency}`;
  }
}

function formatDate(
  value: string,
  language: Language,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    language === "en"
      ? "en-US"
      : "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function getInitials(
  name: string,
) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "C";
  }

  return parts
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");
}

function isToday(
  value: string,
) {
  const date = new Date(value);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isThisWeek(
  value: string,
) {
  const date = new Date(value);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const start = new Date(now);

  const day = start.getDay();

  const mondayOffset =
    day === 0 ? 6 : day - 1;

  start.setDate(
    start.getDate() - mondayOffset,
  );

  start.setHours(0, 0, 0, 0);

  return date >= start && date <= now;
}

function isThisMonth(
  value: string,
) {
  const date = new Date(value);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function getRoleHome(
  role: string,
) {
  switch (role) {
    case "owner":
      return "/dashboard";

    case "admin":
      return "/admin";

    case "pharmacist":
      return "/pharmacien";

    case "employee":
      return "/employe";

    case "cashier":
      return "/caisse";

    default:
      return "/login";
  }
}

/* =========================================================
   TEXTES
   ========================================================= */

const translations = {
  fr: {
    cashier: "Caissier",
    cashierSpace: "Espace caissier",

    mainMenu: "ESPACE CAISSE",
    consultation: "CONSULTATION",
    analysis: "ANALYSE",
    account: "COMPTE",

    dashboard: "Tableau de bord",
    newSale: "Nouvelle vente",
    mySales: "Mes ventes",
    products: "Produits",
    stock: "Stock",
    reports: "Rapports",
    profile: "Mon profil",
    logout: "Déconnexion",

    hello: "Bonjour",
    subtitle:
      "Voici l'activité de votre poste de caisse.",

    cashRegister: "POSTE DE CAISSE",

    welcomeTitle:
      "Bienvenue dans votre espace caisse",

    welcomeText:
      "Gérez vos ventes et consultez les produits et le stock de votre pharmacie.",

    startSale: "Commencer une vente",

    today: "AUJOURD'HUI",
    todaySales:
      "ventes enregistrées par vous",

    todayRevenue: "CA DU JOUR",
    todayRevenueText:
      "chiffre d'affaires de votre activité",

    averageBasket: "PANIER MOYEN",
    averageBasketText:
      "montant moyen par vente",

    thisMonth: "CE MOIS",
    monthRevenue:
      "chiffre d'affaires du mois",

    quickActions: "Actions rapides",
    quickActionsText:
      "Accédez rapidement aux fonctions disponibles pour votre rôle.",

    newSaleDescription:
      "Enregistrer une nouvelle transaction",

    productsDescription:
      "Consulter les médicaments disponibles",

    stockDescription:
      "Consulter les quantités disponibles",

    reportsDescription:
      "Consulter les rapports",

    latestSales: "Mes dernières ventes",
    latestSalesText:
      "Activité enregistrée avec votre compte caissier.",

    viewAll: "Voir tout",

    noSales: "Aucune vente",
    noSalesText:
      "Vos ventes apparaîtront ici après votre première transaction.",

    makeSale: "Faire une vente",

    sale: "Vente",
    customer: "Client",
    date: "Date",
    status: "Statut",
    total: "Total",

    completed: "Terminée",
    cancelled: "Annulée",
    pending: "En attente",

    performance: "Ma performance",
    performanceText:
      "Votre activité commerciale.",

    todayPeriod: "Aujourd'hui",
    weekPeriod: "Cette semaine",
    monthPeriod: "Ce mois",

    saleOne: "vente",
    saleMany: "ventes",

    stockStatus: "État du stock",
    readOnly: "Consultation uniquement",

    productsCount: "Produits",
    lowStock: "Stock faible",
    outOfStock: "Ruptures",

    stockAttention: "Stock à surveiller",

    productAttention:
      "produit nécessite une attention.",

    productsAttention:
      "produits nécessitent une attention.",

    outOfStockTitle:
      "Produit(s) en rupture",

    oneOutOfStock:
      "produit est actuellement indisponible.",

    manyOutOfStock:
      "produits sont actuellement indisponibles.",

    consult: "Consulter",

    activitySummary:
      "Résumé de votre activité",

    activitySummaryText:
      "Données personnelles de votre compte caissier.",

    week: "SEMAINE",
    weekSales:
      "ventes cette semaine",

    weekRevenue: "CA SEMAINE",
    commercialActivity:
      "activité commerciale",

    catalogue: "CATALOGUE",
    activeProducts:
      "produits actifs visibles",

    access: "ACCÈS",
    secured: "Sécurisé",

    pharmacyData:
      "données limitées à votre pharmacie",

    securityTitle:
      "Votre espace caissier est sécurisé",

    securityText:
      "Les ventes affichées ici sont celles enregistrées avec votre compte. Les produits et le stock sont accessibles en consultation uniquement.",

    pharmacy: "Pharmacie",
    counterCustomer: "Client comptoir",

    loading:
      "Chargement de votre espace...",

    errorTitle:
      "Impossible de charger votre espace caisse",

    retry: "Réessayer",

    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",

    unknownUser: "Caissier",

    subscriptionExpired:
      "Votre abonnement ou votre période d'essai est arrivé à expiration.",

    subscriptionRequired:
      "Veuillez renouveler votre abonnement pour continuer.",
  },

  en: {
    cashier: "Cashier",
    cashierSpace: "Cashier workspace",

    mainMenu: "CASH REGISTER",
    consultation: "CONSULTATION",
    analysis: "ANALYSIS",
    account: "ACCOUNT",

    dashboard: "Dashboard",
    newSale: "New sale",
    mySales: "My sales",
    products: "Products",
    stock: "Stock",
    reports: "Reports",
    profile: "My profile",
    logout: "Log out",

    hello: "Hello",
    subtitle:
      "Here is the activity of your cash register.",

    cashRegister: "CASH REGISTER",

    welcomeTitle:
      "Welcome to your cashier workspace",

    welcomeText:
      "Manage your sales and view your pharmacy products and stock.",

    startSale: "Start a sale",

    today: "TODAY",
    todaySales:
      "sales recorded by you",

    todayRevenue: "TODAY'S REVENUE",
    todayRevenueText:
      "revenue from your activity",

    averageBasket: "AVERAGE BASKET",
    averageBasketText:
      "average amount per sale",

    thisMonth: "THIS MONTH",
    monthRevenue:
      "monthly revenue",

    quickActions: "Quick actions",
    quickActionsText:
      "Quickly access the functions available for your role.",

    newSaleDescription:
      "Record a new transaction",

    productsDescription:
      "View available medicines",

    stockDescription:
      "View available quantities",

    reportsDescription:
      "View reports",

    latestSales: "My latest sales",
    latestSalesText:
      "Activity recorded with your cashier account.",

    viewAll: "View all",

    noSales: "No sales",
    noSalesText:
      "Your sales will appear here after your first transaction.",

    makeSale: "Make a sale",

    sale: "Sale",
    customer: "Customer",
    date: "Date",
    status: "Status",
    total: "Total",

    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",

    performance: "My performance",
    performanceText:
      "Your commercial activity.",

    todayPeriod: "Today",
    weekPeriod: "This week",
    monthPeriod: "This month",

    saleOne: "sale",
    saleMany: "sales",

    stockStatus: "Stock status",
    readOnly: "View only",

    productsCount: "Products",
    lowStock: "Low stock",
    outOfStock: "Out of stock",

    stockAttention:
      "Stock needs attention",

    productAttention:
      "product needs attention.",

    productsAttention:
      "products need attention.",

    outOfStockTitle:
      "Product(s) out of stock",

    oneOutOfStock:
      "product is currently unavailable.",

    manyOutOfStock:
      "products are currently unavailable.",

    consult: "View",

    activitySummary:
      "Activity summary",

    activitySummaryText:
      "Personal data from your cashier account.",

    week: "WEEK",
    weekSales:
      "sales this week",

    weekRevenue: "WEEKLY REVENUE",
    commercialActivity:
      "commercial activity",

    catalogue: "CATALOGUE",
    activeProducts:
      "active products visible",

    access: "ACCESS",
    secured: "Secured",

    pharmacyData:
      "data limited to your pharmacy",

    securityTitle:
      "Your cashier workspace is secure",

    securityText:
      "The sales displayed here are those recorded with your account. Products and stock are view-only.",

    pharmacy: "Pharmacy",
    counterCustomer: "Counter customer",

    loading:
      "Loading your workspace...",

    errorTitle:
      "Unable to load your cashier workspace",

    retry: "Retry",

    openMenu: "Open menu",
    closeMenu: "Close menu",

    unknownUser: "Cashier",

    subscriptionExpired:
      "Your subscription or trial period has expired.",

    subscriptionRequired:
      "Please renew your subscription to continue.",
  },
};

/* =========================================================
   PAGE
   ========================================================= */

export default function CashierDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  /*
   * IMPORTANT :
   * language est un état d'affichage.
   *
   * Le chargement des données NE dépend PAS de language.
   * Cela évite la boucle :
   *
   * load -> language -> load -> language -> load...
   */
  const [language, setLanguage] =
    useState<Language>("fr");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [userName, setUserName] =
    useState("Cashier");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  /*
   * Textes calculés à partir de la langue.
   *
   * Cela ne recharge aucune donnée.
   */
  const text =
    translations[language];

  /* =======================================================
     CHARGEMENT UNIQUE
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        /* ---------------------------------------------------
           UTILISATEUR CONNECTÉ
           --------------------------------------------------- */

        const {
          data: {
            user,
          },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        if (cancelled) {
          return;
        }

        /* ---------------------------------------------------
           PROFIL UTILISATEUR
           --------------------------------------------------- */

        const {
          data: profileRows,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, phone, role, pharmacy_id, language",
          )
          .eq("id", user.id)
          .limit(1);

        if (profileError) {
          throw new Error(
            profileError.message,
          );
        }

        const profileData =
          profileRows?.[0] ?? null;

        if (!profileData) {
          throw new Error(
            "User profile not found.",
          );
        }

        /*
         * LA LANGUE VIENT DU PROFIL DE L'UTILISATEUR.
         *
         * Pas de pharmacy.language ici.
         */
        const userLanguage =
          normalizeLanguage(
            profileData.language,
          );

        /*
         * On met à jour l'affichage.
         *
         * IMPORTANT :
         * cette mise à jour NE relance PAS
         * le useEffect car language n'est
         * PAS dans ses dépendances.
         */
        if (!cancelled) {
          setLanguage(userLanguage);

          saveLocaleCookie(
            userLanguage,
          );
        }

        /* ---------------------------------------------------
           ROLE
           --------------------------------------------------- */

        if (
          profileData.role !==
          "cashier"
        ) {
          router.replace(
            getRoleHome(
              profileData.role,
            ),
          );

          return;
        }

        /* ---------------------------------------------------
           PHARMACY ID
           --------------------------------------------------- */

        if (!profileData.pharmacy_id) {
          throw new Error(
            userLanguage === "fr"
              ? "Votre compte n'est associé à aucune pharmacie."
              : "Your account is not associated with a pharmacy.",
          );
        }

        const currentProfile: Profile = {
          ...profileData,
          language:
            userLanguage,
        };

        if (!cancelled) {
          setProfile(
            currentProfile,
          );

          setUserName(
            currentProfile.full_name ||
              (userLanguage === "fr"
                ? "Caissier"
                : "Cashier"),
          );
        }

        /* ---------------------------------------------------
           PHARMACIE
           --------------------------------------------------- */

        const {
          data: pharmacyRows,
          error: pharmacyError,
        } = await supabase
          .from("pharmacies")
          .select(
            "id, name, city, country_code, currency_code",
          )
          .eq(
            "id",
            profileData.pharmacy_id,
          )
          .limit(1);

        if (pharmacyError) {
          throw new Error(
            pharmacyError.message,
          );
        }

        const pharmacyData =
          pharmacyRows?.[0] ?? null;

        if (!pharmacyData) {
          throw new Error(
            userLanguage === "fr"
              ? "La pharmacie associée à votre compte est introuvable."
              : "The pharmacy associated with your account could not be found.",
          );
        }

        if (!cancelled) {
          setPharmacy(
            pharmacyData as Pharmacy,
          );
        }

        /* ---------------------------------------------------
           ABONNEMENT
           --------------------------------------------------- */

        const {
          data: subscriptionRows,
          error: subscriptionError,
        } = await supabase
          .from("subscriptions")
          .select(
            "id, pharmacy_id, plan_id, status, trial_started_at, trial_ends_at, expires_at",
          )
          .eq(
            "pharmacy_id",
            profileData.pharmacy_id,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(1);

        if (
          !subscriptionError &&
          subscriptionRows?.[0]
        ) {
          const currentSubscription =
            subscriptionRows[0] as Subscription;

          if (!cancelled) {
            setSubscription(
              currentSubscription,
            );
          }

          /*
           * Contrôle d'accès visuel.
           *
           * Le vrai blocage de sécurité devra
           * également être effectué côté serveur.
           */
          const now = Date.now();

          let valid = false;

          if (
            currentSubscription.status ===
            "trial"
          ) {
            valid =
              !!currentSubscription.trial_ends_at &&
              new Date(
                currentSubscription.trial_ends_at,
              ).getTime() > now;
          }

          if (
            currentSubscription.status ===
            "active"
          ) {
            valid =
              !!currentSubscription.expires_at &&
              new Date(
                currentSubscription.expires_at,
              ).getTime() > now;
          }

          if (!valid) {
            router.replace(
              "/paiements",
            );

            return;
          }
        }

        /* ---------------------------------------------------
           VENTES DU CAISSIER
           --------------------------------------------------- */

        const {
          data: salesData,
          error: salesError,
        } = await supabase
          .from("sales")
          .select(
            "id, sale_number, subtotal, discount, tax, total, status, customer_name, customer_phone, created_at",
          )
          .eq(
            "pharmacy_id",
            profileData.pharmacy_id,
          )
          .eq(
            "user_id",
            user.id,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(100);

        if (salesError) {
          throw new Error(
            salesError.message,
          );
        }

        /* ---------------------------------------------------
           PRODUITS
           --------------------------------------------------- */

        const {
          data: productsData,
          error: productsError,
        } = await supabase
          .from("products")
          .select(
            "id, name, stock_quantity, minimum_stock, selling_price, is_active",
          )
          .eq(
            "pharmacy_id",
            profileData.pharmacy_id,
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

        if (!cancelled) {
          setSales(
            (salesData || []) as Sale[],
          );

          setProducts(
            (productsData ||
              []) as Product[],
          );
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "PHARMAFLOW CASHIER ERROR:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };

    /*
     * IMPORTANT :
     *
     * AUCUNE dépendance "language".
     *
     * Le chargement est exécuté une seule fois
     * pour la session/page.
     */
  }, [router]);

  /* =======================================================
     LOGOUT
     ======================================================= */

  async function handleLogout() {
    const {
      error: logoutError,
    } = await supabase.auth.signOut();

    if (logoutError) {
      setError(
        logoutError.message,
      );
      return;
    }

    router.replace("/login");
  }

  /* =======================================================
     STATISTIQUES
     ======================================================= */

  const todaySales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          isToday(
            sale.created_at,
          ) &&
          sale.status !==
            "cancelled",
      ),
    [sales],
  );

  const weekSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          isThisWeek(
            sale.created_at,
          ) &&
          sale.status !==
            "cancelled",
      ),
    [sales],
  );

  const monthSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          isThisMonth(
            sale.created_at,
          ) &&
          sale.status !==
            "cancelled",
      ),
    [sales],
  );

  const todayRevenue = useMemo(
    () =>
      todaySales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0,
          ),
        0,
      ),
    [todaySales],
  );

  const weekRevenue = useMemo(
    () =>
      weekSales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0,
          ),
        0,
      ),
    [weekSales],
  );

  const monthRevenue = useMemo(
    () =>
      monthSales.reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.total || 0,
          ),
        0,
      ),
    [monthSales],
  );

  const averageBasket =
    todaySales.length > 0
      ? todayRevenue /
        todaySales.length
      : 0;

  const lowStockProducts =
    useMemo(
      () =>
        products.filter(
          (product) =>
            Number(
              product.stock_quantity,
            ) > 0 &&
            Number(
              product.stock_quantity,
            ) <=
              Number(
                product.minimum_stock,
              ),
        ),
      [products],
    );

  const outOfStockProducts =
    useMemo(
      () =>
        products.filter(
          (product) =>
            Number(
              product.stock_quantity,
            ) <= 0,
        ),
      [products],
    );

  const recentSales =
    sales.slice(0, 8);

  const currency =
    pharmacy?.currency_code ||
    "XAF";

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const navigation = [
    {
      label: text.dashboard,
      href: "/caisse",
      icon: "⌂",
    },
    {
      label: text.newSale,
      href: "/ventes",
      icon: "＋",
    },
    {
      label: text.mySales,
      href: "/caisse/ventes",
      icon: "▤",
    },
    {
      label: text.products,
      href: "/caisse/produits",
      icon: "▦",
    },
    {
      label: text.stock,
      href: "/caisse/stock",
      icon: "▥",
    },
    {
      label: text.reports,
      href: "/caisse/rapports",
      icon: "📊",
    },
  ];

  function isActive(
    href: string,
  ) {
    if (href === "/caisse") {
      return pathname === "/caisse";
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`,
      )
    );
  }

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <div className="pf-app">
        <main
          className="pf-main"
          style={{
            marginLeft: 0,
          }}
        >
          <div className="pf-content">
            <div className="pf-container">
              <div className="pf-card">
                <div className="pf-loading-card">
                  <div className="pf-spinner" />
                  <p>
                    {text.loading}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* =======================================================
     ERREUR
     ======================================================= */

  if (error) {
    return (
      <div className="pf-app">
        <main
          className="pf-main"
          style={{
            marginLeft: 0,
          }}
        >
          <div className="pf-content">
            <div className="pf-container">
              <div className="pf-card">
                <div className="pf-alert pf-alert-danger">
                  <div className="pf-alert-icon">
                    !
                  </div>

                  <div>
                    <strong>
                      {text.errorTitle}
                    </strong>

                    <p>
                      {error}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="pf-btn pf-btn-primary"
                    onClick={() =>
                      window.location.reload()
                    }
                  >
                    ↻ {text.retry}
                  </button>

                  <button
                    type="button"
                    className="pf-btn pf-btn-secondary"
                    onClick={
                      handleLogout
                    }
                  >
                    {text.logout}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  /* =======================================================
     INTERFACE
     ======================================================= */

  return (
    <div className="pf-app">

      {/* =================================================
          OVERLAY MOBILE
          ================================================= */}

      {sidebarOpen && (
        <div
          className="pf-mobile-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* =================================================
          SIDEBAR
          ================================================= */}

      <aside
        className={`pf-sidebar ${
          sidebarOpen
            ? "pf-sidebar-open"
            : ""
        }`}
      >

        <div className="pf-sidebar-brand">

          <div className="pf-logo-mark">
            P
          </div>

          <div>
            <div className="pf-brand-name">
              PharmaFlow
            </div>

            <div className="pf-brand-subtitle">
              {text.cashierSpace}
            </div>
          </div>

          <button
            type="button"
            className="pf-mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label={
              text.closeMenu
            }
          >
            ×
          </button>

        </div>

        {/* PHARMACIE */}

        <div className="pf-pharmacy-card">

          <div className="pf-pharmacy-icon">
            🏥
          </div>

          <div className="pf-pharmacy-info">

            <strong>
              {pharmacy?.name ||
                text.pharmacy}
            </strong>

            <span>
              {pharmacy?.city ||
                ""}
            </span>

          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="pf-sidebar-nav">

          <div className="pf-nav-section-title">
            {text.mainMenu}
          </div>

          {navigation
            .slice(0, 3)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`pf-nav-item ${
                  isActive(
                    item.href,
                  )
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSidebarOpen(false)
                }
              >

                <span className="pf-nav-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>

              </Link>
            ))}

          <div className="pf-nav-section-title">
            {text.consultation}
          </div>

          {navigation
            .slice(3, 5)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`pf-nav-item ${
                  isActive(
                    item.href,
                  )
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSidebarOpen(false)
                }
              >

                <span className="pf-nav-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>

                <span className="pf-nav-readonly">
                  {text.readOnly}
                </span>

              </Link>
            ))}

          <div className="pf-nav-section-title">
            {text.analysis}
          </div>

          <Link
            href="/caisse/rapports"
            className={`pf-nav-item ${
              isActive(
                "/caisse/rapports",
              )
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSidebarOpen(false)
            }
          >

            <span className="pf-nav-icon">
              📊
            </span>

            <span>
              {text.reports}
            </span>

          </Link>

          <div className="pf-nav-section-title">
            {text.account}
          </div>

          <Link
            href="/parametres"
            className="pf-nav-item"
            onClick={() =>
              setSidebarOpen(false)
            }
          >

            <span className="pf-nav-icon">
              ⚙
            </span>

            <span>
              {text.profile}
            </span>

          </Link>

        </nav>

        {/* UTILISATEUR */}

        <div className="pf-sidebar-user">

          <div className="pf-user-avatar">
            {getInitials(
              userName,
            )}
          </div>

          <div className="pf-user-info">

            <strong>
              {userName}
            </strong>

            <span>
              {text.cashier}
            </span>

          </div>

          <button
            type="button"
            className="pf-logout-button"
            onClick={
              handleLogout
            }
            title={text.logout}
          >
            ↪
          </button>

        </div>

      </aside>

      {/* =================================================
          CONTENU PRINCIPAL
          ================================================= */}

      <main className="pf-main">

        {/* TOPBAR */}

        <header className="pf-topbar">

          <div className="pf-topbar-left">

            <button
              type="button"
              className="pf-mobile-menu"
              onClick={() =>
                setSidebarOpen(true)
              }
              aria-label={
                text.openMenu
              }
            >
              ☰
            </button>

            <div>

              <h1 className="pf-page-title">
                {text.hello},{" "}
                {
                  userName
                    .split(" ")[0]
                }{" "}
                👋
              </h1>

              <p className="pf-page-subtitle">
                {text.subtitle}
              </p>

            </div>

          </div>

          <div className="pf-topbar-actions">

            <div className="pf-role-pill">
              <span className="pf-role-dot" />
              {text.cashier}
            </div>

            <button
              type="button"
              className="pf-btn pf-btn-primary"
              onClick={() =>
                router.push(
                  "/ventes",
                )
              }
            >
              ＋ {text.newSale}
            </button>

          </div>

        </header>

        {/* CONTENU */}

        <div className="pf-content">

          <div className="pf-container">

            {/* =================================================
                ACCUEIL
                ================================================= */}

            <section className="pf-welcome-card">

              <div>

                <div className="pf-welcome-eyebrow">
                  {text.cashRegister}
                </div>

                <h2>
                  {text.welcomeTitle}
                </h2>

                <p>
                  {text.welcomeText}
                </p>

                <div
                  style={{
                    marginTop: 18,
                  }}
                >
                  <strong>
                    {pharmacy?.name ||
                      text.pharmacy}
                  </strong>
                </div>

              </div>

              <div className="pf-welcome-action">

                <button
                  type="button"
                  className="pf-btn pf-btn-white"
                  onClick={() =>
                    router.push(
                      "/ventes",
                    )
                  }
                >
                  {text.startSale} →
                </button>

              </div>

            </section>

            {/* =================================================
                STATISTIQUES
                ================================================= */}

            <section className="pf-stats-grid">

              <div className="pf-stat-card">

                <div className="pf-stat-top">

                  <div className="pf-stat-icon">
                    🧾
                  </div>

                  <span className="pf-stat-label">
                    {text.today}
                  </span>

                </div>

                <div className="pf-stat-value">
                  {todaySales.length}
                </div>

                <div className="pf-stat-description">
                  {text.todaySales}
                </div>

              </div>

              <div className="pf-stat-card">

                <div className="pf-stat-top">

                  <div className="pf-stat-icon">
                    💰
                  </div>

                  <span className="pf-stat-label">
                    {text.todayRevenue}
                  </span>

                </div>

                <div className="pf-stat-value pf-stat-money">
                  {formatMoney(
                    todayRevenue,
                    currency,
                    language,
                  )}
                </div>

                <div className="pf-stat-description">
                  {text.todayRevenueText}
                </div>

              </div>

              <div className="pf-stat-card">

                <div className="pf-stat-top">

                  <div className="pf-stat-icon">
                    🛒
                  </div>

                  <span className="pf-stat-label">
                    {text.averageBasket}
                  </span>

                </div>

                <div className="pf-stat-value pf-stat-money">
                  {formatMoney(
                    averageBasket,
                    currency,
                    language,
                  )}
                </div>

                <div className="pf-stat-description">
                  {text.averageBasketText}
                </div>

              </div>

              <div className="pf-stat-card">

                <div className="pf-stat-top">

                  <div className="pf-stat-icon">
                    📈
                  </div>

                  <span className="pf-stat-label">
                    {text.thisMonth}
                  </span>

                </div>

                <div className="pf-stat-value pf-stat-money">
                  {formatMoney(
                    monthRevenue,
                    currency,
                    language,
                  )}
                </div>

                <div className="pf-stat-description">
                  {text.monthRevenue}
                </div>

              </div>

            </section>

            {/* =================================================
                ACTIONS RAPIDES
                ================================================= */}

            <section className="pf-section">

              <div className="pf-section-header">

                <div>

                  <h2 className="pf-section-title">
                    {text.quickActions}
                  </h2>

                  <p className="pf-section-subtitle">
                    {text.quickActionsText}
                  </p>

                </div>

              </div>

              <div className="pf-quick-actions">

                <button
                  type="button"
                  className="pf-quick-action pf-quick-action-primary"
                  onClick={() =>
                    router.push(
                      "/ventes",
                    )
                  }
                >

                  <span className="pf-quick-icon">
                    🛒
                  </span>

                  <span>

                    <strong>
                      {text.newSale}
                    </strong>

                    <small>
                      {text.newSaleDescription}
                    </small>

                  </span>

                  <span className="pf-quick-arrow">
                    →
                  </span>

                </button>

                <Link
                  href="/caisse/produits"
                  className="pf-quick-action"
                >

                  <span className="pf-quick-icon">
                    📦
                  </span>

                  <span>

                    <strong>
                      {text.products}
                    </strong>

                    <small>
                      {text.productsDescription}
                    </small>

                  </span>

                  <span className="pf-quick-arrow">
                    →
                  </span>

                </Link>

                <Link
                  href="/caisse/stock"
                  className="pf-quick-action"
                >

                  <span className="pf-quick-icon">
                    📋
                  </span>

                  <span>

                    <strong>
                      {text.stock}
                    </strong>

                    <small>
                      {text.stockDescription}
                    </small>

                  </span>

                  <span className="pf-quick-arrow">
                    →
                  </span>

                </Link>

                <Link
                  href="/caisse/rapports"
                  className="pf-quick-action"
                >

                  <span className="pf-quick-icon">
                    📊
                  </span>

                  <span>

                    <strong>
                      {text.reports}
                    </strong>

                    <small>
                      {text.reportsDescription}
                    </small>

                  </span>

                  <span className="pf-quick-arrow">
                    →
                  </span>

                </Link>

              </div>

            </section>

            {/* =================================================
                GRILLE
                ================================================= */}

            <div className="pf-dashboard-grid">

              {/* MES VENTES */}

              <section className="pf-card">

                <div className="pf-card-header">

                  <div>

                    <h2 className="pf-card-title">
                      {text.latestSales}
                    </h2>

                    <p className="pf-card-subtitle">
                      {text.latestSalesText}
                    </p>

                  </div>

                  <Link
                    href="/caisse/ventes"
                    className="pf-card-link"
                  >
                    {text.viewAll} →
                  </Link>

                </div>

                {recentSales.length === 0 ? (

                  <div className="pf-empty-state">

                    <div className="pf-empty-icon">
                      🧾
                    </div>

                    <h3>
                      {text.noSales}
                    </h3>

                    <p>
                      {text.noSalesText}
                    </p>

                    <button
                      type="button"
                      className="pf-btn pf-btn-primary"
                      onClick={() =>
                        router.push(
                          "/ventes",
                        )
                      }
                    >
                      {text.makeSale}
                    </button>

                  </div>

                ) : (

                  <div className="pf-table-wrapper">

                    <table className="pf-table">

                      <thead>

                        <tr>

                          <th>
                            {text.sale}
                          </th>

                          <th>
                            {text.customer}
                          </th>

                          <th>
                            {text.date}
                          </th>

                          <th>
                            {text.status}
                          </th>

                          <th className="text-right">
                            {text.total}
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {recentSales.map(
                          (sale) => (
                            <tr
                              key={
                                sale.id
                              }
                            >

                              <td>
                                <strong>
                                  {
                                    sale.sale_number
                                  }
                                </strong>
                              </td>

                              <td>
                                {
                                  sale.customer_name ||
                                  text.counterCustomer
                                }
                              </td>

                              <td>
                                {formatDate(
                                  sale.created_at,
                                  language,
                                )}
                              </td>

                              <td>

                                <span
                                  className={`pf-badge ${
                                    sale.status ===
                                    "completed"
                                      ? "pf-badge-success"
                                      : sale.status ===
                                        "cancelled"
                                      ? "pf-badge-danger"
                                      : "pf-badge-warning"
                                  }`}
                                >

                                  {sale.status ===
                                  "completed"
                                    ? text.completed
                                    : sale.status ===
                                      "cancelled"
                                    ? text.cancelled
                                    : text.pending}

                                </span>

                              </td>

                              <td className="text-right">

                                <strong>
                                  {formatMoney(
                                    Number(
                                      sale.total,
                                    ),
                                    currency,
                                    language,
                                  )}
                                </strong>

                              </td>

                            </tr>
                          ),
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </section>

              {/* COLONNE DROITE */}

              <div className="pf-dashboard-side">

                {/* PERFORMANCE */}

                <section className="pf-card">

                  <div className="pf-card-header">

                    <div>

                      <h2 className="pf-card-title">
                        {text.performance}
                      </h2>

                      <p className="pf-card-subtitle">
                        {text.performanceText}
                      </p>

                    </div>

                  </div>

                  <div className="pf-performance-list">

                    <div className="pf-performance-row">

                      <div>

                        <span>
                          {text.todayPeriod}
                        </span>

                        <strong>
                          {
                            todaySales.length
                          }{" "}
                          {todaySales.length >
                          1
                            ? text.saleMany
                            : text.saleOne}
                        </strong>

                      </div>

                      <b>
                        {formatMoney(
                          todayRevenue,
                          currency,
                          language,
                        )}
                      </b>

                    </div>

                    <div className="pf-performance-row">

                      <div>

                        <span>
                          {text.weekPeriod}
                        </span>

                        <strong>
                          {
                            weekSales.length
                          }{" "}
                          {weekSales.length >
                          1
                            ? text.saleMany
                            : text.saleOne}
                        </strong>

                      </div>

                      <b>
                        {formatMoney(
                          weekRevenue,
                          currency,
                          language,
                        )}
                      </b>

                    </div>

                    <div className="pf-performance-row">

                      <div>

                        <span>
                          {text.monthPeriod}
                        </span>

                        <strong>
                          {
                            monthSales.length
                          }{" "}
                          {monthSales.length >
                          1
                            ? text.saleMany
                            : text.saleOne}
                        </strong>

                      </div>

                      <b>
                        {formatMoney(
                          monthRevenue,
                          currency,
                          language,
                        )}
                      </b>

                    </div>

                  </div>

                </section>

                {/* STOCK */}

                <section className="pf-card">

                  <div className="pf-card-header">

                    <div>

                      <h2 className="pf-card-title">
                        {text.stockStatus}
                      </h2>

                      <p className="pf-card-subtitle">
                        {text.readOnly}
                      </p>

                    </div>

                    <Link
                      href="/caisse/stock"
                      className="pf-card-link"
                    >
                      {text.consult}
                    </Link>

                  </div>

                  <div className="pf-stock-summary">

                    <div className="pf-stock-summary-item">

                      <div className="pf-stock-number">
                        {
                          products.length
                        }
                      </div>

                      <span>
                        {text.productsCount}
                      </span>

                    </div>

                    <div className="pf-stock-summary-item warning">

                      <div className="pf-stock-number">
                        {
                          lowStockProducts.length
                        }
                      </div>

                      <span>
                        {text.lowStock}
                      </span>

                    </div>

                    <div className="pf-stock-summary-item danger">

                      <div className="pf-stock-number">
                        {
                          outOfStockProducts.length
                        }
                      </div>

                      <span>
                        {text.outOfStock}
                      </span>

                    </div>

                  </div>

                  {lowStockProducts.length >
                    0 && (

                    <div className="pf-alert pf-alert-warning">

                      <div className="pf-alert-icon">
                        !
                      </div>

                      <div>

                        <strong>
                          {text.stockAttention}
                        </strong>

                        <p>
                          {
                            lowStockProducts.length
                          }{" "}
                          {lowStockProducts.length >
                          1
                            ? text.productsAttention
                            : text.productAttention}
                        </p>

                      </div>

                    </div>

                  )}

                  {outOfStockProducts.length >
                    0 && (

                    <div
                      className="pf-alert pf-alert-danger"
                      style={{
                        marginTop: 10,
                      }}
                    >

                      <div className="pf-alert-icon">
                        !
                      </div>

                      <div>

                        <strong>
                          {
                            text.outOfStockTitle
                          }
                        </strong>

                        <p>
                          {
                            outOfStockProducts.length
                          }{" "}
                          {outOfStockProducts.length >
                          1
                            ? text.manyOutOfStock
                            : text.oneOutOfStock}
                        </p>

                      </div>

                    </div>

                  )}

                </section>

              </div>

            </div>

            {/* =================================================
                RÉSUMÉ D'ACTIVITÉ
                ================================================= */}

            <section className="pf-section">

              <div className="pf-section-header">

                <div>

                  <h2 className="pf-section-title">
                    {text.activitySummary}
                  </h2>

                  <p className="pf-section-subtitle">
                    {text.activitySummaryText}
                  </p>

                </div>

                <Link
                  href="/caisse/rapports"
                  className="pf-card-link"
                >
                  {text.reports} →
                </Link>

              </div>

              <div className="pf-stats-grid">

                <div className="pf-stat-card">

                  <div className="pf-stat-top">

                    <div className="pf-stat-icon">
                      📅
                    </div>

                    <span className="pf-stat-label">
                      {text.week}
                    </span>

                  </div>

                  <div className="pf-stat-value">
                    {
                      weekSales.length
                    }
                  </div>

                  <div className="pf-stat-description">
                    {text.weekSales}
                  </div>

                </div>

                <div className="pf-stat-card">

                  <div className="pf-stat-top">

                    <div className="pf-stat-icon">
                      💼
                    </div>

                    <span className="pf-stat-label">
                      {text.weekRevenue}
                    </span>

                  </div>

                  <div className="pf-stat-value pf-stat-money">
                    {formatMoney(
                      weekRevenue,
                      currency,
                      language,
                    )}
                  </div>

                  <div className="pf-stat-description">
                    {text.commercialActivity}
                  </div>

                </div>

                <div className="pf-stat-card">

                  <div className="pf-stat-top">

                    <div className="pf-stat-icon">
                      📦
                    </div>

                    <span className="pf-stat-label">
                      {text.catalogue}
                    </span>

                  </div>

                  <div className="pf-stat-value">
                    {
                      products.length
                    }
                  </div>

                  <div className="pf-stat-description">
                    {text.activeProducts}
                  </div>

                </div>

                <div className="pf-stat-card">

                  <div className="pf-stat-top">

                    <div className="pf-stat-icon">
                      🔐
                    </div>

                    <span className="pf-stat-label">
                      {text.access}
                    </span>

                  </div>

                  <div className="pf-stat-value">
                    {text.secured}
                  </div>

                  <div className="pf-stat-description">
                    {text.pharmacyData}
                  </div>

                </div>

              </div>

            </section>

            {/* =================================================
                SÉCURITÉ
                ================================================= */}

            <section className="pf-security-card">

              <div className="pf-security-icon">
                🔐
              </div>

              <div>

                <strong>
                  {text.securityTitle}
                </strong>

                <p>
                  {text.securityText}
                </p>

              </div>

            </section>

          </div>

        </div>

      </main>

    </div>
  );
}