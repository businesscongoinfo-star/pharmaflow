"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import {
  useLocale,
  useTranslations,
} from "next-intl";

type Language = "fr" | "en";

type Product = {
  id: string;
  pharmacy_id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  barcode: string | null;
  sku: string | null;
  unit: string | null;
  purchase_price: number | null;
  selling_price: number | null;
  stock_quantity: number | null;
  minimum_stock: number | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type UserProfile = {
  id: string;
  full_name: string | null;
};

type Movement = {
  id: string;
  pharmacy_id: string;
  product_id: string;
  user_id: string | null;
  type: "entry" | "exit" | string;
  quantity: number;
  reason: string | null;
  reference: string | null;
  created_at: string;
  product: Product | null;
  user: UserProfile | null;
};

type Statistics = {
  totalProducts: number;
  totalUnits: number;
  stockValue: number;
  sellingValue: number;
  potentialMargin: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  expired: number;
  totalEntries: number;
  totalExits: number;
};

type ApiResponse = {
  success: boolean;
  error?: string;

  pharmacy?: {
    id: string;
    name: string;
    language: Language | null;
    currency_code: string | null;
  } | null;

  permissions?: {
    canManageStock: boolean;
    role: string | null;
  };

  statistics?: Statistics;

  products?: Product[];

  movements?: Movement[];
};

function normalizeLanguage(
  value: unknown,
): Language {
  return value === "en" ? "en" : "fr";
}

function formatNumber(
  value: number,
  locale: Language,
) {
  return new Intl.NumberFormat(
    locale === "fr" ? "fr-FR" : "en-US",
    {
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function formatMoney(
  value: number,
  currency: string | null,
  locale: Language,
) {
  const safeCurrency =
    currency && currency.length === 3
      ? currency
      : "XAF";

  try {
    return new Intl.NumberFormat(
      locale === "fr" ? "fr-FR" : "en-US",
      {
        style: "currency",
        currency: safeCurrency,
        maximumFractionDigits: 0,
      },
    ).format(value);
  } catch {
    return `${formatNumber(value, locale)} ${safeCurrency}`;
  }
}

function formatDate(
  value: string | null,
  locale: Language,
) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      locale === "fr" ? "fr-FR" : "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(new Date(value));
  } catch {
    return value;
  }
}

function isExpired(
  expiryDate: string | null,
) {
  if (!expiryDate) {
    return false;
  }

  return (
    new Date(expiryDate).getTime() <
    new Date().getTime()
  );
}

function isExpiringSoon(
  expiryDate: string | null,
) {
  if (!expiryDate) {
    return false;
  }

  const now = new Date();

  const limit = new Date(now);

  limit.setDate(limit.getDate() + 30);

  const expiry = new Date(expiryDate);

  return (
    expiry >= now &&
    expiry <= limit
  );
}

export default function StockPage() {
  const locale = normalizeLanguage(
    useLocale(),
  );

  const t = useTranslations();

  const [language, setLanguage] =
    useState<Language>(locale);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [movements, setMovements] =
    useState<Movement[]>([]);

  const [statistics, setStatistics] =
    useState<Statistics>({
      totalProducts: 0,
      totalUnits: 0,
      stockValue: 0,
      sellingValue: 0,
      potentialMargin: 0,
      lowStock: 0,
      outOfStock: 0,
      expiringSoon: 0,
      expired: 0,
      totalEntries: 0,
      totalExits: 0,
    });

  const [currency, setCurrency] =
    useState<string>("XAF");

  const [pharmacyName, setPharmacyName] =
    useState<string>("");

  const [canManageStock, setCanManageStock] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [movementFilter, setMovementFilter] =
    useState<"all" | "entry" | "exit">(
      "all",
    );

  const [activeSection, setActiveSection] =
    useState<
      | "overview"
      | "products"
      | "movements"
      | "alerts"
    >("overview");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showMovementModal, setShowMovementModal] =
    useState(false);

  const [movementType, setMovementType] =
    useState<"entry" | "exit">("entry");

  const [selectedProductId, setSelectedProductId] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const labels = useMemo(
    () =>
      language === "fr"
        ? {
            title: "Gestion du stock",
            subtitle:
              "Gérez les entrées, sorties et niveaux de stock de votre pharmacie.",

            overview: "Vue d'ensemble",
            products: "Produits",
            movements: "Mouvements",
            alerts: "Alertes",

            totalProducts: "Produits actifs",
            totalUnits: "Unités en stock",
            stockValue: "Valeur du stock",
            sellingValue: "Valeur de vente",
            margin: "Marge potentielle",

            lowStock: "Stock faible",
            outOfStock: "Rupture",
            expiringSoon: "Expire bientôt",
            expired: "Expirés",

            entry: "Entrée",
            exit: "Sortie",

            addStock: "Entrée de stock",
            removeStock: "Sortie de stock",

            product: "Produit",
            quantity: "Quantité",
            reason: "Motif",
            reference: "Référence",
            user: "Utilisateur",
            date: "Date",
            action: "Action",

            search:
              "Rechercher un produit, code-barres ou SKU...",

            all: "Tous",
            noProducts:
              "Aucun produit ne correspond à votre recherche.",
            noMovements:
              "Aucun mouvement de stock trouvé.",
            noAlerts:
              "Aucune alerte de stock.",

            currentStock: "Stock actuel",
            minimumStock: "Stock minimum",
            expiry: "Expiration",
            category: "Catégorie",
            unit: "Unité",

            save: "Enregistrer",
            cancel: "Annuler",
            close: "Fermer",

            stockReceived:
              "Stock reçu",
            stockRemoved:
              "Stock sorti",

            movementSaved:
              "Mouvement enregistré avec succès.",

            loading:
              "Chargement du stock...",

            unauthorized:
              "Vous n'avez pas la permission de modifier le stock.",

            selectProduct:
              "Sélectionnez un produit",

            quantityRequired:
              "Saisissez une quantité valide.",

            reasonPlaceholder:
              "Ex. Réception fournisseur, inventaire, casse...",

            referencePlaceholder:
              "Ex. BL-2026-001",

            responsible:
              "Responsable",

            available:
              "Disponible",

            potentialMargin:
              "Marge potentielle",

            recentMovements:
              "Mouvements récents",

            criticalStock:
              "Stocks critiques",

            expirationAlerts:
              "Alertes d'expiration",

            stockStatus:
              "État du stock",

            normal: "Normal",
            low: "Faible",
            out: "Rupture",

            manage:
              "Gérer",

            view:
              "Voir",

            pharmacy:
              "Pharmacie",
          }
        : {
            title: "Stock management",
            subtitle:
              "Manage stock entries, exits and inventory levels for your pharmacy.",

            overview: "Overview",
            products: "Products",
            movements: "Movements",
            alerts: "Alerts",

            totalProducts: "Active products",
            totalUnits: "Units in stock",
            stockValue: "Stock value",
            sellingValue: "Selling value",
            margin: "Potential margin",

            lowStock: "Low stock",
            outOfStock: "Out of stock",
            expiringSoon: "Expiring soon",
            expired: "Expired",

            entry: "Entry",
            exit: "Exit",

            addStock: "Stock entry",
            removeStock: "Stock exit",

            product: "Product",
            quantity: "Quantity",
            reason: "Reason",
            reference: "Reference",
            user: "User",
            date: "Date",
            action: "Action",

            search:
              "Search product, barcode or SKU...",

            all: "All",
            noProducts:
              "No product matches your search.",
            noMovements:
              "No stock movement found.",
            noAlerts:
              "No stock alerts.",

            currentStock: "Current stock",
            minimumStock: "Minimum stock",
            expiry: "Expiry",
            category: "Category",
            unit: "Unit",

            save: "Save",
            cancel: "Cancel",
            close: "Close",

            stockReceived:
              "Stock received",
            stockRemoved:
              "Stock removed",

            movementSaved:
              "Movement successfully recorded.",

            loading:
              "Loading stock...",

            unauthorized:
              "You do not have permission to modify stock.",

            selectProduct:
              "Select a product",

            quantityRequired:
              "Enter a valid quantity.",

            reasonPlaceholder:
              "E.g. Supplier delivery, inventory, damaged stock...",

            referencePlaceholder:
              "E.g. PO-2026-001",

            responsible:
              "Responsible",

            available:
              "Available",

            potentialMargin:
              "Potential margin",

            recentMovements:
              "Recent movements",

            criticalStock:
              "Critical stock",

            expirationAlerts:
              "Expiration alerts",

            stockStatus:
              "Stock status",

            normal: "Normal",
            low: "Low",
            out: "Out",

            manage:
              "Manage",

            view:
              "View",

            pharmacy:
              "Pharmacy",
          },
    [language],
  );

  const loadStock = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/stock",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as ApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ??
              "Impossible de charger le stock.",
          );
        }

        const pharmacyLanguage =
          normalizeLanguage(
            data.pharmacy?.language,
          );

        setLanguage(pharmacyLanguage);

        setProducts(data.products ?? []);

        setMovements(data.movements ?? []);

        setStatistics(
          data.statistics ?? {
            totalProducts: 0,
            totalUnits: 0,
            stockValue: 0,
            sellingValue: 0,
            potentialMargin: 0,
            lowStock: 0,
            outOfStock: 0,
            expiringSoon: 0,
            expired: 0,
            totalEntries: 0,
            totalExits: 0,
          },
        );

        setCurrency(
          data.pharmacy?.currency_code ??
            "XAF",
        );

        setPharmacyName(
          data.pharmacy?.name ?? "",
        );

        setCanManageStock(
          data.permissions?.canManageStock ??
            false,
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          product.name,
          product.generic_name,
          product.category,
          product.barcode,
          product.sku,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalizedSearch),
        );

      return matchesSearch;
    });
  }, [products, search]);

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      if (movementFilter === "all") {
        return true;
      }

      return movement.type === movementFilter;
    });
  }, [movements, movementFilter]);

  const lowStockProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          Number(
            product.stock_quantity ?? 0,
          ) <=
          Number(
            product.minimum_stock ?? 0,
          ),
      ),
    [products],
  );

  const expiredProducts = useMemo(
    () =>
      products.filter((product) =>
        isExpired(product.expiry_date),
      ),
    [products],
  );

  const expiringProducts = useMemo(
    () =>
      products.filter((product) =>
        isExpiringSoon(
          product.expiry_date,
        ),
      ),
    [products],
  );

  function openMovement(
    type: "entry" | "exit",
    product?: Product,
  ) {
    if (!canManageStock) {
      setError(labels.unauthorized);
      return;
    }

    setMovementType(type);

    setSelectedProduct(
      product ?? null,
    );

    setSelectedProductId(
      product?.id ?? "",
    );

    setQuantity("");

    setReason(
      type === "entry"
        ? language === "fr"
          ? "Réception"
          : "Receipt"
        : language === "fr"
          ? "Sortie de stock"
          : "Stock exit",
    );

    setReference("");

    setError("");

    setSuccess("");

    setShowMovementModal(true);
  }

  function closeMovement() {
    if (saving) {
      return;
    }

    setShowMovementModal(false);

    setSelectedProduct(null);

    setSelectedProductId("");

    setQuantity("");

    setReason("");

    setReference("");
  }

  async function saveMovement() {
    if (!selectedProductId) {
      setError(
        labels.selectProduct,
      );
      return;
    }

    const numericQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        numericQuantity,
      ) ||
      numericQuantity <= 0
    ) {
      setError(
        labels.quantityRequired,
      );
      return;
    }

    if (!canManageStock) {
      setError(
        labels.unauthorized,
      );
      return;
    }

    try {
      setSaving(true);

      setError("");

      setSuccess("");

      const response = await fetch(
        "/api/stock",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            product_id:
              selectedProductId,
            type: movementType,
            quantity:
              numericQuantity,
            reason,
            reference,
          }),
        },
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Impossible d'enregistrer le mouvement.",
        );
      }

      setSuccess(
        labels.movementSaved,
      );

      closeMovement();

      await loadStock();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setSaving(false);
    }
  }

  function stockStatus(
    product: Product,
  ) {
    const quantity =
      Number(
        product.stock_quantity ?? 0,
      );

    const minimum =
      Number(
        product.minimum_stock ?? 0,
      );

    if (quantity <= 0) {
      return {
        label: labels.out,
        className:
          "pf-stock-status-danger",
      };
    }

    if (quantity <= minimum) {
      return {
        label: labels.low,
        className:
          "pf-stock-status-warning",
      };
    }

    return {
      label: labels.normal,
      className:
        "pf-stock-status-success",
    };
  }

  if (loading) {
    return (
      <main className="pf-page">
        <div className="pf-page-header">
          <div>
            <h1>{labels.title}</h1>
            <p>{labels.loading}</p>
          </div>
        </div>

        <div className="pf-loading-card">
          <div className="pf-spinner" />
          <span>
            {labels.loading}
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="pf-page">
      <div className="pf-page-header">
        <div>
          <div className="pf-breadcrumb">
            <Link href="/dashboard">
              {labels.pharmacy}
            </Link>
            <span>/</span>
            <span>{labels.title}</span>
          </div>

          <h1>{labels.title}</h1>

          <p>
            {pharmacyName
              ? `${pharmacyName} — `
              : ""}
            {labels.subtitle}
          </p>
        </div>

        {canManageStock && (
          <div className="pf-page-actions">
            <button
              type="button"
              className="pf-btn pf-btn-primary"
              onClick={() =>
                openMovement("entry")
              }
            >
              <span>＋</span>
              {labels.addStock}
            </button>

            <button
              type="button"
              className="pf-btn pf-btn-secondary"
              onClick={() =>
                openMovement("exit")
              }
            >
              <span>−</span>
              {labels.removeStock}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="pf-alert pf-alert-danger">
          <strong>!</strong>
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="pf-alert pf-alert-success">
          <strong>✓</strong>
          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="pf-stock-tabs">
        <button
          type="button"
          className={
            activeSection === "overview"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "overview",
            )
          }
        >
          {labels.overview}
        </button>

        <button
          type="button"
          className={
            activeSection === "products"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "products",
            )
          }
        >
          {labels.products}
        </button>

        <button
          type="button"
          className={
            activeSection === "movements"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "movements",
            )
          }
        >
          {labels.movements}
        </button>

        <button
          type="button"
          className={
            activeSection === "alerts"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveSection(
              "alerts",
            )
          }
        >
          {labels.alerts}

          {(statistics.lowStock +
            statistics.outOfStock +
            statistics.expiringSoon +
            statistics.expired) >
            0 && (
            <span className="pf-tab-count">
              {statistics.lowStock +
                statistics.outOfStock +
                statistics.expiringSoon +
                statistics.expired}
            </span>
          )}
        </button>
      </div>

      <section className="pf-stock-stats">
        <article className="pf-stat-card">
          <div className="pf-stat-icon">
            📦
          </div>

          <div>
            <span>
              {labels.totalProducts}
            </span>

            <strong>
              {formatNumber(
                statistics.totalProducts,
                language,
              )}
            </strong>
          </div>
        </article>

        <article className="pf-stat-card">
          <div className="pf-stat-icon">
            🧮
          </div>

          <div>
            <span>
              {labels.totalUnits}
            </span>

            <strong>
              {formatNumber(
                statistics.totalUnits,
                language,
              )}
            </strong>
          </div>
        </article>

        <article className="pf-stat-card">
          <div className="pf-stat-icon">
            💰
          </div>

          <div>
            <span>
              {labels.stockValue}
            </span>

            <strong>
              {formatMoney(
                statistics.stockValue,
                currency,
                language,
              )}
            </strong>
          </div>
        </article>

        <article className="pf-stat-card">
          <div className="pf-stat-icon">
            📈
          </div>

          <div>
            <span>
              {labels.margin}
            </span>

            <strong>
              {formatMoney(
                statistics.potentialMargin,
                currency,
                language,
              )}
            </strong>
          </div>
        </article>
      </section>

      {activeSection ===
        "overview" && (
        <>
          <section className="pf-stock-alert-grid">
            <button
              type="button"
              className="pf-stock-alert-card danger"
              onClick={() =>
                setActiveSection(
                  "alerts",
                )
              }
            >
              <span className="pf-stock-alert-icon">
                🚫
              </span>

              <span>
                <strong>
                  {statistics.outOfStock}
                </strong>

                <small>
                  {labels.outOfStock}
                </small>
              </span>
            </button>

            <button
              type="button"
              className="pf-stock-alert-card warning"
              onClick={() =>
                setActiveSection(
                  "alerts",
                )
              }
            >
              <span className="pf-stock-alert-icon">
                ⚠️
              </span>

              <span>
                <strong>
                  {statistics.lowStock}
                </strong>

                <small>
                  {labels.lowStock}
                </small>
              </span>
            </button>

            <button
              type="button"
              className="pf-stock-alert-card warning"
              onClick={() =>
                setActiveSection(
                  "alerts",
                )
              }
            >
              <span className="pf-stock-alert-icon">
                ⏳
              </span>

              <span>
                <strong>
                  {statistics.expiringSoon}
                </strong>

                <small>
                  {labels.expiringSoon}
                </small>
              </span>
            </button>

            <button
              type="button"
              className="pf-stock-alert-card danger"
              onClick={() =>
                setActiveSection(
                  "alerts",
                )
              }
            >
              <span className="pf-stock-alert-icon">
                🛑
              </span>

              <span>
                <strong>
                  {statistics.expired}
                </strong>

                <small>
                  {labels.expired}
                </small>
              </span>
            </button>
          </section>

          <section className="pf-grid pf-grid-2">
            <div className="pf-card">
              <div className="pf-card-header">
                <div>
                  <h2>
                    {labels.criticalStock}
                  </h2>

                  <p>
                    {labels.lowStock}
                  </p>
                </div>

                <button
                  type="button"
                  className="pf-btn pf-btn-sm"
                  onClick={() =>
                    setActiveSection(
                      "products",
                    )
                  }
                >
                  {labels.view}
                </button>
              </div>

              <div className="pf-stock-mini-list">
                {lowStockProducts
                  .slice(0, 6)
                  .map((product) => {
                    const status =
                      stockStatus(
                        product,
                      );

                    return (
                      <div
                        key={product.id}
                        className="pf-stock-mini-row"
                      >
                        <div>
                          <strong>
                            {product.name}
                          </strong>

                          <small>
                            {product.category ??
                              "—"}
                          </small>
                        </div>

                        <div>
                          <strong>
                            {formatNumber(
                              Number(
                                product.stock_quantity ??
                                  0,
                              ),
                              language,
                            )}
                          </strong>

                          <small>
                            /{" "}
                            {formatNumber(
                              Number(
                                product.minimum_stock ??
                                  0,
                              ),
                              language,
                            )}
                          </small>
                        </div>

                        <span
                          className={`pf-stock-status ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    );
                  })}

                {lowStockProducts.length ===
                  0 && (
                  <div className="pf-empty-state">
                    ✓ {labels.noAlerts}
                  </div>
                )}
              </div>
            </div>

            <div className="pf-card">
              <div className="pf-card-header">
                <div>
                  <h2>
                    {labels.recentMovements}
                  </h2>

                  <p>
                    {labels.movements}
                  </p>
                </div>

                <button
                  type="button"
                  className="pf-btn pf-btn-sm"
                  onClick={() =>
                    setActiveSection(
                      "movements",
                    )
                  }
                >
                  {labels.view}
                </button>
              </div>

              <div className="pf-stock-mini-list">
                {movements
                  .slice(0, 6)
                  .map((movement) => (
                    <div
                      key={movement.id}
                      className="pf-stock-mini-row"
                    >
                      <div>
                        <strong>
                          {movement.product
                            ?.name ??
                            "—"}
                        </strong>

                        <small>
                          {movement.reason ??
                            "—"}
                        </small>
                      </div>

                      <span
                        className={
                          movement.type ===
                          "entry"
                            ? "pf-movement-badge entry"
                            : "pf-movement-badge exit"
                        }
                      >
                        {movement.type ===
                        "entry"
                          ? "+"
                          : "-"}
                        {movement.quantity}
                      </span>

                      <small>
                        {formatDate(
                          movement.created_at,
                          language,
                        )}
                      </small>
                    </div>
                  ))}

                {movements.length ===
                  0 && (
                  <div className="pf-empty-state">
                    {labels.noMovements}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {activeSection ===
        "products" && (
        <section className="pf-card">
          <div className="pf-card-header">
            <div>
              <h2>
                {labels.products}
              </h2>

              <p>
                {filteredProducts.length}{" "}
                {labels.totalProducts}
              </p>
            </div>
          </div>

          <div className="pf-toolbar">
            <input
              type="search"
              className="pf-input"
              placeholder={
                labels.search
              }
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="pf-table-wrapper">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>
                    {labels.product}
                  </th>

                  <th>
                    {labels.category}
                  </th>

                  <th>
                    {labels.currentStock}
                  </th>

                  <th>
                    {labels.minimumStock}
                  </th>

                  <th>
                    {labels.expiry}
                  </th>

                  <th>
                    {labels.stockStatus}
                  </th>

                  {canManageStock && (
                    <th>
                      {labels.action}
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map(
                  (product) => {
                    const status =
                      stockStatus(
                        product,
                      );

                    return (
                      <tr
                        key={product.id}
                      >
                        <td>
                          <div className="pf-product-cell">
                            <strong>
                              {product.name}
                            </strong>

                            {product.generic_name && (
                              <small>
                                {
                                  product.generic_name
                                }
                              </small>
                            )}

                            {(product.sku ||
                              product.barcode) && (
                              <small>
                                {product.sku ??
                                  product.barcode}
                              </small>
                            )}
                          </div>
                        </td>

                        <td>
                          {product.category ??
                            "—"}
                        </td>

                        <td>
                          <strong>
                            {formatNumber(
                              Number(
                                product.stock_quantity ??
                                  0,
                              ),
                              language,
                            )}
                          </strong>{" "}
                          {product.unit ?? ""}
                        </td>

                        <td>
                          {formatNumber(
                            Number(
                              product.minimum_stock ??
                                0,
                            ),
                            language,
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              isExpired(
                                product.expiry_date,
                              )
                                ? "pf-expiry-danger"
                                : isExpiringSoon(
                                      product.expiry_date,
                                    )
                                  ? "pf-expiry-warning"
                                  : ""
                            }
                          >
                            {product.expiry_date
                              ? new Intl.DateTimeFormat(
                                  language ===
                                    "fr"
                                    ? "fr-FR"
                                    : "en-US",
                                ).format(
                                  new Date(
                                    product.expiry_date,
                                  ),
                                )
                              : "—"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`pf-stock-status ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        {canManageStock && (
                          <td>
                            <div className="pf-inline-actions">
                              <button
                                type="button"
                                className="pf-btn pf-btn-xs pf-btn-primary"
                                onClick={() =>
                                  openMovement(
                                    "entry",
                                    product,
                                  )
                                }
                              >
                                +
                              </button>

                              <button
                                type="button"
                                className="pf-btn pf-btn-xs pf-btn-secondary"
                                onClick={() =>
                                  openMovement(
                                    "exit",
                                    product,
                                  )
                                }
                              >
                                −
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>

            {filteredProducts.length ===
              0 && (
              <div className="pf-empty-state">
                {labels.noProducts}
              </div>
            )}
          </div>
        </section>
      )}

      {activeSection ===
        "movements" && (
        <section className="pf-card">
          <div className="pf-card-header">
            <div>
              <h2>
                {labels.movements}
              </h2>

              <p>
                {filteredMovements.length}{" "}
                {labels.movements}
              </p>
            </div>
          </div>

          <div className="pf-toolbar">
            <button
              type="button"
              className={
                movementFilter ===
                "all"
                  ? "pf-filter-btn active"
                  : "pf-filter-btn"
              }
              onClick={() =>
                setMovementFilter(
                  "all",
                )
              }
            >
              {labels.all}
            </button>

            <button
              type="button"
              className={
                movementFilter ===
                "entry"
                  ? "pf-filter-btn active"
                  : "pf-filter-btn"
              }
              onClick={() =>
                setMovementFilter(
                  "entry",
                )
              }
            >
              + {labels.entry}
            </button>

            <button
              type="button"
              className={
                movementFilter ===
                "exit"
                  ? "pf-filter-btn active"
                  : "pf-filter-btn"
              }
              onClick={() =>
                setMovementFilter(
                  "exit",
                )
              }
            >
              − {labels.exit}
            </button>
          </div>

          <div className="pf-table-wrapper">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>
                    {labels.product}
                  </th>

                  <th>
                    {labels.action}
                  </th>

                  <th>
                    {labels.quantity}
                  </th>

                  <th>
                    {labels.reason}
                  </th>

                  <th>
                    {labels.reference}
                  </th>

                  <th>
                    {labels.user}
                  </th>

                  <th>
                    {labels.date}
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredMovements.map(
                  (movement) => (
                    <tr
                      key={movement.id}
                    >
                      <td>
                        <strong>
                          {movement.product
                            ?.name ??
                            "—"}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            movement.type ===
                            "entry"
                              ? "pf-movement-badge entry"
                              : "pf-movement-badge exit"
                          }
                        >
                          {movement.type ===
                          "entry"
                            ? `+ ${labels.entry}`
                            : `− ${labels.exit}`}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {movement.quantity}
                        </strong>
                      </td>

                      <td>
                        {movement.reason ??
                          "—"}
                      </td>

                      <td>
                        {movement.reference ??
                          "—"}
                      </td>

                      <td>
                        {movement.user
                          ?.full_name ??
                          "—"}
                      </td>

                      <td>
                        {formatDate(
                          movement.created_at,
                          language,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            {filteredMovements.length ===
              0 && (
              <div className="pf-empty-state">
                {labels.noMovements}
              </div>
            )}
          </div>
        </section>
      )}

      {activeSection ===
        "alerts" && (
        <section className="pf-grid pf-grid-2">
          <div className="pf-card">
            <div className="pf-card-header">
              <div>
                <h2>
                  🚨 {labels.criticalStock}
                </h2>

                <p>
                  {labels.lowStock}
                </p>
              </div>
            </div>

            <div className="pf-alert-product-list">
              {lowStockProducts.map(
                (product) => (
                  <div
                    key={product.id}
                    className="pf-alert-product"
                  >
                    <div>
                      <strong>
                        {product.name}
                      </strong>

                      <small>
                        {product.category ??
                          "—"}
                      </small>
                    </div>

                    <div>
                      <strong>
                        {formatNumber(
                          Number(
                            product.stock_quantity ??
                              0,
                          ),
                          language,
                        )}
                      </strong>

                      <small>
                        /{" "}
                        {formatNumber(
                          Number(
                            product.minimum_stock ??
                              0,
                          ),
                          language,
                        )}
                      </small>
                    </div>

                    {canManageStock && (
                      <button
                        type="button"
                        className="pf-btn pf-btn-xs pf-btn-primary"
                        onClick={() =>
                          openMovement(
                            "entry",
                            product,
                          )
                        }
                      >
                        +
                      </button>
                    )}
                  </div>
                ),
              )}

              {lowStockProducts.length ===
                0 && (
                <div className="pf-empty-state">
                  ✓ {labels.noAlerts}
                </div>
              )}
            </div>
          </div>

          <div className="pf-card">
            <div className="pf-card-header">
              <div>
                <h2>
                  ⏳ {labels.expirationAlerts}
                </h2>

                <p>
                  {labels.expiringSoon}
                </p>
              </div>
            </div>

            <div className="pf-alert-product-list">
              {[
                ...expiredProducts,
                ...expiringProducts,
              ].map((product) => (
                <div
                  key={product.id}
                  className="pf-alert-product"
                >
                  <div>
                    <strong>
                      {product.name}
                    </strong>

                    <small>
                      {isExpired(
                        product.expiry_date,
                      )
                        ? labels.expired
                        : labels.expiringSoon}
                    </small>
                  </div>

                  <span
                    className={
                      isExpired(
                        product.expiry_date,
                      )
                        ? "pf-stock-status pf-stock-status-danger"
                        : "pf-stock-status pf-stock-status-warning"
                    }
                  >
                    {product.expiry_date
                      ? new Intl.DateTimeFormat(
                          language ===
                            "fr"
                            ? "fr-FR"
                            : "en-US",
                        ).format(
                          new Date(
                            product.expiry_date,
                          ),
                        )
                      : "—"}
                  </span>
                </div>
              ))}

              {expiredProducts.length ===
                0 &&
                expiringProducts.length ===
                  0 && (
                  <div className="pf-empty-state">
                    ✓ {labels.noAlerts}
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {showMovementModal && (
        <div
          className="pf-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeMovement();
            }
          }}
        >
          <div
            className="pf-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="pf-modal-header">
              <div>
                <h2>
                  {movementType ===
                  "entry"
                    ? labels.addStock
                    : labels.removeStock}
                </h2>

                <p>
                  {selectedProduct
                    ? selectedProduct.name
                    : labels.selectProduct}
                </p>
              </div>

              <button
                type="button"
                className="pf-modal-close"
                onClick={
                  closeMovement
                }
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="pf-modal-body">
              <div className="pf-form-group">
                <label>
                  {labels.product}
                </label>

                <select
                  className="pf-input"
                  value={
                    selectedProductId
                  }
                  onChange={(event) => {
                    const id =
                      event.target
                        .value;

                    setSelectedProductId(
                      id,
                    );

                    const product =
                      products.find(
                        (item) =>
                          item.id ===
                          id,
                      ) ?? null;

                    setSelectedProduct(
                      product,
                    );
                  }}
                >
                  <option value="">
                    {labels.selectProduct}
                  </option>

                  {products.map(
                    (product) => (
                      <option
                        key={
                          product.id
                        }
                        value={
                          product.id
                        }
                      >
                        {product.name} —{" "}
                        {formatNumber(
                          Number(
                            product.stock_quantity ??
                              0,
                          ),
                          language,
                        )}{" "}
                        {product.unit ??
                          ""}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {selectedProduct && (
                <div className="pf-stock-current-box">
                  <span>
                    {labels.currentStock}
                  </span>

                  <strong>
                    {formatNumber(
                      Number(
                        selectedProduct.stock_quantity ??
                          0,
                      ),
                      language,
                    )}{" "}
                    {selectedProduct.unit ??
                      ""}
                  </strong>
                </div>
              )}

              <div className="pf-form-row">
                <div className="pf-form-group">
                  <label>
                    {labels.quantity}
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="pf-input"
                    value={quantity}
                    onChange={(
                      event,
                    ) =>
                      setQuantity(
                        event.target
                          .value,
                      )
                    }
                    placeholder="1"
                  />
                </div>

                <div className="pf-form-group">
                  <label>
                    {labels.reference}
                  </label>

                  <input
                    type="text"
                    className="pf-input"
                    value={reference}
                    onChange={(
                      event,
                    ) =>
                      setReference(
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      labels.referencePlaceholder
                    }
                  />
                </div>
              </div>

              <div className="pf-form-group">
                <label>
                  {labels.reason}
                </label>

                <input
                  type="text"
                  className="pf-input"
                  value={reason}
                  onChange={(
                    event,
                  ) =>
                    setReason(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    labels.reasonPlaceholder
                  }
                />
              </div>

              <div
                className={
                  movementType ===
                  "entry"
                    ? "pf-movement-preview entry"
                    : "pf-movement-preview exit"
                }
              >
                <span>
                  {movementType ===
                  "entry"
                    ? "＋"
                    : "−"}
                </span>

                <div>
                  <strong>
                    {movementType ===
                    "entry"
                      ? labels.entry
                      : labels.exit}
                  </strong>

                  <small>
                    {quantity
                      ? `${quantity} ${
                          selectedProduct?.unit ??
                          ""
                        }`
                      : "—"}
                  </small>
                </div>
              </div>
            </div>

            <div className="pf-modal-footer">
              <button
                type="button"
                className="pf-btn pf-btn-secondary"
                onClick={
                  closeMovement
                }
                disabled={saving}
              >
                {labels.cancel}
              </button>

              <button
                type="button"
                className="pf-btn pf-btn-primary"
                onClick={
                  saveMovement
                }
                disabled={saving}
              >
                {saving
                  ? "..."
                  : labels.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}