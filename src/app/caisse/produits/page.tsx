"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

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
  country_code: string | null;
  currency_code: string | null;
};

type Product = {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  barcode: string | null;
  sku: string | null;
  unit: string;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  expiry_date: string | null;
  is_active: boolean;
};

const supabase = createClient();

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "C";
}

function formatMoney(
  value: number,
  currency: string,
  locale: string,
) {
  return new Intl.NumberFormat(
    locale === "en" ? "en-GB" : "fr-FR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    },
  ).format(Number(value || 0));
}

function formatDate(
  value: string | null,
  locale: string,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

export default function CashierProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const tCommon = useTranslations("common");
  const tNavigation = useTranslations("navigation");
  const tPharmacy = useTranslations("pharmacy");
  const tProducts = useTranslations("products");
  const tStock = useTranslations("stock");
  const tSales = useTranslations("sales");
  const tReports = useTranslations("reports");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "all" | "available" | "low" | "out"
  >("all");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      /*
       * ======================================================
       * AUTHENTIFICATION
       * ======================================================
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      /*
       * ======================================================
       * PROFIL
       * ======================================================
       */

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

      if (
        profileError ||
        !profileData ||
        !profileData.pharmacy_id
      ) {
        router.replace("/login");
        return;
      }

      /*
       * ======================================================
       * PROTECTION DU ROLE
       * ======================================================
       */

      if (profileData.role !== "cashier") {
        switch (profileData.role) {
          case "owner":
            router.replace("/dashboard");
            break;

          case "admin":
            router.replace("/admin");
            break;

          case "pharmacist":
            router.replace("/pharmacien");
            break;

          default:
            router.replace("/employe");
            break;
        }

        return;
      }

      setProfile(profileData as Profile);

      const pharmacyId =
        profileData.pharmacy_id;

      /*
       * ======================================================
       * PHARMACIE + PRODUITS
       * ======================================================
       *
       * Toutes les données sont strictement filtrées
       * avec le pharmacy_id du profil authentifié.
       */

      const [
        pharmacyResponse,
        productsResponse,
      ] = await Promise.all([
        supabase
          .from("pharmacies")
          .select(
            "id, name, city, country_code, currency_code",
          )
          .eq("id", pharmacyId)
          .maybeSingle(),

        supabase
          .from("products")
          .select(
            `
              id,
              name,
              generic_name,
              category,
              barcode,
              sku,
              unit,
              selling_price,
              stock_quantity,
              minimum_stock,
              expiry_date,
              is_active
            `,
          )
          .eq("pharmacy_id", pharmacyId)
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          }),
      ]);

      if (pharmacyResponse.error) {
        throw new Error(
          pharmacyResponse.error.message,
        );
      }

      if (!pharmacyResponse.data) {
        throw new Error(
          tErrors("notFound"),
        );
      }

      if (productsResponse.error) {
        throw new Error(
          productsResponse.error.message,
        );
      }

      setPharmacy(
        pharmacyResponse.data as Pharmacy,
      );

      setProducts(
        (productsResponse.data ||
          []) as Product[],
      );
    } catch (err) {
      console.error(
        "Erreur chargement produits caissier:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : tErrors("load"),
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==========================================================
   * DECONNEXION
   * ==========================================================
   */

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  /*
   * ==========================================================
   * DEVISE
   * ==========================================================
   */

  const currency =
    pharmacy?.currency_code || "XAF";

  /*
   * ==========================================================
   * FILTRAGE
   * ==========================================================
   */

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name
          .toLowerCase()
          .includes(query) ||
        (product.generic_name || "")
          .toLowerCase()
          .includes(query) ||
        (product.category || "")
          .toLowerCase()
          .includes(query) ||
        (product.barcode || "")
          .toLowerCase()
          .includes(query) ||
        (product.sku || "")
          .toLowerCase()
          .includes(query);

      const quantity = Number(
        product.stock_quantity || 0,
      );

      const minimum = Number(
        product.minimum_stock || 0,
      );

      const matchesFilter =
        filter === "all" ||
        (filter === "available" &&
          quantity > minimum) ||
        (filter === "low" &&
          quantity > 0 &&
          quantity <= minimum) ||
        (filter === "out" &&
          quantity <= 0);

      return (
        matchesSearch && matchesFilter
      );
    });
  }, [products, search, filter]);

  /*
   * ==========================================================
   * STATISTIQUES
   * ==========================================================
   */

  const availableCount =
    products.filter((product) => {
      const quantity = Number(
        product.stock_quantity || 0,
      );

      const minimum = Number(
        product.minimum_stock || 0,
      );

      return quantity > minimum;
    }).length;

  const lowCount =
    products.filter((product) => {
      const quantity = Number(
        product.stock_quantity || 0,
      );

      const minimum = Number(
        product.minimum_stock || 0,
      );

      return (
        quantity > 0 &&
        quantity <= minimum
      );
    }).length;

  const outCount =
    products.filter(
      (product) =>
        Number(
          product.stock_quantity || 0,
        ) <= 0,
    ).length;

  /*
   * ==========================================================
   * NAVIGATION
   * ==========================================================
   */

  const navigation = [
    {
      label: tNavigation("dashboard"),
      href: "/caisse",
      icon: "⌂",
    },
    {
      label: tSales("newSale"),
      href: "/ventes",
      icon: "＋",
    },
    {
      label: tNavigation("sales"),
      href: "/ventes",
      icon: "▤",
    },
    {
      label: tNavigation("products"),
      href: "/caisse/produits",
      icon: "▦",
    },
    {
      label: tNavigation("stock"),
      href: "/caisse/stock",
      icon: "▥",
    },
    {
      label: tNavigation("reports"),
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

  /*
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

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

                <p>
                  {tCommon("loading")}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ==========================================================
   * ERREUR
   * ==========================================================
   */

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
                    {tErrors("load")}
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
                  type="button"
                  className="pf-btn pf-btn-primary"
                  onClick={() =>
                    void loadProducts()
                  }
                >
                  {tCommon("refresh")}
                </button>

                <Link
                  href="/caisse"
                  className="pf-btn pf-btn-secondary"
                >
                  {tCommon("back")}
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ==========================================================
   * INTERFACE
   * ==========================================================
   */

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

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

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
              {tNavigation("sales")}
            </div>
          </div>

          <button
            type="button"
            className="pf-mobile-close"
            aria-label={tCommon("close")}
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            ×
          </button>
        </div>

        {/* =================================================
            PHARMACIE
        ================================================== */}

        <div className="pf-pharmacy-card">
          <div className="pf-pharmacy-icon">
            🏥
          </div>

          <div className="pf-pharmacy-info">
            <strong>
              {pharmacy?.name ||
                tPharmacy("pharmacy")}
            </strong>

            <span>
              {pharmacy?.city ||
                tPharmacy("city")}
            </span>
          </div>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================== */}

        <nav className="pf-sidebar-nav">
          <div className="pf-nav-section-title">
            {tNavigation("main")}
          </div>

          {navigation
            .slice(0, 3)
            .map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
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

                <span>{item.label}</span>
              </Link>
            ))}

          <div className="pf-nav-section-title">
            {tNavigation("tools")}
          </div>

          {navigation
            .slice(3, 5)
            .map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
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

                <span>{item.label}</span>

                <span className="pf-nav-readonly">
                  {tCommon("view")}
                </span>
              </Link>
            ))}

          <div className="pf-nav-section-title">
            {tNavigation("analysis")}
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
              {tNavigation("reports")}
            </span>
          </Link>

          <div className="pf-nav-section-title">
            {tNavigation("administration")}
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
              {tNavigation("profile")}
            </span>
          </Link>
        </nav>

        {/* =================================================
            UTILISATEUR
        ================================================== */}

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
              {tAuth("cashier")}
            </span>
          </div>

          <button
            type="button"
            className="pf-logout-button"
            aria-label={tNavigation("logout")}
            onClick={() =>
              void handleLogout()
            }
          >
            ↪
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="pf-main">
        {/* ===================================================
            TOPBAR
        ==================================================== */}

        <header className="pf-topbar">
          <div className="pf-topbar-left">
            <button
              type="button"
              className="pf-mobile-menu"
              aria-label={tCommon("openMenu")}
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              ☰
            </button>

            <div>
              <h1 className="pf-page-title">
                {tProducts("products")}
              </h1>

              <p className="pf-page-subtitle">
                {tProducts("title")}
              </p>
            </div>
          </div>

          <div className="pf-topbar-actions">
            <div className="pf-role-pill">
              <span className="pf-role-dot" />
              {tAuth("cashier")}
            </div>

            <button
              type="button"
              className="pf-btn pf-btn-primary"
              onClick={() =>
                router.push("/ventes")
              }
            >
              ＋ {tSales("newSale")}
            </button>
          </div>
        </header>

        <div className="pf-content">
          <div className="pf-container">

            {/* =================================================
                WELCOME
            ================================================== */}

            <section className="pf-welcome-card">
              <div>
                <div className="pf-welcome-eyebrow">
                  {tProducts("products")}
                </div>

                <h2>
                  {pharmacy?.name ||
                    tPharmacy("pharmacy")}
                </h2>

                <p>
                  {tProducts("title")}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span className="pf-badge pf-badge-success">
                  ✓ {tCommon("view")}
                </span>
              </div>
            </section>

            {/* =================================================
                STATISTIQUES
            ================================================== */}

            <section className="pf-stats-grid">
              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    📦
                  </div>

                  <span className="pf-stat-label">
                    {tProducts("products")}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {products.length}
                </div>

                <div className="pf-stat-description">
                  {tProducts("activeProduct")}
                </div>
              </div>

              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    ✓
                  </div>

                  <span className="pf-stat-label">
                    {tStock("available")}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {availableCount}
                </div>

                <div className="pf-stat-description">
                  {tStock("stockQuantity")}
                </div>
              </div>

              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    ⚠
                  </div>

                  <span className="pf-stat-label">
                    {tStock("lowStock")}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {lowCount}
                </div>

                <div className="pf-stat-description">
                  {tProducts("expiringSoon")}
                </div>
              </div>

              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    !
                  </div>

                  <span className="pf-stat-label">
                    {tStock("outOfStock")}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {outCount}
                </div>

                <div className="pf-stat-description">
                  {tStock("outOfStock")}
                </div>
              </div>
            </section>

            {/* =================================================
                CATALOGUE
            ================================================== */}

            <section className="pf-card">
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">
                    {tProducts("products")}
                  </h2>

                  <p className="pf-card-subtitle">
                    {tCommon("search")}
                  </p>
                </div>
              </div>

              {/* =================================================
                  RECHERCHE + FILTRE
              ================================================== */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 1fr) auto",
                  gap: 12,
                  marginTop: 22,
                }}
              >
                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      fontSize: 15,
                      opacity: 0.55,
                    }}
                  >
                    🔎
                  </span>

                  <input
                    type="search"
                    className="form-input"
                    style={{
                      paddingLeft: 40,
                    }}
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder={
                      locale === "en"
                        ? "Search product, barcode, SKU..."
                        : "Rechercher un produit, code-barres, SKU..."
                    }
                    aria-label={
                      tCommon("search")
                    }
                  />
                </div>

                <select
                  className="form-input"
                  style={{
                    width: "auto",
                    minWidth: 190,
                  }}
                  value={filter}
                  onChange={(event) =>
                    setFilter(
                      event.target.value as
                        | "all"
                        | "available"
                        | "low"
                        | "out",
                    )
                  }
                  aria-label={
                    tCommon("filter")
                  }
                >
                  <option value="all">
                    {tCommon("all")}
                  </option>

                  <option value="available">
                    {tStock("available")}
                  </option>

                  <option value="low">
                    {tStock("lowStock")}
                  </option>

                  <option value="out">
                    {tStock("outOfStock")}
                  </option>
                </select>
              </div>

              {/* =================================================
                  RESULTATS
              ================================================== */}

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span className="pf-badge">
                  {filteredProducts.length}
                </span>

                <span className="pf-badge pf-badge-success">
                  {tCommon("view")}
                </span>
              </div>

              {/* =================================================
                  AUCUN PRODUIT
              ================================================== */}

              {filteredProducts.length === 0 ? (
                <div className="pf-empty-state">
                  <div className="pf-empty-icon">
                    📦
                  </div>

                  <h3>
                    {tProducts("noProducts")}
                  </h3>

                  <p>
                    {tCommon("search")}
                  </p>
                </div>
              ) : (
                /* =================================================
                   TABLE
                ================================================== */

                <div
                  className="pf-table-wrapper"
                  style={{
                    marginTop: 18,
                  }}
                >
                  <table className="pf-table">
                    <thead>
                      <tr>
                        <th>
                          {tProducts("product")}
                        </th>

                        <th>
                          {tProducts("category")}
                        </th>

                        <th>
                          {tProducts(
                            "sellingPrice",
                          )}
                        </th>

                        <th>
                          {tProducts(
                            "stockQuantity",
                          )}
                        </th>

                        <th>
                          {tProducts(
                            "expiryDate",
                          )}
                        </th>

                        <th>
                          {tCommon("status")}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map(
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

                          const stockStatus =
                            quantity <= 0
                              ? "out"
                              : quantity <=
                                  minimum
                                ? "low"
                                : "available";

                          return (
                            <tr
                              key={product.id}
                            >
                              <td>
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    gap: 11,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 11,
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "center",
                                      background:
                                        "#e6f5f2",
                                      fontSize: 17,
                                      flexShrink: 0,
                                    }}
                                  >
                                    💊
                                  </div>

                                  <div>
                                    <strong>
                                      {
                                        product.name
                                      }
                                    </strong>

                                    {product.generic_name && (
                                      <div
                                        style={{
                                          marginTop: 3,
                                          fontSize: 10,
                                          color:
                                            "#64748b",
                                        }}
                                      >
                                        {
                                          product.generic_name
                                        }
                                      </div>
                                    )}

                                    {product.sku && (
                                      <div
                                        style={{
                                          marginTop: 3,
                                          fontSize: 9,
                                          color:
                                            "#94a3b8",
                                        }}
                                      >
                                        SKU:{" "}
                                        {
                                          product.sku
                                        }
                                      </div>
                                    )}

                                    {product.barcode && (
                                      <div
                                        style={{
                                          marginTop: 3,
                                          fontSize: 9,
                                          color:
                                            "#94a3b8",
                                        }}
                                      >
                                        {product.barcode}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td>
                                {product.category ||
                                  "—"}
                              </td>

                              <td>
                                <strong>
                                  {formatMoney(
                                    product.selling_price,
                                    currency,
                                    locale,
                                  )}
                                </strong>

                                <div
                                  style={{
                                    fontSize: 9,
                                    color:
                                      "#94a3b8",
                                    marginTop: 3,
                                  }}
                                >
                                  /{" "}
                                  {product.unit}
                                </div>
                              </td>

                              <td>
                                <span
                                  className={`pf-badge ${
                                    stockStatus ===
                                    "available"
                                      ? "pf-badge-success"
                                      : stockStatus ===
                                          "low"
                                        ? "pf-badge-warning"
                                        : "pf-badge-danger"
                                  }`}
                                >
                                  {quantity}{" "}
                                  {product.unit}
                                </span>
                              </td>

                              <td>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color:
                                      "#475569",
                                  }}
                                >
                                  {formatDate(
                                    product.expiry_date,
                                    locale,
                                  )}
                                </span>
                              </td>

                              <td>
                                <span className="pf-badge pf-badge-success">
                                  {tCommon(
                                    "view",
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
                        {/* =================================================
                INFORMATION SECURITE
            ================================================== */}

            <section className="pf-security-card">
              <div className="pf-security-icon">
                🔐
              </div>

              <div>
                <strong>
                  {locale === "en"
                    ? "Protected catalogue"
                    : "Catalogue protégé"}
                </strong>

                <p>
                  {locale === "en"
                    ? "As a cashier, you can consult products, prices and stock availability. Product creation, editing and deletion are not available from this workspace."
                    : "En tant que caissier, vous pouvez consulter les produits, les prix et les disponibilités. La création, la modification et la suppression des produits ne sont pas disponibles depuis cet espace."}
                </p>
              </div>
            </section>

            {/* =================================================
                RESUME
            ================================================== */}

            <section
              className="pf-card"
              style={{
                marginTop: 18,
              }}
            >
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">
                    {locale === "en"
                      ? "Catalogue overview"
                      : "Résumé du catalogue"}
                  </h2>

                  <p className="pf-card-subtitle">
                    {locale === "en"
                      ? "Current inventory status for your pharmacy."
                      : "État actuel de l'inventaire de votre pharmacie."}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: 14,
                  marginTop: 20,
                }}
              >
                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background:
                      "var(--pf-background)",
                    border:
                      "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        "var(--pf-text-soft)",
                      marginBottom: 6,
                    }}
                  >
                    {tStock("available")}
                  </div>

                  <strong
                    style={{
                      fontSize: 22,
                    }}
                  >
                    {availableCount}
                  </strong>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background:
                      "var(--pf-background)",
                    border:
                      "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        "var(--pf-text-soft)",
                      marginBottom: 6,
                    }}
                  >
                    {tStock("lowStock")}
                  </div>

                  <strong
                    style={{
                      fontSize: 22,
                    }}
                  >
                    {lowCount}
                  </strong>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background:
                      "var(--pf-background)",
                    border:
                      "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        "var(--pf-text-soft)",
                      marginBottom: 6,
                    }}
                  >
                    {tStock("outOfStock")}
                  </div>

                  <strong
                    style={{
                      fontSize: 22,
                    }}
                  >
                    {outCount}
                  </strong>
                </div>
              </div>
            </section>

            {/* =================================================
                ACTION RAPIDE
            ================================================== */}

            <section
              className="pf-card"
              style={{
                marginTop: 18,
              }}
            >
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">
                    {locale === "en"
                      ? "Quick actions"
                      : "Actions rapides"}
                  </h2>

                  <p className="pf-card-subtitle">
                    {locale === "en"
                      ? "Continue your work from the cashier workspace."
                      : "Continuez votre travail depuis votre espace caissier."}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  className="pf-btn pf-btn-primary"
                  onClick={() =>
                    router.push("/ventes")
                  }
                  style={{
                    minHeight: 52,
                  }}
                >
                  ＋ {tSales("newSale")}
                </button>

                <Link
                  href="/caisse/stock"
                  className="pf-btn pf-btn-secondary"
                  style={{
                    minHeight: 52,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  📦 {tNavigation("stock")}
                </Link>

                <Link
                  href="/caisse/rapports"
                  className="pf-btn pf-btn-secondary"
                  style={{
                    minHeight: 52,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  📊 {tReports("title")}
                </Link>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}