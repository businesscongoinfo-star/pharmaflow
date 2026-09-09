"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Locale = "fr" | "en";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  pharmacy_id: string | null;
  language: Locale;
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

type Period =
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

const supabase = createClient();

const TEXT = {
  fr: {
    cashier: "Caissier",
    cashierUpper: "CAISSIER",
    cashierSpace: "ESPACE CAISSIER",
    consultation: "CONSULTATION",
    analysis: "ANALYSE",
    account: "COMPTE",

    dashboard: "Tableau de bord",
    newSale: "Nouvelle vente",
    mySales: "Mes ventes",
    products: "Produits",
    stock: "Stock",
    reports: "Rapports",
    myProfile: "Mon profil",
    readonly: "Lecture",

    reportsTitle: "Mes rapports",
    reportsSubtitle: "Analyse de votre activité commerciale.",

    reportPersonal: "RAPPORT PERSONNEL",
    hello: "Bonjour",
    welcomeText:
      "Consultez vos performances commerciales et vos ventes pour la période sélectionnée.",
    personalData: "Données personnelles",

    reportPeriod: "Période du rapport",
    reportPeriodDescription:
      "Choisissez la période que vous souhaitez analyser.",

    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année",
    customPeriod: "Période personnalisée",

    startDate: "Date de début",
    endDate: "Date de fin",

    revenue: "CHIFFRE D'AFFAIRES",
    sales: "VENTES",
    averageBasket: "PANIER MOYEN",
    cancellations: "ANNULATIONS",

    validatedSales: "ventes validées",
    averagePerSale: "moyenne par vente",
    cancelledSales: "ventes annulées",

    salesDetail: "Détail de mes ventes",
    salesDetailDescription:
      "Transactions enregistrées pendant la période.",

    transaction: "transaction",
    transactions: "transactions",

    noSales: "Aucune vente pour cette période",
    noSalesDescription:
      "Aucune transaction correspondant à la période sélectionnée n'a été trouvée.",

    sale: "Vente",
    date: "Date",
    customer: "Client",
    status: "Statut",
    total: "Total",

    completed: "Terminée",
    cancelled: "Annulée",
    counterCustomer: "Client comptoir",

    financialSummary: "Résumé financier",
    financialSummaryDescription:
      "Synthèse de votre activité.",

    subtotal: "Sous-total",
    beforeDiscount: "Montant avant remise",
    discounts: "Remises",
    discountsGiven: "Réductions accordées",
    taxes: "Taxes",
    recordedTaxes: "Taxes enregistrées",
    totalCollected: "Total encaissé",
    turnover: "Chiffre d'affaires",

    indicators: "Indicateurs",
    indicatorsDescription:
      "Votre activité sur la période.",
    salesCount: "Ventes",
    averageBasketShort: "Panier moyen",
    cancelledShort: "Annulées",

    dailyActivity: "Activité par jour",
    dailyActivityDescription:
      "Évolution de vos ventes pendant la période sélectionnée.",
    day: "Jour",
    numberOfSales: "Nombre de ventes",
    noData: "Pas encore de données",
    noDataDescription:
      "Votre activité quotidienne apparaîtra ici.",

    secureReport: "Rapport personnel sécurisé",
    secureReportDescription:
      "Ce rapport contient uniquement les ventes enregistrées avec votre compte caissier. Les ventes des autres caissiers de la pharmacie ne sont pas affichées.",

    printReport: "🖨️ Imprimer le rapport",
    exportCsv: "⬇ Exporter en CSV",
    exporting: "Exportation...",

    reportOf: "Rapport de caisse",
    loading: "Chargement de vos rapports...",

    loadingError: "Impossible de charger les rapports",
    retry: "Réessayer",
    backDashboard: "Retour au tableau de bord",

    pharmacy: "Ma pharmacie",
    personalReport: "Rapport personnel",

    sunday: "dim.",
    monday: "lun.",
    tuesday: "mar.",
    wednesday: "mer.",
    thursday: "jeu.",
    friday: "ven.",
    saturday: "sam.",
  },

  en: {
    cashier: "Cashier",
    cashierUpper: "CASHIER",
    cashierSpace: "CASHIER AREA",
    consultation: "CONSULTATION",
    analysis: "ANALYSIS",
    account: "ACCOUNT",

    dashboard: "Dashboard",
    newSale: "New sale",
    mySales: "My sales",
    products: "Products",
    stock: "Stock",
    reports: "Reports",
    myProfile: "My profile",
    readonly: "Read-only",

    reportsTitle: "My reports",
    reportsSubtitle: "Analysis of your sales activity.",

    reportPersonal: "PERSONAL REPORT",
    hello: "Hello",
    welcomeText:
      "View your sales performance and transactions for the selected period.",
    personalData: "Personal data",

    reportPeriod: "Report period",
    reportPeriodDescription:
      "Choose the period you want to analyze.",

    today: "Today",
    week: "This week",
    month: "This month",
    year: "This year",
    customPeriod: "Custom period",

    startDate: "Start date",
    endDate: "End date",

    revenue: "REVENUE",
    sales: "SALES",
    averageBasket: "AVERAGE BASKET",
    cancellations: "CANCELLATIONS",

    validatedSales: "completed sales",
    averagePerSale: "average per sale",
    cancelledSales: "cancelled sales",

    salesDetail: "My sales details",
    salesDetailDescription:
      "Transactions recorded during the period.",

    transaction: "transaction",
    transactions: "transactions",

    noSales: "No sales for this period",
    noSalesDescription:
      "No transaction matching the selected period was found.",

    sale: "Sale",
    date: "Date",
    customer: "Customer",
    status: "Status",
    total: "Total",

    completed: "Completed",
    cancelled: "Cancelled",
    counterCustomer: "Counter customer",

    financialSummary: "Financial summary",
    financialSummaryDescription:
      "Summary of your activity.",

    subtotal: "Subtotal",
    beforeDiscount: "Amount before discount",
    discounts: "Discounts",
    discountsGiven: "Discounts granted",
    taxes: "Taxes",
    recordedTaxes: "Recorded taxes",
    totalCollected: "Total collected",
    turnover: "Revenue",

    indicators: "Indicators",
    indicatorsDescription:
      "Your activity during the period.",
    salesCount: "Sales",
    averageBasketShort: "Average basket",
    cancelledShort: "Cancelled",

    dailyActivity: "Daily activity",
    dailyActivityDescription:
      "Evolution of your sales during the selected period.",
    day: "Day",
    numberOfSales: "Number of sales",
    noData: "No data yet",
    noDataDescription:
      "Your daily activity will appear here.",

    secureReport: "Secure personal report",
    secureReportDescription:
      "This report contains only sales recorded with your cashier account. Sales from other cashiers in the pharmacy are not displayed.",

    printReport: "🖨️ Print report",
    exportCsv: "⬇ Export CSV",
    exporting: "Exporting...",

    reportOf: "Cash register report",
    loading: "Loading your reports...",

    loadingError: "Unable to load reports",
    retry: "Retry",
    backDashboard: "Back to dashboard",

    pharmacy: "My pharmacy",
    personalReport: "Personal report",

    sunday: "Sun.",
    monday: "Mon.",
    tuesday: "Tue.",
    wednesday: "Wed.",
    thursday: "Thu.",
    friday: "Fri.",
    saturday: "Sat.",
  },
} as const;

function formatMoney(
  value: number,
  currency: string,
  locale: Locale
) {
  return new Intl.NumberFormat(
    locale === "en" ? "en-US" : "fr-FR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(Number(value || 0));
}

function formatNumber(
  value: number,
  locale: Locale
) {
  return new Intl.NumberFormat(
    locale === "en" ? "en-US" : "fr-FR"
  ).format(Number(value || 0));
}

function formatDateTime(
  value: string,
  locale: Locale
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getStartOfToday() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
}

function getStartOfWeek() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  const day = date.getDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  date.setDate(
    date.getDate() + difference
  );

  return date;
}

function getStartOfMonth() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(1);

  return date;
}

function getStartOfYear() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setMonth(0, 1);

  return date;
}

function getEndOfToday() {
  const date = new Date();

  date.setHours(23, 59, 59, 999);

  return date;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

export default function CashierReportsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [period, setPeriod] =
    useState<Period>("today");

  const [customStart, setCustomStart] =
    useState(() => formatDate(new Date()));

  const [customEnd, setCustomEnd] =
    useState(() => formatDate(new Date()));

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [exporting, setExporting] =
    useState(false);

  const locale: Locale =
    profile?.language === "en"
      ? "en"
      : "fr";

  const t = TEXT[locale];

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, role, pharmacy_id, language"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profileData ||
        !profileData.pharmacy_id
      ) {
        router.replace("/login");
        return;
      }

      if (profileData.role !== "cashier") {
        if (profileData.role === "owner") {
          router.replace("/dashboard");
        } else if (
          profileData.role === "admin"
        ) {
          router.replace("/admin");
        } else if (
          profileData.role === "pharmacist"
        ) {
          router.replace("/pharmacien");
        } else {
          router.replace("/employe");
        }

        return;
      }

      const userLanguage: Locale =
        profileData.language === "en"
          ? "en"
          : "fr";

      setProfile({
        ...(profileData as Profile),
        language: userLanguage,
      });

      const [
        pharmacyResponse,
        salesResponse,
      ] = await Promise.all([
        supabase
          .from("pharmacies")
          .select(
            "id, name, city, country_code, currency_code"
          )
          .eq(
            "id",
            profileData.pharmacy_id
          )
          .maybeSingle(),

        supabase
          .from("sales")
          .select(
            `
              id,
              sale_number,
              subtotal,
              discount,
              tax,
              total,
              status,
              customer_name,
              customer_phone,
              created_at
            `
          )
          .eq(
            "pharmacy_id",
            profileData.pharmacy_id
          )
          .eq(
            "user_id",
            user.id
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (pharmacyResponse.error) {
        throw new Error(
          pharmacyResponse.error.message
        );
      }

      if (salesResponse.error) {
        throw new Error(
          salesResponse.error.message
        );
      }

      setPharmacy(
        pharmacyResponse.data as Pharmacy
      );

      setSales(
        (salesResponse.data || []) as Sale[]
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : locale === "en"
          ? "Unable to load reports."
          : "Impossible de charger les rapports."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  const currency =
    pharmacy?.currency_code || "XAF";

  const periodRange = useMemo(() => {
    const now = new Date();

    if (period === "today") {
      return {
        start: getStartOfToday(),
        end: getEndOfToday(),
      };
    }

    if (period === "week") {
      return {
        start: getStartOfWeek(),
        end: now,
      };
    }

    if (period === "month") {
      return {
        start: getStartOfMonth(),
        end: now,
      };
    }

    if (period === "year") {
      return {
        start: getStartOfYear(),
        end: now,
      };
    }

    const start = new Date(
      `${customStart}T00:00:00`
    );

    const end = new Date(
      `${customEnd}T23:59:59`
    );

    return {
      start,
      end,
    };
  }, [
    period,
    customStart,
    customEnd,
  ]);

  const filteredSales = useMemo(() => {
    const startTime =
      periodRange.start.getTime();

    const endTime =
      periodRange.end.getTime();

    return sales.filter((sale) => {
      const saleTime = new Date(
        sale.created_at
      ).getTime();

      return (
        saleTime >= startTime &&
        saleTime <= endTime
      );
    });
  }, [sales, periodRange]);

  const statistics = useMemo(() => {
    const completedSales =
      filteredSales.filter(
        (sale) =>
          sale.status !== "cancelled"
      );

    const cancelledSales =
      filteredSales.filter(
        (sale) =>
          sale.status === "cancelled"
      );

    const revenue =
      completedSales.reduce(
        (sum, sale) =>
          sum + Number(sale.total || 0),
        0
      );

    const subtotal =
      completedSales.reduce(
        (sum, sale) =>
          sum +
          Number(sale.subtotal || 0),
        0
      );

    const discount =
      completedSales.reduce(
        (sum, sale) =>
          sum +
          Number(sale.discount || 0),
        0
      );

    const tax =
      completedSales.reduce(
        (sum, sale) =>
          sum + Number(sale.tax || 0),
        0
      );

    const averageBasket =
      completedSales.length > 0
        ? revenue / completedSales.length
        : 0;

    return {
      completedSales,
      cancelledSales,
      revenue,
      subtotal,
      discount,
      tax,
      averageBasket,
    };
  }, [filteredSales]);

  const periodLabel = useMemo(() => {
    if (period === "today") {
      return t.today;
    }

    if (period === "week") {
      return t.week;
    }

    if (period === "month") {
      return t.month;
    }

    if (period === "year") {
      return t.year;
    }

    return t.customPeriod;
  }, [period, t]);

  const dailyBreakdown = useMemo(() => {
    const grouped: Record<
      string,
      {
        date: string;
        sales: number;
        revenue: number;
      }
    > = {};

    statistics.completedSales.forEach(
      (sale) => {
        const date =
          new Date(
            sale.created_at
          );

        const key =
          date.toISOString().slice(0, 10);

        if (!grouped[key]) {
          grouped[key] = {
            date: key,
            sales: 0,
            revenue: 0,
          };
        }

        grouped[key].sales += 1;

        grouped[key].revenue += Number(
          sale.total || 0
        );
      }
    );

    return Object.values(grouped).sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );
  }, [statistics.completedSales]);

  function getDayLabel(dateValue: string) {
    const date = new Date(
      `${dateValue}T12:00:00`
    );

    return new Intl.DateTimeFormat(
      locale === "en" ? "en-US" : "fr-FR",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }
    ).format(date);
  }

  function handlePrint() {
    window.print();
  }

  function handleExportCsv() {
    setExporting(true);

    try {
      const rows = [
        [
          t.sale,
          t.date,
          t.subtotal,
          t.discounts,
          t.taxes,
          t.total,
          t.status,
          t.customer,
          locale === "en"
            ? "Phone"
            : "Téléphone",
        ],
        ...filteredSales.map(
          (sale) => [
            sale.sale_number,
            formatDateTime(
              sale.created_at,
              locale
            ),
            sale.subtotal,
            sale.discount,
            sale.tax,
            sale.total,
            sale.status,
            sale.customer_name || "",
            sale.customer_phone || "",
          ]
        ),
      ];

      const csv = rows
        .map((row) =>
          row
            .map((value) =>
              escapeCsv(value)
            )
            .join(";")
        )
        .join("\n");

      const blob = new Blob(
        ["\ufeff" + csv],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${
          locale === "en"
            ? "cashier-report"
            : "rapport-caissier"
        }-${formatDate(
          new Date()
        )}.csv`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const navigation = [
    {
      label: t.dashboard,
      href: "/caisse",
      icon: "⌂",
    },
    {
      label: t.newSale,
      href: "/ventes",
      icon: "＋",
    },
    {
      label: t.mySales,
      href: "/ventes",
      icon: "▤",
    },
    {
      label: t.products,
      href: "/caisse/produits",
      icon: "▦",
    },
    {
      label: t.stock,
      href: "/caisse/stock",
      icon: "▥",
    },
    {
      label: t.reports,
      href: "/caisse/rapports",
      icon: "📊",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/caisse") {
      return pathname === "/caisse";
    }

    return pathname.startsWith(href);
  };

  if (loading) {
    return (
      <div className="pf-app">
        <main
          className="pf-main"
          style={{ marginLeft: 0 }}
        >
          <div className="pf-content">
            <div className="pf-card">
              <div className="pf-loading">
                <div className="pf-spinner" />

                <p>{t.loading}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pf-app">
        <main
          className="pf-main"
          style={{ marginLeft: 0 }}
        >
          <div className="pf-content">
            <div className="pf-card">
              <div className="pf-alert pf-alert-danger">
                <div className="pf-alert-icon">
                  !
                </div>

                <div>
                  <strong>
                    {t.loadingError}
                  </strong>

                  <p>{error}</p>
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
                  className="pf-btn pf-btn-primary"
                  onClick={loadReports}
                >
                  {t.retry}
                </button>

                <Link
                  href="/caisse"
                  className="pf-btn pf-btn-secondary"
                >
                  {t.backDashboard}
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="pf-app">
      {sidebarOpen && (
        <div
          className="pf-mobile-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

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
              {t.cashier}
            </div>
          </div>

          <button
            className="pf-mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            ×
          </button>
        </div>

        <div className="pf-pharmacy-card">
          <div className="pf-pharmacy-icon">
            🏥
          </div>

          <div className="pf-pharmacy-info">
            <strong>
              {pharmacy?.name ||
                t.pharmacy}
            </strong>

            <span>
              {pharmacy?.city ||
                t.pharmacy}
            </span>
          </div>
        </div>

        <nav className="pf-sidebar-nav">
          <div className="pf-nav-section-title">
            {t.cashierSpace}
          </div>

          {navigation
            .slice(0, 3)
            .map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`pf-nav-item ${
                  isActive(item.href)
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
            {t.consultation}
          </div>

          {navigation
            .slice(3, 5)
            .map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`pf-nav-item ${
                  isActive(item.href)
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
                  {t.readonly}
                </span>
              </Link>
            ))}

          <div className="pf-nav-section-title">
            {t.analysis}
          </div>

          <Link
            href="/caisse/rapports"
            className={`pf-nav-item ${
              isActive(
                "/caisse/rapports"
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

            <span>{t.reports}</span>
          </Link>

          <div className="pf-nav-section-title">
            {t.account}
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

            <span>{t.myProfile}</span>
          </Link>
        </nav>

        <div className="pf-sidebar-user">
          <div className="pf-user-avatar">
            {getInitials(
              profile?.full_name ||
                t.cashier
            )}
          </div>

          <div className="pf-user-info">
            <strong>
              {profile?.full_name ||
                t.cashier}
            </strong>

            <span>{t.cashier}</span>
          </div>

          <button
            className="pf-logout-button"
            onClick={handleLogout}
            title={
              locale === "en"
                ? "Log out"
                : "Déconnexion"
            }
          >
            ↪
          </button>
        </div>
      </aside>

      <main className="pf-main">
        <header className="pf-topbar">
          <div className="pf-topbar-left">
            <button
              className="pf-mobile-menu"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              ☰
            </button>

            <div>
              <h1 className="pf-page-title">
                {t.reportsTitle}
              </h1>

              <p className="pf-page-subtitle">
                {t.reportsSubtitle}
              </p>
            </div>
          </div>

          <div className="pf-topbar-actions">
            <div className="pf-role-pill">
              <span className="pf-role-dot" />
              {t.cashierUpper}
            </div>

            <button
              className="pf-btn pf-btn-primary"
              onClick={() =>
                router.push("/ventes")
              }
            >
              ＋ {t.newSale}
            </button>
          </div>
        </header>

        <div className="pf-content">
          <div className="pf-container">

            <section className="pf-welcome-card">
              <div>
                <div className="pf-welcome-eyebrow">
                  {t.reportPersonal}
                </div>

                <h2>
                  {t.hello}{" "}
                  {profile?.full_name ||
                    t.cashier}
                </h2>

                <p>
                  {t.welcomeText}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span className="pf-badge pf-badge-success">
                  🔐 {t.personalData}
                </span>
              </div>
            </section>

            <section className="pf-card">
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">
                    {t.reportPeriod}
                  </h2>

                  <p className="pf-card-subtitle">
                    {t.reportPeriodDescription}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 20,
                }}
              >
                <button
                  className={`pf-btn ${
                    period === "today"
                      ? "pf-btn-primary"
                      : "pf-btn-secondary"
                  }`}
                  onClick={() =>
                    setPeriod("today")
                  }
                >
                  {t.today}
                </button>

                <button
                  className={`pf-btn ${
                    period === "week"
                      ? "pf-btn-primary"
                      : "pf-btn-secondary"
                  }`}
                  onClick={() =>
                    setPeriod("week")
                  }
                >
                  {t.week}
                </button>

                <button
                  className={`pf-btn ${
                    period === "month"
                      ? "pf-btn-primary"
                      : "pf-btn-secondary"
                  }`}
                  onClick={() =>
                    setPeriod("month")
                  }
                >
                  {t.month}
                </button>

                <button
                  className={`pf-btn ${
                    period === "year"
                      ? "pf-btn-primary"
                      : "pf-btn-secondary"
                  }`}
                  onClick={() =>
                    setPeriod("year")
                  }
                >
                  {t.year}
                </button>

                <button
                  className={`pf-btn ${
                    period === "custom"
                      ? "pf-btn-primary"
                      : "pf-btn-secondary"
                  }`}
                  onClick={() =>
                    setPeriod("custom")
                  }
                >
                  {t.customPeriod}
                </button>
              </div>

              {period === "custom" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 14,
                    marginTop: 18,
                    maxWidth: 600,
                  }}
                >
                  <div className="pf-form-group">
                    <label className="pf-form-label">
                      {t.startDate}
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={customStart}
                      onChange={(event) =>
                        setCustomStart(
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="pf-form-group">
                    <label className="pf-form-label">
                      {t.endDate}
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={customEnd}
                      onChange={(event) =>
                        setCustomEnd(
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="pf-stats-grid">
              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    💰
                  </div>

                  <span className="pf-stat-label">
                    {t.revenue}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {formatMoney(
                    statistics.revenue,
                    currency,
                    locale
                  )}
                </div>

                <div className="pf-stat-description">
                  {periodLabel}
                </div>
              </div>

              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    🧾
                  </div>

                  <span className="pf-stat-label">
                    {t.sales}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {formatNumber(
                    statistics.completedSales
                      .length,
                    locale
                  )}
                </div>

                <div className="pf-stat-description">
                  {t.validatedSales}
                </div>
              </div>

              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    🛒
                  </div>

                  <span className="pf-stat-label">
                    {t.averageBasket}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {formatMoney(
                    statistics.averageBasket,
                    currency,
                    locale
                  )}
                </div>

                <div className="pf-stat-description">
                  {t.averagePerSale}
                </div>
              </div>

              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    ↩
                  </div>

                  <span className="pf-stat-label">
                    {t.cancellations}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {formatNumber(
                    statistics.cancelledSales
                      .length,
                    locale
                  )}
                </div>

                <div className="pf-stat-description">
                  {t.cancelledSales}
                </div>
              </div>
            </section>

            <div className="pf-dashboard-grid">

              <section className="pf-card">
                <div className="pf-card-header">
                  <div>
                    <h2 className="pf-card-title">
                      {t.salesDetail}
                    </h2>

                    <p className="pf-card-subtitle">
                      {t.salesDetailDescription}
                    </p>
                  </div>

                  <span className="pf-badge pf-badge-success">
                    {filteredSales.length}{" "}
                    {filteredSales.length > 1
                      ? t.transactions
                      : t.transaction}
                  </span>
                </div>

                {filteredSales.length === 0 ? (
                  <div className="pf-empty-state">
                    <div className="pf-empty-icon">
                      📊
                    </div>

                    <h3>
                      {t.noSales}
                    </h3>

                    <p>
                      {t.noSalesDescription}
                    </p>

                    <button
                      className="pf-btn pf-btn-primary"
                      onClick={() =>
                        router.push("/ventes")
                      }
                    >
                      ＋ {t.newSale}
                    </button>
                  </div>
                ) : (
                  <div className="pf-table-wrapper">
                    <table className="pf-table">
                      <thead>
                        <tr>
                          <th>{t.sale}</th>
                          <th>{t.date}</th>
                          <th>{t.customer}</th>
                          <th>{t.status}</th>
                          <th className="text-right">
                            {t.total}
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredSales.map(
                          (sale) => (
                            <tr key={sale.id}>
                              <td>
                                <strong>
                                  {sale.sale_number}
                                </strong>
                              </td>

                              <td>
                                {formatDateTime(
                                  sale.created_at,
                                  locale
                                )}
                              </td>

                              <td>
                                {sale.customer_name ||
                                  t.counterCustomer}
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
                                    ? t.completed
                                    : sale.status ===
                                      "cancelled"
                                    ? t.cancelled
                                    : sale.status}
                                </span>
                              </td>

                              <td className="text-right">
                                <strong>
                                  {formatMoney(
                                    Number(
                                      sale.total || 0
                                    ),
                                    currency,
                                    locale
                                  )}
                                </strong>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="pf-dashboard-side">

                <section className="pf-card">
                  <div className="pf-card-header">
                    <div>
                      <h2 className="pf-card-title">
                        {t.financialSummary}
                      </h2>

                      <p className="pf-card-subtitle">
                        {t.financialSummaryDescription}
                      </p>
                    </div>
                  </div>

                  <div className="pf-performance-list">

                    <div className="pf-performance-row">
                      <div>
                        <span>
                          {t.subtotal}
                        </span>

                        <strong>
                          {t.beforeDiscount}
                        </strong>
                      </div>

                      <b>
                        {formatMoney(
                          statistics.subtotal,
                          currency,
                          locale
                        )}
                      </b>
                    </div>

                    <div className="pf-performance-row">
                      <div>
                        <span>
                          {t.discounts}
                        </span>

                        <strong>
                          {t.discountsGiven}
                        </strong>
                      </div>

                      <b>
                        {formatMoney(
                          statistics.discount,
                          currency,
                          locale
                        )}
                      </b>
                    </div>

                    <div className="pf-performance-row">
                      <div>
                        <span>
                          {t.taxes}
                        </span>

                        <strong>
                          {t.recordedTaxes}
                        </strong>
                      </div>

                      <b>
                        {formatMoney(
                          statistics.tax,
                          currency,
                          locale
                        )}
                      </b>
                    </div>

                    <div
                      className="pf-performance-row"
                      style={{
                        borderTop:
                          "1px solid var(--pf-border)",
                        paddingTop: 16,
                        marginTop: 8,
                      }}
                    >
                      <div>
                        <span>
                          {t.totalCollected}
                        </span>

                        <strong>
                          {t.turnover}
                        </strong>
                      </div>

                      <b>
                        {formatMoney(
                          statistics.revenue,
                          currency,
                          locale
                        )}
                      </b>
                    </div>

                  </div>
                </section>

                <section className="pf-card">
                  <div className="pf-card-header">
                    <div>
                      <h2 className="pf-card-title">
                        {t.indicators}
                      </h2>

                      <p className="pf-card-subtitle">
                        {t.indicatorsDescription}
                      </p>
                    </div>
                  </div>

                  <div className="pf-stock-summary">

                    <div className="pf-stock-summary-item">
                      <div className="pf-stock-number">
                        {formatNumber(
                          statistics.completedSales.length,
                          locale
                        )}
                      </div>

                      <span>
                        {t.salesCount}
                      </span>
                    </div>

                    <div className="pf-stock-summary-item">
                      <div className="pf-stock-number">
                        {formatMoney(
                          statistics.averageBasket,
                          currency,
                          locale
                        )}
                      </div>

                      <span>
                        {t.averageBasketShort}
                      </span>
                    </div>

                    <div className="pf-stock-summary-item danger">
                      <div className="pf-stock-number">
                        {formatNumber(
                          statistics.cancelledSales.length,
                          locale
                        )}
                      </div>

                      <span>
                        {t.cancelledShort}
                      </span>
                    </div>

                  </div>
                </section>

              </div>
            </div>

            <section className="pf-card">

              <div className="pf-card-header">

                <div>
                  <h2 className="pf-card-title">
                    {t.dailyActivity}
                  </h2>

                  <p className="pf-card-subtitle">
                    {t.dailyActivityDescription}
                  </p>
                </div>

                <span className="pf-badge pf-badge-info">
                  {periodLabel}
                </span>

              </div>

              {dailyBreakdown.length === 0 ? (
                <div className="pf-empty-state">
                  <div className="pf-empty-icon">
                    📅
                  </div>

                  <h3>
                    {t.noData}
                  </h3>

                  <p>
                    {t.noDataDescription}
                  </p>
                </div>
              ) : (
                <div className="pf-table-wrapper">

                  <table className="pf-table">

                    <thead>
                      <tr>
                        <th>
                          {t.day}
                        </th>

                        <th>
                          {t.date}
                        </th>

                        <th>
                          {t.numberOfSales}
                        </th>

                        <th className="text-right">
                          {t.revenue}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {dailyBreakdown.map(
                        (item) => (
                          <tr
                            key={item.date}
                          >
                            <td>
                              <strong>
                                {getDayLabel(
                                  item.date
                                )}
                              </strong>
                            </td>

                            <td>
                              {new Intl.DateTimeFormat(
                                locale === "en"
                                  ? "en-US"
                                  : "fr-FR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                }
                              ).format(
                                new Date(
                                  `${item.date}T12:00:00`
                                )
                              )}
                            </td>

                            <td>
                              <span className="pf-badge pf-badge-info">
                                {formatNumber(
                                  item.sales,
                                  locale
                                )}{" "}
                                {item.sales > 1
                                  ? t.sales.toLowerCase()
                                  : t.sales.toLowerCase()}
                              </span>
                            </td>

                            <td className="text-right">
                              <strong>
                                {formatMoney(
                                  item.revenue,
                                  currency,
                                  locale
                                )}
                              </strong>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>

                  </table>

                </div>
              )}

            </section>

            <section className="pf-security-card">

              <div className="pf-security-icon">
                📄
              </div>

              <div
                style={{
                  flex: 1,
                }}
              >

                <strong>
                  {t.secureReport}
                </strong>

                <p>
                  {t.secureReportDescription}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 16,
                  }}
                >

                  <button
                    className="pf-btn pf-btn-primary"
                    onClick={handlePrint}
                  >
                    {t.printReport}
                  </button>

                  <button
                    className="pf-btn pf-btn-secondary"
                    onClick={handleExportCsv}
                    disabled={exporting}
                  >
                    {exporting
                      ? t.exporting
                      : t.exportCsv}
                  </button>

                </div>

              </div>

            </section>

            <section
              className="pf-card"
              style={{
                marginTop: 20,
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >

                <div>

                  <h3
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 700,
                    }}
                  >
                    {pharmacy?.name ||
                      t.pharmacy}
                  </h3>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      color:
                        "var(--pf-text-soft)",
                      fontSize: 13,
                    }}
                  >
                    {t.reportOf} —{" "}
                    {periodLabel}
                  </p>

                </div>

                <div
                  style={{
                    textAlign: "right",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      color:
                        "var(--pf-text-soft)",
                    }}
                  >
                    {t.cashier}
                  </span>

                  <strong>
                    {profile?.full_name ||
                      t.cashier}
                  </strong>

                </div>

              </div>

            </section>

          </div>
        </div>
      </main>

      <style jsx global>{`

        /*
         * IMPRESSION PHARMAFLOW
         *
         * Cette règle force le contenu réel
         * du rapport à rester visible pendant
         * l'impression.
         */

        @media print {

          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: visible !important;
          }

          .pf-mobile-overlay,
          .pf-sidebar,
          .pf-topbar,
          .pf-mobile-menu,
          .pf-mobile-close,
          button,
          a {
            display: none !important;
            visibility: hidden !important;
          }

          .pf-app {
            display: block !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          .pf-main {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .pf-content {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .pf-container {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .pf-welcome-card,
          .pf-card,
          .pf-security-card,
          .pf-stat-card {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .pf-welcome-card {
            margin-bottom: 18px !important;
          }

          .pf-stats-grid {
            display: grid !important;
            grid-template-columns:
              repeat(4, minmax(0, 1fr)) !important;
            gap: 12px !important;
            width: 100% !important;
          }

          .pf-dashboard-grid {
            display: block !important;
            width: 100% !important;
          }

          .pf-dashboard-side {
            display: grid !important;
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
            width: 100% !important;
          }

          .pf-table-wrapper {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }

          .pf-table {
            display: table !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            border-collapse: collapse !important;
          }

          .pf-table th,
          .pf-table td {
            visibility: visible !important;
            color: #000000 !important;
            border-bottom: 1px solid #dddddd !important;
          }

          .pf-performance-list,
          .pf-stock-summary {
            display: block !important;
            width: 100% !important;
          }

          .pf-performance-row {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .pf-empty-state {
            display: block !important;
            visibility: visible !important;
          }

          .pf-security-card {
            display: flex !important;
            visibility: visible !important;
            width: 100% !important;
            margin-top: 20px !important;
          }

          .pf-form-group {
            break-inside: avoid;
          }

          .pf-badge {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          h1,
          h2,
          h3,
          p,
          span,
          strong,
          b,
          td,
          th {
            visibility: visible !important;
          }

          .pf-page-title,
          .pf-page-subtitle {
            display: none !important;
          }

          .pf-card-header {
            display: flex !important;
            visibility: visible !important;
          }

          .pf-card-title,
          .pf-card-subtitle {
            visibility: visible !important;
          }

          .pf-stat-value,
          .pf-stat-label,
          .pf-stat-description {
            visibility: visible !important;
          }

          .pf-security-icon {
            display: flex !important;
          }
        }

        @media (max-width: 900px) {
          .pf-dashboard-grid {
            grid-template-columns: 1fr !important;
          }

          .pf-dashboard-side {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 680px) {
          .pf-dashboard-side {
            grid-template-columns: 1fr;
          }

          .pf-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .pf-card-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .pf-table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .pf-table {
            min-width: 680px;
          }

          .pf-security-card {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .pf-stats-grid {
            grid-template-columns: 1fr !important;
          }

          .pf-stat-value {
            font-size: 24px !important;
          }

          .pf-btn {
            width: 100%;
            justify-content: center;
          }
        }

      `}</style>
    </div>
  );
}