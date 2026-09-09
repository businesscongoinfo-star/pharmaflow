"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Period = "day" | "month" | "year";

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
  sale_id: string;
  amount: number;
  method: string;
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

const supabase = createClient();

function getPeriodLabel(period: Period) {
  if (period === "day") return "Aujourd’hui";
  if (period === "month") return "Ce mois";
  return "Cette année";
}

function isDateInPeriod(
  value: string,
  period: Period
) {
  const date = new Date(value);
  const now = new Date();

  if (period === "day") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  if (period === "month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  return (
    date.getFullYear() === now.getFullYear()
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getMethodLabel(method: string) {
  const value = String(method || "")
    .trim()
    .toLowerCase();

  switch (value) {
    case "cash":
    case "especes":
    case "espèces":
      return "Espèces";

    case "mobile_money":
    case "mobile-money":
    case "mobile money":
      return "Mobile Money";

    case "card":
    case "carte":
      return "Carte bancaire";

    case "bank_transfer":
    case "bank-transfer":
    case "bank transfer":
    case "virement":
      return "Virement bancaire";

    case "other":
    case "autre":
      return "Autre";

    default:
      return method || "Non précisé";
  }
}

function getMethodIcon(method: string) {
  const value = String(method || "")
    .trim()
    .toLowerCase();

  if (
    value === "cash" ||
    value === "especes" ||
    value === "espèces"
  ) {
    return "💵";
  }

  if (
    value === "mobile_money" ||
    value === "mobile-money" ||
    value === "mobile money"
  ) {
    return "📱";
  }

  if (
    value === "card" ||
    value === "carte"
  ) {
    return "💳";
  }

  if (
    value === "bank_transfer" ||
    value === "bank-transfer" ||
    value === "bank transfer" ||
    value === "virement"
  ) {
    return "🏦";
  }

  return "💰";
}

function startOfYear() {
  const date = new Date();

  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);

  return date;
}

export default function PharmacienPaymentsPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [period, setPeriod] =
    useState<Period>("day");

  const [search, setSearch] =
    useState("");

  const [methodFilter, setMethodFilter] =
    useState("all");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [printPeriod, setPrintPeriod] =
    useState<Period | null>(null);

  const loadPayments =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(
            authError.message
          );
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, phone, role, pharmacy_id"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error(
            `Profil : ${profileError.message}`
          );
        }

        if (!profileData) {
          throw new Error(
            "Profil utilisateur introuvable."
          );
        }

        const currentProfile =
          profileData as Profile;

        if (
          currentProfile.role !==
          "pharmacist"
        ) {
          if (
            currentProfile.role ===
            "owner"
          ) {
            router.replace("/dashboard");
          } else if (
            currentProfile.role ===
            "admin"
          ) {
            router.replace("/admin");
          } else if (
            currentProfile.role ===
            "cashier"
          ) {
            router.replace("/caisse");
          } else {
            router.replace("/employe");
          }

          return;
        }

        if (
          !currentProfile.pharmacy_id
        ) {
          throw new Error(
            "Aucune pharmacie n’est associée à ce compte."
          );
        }

        setProfile(currentProfile);

        const pharmacyId =
          currentProfile.pharmacy_id;

        const [
          pharmacyResult,
          paymentsResult,
          salesResult,
        ] = await Promise.all([
          supabase
            .from("pharmacies")
            .select(
              "id, name, address, city, country_code, currency_code"
            )
            .eq("id", pharmacyId)
            .maybeSingle(),

          /*
           * IMPORTANT :
           * on ne demande PAS updated_at.
           *
           * La table payments utilise ici :
           * id
           * pharmacy_id
           * sale_id
           * amount
           * method
           * created_at
           */
          supabase
            .from("payments")
            .select(
              "id, pharmacy_id, sale_id, amount, method, created_at"
            )
            .eq(
              "pharmacy_id",
              pharmacyId
            )
            .gte(
              "created_at",
              startOfYear().toISOString()
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("sales")
            .select(
              "id, sale_number, customer_name, customer_phone, total, status, created_at"
            )
            .eq(
              "pharmacy_id",
              pharmacyId
            )
            .gte(
              "created_at",
              startOfYear().toISOString()
            )
            .order("created_at", {
              ascending: false,
            }),
        ]);

        if (pharmacyResult.error) {
          throw new Error(
            `Pharmacie : ${pharmacyResult.error.message}`
          );
        }

        if (paymentsResult.error) {
          throw new Error(
            `Paiements : ${paymentsResult.error.message}`
          );
        }

        if (salesResult.error) {
          throw new Error(
            `Ventes : ${salesResult.error.message}`
          );
        }

        setPharmacy(
          (pharmacyResult.data ??
            null) as Pharmacy | null
        );

        setPayments(
          (paymentsResult.data ??
            []) as Payment[]
        );

        setSales(
          (salesResult.data ??
            []) as Sale[]
        );
      } catch (err) {
        console.error(
          "Erreur paiements :",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les paiements."
        );
      } finally {
        setLoading(false);
      }
    }, [router]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    if (!printPeriod) return;

    const timer =
      window.setTimeout(() => {
        window.print();

        window.setTimeout(() => {
          setPrintPeriod(null);
        }, 300);
      }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [printPeriod]);

  const currency =
    pharmacy?.currency_code ||
    "XAF";

  const formatMoney = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 0,
      }
    ).format(
      Math.round(value || 0)
    );
  };

  const salesMap = useMemo(() => {
    const map = new Map<
      string,
      Sale
    >();

    sales.forEach((sale) => {
      map.set(sale.id, sale);
    });

    return map;
  }, [sales]);

  const validPayments =
    useMemo(() => {
      return payments.filter(
        (payment) => {
          const sale =
            salesMap.get(
              payment.sale_id
            );

          const status =
            String(
              sale?.status || ""
            ).toLowerCase();

          return (
            status !== "cancelled" &&
            status !== "canceled" &&
            status !== "annulée" &&
            status !== "annulee"
          );
        }
      );
    }, [payments, salesMap]);

  const periodPayments =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return validPayments.filter(
        (payment) => {
          if (
            !isDateInPeriod(
              payment.created_at,
              period
            )
          ) {
            return false;
          }

          if (
            methodFilter !== "all" &&
            payment.method !==
              methodFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const sale =
            salesMap.get(
              payment.sale_id
            );

          const values = [
            payment.id,
            payment.sale_id,
            payment.method,
            sale?.sale_number,
            sale?.customer_name,
            sale?.customer_phone,
          ];

          return values.some(
            (value) =>
              String(value || "")
                .toLowerCase()
                .includes(query)
          );
        }
      );
    }, [
      validPayments,
      period,
      methodFilter,
      search,
      salesMap,
    ]);

  const statistics =
    useMemo(() => {
      const total =
        periodPayments.reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        );

      const count =
        periodPayments.length;

      const average =
        count > 0
          ? total / count
          : 0;

      return {
        total,
        count,
        average,
      };
    }, [periodPayments]);

  const methodStatistics =
    useMemo(() => {
      const map = new Map<
        string,
        {
          method: string;
          amount: number;
          count: number;
        }
      >();

      periodPayments.forEach(
        (payment) => {
          const key =
            payment.method ||
            "other";

          const current =
            map.get(key);

          if (current) {
            current.amount +=
              Number(
                payment.amount ||
                  0
              );

            current.count += 1;
          } else {
            map.set(key, {
              method: key,
              amount: Number(
                payment.amount ||
                  0
              ),
              count: 1,
            });
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          b.amount - a.amount
      );
    }, [periodPayments]);

  const availableMethods =
    useMemo(() => {
      return Array.from(
        new Set(
          validPayments.map(
            (payment) =>
              payment.method
          )
        )
      );
    }, [validPayments]);

  const exportCSV = () => {
    const header = [
      "Paiement",
      "Vente",
      "Date",
      "Client",
      "Téléphone",
      "Mode",
      "Montant",
    ];

    const rows =
      periodPayments.map(
        (payment) => {
          const sale =
            salesMap.get(
              payment.sale_id
            );

          return [
            payment.id,
            sale?.sale_number ||
              payment.sale_id,
            formatDateTime(
              payment.created_at
            ),
            sale?.customer_name ||
              "Client comptoir",
            sale?.customer_phone ||
              "",
            getMethodLabel(
              payment.method
            ),
            Number(
              payment.amount || 0
            ),
          ];
        }
      );

    const escapeCSV = (
      value: unknown
    ) =>
      `"${String(
        value ?? ""
      ).replace(
        /"/g,
        '""'
      )}"`;

    const csv = [
      header
        .map(escapeCSV)
        .join(";"),
      ...rows.map((row) =>
        row
          .map(escapeCSV)
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `pharmaflow-paiements-${period}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  };

  const printPayments = (
    selectedPeriod: Period
  ) => {
    setPrintPeriod(
      selectedPeriod
    );
  };

  if (loading) {
    return (
      <div className="pf-payments-loading">
        <div className="pf-payments-loading-card">
          <div className="pf-payments-spinner" />

          <h2>
            Chargement des paiements
          </h2>

          <p>
            PharmaFlow récupère les
            encaissements de votre
            pharmacie…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pf-payments-error-page">
        <div className="pf-payments-error-card">
          <div className="pf-payments-error-icon">
            !
          </div>

          <h1>
            Impossible de charger
            les paiements
          </h1>

          <p>{error}</p>

          <div className="pf-payments-error-actions">
            <button
              type="button"
              className="pf-payments-btn primary"
              onClick={
                loadPayments
              }
            >
              Réessayer
            </button>

            <button
              type="button"
              className="pf-payments-btn secondary"
              onClick={() =>
                router.push(
                  "/pharmacien"
                )
              }
            >
              Retour au tableau
              de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  const printablePeriod =
    printPeriod || period;

  const printablePayments =
    validPayments.filter(
      (payment) =>
        isDateInPeriod(
          payment.created_at,
          printablePeriod
        )
    );

  const printableTotal =
    printablePayments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.amount || 0
        ),
      0
    );

  const printableAverage =
    printablePayments.length > 0
      ? printableTotal /
        printablePayments.length
      : 0;

  return (
    <>
      <div className="pf-payments-screen">

        {mobileMenuOpen && (
          <button
            type="button"
            className="pf-payments-mobile-overlay"
            onClick={() =>
              setMobileMenuOpen(false)
            }
            aria-label="Fermer le menu"
          />
        )}

        <aside
          className={`pf-payments-sidebar ${
            mobileMenuOpen
              ? "mobile-open"
              : ""
          }`}
        >
          <div className="pf-payments-brand">
            <div className="pf-payments-brand-logo">
              P
            </div>

            <div className="pf-payments-brand-text">
              <strong>
                PharmaFlow
              </strong>

              <span>
                Espace pharmacien
              </span>
            </div>

            <button
              type="button"
              className="pf-payments-sidebar-close"
              onClick={() =>
                setMobileMenuOpen(
                  false
                )
              }
            >
              ×
            </button>
          </div>

          <div className="pf-payments-pharmacy">
            <div className="pf-payments-pharmacy-icon">
              🏥
            </div>

            <div>
              <span>
                MA PHARMACIE
              </span>

              <strong>
                {pharmacy?.name ||
                  "Pharmacie"}
              </strong>

              <small>
                {pharmacy?.city ||
                  "Pharmacie"}
              </small>
            </div>
          </div>

          <nav className="pf-payments-nav">

            <div className="pf-payments-nav-title">
              ESPACE PHARMACIEN
            </div>

            <button
              type="button"
              className="pf-payments-nav-item"
              onClick={() =>
                router.push(
                  "/pharmacien"
                )
              }
            >
              <span className="icon">
                ▦
              </span>
              Tableau de bord
            </button>

            <button
              type="button"
              className="pf-payments-nav-item"
              onClick={() =>
                router.push(
                  "/products"
                )
              }
            >
              <span className="icon">
                ▣
              </span>
              Produits
            </button>

            <button
              type="button"
              className="pf-payments-nav-item"
              onClick={() =>
                router.push(
                  "/stock"
                )
              }
            >
              <span className="icon">
                📦
              </span>
              Stock
            </button>

            <button
              type="button"
              className="pf-payments-nav-item"
              onClick={() =>
                router.push(
                  "/ventes"
                )
              }
            >
              <span className="icon">
                🛒
              </span>
              Ventes
            </button>

            <button
              type="button"
              className="pf-payments-nav-item"
              onClick={() =>
                router.push(
                  "/pharmacien/rapports"
                )
              }
            >
              <span className="icon">
                📊
              </span>
              Rapports
            </button>

            <button
              type="button"
              className="pf-payments-nav-item active"
            >
              <span className="icon">
                💳
              </span>
              Paiements
            </button>

            <div className="pf-payments-nav-title tools">
              OUTILS
            </div>

            <button
              type="button"
              className="pf-payments-nav-item"
              onClick={() =>
                router.push(
                  "/parametres"
                )
              }
            >
              <span className="icon">
                ⚙
              </span>
              Paramètres
            </button>

          </nav>

          <div className="pf-payments-user">
            <div className="pf-payments-user-avatar">
              {(
                profile?.full_name ||
                "P"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="pf-payments-user-info">
              <strong>
                {profile?.full_name ||
                  "Pharmacien"}
              </strong>

              <span>
                Pharmacien
              </span>
            </div>
          </div>
        </aside>

        <main className="pf-payments-main">

          <div className="pf-payments-mobile-header">
            <button
              type="button"
              className="pf-payments-menu-button"
              onClick={() =>
                setMobileMenuOpen(
                  true
                )
              }
            >
              ☰
            </button>

            <div>
              <strong>
                PharmaFlow
              </strong>

              <span>
                Paiements
              </span>
            </div>
          </div>

          <header className="pf-payments-header">
            <div>
              <div className="pf-payments-breadcrumb">
                Pharmacien / Paiements
              </div>

              <h1>
                Paiements
              </h1>

              <p>
                Suivez les encaissements
                enregistrés dans votre
                pharmacie.
              </p>
            </div>

            <div className="pf-payments-header-actions">
              <button
                type="button"
                className="pf-payments-btn secondary"
                onClick={exportCSV}
              >
                ↓ Exporter CSV
              </button>

              <button
                type="button"
                className="pf-payments-btn primary"
                onClick={() =>
                  printPayments(
                    period
                  )
                }
              >
                🖨 Imprimer
              </button>
            </div>
          </header>

          <section className="pf-payments-info-card">
            <div className="pf-payments-info-icon">
              🏥
            </div>

            <div>
              <span>
                PHARMACIE
              </span>

              <strong>
                {pharmacy?.name ||
                  "Pharmacie"}
              </strong>

              <small>
                {pharmacy?.city
                  ? `${pharmacy.city} • `
                  : ""}
                Devise : {currency}
              </small>
            </div>

            <div className="pf-payments-secure">
              🔒 Données sécurisées
            </div>
          </section>

          <section className="pf-payments-period-card">
            <div>
              <span className="pf-payments-kicker">
                PÉRIODE
              </span>

              <h2>
                Encaissements
              </h2>

              <p>
                Consultez les paiements
                selon la période souhaitée.
              </p>
            </div>

            <div className="pf-payments-period-buttons">

              <button
                type="button"
                className={
                  period === "day"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPeriod("day")
                }
              >
                Aujourd’hui
              </button>

              <button
                type="button"
                className={
                  period === "month"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPeriod("month")
                }
              >
                Ce mois
              </button>

              <button
                type="button"
                className={
                  period === "year"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setPeriod("year")
                }
              >
                Cette année
              </button>

            </div>
          </section>

          <section className="pf-payments-stats">

            <div className="pf-payments-stat-card">
              <div className="pf-payments-stat-icon">
                💰
              </div>

              <div>
                <span>
                  Total encaissé
                </span>

                <strong>
                  {formatMoney(
                    statistics.total
                  )}{" "}
                  {currency}
                </strong>

                <small>
                  {getPeriodLabel(
                    period
                  )}
                </small>
              </div>
            </div>

            <div className="pf-payments-stat-card">
              <div className="pf-payments-stat-icon">
                💳
              </div>

              <div>
                <span>
                  Paiements
                </span>

                <strong>
                  {statistics.count}
                </strong>

                <small>
                  transactions
                </small>
              </div>
            </div>

            <div className="pf-payments-stat-card">
              <div className="pf-payments-stat-icon">
                📈
              </div>

              <div>
                <span>
                  Paiement moyen
                </span>

                <strong>
                  {formatMoney(
                    statistics.average
                  )}{" "}
                  {currency}
                </strong>

                <small>
                  par transaction
                </small>
              </div>
            </div>

            <div className="pf-payments-stat-card">
              <div className="pf-payments-stat-icon">
                📅
              </div>

              <div>
                <span>
                  Période
                </span>

                <strong>
                  {getPeriodLabel(
                    period
                  )}
                </strong>

                <small>
                  données disponibles
                </small>
              </div>
            </div>

          </section>

          <section className="pf-payments-methods">

            <div className="pf-payments-panel-title">
              <span className="pf-payments-kicker">
                RÉPARTITION
              </span>

              <h2>
                Modes de paiement
              </h2>
            </div>

            {methodStatistics.length ===
            0 ? (
              <div className="pf-payments-method-empty">
                Aucun paiement pour
                cette période.
              </div>
            ) : (
              <div className="pf-payments-method-grid">
                {methodStatistics.map(
                  (item) => (
                    <div
                      className="pf-payments-method-card"
                      key={item.method}
                    >
                      <div className="pf-payments-method-icon">
                        {getMethodIcon(
                          item.method
                        )}
                      </div>

                      <div>
                        <span>
                          {getMethodLabel(
                            item.method
                          )}
                        </span>

                        <strong>
                          {formatMoney(
                            item.amount
                          )}{" "}
                          {currency}
                        </strong>

                        <small>
                          {item.count}{" "}
                          paiement
                          {item.count !==
                          1
                            ? "s"
                            : ""}
                        </small>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

          </section>

          <section className="pf-payments-search-panel">

            <div>
              <span className="pf-payments-kicker">
                RECHERCHE
              </span>

              <h2>
                Filtrer les paiements
              </h2>
            </div>

            <div className="pf-payments-filters">

              <div className="pf-payments-search">
                <span>
                  ⌕
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Rechercher une vente ou un client..."
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                className="pf-payments-filter"
                value={methodFilter}
                onChange={(event) =>
                  setMethodFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="all">
                  Tous les modes
                </option>

                {availableMethods.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {getMethodLabel(
                        method
                      )}
                    </option>
                  )
                )}
              </select>

            </div>

          </section>

          <section className="pf-payments-table-panel">

            <div className="pf-payments-table-header">

              <div>
                <span className="pf-payments-kicker">
                  HISTORIQUE
                </span>

                <h2>
                  Paiements enregistrés
                </h2>

                <p>
                  {periodPayments.length}{" "}
                  résultat
                  {periodPayments.length !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

              <button
                type="button"
                className="pf-payments-refresh"
                onClick={
                  loadPayments
                }
              >
                ↻ Actualiser
              </button>

            </div>

            {periodPayments.length ===
            0 ? (
              <div className="pf-payments-empty">

                <div className="pf-payments-empty-icon">
                  💳
                </div>

                <h3>
                  Aucun paiement pour
                  cette période
                </h3>

                <p>
                  Les encaissements
                  enregistrés apparaîtront
                  automatiquement ici.
                </p>

              </div>
            ) : (
              <div className="pf-payments-table-wrapper">

                <table className="pf-payments-table">

                  <thead>
                    <tr>
                      <th>
                        Vente
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Client
                      </th>

                      <th>
                        Mode
                      </th>

                      <th>
                        Montant
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {periodPayments.map(
                      (payment) => {
                        const sale =
                          salesMap.get(
                            payment.sale_id
                          );

                        return (
                          <tr
                            key={
                              payment.id
                            }
                          >
                            <td>
                              <strong className="pf-payment-sale-number">
                                {sale
                                  ?.sale_number ||
                                  payment.sale_id}
                              </strong>
                            </td>

                            <td>
                              {formatDateTime(
                                payment.created_at
                              )}
                            </td>

                            <td>
                              <div className="pf-payment-client">
                                <strong>
                                  {sale
                                    ?.customer_name ||
                                    "Client comptoir"}
                                </strong>

                                {sale
                                  ?.customer_phone && (
                                  <small>
                                    {
                                      sale.customer_phone
                                    }
                                  </small>
                                )}
                              </div>
                            </td>

                            <td>
                              <span className="pf-payment-method-badge">
                                {getMethodIcon(
                                  payment.method
                                )}{" "}
                                {getMethodLabel(
                                  payment.method
                                )}
                              </span>
                            </td>

                            <td>
                              <strong className="pf-payment-amount">
                                {formatMoney(
                                  Number(
                                    payment.amount ||
                                      0
                                  )
                                )}{" "}
                                {currency}
                              </strong>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>

                </table>

              </div>
            )}

          </section>

          <section className="pf-payments-print-box">

            <div>
              <span className="pf-payments-kicker">
                IMPRESSION RAPIDE
              </span>

              <h2>
                Imprimer un relevé
              </h2>

              <p>
                Générez un relevé
                professionnel des
                encaissements.
              </p>
            </div>

            <div className="pf-payments-print-buttons">

              <button
                type="button"
                onClick={() =>
                  printPayments(
                    "day"
                  )
                }
              >
                🖨 Quotidien
              </button>

              <button
                type="button"
                onClick={() =>
                  printPayments(
                    "month"
                  )
                }
              >
                🖨 Mensuel
              </button>

              <button
                type="button"
                onClick={() =>
                  printPayments(
                    "year"
                  )
                }
              >
                🖨 Annuel
              </button>

            </div>

          </section>

        </main>
      </div>

      {/* =====================================================
          VERSION IMPRIMABLE
          ===================================================== */}

      <div className="pf-payments-print-page">

        <div className="pf-payments-print-document">

          <header className="pf-payments-print-header">

            <div className="pf-payments-print-brand">

              <div className="pf-payments-print-logo">
                P
              </div>

              <div>
                <h1>
                  PharmaFlow
                </h1>

                <p>
                  Gestion intelligente
                  des pharmacies
                </p>
              </div>

            </div>

            <div className="pf-payments-print-pharmacy">

              <strong>
                {pharmacy?.name ||
                  "Pharmacie"}
              </strong>

              {pharmacy?.address && (
                <span>
                  {pharmacy.address}
                </span>
              )}

              {pharmacy?.city && (
                <span>
                  {pharmacy.city}
                </span>
              )}

            </div>

          </header>

          <div className="pf-payments-print-divider" />

          <section className="pf-payments-print-title">

            <div>
              <span>
                RELEVÉ DES ENCAISSEMENTS
              </span>

              <h2>
                Paiements —{" "}
                {getPeriodLabel(
                  printablePeriod
                )}
              </h2>
            </div>

            <div>
              Généré le{" "}
              {formatDateTime(
                new Date().toISOString()
              )}
            </div>

          </section>

          <section className="pf-payments-print-summary">

            <div>
              <span>
                Paiements
              </span>

              <strong>
                {
                  printablePayments.length
                }
              </strong>
            </div>

            <div>
              <span>
                Total encaissé
              </span>

              <strong>
                {formatMoney(
                  printableTotal
                )}{" "}
                {currency}
              </strong>
            </div>

            <div>
              <span>
                Paiement moyen
              </span>

              <strong>
                {formatMoney(
                  printableAverage
                )}{" "}
                {currency}
              </strong>
            </div>

          </section>

          <section className="pf-payments-print-table-section">

            <h3>
              Détail des paiements
            </h3>

            {printablePayments.length ===
            0 ? (
              <div className="pf-payments-print-empty">
                Aucun paiement enregistré
                pour cette période.
              </div>
            ) : (
              <table>

                <thead>
                  <tr>
                    <th>
                      Vente
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Client
                    </th>

                    <th>
                      Mode
                    </th>

                    <th>
                      Montant
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {printablePayments.map(
                    (payment) => {
                      const sale =
                        salesMap.get(
                          payment.sale_id
                        );

                      return (
                        <tr
                          key={
                            payment.id
                          }
                        >
                          <td>
                            {sale
                              ?.sale_number ||
                              payment.sale_id}
                          </td>

                          <td>
                            {formatDateTime(
                              payment.created_at
                            )}
                          </td>

                          <td>
                            {sale
                              ?.customer_name ||
                              "Client comptoir"}
                          </td>

                          <td>
                            {getMethodLabel(
                              payment.method
                            )}
                          </td>

                          <td>
                            <strong>
                              {formatMoney(
                                Number(
                                  payment.amount ||
                                    0
                                )
                              )}{" "}
                              {currency}
                            </strong>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>

              </table>
            )}

          </section>

          <footer className="pf-payments-print-footer">

            <div>
              <strong>
                PharmaFlow
              </strong>

              <span>
                Relevé généré
                automatiquement
              </span>
            </div>

            <div>
              <span>
                Pharmacie :{" "}
                {pharmacy?.name ||
                  "Pharmacie"}
              </span>

              <span>
                Devise : {currency}
              </span>
            </div>

          </footer>

        </div>

      </div>
    </>
  );
}