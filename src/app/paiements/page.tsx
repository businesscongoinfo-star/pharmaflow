"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type Period = "today" | "month" | "year";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
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

type Payment = {
  id: string;
  pharmacy_id: string;
  sale_id: string | null;
  amount: number;
  method: string | null;
  created_at: string;
};

type Sale = {
  id: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  status: string;
  created_at: string;
};

type PaymentWithSale = Payment & {
  sale: Sale | null;
};

const TEXT = {
  fr: {
    navAdmin: "ESPACE ADMINISTRATEUR",
    navTools: "OUTILS",
    dashboard: "Tableau de bord",
    products: "Produits",
    stock: "Stock",
    sales: "Ventes",
    reports: "Rapports",
    payments: "Paiements",
    users: "Utilisateurs",
    settings: "Paramètres",
    pharmacy: "PHARMACIE",
    myPharmacy: "Ma pharmacie",
    pharmacyManagement: "Gestion intelligente des pharmacies",
    loading: "Chargement des paiements",
    loadingDescription: "Récupération des encaissements de votre pharmacie...",
    cannotLoad: "Impossible de charger les paiements",
    retry: "Réessayer",
    backDashboard: "Retour au tableau de bord",
    breadcrumb: "PharmaFlow / Paiements",
    paymentDescription: "Suivez les encaissements et les moyens de paiement de votre pharmacie.",
    refresh: "Actualiser",
    refreshing: "Actualisation...",
    print: "Imprimer",
    secure: "Données sécurisées",
    paymentPeriod: "PÉRIODE DES PAIEMENTS",
    selectPeriod: "Sélectionnez la période que vous souhaitez analyser.",
    today: "Aujourd'hui",
    month: "Ce mois",
    year: "Cette année",
    totalCollected: "Total encaissé",
    transactions: "Transactions",
    recordedPayments: "paiements enregistrés",
    averagePayment: "Paiement moyen",
    perTransaction: "par transaction",
    methodsUsed: "Modes utilisés",
    paymentMethods: "moyens de paiement",
    distribution: "RÉPARTITION",
    paymentModes: "Modes de paiement",
    noPaymentsPeriod: "Aucun paiement pour cette période.",
    search: "RECHERCHE",
    filterPayments: "Filtrer les paiements",
    searchPlaceholder: "Rechercher une vente, un client...",
    clear: "Effacer",
    allMethods: "Tous les modes",
    history: "HISTORIQUE",
    recordedPaymentsTitle: "Paiements enregistrés",
    result: "résultat",
    results: "résultats",
    exportCsv: "Exporter CSV",
    noPaymentFound: "Aucun paiement trouvé",
    noPaymentCriteria: "Aucun encaissement ne correspond aux critères sélectionnés pour cette période.",
    quickPrint: "IMPRESSION RAPIDE",
    printStatement: "Imprimer un relevé",
    printDescription: "Générez un relevé professionnel des encaissements de votre pharmacie.",
    statement: "Relevé",
    exportCsvShort: "Export CSV",
    statementTitle: "RELEVÉ DES ENCAISSEMENTS",
    generatedAt: "Généré le",
    paymentDetails: "Détail des paiements",
    noPaymentRecorded: "Aucun paiement enregistré pour cette période.",
    automaticallyGenerated: "Relevé généré automatiquement",
    administrativeDocument: "Document administratif",
    currency: "Devise",
    directPayment: "Paiement direct",
    counterCustomer: "Client comptoir",
    unspecified: "Non précisé",
    other: "Autre",
    cash: "Espèces",
    mobileMoney: "Mobile Money",
    card: "Carte bancaire",
    bankTransfer: "Virement bancaire",
    logout: "Se déconnecter",
    owner: "Propriétaire",
    administrator: "Administrateur",
    pharmacyFallback: "Pharmacie",
    infoMissing: "Informations non renseignées",
    paymentsToExport: "Aucun paiement à exporter.",
    errorProfile: "Votre profil utilisateur est introuvable.",
    errorPermission: "Vous n'avez pas l'autorisation d'accéder aux paiements.",
    errorNoPharmacy: "Aucune pharmacie n'est associée à votre compte.",
    loadError: "Impossible de charger les paiements.",
    transaction: "transaction",
  },
  en: {
    navAdmin: "ADMINISTRATOR AREA",
    navTools: "TOOLS",
    dashboard: "Dashboard",
    products: "Products",
    stock: "Stock",
    sales: "Sales",
    reports: "Reports",
    payments: "Payments",
    users: "Users",
    settings: "Settings",
    pharmacy: "PHARMACY",
    myPharmacy: "My pharmacy",
    pharmacyManagement: "Smart pharmacy management",
    loading: "Loading payments",
    loadingDescription: "Retrieving payment collections from your pharmacy...",
    cannotLoad: "Unable to load payments",
    retry: "Try again",
    backDashboard: "Back to dashboard",
    breadcrumb: "PharmaFlow / Payments",
    paymentDescription: "Track collections and payment methods for your pharmacy.",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    print: "Print",
    secure: "Secure data",
    paymentPeriod: "PAYMENT PERIOD",
    selectPeriod: "Select the period you want to analyze.",
    today: "Today",
    month: "This month",
    year: "This year",
    totalCollected: "Total collected",
    transactions: "Transactions",
    recordedPayments: "recorded payments",
    averagePayment: "Average payment",
    perTransaction: "per transaction",
    methodsUsed: "Methods used",
    paymentMethods: "payment methods",
    distribution: "DISTRIBUTION",
    paymentModes: "Payment methods",
    noPaymentsPeriod: "No payments for this period.",
    search: "SEARCH",
    filterPayments: "Filter payments",
    searchPlaceholder: "Search for a sale, customer...",
    clear: "Clear",
    allMethods: "All methods",
    history: "HISTORY",
    recordedPaymentsTitle: "Recorded payments",
    result: "result",
    results: "results",
    exportCsv: "Export CSV",
    noPaymentFound: "No payment found",
    noPaymentCriteria: "No collection matches the selected criteria for this period.",
    quickPrint: "QUICK PRINT",
    printStatement: "Print a statement",
    printDescription: "Generate a professional statement of your pharmacy collections.",
    statement: "Statement",
    exportCsvShort: "Export CSV",
    statementTitle: "PAYMENT COLLECTION STATEMENT",
    generatedAt: "Generated on",
    paymentDetails: "Payment details",
    noPaymentRecorded: "No payment recorded for this period.",
    automaticallyGenerated: "Automatically generated statement",
    administrativeDocument: "Administrative document",
    currency: "Currency",
    directPayment: "Direct payment",
    counterCustomer: "Walk-in customer",
    unspecified: "Not specified",
    other: "Other",
    cash: "Cash",
    mobileMoney: "Mobile Money",
    card: "Bank card",
    bankTransfer: "Bank transfer",
    logout: "Log out",
    owner: "Owner",
    administrator: "Administrator",
    pharmacyFallback: "Pharmacy",
    infoMissing: "Information not provided",
    paymentsToExport: "No payments to export.",
    errorProfile: "Your user profile could not be found.",
    errorPermission: "You are not authorized to access payments.",
    errorNoPharmacy: "No pharmacy is associated with your account.",
    loadError: "Unable to load payments.",
    transaction: "transaction",
  },
} as const;

const METHOD_ICONS: Record<string, string> = {
  cash: "💵",
  mobile_money: "📱",
  card: "💳",
  bank_transfer: "🏦",
  other: "💰",
};

export default function PaiementsPage() {
  const router = useRouter();
  const locale = useLocale();
  const language = locale === "en" ? "en" : "fr";
  const t = TEXT[language];
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [payments, setPayments] = useState<PaymentWithSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [error, setError] = useState("");

  const methodLabels: Record<string, string> = {
    cash: t.cash,
    mobile_money: t.mobileMoney,
    card: t.card,
    bank_transfer: t.bankTransfer,
    other: t.other,
  };

  const getMethodLabel = (method: string | null) =>
    method ? methodLabels[method] || method : t.unspecified;

  const getMethodIcon = (method: string | null) =>
    method ? METHOD_ICONS[method] || "💰" : "💰";

  const formatMoney = (value: number, currency = "XAF") =>
    `${new Intl.NumberFormat(
      language === "en" ? "en-US" : "fr-FR",
      { maximumFractionDigits: 0 },
    ).format(Math.round(value))} ${currency}`;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(
      language === "en" ? "en-US" : "fr-FR",
      { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
    ).format(new Date(value));

  const formatPrintDate = (value: Date) =>
    new Intl.DateTimeFormat(
      language === "en" ? "en-US" : "fr-FR",
      { dateStyle: "medium", timeStyle: "short" },
    ).format(value);

  const getInitials = (name: string | null) => {
    if (!name) return "AD";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const getPeriodLabel = (value: Period) =>
    value === "today" ? t.today : value === "month" ? t.month : t.year;

  const isInPeriod = (dateString: string, value: Period) => {
    const date = new Date(dateString);
    const now = new Date();
    if (value === "today") {
      return date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
    }
    if (value === "month") {
      return date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth();
    }
    return date.getFullYear() === now.getFullYear();
  };

  const loadPayments = useCallback(async () => {
    try {
      setError("");

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, pharmacy_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) throw new Error(t.errorProfile);

      const currentProfile = profileData as Profile;

      if (currentProfile.role !== "owner" && currentProfile.role !== "admin") {
        if (currentProfile.role === "pharmacist") router.replace("/pharmacien");
        else if (currentProfile.role === "cashier") router.replace("/caisse");
        else if (currentProfile.role === "employee") router.replace("/employe");
        else router.replace("/login");
        return;
      }

      if (!currentProfile.pharmacy_id) throw new Error(t.errorNoPharmacy);

      setProfile(currentProfile);

      const [pharmacyResult, paymentsResult, salesResult] = await Promise.all([
        supabase.from("pharmacies")
          .select("id, name, address, city, country_code, currency_code")
          .eq("id", currentProfile.pharmacy_id).maybeSingle(),
        supabase.from("payments")
          .select("id, pharmacy_id, sale_id, amount, method, created_at")
          .eq("pharmacy_id", currentProfile.pharmacy_id)
          .order("created_at", { ascending: false }).limit(1000),
        supabase.from("sales")
          .select("id, sale_number, customer_name, customer_phone, total, status, created_at")
          .eq("pharmacy_id", currentProfile.pharmacy_id)
          .order("created_at", { ascending: false }).limit(1000),
      ]);

      if (pharmacyResult.error) throw pharmacyResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (salesResult.error) throw salesResult.error;

      setPharmacy(pharmacyResult.data ? pharmacyResult.data as Pharmacy : null);

      const salesMap = new Map<string, Sale>();
      for (const sale of (salesResult.data || []) as Sale[]) salesMap.set(sale.id, sale);

      setPayments(
        ((paymentsResult.data || []) as Payment[]).map((payment) => ({
          ...payment,
          sale: payment.sale_id ? salesMap.get(payment.sale_id) || null : null,
        })),
      );
    } catch (err) {
      console.error("Erreur paiements :", err);
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, supabase, t.errorProfile, t.errorNoPharmacy, t.loadError]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const currency = pharmacy?.currency_code || "XAF";

  const periodPayments = useMemo(
    () => payments.filter((payment) => isInPeriod(payment.created_at, period)),
    [payments, period],
  );

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return periodPayments.filter((payment) => {
      if (methodFilter !== "all" && payment.method !== methodFilter) return false;
      if (!query) return true;

      const saleNumber = payment.sale?.sale_number || "";
      const customer = payment.sale?.customer_name || "";
      const phone = payment.sale?.customer_phone || "";
      const method = getMethodLabel(payment.method);

      return [saleNumber, customer, phone, method, String(payment.amount)]
        .join(" ").toLowerCase().includes(query);
    });
  }, [periodPayments, search, methodFilter]);

  const totalAmount = useMemo(
    () => periodPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [periodPayments],
  );

  const transactionCount = periodPayments.length;
  const averagePayment = transactionCount > 0 ? totalAmount / transactionCount : 0;

  const methodStats = useMemo(() => {
    const stats = new Map<string, { count: number; amount: number }>();
    for (const payment of periodPayments) {
      const method = payment.method || "other";
      const current = stats.get(method) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += Number(payment.amount || 0);
      stats.set(method, current);
    }
    return Array.from(stats.entries())
      .map(([method, values]) => ({ method, ...values }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodPayments]);

  const uniqueMethods = useMemo(
    () => Array.from(new Set(payments.map((payment) => payment.method).filter(Boolean) as string[])),
    [payments],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert(t.paymentsToExport);
      return;
    }

    const header = [
      language === "en" ? "Date" : "Date",
      language === "en" ? "Sale" : "Vente",
      language === "en" ? "Customer" : "Client",
      language === "en" ? "Phone" : "Téléphone",
      language === "en" ? "Payment method" : "Mode de paiement",
      language === "en" ? "Amount" : "Montant",
    ];

    const rows = filteredPayments.map((payment) => [
      formatDate(payment.created_at),
      payment.sale?.sale_number || "",
      payment.sale?.customer_name || t.counterCustomer,
      payment.sale?.customer_phone || "",
      getMethodLabel(payment.method),
      Number(payment.amount || 0),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pharmaflow-paiements-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const go = (path: string) => router.push(path);

  if (loading) {
    return (
      <main className="pf-payments-loading">
        <div className="pf-payments-loading-card">
          <div className="pf-payments-spinner" />
          <h2>{t.loading}</h2>
          <p>{t.loadingDescription}</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pf-payments-error-page">
        <div className="pf-payments-error-card">
          <div className="pf-payments-error-icon">!</div>
          <h1>{t.cannotLoad}</h1>
          <p>{error}</p>
          <div className="pf-payments-error-actions">
            <button type="button" className="pf-payments-btn primary" onClick={loadPayments}>
              {t.retry}
            </button>
            <button type="button" className="pf-payments-btn secondary" onClick={() => go("/dashboard")}>
              {t.backDashboard}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="pf-payments-screen">
        <aside className="pf-payments-sidebar">
          <div className="pf-payments-brand">
            <div className="pf-payments-brand-logo">P</div>
            <div className="pf-payments-brand-text">
              <strong>PharmaFlow</strong>
              <span>{t.pharmacyManagement}</span>
            </div>
          </div>

          <div className="pf-payments-pharmacy">
            <div className="pf-payments-pharmacy-icon">🏥</div>
            <div>
              <span>{t.pharmacy}</span>
              <strong>{pharmacy?.name || t.myPharmacy}</strong>
              <small>{pharmacy?.city || t.pharmacyFallback}</small>
            </div>
          </div>

          <nav className="pf-payments-nav">
            <div className="pf-payments-nav-title">{t.navAdmin}</div>

            <button type="button" className="pf-payments-nav-item" onClick={() => go("/dashboard")}>
              <span className="icon">▦</span><span>{t.dashboard}</span>
            </button>
            <button type="button" className="pf-payments-nav-item" onClick={() => go("/products")}>
              <span className="icon">▣</span><span>{t.products}</span>
            </button>
            <button type="button" className="pf-payments-nav-item" onClick={() => go("/stock")}>
              <span className="icon">📦</span><span>{t.stock}</span>
            </button>
            <button type="button" className="pf-payments-nav-item" onClick={() => go("/ventes")}>
              <span className="icon">🧾</span><span>{t.sales}</span>
            </button>
            <button type="button" className="pf-payments-nav-item" onClick={() => go("/rapports")}>
              <span className="icon">📊</span><span>{t.reports}</span>
            </button>
            <button type="button" className="pf-payments-nav-item active" onClick={() => go("/paiements")}>
              <span className="icon">💳</span><span>{t.payments}</span>
            </button>

            <div className="pf-payments-nav-title tools">{t.navTools}</div>

            <button type="button" className="pf-payments-nav-item" onClick={() => go("/utilisateurs")}>
              <span className="icon">👥</span><span>{t.users}</span>
            </button>
            <button type="button" className="pf-payments-nav-item" onClick={() => go("/parametres")}>
              <span className="icon">⚙️</span><span>{t.settings}</span>
            </button>
          </nav>

          <div className="pf-payments-user">
            <div className="pf-payments-user-avatar">{getInitials(profile?.full_name || null)}</div>
            <div className="pf-payments-user-info">
              <strong>{profile?.full_name || t.administrator}</strong>
              <span>{profile?.role === "owner" ? t.owner : t.administrator}</span>
            </div>
            <button type="button" className="pf-payments-logout" onClick={handleLogout} title={t.logout}>
              ↪
            </button>
          </div>
        </aside>

        <section className="pf-payments-main">
          <header className="pf-payments-header">
            <div>
              <div className="pf-payments-breadcrumb">{t.breadcrumb}</div>
              <h1>{t.payments}</h1>
              <p>{t.paymentDescription}</p>
            </div>
            <div className="pf-payments-header-actions">
              <button type="button" className="pf-payments-btn secondary" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? t.refreshing : `↻ ${t.refresh}`}
              </button>
              <button type="button" className="pf-payments-btn primary" onClick={handlePrint}>
                🖨 {t.print}
              </button>
            </div>
          </header>

          <div className="pf-payments-info-card">
            <div className="pf-payments-info-icon">🏥</div>
            <div>
              <span>{t.pharmacy}</span>
              <strong>{pharmacy?.name || t.myPharmacy}</strong>
              <small>
                {[pharmacy?.city, pharmacy?.address, pharmacy?.country_code]
                  .filter(Boolean).join(" • ") || t.infoMissing}
              </small>
            </div>
            <div className="pf-payments-secure">🔒 {t.secure}</div>
          </div>

          <div className="pf-payments-period-card">
            <div>
              <span className="pf-payments-kicker">{t.paymentPeriod}</span>
              <h2>{getPeriodLabel(period)}</h2>
              <p>{t.selectPeriod}</p>
            </div>
            <div className="pf-payments-period-buttons">
              <button type="button" className={period === "today" ? "active" : ""} onClick={() => setPeriod("today")}>{t.today}</button>
              <button type="button" className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>{t.month}</button>
              <button type="button" className={period === "year" ? "active" : ""} onClick={() => setPeriod("year")}>{t.year}</button>
            </div>
          </div>

          <div className="pf-payments-stats">
            <div className="pf-payments-stat-card">
              <div className="pf-payments-stat-icon">💰</div>
              <div><span>{t.totalCollected}</span><strong>{formatMoney(totalAmount, currency)}</strong><small>{getPeriodLabel(period)}</small></div>
            </div>
            <div className="pf-payments-stat-card">
              <div className="pf-payments-stat-icon">🧾</div>
              <div><span>{t.transactions}</span><strong>{transactionCount}</strong><small>{t.recordedPayments}</small></div>
            </div>
            <div className="pf-payments-stat-card">
              <div className="pf-payments-stat-icon">📊</div>
              <div><span>{t.averagePayment}</span><strong>{formatMoney(averagePayment, currency)}</strong><small>{t.perTransaction}</small></div>
            </div>
            <div className="pf-payments-stat-card">
              <div className="pf-payments-stat-icon">💳</div>
              <div><span>{t.methodsUsed}</span><strong>{methodStats.length}</strong><small>{t.paymentMethods}</small></div>
            </div>
          </div>

          <section className="pf-payments-methods">
            <div className="pf-payments-panel-title">
              <span className="pf-payments-kicker">{t.distribution}</span>
              <h2>{t.paymentModes}</h2>
            </div>
            {methodStats.length === 0 ? (
              <div className="pf-payments-method-empty">{t.noPaymentsPeriod}</div>
            ) : (
              <div className="pf-payments-method-grid">
                {methodStats.map((item) => (
                  <div key={item.method} className="pf-payments-method-card">
                    <div className="pf-payments-method-icon">{getMethodIcon(item.method)}</div>
                    <div>
                      <span>{getMethodLabel(item.method)}</span>
                      <strong>{formatMoney(item.amount, currency)}</strong>
                      <small>{item.count} {t.transaction}{item.count > 1 ? language === "fr" ? "s" : "s" : ""}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pf-payments-search-panel">
            <div>
              <span className="pf-payments-kicker">{t.search}</span>
              <h2>{t.filterPayments}</h2>
            </div>
            <div className="pf-payments-filters">
              <div className="pf-payments-search">
                <span>⌕</span>
                <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchPlaceholder} />
                {search && <button type="button" onClick={() => setSearch("")} title={t.clear}>×</button>}
              </div>
              <select className="pf-payments-filter" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
                <option value="all">{t.allMethods}</option>
                {uniqueMethods.map((method) => <option key={method} value={method}>{getMethodLabel(method)}</option>)}
              </select>
            </div>
          </section>

          <section className="pf-payments-table-panel">
            <div className="pf-payments-table-header">
              <div>
                <span className="pf-payments-kicker">{t.history}</span>
                <h2>{t.recordedPaymentsTitle}</h2>
                <p>{filteredPayments.length} {filteredPayments.length > 1 ? t.results : t.result}</p>
              </div>
              <button type="button" className="pf-payments-refresh" onClick={handleExportCSV}>↓ {t.exportCsv}</button>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="pf-payments-empty">
                <div className="pf-payments-empty-icon">💳</div>
                <h3>{t.noPaymentFound}</h3>
                <p>{t.noPaymentCriteria}</p>
              </div>
            ) : (
              <div className="pf-payments-table-wrapper">
                <table className="pf-payments-table">
                  <thead><tr><th>Date</th><th>{language === "en" ? "Sale" : "Vente"}</th><th>{language === "en" ? "Customer" : "Client"}</th><th>{language === "en" ? "Payment method" : "Mode de paiement"}</th><th>{language === "en" ? "Amount" : "Montant"}</th></tr></thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.created_at)}</td>
                        <td><strong className="pf-payment-sale-number">{payment.sale?.sale_number || t.directPayment}</strong></td>
                        <td>
                          <div className="pf-payment-client">
                            <strong>{payment.sale?.customer_name || t.counterCustomer}</strong>
                            {payment.sale?.customer_phone && <small>{payment.sale.customer_phone}</small>}
                          </div>
                        </td>
                        <td><span className="pf-payment-method-badge">{getMethodIcon(payment.method)} {getMethodLabel(payment.method)}</span></td>
                        <td><strong className="pf-payment-amount">{formatMoney(Number(payment.amount || 0), currency)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="pf-payments-print-box">
            <div>
              <span className="pf-payments-kicker">{t.quickPrint}</span>
              <h2>{t.printStatement}</h2>
              <p>{t.printDescription}</p>
            </div>
            <div className="pf-payments-print-buttons">
              <button type="button" onClick={handlePrint}>🖨 {t.statement} {getPeriodLabel(period)}</button>
              <button type="button" onClick={handleExportCSV}>↓ {t.exportCsvShort}</button>
            </div>
          </section>
        </section>
      </main>

      <section className="pf-payments-print-page">
        <div className="pf-payments-print-document">
          <header className="pf-payments-print-header">
            <div className="pf-payments-print-brand">
              <div className="pf-payments-print-logo">P</div>
              <div><h1>PharmaFlow</h1><p>{t.pharmacyManagement}</p></div>
            </div>
            <div className="pf-payments-print-pharmacy">
              <strong>{pharmacy?.name || t.myPharmacy}</strong>
              <span>{pharmacy?.city || ""}</span>
              <span>{t.currency} : {currency}</span>
            </div>
          </header>

          <div className="pf-payments-print-divider" />

          <div className="pf-payments-print-title">
            <div><span>{t.statementTitle}</span><h2>{t.payments} — {getPeriodLabel(period)}</h2></div>
            <div>{t.generatedAt} {formatPrintDate(new Date())}</div>
          </div>

          <div className="pf-payments-print-summary">
            <div><span>{t.totalCollected}</span><strong>{formatMoney(totalAmount, currency)}</strong></div>
            <div><span>{t.transactions}</span><strong>{transactionCount}</strong></div>
            <div><span>{t.averagePayment}</span><strong>{formatMoney(averagePayment, currency)}</strong></div>
          </div>

          <div className="pf-payments-print-table-section">
            <h3>{t.paymentDetails}</h3>
            {filteredPayments.length === 0 ? (
              <div className="pf-payments-print-empty">{t.noPaymentRecorded}</div>
            ) : (
              <table>
                <thead><tr><th>Date</th><th>{language === "en" ? "Sale" : "Vente"}</th><th>{language === "en" ? "Customer" : "Client"}</th><th>{language === "en" ? "Method" : "Mode"}</th><th>{language === "en" ? "Amount" : "Montant"}</th></tr></thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={`print-${payment.id}`}>
                      <td>{formatDate(payment.created_at)}</td>
                      <td>{payment.sale?.sale_number || t.directPayment}</td>
                      <td>{payment.sale?.customer_name || t.counterCustomer}</td>
                      <td>{getMethodLabel(payment.method)}</td>
                      <td>{formatMoney(Number(payment.amount || 0), currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <footer className="pf-payments-print-footer">
            <div><strong>PharmaFlow</strong><span>{t.automaticallyGenerated}</span></div>
            <div><strong>{pharmacy?.name || t.myPharmacy}</strong><span>{t.administrativeDocument}</span></div>
          </footer>
        </div>
      </section>
    </>
  );
}
