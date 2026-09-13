"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

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
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
  status?: string | null;
};

type Product = {
  id: string;
  pharmacy_id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  barcode: string | null;
  sku: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  minimum_stock: number;
  expiry_date: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type ProductForm = {
  name: string;
  generic_name: string;
  category: string;
  barcode: string;
  sku: string;
  unit: string;
  purchase_price: string;
  selling_price: string;
  stock_quantity: string;
  minimum_stock: string;
  expiry_date: string;
};

const supabase = createClient();

const EMPTY_FORM: ProductForm = {
  name: "",
  generic_name: "",
  category: "",
  barcode: "",
  sku: "",
  unit: "unité",
  purchase_price: "",
  selling_price: "",
  stock_quantity: "0",
  minimum_stock: "0",
  expiry_date: "",
};

function getInitials(name: string) {
  const value = name.trim();

  if (!value) {
    return "P";
  }

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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

function getTodayIsoDate() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const tCommon = useTranslations("common");
  const tNavigation = useTranslations("navigation");
  const tPharmacy = useTranslations("pharmacy");
  const tProducts = useTranslations("products");
  const tStock = useTranslations("stock");
  const tSales = useTranslations("sales");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "all" | "active" | "low" | "out" | "expired"
  >("all");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState<ProductForm>(EMPTY_FORM);

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
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

      const allowedRoles = [
        "owner",
        "admin",
      ];

      if (
        !allowedRoles.includes(
          profileData.role,
        )
      ) {
        switch (profileData.role) {
          case "pharmacist":
            router.replace("/pharmacien");
            break;

          case "cashier":
            router.replace("/caisse/produits");
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

      const [
        pharmacyResponse,
        productsResponse,
      ] = await Promise.all([
        supabase
          .from("pharmacies")
          .select(
            `
              id,
              name,
              address,
              city,
              country_code,
              currency_code,
              status
            `,
          )
          .eq("id", pharmacyId)
          .maybeSingle(),

        supabase
          .from("products")
          .select(
            `
              id,
              pharmacy_id,
              name,
              generic_name,
              category,
              barcode,
              sku,
              unit,
              purchase_price,
              selling_price,
              stock_quantity,
              minimum_stock,
              expiry_date,
              is_active,
              created_at,
              updated_at
            `,
          )
          .eq("pharmacy_id", pharmacyId)
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
        "Erreur chargement produits:",
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

  function openCreateModal() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);

    setForm({
      name: product.name || "",
      generic_name:
        product.generic_name || "",
      category:
        product.category || "",
      barcode:
        product.barcode || "",
      sku:
        product.sku || "",
      unit:
        product.unit || "unité",
      purchase_price:
        String(
          product.purchase_price ?? 0,
        ),
      selling_price:
        String(
          product.selling_price ?? 0,
        ),
      stock_quantity:
        String(
          product.stock_quantity ?? 0,
        ),
      minimum_stock:
        String(
          product.minimum_stock ?? 0,
        ),
      expiry_date:
        product.expiry_date || "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(
    field: keyof ProductForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!profile?.pharmacy_id) {
        throw new Error(
          tErrors("unauthorized"),
        );
      }

      const name = form.name.trim();

      if (!name) {
        throw new Error(
          tErrors("required"),
        );
      }

      const purchasePrice =
        Number(form.purchase_price);

      const sellingPrice =
        Number(form.selling_price);

      const stockQuantity =
        Number(form.stock_quantity);

      const minimumStock =
        Number(form.minimum_stock);

      if (
        !Number.isFinite(
          purchasePrice,
        ) ||
        purchasePrice < 0
      ) {
        throw new Error(
          locale === "en"
            ? "Purchase price is invalid."
            : "Le prix d'achat est invalide.",
        );
      }

      if (
        !Number.isFinite(
          sellingPrice,
        ) ||
        sellingPrice < 0
      ) {
        throw new Error(
          locale === "en"
            ? "Selling price is invalid."
            : "Le prix de vente est invalide.",
        );
      }

      if (
        !Number.isFinite(
          stockQuantity,
        ) ||
        stockQuantity < 0
      ) {
        throw new Error(
          locale === "en"
            ? "Stock quantity is invalid."
            : "La quantité en stock est invalide.",
        );
      }

      if (
        !Number.isFinite(
          minimumStock,
        ) ||
        minimumStock < 0
      ) {
        throw new Error(
          locale === "en"
            ? "Minimum stock is invalid."
            : "Le stock minimum est invalide.",
        );
      }

      const payload = {
        pharmacy_id:
          profile.pharmacy_id,
        name,
        generic_name:
          form.generic_name.trim() ||
          null,
        category:
          form.category.trim() ||
          null,
        barcode:
          form.barcode.trim() ||
          null,
        sku:
          form.sku.trim() ||
          null,
        unit:
          form.unit.trim() ||
          "unité",
        purchase_price:
          purchasePrice,
        selling_price:
          sellingPrice,
        stock_quantity:
          stockQuantity,
        minimum_stock:
          minimumStock,
        expiry_date:
          form.expiry_date || null,
        is_active: true,
      };

      if (editingProduct) {
        const {
          data,
          error: updateError,
        } = await supabase
          .from("products")
          .update({
            name: payload.name,
            generic_name:
              payload.generic_name,
            category:
              payload.category,
            barcode:
              payload.barcode,
            sku: payload.sku,
            unit: payload.unit,
            purchase_price:
              payload.purchase_price,
            selling_price:
              payload.selling_price,
            stock_quantity:
              payload.stock_quantity,
            minimum_stock:
              payload.minimum_stock,
            expiry_date:
              payload.expiry_date,
            is_active: true,
          })
          .eq("id", editingProduct.id)
          .eq(
            "pharmacy_id",
            profile.pharmacy_id,
          )
          .select(
            `
              id,
              pharmacy_id,
              name,
              generic_name,
              category,
              barcode,
              sku,
              unit,
              purchase_price,
              selling_price,
              stock_quantity,
              minimum_stock,
              expiry_date,
              is_active,
              created_at,
              updated_at
            `,
          )
          .maybeSingle();

        if (updateError) {
          throw new Error(
            updateError.message,
          );
        }

        if (!data) {
          throw new Error(
            tErrors("notFound"),
          );
        }

        setProducts((current) =>
          current
            .map((product) =>
              product.id === data.id
                ? (data as Product)
                : product,
            )
            .sort((a, b) =>
              a.name.localeCompare(
                b.name,
              ),
            ),
        );

        setSuccess(
          tProducts("productUpdated"),
        );
      } else {
        const {
          data,
          error: insertError,
        } = await supabase
          .from("products")
          .insert(payload)
          .select(
            `
              id,
              pharmacy_id,
              name,
              generic_name,
              category,
              barcode,
              sku,
              unit,
              purchase_price,
              selling_price,
              stock_quantity,
              minimum_stock,
              expiry_date,
              is_active,
              created_at,
              updated_at
            `,
          )
          .maybeSingle();

        if (insertError) {
          throw new Error(
            insertError.message,
          );
        }

        if (!data) {
          throw new Error(
            locale === "en"
              ? "The product could not be created."
              : "Le produit n'a pas pu être créé.",
          );
        }

        setProducts((current) =>
          [
            ...current,
            data as Product,
          ].sort((a, b) =>
            a.name.localeCompare(
              b.name,
            ),
          ),
        );

        setSuccess(
          tProducts("productCreated"),
        );
      }

      setModalOpen(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(
        "Erreur sauvegarde produit:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : tErrors("save"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    product: Product,
  ) {
    const confirmed = window.confirm(
      locale === "en"
        ? `Delete "${product.name}"?`
        : `Supprimer « ${product.name} » ?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      if (!profile?.pharmacy_id) {
        throw new Error(
          tErrors("unauthorized"),
        );
      }

      const {
        error: deleteError,
      } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq(
          "pharmacy_id",
          profile.pharmacy_id,
        );

      if (deleteError) {
        throw new Error(
          deleteError.message,
        );
      }

      setProducts((current) =>
        current.filter(
          (item) =>
            item.id !== product.id,
        ),
      );

      setSuccess(
        tProducts("productDeleted"),
      );
    } catch (err) {
      console.error(
        "Erreur suppression produit:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : tErrors("delete"),
      );
    }
  }

  async function handleToggleActive(
    product: Product,
  ) {
    setError("");
    setSuccess("");

    try {
      if (!profile?.pharmacy_id) {
        throw new Error(
          tErrors("unauthorized"),
        );
      }

      const nextActive =
        !product.is_active;

      const {
        data,
        error: updateError,
      } = await supabase
        .from("products")
        .update({
          is_active: nextActive,
        })
        .eq("id", product.id)
        .eq(
          "pharmacy_id",
          profile.pharmacy_id,
        )
        .select(
          `
            id,
            pharmacy_id,
            name,
            generic_name,
            category,
            barcode,
            sku,
            unit,
            purchase_price,
            selling_price,
            stock_quantity,
            minimum_stock,
            expiry_date,
            is_active,
            created_at,
            updated_at
          `,
        )
        .maybeSingle();

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }

      if (!data) {
        throw new Error(
          tErrors("notFound"),
        );
      }

      setProducts((current) =>
        current
          .map((item) =>
            item.id === data.id
              ? (data as Product)
              : item,
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
            ),
          ),
      );
    } catch (err) {
      console.error(
        "Erreur statut produit:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : tErrors("save"),
      );
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const currency =
    pharmacy?.currency_code || "XAF";

  const today = getTodayIsoDate();

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

      const expired =
        !!product.expiry_date &&
        product.expiry_date < today;

      const matchesFilter =
        filter === "all" ||
        (filter === "active" &&
          product.is_active) ||
        (filter === "low" &&
          quantity > 0 &&
          quantity <= minimum) ||
        (filter === "out" &&
          quantity <= 0) ||
        (filter === "expired" &&
          expired);

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    products,
    search,
    filter,
    today,
  ]);

  const activeCount =
    products.filter(
      (product) =>
        product.is_active,
    ).length;

  const lowCount =
    products.filter((product) => {
      const quantity = Number(
        product.stock_quantity || 0,
      );

      const minimum = Number(
        product.minimum_stock || 0,
      );

      return (
        product.is_active &&
        quantity > 0 &&
        quantity <= minimum
      );
    }).length;

  const outCount =
    products.filter(
      (product) =>
        product.is_active &&
        Number(
          product.stock_quantity || 0,
        ) <= 0,
    ).length;

  const expiredCount =
    products.filter(
      (product) =>
        product.is_active &&
        !!product.expiry_date &&
        product.expiry_date < today,
    ).length;

  const totalStockUnits =
    products.reduce(
      (sum, product) =>
        sum +
        Number(
          product.stock_quantity || 0,
        ),
      0,
    );

  const navigation = [
    {
      label: tNavigation("dashboard"),
      href: "/dashboard",
      icon: "⌂",
    },
    {
      label: tNavigation("products"),
      href: "/products",
      icon: "▦",
    },
    {
      label: tNavigation("stock"),
      href: "/stock",
      icon: "▥",
    },
    {
      label: tNavigation("sales"),
      href: "/ventes",
      icon: "▤",
    },
    {
      label: tNavigation("users"),
      href: "/utilisateurs",
      icon: "♙",
    },
    {
      label: tNavigation("reports"),
      href: "/rapports",
      icon: "📊",
    },
    {
      label: tNavigation("payments"),
      href: "/paiements",
      icon: "💳",
    },
    {
      label: tNavigation("settings"),
      href: "/parametres",
      icon: "⚙",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
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

  if (error && !modalOpen) {
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
                  href="/dashboard"
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

            <div className="pf-logo-subtitle">
              {locale === "en"
                ? "Pharmacy SaaS"
                : "Logiciel de pharmacie SaaS"}
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

        <nav className="pf-sidebar-nav">
          <div className="pf-nav-section-title">
            {tNavigation("main")}
          </div>

          {navigation
            .slice(0, 4)
            .map((item) => (
              <Link
                key={item.href}
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
            {tNavigation("management")}
          </div>

          {navigation
            .slice(4, 6)
            .map((item) => (
              <Link
                key={item.href}
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
            {tNavigation("administration")}
          </div>

          {navigation
            .slice(6)
            .map((item) => (
              <Link
                key={item.href}
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
        </nav>

        <div className="pf-sidebar-user">
          <div className="pf-user-avatar">
            {getInitials(
              profile?.full_name ||
                "PharmaFlow",
            )}
          </div>

          <div className="pf-user-info">
            <strong>
              {profile?.full_name ||
                "PharmaFlow"}
            </strong>

            <span>
              {profile?.role === "owner"
                ? tAuth("owner")
                : tAuth("admin")}
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

      <main className="pf-main">
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

              {profile?.role === "owner"
                ? tAuth("owner")
                : tAuth("admin")}
            </div>

            <button
              type="button"
              className="pf-btn pf-btn-primary"
              onClick={openCreateModal}
            >
              ＋ {tProducts("addProduct")}
            </button>
          </div>
        </header>

        <div className="pf-content">
          <div className="pf-container">
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
                  {locale === "en"
                    ? "Manage your pharmacy product catalogue, prices, stock and expiry dates."
                    : "Gérez le catalogue de votre pharmacie, les prix, les stocks et les dates d'expiration."}
                </p>
              </div>

              <span className="pf-badge pf-badge-success">
                ✓ {tCommon("active")}
              </span>
            </section>

            {success && (
              <div
                className="pf-alert pf-alert-success"
                style={{
                  marginTop: 18,
                }}
              >
                <div className="pf-alert-icon">
                  ✓
                </div>

                <div>
                  <strong>
                    {tCommon("success")}
                  </strong>

                  <p>{success}</p>
                </div>
              </div>
            )}

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
                  {tProducts("products")}
                </div>
              </div>

              <div className="pf-stat-card">
                <div className="pf-stat-top">
                  <div className="pf-stat-icon">
                    ✓
                  </div>

                  <span className="pf-stat-label">
                    {tCommon("active")}
                  </span>
                </div>

                <div className="pf-stat-value">
                  {activeCount}
                </div>

                <div className="pf-stat-description">
                  {tProducts("activeProduct")}
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
                  {locale === "en"
                    ? "Products to monitor"
                    : "Produits à surveiller"}
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
                  {locale === "en"
                    ? "Unavailable products"
                    : "Produits indisponibles"}
                </div>
              </div>
            </section>

            <section
              className="pf-card"
              style={{
                marginTop: 18,
              }}
            >
              <div className="pf-card-header">
                <div>
                  <h2 className="pf-card-title">
                    {tProducts("products")}
                  </h2>

                  <p className="pf-card-subtitle">
                    {locale === "en"
                      ? "Search and manage your pharmacy catalogue."
                      : "Recherchez et gérez le catalogue de votre pharmacie."}
                  </p>
                </div>

                <button
                  type="button"
                  className="pf-btn pf-btn-primary"
                  onClick={openCreateModal}
                >
                  ＋ {tProducts("addProduct")}
                </button>
              </div>

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
                        ? "Search by product, generic name, barcode, SKU or category..."
                        : "Rechercher par produit, nom générique, code-barres, SKU ou catégorie..."
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
                        | "active"
                        | "low"
                        | "out"
                        | "expired",
                    )
                  }
                  aria-label={
                    tCommon("filter")
                  }
                >
                  <option value="all">
                    {tCommon("all")}
                  </option>

                  <option value="active">
                    {tCommon("active")}
                  </option>

                  <option value="low">
                    {tStock("lowStock")}
                  </option>

                  <option value="out">
                    {tStock("outOfStock")}
                  </option>

                  <option value="expired">
                    {tProducts("expired")}
                  </option>
                </select>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span className="pf-badge">
                  {filteredProducts.length}
                </span>

                <span className="pf-badge">
                  {totalStockUnits}{" "}
                  {tStock("units")}
                </span>

                {expiredCount > 0 && (
                  <span className="pf-badge pf-badge-danger">
                    {expiredCount}{" "}
                    {tProducts("expired")}
                  </span>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="pf-empty-state">
                  <div className="pf-empty-icon">
                    📦
                  </div>

                  <h3>
                    {tProducts("noProducts")}
                  </h3>

                  <p>
                    {locale === "en"
                      ? "No product matches your current search or filter."
                      : "Aucun produit ne correspond à votre recherche ou à votre filtre."}
                  </p>

                  <button
                    type="button"
                    className="pf-btn pf-btn-primary"
                    onClick={openCreateModal}
                  >
                    ＋ {tProducts("addProduct")}
                  </button>
                </div>
              ) : (
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

                        <th>
                          {tCommon("actions")}
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

                          const isExpired =
                            !!product.expiry_date &&
                            product.expiry_date <
                              today;

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
                                      width: 40,
                                      height: 40,
                                      borderRadius: 11,
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "center",
                                      background:
                                        "#e6f5f2",
                                      fontSize: 18,
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
                                        {
                                          product.barcode
                                        }
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
                                    marginTop: 3,
                                    fontSize: 9,
                                    color:
                                      "#94a3b8",
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
                                  className={
                                    isExpired
                                      ? "pf-badge pf-badge-danger"
                                      : ""
                                  }
                                  style={
                                    isExpired
                                      ? undefined
                                      : {
                                          fontSize: 11,
                                          color:
                                            "#475569",
                                        }
                                  }
                                >
                                  {formatDate(
                                    product.expiry_date,
                                    locale,
                                  )}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`pf-badge ${
                                    product.is_active
                                      ? "pf-badge-success"
                                      : "pf-badge-danger"
                                  }`}
                                >
                                  {product.is_active
                                    ? tCommon(
                                        "active",
                                      )
                                    : tCommon(
                                        "inactive",
                                      )}
                                </span>
                              </td>

                              <td>
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    gap: 6,
                                    flexWrap:
                                      "wrap",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="pf-btn pf-btn-secondary"
                                    onClick={() =>
                                      openEditModal(
                                        product,
                                      )
                                    }
                                  >
                                    {tCommon(
                                      "edit",
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    className="pf-btn pf-btn-secondary"
                                    onClick={() =>
                                      void handleToggleActive(
                                        product,
                                      )
                                    }
                                  >
                                    {product.is_active
                                      ? tCommon(
                                          "inactive",
                                        )
                                      : tCommon(
                                          "active",
                                        )}
                                  </button>

                                  <button
                                    type="button"
                                    className="pf-btn pf-btn-danger"
                                    onClick={() =>
                                      void handleDelete(
                                        product,
                                      )
                                    }
                                  >
                                    {tCommon(
                                      "delete",
                                    )}
                                  </button>
                                </div>
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
                      ? "Inventory overview"
                      : "Vue d'ensemble du stock"}
                  </h2>

                  <p className="pf-card-subtitle">
                    {locale === "en"
                      ? "Key indicators for your current product catalogue."
                      : "Indicateurs clés de votre catalogue de produits actuel."}
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
                    {tStock("units")}
                  </div>

                  <strong
                    style={{
                      fontSize: 22,
                    }}
                  >
                    {totalStockUnits}
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
                    {tProducts("expired")}
                  </div>

                  <strong
                    style={{
                      fontSize: 22,
                    }}
                  >
                    {expiredCount}
                  </strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ======================================================
          MODALE PRODUIT
      ======================================================= */}

      {modalOpen && (
        <div
          className="pf-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="pf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <div className="pf-modal-header">
              <div>
                <h2
                  id="product-modal-title"
                  className="pf-modal-title"
                >
                  {editingProduct
                    ? tProducts(
                        "editProduct",
                      )
                    : tProducts(
                        "addProduct",
                      )}
                </h2>

                <p className="pf-modal-subtitle">
                  {locale === "en"
                    ? "Enter the product information below."
                    : "Renseignez les informations du produit ci-dessous."}
                </p>
              </div>

              <button
                type="button"
                className="pf-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label={tCommon("close")}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="pf-modal-body"
            >
              {error && (
                <div className="pf-alert pf-alert-danger">
                  <div className="pf-alert-icon">
                    !
                  </div>

                  <div>
                    <strong>
                      {tCommon("error")}
                    </strong>

                    <p>{error}</p>
                  </div>
                </div>
              )}

              <div className="pf-form-grid">
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-name"
                  >
                    {tProducts(
                      "productName",
                    )}{" "}
                    *
                  </label>

                  <input
                    id="product-name"
                    className="form-input"
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value,
                      )
                    }
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-generic-name"
                  >
                    {tProducts(
                      "genericName",
                    )}
                  </label>

                  <input
                    id="product-generic-name"
                    className="form-input"
                    value={
                      form.generic_name
                    }
                    onChange={(event) =>
                      updateForm(
                        "generic_name",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-category"
                  >
                    {tProducts("category")}
                  </label>

                  <input
                    id="product-category"
                    className="form-input"
                    value={form.category}
                    onChange={(event) =>
                      updateForm(
                        "category",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-unit"
                  >
                    {tProducts("unit")}
                  </label>

                  <input
                    id="product-unit"
                    className="form-input"
                    value={form.unit}
                    onChange={(event) =>
                      updateForm(
                        "unit",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-barcode"
                  >
                    {tProducts("barcode")}
                  </label>

                  <input
                    id="product-barcode"
                    className="form-input"
                    value={form.barcode}
                    onChange={(event) =>
                      updateForm(
                        "barcode",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-sku"
                  >
                    {tProducts("sku")}
                  </label>

                  <input
                    id="product-sku"
                    className="form-input"
                    value={form.sku}
                    onChange={(event) =>
                      updateForm(
                        "sku",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-purchase-price"
                  >
                    {tProducts(
                      "purchasePrice",
                    )}
                  </label>

                  <input
                    id="product-purchase-price"
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.purchase_price
                    }
                    onChange={(event) =>
                      updateForm(
                        "purchase_price",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-selling-price"
                  >
                    {tProducts(
                      "sellingPrice",
                    )}{" "}
                    *
                  </label>

                  <input
                    id="product-selling-price"
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.selling_price
                    }
                    onChange={(event) =>
                      updateForm(
                        "selling_price",
                        event.target.value,
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-stock"
                  >
                    {tProducts(
                      "stockQuantity",
                    )}
                  </label>

                  <input
                    id="product-stock"
                    className="form-input"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.stock_quantity
                    }
                    onChange={(event) =>
                      updateForm(
                        "stock_quantity",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-minimum-stock"
                  >
                    {tProducts(
                      "minimumStock",
                    )}
                  </label>

                  <input
                    id="product-minimum-stock"
                    className="form-input"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.minimum_stock
                    }
                    onChange={(event) =>
                      updateForm(
                        "minimum_stock",
                        event.target.value,
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="product-expiry"
                  >
                    {tProducts(
                      "expiryDate",
                    )}
                  </label>

                  <input
                    id="product-expiry"
                    className="form-input"
                    type="date"
                    value={
                      form.expiry_date
                    }
                    onChange={(event) =>
                      updateForm(
                        "expiry_date",
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="pf-modal-footer">
                <button
                  type="button"
                  className="pf-btn pf-btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  {tCommon("cancel")}
                </button>

                <button
                  type="submit"
                  className="pf-btn pf-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? tCommon("loading")
                    : editingProduct
                      ? tCommon("update")
                      : tCommon("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
