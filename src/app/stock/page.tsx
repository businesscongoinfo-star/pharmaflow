"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { createClient } from "../lib/supabase/client";

/* ============================================================
   TYPES
============================================================ */

type Product = {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  barcode: string | null;
  sku: string | null;
  unit: string;
  stock_quantity: number;
  minimum_stock: number;
  is_active: boolean;
};

type StockMovement = {
  id: string;
  product_id: string;
  user_id: string | null;
  type: string;
  quantity: number;
  reason: string | null;
  reference: string | null;
  created_at: string;
};

type MovementWithProduct = StockMovement & {
  product?: {
    name: string;
    unit: string;
  } | null;
};

type Pharmacy = {
  id: string;
  name: string;
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
};

type MovementType = "entry" | "exit";

/* ============================================================
   PAGE
============================================================ */

export default function StockPage() {
  const router = useRouter();
  const locale = useLocale();

  const tCommon = useTranslations("common");
  const tNavigation = useTranslations("navigation");
  const tProducts = useTranslations("products");
  const tStock = useTranslations("stock");
  const tErrors = useTranslations("errors");

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  /* ==========================================================
     STATES
  ========================================================== */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [pharmacyId, setPharmacyId] =
    useState<string | null>(null);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [movements, setMovements] =
    useState<MovementWithProduct[]>([]);

  const [search, setSearch] =
    useState("");

  const [movementType, setMovementType] =
    useState<MovementType>("entry");

  const [selectedProductId, setSelectedProductId] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* ==========================================================
     CHARGER LES PRODUITS
  ========================================================== */

  const loadProducts = useCallback(
    async (pharmacyIdValue: string) => {
      const {
        data,
        error: productsError,
      } = await supabase
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
            stock_quantity,
            minimum_stock,
            is_active
          `,
        )
        .eq(
          "pharmacy_id",
          pharmacyIdValue,
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
        );

      if (productsError) {
        throw new Error(
          productsError.message,
        );
      }

      setProducts(
        (data ?? []) as Product[],
      );
    },
    [supabase],
  );

  /* ==========================================================
     CHARGER L'HISTORIQUE
  ========================================================== */

  const loadMovements = useCallback(
    async (pharmacyIdValue: string) => {
      const {
        data,
        error: movementsError,
      } = await supabase
        .from("stock_movements")
        .select(
          `
            id,
            product_id,
            user_id,
            type,
            quantity,
            reason,
            reference,
            created_at,
            products (
              name,
              unit
            )
          `,
        )
        .eq(
          "pharmacy_id",
          pharmacyIdValue,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(100);

      if (movementsError) {
        throw new Error(
          movementsError.message,
        );
      }

      const formatted: MovementWithProduct[] =
        (data ?? []).map(
          (item: any) => ({
            id: item.id,
            product_id:
              item.product_id,
            user_id:
              item.user_id,
            type:
              item.type,
            quantity:
              Number(
                item.quantity ?? 0,
              ),
            reason:
              item.reason ??
              null,
            reference:
              item.reference ??
              null,
            created_at:
              item.created_at,
            product:
              Array.isArray(
                item.products,
              )
                ? item.products[0] ??
                  null
                : item.products ??
                  null,
          }),
        );

      setMovements(
        formatted,
      );
    },
    [supabase],
  );

  /* ==========================================================
     CHARGEMENT INITIAL
  ========================================================== */

  const loadStock = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        /* ----------------------------------------------------
           UTILISATEUR
        ---------------------------------------------------- */

        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          router.replace(
            "/login",
          );
          return;
        }

        setUserId(
          user.id,
        );

        /* ----------------------------------------------------
           PROFIL
        ---------------------------------------------------- */

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              "pharmacy_id",
            )
            .eq(
              "id",
              user.id,
            )
            .maybeSingle();

        if (profileError) {
          throw new Error(
            profileError.message,
          );
        }

        if (
          !profile?.pharmacy_id
        ) {
          throw new Error(
            "PHARMACY_NOT_FOUND",
          );
        }

        setPharmacyId(
          profile.pharmacy_id,
        );

        /* ----------------------------------------------------
           PHARMACIE
        ---------------------------------------------------- */

        const {
          data: pharmacyData,
          error: pharmacyError,
        } =
          await supabase
            .from("pharmacies")
            .select(
              `
                id,
                name,
                city,
                country_code,
                currency_code
              `,
            )
            .eq(
              "id",
              profile.pharmacy_id,
            )
            .maybeSingle();

        if (pharmacyError) {
          throw new Error(
            pharmacyError.message,
          );
        }

        if (!pharmacyData) {
          throw new Error(
            "PHARMACY_NOT_FOUND",
          );
        }

        setPharmacy(
          pharmacyData as Pharmacy,
        );

        /* ----------------------------------------------------
           DONNÉES STOCK
        ---------------------------------------------------- */

        await Promise.all([
          loadProducts(
            profile.pharmacy_id,
          ),
          loadMovements(
            profile.pharmacy_id,
          ),
        ]);
      } catch (err) {
        console.error(
          "Stock loading error:",
          err,
        );

        if (
          err instanceof Error &&
          err.message ===
            "PHARMACY_NOT_FOUND"
        ) {
          setError(
            tErrors(
              "pharmacyNotFound",
            ),
          );
        } else if (
          err instanceof Error &&
          err.message
        ) {
          setError(
            err.message,
          );
        } else {
          setError(
            tErrors(
              "loadFailed",
            ),
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [
      loadMovements,
      loadProducts,
      router,
      supabase,
      tErrors,
    ],
  );

  /* ==========================================================
     INITIALISATION
  ========================================================== */

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  /* ==========================================================
     PRODUIT SÉLECTIONNÉ
  ========================================================== */

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (product) =>
            product.id ===
            selectedProductId,
        ),
      [
        products,
        selectedProductId,
      ],
    );

  /* ==========================================================
     RECHERCHE
  ========================================================== */

  const filteredProducts =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      if (!text) {
        return products;
      }

      return products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(text) ||
          (
            product.generic_name ??
            ""
          )
            .toLowerCase()
            .includes(text) ||
          (
            product.category ??
            ""
          )
            .toLowerCase()
            .includes(text) ||
          (
            product.barcode ??
            ""
          )
            .toLowerCase()
            .includes(text) ||
          (
            product.sku ??
            ""
          )
            .toLowerCase()
            .includes(text),
      );
    }, [
      products,
      search,
    ]);

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const totalProducts =
    products.length;

  const lowStockProducts =
    useMemo(
      () =>
        products.filter(
          (product) => {
            const stock =
              Number(
                product.stock_quantity ??
                  0,
              );

            const minimum =
              Number(
                product.minimum_stock ??
                  0,
              );

            return (
              stock > 0 &&
              stock <= minimum
            );
          },
        ),
      [products],
    );

  const outOfStockProducts =
    useMemo(
      () =>
        products.filter(
          (product) =>
            Number(
              product.stock_quantity ??
                0,
            ) <= 0,
        ),
      [products],
    );

  const totalUnits =
    useMemo(
      () =>
        products.reduce(
          (
            total,
            product,
          ) =>
            total +
            Number(
              product.stock_quantity ??
                0,
            ),
          0,
        ),
      [products],
    );

  /* ==========================================================
     FORMAT DATE
  ========================================================== */

  function formatDate(
    value: string,
  ) {
    try {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return value;
      }

      return new Intl.DateTimeFormat(
        locale === "fr"
          ? "fr-FR"
          : "en-US",
        {
          dateStyle:
            "medium",
          timeStyle:
            "short",
        },
      ).format(date);
    } catch {
      return value;
    }
  }

  /* ==========================================================
     STATUT STOCK
  ========================================================== */

  function getStockStatus(
    product: Product,
  ) {
    const stock =
      Number(
        product.stock_quantity ??
          0,
      );

    const minimum =
      Number(
        product.minimum_stock ??
          0,
      );

    if (stock <= 0) {
      return "out";
    }

    if (stock <= minimum) {
      return "low";
    }

    return "normal";
  }

  /* ==========================================================
     ENREGISTRER UN MOUVEMENT
  ========================================================== */

  async function handleMovement(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    /* --------------------------------------------------------
       SESSION
    -------------------------------------------------------- */

    if (
      !pharmacyId ||
      !userId
    ) {
      setError(
        tErrors(
          "unauthorized",
        ),
      );
      return;
    }

    /* --------------------------------------------------------
       PRODUIT
    -------------------------------------------------------- */

    if (
      !selectedProductId
    ) {
      setError(
        locale === "fr"
          ? "Veuillez sélectionner un produit."
          : "Please select a product.",
      );
      return;
    }

    /* --------------------------------------------------------
       QUANTITÉ
    -------------------------------------------------------- */

    const quantityNumber =
      Number(
        quantity,
      );

    if (
      !Number.isFinite(
        quantityNumber,
      ) ||
      quantityNumber <= 0
    ) {
      setError(
        locale === "fr"
          ? "La quantité doit être un nombre supérieur à zéro."
          : "Quantity must be greater than zero.",
      );
      return;
    }

    if (
      !Number.isInteger(
        quantityNumber,
      )
    ) {
      setError(
        locale === "fr"
          ? "La quantité doit être un nombre entier."
          : "Quantity must be a whole number.",
      );
      return;
    }

    /* --------------------------------------------------------
       PRODUIT
    -------------------------------------------------------- */

    const product =
      products.find(
        (item) =>
          item.id ===
          selectedProductId,
      );

    if (!product) {
      setError(
        tErrors(
          "productNotFound",
        ),
      );
      return;
    }

    const oldStock =
      Number(
        product.stock_quantity ??
          0,
      );

    /* --------------------------------------------------------
       CONTRÔLE SORTIE
    -------------------------------------------------------- */

    if (
      movementType ===
        "exit" &&
      quantityNumber >
        oldStock
    ) {
      setError(
        locale === "fr"
          ? `Stock insuffisant. Il reste ${oldStock} ${product.unit}.`
          : `Insufficient stock. There are ${oldStock} ${product.unit} remaining.`,
      );
      return;
    }

    /* --------------------------------------------------------
       NOUVEAU STOCK
    -------------------------------------------------------- */

    const newStock =
      movementType ===
      "entry"
        ? oldStock +
          quantityNumber
        : oldStock -
          quantityNumber;

    setSaving(true);

    try {
      /* ======================================================
         1. MISE À JOUR DU PRODUIT
      ====================================================== */

      const {
        error: updateError,
      } =
        await supabase
          .from("products")
          .update({
            stock_quantity:
              newStock,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            product.id,
          )
          .eq(
            "pharmacy_id",
            pharmacyId,
          );

      if (updateError) {
        throw new Error(
          locale === "fr"
            ? `Impossible de mettre à jour le stock : ${updateError.message}`
            : `Unable to update stock: ${updateError.message}`,
        );
      }

      /* ======================================================
         2. ENREGISTRER LE MOUVEMENT
      ====================================================== */

      const {
        error:
          movementError,
      } =
        await supabase
          .from(
            "stock_movements",
          )
          .insert({
            pharmacy_id:
              pharmacyId,
            product_id:
              product.id,
            user_id:
              userId,
            type:
              movementType,
            quantity:
              quantityNumber,
            reason:
              reason.trim() ||
              null,
            reference:
              reference.trim() ||
              null,
          });

      /* ======================================================
         ROLLBACK SI ERREUR
      ====================================================== */

      if (movementError) {
        await supabase
          .from("products")
          .update({
            stock_quantity:
              oldStock,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            product.id,
          )
          .eq(
            "pharmacy_id",
            pharmacyId,
          );

        throw new Error(
          locale === "fr"
            ? `Le mouvement n'a pas pu être enregistré : ${movementError.message}`
            : `The movement could not be recorded: ${movementError.message}`,
        );
      }

      /* ======================================================
         SUCCÈS
      ====================================================== */

      if (
        movementType ===
        "entry"
      ) {
        setMessage(
          locale === "fr"
            ? `Entrée enregistrée avec succès. ${product.name} dispose maintenant de ${newStock} ${product.unit}.`
            : `Entry recorded successfully. ${product.name} now has ${newStock} ${product.unit}.`,
        );
      } else {
        setMessage(
          locale === "fr"
            ? `Sortie enregistrée avec succès. ${product.name} dispose maintenant de ${newStock} ${product.unit}.`
            : `Exit recorded successfully. ${product.name} now has ${newStock} ${product.unit}.`,
        );
      }

      /* ======================================================
         RESET
      ====================================================== */

      setSelectedProductId("");
      setQuantity("");
      setReason("");
      setReference("");

      /* ======================================================
         RECHARGEMENT
      ====================================================== */

      await Promise.all([
        loadProducts(
          pharmacyId,
        ),
        loadMovements(
          pharmacyId,
        ),
      ]);
    } catch (err) {
      console.error(
        "Stock movement error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : tErrors(
              "generic",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <main className="pf-stock-page">
        <div className="pf-stock-loading">

          <div className="pf-stock-spinner" />

          <h2>
            {tCommon(
              "loading",
            )}
          </h2>

          <p>
            {tStock(
              "stockDescription",
            )}
          </p>

        </div>
      </main>
    );
  }

  /* ==========================================================
     AFFICHAGE
  ========================================================== */

  return (
    <main className="pf-stock-page">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="pf-stock-header">

        <div className="pf-stock-header-inner">

          <div className="pf-stock-header-left">

            <button
              type="button"
              className="pf-stock-back"
              onClick={() =>
                router.push(
                  "/dashboard",
                )
              }
            >

              <span>
                ←
              </span>

              <span>
                {tNavigation(
                  "dashboard",
                )}
              </span>

            </button>

            <div className="pf-stock-title-row">

              <div className="pf-stock-title-icon">
                📦
              </div>

              <div>

                <h1>
                  {tStock(
                    "title",
                  )}
                </h1>

                <p>
                  {tStock(
                    "stockDescription",
                  )}
                </p>

              </div>

            </div>

          </div>

          <button
            type="button"
            className="pf-stock-refresh"
            onClick={() =>
              void loadStock()
            }
            disabled={saving}
          >

            <span>
              ↻
            </span>

            {tCommon(
              "refresh",
            )}

          </button>

        </div>

      </header>

      <div className="pf-stock-container">

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {message && (
          <div className="pf-stock-alert pf-stock-alert-success">

            <div className="pf-stock-alert-icon">
              ✓
            </div>

            <div className="pf-stock-alert-content">

              <strong>
                {tCommon(
                  "success",
                )}
              </strong>

              <span>
                {message}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              className="pf-stock-alert-close"
              aria-label={tCommon(
                "close",
              )}
            >
              ×
            </button>

          </div>
        )}

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="pf-stock-alert pf-stock-alert-error">

            <div className="pf-stock-alert-icon">
              !
            </div>

            <div className="pf-stock-alert-content">

              <strong>
                {tCommon(
                  "error",
                )}
              </strong>

              <span>
                {error}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="pf-stock-alert-close"
              aria-label={tCommon(
                "close",
              )}
            >
              ×
            </button>

          </div>
        )}

        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <section className="pf-stock-stats">

          {/* PRODUITS */}

          <div className="pf-stock-stat-card">

            <div className="pf-stock-stat-icon pf-stock-stat-icon-teal">
              💊
            </div>

            <div className="pf-stock-stat-content">

              <span>
                {tProducts(
                  "active",
                )}
              </span>

              <strong>
                {totalProducts}
              </strong>

              <small>
                {tStock(
                  "activeReferences",
                )}
              </small>

            </div>

          </div>

          {/* UNITÉS */}

          <div className="pf-stock-stat-card">

            <div className="pf-stock-stat-icon pf-stock-stat-icon-blue">
              📦
            </div>

            <div className="pf-stock-stat-content">

              <span>
                {tStock(
                  "currentUnits",
                )}
              </span>

              <strong>
                {totalUnits.toLocaleString(
                  locale === "fr"
                    ? "fr-FR"
                    : "en-US",
                )}
              </strong>

              <small>
                {tStock(
                  "available",
                )}
              </small>

            </div>

          </div>

          {/* STOCK FAIBLE */}

          <div className="pf-stock-stat-card">

            <div className="pf-stock-stat-icon pf-stock-stat-icon-orange">
              ⚠️
            </div>

            <div className="pf-stock-stat-content">

              <span>
                {tStock(
                  "lowStock",
                )}
              </span>

              <strong>
                {
                  lowStockProducts.length
                }
              </strong>

              <small>
                {tStock(
                  "referencesToWatch",
                )}
              </small>

            </div>

          </div>

          {/* RUPTURE */}

          <div className="pf-stock-stat-card">

            <div className="pf-stock-stat-icon pf-stock-stat-icon-red">
              ×
            </div>

            <div className="pf-stock-stat-content">

              <span>
                {tStock(
                  "outOfStock",
                )}
              </span>

              <strong>
                {
                  outOfStockProducts.length
                }
              </strong>

              <small>
                {tStock(
                  "unavailableProducts",
                )}
              </small>

            </div>

          </div>

        </section>

        {/* ==================================================
            NOUVEAU MOUVEMENT
        ================================================== */}

        <section className="pf-stock-card pf-stock-movement-card">

          <div className="pf-stock-card-header">

            <div>

              <div className="pf-stock-section-label">

                <span>
                  ↔
                </span>

                {tStock(
                  "movement",
                ).toUpperCase()}

              </div>

              <h2>
                {tStock(
                  "newMovement",
                )}
              </h2>

              <p>
                {tStock(
                  "newMovementDescription",
                )}
              </p>

            </div>

          </div>

          <form
            onSubmit={
              handleMovement
            }
            className="pf-stock-movement-form"
          >

            {/* TYPE */}

            <div className="pf-stock-field pf-stock-field-full">

              <label>
                {tStock(
                  "movementType",
                )}
              </label>

              <div className="pf-stock-type-selector">

                <button
                  type="button"
                  className={`pf-stock-type-option ${
                    movementType ===
                    "entry"
                      ? "active-entry"
                      : ""
                  }`}
                  onClick={() =>
                    setMovementType(
                      "entry",
                    )
                  }
                >

                  <span className="pf-stock-type-icon">
                    +
                  </span>

                  <span>

                    <strong>
                      {tStock(
                        "entry",
                      )}
                    </strong>

                    <small>
                      {tStock(
                        "addStock",
                      )}
                    </small>

                  </span>

                </button>

                <button
                  type="button"
                  className={`pf-stock-type-option ${
                    movementType ===
                    "exit"
                      ? "active-exit"
                      : ""
                  }`}
                  onClick={() =>
                    setMovementType(
                      "exit",
                    )
                  }
                >

                  <span className="pf-stock-type-icon">
                    −
                  </span>

                  <span>

                    <strong>
                      {tStock(
                        "exit",
                      )}
                    </strong>

                    <small>
                      {tStock(
                        "removeStock",
                      )}
                    </small>

                  </span>

                </button>

              </div>

            </div>

            {/* PRODUIT */}

            <div className="pf-stock-field">

              <label htmlFor="stock-product">

                {tProducts(
                  "product",
                )}

                {" "}

                <b>
                  *
                </b>

              </label>

              <select
                id="stock-product"
                value={
                  selectedProductId
                }
                onChange={(
                  event,
                ) =>
                  setSelectedProductId(
                    event.target.value,
                  )
                }
                required
              >

                <option value="">
                  {tCommon(
                    "selectOption",
                  )}
                </option>

                {products.map(
                  (
                    product,
                  ) => (
                    <option
                      key={
                        product.id
                      }
                      value={
                        product.id
                      }
                    >
                      {
                        product.name
                      }{" "}
                      —{" "}
                      {tStock(
                        "currentStock",
                      )}
                      :{" "}
                      {
                        product.stock_quantity
                      }{" "}
                      {
                        product.unit
                      }
                    </option>
                  ),
                )}

              </select>

              {selectedProduct && (
                <div className="pf-stock-selected-info">

                  <span>
                    {tStock(
                      "currentStock",
                    )}
                  </span>

                  <strong>
                    {
                      selectedProduct.stock_quantity
                    }{" "}
                    {
                      selectedProduct.unit
                    }
                  </strong>

                </div>
              )}

            </div>

            {/* QUANTITÉ */}

            <div className="pf-stock-field">

              <label htmlFor="stock-quantity">

                {tStock(
                  "quantity",
                )}

                {" "}

                <b>
                  *
                </b>

              </label>

              <input
                id="stock-quantity"
                type="number"
                min="1"
                step="1"
                value={
                  quantity
                }
                onChange={(
                  event,
                ) =>
                  setQuantity(
                    event.target.value,
                  )
                }
                placeholder={
                  locale === "fr"
                    ? "Ex. 20"
                    : "e.g. 20"
                }
                required
              />

              <span className="pf-stock-field-help">

                {locale === "fr"
                  ? "Nombre d'unités à "
                  : "Number of units to "}

                {movementType ===
                "entry"
                  ? locale ===
                    "fr"
                    ? "ajouter."
                    : "add."
                  : locale ===
                    "fr"
                  ? "retirer."
                  : "remove."}

              </span>

            </div>

            {/* MOTIF */}

            <div className="pf-stock-field">

              <label htmlFor="stock-reason">
                {tStock(
                  "reason",
                )}
              </label>

              <input
                id="stock-reason"
                type="text"
                value={
                  reason
                }
                onChange={(
                  event,
                ) =>
                  setReason(
                    event.target.value,
                  )
                }
                placeholder={
                  movementType ===
                  "entry"
                    ? locale ===
                      "fr"
                      ? "Ex. Réception fournisseur"
                      : "e.g. Supplier delivery"
                    : locale ===
                      "fr"
                    ? "Ex. Produit vendu / périmé"
                    : "e.g. Product sold / expired"
                }
              />

            </div>

            {/* RÉFÉRENCE */}

            <div className="pf-stock-field">

              <label htmlFor="stock-reference">
                {tStock(
                  "reference",
                )}
              </label>

              <input
                id="stock-reference"
                type="text"
                value={
                  reference
                }
                onChange={(
                  event,
                ) =>
                  setReference(
                    event.target.value,
                  )
                }
                placeholder={
                  locale === "fr"
                    ? "Ex. BL-2026-001"
                    : "e.g. INV-2026-001"
                }
              />

            </div>

            {/* BOUTON */}

            <div className="pf-stock-form-action">

              <button
                type="submit"
                disabled={
                  saving
                }
                className={
                  movementType ===
                  "entry"
                    ? "pf-stock-submit pf-stock-submit-entry"
                    : "pf-stock-submit pf-stock-submit-exit"
                }
              >

                {saving ? (
                  <>
                    <span className="pf-stock-button-spinner" />

                    {tCommon(
                      "saving",
                    )}
                  </>
                ) : (
                  <>
                    <span>
                      {movementType ===
                      "entry"
                        ? "+"
                        : "−"}
                    </span>

                    {movementType ===
                    "entry"
                      ? tStock(
                          "stockEntry",
                        )
                      : tStock(
                          "stockExit",
                        )}

                  </>
                )}

              </button>

            </div>

          </form>

        </section>

        {/* ==================================================
            STOCK ACTUEL
        ================================================== */}

        <section className="pf-stock-card">

          <div className="pf-stock-card-header pf-stock-current-header">

            <div>

              <div className="pf-stock-section-label">

                <span>
                  ▦
                </span>

                {tStock(
                  "inventory",
                ).toUpperCase()}

              </div>

              <h2>
                {tStock(
                  "currentStock",
                )}
              </h2>

              <p>
                {tStock(
                  "stockDescription",
                )}
              </p>

            </div>

            <div className="pf-stock-search-wrapper">

              <span className="pf-stock-search-icon">
                ⌕
              </span>

              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder={
                  tProducts(
                    "searchProduct",
                  )
                }
                className="pf-stock-search"
                aria-label={
                  tProducts(
                    "searchProduct",
                  )
                }
              />

            </div>

          </div>

          <div className="pf-stock-table-wrapper">

            <table className="pf-stock-table">

              <thead>

                <tr>

                  <th>
                    {tProducts(
                      "product",
                    )}
                  </th>

                  <th>
                    {tProducts(
                      "category",
                    )}
                  </th>

                  <th>
                    {tStock(
                      "stockQuantity",
                    )}
                  </th>

                  <th>
                    {tStock(
                      "minimumStock",
                    )}
                  </th>

                  <th>
                    {tStock(
                      "stockStatus",
                    )}
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredProducts.length ===
                0 ? (

                  <tr>

                    <td
                      colSpan={5}
                      className="pf-stock-empty-cell"
                    >

                      <div className="pf-stock-empty">

                        <div className="pf-stock-empty-icon">
                          🔎
                        </div>

                        <strong>
                          {tProducts(
                            "noProductFound",
                          )}
                        </strong>

                        <span>
                          {tProducts(
                            "noProductFound",
                          )}
                        </span>

                      </div>

                    </td>

                  </tr>

                ) : (

                  filteredProducts.map(
                    (
                      product,
                    ) => {

                      const stock =
                        Number(
                          product.stock_quantity ??
                            0,
                        );

                      const minimum =
                        Number(
                          product.minimum_stock ??
                            0,
                        );

                      const status =
                        getStockStatus(
                          product,
                        );

                      return (
                        <tr
                          key={
                            product.id
                          }
                        >

                          <td>

                            <div className="pf-stock-product">

                              <div className="pf-stock-product-icon">
                                💊
                              </div>

                              <div>

                                <strong>
                                  {
                                    product.name
                                  }
                                </strong>

                                {product.generic_name && (
                                  <span>
                                    {
                                      product.generic_name
                                    }
                                  </span>
                                )}

                                {(
                                  product.sku ||
                                  product.barcode
                                ) && (
                                  <small>
                                    {product.sku
                                      ? `SKU : ${product.sku}`
                                      : `Code : ${product.barcode}`}
                                  </small>
                                )}

                              </div>

                            </div>

                          </td>

                          <td>

                            <span className="pf-stock-category">

                              {
                                product.category ||
                                tStock(
                                  "noCategory",
                                )
                              }

                            </span>

                          </td>

                          <td>

                            <div
                              className={`pf-stock-quantity pf-stock-quantity-${status}`}
                            >

                              <strong>
                                {stock}
                              </strong>

                              <span>
                                {
                                  product.unit
                                }
                              </span>

                            </div>

                          </td>

                          <td>

                            <span className="pf-stock-minimum">

                              {
                                minimum
                              }{" "}

                              {
                                product.unit
                              }

                            </span>

                          </td>

                          <td>

                            {status ===
                            "out" ? (

                              <span className="pf-stock-badge pf-stock-badge-out">

                                <i />

                                {
                                  tStock(
                                    "outOfStock",
                                  )
                                }

                              </span>

                            ) : status ===
                              "low" ? (

                              <span className="pf-stock-badge pf-stock-badge-low">

                                <i />

                                {
                                  tStock(
                                    "lowStock",
                                  )
                                }

                              </span>

                            ) : (

                              <span className="pf-stock-badge pf-stock-badge-normal">

                                <i />

                                {
                                  tStock(
                                    "available",
                                  )
                                }

                              </span>

                            )}

                          </td>

                        </tr>
                      );
                    },
                  )

                )}

              </tbody>

            </table>

          </div>

          <div className="pf-stock-table-footer">

            <span>

              {filteredProducts.length}{" "}

              {tProducts(
                "products",
              )}

            </span>

            <span>

              {totalProducts}{" "}

              {tStock(
                "activeReferences",
              )}

            </span>

          </div>

        </section>

        {/* ==================================================
            HISTORIQUE
        ================================================== */}

        <section className="pf-stock-card pf-stock-history-card">

          <div className="pf-stock-card-header">

            <div>

              <div className="pf-stock-section-label">

                <span>
                  ↔
                </span>

                {tStock(
                  "history",
                ).toUpperCase()}

              </div>

              <h2>
                {tStock(
                  "movementHistory",
                )}
              </h2>

              <p>
                {tStock(
                  "historyDescription",
                )}
              </p>

            </div>

          </div>

          <div className="pf-stock-table-wrapper">

            <table className="pf-stock-table pf-stock-history-table">

              <thead>

                <tr>

                  <th>
                    {tStock(
                      "date",
                    )}
                  </th>

                  <th>
                    {tProducts(
                      "product",
                    )}
                  </th>

                  <th>
                    {tStock(
                      "movementType",
                    )}
                  </th>

                  <th>
                    {tStock(
                      "quantity",
                    )}
                  </th>

                  <th>
                    {tStock(
                      "reason",
                    )}
                  </th>

                  <th>
                    {tStock(
                      "reference",
                    )}
                  </th>

                </tr>

              </thead>

              <tbody>

                {movements.length ===
                0 ? (

                  <tr>

                    <td
                      colSpan={6}
                      className="pf-stock-empty-cell"
                    >

                      <div className="pf-stock-empty">

                        <div className="pf-stock-empty-icon">
                          ↔
                        </div>

                        <strong>
                          {tStock(
                            "noMovements",
                          )}
                        </strong>

                        <span>
                          {tStock(
                            "noMovements",
                          )}
                        </span>

                      </div>

                    </td>

                  </tr>

                ) : (

                  movements.map(
                    (
                      movement,
                    ) => {

                      const isEntry =
                        movement.type ===
                        "entry";

                      return (
                        <tr
                          key={
                            movement.id
                          }
                        >

                          <td>

                            <span className="pf-stock-date">

                              {formatDate(
                                movement.created_at,
                              )}

                            </span>

                          </td>

                          <td>

                            <div className="pf-stock-history-product">

                              <strong>
                                {
                                  movement
                                    .product
                                    ?.name ??
                                  tProducts(
                                    "product",
                                  )
                                }
                              </strong>

                              {movement.product?.unit && (
                                <span>

                                  {tProducts(
                                    "unit",
                                  )}
                                  :{" "}

                                  {
                                    movement
                                      .product
                                      .unit
                                  }

                                </span>
                              )}

                            </div>

                          </td>

                          <td>

                            {isEntry ? (

                              <span className="pf-stock-movement-badge pf-stock-movement-entry">

                                <span>
                                  +
                                </span>

                                {
                                  tStock(
                                    "entry",
                                  )
                                }

                              </span>

                            ) : (

                              <span className="pf-stock-movement-badge pf-stock-movement-exit">

                                <span>
                                  −
                                </span>

                                {
                                  tStock(
                                    "exit",
                                  )
                                }

                              </span>

                            )}

                          </td>

                          <td>

                            <strong
                              className={
                                isEntry
                                  ? "pf-stock-history-quantity pf-stock-history-quantity-entry"
                                  : "pf-stock-history-quantity pf-stock-history-quantity-exit"
                              }
                            >

                              {isEntry
                                ? "+"
                                : "−"}

                              {
                                movement.quantity
                              }

                            </strong>

                          </td>

                          <td>

                            <span className="pf-stock-history-text">

                              {
                                movement.reason ||
                                "—"
                              }

                            </span>

                          </td>

                          <td>

                            <span className="pf-stock-reference">

                              {
                                movement.reference ||
                                "—"
                              }

                            </span>

                          </td>

                        </tr>
                      );
                    },
                  )

                )}

              </tbody>

            </table>

          </div>

          <div className="pf-stock-history-footer">

            <span>

              {locale === "fr"
                ? `Affichage des ${Math.min(
                    movements.length,
                    100,
                  )} derniers mouvements`
                : `Showing the last ${Math.min(
                    movements.length,
                    100,
                  )} movements`}

            </span>

          </div>

        </section>

        {/* ==================================================
            SÉCURITÉ
        ================================================== */}

        <div className="pf-stock-security-note">

          <div className="pf-stock-security-icon">
            ✓
          </div>

          <div>

            <strong>

              {locale === "fr"
                ? "Gestion sécurisée du stock"
                : "Secure stock management"}

            </strong>

            <span>

              {locale === "fr"
                ? "Chaque mouvement est associé à votre pharmacie et à l'utilisateur connecté afin de conserver une traçabilité complète."
                : "Each movement is associated with your pharmacy and the logged-in user to maintain complete traceability."}

            </span>

          </div>

        </div>

      </div>

    </main>
  );
}