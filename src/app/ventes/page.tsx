"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "../lib/supabase/client";

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
  is_active: boolean;
};

type CartItem = {
  product_id: string;
  name: string;
  unit: string;
  unit_price: number;
  quantity: number;
  discount: number;
  total: number;
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

type Pharmacy = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
};

type StockFilter =
  | "all"
  | "available"
  | "low"
  | "out";

type ReceiptData = {
  saleNumber: string;
  createdAt: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyCity: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  subtotal: number;
  itemDiscount: number;
  globalDiscount: number;
  tax: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: string;
  currency: string;
  notes: string;
};

type PaymentMethod = {
  value: string;
  icon: string;
  label: string;
};

export default function VentesPage() {
  const router = useRouter();
  const locale = useLocale();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const isEnglish = locale === "en";

  /*
   * =========================================================
   * TRADUCTIONS LOCALES
   * =========================================================
   *
   * Cette page ne dépend d'aucun fichier supplémentaire.
   * La langue active de next-intl détermine automatiquement
   * l'affichage.
   */

  const text = useMemo(
    () => {
      if (isEnglish) {
        return {
          back: "Back",
          newSale: "New sale",
          newSaleDescription:
            "Select available products and proceed to checkout.",
          refresh: "Refresh",
          refreshing: "Refreshing…",
          productsButton: "+ Products",

          products: "Products",
          available: "Available",
          lowStock: "Low stock",
          outOfStock: "Out of stock",

          pharmacyProducts:
            "Products in your pharmacy",
          pharmacyProductsDescription:
            "Click on a product to add it to the cart.",
          product: "product",
          productsPlural: "products",

          searchPlaceholder:
            "Search for a medicine, barcode, SKU…",

          allCategories: "All categories",
          all: "All",
          availableFilter: "Available",
          lowFilter: "Low stock",
          outFilter: "Out of stock",

          noProductFound:
            "No product found",
          noProductMatch:
            "No medicine matches the selected filters.",
          reset: "Reset",

          stock: "Stock",
          sku: "SKU",
          inCart: "in cart",
          addToCart: "+ Add to cart",
          stockOut: "Out of stock",

          cart: "Cart",
          article: "item",
          articles: "items",
          clear: "Clear",

          emptyCart: "Empty cart",
          emptyCartDescription:
            "Select a product to start the sale.",

          remove: "Remove",
          itemDiscount: "Item discount",

          customerInformation:
            "Customer information",
          optional: "Optional",
          customerName:
            "Customer name",
          customerPhone:
            "Phone",
          saleNote:
            "Sale note",

          subtotal: "Subtotal",
          itemDiscounts:
            "Item discounts",
          globalDiscount:
            "Global discount",
          taxes: "Taxes",
          total: "TOTAL",

          checkout:
            "Checkout",
          checkoutDescription:
            "Finalize the sale payment.",

        payment: "Payment",
        paymentMethod:
          "Payment method",
        amountReceived:
          "Amount received",
        exact: "Exact",
        rounded: "Rounded",
        plus5000: "+5000",
        change: "Change",
        remaining: "Amount remaining",

        cancel: "Cancel",
        confirmSale:
          "Confirm sale",
        saving: "Saving…",

        recentSales:
          "Recent sales",
        recentSalesDescription:
          "The last 20 recorded sales.",
        dashboard:
          "Dashboard",
        noSales:
          "No sales recorded yet.",

        saleNumber:
          "Sale number",
        date: "Date",
        customer:
          "Customer",
        status:
          "Status",
        completed:
          "Completed",
        counterCustomer:
          "Counter customer",

        saleSaved:
          "Sale {number} successfully recorded.",

        loading:
          "Loading checkout…",
        loadingDescription:
          "Preparing your sales workspace.",

        dataUpdated:
          "Data updated.",
        sessionError:
          "Your session or pharmacy could not be found.",
        pharmacyMissing:
          "No pharmacy is associated with your account.",
        cartEmpty:
          "The cart is empty.",
        addProduct:
          "Add at least one product to the cart.",
        totalInvalid:
          "The total amount must be greater than zero.",
        amountInsufficient:
          "Insufficient amount. Missing {amount}.",
        productMissing:
          "Product not found: {product}.",
        stockInsufficient:
          "Insufficient stock for {product}. Available: {quantity}.",
        catalogueMissing:
          "Product not found in the catalogue: {product}.",
        saleCreationError:
          "Unable to create the sale.",
        saleItemsError:
          "Sale created but sale items could not be saved: {error}",
        paymentError:
          "Sale items saved but payment could not be saved: {error}",
        stockUpdateError:
          "Unable to update stock for {product}: {error}",
        movementError:
          "Stock updated but movement could not be recorded for {product}: {error}",
        genericCheckoutError:
          "An error occurred during checkout.",
        loadError:
          "Unable to load the sales page.",
        refreshError:
          "Unable to refresh the data.",

        saleReceipt:
          "SALES RECEIPT",
        receiptReady:
          "The receipt is ready to print.",
        phone:
          "Phone",
        note:
          "Note",
        received:
          "Amount received",
        changeLabel:
          "Change",
        thankYou:
          "THANK YOU FOR YOUR VISIT",
        generatedBy:
          "Receipt generated by PharmaFlow",
        printReceipt:
          "🖨️ Print receipt",
        close:
          "Close",
        receipt:
          "Receipt",

        popUpError:
          "The browser blocked the print window. Please allow pop-ups for PharmaFlow.",
      };
    }

    return {
      back: "Retour",
      newSale: "Nouvelle vente",
      newSaleDescription:
        "Sélectionnez les produits disponibles et procédez à l'encaissement.",
      refresh: "Actualiser",
      refreshing: "Actualisation…",
      productsButton: "+ Produits",

      products: "Produits",
      available: "Disponibles",
      lowStock: "Stock faible",
      outOfStock: "Ruptures",

      pharmacyProducts:
        "Produits de votre pharmacie",
      pharmacyProductsDescription:
        "Cliquez sur un produit pour l'ajouter au panier.",
      product: "produit",
      productsPlural: "produits",

      searchPlaceholder:
        "Rechercher un médicament, code-barres, SKU…",

      allCategories: "Toutes les catégories",
      all: "Tous",
      availableFilter: "Disponibles",
      lowFilter: "Stock faible",
      outFilter: "Rupture",

      noProductFound:
        "Aucun produit trouvé",
      noProductMatch:
        "Aucun médicament ne correspond aux filtres sélectionnés.",
      reset: "Réinitialiser",

      stock: "Stock",
      sku: "SKU",
      inCart: "dans le panier",
      addToCart: "+ Ajouter au panier",
      stockOut: "Rupture de stock",

      cart: "Panier",
      article: "article",
      articles: "articles",
      clear: "Vider",

      emptyCart: "Panier vide",
      emptyCartDescription:
        "Sélectionnez un produit pour commencer la vente.",

      remove: "Retirer",
      itemDiscount: "Remise article",

      customerInformation:
        "Informations client",
      optional: "Facultatif",
      customerName:
        "Nom du client",
      customerPhone:
        "Téléphone",
      saleNote:
        "Note de la vente",

      subtotal: "Sous-total",
      itemDiscounts:
        "Remises articles",
      globalDiscount:
        "Remise globale",
      taxes: "Taxes",
      total: "TOTAL",

      checkout:
        "Encaisser la vente",
      checkoutDescription:
        "Finalisez le paiement de la vente.",

      payment: "Paiement",
      paymentMethod:
        "Mode de paiement",
      amountReceived:
        "Montant reçu",
      exact: "Exact",
      rounded: "Arrondi",
      plus5000: "+5000",
      change: "Monnaie à rendre",
      remaining: "Montant restant",

      cancel: "Annuler",
      confirmSale:
        "Confirmer la vente",
      saving: "Enregistrement…",

      recentSales:
        "Ventes récentes",
      recentSalesDescription:
        "Les 20 dernières ventes enregistrées.",
      dashboard:
        "Tableau de bord",
      noSales:
        "Aucune vente enregistrée pour le moment.",

      saleNumber:
        "N° Vente",
      date: "Date",
      customer:
        "Client",
      status:
        "Statut",
      completed:
        "Terminée",
      counterCustomer:
        "Client comptoir",

      saleSaved:
        "Vente {number} enregistrée avec succès.",

      loading:
        "Chargement de la caisse…",
      loadingDescription:
        "Préparation de votre espace de vente.",

      dataUpdated:
        "Données actualisées.",
      sessionError:
        "Votre session ou votre pharmacie est introuvable.",
      pharmacyMissing:
        "Aucune pharmacie n'est associée à votre compte.",
      cartEmpty:
        "Le panier est vide.",
      addProduct:
        "Ajoutez au moins un produit au panier.",
      totalInvalid:
        "Le montant total doit être supérieur à zéro.",
      amountInsufficient:
        "Montant insuffisant. Il manque {amount}.",
      productMissing:
        "Produit introuvable : {product}.",
      stockInsufficient:
        "Stock insuffisant pour {product}. Disponible : {quantity}.",
      catalogueMissing:
        "Produit introuvable dans le catalogue : {product}.",
      saleCreationError:
        "Impossible de créer la vente.",
      saleItemsError:
        "Vente créée mais impossible d'enregistrer les articles : {error}",
      paymentError:
        "Articles enregistrés mais impossible d'enregistrer le paiement : {error}",
      stockUpdateError:
        "Impossible de mettre à jour le stock de {product} : {error}",
      movementError:
        "Stock mis à jour mais mouvement non enregistré pour {product} : {error}",
      genericCheckoutError:
        "Une erreur est survenue pendant l'encaissement.",
      loadError:
        "Impossible de charger la page de vente.",
      refreshError:
        "Impossible d'actualiser les données.",

      saleReceipt:
        "REÇU DE VENTE",
      receiptReady:
        "Le reçu est prêt à être imprimé.",
      phone:
        "Téléphone",
      note:
        "Note",
      received:
        "Montant reçu",
      changeLabel:
        "Monnaie",
      thankYou:
        "MERCI POUR VOTRE VISITE",
      generatedBy:
        "Reçu généré par PharmaFlow",
      printReceipt:
        "🖨️ Imprimer le reçu",
      close:
        "Fermer",
      receipt:
        "Reçu",

      popUpError:
        "Le navigateur a bloqué la fenêtre d'impression. Autorisez les fenêtres pop-up pour PharmaFlow.",
    };
  },
  [isEnglish]
);

const paymentMethods: PaymentMethod[] =
  useMemo(
    () =>
      isEnglish
        ? [
            {
              value: "cash",
              label: "Cash",
              icon: "💵",
            },
            {
              value: "mobile_money",
              label: "Mobile Money",
              icon: "📱",
            },
            {
              value: "card",
              label: "Card",
              icon: "💳",
            },
            {
              value: "bank_transfer",
              label: "Bank transfer",
              icon: "🏦",
            },
            {
              value: "other",
              label: "Other",
              icon: "•••",
            },
          ]
        : [
            {
              value: "cash",
              label: "Espèces",
              icon: "💵",
            },
            {
              value: "mobile_money",
              label: "Mobile Money",
              icon: "📱",
            },
            {
              value: "card",
              label: "Carte",
              icon: "💳",
            },
            {
              value: "bank_transfer",
              label: "Virement",
              icon: "🏦",
            },
            {
              value: "other",
              label: "Autre",
              icon: "•••",
            },
          ],
    [isEnglish]
  );

const paymentLabels = useMemo(
  () => {
    return paymentMethods.reduce(
      (result, method) => {
        result[method.value] = method.label;

        return result;
      },
      {} as Record<string, string>
    );
  },
  [paymentMethods]
);

  const [userId, setUserId] =
    useState("");

  const [pharmacyId, setPharmacyId] =
    useState("");

  const [pharmacy, setPharmacy] =
    useState<Pharmacy | null>(null);

  const [currency, setCurrency] =
    useState("XAF");

  const [products, setProducts] =
    useState<Product[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [search, setSearch] =
    useState("");

  // Champ dédié aux douchettes/scanners code-barres USB ou Bluetooth.
  // La plupart des scanners se comportent comme un clavier et envoient
  // le code suivi de la touche Entrée.
  const [barcodeScan, setBarcodeScan] =
    useState("");

  const barcodeInputRef =
    useRef<HTMLInputElement>(null);

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [stockFilter, setStockFilter] =
    useState<StockFilter>("all");

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [discount, setDiscount] =
    useState(0);

  const [amountPaid, setAmountPaid] =
    useState(0);

  const [paymentMethod, setPaymentMethod] =
    useState("cash");

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [showCheckout, setShowCheckout] =
    useState(false);

  const [receipt, setReceipt] =
    useState<ReceiptData | null>(null);

  /*
   * =========================================================
   * UTILITAIRES
   * =========================================================
   */

  function interpolate(
    value: string,
    params: Record<string, string | number>
  ) {
    return value.replace(
      /\{(\w+)\}/g,
      (_, key: string) =>
        String(params[key] ?? "")
    );
  }

  function formatMoney(value: number) {
    return `${new Intl.NumberFormat(
      isEnglish ? "en" : "fr-FR",
      {
        maximumFractionDigits: 0,
      }
    ).format(Math.round(value))} ${currency}`;
  }

  function formatReceiptMoney(
    value: number,
    receiptCurrency: string
  ) {
    return `${new Intl.NumberFormat(
      isEnglish ? "en" : "fr-FR",
      {
        maximumFractionDigits: 0,
      }
    ).format(Math.round(value))} ${receiptCurrency}`;
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      isEnglish ? "en" : "fr-FR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    ).format(new Date(date));
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function paymentLabel(value: string) {
    return (
      paymentLabels[value] ||
      value
    );
  }

  /*
   * =========================================================
   * CHARGEMENT INITIAL
   * =========================================================
   */

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("pharmacy_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(
          profileError.message
        );
      }

      if (!profile?.pharmacy_id) {
        throw new Error(
          text.pharmacyMissing
        );
      }

      setPharmacyId(
        profile.pharmacy_id
      );

      const {
        data: pharmacyData,
        error: pharmacyError,
      } = await supabase
        .from("pharmacies")
        .select(
          `
          id,
          name,
          address,
          city,
          country_code,
          currency_code
        `
        )
        .eq(
          "id",
          profile.pharmacy_id
        )
        .single();

      if (pharmacyError) {
        throw new Error(
          pharmacyError.message
        );
      }

      if (pharmacyData) {
        const currentPharmacy =
          pharmacyData as Pharmacy;

        setPharmacy(
          currentPharmacy
        );

        if (
          currentPharmacy.currency_code
        ) {
          setCurrency(
            currentPharmacy.currency_code
          );
        }
      }

      await Promise.all([
        loadProducts(
          profile.pharmacy_id
        ),
        loadSales(
          profile.pharmacy_id
        ),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : text.loadError
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * PRODUITS
   * =========================================================
   */

  async function loadProducts(
    id = pharmacyId
  ) {
    if (!id) return;

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
        selling_price,
        stock_quantity,
        minimum_stock,
        is_active
      `
      )
      .eq("pharmacy_id", id)
      .eq("is_active", true)
      .order("name", {
        ascending: true,
      });

    if (productsError) {
      throw new Error(
        productsError.message
      );
    }

    setProducts(
      (data || []) as Product[]
    );
  }

  /*
   * =========================================================
   * VENTES
   * =========================================================
   */

  async function loadSales(
    id = pharmacyId
  ) {
    if (!id) return;

    const {
      data,
      error: salesError,
    } = await supabase
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
      .eq("pharmacy_id", id)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (salesError) {
      throw new Error(
        salesError.message
      );
    }

    setSales(
      (data || []) as Sale[]
    );
  }

  async function refreshPage() {
    if (!pharmacyId) return;

    setRefreshing(true);
    setError("");

    try {
      await Promise.all([
        loadProducts(pharmacyId),
        loadSales(pharmacyId),
      ]);

      setMessage(
        text.dataUpdated
      );

      setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : text.refreshError
      );
    } finally {
      setRefreshing(false);
    }
  }

  /*
   * =========================================================
   * CATÉGORIES
   * =========================================================
   */

  const categories = useMemo(() => {
    const values: string[] = products
      .map(
        (product) =>
          product.category
      )
      .filter(
        (
          category
        ): category is string =>
          Boolean(category)
      );

    return Array.from(
      new Set(values)
    ).sort((a, b) =>
      a.localeCompare(
        b,
        isEnglish ? "en" : "fr"
      )
    );
  }, [
    products,
    isEnglish,
  ]);

  /*
   * =========================================================
   * STATISTIQUES
   * =========================================================
   */

  const availableCount =
    products.filter(
      (product) =>
        product.stock_quantity > 0
    ).length;

  const lowStockCount =
    products.filter(
      (product) =>
        product.stock_quantity > 0 &&
        product.stock_quantity <=
          product.minimum_stock
    ).length;

  const outOfStockCount =
    products.filter(
      (product) =>
        product.stock_quantity <= 0
    ).length;

  /*
   * =========================================================
   * FILTRAGE
   * =========================================================
   */

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return products.filter(
        (product) => {
          const matchesSearch =
            !query ||
            product.name
              .toLowerCase()
              .includes(query) ||
            (
              product.generic_name ||
              ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              product.category ||
              ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              product.barcode ||
              ""
            )
              .toLowerCase()
              .includes(query) ||
            (
              product.sku ||
              ""
            )
              .toLowerCase()
              .includes(query);

          const matchesCategory =
            categoryFilter === "all" ||
            product.category ===
              categoryFilter;

          let matchesStock = true;

          if (
            stockFilter ===
            "available"
          ) {
            matchesStock =
              product.stock_quantity >
              0;
          }

          if (
            stockFilter === "low"
          ) {
            matchesStock =
              product.stock_quantity >
                0 &&
              product.stock_quantity <=
                product.minimum_stock;
          }

          if (
            stockFilter === "out"
          ) {
            matchesStock =
              product.stock_quantity <=
              0;
          }

          return (
            matchesSearch &&
            matchesCategory &&
            matchesStock
          );
        }
      );
    }, [
      products,
      search,
      categoryFilter,
      stockFilter,
    ]);

  /*
   * =========================================================
   * PANIER
   * =========================================================
   */

  function getCartQuantity(
    productId: string
  ) {
    return (
      cart.find(
        (item) =>
          item.product_id ===
          productId
      )?.quantity || 0
    );
  }

  function addToCart(
    product: Product
  ) {
    setError("");
    setMessage("");

    if (
      product.stock_quantity <= 0
    ) {
      setError(
        interpolate(
          text.stockInsufficient,
          {
            product:
              product.name,
            quantity: 0,
          }
        )
      );
      return;
    }

    const existing =
      cart.find(
        (item) =>
          item.product_id ===
          product.id
      );

    if (existing) {
      if (
        existing.quantity >=
        product.stock_quantity
      ) {
        setError(
          interpolate(
            text.stockInsufficient,
            {
              product:
                product.name,
              quantity:
                product.stock_quantity,
            }
          )
        );
        return;
      }

      updateQuantity(
        product.id,
        existing.quantity + 1
      );

      return;
    }

    const item: CartItem = {
      product_id:
        product.id,
      name: product.name,
      unit: product.unit,
      unit_price: Number(
        product.selling_price
      ),
      quantity: 1,
      discount: 0,
      total: Number(
        product.selling_price
      ),
    };

    setCart((current) => [
      ...current,
      item,
    ]);

    setMessage(
      isEnglish
        ? `${product.name} added to cart.`
        : `${product.name} ajouté au panier.`
    );

    setTimeout(() => {
      setMessage("");
    }, 1800);
  }

  /*
   * =========================================================
   * SCANNER CODE-BARRES
   * =========================================================
   *
   * Un scanner USB/Bluetooth envoie généralement :
   *   1. le code-barres
   *   2. puis Entrée
   *
   * On recherche d'abord le code-barres exact, puis le SKU.
   * Chaque scan ajoute le produit au panier.
   * Aucun paiement et aucune vente ne sont enregistrés
   * pendant le scan. La validation intervient uniquement
   * depuis le bouton d'encaissement.
   */

  function focusBarcodeScanner() {
    if (typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    });
  }

  async function handleBarcodeScan(rawCode: string) {
    const code = rawCode.trim();

    if (!code || processing) {
      focusBarcodeScanner();
      return;
    }

    setError("");
    setMessage("");

    const normalizedCode = code.toLowerCase();

    const product = products.find((item) => {
      const barcode = (item.barcode || "").trim().toLowerCase();
      const sku = (item.sku || "").trim().toLowerCase();
      return barcode === normalizedCode || sku === normalizedCode;
    });

    if (!product) {
      setBarcodeScan("");
      focusBarcodeScanner();
      setError(
        isEnglish
          ? `Product not found for barcode: ${code}`
          : `Produit introuvable pour le code-barres : ${code}`
      );
      return;
    }

    if (product.stock_quantity <= 0) {
      setBarcodeScan("");
      focusBarcodeScanner();
      setError(
        interpolate(text.stockInsufficient, {
          product: product.name,
          quantity: 0,
        })
      );
      return;
    }

    const existingItem = cart.find(
      (item) => item.product_id === product.id
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;

      if (newQuantity > product.stock_quantity) {
        setBarcodeScan("");
        focusBarcodeScanner();
        setError(
          interpolate(text.stockInsufficient, {
            product: product.name,
            quantity: product.stock_quantity,
          })
        );
        return;
      }

      setCart((current) =>
        current.map((item) => {
          if (item.product_id !== product.id) return item;

          const total =
            item.unit_price * newQuantity - item.discount;

          return {
            ...item,
            quantity: newQuantity,
            total: Math.max(0, total),
          };
        })
      );

      setBarcodeScan("");
      focusBarcodeScanner();
      setMessage(
        isEnglish
          ? `${product.name} — quantity ${newQuantity}`
          : `${product.name} — quantité ${newQuantity}`
      );

      setTimeout(() => setMessage(""), 1800);
      return;
    }

    const newItem: CartItem = {
      product_id: product.id,
      name: product.name,
      unit: product.unit,
      unit_price: Number(product.selling_price),
      quantity: 1,
      discount: 0,
      total: Number(product.selling_price),
    };

    setCart((current) => [...current, newItem]);
    setBarcodeScan("");
    focusBarcodeScanner();

    setMessage(
      isEnglish
        ? `${product.name} added to cart`
        : `${product.name} ajouté au panier`
    );

    setTimeout(() => setMessage(""), 1800);
  }

  function handleBarcodeKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    void handleBarcodeScan(barcodeScan);
  }

  function updateQuantity(
    productId: string,
    quantity: number
  ) {
    const product =
      products.find(
        (item) =>
          item.id === productId
      );

    if (!product) return;

    if (quantity <= 0) {
      removeFromCart(
        productId
      );
      return;
    }

    if (
      quantity >
      product.stock_quantity
    ) {
      setError(
        interpolate(
          text.stockInsufficient,
          {
            product:
              product.name,
            quantity:
              product.stock_quantity,
          }
        )
      );
      return;
    }

    setCart((current) =>
      current.map((item) => {
        if (
          item.product_id !==
          productId
        ) {
          return item;
        }

        const total =
          item.unit_price *
            quantity -
          item.discount;

        return {
          ...item,
          quantity,
          total: Math.max(
            0,
            total
          ),
        };
      })
    );

    setError("");
  }

  function updateItemDiscount(
    productId: string,
    value: number
  ) {
    setCart((current) =>
      current.map((item) => {
        if (
          item.product_id !==
          productId
        ) {
          return item;
        }

        const maximum =
          item.unit_price *
          item.quantity;

        const safeDiscount =
          Math.min(
            Math.max(
              0,
              value
            ),
            maximum
          );

        return {
          ...item,
          discount:
            safeDiscount,
          total: Math.max(
            0,
            maximum -
              safeDiscount
          ),
        };
      })
    );
  }

  function removeFromCart(
    productId: string
  ) {
    setCart((current) =>
      current.filter(
        (item) =>
          item.product_id !==
          productId
      )
    );
  }

  function clearCart() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setDiscount(0);
    setAmountPaid(0);
    setPaymentMethod("cash");
    setShowCheckout(false);
    setError("");
    setMessage("");
  }

  /*
   * =========================================================
   * CALCULS
   * =========================================================
   */

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          item.unit_price *
            item.quantity,
        0
      ),
    [cart]
  );

  const itemDiscount =
    useMemo(
      () =>
        cart.reduce(
          (sum, item) =>
            sum +
            item.discount,
          0
        ),
      [cart]
    );

  const totalBeforeGlobalDiscount =
    subtotal - itemDiscount;

  const safeGlobalDiscount =
    Math.min(
      Math.max(
        0,
        Number(discount) || 0
      ),
      Math.max(
        0,
        totalBeforeGlobalDiscount
      )
    );

  const tax = 0;

  const total = Math.max(
    0,
    totalBeforeGlobalDiscount -
      safeGlobalDiscount +
      tax
  );

  const change = Math.max(
    0,
    Number(amountPaid) -
      total
  );

  const remaining = Math.max(
    0,
    total -
      Number(amountPaid)
  );

  /*
   * =========================================================
   * STATUT STOCK
   * =========================================================
   */

  function getStockStatus(
    product: Product
  ) {
    if (
      product.stock_quantity <= 0
    ) {
      return {
        label:
          text.outOfStock,
        className:
          "pf-sales-stock-out",
      };
    }

    if (
      product.stock_quantity <=
      product.minimum_stock
    ) {
      return {
        label:
          text.lowStock,
        className:
          "pf-sales-stock-low",
      };
    }

    return {
      label:
        text.available,
      className:
        "pf-sales-stock-good",
    };
  }

  /*
   * =========================================================
   * NUMÉRO DE VENTE
   * =========================================================
   */

  function generateSaleNumber() {
    const now = new Date();

    const date =
      now
        .toISOString()
        .slice(0, 10)
        .replaceAll(
          "-",
          ""
        );

    const time =
      now
        .toTimeString()
        .slice(0, 8)
        .replaceAll(
          ":",
          ""
        );

    return `VTE-${date}-${time}`;
  }

  /*
   * =========================================================
   * OUVRIR ENCAISSEMENT
   * =========================================================
   */

  function openCheckout() {
    setError("");
    setMessage("");

    if (cart.length === 0) {
      setError(
        text.addProduct
      );
      return;
    }

    if (total <= 0) {
      setError(
        text.totalInvalid
      );
      return;
    }

    setAmountPaid(total);
    setShowCheckout(true);
  }

  /*
   * =========================================================
   * ENCAISSEMENT
   * =========================================================
   */

  async function completeSale(
    cartOverride?: CartItem[],
    totalsOverride?: {
      subtotal: number;
      itemDiscount: number;
      globalDiscount: number;
      tax: number;
      total: number;
      amountPaid: number;
    }
  ) {
    const saleCart = cartOverride ?? cart;
    const saleSubtotal =
      totalsOverride?.subtotal ?? subtotal;
    const saleItemDiscount =
      totalsOverride?.itemDiscount ?? itemDiscount;
    const saleGlobalDiscount =
      totalsOverride?.globalDiscount ?? safeGlobalDiscount;
    const saleTax =
      totalsOverride?.tax ?? tax;
    const saleTotal =
      totalsOverride?.total ?? total;
    const saleAmountPaid =
      Number(
        totalsOverride?.amountPaid ?? amountPaid
      );
    const saleChange = Math.max(
      0,
      saleAmountPaid - saleTotal
    );
    const saleRemaining = Math.max(
      0,
      saleTotal - saleAmountPaid
    );

    if (!userId || !pharmacyId) {
      setError(text.sessionError);
      return;
    }

    if (saleCart.length === 0) {
      setError(text.cartEmpty);
      return;
    }

    if (saleAmountPaid < saleTotal) {
      setError(
        interpolate(text.amountInsufficient, {
          amount: formatMoney(saleRemaining),
        })
      );
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      // Vérification finale du stock directement dans Supabase.
      for (const item of saleCart) {
        const { data: currentProduct, error: stockError } =
          await supabase
            .from("products")
            .select("id, name, stock_quantity")
            .eq("id", item.product_id)
            .eq("pharmacy_id", pharmacyId)
            .single();

        if (stockError || !currentProduct) {
          throw new Error(
            interpolate(text.productMissing, {
              product: item.name,
            })
          );
        }

        if (
          Number(currentProduct.stock_quantity) <
          item.quantity
        ) {
          throw new Error(
            interpolate(text.stockInsufficient, {
              product: item.name,
              quantity: currentProduct.stock_quantity,
            })
          );
        }
      }

      const saleNumber = generateSaleNumber();
      const saleCreatedAt = new Date().toISOString();

      const { data: sale, error: saleError } =
        await supabase
          .from("sales")
          .insert({
            pharmacy_id: pharmacyId,
            user_id: userId,
            sale_number: saleNumber,
            subtotal: saleSubtotal,
            discount:
              saleGlobalDiscount + saleItemDiscount,
            tax: saleTax,
            total: saleTotal,
            status: "completed",
            customer_name:
              customerName.trim() || null,
            customer_phone:
              customerPhone.trim() || null,
            notes: notes.trim() || null,
          })
          .select()
          .single();

      if (saleError || !sale) {
        throw new Error(
          saleError?.message || text.saleCreationError
        );
      }

      const saleItems = saleCart.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) {
        throw new Error(
          interpolate(text.saleItemsError, {
            error: itemsError.message,
          })
        );
      }

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          pharmacy_id: pharmacyId,
          sale_id: sale.id,
          amount: saleTotal,
          method: paymentMethod,
        });

      if (paymentError) {
        throw new Error(
          interpolate(text.paymentError, {
            error: paymentError.message,
          })
        );
      }

      for (const item of saleCart) {
        const product = products.find(
          (productItem) =>
            productItem.id === item.product_id
        );

        if (!product) {
          throw new Error(
            interpolate(text.catalogueMissing, {
              product: item.name,
            })
          );
        }

        const newQuantity =
          Number(product.stock_quantity) -
          item.quantity;

        const { error: updateStockError } =
          await supabase
            .from("products")
            .update({ stock_quantity: newQuantity })
            .eq("id", item.product_id)
            .eq("pharmacy_id", pharmacyId);

        if (updateStockError) {
          throw new Error(
            interpolate(text.stockUpdateError, {
              product: item.name,
              error: updateStockError.message,
            })
          );
        }

        const { error: movementError } =
          await supabase
            .from("stock_movements")
            .insert({
              pharmacy_id: pharmacyId,
              product_id: item.product_id,
              user_id: userId,
              type: "exit",
              quantity: item.quantity,
              reason: isEnglish ? "Sale" : "Vente",
              reference: saleNumber,
            });

        if (movementError) {
          throw new Error(
            interpolate(text.movementError, {
              product: item.name,
              error: movementError.message,
            })
          );
        }
      }

      const receiptData: ReceiptData = {
        saleNumber,
        createdAt: saleCreatedAt,
        pharmacyName:
          pharmacy?.name ||
          (isEnglish ? "Pharmacy" : "Pharmacie"),
        pharmacyAddress: pharmacy?.address || "",
        pharmacyCity: pharmacy?.city || "",
        customerName:
          customerName.trim() || text.counterCustomer,
        customerPhone: customerPhone.trim() || "",
        items: saleCart.map((item) => ({ ...item })),
        subtotal: saleSubtotal,
        itemDiscount: saleItemDiscount,
        globalDiscount: saleGlobalDiscount,
        tax: saleTax,
        total: saleTotal,
        amountPaid: saleAmountPaid,
        change: saleChange,
        paymentMethod,
        currency,
        notes: notes.trim() || "",
      };

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setDiscount(0);
      setAmountPaid(0);
      setPaymentMethod("cash");
      setShowCheckout(false);

      await Promise.all([
        loadProducts(pharmacyId),
        loadSales(pharmacyId),
      ]);

      setMessage(
        interpolate(text.saleSaved, {
          number: saleNumber,
        })
      );

      setReceipt(receiptData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : text.genericCheckoutError
      );
    } finally {
      setProcessing(false);
    }
  }
    /*
   * =========================================================
   * IMPRESSION DU REÇU
   * =========================================================
   */

  function printReceipt() {
    if (!receipt) return;

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=420,height=700"
      );

    if (!printWindow) {
      setError(
        text.popUpError
      );
      return;
    }

    const itemsHtml =
      receipt.items
        .map(
          (item) => `
            <div class="item">
              <div class="item-name">
                ${escapeHtml(item.name)}
              </div>

              <div class="item-line">
                <span>
                  ${item.quantity} ×
                  ${formatReceiptMoney(
                    item.unit_price,
                    receipt.currency
                  )}
                </span>

                <strong>
                  ${formatReceiptMoney(
                    item.total,
                    receipt.currency
                  )}
                </strong>
              </div>

              ${
                item.discount > 0
                  ? `
                    <div class="item-discount">
                      ${
                        isEnglish
                          ? "Discount"
                          : "Remise"
                      } :
                      -${formatReceiptMoney(
                        item.discount,
                        receipt.currency
                      )}
                    </div>
                  `
                  : ""
              }
            </div>
          `
        )
        .join("");

    const locationLine = [
      receipt.pharmacyAddress,
      receipt.pharmacyCity,
    ]
      .filter(Boolean)
      .join(
        isEnglish
          ? " — "
          : " — "
      );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${isEnglish ? "en" : "fr"}">
        <head>
          <meta charset="UTF-8" />

          <title>
            ${escapeHtml(
              text.receipt
            )}
            ${escapeHtml(
              receipt.saleNumber
            )}
          </title>

          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111111;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }

            body {
              width: 100%;
            }

            .receipt {
              width: 100%;
              max-width: 80mm;
              margin: 0 auto;
              padding: 3mm;
            }

            .center {
              text-align: center;
            }

            .pharmacy-name {
              font-size: 20px;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 4px;
            }

            .pharmacy-info {
              font-size: 10px;
              line-height: 1.45;
              color: #333333;
            }

            .receipt-title {
              margin-top: 12px;
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 1px;
            }

            .separator {
              border-top: 1px dashed #333333;
              margin: 9px 0;
            }

            .meta {
              font-size: 10px;
              line-height: 1.6;
            }

            .meta-row {
              display: flex;
              justify-content: space-between;
              gap: 10px;
            }

            .meta-row span:last-child {
              text-align: right;
              font-weight: 700;
            }

            .item {
              padding: 7px 0;
              border-bottom: 1px dotted #aaaaaa;
            }

            .item-name {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              margin-bottom: 3px;
            }

            .item-line {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              font-size: 10px;
            }

            .item-discount {
              margin-top: 2px;
              font-size: 9px;
              color: #555555;
            }

            .totals {
              margin-top: 8px;
              font-size: 10px;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin: 4px 0;
            }

            .total-row strong {
              text-align: right;
            }

            .grand-total {
              margin-top: 7px;
              padding-top: 7px;
              border-top: 2px solid #111111;
              font-size: 15px;
              font-weight: 900;
            }

            .payment {
              margin-top: 9px;
              font-size: 10px;
              line-height: 1.6;
            }

            .notes {
              margin-top: 9px;
              padding-top: 7px;
              border-top: 1px dotted #aaaaaa;
              font-size: 9px;
              line-height: 1.4;
            }

            .thanks {
              margin-top: 16px;
              text-align: center;
              font-size: 11px;
              font-weight: 800;
            }

            .footer {
              margin-top: 5px;
              text-align: center;
              font-size: 8px;
              color: #555555;
            }

            .print-actions {
              margin: 20px auto;
              display: flex;
              justify-content: center;
              gap: 10px;
            }

            .print-actions button {
              border: 0;
              border-radius: 7px;
              padding: 10px 14px;
              font-weight: 700;
              cursor: pointer;
            }

            .print-button {
              background: #0f766e;
              color: #ffffff;
            }

            .close-button {
              background: #e5e7eb;
              color: #111111;
            }

            @media print {
              .print-actions {
                display: none !important;
              }

              .receipt {
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="receipt">

            <div class="center">

              <div class="pharmacy-name">
                ${escapeHtml(
                  receipt.pharmacyName
                )}
              </div>

              ${
                locationLine
                  ? `
                    <div class="pharmacy-info">
                      ${escapeHtml(
                        locationLine
                      )}
                    </div>
                  `
                  : ""
              }

              <div class="pharmacy-info">
                PharmaFlow
              </div>

              <div class="receipt-title">
                ${escapeHtml(
                  text.saleReceipt
                )}
              </div>

            </div>

            <div class="separator"></div>

            <div class="meta">

              <div class="meta-row">
                <span>
                  ${escapeHtml(
                    text.saleNumber
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    receipt.saleNumber
                  )}
                </span>
              </div>

              <div class="meta-row">
                <span>
                  ${escapeHtml(
                    text.date
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    formatDate(
                      receipt.createdAt
                    )
                  )}
                </span>
              </div>

              <div class="meta-row">
                <span>
                  ${escapeHtml(
                    text.customer
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    receipt.customerName
                  )}
                </span>
              </div>

              ${
                receipt.customerPhone
                  ? `
                    <div class="meta-row">
                      <span>
                        ${escapeHtml(
                          text.phone
                        )}
                      </span>

                      <span>
                        ${escapeHtml(
                          receipt.customerPhone
                        )}
                      </span>
                    </div>
                  `
                  : ""
              }

            </div>

            <div class="separator"></div>

            <div>
              ${itemsHtml}
            </div>

            <div class="totals">

              <div class="total-row">
                <span>
                  ${escapeHtml(
                    text.subtotal
                  )}
                </span>

                <strong>
                  ${formatReceiptMoney(
                    receipt.subtotal,
                    receipt.currency
                  )}
                </strong>
              </div>

              ${
                receipt.itemDiscount > 0
                  ? `
                    <div class="total-row">
                      <span>
                        ${escapeHtml(
                          text.itemDiscounts
                        )}
                      </span>

                      <strong>
                        -${formatReceiptMoney(
                          receipt.itemDiscount,
                          receipt.currency
                        )}
                      </strong>
                    </div>
                  `
                  : ""
              }

              ${
                receipt.globalDiscount > 0
                  ? `
                    <div class="total-row">
                      <span>
                        ${escapeHtml(
                          text.globalDiscount
                        )}
                      </span>

                      <strong>
                        -${formatReceiptMoney(
                          receipt.globalDiscount,
                          receipt.currency
                        )}
                      </strong>
                    </div>
                  `
                  : ""
              }

              <div class="total-row">
                <span>
                  ${escapeHtml(
                    text.taxes
                  )}
                </span>

                <strong>
                  ${formatReceiptMoney(
                    receipt.tax,
                    receipt.currency
                  )}
                </strong>
              </div>

              <div class="total-row grand-total">
                <span>
                  ${escapeHtml(
                    text.total
                  )}
                </span>

                <strong>
                  ${formatReceiptMoney(
                    receipt.total,
                    receipt.currency
                  )}
                </strong>
              </div>

            </div>

            <div class="payment">

              <div class="meta-row">
                <span>
                  ${escapeHtml(
                    text.payment
                  )}
                </span>

                <strong>
                  ${escapeHtml(
                    paymentLabel(
                      receipt.paymentMethod
                    )
                  )}
                </strong>
              </div>

              <div class="meta-row">
                <span>
                  ${escapeHtml(
                    text.received
                  )}
                </span>

                <strong>
                  ${formatReceiptMoney(
                    receipt.amountPaid,
                    receipt.currency
                  )}
                </strong>
              </div>

              <div class="meta-row">
                <span>
                  ${escapeHtml(
                    text.changeLabel
                  )}
                </span>

                <strong>
                  ${formatReceiptMoney(
                    receipt.change,
                    receipt.currency
                  )}
                </strong>
              </div>

            </div>

            ${
              receipt.notes
                ? `
                  <div class="notes">
                    <strong>
                      ${escapeHtml(
                        text.note
                      )} :
                    </strong>
                    <br />
                    ${escapeHtml(
                      receipt.notes
                    )}
                  </div>
                `
                : ""
            }

            <div class="separator"></div>

            <div class="thanks">
              ${escapeHtml(
                text.thankYou
              )}
            </div>

            <div class="footer">
              ${escapeHtml(
                text.generatedBy
              )}
            </div>

          </div>

          <div class="print-actions">

            <button
              class="print-button"
              onclick="window.print()"
            >
              ${escapeHtml(
                text.printReceipt
              )}
            </button>

            <button
              class="close-button"
              onclick="window.close()"
            >
              ${escapeHtml(
                text.close
              )}
            </button>

          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 350);
  }

  /*
   * =========================================================
   * REÇU
   * =========================================================
   */

  function closeReceipt() {
    setReceipt(null);
    setMessage("");
  }

  /*
   * =========================================================
   * CHARGEMENT
   * =========================================================
   */

  if (loading) {
    return (
      <main className="pf-sales-page">
        <div className="pf-sales-loading">

          <div className="pf-sales-spinner" />

          <h2>
            {text.loading}
          </h2>

          <p>
            {text.loadingDescription}
          </p>

        </div>
      </main>
    );
  }

  return (
    <main className="pf-sales-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="pf-sales-header">

        <div className="pf-sales-header-inner">

          <div className="pf-sales-title-area">

            <button
              type="button"
              className="pf-sales-back"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              aria-label={
                text.back
              }
            >
              ←
            </button>

            <div className="pf-sales-title-icon">
              💊
            </div>

            <div>

              <h1>
                {text.newSale}
              </h1>

              <p>
                {text.newSaleDescription}
              </p>

            </div>

          </div>

          <div className="pf-sales-header-actions">

            <button
              type="button"
              className="pf-sales-btn pf-sales-btn-secondary"
              onClick={
                refreshPage
              }
              disabled={
                refreshing
              }
            >
              ↻{" "}
              {refreshing
                ? text.refreshing
                : text.refresh}
            </button>

            <button
              type="button"
              className="pf-sales-btn pf-sales-btn-primary"
              onClick={() =>
                router.push(
                  "/products"
                )
              }
            >
              {text.productsButton}
            </button>

          </div>

        </div>

      </header>

      <div className="pf-sales-container">

        {/* ===================================================
            MESSAGES
            =================================================== */}

        {message && (
          <div className="pf-sales-alert pf-sales-alert-success">

            <span>
              ✓
            </span>

            <div>
              {message}
            </div>

          </div>
        )}

        {error && (
          <div className="pf-sales-alert pf-sales-alert-error">

            <span>
              !
            </span>

            <div>
              {error}
            </div>

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

        {/* ===================================================
            STATISTIQUES
            =================================================== */}

        <section className="pf-sales-stats">

          <button
            type="button"
            className={`pf-sales-stat ${
              stockFilter ===
              "all"
                ? "pf-sales-stat-active"
                : ""
            }`}
            onClick={() =>
              setStockFilter(
                "all"
              )
            }
          >

            <div className="pf-sales-stat-icon pf-sales-stat-icon-blue">
              💊
            </div>

            <div>

              <span>
                {text.products}
              </span>

              <strong>
                {products.length}
              </strong>

            </div>

          </button>

          <button
            type="button"
            className={`pf-sales-stat ${
              stockFilter ===
              "available"
                ? "pf-sales-stat-active"
                : ""
            }`}
            onClick={() =>
              setStockFilter(
                "available"
              )
            }
          >

            <div className="pf-sales-stat-icon pf-sales-stat-icon-green">
              ✓
            </div>

            <div>

              <span>
                {text.available}
              </span>

              <strong>
                {availableCount}
              </strong>

            </div>

          </button>

          <button
            type="button"
            className={`pf-sales-stat ${
              stockFilter ===
              "low"
                ? "pf-sales-stat-active"
                : ""
            }`}
            onClick={() =>
              setStockFilter(
                "low"
              )
            }
          >

            <div className="pf-sales-stat-icon pf-sales-stat-icon-orange">
              ⚠
            </div>

            <div>

              <span>
                {text.lowStock}
              </span>

              <strong>
                {lowStockCount}
              </strong>

            </div>

          </button>

          <button
            type="button"
            className={`pf-sales-stat ${
              stockFilter ===
              "out"
                ? "pf-sales-stat-active"
                : ""
            }`}
            onClick={() =>
              setStockFilter(
                "out"
              )
            }
          >

            <div className="pf-sales-stat-icon pf-sales-stat-icon-red">
              ×
            </div>

            <div>

              <span>
                {text.outOfStock}
              </span>

              <strong>
                {outOfStockCount}
              </strong>

            </div>

          </button>

        </section>

        {/* ===================================================
            ESPACE PRINCIPAL
            =================================================== */}

        <section className="pf-sales-layout">

          {/* =================================================
              PRODUITS
              ================================================= */}

          <div className="pf-sales-products-panel">

            <div className="pf-sales-panel-header">

              <div>

                <h2>
                  {text.pharmacyProducts}
                </h2>

                <p>
                  {text.pharmacyProductsDescription}
                </p>

              </div>

              <span className="pf-sales-result-count">

                {filteredProducts.length}{" "}

                {filteredProducts.length === 1
                  ? text.product
                  : text.productsPlural}

              </span>

            </div>

            {/* SCANNER CODE-BARRES */}

            <div className="pf-sales-scanner">

              <div className="pf-sales-scanner-main">
                <span className="pf-sales-scanner-icon">▣</span>

                <div className="pf-sales-scanner-copy">
                  <strong>
                    {isEnglish
                      ? "Barcode scanner"
                      : "Scanner code-barres"}
                  </strong>
                  <span>
                    {isEnglish
                      ? "Scan a product to add it automatically to the cart."
                      : "Scannez un produit pour l'ajouter automatiquement au panier."}
                  </span>
                </div>

                <span className="pf-sales-scanner-mode">
                  {isEnglish
                    ? "Scan → Cart"
                    : "Scan → Panier"}
                </span>
              </div>

              <input
                ref={barcodeInputRef}
                className="pf-sales-scanner-input"
                value={barcodeScan}
                onChange={(event) =>
                  setBarcodeScan(event.target.value)
                }
                onKeyDown={handleBarcodeKeyDown}
                placeholder={
                  isEnglish
                    ? "Scan barcode, then press Enter…"
                    : "Scannez le code-barres puis appuyez sur Entrée…"
                }
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                disabled={processing}
              />

              <button
                type="button"
                className="pf-sales-scanner-button"
                onClick={() =>
                  void handleBarcodeScan(barcodeScan)
                }
                disabled={!barcodeScan.trim() || processing}
              >
                ✓ {isEnglish ? "Add to cart" : "Ajouter au panier"}
              </button>

            </div>

            {/* RECHERCHE */}

            <div className="pf-sales-toolbar">

              <div className="pf-sales-search">

                <span>
                  ⌕
                </span>

                <input
                  type="search"
                  placeholder={
                    text.searchPlaceholder
                  }
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    aria-label={
                      isEnglish
                        ? "Clear"
                        : "Effacer"
                    }
                  >
                    ×
                  </button>
                )}

              </div>

              <select
                className="pf-sales-select"
                value={
                  categoryFilter
                }
                onChange={(
                  event
                ) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  {text.allCategories}
                </option>

                {categories.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {
                        category
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            {/* FILTRES */}

            <div className="pf-sales-filter-row">

              <button
                type="button"
                className={
                  stockFilter ===
                  "all"
                    ? "pf-sales-filter-active"
                    : ""
                }
                onClick={() =>
                  setStockFilter(
                    "all"
                  )
                }
              >
                {text.all}
              </button>

              <button
                type="button"
                className={
                  stockFilter ===
                  "available"
                    ? "pf-sales-filter-active"
                    : ""
                }
                onClick={() =>
                  setStockFilter(
                    "available"
                  )
                }
              >
                {text.availableFilter}
              </button>

              <button
                type="button"
                className={
                  stockFilter ===
                  "low"
                    ? "pf-sales-filter-active"
                    : ""
                }
                onClick={() =>
                  setStockFilter(
                    "low"
                  )
                }
              >
                {text.lowFilter}
              </button>

              <button
                type="button"
                className={
                  stockFilter ===
                  "out"
                    ? "pf-sales-filter-active"
                    : ""
                }
                onClick={() =>
                  setStockFilter(
                    "out"
                  )
                }
              >
                {text.outFilter}
              </button>

            </div>

            {/* PRODUITS */}

            {filteredProducts.length ===
            0 ? (

              <div className="pf-sales-empty">

                <div className="pf-sales-empty-icon">
                  🔎
                </div>

                <h3>
                  {text.noProductFound}
                </h3>

                <p>
                  {text.noProductMatch}
                </p>

                <button
                  type="button"
                  className="pf-sales-btn pf-sales-btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter(
                      "all"
                    );
                    setStockFilter(
                      "all"
                    );
                  }}
                >
                  {text.reset}
                </button>

              </div>

            ) : (

              <div className="pf-sales-product-grid">

                {filteredProducts.map(
                  (
                    product
                  ) => {

                    const stockStatus =
                      getStockStatus(
                        product
                      );

                    const cartQuantity =
                      getCartQuantity(
                        product.id
                      );

                    const isOutOfStock =
                      product.stock_quantity <=
                      0;

                    return (
                      <article
                        key={
                          product.id
                        }
                        className={`pf-sales-product-card ${
                          isOutOfStock
                            ? "pf-sales-product-disabled"
                            : ""
                        }`}
                      >

                        <div className="pf-sales-product-top">

                          <div className="pf-sales-product-avatar">
                            💊
                          </div>

                          <span
                            className={`pf-sales-stock-badge ${stockStatus.className}`}
                          >
                            {
                              stockStatus.label
                            }
                          </span>

                        </div>

                        <div className="pf-sales-product-info">

                          <h3>
                            {
                              product.name
                            }
                          </h3>

                          {product.generic_name && (
                            <p className="pf-sales-generic">
                              {
                                product.generic_name
                              }
                            </p>
                          )}

                          <div className="pf-sales-product-meta">

                            {product.category && (
                              <span>
                                {
                                  product.category
                                }
                              </span>
                            )}

                            {product.sku && (
                              <span>
                                {text.sku} :{" "}
                                {
                                  product.sku
                                }
                              </span>
                            )}

                          </div>

                        </div>

                        <div className="pf-sales-product-bottom">

                          <div>

                            <strong>
                              {formatMoney(
                                product.selling_price
                              )}
                            </strong>

                            <span>
                              {" "}
                              /{" "}
                              {
                                product.unit
                              }
                            </span>

                          </div>

                          <div className="pf-sales-stock-number">

                            {text.stock} :{" "}

                            <strong>
                              {
                                product.stock_quantity
                              }
                            </strong>

                          </div>

                        </div>

                        {cartQuantity >
                          0 && (
                          <div className="pf-sales-in-cart">

                            ✓{" "}
                            {
                              cartQuantity
                            }{" "}

                            {text.inCart}

                          </div>
                        )}

                        <button
                          type="button"
                          className="pf-sales-add-product"
                          disabled={
                            isOutOfStock
                          }
                          onClick={() =>
                            addToCart(
                              product
                            )
                          }
                        >
                          {isOutOfStock
                            ? text.stockOut
                            : text.addToCart}
                        </button>

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* =================================================
              PANIER
              ================================================= */}

          <aside className="pf-sales-cart-panel">

            <div className="pf-sales-cart-header">

              <div>

                <h2>
                  {text.cart}
                </h2>

                <p>
                  {cart.length}{" "}
                  {cart.length > 1
                    ? text.articles
                    : text.article}
                </p>

              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  className="pf-sales-clear"
                  onClick={
                    clearCart
                  }
                >
                  {text.clear}
                </button>
              )}

            </div>

            {cart.length === 0 ? (

              <div className="pf-sales-cart-empty">

                <div className="pf-sales-cart-empty-icon">
                  🛒
                </div>

                <h3>
                  {text.emptyCart}
                </h3>

                <p>
                  {text.emptyCartDescription}
                </p>

              </div>

            ) : (

              <>

                {/* ARTICLES */}

                <div className="pf-sales-cart-items">

                  {cart.map(
                    (item) => (
                      <div
                        key={
                          item.product_id
                        }
                        className="pf-sales-cart-item"
                      >

                        <div className="pf-sales-cart-item-main">

                          <div className="pf-sales-cart-item-icon">
                            💊
                          </div>

                          <div className="pf-sales-cart-item-info">

                            <strong>
                              {
                                item.name
                              }
                            </strong>

                            <span>
                              {formatMoney(
                                item.unit_price
                              )}{" "}
                              /{" "}
                              {
                                item.unit
                              }
                            </span>

                          </div>

                          <button
                            type="button"
                            className="pf-sales-remove"
                            onClick={() =>
                              removeFromCart(
                                item.product_id
                              )
                            }
                            aria-label={
                              text.remove
                            }
                          >
                            ×
                          </button>

                        </div>

                        <div className="pf-sales-cart-item-controls">

                          <div className="pf-sales-quantity">

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product_id,
                                  item.quantity -
                                    1
                                )
                              }
                            >
                              −
                            </button>

                            <strong>
                              {
                                item.quantity
                              }
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product_id,
                                  item.quantity +
                                    1
                                )
                              }
                            >
                              +
                            </button>

                          </div>

                          <strong>
                            {formatMoney(
                              item.total
                            )}
                          </strong>

                        </div>

                        <div className="pf-sales-item-discount">

                          <label>
                            {
                              text.itemDiscount
                            }
                          </label>

                          <input
                            type="number"
                            min="0"
                            value={
                              item.discount ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateItemDiscount(
                                item.product_id,
                                Number(
                                  event.target.value
                                )
                              )
                            }
                            placeholder="0"
                          />

                          <span>
                            {currency}
                          </span>

                        </div>

                      </div>
                    )
                  )}

                </div>

                {/* CLIENT */}

                <div className="pf-sales-customer">

                  <div className="pf-sales-section-label">

                    <span className="pf-sales-section-title">
                      {
                        text.customerInformation
                      }
                    </span>

                    <span>
                      {
                        text.optional
                      }
                    </span>

                  </div>

                  <div className="pf-sales-form-row">

                    <input
                      type="text"
                      placeholder={
                        text.customerName
                      }
                      value={
                        customerName
                      }
                      onChange={(
                        event
                      ) =>
                        setCustomerName(
                          event.target.value
                        )
                      }
                    />

                    <input
                      type="tel"
                      placeholder={
                        text.customerPhone
                      }
                      value={
                        customerPhone
                      }
                      onChange={(
                        event
                      ) =>
                        setCustomerPhone(
                          event.target.value
                        )
                      }
                    />

                  </div>

                  <textarea
                    placeholder={
                      text.saleNote
                    }
                    value={
                      notes
                    }
                    onChange={(
                      event
                    ) =>
                      setNotes(
                        event.target.value
                      )
                    }
                    rows={2}
                  />

                </div>

                {/* RÉSUMÉ */}

                <div className="pf-sales-summary">

                  <div>

                    <span>
                      {
                        text.subtotal
                      }
                    </span>

                    <strong>
                      {formatMoney(
                        subtotal
                      )}
                    </strong>

                  </div>

                  {itemDiscount >
                    0 && (
                    <div className="pf-sales-discount-line">

                      <span>
                        {
                          text.itemDiscounts
                        }
                      </span>

                      <strong>
                        -{" "}
                        {formatMoney(
                          itemDiscount
                        )}
                      </strong>

                    </div>
                  )}

                  <div className="pf-sales-discount-input">

                    <label>
                      {
                        text.globalDiscount
                      }
                    </label>

                    <div>

                      <input
                        type="number"
                        min="0"
                        max={
                          totalBeforeGlobalDiscount
                        }
                        value={
                          discount ||
                          ""
                        }
                        onChange={(
                          event
                        ) =>
                          setDiscount(
                            Math.max(
                              0,
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          )
                        }
                        placeholder="0"
                      />

                      <span>
                        {currency}
                      </span>

                    </div>

                  </div>

                  <div>

                    <span>
                      {
                        text.taxes
                      }
                    </span>

                    <strong>
                      {formatMoney(
                        tax
                      )}
                    </strong>

                  </div>

                  <div className="pf-sales-total">

                    <span>
                      {
                        text.total
                      }
                    </span>

                    <strong>
                      {formatMoney(
                        total
                      )}
                    </strong>

                  </div>

                </div>

                {/* ENCAISSER */}

                <button
                  type="button"
                  className="pf-sales-checkout-btn"
                  onClick={
                    openCheckout
                  }
                >

                  <span>
                    💵
                  </span>

                  <div>

                    <strong>
                      {
                        text.checkout
                      }
                    </strong>

                    <small>
                      {formatMoney(
                        total
                      )}
                    </small>

                  </div>

                  <span>
                    →
                  </span>

                </button>

              </>
            )}

          </aside>

        </section>

        {/* ===================================================
            VENTES RÉCENTES
            =================================================== */}

        <section className="pf-sales-recent">

          <div className="pf-sales-recent-header">

            <div>

              <h2>
                {
                  text.recentSales
                }
              </h2>

              <p>
                {
                  text.recentSalesDescription
                }
              </p>

            </div>

            <button
              type="button"
              className="pf-sales-btn pf-sales-btn-secondary"
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
            >
              {
                text.dashboard
              }
            </button>

          </div>

          {sales.length ===
          0 ? (

            <div className="pf-sales-recent-empty">
              {
                text.noSales
              }
            </div>

          ) : (

            <div className="pf-sales-table-wrapper">

              <table className="pf-sales-table">

                <thead>

                  <tr>

                    <th>
                      {
                        text.saleNumber
                      }
                    </th>

                    <th>
                      {
                        text.date
                      }
                    </th>

                    <th>
                      {
                        text.customer
                      }
                    </th>

                    <th>
                      {
                        text.total
                      }
                    </th>

                    <th>
                      {
                        text.status
                      }
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {sales.map(
                    (sale) => (
                      <tr
                        key={
                          sale.id
                        }
                      >

                        <td>

                          <strong>
                            {
                              sale.sale_number
                            }
                          </strong>

                        </td>

                        <td>
                          {formatDate(
                            sale.created_at
                          )}
                        </td>

                        <td>

                          <div className="pf-sales-client">

                            <strong>
                              {
                                sale.customer_name ||
                                text.counterCustomer
                              }
                            </strong>

                            {sale.customer_phone && (
                              <span>
                                {
                                  sale.customer_phone
                                }
                              </span>
                            )}

                          </div>

                        </td>

                        <td>

                          <strong className="pf-sales-table-total">
                            {formatMoney(
                              sale.total
                            )}
                          </strong>

                        </td>

                        <td>

                          <span className="pf-sales-status">

                            ✓{" "}

                            {sale.status ===
                            "completed"
                              ? text.completed
                              : sale.status}

                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer className="pf-sales-footer">

          <span>
            PharmaFlow —{" "}
            {isEnglish
              ? "Professional pharmacy management"
              : "Gestion professionnelle des pharmacies"}
          </span>

          <span>
            {isEnglish
              ? "Data isolated by pharmacy."
              : "Données isolées par pharmacie."}
          </span>

        </footer>

      </div>
            {/* =====================================================
          MODAL ENCAISSEMENT
          ===================================================== */}

      {showCheckout && (
        <div className="pf-sales-modal-overlay">

          <div className="pf-sales-modal">

            <div className="pf-sales-modal-header">

              <div>

                <span className="pf-sales-modal-icon">
                  💳
                </span>

                <div>

                  <h2>
                    {
                      text.checkout
                    }
                  </h2>

                  <p>
                    {
                      text.checkoutDescription
                    }
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="pf-sales-modal-close"
                onClick={() =>
                  setShowCheckout(
                    false
                  )
                }
                disabled={
                  processing
                }
              >
                ×
              </button>

            </div>

            <div className="pf-sales-modal-body">

              {/* TOTAL */}

              <div className="pf-sales-payment-total">

                <span>
                  {isEnglish
                    ? "Total to pay"
                    : "Total à payer"}
                </span>

                <strong>
                  {formatMoney(
                    total
                  )}
                </strong>

              </div>

              {/* PAIEMENT */}

              <div className="pf-sales-payment-section">

                <label>
                  {
                    text.paymentMethod
                  }
                </label>

                <div className="pf-sales-payment-grid">

                  {paymentMethods.map(
                    (method) => (
                      <button
                        type="button"
                        key={
                          method.value
                        }
                        className={
                          paymentMethod ===
                          method.value
                            ? "pf-sales-payment-active"
                            : ""
                        }
                        onClick={() =>
                          setPaymentMethod(
                            method.value
                          )
                        }
                      >

                        <span>
                          {
                            method.icon
                          }
                        </span>

                        <strong>
                          {
                            method.label
                          }
                        </strong>

                      </button>
                    )
                  )}

                </div>

              </div>

              {/* MONTANT REÇU */}

              <div className="pf-sales-paid-section">

                <label>
                  {
                    text.amountReceived
                  }
                </label>

                <div className="pf-sales-paid-input">

                  <input
                    type="number"
                    min="0"
                    value={
                      amountPaid ||
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      setAmountPaid(
                        Math.max(
                          0,
                          Number(
                            event.target.value
                          )
                        )
                      )
                    }
                    placeholder="0"
                    autoFocus
                  />

                  <span>
                    {currency}
                  </span>

                </div>

                <div className="pf-sales-quick-amounts">

                  <button
                    type="button"
                    onClick={() =>
                      setAmountPaid(
                        total
                      )
                    }
                  >
                    {
                      text.exact
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAmountPaid(
                        Math.ceil(
                          total /
                            1000
                        ) *
                          1000
                      )
                    }
                  >
                    {
                      text.rounded
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAmountPaid(
                        Math.ceil(
                          total /
                            5000
                        ) *
                          5000
                      )
                    }
                  >
                    {
                      text.plus5000
                    }
                  </button>

                </div>

              </div>

              {/* MONNAIE */}

              <div
                className={`pf-sales-change ${
                  amountPaid >=
                  total
                    ? "pf-sales-change-positive"
                    : "pf-sales-change-negative"
                }`}
              >

                <span>
                  {amountPaid >=
                  total
                    ? text.change
                    : text.remaining}
                </span>

                <strong>
                  {formatMoney(
                    amountPaid >=
                      total
                      ? change
                      : remaining
                  )}
                </strong>

              </div>

              {customerName && (
                <div className="pf-sales-payment-client">

                  <span>
                    {
                      text.customer
                    }
                  </span>

                  <strong>
                    {
                      customerName
                    }
                  </strong>

                </div>
              )}

            </div>

            {/* FOOTER */}

            <div className="pf-sales-modal-footer">

              <button
                type="button"
                className="pf-sales-btn pf-sales-btn-secondary"
                onClick={() =>
                  setShowCheckout(
                    false
                  )
                }
                disabled={
                  processing
                }
              >
                {
                  text.cancel
                }
              </button>

              <button
                type="button"
                className="pf-sales-confirm-btn"
                onClick={() =>
                  void completeSale()
                }
                disabled={
                  processing ||
                  amountPaid <
                    total
                }
              >

                {processing ? (
                  <>
                    <span className="pf-sales-small-spinner" />

                    {
                      text.saving
                    }
                  </>
                ) : (
                  <>
                    ✓{" "}
                    {
                      text.confirmSale
                    }
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          REÇU DE VENTE
          ===================================================== */}

      {receipt && (
        <div className="pf-sales-receipt-overlay">

          <div className="pf-sales-receipt-modal">

            <div className="pf-sales-receipt-header">

              <div>

                <div className="pf-sales-receipt-success-icon">
                  ✓
                </div>

                <div>

                  <h2>
                    {isEnglish
                      ? "Sale recorded"
                      : "Vente enregistrée"}
                  </h2>

                  <p>
                    {
                      text.receiptReady
                    }
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="pf-sales-receipt-close"
                onClick={
                  closeReceipt
                }
              >
                ×
              </button>

            </div>

            {/* APERÇU REÇU */}

            <div className="pf-sales-receipt-preview">

              <div className="pf-sales-receipt-paper">

                <div className="pf-sales-receipt-brand">

                  <div className="pf-sales-receipt-logo">
                    💊
                  </div>

                  <h3>
                    {
                      receipt.pharmacyName
                    }
                  </h3>

                  {[
                    receipt.pharmacyAddress,
                    receipt.pharmacyCity,
                  ].filter(
                    Boolean
                  ).length >
                    0 && (
                    <p>
                      {[
                        receipt.pharmacyAddress,
                        receipt.pharmacyCity,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " — "
                        )}
                    </p>
                  )}

                </div>

                <div className="pf-sales-receipt-title">
                  {
                    text.saleReceipt
                  }
                </div>

                <div className="pf-sales-receipt-meta">

                  <div>

                    <span>
                      {
                        text.saleNumber
                      }
                    </span>

                    <strong>
                      {
                        receipt.saleNumber
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      {
                        text.date
                      }
                    </span>

                    <strong>
                      {formatDate(
                        receipt.createdAt
                      )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      {
                        text.customer
                      }
                    </span>

                    <strong>
                      {
                        receipt.customerName
                      }
                    </strong>

                  </div>

                  {receipt.customerPhone && (
                    <div>

                      <span>
                        {
                          text.phone
                        }
                      </span>

                      <strong>
                        {
                          receipt.customerPhone
                        }
                      </strong>

                    </div>
                  )}

                </div>

                <div className="pf-sales-receipt-divider" />

                <div className="pf-sales-receipt-items">

                  {receipt.items.map(
                    (item) => (
                      <div
                        key={
                          item.product_id
                        }
                        className="pf-sales-receipt-item"
                      >

                        <div className="pf-sales-receipt-item-main">

                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <span>
                            {
                              item.quantity
                            }{" "}
                            ×{" "}
                            {formatReceiptMoney(
                              item.unit_price,
                              receipt.currency
                            )}
                          </span>

                        </div>

                        <strong>
                          {formatReceiptMoney(
                            item.total,
                            receipt.currency
                          )}
                        </strong>

                      </div>
                    )
                  )}

                </div>

                <div className="pf-sales-receipt-divider" />

                <div className="pf-sales-receipt-totals">

                  <div>

                    <span>
                      {
                        text.subtotal
                      }
                    </span>

                    <strong>
                      {formatReceiptMoney(
                        receipt.subtotal,
                        receipt.currency
                      )}
                    </strong>

                  </div>

                  {receipt.itemDiscount >
                    0 && (
                    <div className="pf-sales-receipt-discount">

                      <span>
                        {
                          text.itemDiscounts
                        }
                      </span>

                      <strong>
                        -
                        {formatReceiptMoney(
                          receipt.itemDiscount,
                          receipt.currency
                        )}
                      </strong>

                    </div>
                  )}

                  {receipt.globalDiscount >
                    0 && (
                    <div className="pf-sales-receipt-discount">

                      <span>
                        {
                          text.globalDiscount
                        }
                      </span>

                      <strong>
                        -
                        {formatReceiptMoney(
                          receipt.globalDiscount,
                          receipt.currency
                        )}
                      </strong>

                    </div>
                  )}

                  <div>

                    <span>
                      {
                        text.taxes
                      }
                    </span>

                    <strong>
                      {formatReceiptMoney(
                        receipt.tax,
                        receipt.currency
                      )}
                    </strong>

                  </div>

                  <div className="pf-sales-receipt-total">

                    <span>
                      {
                        text.total
                      }
                    </span>

                    <strong>
                      {formatReceiptMoney(
                        receipt.total,
                        receipt.currency
                      )}
                    </strong>

                  </div>

                </div>

                <div className="pf-sales-receipt-payment">

                  <div>

                    <span>
                      {
                        text.paymentMethod
                      }
                    </span>

                    <strong>
                      {
                        paymentLabel(
                          receipt.paymentMethod
                        )
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      {
                        text.received
                      }
                    </span>

                    <strong>
                      {formatReceiptMoney(
                        receipt.amountPaid,
                        receipt.currency
                      )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      {
                        text.changeLabel
                      }
                    </span>

                    <strong>
                      {formatReceiptMoney(
                        receipt.change,
                        receipt.currency
                      )}
                    </strong>

                  </div>

                </div>

                {receipt.notes && (
                  <div className="pf-sales-receipt-notes">

                    <strong>
                      {
                        text.note
                      }
                    </strong>

                    <p>
                      {
                        receipt.notes
                      }
                    </p>

                  </div>
                )}

                <div className="pf-sales-receipt-thanks">

                  <strong>
                    {
                      text.thankYou
                    }
                  </strong>

                  <span>
                    {
                      text.generatedBy
                    }
                  </span>

                </div>

              </div>

            </div>

            {/* ACTIONS */}

            <div className="pf-sales-receipt-actions">

              <button
                type="button"
                className="pf-sales-btn pf-sales-btn-secondary"
                onClick={
                  closeReceipt
                }
              >
                {
                  text.close
                }
              </button>

              <button
                type="button"
                className="pf-sales-print-btn"
                onClick={
                  printReceipt
                }
              >
                {
                  text.printReceipt
                }
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}
