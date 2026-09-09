"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { createClient } from "../../lib/supabase/client";

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
  city: string | null;
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

type SaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  product_name: string;
};

const supabase = createClient();

function formatMoney(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase(),
      )
      .join("") || "C"
  );
}

function getRoleHome(role: string) {
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

function getStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Terminée";

    case "cancelled":
      return "Annulée";

    case "pending":
      return "En attente";

    default:
      return status || "Inconnu";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "completed":
      return "pf-badge pf-badge-success";

    case "cancelled":
      return "pf-badge pf-badge-danger";

    default:
      return "pf-badge pf-badge-warning";
  }
}

function startOfToday() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date;
}

export default function CashierSalesPage() {
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

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [dateFilter, setDateFilter] =
    useState("all");

  const [selectedSale, setSelectedSale] =
    useState<Sale | null>(null);

  const [selectedItems, setSelectedItems] =
    useState<SaleItem[]>([]);

  const [loadingItems, setLoadingItems] =
    useState(false);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const loadSales = useCallback(
    async () => {
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
          data: profileRows,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, phone, role, pharmacy_id",
          )
          .eq("id", user.id)
          .limit(1);

        if (profileError) {
          throw new Error(
            profileError.message,
          );
        }

        const profileData =
          profileRows?.[0];

        if (!profileData) {
          throw new Error(
            "Profil utilisateur introuvable.",
          );
        }

        if (
          profileData.role !== "cashier"
        ) {
          router.replace(
            getRoleHome(
              profileData.role,
            ),
          );
          return;
        }

        if (!profileData.pharmacy_id) {
          throw new Error(
            "Votre compte n'est associé à aucune pharmacie.",
          );
        }

        setProfile(
          profileData as Profile,
        );

        const [
          pharmacyResponse,
          salesResponse,
        ] = await Promise.all([
          supabase
            .from("pharmacies")
            .select(
              "id, name, city, currency_code",
            )
            .eq(
              "id",
              profileData.pharmacy_id,
            )
            .limit(1),

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
              `,
            )
            .eq(
              "pharmacy_id",
              profileData.pharmacy_id,
            )
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(200),
        ]);

        if (pharmacyResponse.error) {
          throw new Error(
            pharmacyResponse.error.message,
          );
        }

        if (salesResponse.error) {
          throw new Error(
            salesResponse.error.message,
          );
        }

        const pharmacyData =
          pharmacyResponse.data?.[0];

        if (!pharmacyData) {
          throw new Error(
            "Pharmacie introuvable.",
          );
        }

        setPharmacy(
          pharmacyData as Pharmacy,
        );

        setSales(
          (salesResponse.data ||
            []) as Sale[],
        );
      } catch (err) {
        console.error(
          "CAISSIER VENTES:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger vos ventes.",
        );
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  async function openSale(
    sale: Sale,
  ) {
    setSelectedSale(sale);
    setSelectedItems([]);
    setLoadingItems(true);

    try {
      const {
        data: items,
        error: itemsError,
      } = await supabase
        .from("sale_items")
        .select(
          `
            id,
            product_id,
            quantity,
            unit_price,
            discount,
            total,
            products (
              name
            )
          `,
        )
        .eq("sale_id", sale.id)
        .order("created_at", {
          ascending: true,
        });

      if (itemsError) {
        throw new Error(
          itemsError.message,
        );
      }

      const formattedItems =
        (items || []).map(
          (item: any) => ({
            id: item.id,
            product_id:
              item.product_id,
            quantity: Number(
              item.quantity,
            ),
            unit_price: Number(
              item.unit_price,
            ),
            discount: Number(
              item.discount || 0,
            ),
            total: Number(
              item.total || 0,
            ),
            product_name:
              item.products?.name ||
              "Produit",
          }),
        );

      setSelectedItems(
        formattedItems,
      );
    } catch (err) {
      console.error(
        "SALE ITEMS:",
        err,
      );

      setSelectedItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  const currency =
    pharmacy?.currency_code || "XAF";

  const today = useMemo(
    () =>
      sales.filter((sale) => {
        const date = new Date(
          sale.created_at,
        );

        return (
          date >= startOfToday() &&
          sale.status !== "cancelled"
        );
      }),
    [sales],
  );

  const todayRevenue =
    today.reduce(
      (total, sale) =>
        total +
        Number(sale.total || 0),
      0,
    );

  const completedSales =
    sales.filter(
      (sale) =>
        sale.status === "completed",
    );

  const totalRevenue =
    completedSales.reduce(
      (total, sale) =>
        total +
        Number(sale.total || 0),
      0,
    );

  const averageBasket =
    completedSales.length
      ? totalRevenue /
        completedSales.length
      : 0;

  const filteredSales = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    const now = new Date();

    return sales.filter((sale) => {
      const matchesSearch =
        !query ||
        sale.sale_number
          .toLowerCase()
          .includes(query) ||
        (
          sale.customer_name || ""
        )
          .toLowerCase()
          .includes(query) ||
        (
          sale.customer_phone || ""
        )
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        sale.status === statusFilter;

      const date = new Date(
        sale.created_at,
      );

      let matchesDate = true;

      if (dateFilter === "today") {
        matchesDate =
          date >= startOfToday();
      }

      if (dateFilter === "week") {
        const start = new Date(now);

        const day = start.getDay();

        const diff =
          day === 0 ? 6 : day - 1;

        start.setDate(
          start.getDate() - diff,
        );

        start.setHours(
          0,
          0,
          0,
          0,
        );

        matchesDate =
          date >= start;
      }

      if (dateFilter === "month") {
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        );

        matchesDate =
          date >= start;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    sales,
    search,
    statusFilter,
    dateFilter,
  ]);

  const isActive = (
    href: string,
  ) => {
    if (href === "/caisse") {
      return pathname === "/caisse";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  function printSale() {
    window.print();
  }

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
                <div className="pf-loading">
                  <div className="pf-spinner" />

                  <p>
                    Chargement de vos ventes...
                  </p>
                </div>
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
                      Impossible de charger vos ventes
                    </strong>

                    <p>
                      {error}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    className="pf-btn pf-btn-primary"
                    onClick={
                      loadSales
                    }
                  >
                    ↻ Réessayer
                  </button>

                  <button
                    type="button"
                    className="pf-btn pf-btn-secondary"
                    onClick={logout}
                  >
                    Se déconnecter
                  </button>
                </div>
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

      {/* SIDEBAR */}

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
              Poste de caisse
            </div>
          </div>

          <button
            type="button"
            className="pf-mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Fermer le menu"
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
                "Ma pharmacie"}
            </strong>

            <span>
              {pharmacy?.city ||
                "Pharmacie"}
            </span>

          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="pf-sidebar-nav">

          <div className="pf-nav-section-title">
            ESPACE CAISSIER
          </div>

          <Link
            href="/caisse"
            className={`pf-nav-item ${
              isActive("/caisse")
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span className="pf-nav-icon">
              ⌂
            </span>

            <span>
              Tableau de bord
            </span>
          </Link>

          <Link
            href="/ventes"
            className="pf-nav-item"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span className="pf-nav-icon">
              ＋
            </span>

            <span>
              Nouvelle vente
            </span>
          </Link>

          <Link
            href="/caisse/ventes"
            className={`pf-nav-item ${
              isActive(
                "/caisse/ventes",
              )
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span className="pf-nav-icon">
              ▤
            </span>

            <span>
              Mes ventes
            </span>
          </Link>

          <div className="pf-nav-section-title">
            CONSULTATION
          </div>

          <Link
            href="/caisse/produits"
            className={`pf-nav-item ${
              isActive(
                "/caisse/produits",
              )
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span className="pf-nav-icon">
              ▦
            </span>

            <span>
              Produits
            </span>

            <span className="pf-nav-readonly">
              Lecture
            </span>
          </Link>

          <Link
            href="/caisse/stock"
            className={`pf-nav-item ${
              isActive(
                "/caisse/stock",
              )
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <span className="pf-nav-icon">
              ▥
            </span>

            <span>
              Stock
            </span>

            <span className="pf-nav-readonly">
              Lecture
            </span>
          </Link>

          <div className="pf-nav-section-title">
            ANALYSE
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
              Rapports
            </span>
          </Link>

          <div className="pf-nav-section-title">
            COMPTE
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
              Mon profil
            </span>
          </Link>

        </nav>

        {/* UTILISATEUR */}

        <div className="pf-sidebar-user">

          <div className="pf-user-avatar">
            {getInitials(
              profile?.full_name ||
                "Caissier",
            )}
          </div>

          <div className="pf-user-info">

            <strong>
              {profile?.full_name ||
                "Caissier"}
            </strong>

            <span>
              Caissier
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

      {/* MAIN */}

      <main className="pf-main">

        <header className="pf-topbar">

          <div className="pf-topbar-left">

            <button
              type="button"
              className="pf-mobile-menu"
              onClick={() =>
                setSidebarOpen(true)
              }
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>

            <div>

              <h1 className="pf-page-title">
                Mes ventes
              </h1>

              <p className="pf-page-subtitle">
                Historique des transactions
                enregistrées depuis votre
                poste de caisse.
              </p>

            </div>

          </div>

          <div className="pf-topbar-actions">

            <div className="pf-role-pill">
              <span className="pf-role-dot" />
              CAISSIER
            </div>

            <Link
              href="/ventes"
              className="pf-btn pf-btn-primary"
            >
              ＋ Nouvelle vente
            </Link>

          </div>

        </header>

        <div className="pf-content">

          <div className="pf-container">

            {/* ACTIVITÉ */}

            <section className="pf-card">

              <div className="pf-card-header">

                <div>

                  <div
                    style={{
                      fontSize:
                        "12px",
                      fontWeight: 700,
                      color: "#0f766e",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.08em",
                      marginBottom:
                        "5px",
                    }}
                  >
                    ACTIVITÉ
                  </div>

                  <h2 className="pf-card-title">
                    Mes ventes récentes
                  </h2>

                  <p className="pf-card-subtitle">
                    Seules les ventes
                    effectuées avec votre
                    compte sont affichées.
                  </p>

                </div>

                <div className="pf-readonly-badge">
                  🔐 Données personnelles
                </div>

              </div>

              {/* STATISTIQUES */}

              <div
                className="pf-stats-grid"
                style={{
                  marginTop: "18px",
                }}
              >

                <div className="pf-stat-card">

                  <div className="pf-stat-top">

                    <div className="pf-stat-icon">
                      🧾
                    </div>

                    <span className="pf-stat-label">
                      AUJOURD'HUI
                    </span>

                  </div>

                  <div className="pf-stat-value">
                    {today.length}
                  </div>

                  <div className="pf-stat-description">
                    ventes
                  </div>

                </div>

                <div className="pf-stat-card">

                  <div className="pf-stat-top">

                    <div className="pf-stat-icon">
                      💰
                    </div>

                    <span className="pf-stat-label">
                      CA DU JOUR
                    </span>

                  </div>

                  <div className="pf-stat-value pf-stat-money">
                    {formatMoney(
                      todayRevenue,
                      currency,
                    )}
                  </div>

                  <div className="pf-stat-description">
                    chiffre d'affaires
                  </div>

                </div>

                <div className="pf-stat-card">

                  <div className="pf-stat-top">

                    <div className="pf-stat-icon">
                      📊
                    </div>

                    <span className="pf-stat-label">
                      TOTAL VENTES
                    </span>

                  </div>

                  <div className="pf-stat-value">
                    {completedSales.length}
                  </div>

                  <div className="pf-stat-description">
                    transactions terminées
                  </div>

                </div>

                <div className="pf-stat-card">

                  <div className="pf-stat-top">

                    <div className="pf-stat-icon">
                      🛍️
                    </div>

                    <span className="pf-stat-label">
                      PANIER MOYEN
                    </span>

                  </div>

                  <div className="pf-stat-value pf-stat-money">
                    {formatMoney(
                      averageBasket,
                      currency,
                    )}
                  </div>

                  <div className="pf-stat-description">
                    par vente
                  </div>

                </div>

              </div>

            </section>

            {/* FILTRES */}

            <section
              className="pf-card"
              style={{
                marginTop: "18px",
              }}
            >

              <div className="pf-toolbar">

                <div className="pf-search">

                  <span>
                    🔎
                  </span>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Rechercher une vente, un client ou un téléphone..."
                  />

                </div>

                <select
                  className="pf-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value,
                    )
                  }
                >

                  <option value="all">
                    Tous les statuts
                  </option>

                  <option value="completed">
                    Terminées
                  </option>

                  <option value="pending">
                    En attente
                  </option>

                  <option value="cancelled">
                    Annulées
                  </option>

                </select>

                <select
                  className="pf-filter"
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(
                      event.target.value,
                    )
                  }
                >

                  <option value="all">
                    Toutes les dates
                  </option>

                  <option value="today">
                    Aujourd'hui
                  </option>

                  <option value="week">
                    Cette semaine
                  </option>

                  <option value="month">
                    Ce mois
                  </option>

                </select>

              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >

                <strong>
                  {filteredSales.length}{" "}
                  vente
                  {filteredSales.length > 1
                    ? "s"
                    : ""}
                </strong>

                <span
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  {pharmacy?.name}
                </span>

              </div>

              {/* LISTE */}

              {filteredSales.length === 0 ? (

                <div className="pf-empty-state">

                  <div className="pf-empty-icon">
                    🧾
                  </div>

                  <h3>
                    Aucune vente trouvée
                  </h3>

                  <p>
                    Aucune transaction ne
                    correspond aux critères
                    sélectionnés.
                  </p>

                  <Link
                    href="/ventes"
                    className="pf-btn pf-btn-primary"
                  >
                    ＋ Nouvelle vente
                  </Link>

                </div>

              ) : (

                <div className="pf-table-wrapper">

                  <table className="pf-table">

                    <thead>

                      <tr>

                        <th>
                          Vente
                        </th>

                        <th>
                          Client
                        </th>

                        <th>
                          Date
                        </th>

                        <th>
                          Statut
                        </th>

                        <th className="text-right">
                          Total
                        </th>

                        <th>
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {filteredSales.map(
                        (sale) => (

                          <tr key={sale.id}>

                            <td>
                              <strong>
                                {
                                  sale.sale_number
                                }
                              </strong>
                            </td>

                            <td>

                              <div>
                                {sale.customer_name ||
                                  "Client comptoir"}
                              </div>

                              {sale.customer_phone && (
                                <div
                                  style={{
                                    fontSize:
                                      "11px",
                                    color:
                                      "#94a3b8",
                                    marginTop:
                                      "2px",
                                  }}
                                >
                                  {
                                    sale.customer_phone
                                  }
                                </div>
                              )}

                            </td>

                            <td>
                              {formatDate(
                                sale.created_at,
                              )}
                            </td>

                            <td>

                              <span
                                className={getStatusClass(
                                  sale.status,
                                )}
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
                                    sale.total,
                                  ),
                                  currency,
                                )}
                              </strong>

                            </td>

                            <td>

                              <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                onClick={() =>
                                  openSale(
                                    sale,
                                  )
                                }
                              >
                                Voir
                              </button>

                            </td>

                          </tr>

                        ),
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

            {/* SÉCURITÉ */}

            <section
              className="pf-security-card"
              style={{
                marginTop: "18px",
              }}
            >

              <div className="pf-security-icon">
                🔐
              </div>

              <div>

                <strong>
                  Vos données de caisse sont
                  protégées
                </strong>

                <p>
                  Cette page affiche uniquement
                  les transactions enregistrées
                  avec votre compte caissier et
                  dans votre pharmacie.
                </p>

              </div>

            </section>

          </div>

        </div>

      </main>

      {/* MODALE DÉTAIL */}

      {selectedSale && (

        <div
          className="pf-modal-overlay"
          onClick={() =>
            setSelectedSale(null)
          }
        >

          <div
            className="pf-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="pf-modal-header">

              <div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#0f766e",
                    fontWeight: 800,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.08em",
                  }}
                >
                  DÉTAIL DE LA VENTE
                </div>

                <h2>
                  {selectedSale.sale_number}
                </h2>

              </div>

              <button
                type="button"
                className="pf-modal-close"
                onClick={() =>
                  setSelectedSale(null)
                }
                aria-label="Fermer"
              >
                ×
              </button>

            </div>

            <div className="pf-modal-body">

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                  marginBottom:
                    "20px",
                }}
              >

                <div className="pf-info-card">

                  <span>
                    Client
                  </span>

                  <strong>
                    {selectedSale.customer_name ||
                      "Client comptoir"}
                  </strong>

                </div>

                <div className="pf-info-card">

                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(
                      selectedSale.created_at,
                    )}
                  </strong>

                </div>

              </div>

              <h3
                style={{
                  fontSize: "15px",
                  marginBottom: "12px",
                }}
              >
                Articles
              </h3>

              {loadingItems ? (

                <div className="pf-loading">

                  <div className="pf-spinner" />

                  <p>
                    Chargement des articles...
                  </p>

                </div>

              ) : selectedItems.length ===
                0 ? (

                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  Aucun article détaillé
                  disponible.
                </div>

              ) : (

                <div className="pf-table-wrapper">

                  <table className="pf-table">

                    <thead>

                      <tr>

                        <th>
                          Produit
                        </th>

                        <th>
                          Qté
                        </th>

                        <th>
                          Prix
                        </th>

                        <th className="text-right">
                          Total
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {selectedItems.map(
                        (item) => (

                          <tr key={item.id}>

                            <td>
                              <strong>
                                {
                                  item.product_name
                                }
                              </strong>
                            </td>

                            <td>
                              {item.quantity}
                            </td>

                            <td>
                              {formatMoney(
                                item.unit_price,
                                currency,
                              )}
                            </td>

                            <td className="text-right">
                              <strong>
                                {formatMoney(
                                  item.total,
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

              {/* TOTAL */}

              <div
                style={{
                  marginTop: "18px",
                  borderTop:
                    "1px solid #e2e8f0",
                  paddingTop: "15px",
                }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: "8px",
                  }}
                >

                  <span>
                    Sous-total
                  </span>

                  <strong>
                    {formatMoney(
                      Number(
                        selectedSale.subtotal,
                      ),
                      currency,
                    )}
                  </strong>

                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: "8px",
                  }}
                >

                  <span>
                    Remise
                  </span>

                  <strong>
                    -
                    {formatMoney(
                      Number(
                        selectedSale.discount ||
                          0,
                      ),
                      currency,
                    )}
                  </strong>

                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginBottom: "8px",
                  }}
                >

                  <span>
                    Taxe
                  </span>

                  <strong>
                    {formatMoney(
                      Number(
                        selectedSale.tax ||
                          0,
                      ),
                      currency,
                    )}
                  </strong>

                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop:
                      "1px solid #e2e8f0",
                    fontSize: "18px",
                  }}
                >

                  <strong>
                    TOTAL
                  </strong>

                  <strong
                    style={{
                      color: "#0f766e",
                    }}
                  >
                    {formatMoney(
                      Number(
                        selectedSale.total,
                      ),
                      currency,
                    )}
                  </strong>

                </div>

              </div>

            </div>

            <div className="pf-modal-footer">

              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={() =>
                  setSelectedSale(null)
                }
              >
                Fermer
              </button>

              <button
                type="button"
                className="pf-btn pf-btn-primary"
                onClick={printSale}
              >
                🖨️ Imprimer
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}