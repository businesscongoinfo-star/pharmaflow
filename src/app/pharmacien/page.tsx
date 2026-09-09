"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

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

type Movement = {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  reason: string | null;
  reference: string | null;
  created_at: string;
};

const supabase = createClient();

function formatMoney(
  value: number,
  currency = "XAF",
) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Non renseignée";
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase(),
      )
      .join("") || "P"
  );
}

function getFirstName(
  name: string | null,
) {
  if (!name) {
    return "Pharmacien";
  }

  return (
    name.trim().split(/\s+/)[0] ||
    "Pharmacien"
  );
}

function getPeriodStart(
  period: "day" | "week" | "month",
) {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  if (period === "day") {
    return date;
  }

  if (period === "month") {
    date.setDate(1);
    return date;
  }

  const day = date.getDay();

  const difference =
    day === 0 ? 6 : day - 1;

  date.setDate(
    date.getDate() - difference,
  );

  return date;
}

function getDaysUntilExpiry(
  expiryDate: string | null,
) {
  if (!expiryDate) {
    return null;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const expiry = new Date(
    `${expiryDate}T00:00:00`,
  );

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  return Math.ceil(
    (expiry.getTime() -
      today.getTime()) /
      86400000,
  );
}

function isCancelled(
  status: string,
) {
  return [
    "cancelled",
    "canceled",
    "annulled",
    "void",
    "annulée",
    "annulee",
  ].includes(
    String(status)
      .trim()
      .toLowerCase(),
  );
}

function getSaleStatusLabel(
  status: string,
) {
  const normalized =
    String(status)
      .trim()
      .toLowerCase();

  if (normalized === "completed") {
    return "Terminée";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "annulled" ||
    normalized === "void" ||
    normalized === "annulée" ||
    normalized === "annulee"
  ) {
    return "Annulée";
  }

  if (normalized === "pending") {
    return "En attente";
  }

  return status || "Inconnu";
}

function getMovementLabel(
  type: string,
) {
  const normalized =
    String(type)
      .trim()
      .toLowerCase();

  if (
    normalized === "entry" ||
    normalized === "purchase" ||
    normalized === "in"
  ) {
    return "Entrée";
  }

  if (
    normalized === "exit" ||
    normalized === "sale" ||
    normalized === "out"
  ) {
    return "Sortie";
  }

  if (
    normalized === "adjustment" ||
    normalized === "adjust"
  ) {
    return "Ajustement";
  }

  return type || "Mouvement";
}

function isEntryMovement(
  type: string,
) {
  const normalized =
    String(type)
      .trim()
      .toLowerCase();

  return [
    "entry",
    "purchase",
    "in",
  ].includes(normalized);
}

export default function PharmacienPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [movements, setMovements] =
    useState<Movement[]>([]);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const loadDashboard =
    useCallback(
      async (
        refresh = false,
      ) => {
        try {
          if (refresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          /* ============================
             AUTHENTIFICATION
             ============================ */

          const {
            data: authData,
            error: authError,
          } =
            await supabase.auth.getUser();

          if (
            authError ||
            !authData.user
          ) {
            router.replace("/login");
            return;
          }

          const user =
            authData.user;

          /* ============================
             PROFIL
             ============================ */

          const {
            data: profileData,
            error: profileError,
          } =
            await supabase
              .from("profiles")
              .select(
                "id, full_name, phone, role, pharmacy_id",
              )
              .eq(
                "id",
                user.id,
              )
              .maybeSingle();

          if (profileError) {
            throw new Error(
              `Profil : ${profileError.message}`,
            );
          }

          if (!profileData) {
            throw new Error(
              "Profil : votre profil utilisateur est introuvable.",
            );
          }

          const current =
            profileData as Profile;

          /* ============================
             CONTRÔLE DU RÔLE
             ============================ */

          if (
            current.role !==
            "pharmacist"
          ) {
            const roleRoutes: Record<
              string,
              string
            > = {
              owner: "/dashboard",
              admin: "/admin",
              cashier: "/caisse",
              employee: "/employe",
            };

            router.replace(
              roleRoutes[
                current.role
              ] || "/login",
            );

            return;
          }

          if (!current.pharmacy_id) {
            throw new Error(
              "Profil : aucune pharmacie n'est associée à ce compte.",
            );
          }

          setProfile(current);

          const pharmacyId =
            current.pharmacy_id;

          /* ============================
             REQUÊTES
             ============================ */

          const pharmacyPromise =
            supabase
              .from("pharmacies")
              .select(
                "id, name, address, country_code, city, currency_code, status",
              )
              .eq(
                "id",
                pharmacyId,
              )
              .maybeSingle();

          const productsPromise =
            supabase
              .from("products")
              .select(
                "id, name, generic_name, category, unit, selling_price, stock_quantity, minimum_stock, expiry_date, is_active",
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
              )
              .limit(2000);

          const monthStart =
            getPeriodStart(
              "month",
            );

          const salesPromise =
            supabase
              .from("sales")
              .select(
                "id, sale_number, subtotal, discount, tax, total, status, customer_name, customer_phone, created_at",
              )
              .eq(
                "pharmacy_id",
                pharmacyId,
              )
              .gte(
                "created_at",
                monthStart.toISOString(),
              )
              .order(
                "created_at",
                {
                  ascending: false,
                },
              )
              .limit(2000);

          const movementsPromise =
            supabase
              .from(
                "stock_movements",
              )
              .select(
                "id, product_id, type, quantity, reason, reference, created_at",
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
              .limit(100);

          const [
            pharmacyResult,
            productsResult,
            salesResult,
            movementsResult,
          ] =
            await Promise.all([
              pharmacyPromise,
              productsPromise,
              salesPromise,
              movementsPromise,
            ]);

          /* ============================
             VÉRIFICATIONS
             ============================ */

          if (
            pharmacyResult.error
          ) {
            throw new Error(
              `Pharmacie : ${pharmacyResult.error.message}`,
            );
          }

          if (
            !pharmacyResult.data
          ) {
            throw new Error(
              "Pharmacie : aucune pharmacie associée à ce compte.",
            );
          }

          if (
            productsResult.error
          ) {
            throw new Error(
              `Produits : ${productsResult.error.message}`,
            );
          }

          if (
            salesResult.error
          ) {
            throw new Error(
              `Ventes : ${salesResult.error.message}`,
            );
          }

          if (
            movementsResult.error
          ) {
            throw new Error(
              `Stock : ${movementsResult.error.message}`,
            );
          }

          /* ============================
             ENREGISTREMENT DES DONNÉES
             ============================ */

          setPharmacy(
            pharmacyResult.data as Pharmacy,
          );

          setProducts(
            (productsResult.data ||
              []) as Product[],
          );

          setSales(
            (salesResult.data ||
              []) as Sale[],
          );

          setMovements(
            (movementsResult.data ||
              []) as Movement[],
          );
        } catch (err) {
          console.error(
            "PharmaFlow pharmacist dashboard:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger l'espace pharmacien.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [router],
    );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ================================
     DONNÉES UTILISATEUR
     ================================ */

  const currency =
    pharmacy?.currency_code ||
    "XAF";

  const firstName =
    getFirstName(
      profile?.full_name,
    );

  const initials =
    getInitials(
      profile?.full_name ||
        "Pharmacien",
    );

  /* ================================
     DATES
     ================================ */

  const todayStart =
    useMemo(
      () => getPeriodStart("day"),
      [],
    );

  const weekStart =
    useMemo(
      () => getPeriodStart("week"),
      [],
    );

  const monthStart =
    useMemo(
      () => getPeriodStart("month"),
      [],
    );

  /* ================================
     VENTES VALIDÉES
     ================================ */

  const validSales =
    useMemo(
      () =>
        sales.filter(
          (sale) =>
            !isCancelled(
              sale.status,
            ),
        ),
      [sales],
    );

  const todaySales =
    useMemo(
      () =>
        validSales.filter(
          (sale) =>
            new Date(
              sale.created_at,
            ) >= todayStart,
        ),
      [
        validSales,
        todayStart,
      ],
    );

  const weekSales =
    useMemo(
      () =>
        validSales.filter(
          (sale) =>
            new Date(
              sale.created_at,
            ) >= weekStart,
        ),
      [
        validSales,
        weekStart,
      ],
    );

  const monthSales =
    useMemo(
      () =>
        validSales.filter(
          (sale) =>
            new Date(
              sale.created_at,
            ) >= monthStart,
        ),
      [
        validSales,
        monthStart,
      ],
    );

  /* ================================
     CHIFFRE D'AFFAIRES
     ================================ */

  const getRevenue =
    useCallback(
      (list: Sale[]) =>
        list.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.total || 0,
            ),
          0,
        ),
      [],
    );

  const todayRevenue =
    getRevenue(todaySales);

  const weekRevenue =
    getRevenue(weekSales);

  const monthRevenue =
    getRevenue(monthSales);

  const averageBasket =
    todaySales.length > 0
      ? todayRevenue /
        todaySales.length
      : 0;

  /* ================================
     STOCK FAIBLE
     ================================ */

  const lowStock =
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

  /* ================================
     RUPTURE
     ================================ */

  const outOfStock =
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

  /* ================================
     PRODUITS EXPIRÉS
     ================================ */

  const expired =
    useMemo(
      () =>
        products.filter(
          (product) => {
            const days =
              getDaysUntilExpiry(
                product.expiry_date,
              );

            return (
              days !== null &&
              days < 0
            );
          },
        ),
      [products],
    );

  /* ================================
     EXPIRATION PROCHAINE
     ================================ */

  const expiringSoon =
    useMemo(
      () =>
        products.filter(
          (product) => {
            const days =
              getDaysUntilExpiry(
                product.expiry_date,
              );

            return (
              days !== null &&
              days >= 0 &&
              days <= 90
            );
          },
        ),
      [products],
    );

  /* ================================
     STOCK TOTAL
     ================================ */

  const totalUnits =
    useMemo(
      () =>
        products.reduce(
          (sum, product) =>
            sum +
            Number(
              product.stock_quantity ||
                0,
            ),
          0,
        ),
      [products],
    );

  /* ================================
     VALEUR DU STOCK
     ================================ */

  const totalStockValue =
    useMemo(
      () =>
        products.reduce(
          (sum, product) =>
            sum +
            Number(
              product.stock_quantity ||
                0,
            ) *
              Number(
                product.selling_price ||
                  0,
              ),
          0,
        ),
      [products],
    );

  /* ================================
     DERNIÈRES VENTES
     ================================ */

  const recentSales =
    sales.slice(0, 8);

  /* ================================
     PRODUITS POUR MOUVEMENTS
     ================================ */

  const productMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      products.forEach(
        (product) => {
          map.set(
            product.id,
            product.name,
          );
        },
      );

      return map;
    }, [products]);

  const recentMovements =
    movements.slice(0, 8);

  /* ================================
     NAVIGATION
     ================================ */

  const go = (
    path: string,
  ) => {
    setSidebarOpen(false);
    router.push(path);
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  /* ================================
     CHARGEMENT
     ================================ */

  if (loading) {
    return (
      <div className="pf-app pf-pharmacien-app">

        <aside className="pf-sidebar pf-pharmacien-sidebar">

          <div className="pf-sidebar-brand">

            <div className="pf-logo-mark">
              P
            </div>

            <div>
              <div className="pf-brand-name">
                PharmaFlow
              </div>

              <div className="pf-brand-subtitle">
                Espace pharmacien
              </div>
            </div>

          </div>

          <div className="pf-pharmacien-loading">

            <div className="pf-spinner" />

            <strong>
              Chargement...
            </strong>

            <span>
              Connexion sécurisée à votre pharmacie.
            </span>

          </div>

        </aside>

        <main className="pf-main">

          <div className="pf-content">

            <div className="pf-container">

              <div className="pf-pharmacien-skeleton">

                <div className="pf-skeleton-card pf-skeleton-wide" />

                <div className="pf-skeleton-grid">

                  <div className="pf-skeleton-card" />

                  <div className="pf-skeleton-card" />

                  <div className="pf-skeleton-card" />

                  <div className="pf-skeleton-card" />

                </div>

                <div className="pf-skeleton-card pf-skeleton-large" />

              </div>

            </div>

          </div>

        </main>

      </div>
    );
  }

  /* ================================
     ERREUR
     ================================ */

  if (error) {
    return (
      <div className="pf-app pf-pharmacien-app">

        <main className="pf-main pf-main-full">

          <div className="pf-content">

            <div className="pf-container">

              <div className="pf-pharmacien-error">

                <div className="pf-pharmacien-error-icon">
                  !
                </div>

                <div>

                  <span className="pf-section-kicker">
                    PHARMAFLOW
                  </span>

                  <h1>
                    Impossible de charger l’espace pharmacien
                  </h1>

                  <p>
                    {error}
                  </p>

                </div>

              </div>

              <div className="pf-pharmacien-error-actions">

                <button
                  type="button"
                  className="pf-btn pf-btn-primary"
                  onClick={() =>
                    loadDashboard()
                  }
                >
                  ↻ Réessayer
                </button>

                <button
                  type="button"
                  className="pf-btn pf-btn-secondary"
                  onClick={
                    handleLogout
                  }
                >
                  ↪ Se déconnecter
                </button>

              </div>

            </div>

          </div>

        </main>

      </div>
    );
  }

  /* ================================
     DASHBOARD
     ================================ */

  return (
    <div className="pf-app pf-pharmacien-app">

      {sidebarOpen && (
        <button
          type="button"
          className="pf-mobile-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
          aria-label="Fermer le menu"
        />
      )}

      {/* ==============================
          SIDEBAR
          ============================== */}

      <aside
        className={`pf-sidebar pf-pharmacien-sidebar ${
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
              Espace pharmacien
            </div>
          </div>

          <button
            type="button"
            className="pf-pharmacien-sidebar-close"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Fermer le menu"
          >
            ×
          </button>

        </div>

        {/* PHARMACIE */}

        <div className="pf-pharmacien-pharmacy-card">

          <div className="pf-pharmacien-pharmacy-icon">
            🏥
          </div>

          <div>

            <span>
              Pharmacie
            </span>

            <strong>
              {pharmacy?.name ||
                "Ma pharmacie"}
            </strong>

            <small>
              {[
                pharmacy?.city,
                pharmacy?.country_code,
              ]
                .filter(Boolean)
                .join(" • ") ||
                "Localisation non renseignée"}
            </small>

          </div>

          <span className="pf-online-dot" />

        </div>

        {/* NAVIGATION */}

        <nav className="pf-sidebar-nav">

          <div className="pf-nav-section-title">
            ESPACE PHARMACIEN
          </div>

          <button
            type="button"
            className="pf-nav-item pf-nav-item-active"
            onClick={() =>
              go("/pharmacien")
            }
          >
            <span className="pf-nav-icon">
              ▦
            </span>

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
            <span className="pf-nav-icon">
              📦
            </span>

            <span>
              Produits
            </span>
          </button>

          <button
            type="button"
            className="pf-nav-item"
            onClick={() =>
              go("/stock")
            }
          >
            <span className="pf-nav-icon">
              ▣
            </span>

            <span>
              Stock
            </span>
          </button>

          <button
            type="button"
            className="pf-nav-item"
            onClick={() =>
              go("/ventes")
            }
          >
            <span className="pf-nav-icon">
              🛒
            </span>

            <span>
              Ventes
            </span>
          </button>

          <div className="pf-nav-section-title">
            ANALYSE
          </div>

          {/* IMPORTANT :
              RAPPORT PHARMACIEN */}
          <button
            type="button"
            className="pf-nav-item"
            onClick={() =>
              go(
                "/pharmacien/rapports",
              )
            }
          >
            <span className="pf-nav-icon">
              📊
            </span>

            <span>
              Rapports
            </span>
          </button>

          <button
            type="button"
            className="pf-nav-item"
            onClick={() =>
              go("/paiements")
            }
          >
            <span className="pf-nav-icon">
              💳
            </span>

            <span>
              Paiements
            </span>
          </button>

          <div className="pf-nav-section-title">
            COMPTE
          </div>

          <button
            type="button"
            className="pf-nav-item"
            onClick={() =>
              go("/parametres")
            }
          >
            <span className="pf-nav-icon">
              ⚙
            </span>

            <span>
              Mon profil
            </span>
          </button>

        </nav>

        {/* UTILISATEUR */}

        <div className="pf-pharmacien-sidebar-user">

          <div className="pf-user-avatar">
            {initials}
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
            onClick={
              handleLogout
            }
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            ↪
          </button>

        </div>

      </aside>

      {/* ==============================
          CONTENU PRINCIPAL
          ============================== */}

      <main className="pf-main">

        {/* TOPBAR */}

        <header className="pf-topbar pf-pharmacien-topbar">

          <div className="pf-topbar-left">

            <button
              type="button"
              className="pf-mobile-menu-button"
              onClick={() =>
                setSidebarOpen(true)
              }
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>

            <div>

              <div className="pf-topbar-page-title">
                Tableau de bord
              </div>

              <div className="pf-topbar-page-subtitle">
                Pilotage intelligent de votre pharmacie
              </div>

            </div>

          </div>

          <div className="pf-topbar-right">

            <div className="pf-pharmacien-live">
              <span />
              Session active
            </div>

            <div className="pf-topbar-date">
              {new Intl.DateTimeFormat(
                "fr-FR",
                {
                  weekday:
                    "long",
                  day: "numeric",
                  month:
                    "long",
                  year:
                    "numeric",
                },
              ).format(
                new Date(),
              )}
            </div>

            <button
              type="button"
              className="pf-topbar-profile"
              onClick={() =>
                go(
                  "/parametres",
                )
              }
            >

              <div className="pf-topbar-avatar">
                {initials}
              </div>

              <div>

                <strong>
                  {firstName}
                </strong>

                <span>
                  Pharmacien
                </span>

              </div>

            </button>

          </div>

        </header>

        <div className="pf-content">

          <div className="pf-container">

            {/* ==========================
                HERO
                ========================== */}

            <section className="pf-pharmacien-hero">

              <div className="pf-pharmacien-hero-main">

                <div className="pf-pharmacien-eyebrow">
                  ESPACE PHARMACIEN
                </div>

                <h1>
                  Bonjour {firstName} 👋
                </h1>

                <p>
                  Voici la situation actuelle de{" "}
                  <strong>
                    {pharmacy?.name ||
                      "votre pharmacie"}
                  </strong>
                  .
                  <br />
                  Suivez les ventes, le stock,
                  les produits et les alertes
                  depuis un seul espace.
                </p>

                <div className="pf-pharmacien-hero-meta">

                  <span>
                    🏥{" "}
                    {pharmacy?.name ||
                      "Pharmacie"}
                  </span>

                  {pharmacy?.city && (
                    <span>
                      📍{" "}
                      {pharmacy.city}
                    </span>
                  )}

                  <span>
                    💱 {currency}
                  </span>

                </div>

              </div>

              <div className="pf-pharmacien-hero-actions">

                <button
                  type="button"
                  className="pf-btn pf-btn-white"
                  onClick={() =>
                    go("/ventes")
                  }
                >
                  ＋ Nouvelle vente
                </button>

                {/* IMPORTANT :
                    RAPPORT PHARMACIEN */}
                <button
                  type="button"
                  className="pf-btn pf-btn-ghost-white"
                  onClick={() =>
                    go(
                      "/pharmacien/rapports",
                    )
                  }
                >
                  📊 Voir les rapports
                </button>

                <button
                  type="button"
                  className="pf-pharmacien-refresh"
                  onClick={() =>
                    loadDashboard(
                      true,
                    )
                  }
                  disabled={
                    refreshing
                  }
                >
                  {refreshing
                    ? "Actualisation..."
                    : "↻ Actualiser"}
                </button>

              </div>

            </section>

            {/* ==========================
                KPI
                ========================== */}

            <section className="pf-pharmacien-kpi-grid">

              <article className="pf-pharmacien-kpi">

                <div className="pf-pharmacien-kpi-head">

                  <div className="pf-pharmacien-kpi-icon primary">
                    💰
                  </div>

                  <span>
                    CHIFFRE D’AFFAIRES
                  </span>

                </div>

                <strong>
                  {formatMoney(
                    todayRevenue,
                    currency,
                  )}
                </strong>

                <div className="pf-pharmacien-kpi-footer">

                  <span>
                    Aujourd’hui
                  </span>

                  <b>
                    {todaySales.length} vente
                    {todaySales.length >
                    1
                      ? "s"
                      : ""}
                  </b>

                </div>

              </article>

              <article className="pf-pharmacien-kpi">

                <div className="pf-pharmacien-kpi-head">

                  <div className="pf-pharmacien-kpi-icon info">
                    📅
                  </div>

                  <span>
                    CETTE SEMAINE
                  </span>

                </div>

                <strong>
                  {formatMoney(
                    weekRevenue,
                    currency,
                  )}
                </strong>

                <div className="pf-pharmacien-kpi-footer">

                  <span>
                    Activité
                  </span>

                  <b>
                    {weekSales.length} vente
                    {weekSales.length >
                    1
                      ? "s"
                      : ""}
                  </b>

                </div>

              </article>

              <article className="pf-pharmacien-kpi">

                <div className="pf-pharmacien-kpi-head">

                  <div className="pf-pharmacien-kpi-icon success">
                    📈
                  </div>

                  <span>
                    CE MOIS
                  </span>

                </div>

                <strong>
                  {formatMoney(
                    monthRevenue,
                    currency,
                  )}
                </strong>

                <div className="pf-pharmacien-kpi-footer">

                  <span>
                    Activité mensuelle
                  </span>

                  <b>
                    {monthSales.length} vente
                    {monthSales.length >
                    1
                      ? "s"
                      : ""}
                  </b>

                </div>

              </article>

              <article className="pf-pharmacien-kpi">

                <div className="pf-pharmacien-kpi-head">

                  <div className="pf-pharmacien-kpi-icon warning">
                    📦
                  </div>

                  <span>
                    PRODUITS ACTIFS
                  </span>

                </div>

                <strong>
                  {products.length}
                </strong>

                <div className="pf-pharmacien-kpi-footer">

                  <span>
                    Quantité totale
                  </span>

                  <b>
                    {totalUnits.toLocaleString(
                      "fr-FR",
                    )}{" "}
                    unités
                  </b>

                </div>

              </article>

            </section>

            {/* ==========================
                ALERTES
                ========================== */}

            <section className="pf-pharmacien-alert-grid">

              <button
                type="button"
                className="pf-pharmacien-alert-card warning"
                onClick={() =>
                  go("/stock")
                }
              >

                <div className="pf-pharmacien-alert-card-icon">
                  !
                </div>

                <div>

                  <span>
                    STOCK FAIBLE
                  </span>

                  <strong>
                    {lowStock.length}
                  </strong>

                  <small>
                    produit
                    {lowStock.length >
                    1
                      ? "s"
                      : ""}{" "}
                    à surveiller
                  </small>

                </div>

                <span className="pf-alert-arrow">
                  →
                </span>

              </button>

              <button
                type="button"
                className="pf-pharmacien-alert-card danger"
                onClick={() =>
                  go("/stock")
                }
              >

                <div className="pf-pharmacien-alert-card-icon">
                  !
                </div>

                <div>

                  <span>
                    RUPTURES
                  </span>

                  <strong>
                    {outOfStock.length}
                  </strong>

                  <small>
                    produit
                    {outOfStock.length >
                    1
                      ? "s"
                      : ""}{" "}
                    indisponible
                  </small>

                </div>

                <span className="pf-alert-arrow">
                  →
                </span>

              </button>

              <button
                type="button"
                className="pf-pharmacien-alert-card orange"
                onClick={() =>
                  go("/products")
                }
              >

                <div className="pf-pharmacien-alert-card-icon">
                  ⏳
                </div>

                <div>

                  <span>
                    PÉREMPTION
                  </span>

                  <strong>
                    {expiringSoon.length}
                  </strong>

                  <small>
                    dans les 90 prochains jours
                  </small>

                </div>

                <span className="pf-alert-arrow">
                  →
                </span>

              </button>

              <div className="pf-pharmacien-alert-card neutral">

                <div className="pf-pharmacien-alert-card-icon">
                  🛒
                </div>

                <div>

                  <span>
                    PANIER MOYEN
                  </span>

                  <strong>
                    {formatMoney(
                      averageBasket,
                      currency,
                    )}
                  </strong>

                  <small>
                    sur les ventes du jour
                  </small>

                </div>

              </div>

            </section>

            {/* ==========================
                ACTIONS RAPIDES
                ========================== */}

            <section className="pf-pharmacien-section">

              <div className="pf-pharmacien-section-heading">

                <div>

                  <span>
                    ACTIONS RAPIDES
                  </span>

                  <h2>
                    Gérer votre activité
                  </h2>

                </div>

              </div>

              <div className="pf-pharmacien-actions-grid">

                <button
                  type="button"
                  className="pf-pharmacien-action primary"
                  onClick={() =>
                    go("/ventes")
                  }
                >

                  <div className="pf-pharmacien-action-icon">
                    🛒
                  </div>

                  <div>

                    <strong>
                      Nouvelle vente
                    </strong>

                    <span>
                      Enregistrer une transaction
                    </span>

                  </div>

                  <b>
                    →
                  </b>

                </button>

                <button
                  type="button"
                  className="pf-pharmacien-action"
                  onClick={() =>
                    go("/products")
                  }
                >

                  <div className="pf-pharmacien-action-icon">
                    📦
                  </div>

                  <div>

                    <strong>
                      Produits
                    </strong>

                    <span>
                      Catalogue et péremptions
                    </span>

                  </div>

                  <b>
                    →
                  </b>

                </button>

                <button
                  type="button"
                  className="pf-pharmacien-action"
                  onClick={() =>
                    go("/stock")
                  }
                >

                  <div className="pf-pharmacien-action-icon">
                    ▣
                  </div>

                  <div>

                    <strong>
                      Stock
                    </strong>

                    <span>
                      Réceptions et mouvements
                    </span>

                  </div>

                  <b>
                    →
                  </b>

                </button>

                {/* IMPORTANT :
                    RAPPORT PHARMACIEN */}
                <button
                  type="button"
                  className="pf-pharmacien-action"
                  onClick={() =>
                    go(
                      "/pharmacien/rapports",
                    )
                  }
                >

                  <div className="pf-pharmacien-action-icon">
                    📊
                  </div>

                  <div>

                    <strong>
                      Rapports
                    </strong>

                    <span>
                      Analyse des performances
                    </span>

                  </div>

                  <b>
                    →
                  </b>

                </button>

              </div>

            </section>
            {/* ==========================
                DERNIÈRES VENTES
                ========================== */}

            <section className="pf-pharmacien-main-grid">

              <div className="pf-card pf-pharmacien-sales-card">

                <div className="pf-pharmacien-card-header">

                  <div>

                    <span className="pf-section-kicker">
                      ACTIVITÉ COMMERCIALE
                    </span>

                    <h2>
                      Dernières ventes
                    </h2>

                    <p>
                      Les dernières transactions
                      enregistrées dans votre pharmacie.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="pf-pharmacien-text-button"
                    onClick={() =>
                      go("/ventes")
                    }
                  >
                    Voir toutes les ventes
                    <span>
                      →
                    </span>
                  </button>

                </div>

                {recentSales.length === 0 ? (

                  <div className="pf-pharmacien-empty">

                    <div className="pf-pharmacien-empty-icon">
                      🧾
                    </div>

                    <h3>
                      Aucune vente récente
                    </h3>

                    <p>
                      Les transactions apparaîtront
                      automatiquement ici.
                    </p>

                    <button
                      type="button"
                      className="pf-btn pf-btn-primary"
                      onClick={() =>
                        go("/ventes")
                      }
                    >
                      ＋ Nouvelle vente
                    </button>

                  </div>

                ) : (

                  <div className="pf-pharmacien-table-scroll">

                    <table className="pf-pharmacien-table">

                      <thead>

                        <tr>

                          <th>
                            Référence
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

                          <th className="pf-align-right">
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

                                <div className="pf-sale-reference">

                                  <span className="pf-sale-reference-icon">
                                    #
                                  </span>

                                  <strong>
                                    {
                                      sale.sale_number
                                    }
                                  </strong>

                                </div>

                              </td>

                              <td>

                                <span className="pf-table-primary">
                                  {sale.customer_name ||
                                    "Client comptoir"}
                                </span>

                                {sale.customer_phone && (
                                  <small className="pf-table-secondary">
                                    {
                                      sale.customer_phone
                                    }
                                  </small>
                                )}

                              </td>

                              <td>

                                <span className="pf-table-secondary">
                                  {formatDateTime(
                                    sale.created_at,
                                  )}
                                </span>

                              </td>

                              <td>

                                <span
                                  className={`pf-status-badge ${
                                    isCancelled(
                                      sale.status,
                                    )
                                      ? "danger"
                                      : "success"
                                  }`}
                                >

                                  <span />

                                  {getSaleStatusLabel(
                                    sale.status,
                                  )}

                                </span>

                              </td>

                              <td className="pf-align-right">

                                <strong className="pf-sale-total">
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

              </div>

              {/* ==========================
                  PERFORMANCE
                  ========================== */}

              <aside className="pf-card pf-pharmacien-performance-card">

                <div className="pf-pharmacien-card-header">

                  <div>

                    <span className="pf-section-kicker">
                      PERFORMANCE
                    </span>

                    <h2>
                      Votre activité
                    </h2>

                  </div>

                  <div className="pf-performance-round-icon">
                    📊
                  </div>

                </div>

                <div className="pf-performance-big">

                  <span>
                    CA aujourd’hui
                  </span>

                  <strong>
                    {formatMoney(
                      todayRevenue,
                      currency,
                    )}
                  </strong>

                  <small>
                    {todaySales.length} vente
                    {todaySales.length !==
                    1
                      ? "s"
                      : ""}{" "}
                    enregistrée
                    {todaySales.length !==
                    1
                      ? "s"
                      : ""}
                  </small>

                </div>

                <div className="pf-performance-bars">

                  <div className="pf-performance-bar-item">

                    <div>

                      <span>
                        Aujourd’hui
                      </span>

                      <strong>
                        {formatMoney(
                          todayRevenue,
                          currency,
                        )}
                      </strong>

                    </div>

                    <div className="pf-performance-track">

                      <div
                        className="pf-performance-fill"
                        style={{
                          width:
                            monthRevenue >
                            0
                              ? `${Math.min(
                                  100,
                                  (todayRevenue /
                                    monthRevenue) *
                                    100,
                                )}%`
                              : "0%",
                        }}
                      />

                    </div>

                  </div>

                  <div className="pf-performance-bar-item">

                    <div>

                      <span>
                        Cette semaine
                      </span>

                      <strong>
                        {formatMoney(
                          weekRevenue,
                          currency,
                        )}
                      </strong>

                    </div>

                    <div className="pf-performance-track">

                      <div
                        className="pf-performance-fill info"
                        style={{
                          width:
                            monthRevenue >
                            0
                              ? `${Math.min(
                                  100,
                                  (weekRevenue /
                                    monthRevenue) *
                                    100,
                                )}%`
                              : "0%",
                        }}
                      />

                    </div>

                  </div>

                  <div className="pf-performance-bar-item">

                    <div>

                      <span>
                        Ce mois
                      </span>

                      <strong>
                        {formatMoney(
                          monthRevenue,
                          currency,
                        )}
                      </strong>

                    </div>

                    <div className="pf-performance-track">

                      <div
                        className="pf-performance-fill success"
                        style={{
                          width:
                            monthRevenue >
                            0
                              ? "100%"
                              : "0%",
                        }}
                      />

                    </div>

                  </div>

                </div>

                {/* RAPPORT PHARMACIEN */}

                <button
                  type="button"
                  className="pf-performance-report-button"
                  onClick={() =>
                    go(
                      "/pharmacien/rapports",
                    )
                  }
                >

                  Ouvrir les rapports

                  <span>
                    →
                  </span>

                </button>

              </aside>

            </section>

            {/* ==========================
                STOCK + PÉREMPTION
                ========================== */}

            <section className="pf-pharmacien-main-grid">

              {/* STOCK */}

              <div className="pf-card">

                <div className="pf-pharmacien-card-header">

                  <div>

                    <span className="pf-section-kicker">
                      GESTION DU STOCK
                    </span>

                    <h2>
                      Alertes stock
                    </h2>

                    <p>
                      Produits nécessitant votre
                      attention.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="pf-pharmacien-text-button"
                    onClick={() =>
                      go("/stock")
                    }
                  >
                    Ouvrir le stock
                    <span>
                      →
                    </span>
                  </button>

                </div>

                {lowStock.length === 0 &&
                outOfStock.length === 0 ? (

                  <div className="pf-pharmacien-success-state">

                    <div className="pf-pharmacien-success-icon">
                      ✓
                    </div>

                    <div>

                      <strong>
                        Stock sous contrôle
                      </strong>

                      <span>
                        Aucun produit en stock faible
                        ou en rupture.
                      </span>

                    </div>

                  </div>

                ) : (

                  <div className="pf-pharmacien-alert-list">

                    {[
                      ...outOfStock,
                      ...lowStock.filter(
                        (product) =>
                          !outOfStock.some(
                            (item) =>
                              item.id ===
                              product.id,
                          ),
                      ),
                    ]
                      .slice(0, 7)
                      .map(
                        (product) => (
                          <button
                            type="button"
                            className="pf-pharmacien-alert-row"
                            key={
                              product.id
                            }
                            onClick={() =>
                              go("/stock")
                            }
                          >

                            <div
                              className={`pf-pharmacien-alert-symbol ${
                                Number(
                                  product.stock_quantity,
                                ) <= 0
                                  ? "danger"
                                  : "warning"
                              }`}
                            >
                              !
                            </div>

                            <div className="pf-pharmacien-alert-details">

                              <strong>
                                {product.name}
                              </strong>

                              <span>
                                {Number(
                                  product.stock_quantity,
                                ) <= 0
                                  ? "Produit en rupture"
                                  : `Stock restant : ${product.stock_quantity} ${product.unit}`}
                              </span>

                            </div>

                            <span
                              className={`pf-status-badge ${
                                Number(
                                  product.stock_quantity,
                                ) <= 0
                                  ? "danger"
                                  : "warning"
                              }`}
                            >

                              <span />

                              {Number(
                                product.stock_quantity,
                              ) <= 0
                                ? "Rupture"
                                : "Faible"}

                            </span>

                            <span className="pf-pharmacien-row-arrow">
                              →
                            </span>

                          </button>
                        ),
                      )}

                  </div>

                )}

              </div>

              {/* PÉREMPTION */}

              <div className="pf-card">

                <div className="pf-pharmacien-card-header">

                  <div>

                    <span className="pf-section-kicker">
                      SÉCURITÉ MÉDICAMENTEUSE
                    </span>

                    <h2>
                      Péremptions
                    </h2>

                    <p>
                      Produits à surveiller.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="pf-pharmacien-text-button"
                    onClick={() =>
                      go("/products")
                    }
                  >
                    Produits
                    <span>
                      →
                    </span>
                  </button>

                </div>

                {expired.length === 0 &&
                expiringSoon.length === 0 ? (

                  <div className="pf-pharmacien-success-state">

                    <div className="pf-pharmacien-success-icon">
                      ✓
                    </div>

                    <div>

                      <strong>
                        Aucun risque détecté
                      </strong>

                      <span>
                        Aucun produit expiré ou proche
                        de la péremption.
                      </span>

                    </div>

                  </div>

                ) : (

                  <div className="pf-pharmacien-alert-list">

                    {[
                      ...expired,
                      ...expiringSoon.filter(
                        (product) =>
                          !expired.some(
                            (item) =>
                              item.id ===
                              product.id,
                          ),
                      ),
                    ]
                      .slice(0, 7)
                      .map(
                        (product) => {

                          const days =
                            getDaysUntilExpiry(
                              product.expiry_date,
                            );

                          const isExpired =
                            days !==
                              null &&
                            days < 0;

                          return (
                            <button
                              type="button"
                              className="pf-pharmacien-alert-row"
                              key={
                                product.id
                              }
                              onClick={() =>
                                go(
                                  "/products",
                                )
                              }
                            >

                              <div
                                className={`pf-pharmacien-alert-symbol ${
                                  isExpired
                                    ? "danger"
                                    : "orange"
                                }`}
                              >
                                ⏳
                              </div>

                              <div className="pf-pharmacien-alert-details">

                                <strong>
                                  {
                                    product.name
                                  }
                                </strong>

                                <span>
                                  {product.expiry_date
                                    ? `Expire le ${formatDate(
                                        product.expiry_date,
                                      )}`
                                    : "Date non renseignée"}
                                </span>

                              </div>

                              <span
                                className={`pf-status-badge ${
                                  isExpired
                                    ? "danger"
                                    : "warning"
                                }`}
                              >

                                <span />

                                {isExpired
                                  ? "Expiré"
                                  : days ===
                                    0
                                  ? "Aujourd’hui"
                                  : `${days} j.`}

                              </span>

                              <span className="pf-pharmacien-row-arrow">
                                →
                              </span>

                            </button>
                          );
                        },
                      )}

                  </div>

                )}

              </div>

            </section>

            {/* ==========================
                MOUVEMENTS DE STOCK
                ========================== */}

            <section className="pf-card pf-pharmacien-movements-card">

              <div className="pf-pharmacien-card-header">

                <div>

                  <span className="pf-section-kicker">
                    TRAÇABILITÉ
                  </span>

                  <h2>
                    Derniers mouvements de stock
                  </h2>

                  <p>
                    Suivi des dernières entrées,
                    sorties et opérations de stock.
                  </p>

                </div>

                <button
                  type="button"
                  className="pf-pharmacien-text-button"
                  onClick={() =>
                    go("/stock")
                  }
                >
                  Historique complet
                  <span>
                    →
                  </span>
                </button>

              </div>

              {recentMovements.length ===
              0 ? (

                <div className="pf-pharmacien-empty">

                  <div className="pf-pharmacien-empty-icon">
                    ▣
                  </div>

                  <h3>
                    Aucun mouvement récent
                  </h3>

                  <p>
                    L’historique des mouvements
                    apparaîtra ici.
                  </p>

                </div>

              ) : (

                <div className="pf-pharmacien-table-scroll">

                  <table className="pf-pharmacien-table">

                    <thead>

                      <tr>

                        <th>
                          Produit
                        </th>

                        <th>
                          Type
                        </th>

                        <th>
                          Quantité
                        </th>

                        <th>
                          Motif
                        </th>

                        <th>
                          Référence
                        </th>

                        <th>
                          Date
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {recentMovements.map(
                        (movement) => {

                          const isEntry =
                            isEntryMovement(
                              movement.type,
                            );

                          return (
                            <tr
                              key={
                                movement.id
                              }
                            >

                              <td>

                                <div className="pf-product-table-cell">

                                  <div className="pf-product-mini-icon">
                                    📦
                                  </div>

                                  <strong>
                                    {productMap.get(
                                      movement.product_id,
                                    ) ||
                                      "Produit"}
                                  </strong>

                                </div>

                              </td>

                              <td>

                                <span
                                  className={`pf-status-badge ${
                                    isEntry
                                      ? "success"
                                      : "danger"
                                  }`}
                                >

                                  <span />

                                  {getMovementLabel(
                                    movement.type,
                                  )}

                                </span>

                              </td>

                              <td>

                                <strong>
                                  {isEntry
                                    ? "+"
                                    : "-"}
                                  {
                                    movement.quantity
                                  }
                                </strong>

                              </td>

                              <td>

                                <span className="pf-table-secondary">
                                  {movement.reason ||
                                    "—"}
                                </span>

                              </td>

                              <td>

                                <span className="pf-reference-pill">
                                  {movement.reference ||
                                    "—"}
                                </span>

                              </td>

                              <td>

                                <span className="pf-table-secondary">
                                  {formatDateTime(
                                    movement.created_at,
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

            {/* ==========================
                RÉSUMÉ GLOBAL
                ========================== */}

            <section className="pf-pharmacien-summary-section">

              <div className="pf-pharmacien-summary-heading">

                <div>

                  <span>
                    VUE D’ENSEMBLE
                  </span>

                  <h2>
                    État de votre pharmacie
                  </h2>

                </div>

                <span className="pf-pharmacien-secure-label">
                  🔐 Données sécurisées
                </span>

              </div>

              <div className="pf-pharmacien-summary-grid">

                <div className="pf-pharmacien-summary-card">

                  <span>
                    Produits actifs
                  </span>

                  <strong>
                    {products.length}
                  </strong>

                  <small>
                    références disponibles
                  </small>

                </div>

                <div className="pf-pharmacien-summary-card">

                  <span>
                    Unités en stock
                  </span>

                  <strong>
                    {totalUnits.toLocaleString(
                      "fr-FR",
                    )}
                  </strong>

                  <small>
                    quantité totale
                  </small>

                </div>

                <div className="pf-pharmacien-summary-card">

                  <span>
                    Valeur du stock
                  </span>

                  <strong>
                    {formatMoney(
                      totalStockValue,
                      currency,
                    )}
                  </strong>

                  <small>
                    au prix de vente
                  </small>

                </div>

                <div className="pf-pharmacien-summary-card">

                  <span>
                    Alertes
                  </span>

                  <strong>
                    {lowStock.length +
                      outOfStock.length +
                      expired.length +
                      expiringSoon.length}
                  </strong>

                  <small>
                    éléments à surveiller
                  </small>

                </div>

              </div>

            </section>

            {/* ==========================
                SÉCURITÉ
                ========================== */}

            <section className="pf-pharmacien-security">

              <div className="pf-pharmacien-security-icon">
                🛡️
              </div>

              <div>

                <strong>
                  PharmaFlow protège votre espace
                </strong>

                <span>
                  Les données affichées sont
                  rattachées à votre pharmacie.
                  Votre rôle de pharmacien contrôle
                  l’accès à cet espace.
                </span>

              </div>

            </section>

            {/* ==========================
                FOOTER
                ========================== */}

            <footer className="pf-pharmacien-footer">

              <span>
                PharmaFlow
              </span>

              <span>
                Espace pharmacien
              </span>

              <span>
                •
              </span>

              <span>
                {pharmacy?.name ||
                  "Ma pharmacie"}
              </span>

              <span>
                •
              </span>

              <span>
                {currency}
              </span>

            </footer>

          </div>

        </div>

      </main>

    </div>
  );
}