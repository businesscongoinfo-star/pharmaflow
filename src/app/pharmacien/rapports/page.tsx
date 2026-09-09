"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Period = "today" | "week" | "month" | "year";

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
  country_code: string | null;
  city: string | null;
  currency_code: string | null;
  status: string | null;
};

type Product = {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  unit: string;
  selling_price: number;
  purchase_price: number;
  stock_quantity: number;
  minimum_stock: number;
  expiry_date: string | null;
  is_active: boolean;
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

type Payment = {
  id: string;
  sale_id: string;
  amount: number;
  method: string;
  created_at: string;
};

type PaymentSummary = {
  method: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  card: "Carte bancaire",
  bank_transfer: "Virement",
  other: "Autre",
};

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd’hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
};

function getPeriodStart(period: Period) {
  const now = new Date();

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "week") {
    const start = new Date(now);
    const day = start.getDay();

    const diff = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);

    return start;
  }

  if (period === "month") {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
  }

  return new Date(
    now.getFullYear(),
    0,
    1,
    0,
    0,
    0,
    0,
  );
}

function formatMoney(
  value: number,
  currency = "XAF",
) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ` ${currency}`;
}

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date: string | null) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Terminée";

    case "cancelled":
      return "Annulée";

    case "pending":
      return "En attente";

    default:
      return status || "—";
  }
}

export default function PharmacienReportsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [period, setPeriod] = useState<Period>("today");

  const loadReports = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, phone, role, pharmacy_id",
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error(
            `Impossible de charger votre profil : ${profileError.message}`,
          );
        }

        if (!profileData) {
          throw new Error(
            "Votre profil utilisateur est introuvable.",
          );
        }

        const currentProfile =
          profileData as Profile;

        if (
          currentProfile.role !== "pharmacist"
        ) {
          if (currentProfile.role === "owner") {
            router.replace("/dashboard");
          } else if (
            currentProfile.role === "admin"
          ) {
            router.replace("/admin");
          } else if (
            currentProfile.role === "cashier"
          ) {
            router.replace("/caisse");
          } else {
            router.replace("/login");
          }

          return;
        }

        if (!currentProfile.pharmacy_id) {
          throw new Error(
            "Aucune pharmacie n'est associée à votre compte.",
          );
        }

        setProfile(currentProfile);

        const pharmacyId =
          currentProfile.pharmacy_id;

        const [
          pharmacyResult,
          productsResult,
          salesResult,
          paymentsResult,
        ] = await Promise.all([
          supabase
            .from("pharmacies")
            .select(
              "id, name, address, country_code, city, currency_code, status",
            )
            .eq("id", pharmacyId)
            .maybeSingle(),

          supabase
            .from("products")
            .select(
              "id, name, generic_name, category, unit, selling_price, purchase_price, stock_quantity, minimum_stock, expiry_date, is_active",
            )
            .eq("pharmacy_id", pharmacyId)
            .order("name", {
              ascending: true,
            }),

          supabase
            .from("sales")
            .select(
              "id, sale_number, subtotal, discount, tax, total, status, customer_name, customer_phone, created_at",
            )
            .eq("pharmacy_id", pharmacyId)
            .order("created_at", {
              ascending: false,
            })
            .limit(1000),

          supabase
            .from("payments")
            .select(
              "id, sale_id, amount, method, created_at",
            )
            .eq("pharmacy_id", pharmacyId)
            .order("created_at", {
              ascending: false,
            })
            .limit(2000),
        ]);

        if (pharmacyResult.error) {
          throw new Error(
            `Impossible de charger la pharmacie : ${pharmacyResult.error.message}`,
          );
        }

        if (productsResult.error) {
          throw new Error(
            `Impossible de charger les produits : ${productsResult.error.message}`,
          );
        }

        if (salesResult.error) {
          throw new Error(
            `Impossible de charger les ventes : ${salesResult.error.message}`,
          );
        }

        if (paymentsResult.error) {
          throw new Error(
            `Impossible de charger les paiements : ${paymentsResult.error.message}`,
          );
        }

        setPharmacy(
          (pharmacyResult.data as Pharmacy | null) ??
            null,
        );

        setProducts(
          (productsResult.data ??
            []) as Product[],
        );

        setSales(
          (salesResult.data ?? []) as Sale[],
        );

        setPayments(
          (paymentsResult.data ??
            []) as Payment[],
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue lors du chargement du rapport.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, supabase],
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const currency =
    pharmacy?.currency_code || "XAF";

  const periodStart = useMemo(
    () => getPeriodStart(period),
    [period],
  );

  const periodSales = useMemo(() => {
    return sales.filter((sale) => {
      const date = new Date(sale.created_at);

      return (
        date >= periodStart &&
        sale.status !== "cancelled"
      );
    });
  }, [sales, periodStart]);

  const periodPayments = useMemo(() => {
    return payments.filter((payment) => {
      const date = new Date(
        payment.created_at,
      );

      return date >= periodStart;
    });
  }, [payments, periodStart]);

  const metrics = useMemo(() => {
    const revenue = periodSales.reduce(
      (sum, sale) =>
        sum + Number(sale.total || 0),
      0,
    );

    const subtotal = periodSales.reduce(
      (sum, sale) =>
        sum + Number(sale.subtotal || 0),
      0,
    );

    const discounts = periodSales.reduce(
      (sum, sale) =>
        sum + Number(sale.discount || 0),
      0,
    );

    const taxes = periodSales.reduce(
      (sum, sale) =>
        sum + Number(sale.tax || 0),
      0,
    );

    const paymentTotal =
      periodPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0,
      );

    const salesCount = periodSales.length;

    const averageBasket =
      salesCount > 0
        ? revenue / salesCount
        : 0;

    return {
      revenue,
      subtotal,
      discounts,
      taxes,
      paymentTotal,
      salesCount,
      averageBasket,
    };
  }, [periodSales, periodPayments]);

  const stockMetrics = useMemo(() => {
    const activeProducts =
      products.filter(
        (product) => product.is_active,
      );

    const totalUnits =
      activeProducts.reduce(
        (sum, product) =>
          sum +
          Number(product.stock_quantity || 0),
        0,
      );

    const stockValue =
      activeProducts.reduce(
        (sum, product) =>
          sum +
          Number(
            product.stock_quantity || 0,
          ) *
            Number(
              product.purchase_price || 0,
            ),
        0,
      );

    const sellingValue =
      activeProducts.reduce(
        (sum, product) =>
          sum +
          Number(
            product.stock_quantity || 0,
          ) *
            Number(
              product.selling_price || 0,
            ),
        0,
      );

    const lowStock =
      activeProducts.filter(
        (product) =>
          Number(product.stock_quantity || 0) >
            0 &&
          Number(product.stock_quantity || 0) <=
            Number(product.minimum_stock || 0),
      );

    const outOfStock =
      activeProducts.filter(
        (product) =>
          Number(product.stock_quantity || 0) <=
          0,
      );

    const expired =
      activeProducts.filter((product) => {
        if (!product.expiry_date) {
          return false;
        }

        const expiry = new Date(
          product.expiry_date,
        );

        return expiry < new Date();
      });

    const expiringSoon =
      activeProducts.filter((product) => {
        if (!product.expiry_date) {
          return false;
        }

        const expiry = new Date(
          product.expiry_date,
        );

        const today = new Date();

        const limit = new Date();
        limit.setDate(
          limit.getDate() + 90,
        );

        return (
          expiry >= today &&
          expiry <= limit
        );
      });

    return {
      activeProducts,
      totalUnits,
      stockValue,
      sellingValue,
      lowStock,
      outOfStock,
      expired,
      expiringSoon,
    };
  }, [products]);

  const paymentSummary =
    useMemo<PaymentSummary[]>(() => {
      const map = new Map<
        string,
        {
          amount: number;
          count: number;
        }
      >();

      periodPayments.forEach((payment) => {
        const current =
          map.get(payment.method) || {
            amount: 0,
            count: 0,
          };

        current.amount += Number(
          payment.amount || 0,
        );

        current.count += 1;

        map.set(payment.method, current);
      });

      const total = periodPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0,
      );

      return Array.from(map.entries())
        .map(([method, data]) => ({
          method,
          label:
            PAYMENT_LABELS[method] ||
            method ||
            "Autre",
          amount: data.amount,
          count: data.count,
          percentage:
            total > 0
              ? (data.amount / total) *
                100
              : 0,
        }))
        .sort(
          (a, b) =>
            b.amount - a.amount,
        );
    }, [periodPayments]);

  const recentSales = useMemo(() => {
    return [...periodSales]
      .sort(
        (a, b) =>
          new Date(
            b.created_at,
          ).getTime() -
          new Date(
            a.created_at,
          ).getTime(),
      )
      .slice(0, 10);
  }, [periodSales]);

  const exportCSV = useCallback(() => {
    const rows = [
      [
        "N° Vente",
        "Date",
        "Client",
        "Sous-total",
        "Remise",
        "Taxe",
        "Total",
        "Statut",
      ],
      ...periodSales.map((sale) => [
        sale.sale_number,
        formatDateTime(
          sale.created_at,
        ),
        sale.customer_name || "Client comptoir",
        String(sale.subtotal),
        String(sale.discount),
        String(sale.tax),
        String(sale.total),
        getStatusLabel(sale.status),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text =
              String(value ?? "");

            return `"${text.replace(
              /"/g,
              '""',
            )}"`;
          })
          .join(";"),
      )
      .join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
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

    link.download = `rapport-pharmacien-${period}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, [periodSales, period]);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  const go = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="pf-reports-loading">
        <div className="pf-loading-spinner" />
        <h2>Chargement du rapport…</h2>
        <p>
          Préparation des données de votre
          pharmacie.
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pf-reports-error-page">
        <div className="pf-error-card">
          <div className="pf-error-icon">
            !
          </div>

          <h1>
            Impossible de charger le
            rapport
          </h1>

          <p>{error}</p>

          <div className="pf-error-actions">
            <button
              type="button"
              className="pf-btn pf-btn-primary"
              onClick={() =>
                loadReports()
              }
            >
              Réessayer
            </button>

            <button
              type="button"
              className="pf-btn pf-btn-secondary"
              onClick={() =>
                go("/pharmacien")
              }
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="pf-app pf-reports-app">
        <aside className="pf-sidebar pf-reports-sidebar">
          <div className="pf-sidebar-brand">
            <div className="pf-brand-mark">
              P
            </div>

            <div>
              <strong>
                PharmaFlow
              </strong>

              <span>
                Poste pharmacien
              </span>
            </div>
          </div>

          <div className="pf-pharmacy-mini">
            <div className="pf-pharmacy-mini-icon">
              🏥
            </div>

            <div>
              <strong>
                {pharmacy?.name ||
                  "Ma pharmacie"}
              </strong>

              <span>
                {pharmacy?.city ||
                  "Pharmacie"}
              </span>
            </div>
          </div>

          <nav className="pf-sidebar-nav">
            <div className="pf-nav-section">
              <span className="pf-nav-label">
                ESPACE PHARMACIEN
              </span>

              <button
                type="button"
                className="pf-nav-item"
                onClick={() =>
                  go("/pharmacien")
                }
              >
                <span>▦</span>
                <span>
                  Tableau de bord
                </span>
              </button>

              <button
                type="button"
                className="pf-nav-item"
                onClick={() =>
                  go("/products")
                }
              >
                <span>▣</span>
                <span>Produits</span>
              </button>

              <button
                type="button"
                className="pf-nav-item"
                onClick={() =>
                  go("/stock")
                }
              >
                <span>▤</span>
                <span>Stock</span>
              </button>

              <button
                type="button"
                className="pf-nav-item"
                onClick={() =>
                  go("/ventes")
                }
              >
                <span>🛒</span>
                <span>Ventes</span>
              </button>
            </div>

            <div className="pf-nav-section">
              <span className="pf-nav-label">
                ANALYSE
              </span>

              <button
                type="button"
                className="pf-nav-item active"
                onClick={() =>
                  go(
                    "/pharmacien/rapports",
                  )
                }
              >
                <span>▥</span>
                <span>Rapports</span>
              </button>

              <button
                type="button"
                className="pf-nav-item"
                onClick={() =>
                  go(
                    "/pharmacien/paiements",
                  )
                }
              >
                <span>₣</span>
                <span>Paiements</span>
              </button>
            </div>

            <div className="pf-nav-section">
              <span className="pf-nav-label">
                OUTILS
              </span>

              <button
                type="button"
                className="pf-nav-item"
                onClick={printReport}
              >
                <span>🖨</span>
                <span>
                  Imprimer le rapport
                </span>
              </button>

              <button
                type="button"
                className="pf-nav-item"
                onClick={() =>
                  go("/parametres")
                }
              >
                <span>⚙</span>
                <span>Mon profil</span>
              </button>
            </div>
          </nav>

          <div className="pf-sidebar-user">
            <div className="pf-user-avatar">
              {(
                profile?.full_name ||
                "P"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="pf-user-info">
              <strong>
                {profile?.full_name ||
                  "Pharmacien"}
              </strong>

              <span>
                Pharmacien
              </span>
            </div>

            <button
              type="button"
              className="pf-logout-button"
              onClick={logout}
              title="Se déconnecter"
            >
              ↪
            </button>
          </div>
        </aside>

        <main className="pf-main">
          <header className="pf-topbar">
            <div>
              <div className="pf-breadcrumb">
                Pharmacien
                <span>/</span>
                Rapports
              </div>

              <h1>
                Rapports & analyses
              </h1>

              <p>
                Analysez l’activité de votre
                pharmacie sur la période
                sélectionnée.
              </p>
            </div>

            <div className="pf-topbar-actions">
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={() =>
                  loadReports(true)
                }
                disabled={refreshing}
              >
                {refreshing
                  ? "Actualisation…"
                  : "↻ Actualiser"}
              </button>

              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={exportCSV}
              >
                ↓ Exporter CSV
              </button>

              <button
                type="button"
                className="pf-btn pf-btn-primary"
                onClick={printReport}
              >
                🖨 Imprimer
              </button>
            </div>
          </header>

          <div className="pf-content">
            <div className="pf-reports-container">
              <section className="pf-reports-toolbar">
                <div>
                  <span className="pf-toolbar-label">
                    Période du rapport
                  </span>

                  <div className="pf-period-buttons">
                    {(
                      Object.keys(
                        PERIOD_LABELS,
                      ) as Period[]
                    ).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={
                          period === item
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setPeriod(item)
                        }
                      >
                        {PERIOD_LABELS[
                          item
                        ]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pf-report-date">
                  <span>
                    Période sélectionnée
                  </span>

                  <strong>
                    {formatDate(
                      periodStart.toISOString(),
                    )}{" "}
                    —{" "}
                    {formatDate(
                      new Date().toISOString(),
                    )}
                  </strong>
                </div>
              </section>

              <section className="pf-report-hero">
                <div>
                  <span>
                    RAPPORT PHARMACIE
                  </span>

                  <h2>
                    {PERIOD_LABELS[period]}
                  </h2>

                  <p>
                    {pharmacy?.name ||
                      "Ma pharmacie"}
                    {pharmacy?.city
                      ? ` • ${pharmacy.city}`
                      : ""}
                  </p>
                </div>

                <div className="pf-report-hero-value">
                  <span>
                    Chiffre d’affaires
                  </span>

                  <strong>
                    {formatMoney(
                      metrics.revenue,
                      currency,
                    )}
                  </strong>

                  <small>
                    {metrics.salesCount} vente
                    {metrics.salesCount >
                    1
                      ? "s"
                      : ""}{" "}
                    enregistrée
                    {metrics.salesCount >
                    1
                      ? "s"
                      : ""}
                  </small>
                </div>
              </section>

              <section className="pf-stats-grid pf-report-stats">
                <article className="pf-stat-card">
                  <div className="pf-stat-icon">
                    💰
                  </div>

                  <div>
                    <span>
                      Chiffre d’affaires
                    </span>

                    <strong>
                      {formatMoney(
                        metrics.revenue,
                        currency,
                      )}
                    </strong>

                    <small>
                      Ventes validées
                    </small>
                  </div>
                </article>

                <article className="pf-stat-card">
                  <div className="pf-stat-icon">
                    🧾
                  </div>

                  <div>
                    <span>
                      Nombre de ventes
                    </span>

                    <strong>
                      {metrics.salesCount}
                    </strong>

                    <small>
                      Transactions
                    </small>
                  </div>
                </article>

                <article className="pf-stat-card">
                  <div className="pf-stat-icon">
                    🛍
                  </div>

                  <div>
                    <span>
                      Panier moyen
                    </span>

                    <strong>
                      {formatMoney(
                        metrics.averageBasket,
                        currency,
                      )}
                    </strong>

                    <small>
                      Par transaction
                    </small>
                  </div>
                </article>

                <article className="pf-stat-card">
                  <div className="pf-stat-icon">
                    💳
                  </div>

                  <div>
                    <span>
                      Paiements
                    </span>

                    <strong>
                      {formatMoney(
                        metrics.paymentTotal,
                        currency,
                      )}
                    </strong>

                    <small>
                      Encaissements
                    </small>
                  </div>
                </article>
              </section>
              <section className="pf-reports-grid">
                <article className="pf-card pf-report-financial-card">
                  <div className="pf-card-header">
                    <div>
                      <span className="pf-card-kicker">
                        FINANCES
                      </span>

                      <h3>
                        Synthèse financière
                      </h3>
                    </div>
                  </div>

                  <div className="pf-financial-list">
                    <div>
                      <span>
                        Sous-total des ventes
                      </span>

                      <strong>
                        {formatMoney(
                          metrics.subtotal,
                          currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Remises accordées
                      </span>

                      <strong>
                        {formatMoney(
                          metrics.discounts,
                          currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Taxes
                      </span>

                      <strong>
                        {formatMoney(
                          metrics.taxes,
                          currency,
                        )}
                      </strong>
                    </div>

                    <div className="total">
                      <span>
                        Chiffre d’affaires
                      </span>

                      <strong>
                        {formatMoney(
                          metrics.revenue,
                          currency,
                        )}
                      </strong>
                    </div>
                  </div>
                </article>

                <article className="pf-card pf-payment-summary-card">
                  <div className="pf-card-header">
                    <div>
                      <span className="pf-card-kicker">
                        ENCAISSEMENTS
                      </span>

                      <h3>
                        Modes de paiement
                      </h3>
                    </div>
                  </div>

                  {paymentSummary.length ===
                  0 ? (
                    <div className="pf-empty-small">
                      <div>💳</div>

                      <p>
                        Aucun paiement enregistré
                        sur cette période.
                      </p>
                    </div>
                  ) : (
                    <div className="pf-payment-list">
                      {paymentSummary.map(
                        (item) => (
                          <div
                            className="pf-payment-row"
                            key={item.method}
                          >
                            <div className="pf-payment-row-top">
                              <span>
                                {item.label}
                              </span>

                              <strong>
                                {formatMoney(
                                  item.amount,
                                  currency,
                                )}
                              </strong>
                            </div>

                            <div className="pf-payment-progress">
                              <span
                                style={{
                                  width: `${Math.min(
                                    item.percentage,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>

                            <div className="pf-payment-row-bottom">
                              <span>
                                {item.count}{" "}
                                transaction
                                {item.count >
                                1
                                  ? "s"
                                  : ""}
                              </span>

                              <span>
                                {item.percentage.toFixed(
                                  1,
                                )}
                                %
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </article>
              </section>

              <section className="pf-card pf-stock-report-card">
                <div className="pf-card-header">
                  <div>
                    <span className="pf-card-kicker">
                      INVENTAIRE
                    </span>

                    <h3>
                      État du stock
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="pf-link-button"
                    onClick={() =>
                      go("/stock")
                    }
                  >
                    Voir le stock →
                  </button>
                </div>

                <div className="pf-stock-report-grid">
                  <div className="pf-stock-metric">
                    <span className="pf-stock-metric-icon">
                      📦
                    </span>

                    <div>
                      <span>
                        Produits actifs
                      </span>

                      <strong>
                        {
                          stockMetrics
                            .activeProducts
                            .length
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="pf-stock-metric">
                    <span className="pf-stock-metric-icon">
                      🧮
                    </span>

                    <div>
                      <span>
                        Unités en stock
                      </span>

                      <strong>
                        {stockMetrics.totalUnits.toLocaleString(
                          "fr-FR",
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="pf-stock-metric">
                    <span className="pf-stock-metric-icon">
                      💼
                    </span>

                    <div>
                      <span>
                        Valeur d’achat
                      </span>

                      <strong>
                        {formatMoney(
                          stockMetrics.stockValue,
                          currency,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="pf-stock-metric">
                    <span className="pf-stock-metric-icon">
                      🏷
                    </span>

                    <div>
                      <span>
                        Valeur de vente
                      </span>

                      <strong>
                        {formatMoney(
                          stockMetrics.sellingValue,
                          currency,
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pf-stock-alerts">
                  <div className="pf-stock-alert warning">
                    <span>⚠</span>

                    <div>
                      <strong>
                        Stock faible
                      </strong>

                      <small>
                        {
                          stockMetrics.lowStock
                            .length
                        }{" "}
                        produit
                        {stockMetrics.lowStock
                          .length >
                        1
                          ? "s"
                          : ""}
                      </small>
                    </div>
                  </div>

                  <div className="pf-stock-alert danger">
                    <span>!</span>

                    <div>
                      <strong>
                        Rupture de stock
                      </strong>

                      <small>
                        {
                          stockMetrics
                            .outOfStock
                            .length
                        }{" "}
                        produit
                        {stockMetrics
                          .outOfStock
                          .length >
                        1
                          ? "s"
                          : ""}
                      </small>
                    </div>
                  </div>

                  <div className="pf-stock-alert danger">
                    <span>⌛</span>

                    <div>
                      <strong>
                        Produits expirés
                      </strong>

                      <small>
                        {
                          stockMetrics.expired
                            .length
                        }{" "}
                        produit
                        {stockMetrics.expired
                          .length >
                        1
                          ? "s"
                          : ""}
                      </small>
                    </div>
                  </div>

                  <div className="pf-stock-alert info">
                    <span>◷</span>

                    <div>
                      <strong>
                        Expiration ≤ 90 jours
                      </strong>

                      <small>
                        {
                          stockMetrics
                            .expiringSoon
                            .length
                        }{" "}
                        produit
                        {stockMetrics
                          .expiringSoon
                          .length >
                        1
                          ? "s"
                          : ""}
                      </small>
                    </div>
                  </div>
                </div>
              </section>

              <section className="pf-card pf-sales-report-card">
                <div className="pf-card-header">
                  <div>
                    <span className="pf-card-kicker">
                      ACTIVITÉ COMMERCIALE
                    </span>

                    <h3>
                      Dernières ventes
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="pf-link-button"
                    onClick={() =>
                      go("/ventes")
                    }
                  >
                    Voir toutes les ventes →
                  </button>
                </div>

                {recentSales.length ===
                0 ? (
                  <div className="pf-empty-state">
                    <div className="pf-empty-icon">
                      🧾
                    </div>

                    <h4>
                      Aucune vente sur cette
                      période
                    </h4>

                    <p>
                      Les ventes enregistrées
                      apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <div className="pf-table-wrap">
                    <table className="pf-table">
                      <thead>
                        <tr>
                          <th>
                            N° Vente
                          </th>

                          <th>
                            Date
                          </th>

                          <th>
                            Client
                          </th>

                          <th>
                            Statut
                          </th>

                          <th className="text-right">
                            Total
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentSales.map(
                          (sale) => (
                            <tr
                              key={sale.id}
                            >
                              <td>
                                <strong className="pf-sale-number">
                                  {
                                    sale.sale_number
                                  }
                                </strong>
                              </td>

                              <td>
                                {formatDateTime(
                                  sale.created_at,
                                )}
                              </td>

                              <td>
                                <div className="pf-customer-cell">
                                  <strong>
                                    {sale.customer_name ||
                                      "Client comptoir"}
                                  </strong>

                                  {sale.customer_phone && (
                                    <small>
                                      {
                                        sale.customer_phone
                                      }
                                    </small>
                                  )}
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`pf-status-badge ${
                                    sale.status ===
                                    "completed"
                                      ? "success"
                                      : sale.status ===
                                        "cancelled"
                                      ? "danger"
                                      : "warning"
                                  }`}
                                >
                                  {getStatusLabel(
                                    sale.status,
                                  )}
                                </span>
                              </td>

                              <td className="text-right">
                                <strong>
                                  {formatMoney(
                                    Number(
                                      sale.total ||
                                        0,
                                    ),
                                    currency,
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

              <section className="pf-reports-bottom-grid">
                <article className="pf-card pf-period-card">
                  <div className="pf-card-header">
                    <div>
                      <span className="pf-card-kicker">
                        RAPPORTS
                      </span>

                      <h3>
                        Accès rapide
                      </h3>
                    </div>
                  </div>

                  <div className="pf-quick-report-grid">
                    <button
                      type="button"
                      onClick={() => {
                        setPeriod("today");

                        setTimeout(
                          printReport,
                          250,
                        );
                      }}
                    >
                      <span>☀</span>
                      <div>
                        <strong>
                          Rapport du jour
                        </strong>

                        <small>
                          Activité
                          d’aujourd’hui
                        </small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPeriod("week");

                        setTimeout(
                          printReport,
                          250,
                        );
                      }}
                    >
                      <span>📅</span>
                      <div>
                        <strong>
                          Rapport hebdomadaire
                        </strong>

                        <small>
                          Cette semaine
                        </small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPeriod("month");

                        setTimeout(
                          printReport,
                          250,
                        );
                      }}
                    >
                      <span>▦</span>
                      <div>
                        <strong>
                          Rapport mensuel
                        </strong>

                        <small>
                          Ce mois
                        </small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPeriod("year");

                        setTimeout(
                          printReport,
                          250,
                        );
                      }}
                    >
                      <span>▥</span>
                      <div>
                        <strong>
                          Rapport annuel
                        </strong>

                        <small>
                          Cette année
                        </small>
                      </div>
                    </button>
                  </div>
                </article>

                <article className="pf-card pf-report-note">
                  <div className="pf-report-note-icon">
                    ✓
                  </div>

                  <div>
                    <span>
                      DONNÉES SÉCURISÉES
                    </span>

                    <h3>
                      Rapport de votre
                      pharmacie
                    </h3>

                    <p>
                      Les données affichées
                      sont limitées à la
                      pharmacie associée à
                      votre compte pharmacien.
                      Aucun rapport d’une
                      autre pharmacie n’est
                      accessible depuis cet
                      espace.
                    </p>
                  </div>
                </article>
              </section>
            </div>
          </div>
        </main>
      </div>

      <section className="pf-reports-print-page">
        <div className="pf-print-header">
          <div>
            <div className="pf-print-brand">
              <span className="pf-print-logo">
                P
              </span>

              <div>
                <strong>
                  PharmaFlow
                </strong>

                <small>
                  Gestion intelligente des
                  pharmacies
                </small>
              </div>
            </div>

            <h1>
              Rapport d’activité
            </h1>

            <p>
              {pharmacy?.name ||
                "Ma pharmacie"}
            </p>

            {pharmacy?.address && (
              <p>
                {pharmacy.address}
              </p>
            )}
          </div>

          <div className="pf-print-meta">
            <strong>
              {PERIOD_LABELS[period]}
            </strong>

            <span>
              Du{" "}
              {formatDate(
                periodStart.toISOString(),
              )}{" "}
              au{" "}
              {formatDate(
                new Date().toISOString(),
              )}
            </span>

            <span>
              Généré le{" "}
              {formatDateTime(
                new Date().toISOString(),
              )}
            </span>
          </div>
        </div>

        <div className="pf-print-summary">
          <div>
            <span>
              Chiffre d’affaires
            </span>

            <strong>
              {formatMoney(
                metrics.revenue,
                currency,
              )}
            </strong>
          </div>

          <div>
            <span>
              Nombre de ventes
            </span>

            <strong>
              {metrics.salesCount}
            </strong>
          </div>

          <div>
            <span>
              Panier moyen
            </span>

            <strong>
              {formatMoney(
                metrics.averageBasket,
                currency,
              )}
            </strong>
          </div>

          <div>
            <span>
              Paiements
            </span>

            <strong>
              {formatMoney(
                metrics.paymentTotal,
                currency,
              )}
            </strong>
          </div>
        </div>

        <div className="pf-print-section">
          <h2>
            Synthèse financière
          </h2>

          <table>
            <tbody>
              <tr>
                <td>
                  Sous-total
                </td>

                <td>
                  {formatMoney(
                    metrics.subtotal,
                    currency,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  Remises
                </td>

                <td>
                  {formatMoney(
                    metrics.discounts,
                    currency,
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  Taxes
                </td>

                <td>
                  {formatMoney(
                    metrics.taxes,
                    currency,
                  )}
                </td>
              </tr>

              <tr className="print-total">
                <td>
                  Chiffre d’affaires
                </td>

                <td>
                  {formatMoney(
                    metrics.revenue,
                    currency,
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pf-print-section">
          <h2>
            État du stock
          </h2>

          <div className="pf-print-stock-grid">
            <div>
              <span>
                Produits actifs
              </span>

              <strong>
                {
                  stockMetrics
                    .activeProducts.length
                }
              </strong>
            </div>

            <div>
              <span>
                Unités en stock
              </span>

              <strong>
                {stockMetrics.totalUnits.toLocaleString(
                  "fr-FR",
                )}
              </strong>
            </div>

            <div>
              <span>
                Stock faible
              </span>

              <strong>
                {
                  stockMetrics.lowStock
                    .length
                }
              </strong>
            </div>

            <div>
              <span>
                Ruptures
              </span>

              <strong>
                {
                  stockMetrics.outOfStock
                    .length
                }
              </strong>
            </div>

            <div>
              <span>
                Produits expirés
              </span>

              <strong>
                {
                  stockMetrics.expired
                    .length
                }
              </strong>
            </div>

            <div>
              <span>
                Expiration ≤ 90 jours
              </span>

              <strong>
                {
                  stockMetrics
                    .expiringSoon.length
                }
              </strong>
            </div>
          </div>
        </div>

        <div className="pf-print-section">
          <h2>
            Répartition des paiements
          </h2>

          <table>
            <thead>
              <tr>
                <th>
                  Mode de paiement
                </th>

                <th>
                  Transactions
                </th>

                <th>
                  Montant
                </th>

                <th>
                  Part
                </th>
              </tr>
            </thead>

            <tbody>
              {paymentSummary.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={4}
                  >
                    Aucun paiement
                    enregistré.
                  </td>
                </tr>
              ) : (
                paymentSummary.map(
                  (item) => (
                    <tr
                      key={
                        item.method
                      }
                    >
                      <td>
                        {item.label}
                      </td>

                      <td>
                        {item.count}
                      </td>

                      <td>
                        {formatMoney(
                          item.amount,
                          currency,
                        )}
                      </td>

                      <td>
                        {item.percentage.toFixed(
                          1,
                        )}
                        %
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="pf-print-section">
          <h2>
            Dernières ventes
          </h2>

          <table>
            <thead>
              <tr>
                <th>
                  N° Vente
                </th>

                <th>
                  Date
                </th>

                <th>
                  Client
                </th>

                <th>
                  Statut
                </th>

                <th>
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {recentSales.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={5}
                  >
                    Aucune vente sur cette
                    période.
                  </td>
                </tr>
              ) : (
                recentSales.map(
                  (sale) => (
                    <tr
                      key={sale.id}
                    >
                      <td>
                        {
                          sale.sale_number
                        }
                      </td>

                      <td>
                        {formatDateTime(
                          sale.created_at,
                        )}
                      </td>

                      <td>
                        {sale.customer_name ||
                          "Client comptoir"}
                      </td>

                      <td>
                        {getStatusLabel(
                          sale.status,
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          Number(
                            sale.total ||
                              0,
                          ),
                          currency,
                        )}
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="pf-print-footer">
          <span>
            PharmaFlow — Rapport
            confidentiel de pharmacie
          </span>

          <span>
            Pharmacien :{" "}
            {profile?.full_name ||
              "—"}
          </span>
        </div>
      </section>
    </>
  );
}