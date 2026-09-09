"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type Period = "today" | "week" | "month" | "year";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  pharmacy_id: string | null;
};

type Pharmacy = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
};

type Product = {
  id: string;
  name: string;
  category: string | null;
  stock_quantity: number | null;
  minimum_stock: number | null;
  purchase_price: number | null;
  selling_price: number | null;
  expiry_date: string | null;
  is_active: boolean | null;
};

type Sale = {
  id: string;
  pharmacy_id: string;
  user_id: string | null;
  sale_number: string | null;
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  total: number | null;
  status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  pharmacy_id: string;
  sale_id: string | null;
  amount: number | null;
  method: string | null;
  created_at: string;
};

type MethodStat = {
  method: string;
  amount: number;
  percentage: number;
};

const TEXT = {
  fr: {
    title: "Rapports",
    subtitle:
      "Analyse complète de l'activité de votre pharmacie",
    dashboard: "Tableau de bord",
    products: "Produits",
    stock: "Stock",
    sales: "Ventes",
    users: "Utilisateurs",
    reports: "Rapports",
    payments: "Paiements",
    settings: "Paramètres",
    logout: "Déconnexion",

    period: "Période",
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année",

    refresh: "Actualiser",
    refreshing: "Actualisation...",
    print: "Imprimer le rapport",
    export: "Exporter CSV",

    loading: "Chargement du rapport...",
    error: "Une erreur est survenue",
    retry: "Réessayer",

    totalSales: "Ventes totales",
    revenue: "Chiffre d'affaires",
    averageBasket: "Panier moyen",
    paymentsReceived: "Paiements reçus",

    financial: "Résumé financier",
    subtotal: "Sous-total",
    discounts: "Remises",
    taxes: "Taxes",
    total: "Total",
    paymentTotal: "Total encaissé",

    stockSituation: "Situation du stock",
    activeProducts: "Produits actifs",
    lowStock: "Stock faible",
    outOfStock: "Ruptures de stock",
    stockValue: "Valeur du stock",
    expired: "Produits expirés",
    expiringSoon: "Expiration prochaine",

    alerts: "Alertes",
    noAlerts: "Aucune alerte importante",

    paymentDistribution: "Répartition des paiements",
    noPayments: "Aucun paiement enregistré",

    recentSales: "Ventes récentes",
    saleNumber: "N° vente",
    date: "Date",
    customer: "Client",
    method: "Mode de paiement",
    status: "Statut",
    amount: "Montant",
    noSales: "Aucune vente sur cette période",

    completed: "Terminée",
    pending: "En attente",
    cancelled: "Annulée",
    refunded: "Remboursée",

    cash: "Espèces",
    mobile_money: "Mobile Money",
    card: "Carte bancaire",
    bank_transfer: "Virement bancaire",
    other: "Autre",

    generatedOn: "Généré le",
    generatedBy: "Généré par",
    reportPeriod: "Période du rapport",

    stockAlert: "Stock faible",
    outOfStockAlert: "Rupture de stock",
    expiredAlert: "Produit expiré",
    expiringAlert: "Expiration prochaine",

    noCustomer: "Client comptoir",
    all: "Tous",
  },

  en: {
    title: "Reports",
    subtitle:
      "Complete analysis of your pharmacy activity",
    dashboard: "Dashboard",
    products: "Products",
    stock: "Stock",
    sales: "Sales",
    users: "Users",
    reports: "Reports",
    payments: "Payments",
    settings: "Settings",
    logout: "Log out",

    period: "Period",
    today: "Today",
    week: "This week",
    month: "This month",
    year: "This year",

    refresh: "Refresh",
    refreshing: "Refreshing...",
    print: "Print report",
    export: "Export CSV",

    loading: "Loading report...",
    error: "An error occurred",
    retry: "Retry",

    totalSales: "Total sales",
    revenue: "Revenue",
    averageBasket: "Average basket",
    paymentsReceived: "Payments received",

    financial: "Financial summary",
    subtotal: "Subtotal",
    discounts: "Discounts",
    taxes: "Taxes",
    total: "Total",
    paymentTotal: "Total collected",

    stockSituation: "Stock situation",
    activeProducts: "Active products",
    lowStock: "Low stock",
    outOfStock: "Out of stock",
    stockValue: "Stock value",
    expired: "Expired products",
    expiringSoon: "Expiring soon",

    alerts: "Alerts",
    noAlerts: "No important alerts",

    paymentDistribution: "Payment distribution",
    noPayments: "No payments recorded",

    recentSales: "Recent sales",
    saleNumber: "Sale #",
    date: "Date",
    customer: "Customer",
    method: "Payment method",
    status: "Status",
    amount: "Amount",
    noSales: "No sales during this period",

    completed: "Completed",
    pending: "Pending",
    cancelled: "Cancelled",
    refunded: "Refunded",

    cash: "Cash",
    mobile_money: "Mobile Money",
    card: "Card",
    bank_transfer: "Bank transfer",
    other: "Other",

    generatedOn: "Generated on",
    generatedBy: "Generated by",
    reportPeriod: "Report period",

    stockAlert: "Low stock",
    outOfStockAlert: "Out of stock",
    expiredAlert: "Expired product",
    expiringAlert: "Expiring soon",

    noCustomer: "Counter customer",
    all: "All",
  },
} as const;

function getPeriodRange(period: Period) {
  const now = new Date();

  const start = new Date(now);
  const end = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (period === "week") {
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    start.setDate(start.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);

    end.setHours(23, 59, 59, 999);
  }

  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function safeNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function isValidSale(sale: Sale) {
  const status = String(sale.status ?? "").toLowerCase();

  return status !== "cancelled" && status !== "refunded";
}

export default function RapportsPage() {
  const locale = useLocale();
  const router = useRouter();

  const isEnglish = locale === "en";
  const t = isEnglish ? TEXT.en : TEXT.fr;

  const supabase = useMemo(() => createClient(), []);

  const [period, setPeriod] = useState<Period>("month");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const formatMoney = useCallback(
    (value: number) => {
      const currency = pharmacy?.currency_code || "XAF";

      try {
        return new Intl.NumberFormat(
          isEnglish ? "en-US" : "fr-FR",
          {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          },
        ).format(value);
      } catch {
        return `${new Intl.NumberFormat(
          isEnglish ? "en-US" : "fr-FR",
        ).format(value)} ${currency}`;
      }
    },
    [pharmacy?.currency_code, isEnglish],
  );

  const formatNumber = useCallback(
    (value: number) =>
      new Intl.NumberFormat(
        isEnglish ? "en-US" : "fr-FR",
      ).format(value),
    [isEnglish],
  );

  const formatDate = useCallback(
    (value: string) =>
      new Intl.DateTimeFormat(
        isEnglish ? "en-US" : "fr-FR",
        {
          dateStyle: "medium",
          timeStyle: "short",
        },
      ).format(new Date(value)),
    [isEnglish],
  );

  const formatDateOnly = useCallback(
    (value: string) =>
      new Intl.DateTimeFormat(
        isEnglish ? "en-US" : "fr-FR",
        {
          dateStyle: "medium",
        },
      ).format(new Date(value)),
    [isEnglish],
  );

  const periodLabel = useMemo(() => {
    if (period === "today") return t.today;
    if (period === "week") return t.week;
    if (period === "year") return t.year;
    return t.month;
  }, [period, t]);

  const loadReport = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const {
          data: {
            user,
          },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const {
          data: currentProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, pharmacy_id",
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!currentProfile?.pharmacy_id) {
          throw new Error(
            isEnglish
              ? "No pharmacy is associated with your account."
              : "Aucune pharmacie n'est associée à votre compte.",
          );
        }

        const role = String(
          currentProfile.role ?? "",
        ).toLowerCase();

        if (
          role !== "owner" &&
          role !== "admin"
        ) {
          router.replace(
            role === "pharmacist"
              ? "/pharmacien"
              : role === "cashier"
                ? "/caisse"
                : "/dashboard",
          );
          return;
        }

        const pharmacyId =
          currentProfile.pharmacy_id;

        const {
          data: currentPharmacy,
          error: pharmacyError,
        } = await supabase
          .from("pharmacies")
          .select(
            "id, name, address, city, country_code, currency_code",
          )
          .eq("id", pharmacyId)
          .maybeSingle();

        if (pharmacyError) {
          throw pharmacyError;
        }

        const { start, end } =
          getPeriodRange(period);

        const [
          productsResult,
          salesResult,
          paymentsResult,
        ] = await Promise.all([
          supabase
            .from("products")
            .select(
              "id, name, category, stock_quantity, minimum_stock, purchase_price, selling_price, expiry_date, is_active",
            )
            .eq("pharmacy_id", pharmacyId)
            .order("name", {
              ascending: true,
            })
            .limit(5000),

          supabase
            .from("sales")
            .select(
              "id, pharmacy_id, user_id, sale_number, subtotal, discount, tax, total, status, customer_name, customer_phone, created_at",
            )
            .eq("pharmacy_id", pharmacyId)
            .gte(
              "created_at",
              start.toISOString(),
            )
            .lte(
              "created_at",
              end.toISOString(),
            )
            .order("created_at", {
              ascending: false,
            })
            .limit(5000),

          supabase
            .from("payments")
            .select(
              "id, pharmacy_id, sale_id, amount, method, created_at",
            )
            .eq("pharmacy_id", pharmacyId)
            .gte(
              "created_at",
              start.toISOString(),
            )
            .lte(
              "created_at",
              end.toISOString(),
            )
            .order("created_at", {
              ascending: false,
            })
            .limit(5000),
        ]);

        if (productsResult.error) {
          throw productsResult.error;
        }

        if (salesResult.error) {
          throw salesResult.error;
        }

        if (paymentsResult.error) {
          throw paymentsResult.error;
        }

        setProfile(
          currentProfile as Profile,
        );

        setPharmacy(
          currentPharmacy as Pharmacy | null,
        );

        setProducts(
          (productsResult.data ??
            []) as Product[],
        );

        setSales(
          (salesResult.data ??
            []) as Sale[],
        );

        setPayments(
          (paymentsResult.data ??
            []) as Payment[],
        );
      } catch (err) {
        console.error(
          "Erreur chargement rapports:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : isEnglish
              ? "Unable to load the report."
              : "Impossible de charger le rapport.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isEnglish, period, router, supabase],
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    document.title = pharmacy?.name
      ? `PharmaFlow — ${t.title} — ${pharmacy.name}`
      : `PharmaFlow — ${t.title}`;
  }, [pharmacy?.name, t.title]);

  const validSales = useMemo(
    () => sales.filter(isValidSale),
    [sales],
  );

  const revenue = useMemo(
    () =>
      validSales.reduce(
        (sum, sale) =>
          sum + safeNumber(sale.total),
        0,
      ),
    [validSales],
  );

  const subtotal = useMemo(
    () =>
      validSales.reduce(
        (sum, sale) =>
          sum + safeNumber(sale.subtotal),
        0,
      ),
    [validSales],
  );

  const discounts = useMemo(
    () =>
      validSales.reduce(
        (sum, sale) =>
          sum + safeNumber(sale.discount),
        0,
      ),
    [validSales],
  );

  const taxes = useMemo(
    () =>
      validSales.reduce(
        (sum, sale) =>
          sum + safeNumber(sale.tax),
        0,
      ),
    [validSales],
  );

  const paymentTotal = useMemo(
    () =>
      payments.reduce(
        (sum, payment) =>
          sum + safeNumber(payment.amount),
        0,
      ),
    [payments],
  );

  const averageBasket =
    validSales.length > 0
      ? revenue / validSales.length
      : 0;

  const activeProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.is_active !== false,
      ),
    [products],
  );

  const lowStockProducts = useMemo(
    () =>
      activeProducts.filter((product) => {
        const stock = safeNumber(
          product.stock_quantity,
        );

        const minimum = safeNumber(
          product.minimum_stock,
        );

        return stock > 0 && stock <= minimum;
      }),
    [activeProducts],
  );

  const outOfStockProducts = useMemo(
    () =>
      activeProducts.filter(
        (product) =>
          safeNumber(product.stock_quantity) <=
          0,
      ),
    [activeProducts],
  );

  const stockValue = useMemo(
    () =>
      activeProducts.reduce(
        (sum, product) =>
          sum +
          safeNumber(
            product.stock_quantity,
          ) *
            safeNumber(
              product.purchase_price,
            ),
        0,
      ),
    [activeProducts],
  );

  const expiredProducts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activeProducts.filter(
      (product) => {
        if (!product.expiry_date) {
          return false;
        }

        const expiry = new Date(
          product.expiry_date,
        );
        expiry.setHours(0, 0, 0, 0);

        return expiry < today;
      },
    );
  }, [activeProducts]);

  const expiringProducts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limit = new Date(today);
    limit.setDate(limit.getDate() + 90);

    return activeProducts.filter(
      (product) => {
        if (!product.expiry_date) {
          return false;
        }

        const expiry = new Date(
          product.expiry_date,
        );
        expiry.setHours(0, 0, 0, 0);

        return (
          expiry >= today &&
          expiry <= limit
        );
      },
    );
  }, [activeProducts]);

  const paymentStats = useMemo<MethodStat[]>(
    () => {
      const totals =
        new Map<string, number>();

      payments.forEach((payment) => {
        const method =
          payment.method || "other";

        totals.set(
          method,
          (totals.get(method) ?? 0) +
            safeNumber(payment.amount),
        );
      });

      const total = Array.from(
        totals.values(),
      ).reduce(
        (sum, amount) => sum + amount,
        0,
      );

      return Array.from(
        totals.entries(),
      )
        .map(
          ([method, amount]) => ({
            method,
            amount,
            percentage:
              total > 0
                ? (amount / total) * 100
                : 0,
          }),
        )
        .sort(
          (a, b) => b.amount - a.amount,
        );
    },
    [payments],
  );

  const getPaymentLabel = useCallback(
    (method: string | null) => {
      const key =
        method || "other";

      if (
        key in t &&
        key !== "all"
      ) {
        return t[
          key as keyof typeof t
        ];
      }

      return key;
    },
    [t],
  );

  const getStatusLabel = useCallback(
    (status: string | null) => {
      const value =
        String(status ?? "")
          .toLowerCase();

      if (value === "completed") {
        return t.completed;
      }

      if (value === "pending") {
        return t.pending;
      }

      if (value === "cancelled") {
        return t.cancelled;
      }

      if (value === "refunded") {
        return t.refunded;
      }

      return status || t.pending;
    },
    [t],
  );

  const getStatusClass = useCallback(
    (status: string | null) => {
      const value =
        String(status ?? "")
          .toLowerCase();

      if (value === "completed") {
        return "pf-status-success";
      }

      if (value === "pending") {
        return "pf-status-warning";
      }

      if (
        value === "cancelled" ||
        value === "refunded"
      ) {
        return "pf-status-danger";
      }

      return "pf-status-neutral";
    },
    [],
  );

  const alerts = useMemo(
    () => {
      const items: Array<{
        type:
          | "danger"
          | "warning"
          | "info";
        title: string;
        description: string;
      }> = [];

      if (outOfStockProducts.length > 0) {
        items.push({
          type: "danger",
          title: t.outOfStockAlert,
          description: isEnglish
            ? `${outOfStockProducts.length} product(s) are out of stock.`
            : `${outOfStockProducts.length} produit(s) sont en rupture de stock.`,
        });
      }

      if (lowStockProducts.length > 0) {
        items.push({
          type: "warning",
          title: t.stockAlert,
          description: isEnglish
            ? `${lowStockProducts.length} product(s) have low stock.`
            : `${lowStockProducts.length} produit(s) ont un stock faible.`,
        });
      }

      if (expiredProducts.length > 0) {
        items.push({
          type: "danger",
          title: t.expiredAlert,
          description: isEnglish
            ? `${expiredProducts.length} product(s) have expired.`
            : `${expiredProducts.length} produit(s) sont expirés.`,
        });
      }

      if (expiringProducts.length > 0) {
        items.push({
          type: "info",
          title: t.expiringAlert,
          description: isEnglish
            ? `${expiringProducts.length} product(s) expire within 90 days.`
            : `${expiringProducts.length} produit(s) expirent dans les 90 jours.`,
        });
      }

      return items;
    },
    [
      expiredProducts.length,
      expiringProducts.length,
      isEnglish,
      lowStockProducts.length,
      outOfStockProducts.length,
      t,
    ],
  );

  const handlePrint = useCallback(() => {
    const report =
      document.getElementById(
        "pf-print-report",
      );

    if (!report) {
      window.print();
      return;
    }

    document.documentElement.classList.add(
      "pf-printing",
    );

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);

  useEffect(() => {
    const afterPrint = () => {
      document.documentElement.classList.remove(
        "pf-printing",
      );
    };

    window.addEventListener(
      "afterprint",
      afterPrint,
    );

    return () => {
      window.removeEventListener(
        "afterprint",
        afterPrint,
      );
    };
  }, []);

  const handleExport = useCallback(() => {
    if (sales.length === 0) {
      return;
    }

    const headers = [
      t.saleNumber,
      t.date,
      t.customer,
      t.subtotal,
      t.discounts,
      t.taxes,
      t.total,
      t.status,
    ];

    const rows = sales.map(
      (sale) => [
        sale.sale_number ?? "",
        formatDate(sale.created_at),
        sale.customer_name ??
          t.noCustomer,
        safeNumber(sale.subtotal),
        safeNumber(sale.discount),
        safeNumber(sale.tax),
        safeNumber(sale.total),
        getStatusLabel(sale.status),
      ],
    );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const stringValue =
              String(value ?? "");

            return `"${stringValue.replaceAll(
              '"',
              '""',
            )}"`;
          })
          .join(";"),
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type:
          "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = `pharmaflow-rapport-${period}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }, [
    formatDate,
    getStatusLabel,
    period,
    sales,
    t,
  ]);

  const handleLogout = useCallback(
    async () => {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    },
    [router, supabase],
  );

  if (loading) {
    return (
      <main className="pf-report-loading-screen">
        <div className="pf-report-loading-card">
          <div className="pf-report-loading-logo">
            ✚
          </div>

          <div className="pf-report-spinner" />

          <h1>{t.loading}</h1>

          <p>
            PharmaFlow
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pf-report-error-screen">
        <div className="pf-report-error-card">
          <div className="pf-report-error-icon">
            !
          </div>

          <h1>{t.error}</h1>

          <p>{error}</p>

          <button
            type="button"
            className="pf-report-primary-button"
            onClick={() =>
              loadReport()
            }
          >
            {t.retry}
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="pf-report-app">
        <aside className="pf-report-sidebar">
          <div className="pf-report-brand">
            <div className="pf-report-brand-icon">
              ✚
            </div>

            <div>
              <strong>
                PharmaFlow
              </strong>

              <span>
                Pharmacy Management
              </span>
            </div>
          </div>

          <div className="pf-report-sidebar-section">
            <span>
              {isEnglish
                ? "MAIN MENU"
                : "MENU PRINCIPAL"}
            </span>

            <nav>
              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard")
                }
              >
                <span>⌂</span>
                {t.dashboard}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/products")
                }
              >
                <span>▣</span>
                {t.products}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/stock")
                }
              >
                <span>▤</span>
                {t.stock}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/ventes")
                }
              >
                <span>◫</span>
                {t.sales}
              </button>

              <button
                type="button"
                className="active"
              >
                <span>◩</span>
                {t.reports}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/paiements")
                }
              >
                <span>₣</span>
                {t.payments}
              </button>
            </nav>
          </div>

          <div className="pf-report-sidebar-bottom">
            <button
              type="button"
              onClick={() =>
                router.push("/parametres")
              }
            >
              <span>⚙</span>
              {t.settings}
            </button>

            <button
              type="button"
              onClick={handleLogout}
            >
              <span>↪</span>
              {t.logout}
            </button>
          </div>
        </aside>

        <main className="pf-report-main">
          <header className="pf-report-topbar">
            <div>
              <div className="pf-report-breadcrumb">
                {t.dashboard}
                <span>/</span>
                {t.reports}
              </div>

              <h1>
                {t.title}
              </h1>

              <p>
                {t.subtitle}
              </p>
            </div>

            <div className="pf-report-topbar-actions">
              <button
                type="button"
                className="pf-report-icon-button"
                onClick={() =>
                  loadReport(true)
                }
                title={t.refresh}
                aria-label={t.refresh}
              >
                ↻
              </button>

              <button
                type="button"
                className="pf-report-secondary-button"
                onClick={
                  handleExport
                }
              >
                ↓ {t.export}
              </button>

              <button
                type="button"
                className="pf-report-primary-button"
                onClick={
                  handlePrint
                }
              >
                🖨 {t.print}
              </button>
            </div>
          </header>

          <section className="pf-report-content">
            <div className="pf-report-toolbar">
              <div>
                <span className="pf-report-toolbar-label">
                  {t.period}
                </span>

                <div className="pf-report-periods">
                  {(
                    [
                      "today",
                      "week",
                      "month",
                      "year",
                    ] as Period[]
                  ).map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={
                        period === value
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPeriod(value)
                      }
                    >
                      {value ===
                      "today"
                        ? t.today
                        : value ===
                            "week"
                          ? t.week
                          : value ===
                              "month"
                            ? t.month
                            : t.year}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pf-report-period-current">
                <span>
                  {periodLabel}
                </span>

                {refreshing && (
                  <small>
                    {t.refreshing}
                  </small>
                )}
              </div>
            </div>

            <section className="pf-report-hero">
              <div className="pf-report-hero-copy">
                <span className="pf-report-eyebrow">
                  PHARMAFLOW REPORT
                </span>

                <h2>
                  {pharmacy?.name ||
                    "PharmaFlow"}
                </h2>

                <p>
                  {periodLabel}
                </p>
              </div>

              <div className="pf-report-hero-meta">
                <div>
                  <span>
                    {t.generatedBy}
                  </span>

                  <strong>
                    {profile?.full_name ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    {t.generatedOn}
                  </span>

                  <strong>
                    {formatDate(
                      new Date().toISOString(),
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="pf-report-kpi-grid">
              <article className="pf-report-kpi-card revenue">
                <div className="pf-report-kpi-top">
                  <span>
                    {t.revenue}
                  </span>

                  <div className="pf-report-kpi-icon">
                    $
                  </div>
                </div>

                <strong>
                  {formatMoney(
                    revenue,
                  )}
                </strong>

                <small>
                  {formatNumber(
                    validSales.length,
                  )}{" "}
                  {t.totalSales.toLowerCase()}
                </small>
              </article>

              <article className="pf-report-kpi-card sales">
                <div className="pf-report-kpi-top">
                  <span>
                    {t.totalSales}
                  </span>

                  <div className="pf-report-kpi-icon">
                    ↗
                  </div>
                </div>

                <strong>
                  {formatNumber(
                    validSales.length,
                  )}
                </strong>

                <small>
                  {periodLabel}
                </small>
              </article>

              <article className="pf-report-kpi-card basket">
                <div className="pf-report-kpi-top">
                  <span>
                    {t.averageBasket}
                  </span>

                  <div className="pf-report-kpi-icon">
                    ◉
                  </div>
                </div>

                <strong>
                  {formatMoney(
                    averageBasket,
                  )}
                </strong>

                <small>
                  {isEnglish
                    ? "Per completed sale"
                    : "Par vente réalisée"}
                </small>
              </article>

              <article className="pf-report-kpi-card payment">
                <div className="pf-report-kpi-top">
                  <span>
                    {t.paymentsReceived}
                  </span>

                  <div className="pf-report-kpi-icon">
                    ✓
                  </div>
                </div>

                <strong>
                  {formatMoney(
                    paymentTotal,
                  )}
                </strong>

                <small>
                  {isEnglish
                    ? "Recorded payments"
                    : "Paiements enregistrés"}
                </small>
              </article>
            </section>
                        <section className="pf-report-panels">

              {/* ==================================================
                  RÉSUMÉ FINANCIER
                 ================================================== */}

              <article className="pf-report-panel">
                <div className="pf-report-panel-header">
                  <div className="pf-report-panel-heading">
                    <div className="pf-report-panel-icon finance">
                      €
                    </div>

                    <div>
                      <h3>{t.financial}</h3>

                      <p>
                        {isEnglish
                          ? "Financial performance for the selected period"
                          : "Performance financière sur la période sélectionnée"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pf-report-financial-list">
                  <div className="pf-report-financial-row">
                    <span>{t.subtotal}</span>

                    <strong>
                      {formatMoney(subtotal)}
                    </strong>
                  </div>

                  <div className="pf-report-financial-row">
                    <span>{t.discounts}</span>

                    <strong className="negative">
                      - {formatMoney(discounts)}
                    </strong>
                  </div>

                  <div className="pf-report-financial-row">
                    <span>{t.taxes}</span>

                    <strong>
                      {formatMoney(taxes)}
                    </strong>
                  </div>

                  <div className="pf-report-financial-row total">
                    <span>{t.total}</span>

                    <strong>
                      {formatMoney(revenue)}
                    </strong>
                  </div>

                  <div className="pf-report-financial-row collected">
                    <span>{t.paymentTotal}</span>

                    <strong>
                      {formatMoney(paymentTotal)}
                    </strong>
                  </div>
                </div>

                <div className="pf-report-financial-footer">
                  <div>
                    <span>
                      {isEnglish
                        ? "Collection rate"
                        : "Taux d'encaissement"}
                    </span>

                    <strong>
                      {revenue > 0
                        ? `${Math.min(
                            100,
                            Math.round(
                              (paymentTotal /
                                revenue) *
                                100,
                            ),
                          )}%`
                        : "0%"}
                    </strong>
                  </div>

                  <div className="pf-report-mini-progress">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          revenue > 0
                            ? (paymentTotal /
                                revenue) *
                                100
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </article>

              {/* ==================================================
                  SITUATION DU STOCK
                 ================================================== */}

              <article className="pf-report-panel">
                <div className="pf-report-panel-header">
                  <div className="pf-report-panel-heading">
                    <div className="pf-report-panel-icon stock">
                      ▦
                    </div>

                    <div>
                      <h3>{t.stockSituation}</h3>

                      <p>
                        {isEnglish
                          ? "Current inventory overview"
                          : "Vue d'ensemble de l'inventaire actuel"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pf-report-stock-grid">

                  <div className="pf-report-stock-item">
                    <span>{t.activeProducts}</span>

                    <strong>
                      {formatNumber(
                        activeProducts.length,
                      )}
                    </strong>

                    <small>
                      {isEnglish
                        ? "Active references"
                        : "Références actives"}
                    </small>
                  </div>

                  <div className="pf-report-stock-item warning">
                    <span>{t.lowStock}</span>

                    <strong>
                      {formatNumber(
                        lowStockProducts.length,
                      )}
                    </strong>

                    <small>
                      {isEnglish
                        ? "Need replenishment"
                        : "À réapprovisionner"}
                    </small>
                  </div>

                  <div className="pf-report-stock-item danger">
                    <span>{t.outOfStock}</span>

                    <strong>
                      {formatNumber(
                        outOfStockProducts.length,
                      )}
                    </strong>

                    <small>
                      {isEnglish
                        ? "Unavailable"
                        : "Indisponibles"}
                    </small>
                  </div>

                  <div className="pf-report-stock-item info">
                    <span>{t.stockValue}</span>

                    <strong>
                      {formatMoney(
                        stockValue,
                      )}
                    </strong>

                    <small>
                      {isEnglish
                        ? "Purchase value"
                        : "Valeur d'achat"}
                    </small>
                  </div>

                  <div className="pf-report-stock-item danger">
                    <span>{t.expired}</span>

                    <strong>
                      {formatNumber(
                        expiredProducts.length,
                      )}
                    </strong>

                    <small>
                      {isEnglish
                        ? "Expired references"
                        : "Références expirées"}
                    </small>
                  </div>

                  <div className="pf-report-stock-item warning">
                    <span>{t.expiringSoon}</span>

                    <strong>
                      {formatNumber(
                        expiringProducts.length,
                      )}
                    </strong>

                    <small>
                      {isEnglish
                        ? "Within 90 days"
                        : "Dans les 90 jours"}
                    </small>
                  </div>

                </div>
              </article>

            </section>

            {/* ====================================================
                ALERTES
               ==================================================== */}

            <section className="pf-report-panel pf-report-alert-panel">

              <div className="pf-report-panel-header">

                <div className="pf-report-panel-heading">

                  <div className="pf-report-panel-icon alert">
                    !
                  </div>

                  <div>
                    <h3>{t.alerts}</h3>

                    <p>
                      {isEnglish
                        ? "Items requiring attention"
                        : "Éléments nécessitant votre attention"}
                    </p>
                  </div>

                </div>

                <div
                  className={
                    alerts.length > 0
                      ? "pf-report-alert-count has-alerts"
                      : "pf-report-alert-count"
                  }
                >
                  {alerts.length}
                </div>

              </div>

              {alerts.length === 0 ? (
                <div className="pf-report-no-alerts">

                  <div className="pf-report-success-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      {t.noAlerts}
                    </strong>

                    <span>
                      {isEnglish
                        ? "Your inventory is currently under control."
                        : "Votre inventaire est actuellement sous contrôle."}
                    </span>
                  </div>

                </div>
              ) : (
                <div className="pf-report-alert-list">

                  {alerts.map(
                    (alert, index) => (
                      <div
                        key={`${alert.type}-${index}`}
                        className={`pf-report-alert ${alert.type}`}
                      >
                        <div className="pf-report-alert-symbol">
                          {alert.type ===
                          "danger"
                            ? "!"
                            : alert.type ===
                                "warning"
                              ? "⚠"
                              : "i"}
                        </div>

                        <div className="pf-report-alert-content">
                          <strong>
                            {alert.title}
                          </strong>

                          <span>
                            {alert.description}
                          </span>
                        </div>
                      </div>
                    ),
                  )}

                </div>
              )}

            </section>

            {/* ====================================================
                PAIEMENTS + ACTIVITÉ
               ==================================================== */}

            <section className="pf-report-two-columns">

              {/* ================= PAIEMENTS ================= */}

              <article className="pf-report-panel">

                <div className="pf-report-panel-header">

                  <div className="pf-report-panel-heading">

                    <div className="pf-report-panel-icon payment">
                      $
                    </div>

                    <div>
                      <h3>
                        {t.paymentDistribution}
                      </h3>

                      <p>
                        {isEnglish
                          ? "Distribution of collected payments"
                          : "Répartition des paiements encaissés"}
                      </p>
                    </div>

                  </div>

                </div>

                {paymentStats.length === 0 ? (
                  <div className="pf-report-empty">

                    <div className="pf-report-empty-icon">
                      $
                    </div>

                    <strong>
                      {t.noPayments}
                    </strong>

                  </div>
                ) : (
                  <div className="pf-report-payment-list">

                    {paymentStats.map(
                      (stat) => (
                        <div
                          key={stat.method}
                          className="pf-report-payment-item"
                        >

                          <div className="pf-report-payment-top">

                            <div className="pf-report-payment-name">

                              <span className="pf-report-payment-dot" />

                              <strong>
                                {getPaymentLabel(
                                  stat.method,
                                )}
                              </strong>

                            </div>

                            <strong>
                              {formatMoney(
                                stat.amount,
                              )}
                            </strong>

                          </div>

                          <div className="pf-report-payment-bar">
                            <span
                              style={{
                                width: `${Math.min(
                                  100,
                                  stat.percentage,
                                )}%`,
                              }}
                            />
                          </div>

                          <div className="pf-report-payment-bottom">

                            <span>
                              {stat.percentage.toFixed(
                                1,
                              )}
                              %
                            </span>

                            <span>
                              {isEnglish
                                ? "of payments"
                                : "des paiements"}
                            </span>

                          </div>

                        </div>
                      ),
                    )}

                  </div>
                )}

              </article>

              {/* ================= RÉSUMÉ ACTIVITÉ ================= */}

              <article className="pf-report-panel">

                <div className="pf-report-panel-header">

                  <div className="pf-report-panel-heading">

                    <div className="pf-report-panel-icon activity">
                      ↗
                    </div>

                    <div>
                      <h3>
                        {isEnglish
                          ? "Activity overview"
                          : "Vue d'activité"}
                      </h3>

                      <p>
                        {isEnglish
                          ? "Key indicators for this period"
                          : "Indicateurs clés de cette période"}
                      </p>
                    </div>

                  </div>

                </div>

                <div className="pf-report-activity-list">

                  <div className="pf-report-activity-row">
                    <div className="pf-report-activity-icon">
                      ✓
                    </div>

                    <div>
                      <strong>
                        {formatNumber(
                          validSales.length,
                        )}
                      </strong>

                      <span>
                        {isEnglish
                          ? "Completed sales"
                          : "Ventes réalisées"}
                      </span>
                    </div>
                  </div>

                  <div className="pf-report-activity-row">
                    <div className="pf-report-activity-icon">
                      ₣
                    </div>

                    <div>
                      <strong>
                        {formatMoney(
                          revenue,
                        )}
                      </strong>

                      <span>
                        {isEnglish
                          ? "Generated revenue"
                          : "Chiffre d'affaires généré"}
                      </span>
                    </div>
                  </div>

                  <div className="pf-report-activity-row">
                    <div className="pf-report-activity-icon">
                      ◉
                    </div>

                    <div>
                      <strong>
                        {formatMoney(
                          averageBasket,
                        )}
                      </strong>

                      <span>
                        {isEnglish
                          ? "Average transaction"
                          : "Transaction moyenne"}
                      </span>
                    </div>
                  </div>

                  <div className="pf-report-activity-row">
                    <div className="pf-report-activity-icon">
                      □
                    </div>

                    <div>
                      <strong>
                        {formatNumber(
                          activeProducts.length,
                        )}
                      </strong>

                      <span>
                        {isEnglish
                          ? "Active products"
                          : "Produits actifs"}
                      </span>
                    </div>
                  </div>

                </div>

              </article>

            </section>

            {/* ====================================================
                VENTES RÉCENTES
               ==================================================== */}

            <section className="pf-report-panel pf-report-sales-panel">

              <div className="pf-report-panel-header">

                <div className="pf-report-panel-heading">

                  <div className="pf-report-panel-icon sales">
                    ◫
                  </div>

                  <div>
                    <h3>
                      {t.recentSales}
                    </h3>

                    <p>
                      {isEnglish
                        ? "Latest transactions recorded in the selected period"
                        : "Dernières transactions enregistrées sur la période sélectionnée"}
                    </p>
                  </div>

                </div>

                <div className="pf-report-panel-total">
                  <span>
                    {formatNumber(
                      sales.length,
                    )}
                  </span>

                  <small>
                    {isEnglish
                      ? "transactions"
                      : "transactions"}
                  </small>
                </div>

              </div>

              {sales.length === 0 ? (
                <div className="pf-report-empty large">

                  <div className="pf-report-empty-icon">
                    ◫
                  </div>

                  <strong>
                    {t.noSales}
                  </strong>

                  <span>
                    {isEnglish
                      ? "Try another reporting period."
                      : "Essayez une autre période de rapport."}
                  </span>

                </div>
              ) : (
                <div className="pf-report-table-wrapper">

                  <table className="pf-report-table">

                    <thead>
                      <tr>
                        <th>
                          {t.saleNumber}
                        </th>

                        <th>
                          {t.date}
                        </th>

                        <th>
                          {t.customer}
                        </th>

                        <th>
                          {t.method}
                        </th>

                        <th>
                          {t.status}
                        </th>

                        <th className="right">
                          {t.amount}
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {sales
                        .slice(0, 15)
                        .map((sale) => {

                          const payment =
                            payments.find(
                              (item) =>
                                item.sale_id ===
                                sale.id,
                            );

                          return (
                            <tr
                              key={sale.id}
                            >

                              <td>
                                <strong className="pf-report-sale-number">
                                  {sale.sale_number ||
                                    `#${sale.id.slice(
                                      0,
                                      8,
                                    )}`}
                                </strong>
                              </td>

                              <td>
                                <span className="pf-report-date">
                                  {formatDate(
                                    sale.created_at,
                                  )}
                                </span>
                              </td>

                              <td>
                                <div className="pf-report-customer">

                                  <div className="pf-report-customer-avatar">
                                    {(sale.customer_name ||
                                      t.noCustomer)
                                      .charAt(
                                        0,
                                      )
                                      .toUpperCase()}
                                  </div>

                                  <span>
                                    {sale.customer_name ||
                                      t.noCustomer}
                                  </span>

                                </div>
                              </td>

                              <td>
                                <span className="pf-report-payment-badge">
                                  {getPaymentLabel(
                                    payment?.method ||
                                      null,
                                  )}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`pf-report-status ${getStatusClass(
                                    sale.status,
                                  )}`}
                                >
                                  <i />

                                  {getStatusLabel(
                                    sale.status,
                                  )}
                                </span>
                              </td>

                              <td className="right">
                                <strong className="pf-report-amount">
                                  {formatMoney(
                                    safeNumber(
                                      sale.total,
                                    ),
                                  )}
                                </strong>
                              </td>

                            </tr>
                          );
                        })}

                    </tbody>

                  </table>

                </div>
              )}

            </section>

            {/* ====================================================
                INFORMATION PHARMACIE
               ==================================================== */}

            <section className="pf-report-pharmacy-card">

              <div className="pf-report-pharmacy-logo">
                ✚
              </div>

              <div className="pf-report-pharmacy-info">

                <strong>
                  {pharmacy?.name ||
                    "PharmaFlow"}
                </strong>

                <span>
                  {[
                    pharmacy?.address,
                    pharmacy?.city,
                    pharmacy?.country_code,
                  ]
                    .filter(Boolean)
                    .join(" • ") ||
                    "—"}
                </span>

              </div>

              <div className="pf-report-pharmacy-meta">

                <div>
                  <span>
                    {isEnglish
                      ? "Currency"
                      : "Devise"}
                  </span>

                  <strong>
                    {pharmacy?.currency_code ||
                      "XAF"}
                  </strong>
                </div>

                <div>
                  <span>
                    {t.reportPeriod}
                  </span>

                  <strong>
                    {periodLabel}
                  </strong>
                </div>

              </div>

            </section>

          </section>
        </main>
      </div>

      {/* ============================================================
          VERSION IMPRIMABLE — A4
          Cette section est volontairement séparée de l'interface.
         ============================================================ */}

      <div
        id="pf-print-report"
        className="pf-print-report"
      >

        {/* EN-TÊTE */}

        <header className="pf-print-header">

          <div className="pf-print-brand">

            <div className="pf-print-logo">
              ✚
            </div>

            <div>
              <div className="pf-print-brand-name">
                PharmaFlow
              </div>

              <div className="pf-print-brand-subtitle">
                Pharmacy Management
              </div>
            </div>

          </div>

          <div className="pf-print-title-block">

            <h1>
              {t.title}
            </h1>

            <p>
              {periodLabel}
            </p>

          </div>

        </header>

        {/* INFORMATIONS */}

        <section className="pf-print-information">

          <div>
            <span>
              {isEnglish
                ? "Pharmacy"
                : "Pharmacie"}
            </span>

            <strong>
              {pharmacy?.name ||
                "PharmaFlow"}
            </strong>
          </div>

          <div>
            <span>
              {t.reportPeriod}
            </span>

            <strong>
              {periodLabel}
            </strong>
          </div>

          <div>
            <span>
              {t.generatedBy}
            </span>

            <strong>
              {profile?.full_name ||
                "—"}
            </strong>
          </div>

          <div>
            <span>
              {t.generatedOn}
            </span>

            <strong>
              {formatDate(
                new Date().toISOString(),
              )}
            </strong>
          </div>

        </section>

        {/* KPI */}

        <section className="pf-print-kpis">

          <div>
            <span>
              {t.revenue}
            </span>

            <strong>
              {formatMoney(revenue)}
            </strong>
          </div>

          <div>
            <span>
              {t.totalSales}
            </span>

            <strong>
              {formatNumber(
                validSales.length,
              )}
            </strong>
          </div>

          <div>
            <span>
              {t.averageBasket}
            </span>

            <strong>
              {formatMoney(
                averageBasket,
              )}
            </strong>
          </div>

          <div>
            <span>
              {t.paymentTotal}
            </span>

            <strong>
              {formatMoney(
                paymentTotal,
              )}
            </strong>
          </div>

        </section>

        {/* FINANCES */}

        <section className="pf-print-section">

          <h2>
            {t.financial}
          </h2>

          <table>
            <tbody>

              <tr>
                <td>
                  {t.subtotal}
                </td>

                <td>
                  {formatMoney(
                    subtotal,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  {t.discounts}
                </td>

                <td>
                  - {formatMoney(
                    discounts,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  {t.taxes}
                </td>

                <td>
                  {formatMoney(
                    taxes,
                  )}
                </td>
              </tr>

              <tr className="total">
                <td>
                  {t.total}
                </td>

                <td>
                  {formatMoney(
                    revenue,
                  )}
                </td>
              </tr>

              <tr className="collected">
                <td>
                  {t.paymentTotal}
                </td>

                <td>
                  {formatMoney(
                    paymentTotal,
                  )}
                </td>
              </tr>

            </tbody>
          </table>

        </section>

        {/* STOCK */}

        <section className="pf-print-section">

          <h2>
            {t.stockSituation}
          </h2>

          <table>
            <tbody>

              <tr>
                <td>
                  {t.activeProducts}
                </td>

                <td>
                  {formatNumber(
                    activeProducts.length,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  {t.lowStock}
                </td>

                <td>
                  {formatNumber(
                    lowStockProducts.length,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  {t.outOfStock}
                </td>

                <td>
                  {formatNumber(
                    outOfStockProducts.length,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  {t.stockValue}
                </td>

                <td>
                  {formatMoney(
                    stockValue,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  {t.expired}
                </td>

                <td>
                  {formatNumber(
                    expiredProducts.length,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  {t.expiringSoon}
                </td>

                <td>
                  {formatNumber(
                    expiringProducts.length,
                  )}
                </td>
              </tr>

            </tbody>
          </table>

        </section>

        {/* ALERTES */}

        <section className="pf-print-section">

          <h2>
            {t.alerts}
          </h2>

          {alerts.length === 0 ? (
            <div className="pf-print-success">
              ✓ {t.noAlerts}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    {isEnglish
                      ? "Priority"
                      : "Priorité"}
                  </th>

                  <th>
                    {isEnglish
                      ? "Alert"
                      : "Alerte"}
                  </th>

                  <th>
                    {isEnglish
                      ? "Details"
                      : "Détails"}
                  </th>
                </tr>
              </thead>

              <tbody>

                {alerts.map(
                  (alert, index) => (
                    <tr key={index}>

                      <td>
                        {alert.type ===
                        "danger"
                          ? "URGENT"
                          : alert.type ===
                              "warning"
                            ? "ATTENTION"
                            : "INFO"}
                      </td>

                      <td>
                        {alert.title}
                      </td>

                      <td>
                        {alert.description}
                      </td>

                    </tr>
                  ),
                )}

              </tbody>
            </table>
          )}

        </section>

        {/* PAIEMENTS */}

        <section className="pf-print-section">

          <h2>
            {t.paymentDistribution}
          </h2>

          {paymentStats.length === 0 ? (
            <div className="pf-print-empty">
              {t.noPayments}
            </div>
          ) : (
            <table>

              <thead>
                <tr>

                  <th>
                    {t.method}
                  </th>

                  <th>
                    {t.amount}
                  </th>

                  <th>
                    %
                  </th>

                </tr>
              </thead>

              <tbody>

                {paymentStats.map(
                  (stat) => (
                    <tr
                      key={
                        stat.method
                      }
                    >

                      <td>
                        {getPaymentLabel(
                          stat.method,
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          stat.amount,
                        )}
                      </td>

                      <td>
                        {stat.percentage.toFixed(
                          1,
                        )}
                        %
                      </td>

                    </tr>
                  ),
                )}

              </tbody>

            </table>
          )}

        </section>

        {/* VENTES */}

        <section className="pf-print-section pf-print-sales">

          <h2>
            {t.recentSales}
          </h2>

          {sales.length === 0 ? (
            <div className="pf-print-empty">
              {t.noSales}
            </div>
          ) : (
            <table>

              <thead>
                <tr>

                  <th>
                    {t.saleNumber}
                  </th>

                  <th>
                    {t.date}
                  </th>

                  <th>
                    {t.customer}
                  </th>

                  <th>
                    {t.method}
                  </th>

                  <th>
                    {t.status}
                  </th>

                  <th>
                    {t.amount}
                  </th>

                </tr>
              </thead>

              <tbody>

                {sales
                  .map((sale) => {

                    const payment =
                      payments.find(
                        (item) =>
                          item.sale_id ===
                          sale.id,
                      );

                    return (
                      <tr
                        key={sale.id}
                      >

                        <td>
                          {sale.sale_number ||
                            `#${sale.id.slice(
                              0,
                              8,
                            )}`}
                        </td>

                        <td>
                          {formatDate(
                            sale.created_at,
                          )}
                        </td>

                        <td>
                          {sale.customer_name ||
                            t.noCustomer}
                        </td>

                        <td>
                          {getPaymentLabel(
                            payment?.method ||
                              null,
                          )}
                        </td>

                        <td>
                          {getStatusLabel(
                            sale.status,
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            safeNumber(
                              sale.total,
                            ),
                          )}
                        </td>

                      </tr>
                    );
                  })}

              </tbody>

            </table>
          )}

        </section>

        {/* PIED DE PAGE */}

        <footer className="pf-print-footer">

          <strong>
            PharmaFlow
          </strong>

          <span>
            {pharmacy?.name ||
              "Pharmacy"}
          </span>

          <span>
            •
          </span>

          <span>
            {t.title}
          </span>

          <span>
            •
          </span>

          <span>
            {periodLabel}
          </span>

        </footer>

      </div>
    </>
  );
}