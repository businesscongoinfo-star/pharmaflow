import { NextRequest, NextResponse } from "next/server";

import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

type StockMovementType = "entry" | "exit";

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function parsePositiveInteger(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

async function getCurrentUserContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      profile: null,
      error: "Utilisateur non authentifié.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, pharmacy_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      supabase,
      user,
      profile: null,
      error: "Impossible de récupérer votre profil.",
    };
  }

  if (!profile?.pharmacy_id) {
    return {
      supabase,
      user,
      profile: null,
      error: "Votre compte n'est associé à aucune pharmacie.",
    };
  }

  return {
    supabase,
    user,
    profile,
    error: null,
  };
}

function canManageStock(role: string | null | undefined) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "pharmacist"
  );
}

export async function GET(request: NextRequest) {
  try {
    const {
      supabase,
      profile,
      error: contextError,
    } = await getCurrentUserContext();

    if (contextError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: contextError ?? "Profil introuvable.",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const search = cleanString(searchParams.get("search"));
    const movementType = cleanString(searchParams.get("type"));

    const limitRaw = Number(searchParams.get("limit") ?? "100");

    const limit =
      Number.isInteger(limitRaw) && limitRaw > 0
        ? Math.min(limitRaw, 500)
        : 100;

    const pharmacyId = profile.pharmacy_id;

    const [
      productsResult,
      movementsResult,
      pharmacyResult,
    ] = await Promise.all([
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
        .eq("is_active", true)
        .order("name", { ascending: true }),

      supabase
        .from("stock_movements")
        .select(
          `
            id,
            pharmacy_id,
            product_id,
            user_id,
            type,
            quantity,
            reason,
            reference,
            created_at
          `,
        )
        .eq("pharmacy_id", pharmacyId)
        .order("created_at", { ascending: false })
        .limit(limit),

      supabase
        .from("pharmacies")
        .select(
          `
            id,
            name,
            language,
            currency_code
          `,
        )
        .eq("id", pharmacyId)
        .maybeSingle(),
    ]);

    if (productsResult.error) {
      console.error("Stock products error:", productsResult.error);

      return NextResponse.json(
        {
          success: false,
          error: "Impossible de récupérer les produits.",
        },
        { status: 500 },
      );
    }

    if (movementsResult.error) {
      console.error("Stock movements error:", movementsResult.error);

      return NextResponse.json(
        {
          success: false,
          error: "Impossible de récupérer l'historique du stock.",
        },
        { status: 500 },
      );
    }

    if (pharmacyResult.error) {
      console.error("Stock pharmacy error:", pharmacyResult.error);

      return NextResponse.json(
        {
          success: false,
          error: "Impossible de récupérer les informations de la pharmacie.",
        },
        { status: 500 },
      );
    }

    let products = productsResult.data ?? [];

    if (search) {
      const normalizedSearch = search.toLowerCase();

      products = products.filter((product) => {
        const values = [
          product.name,
          product.generic_name,
          product.category,
          product.barcode,
          product.sku,
        ];

        return values.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalizedSearch),
        );
      });
    }

    let movements = movementsResult.data ?? [];

    if (movementType === "entry" || movementType === "exit") {
      movements = movements.filter(
        (movement) => movement.type === movementType,
      );
    }

    const productMap = new Map(
      productsResult.data?.map((product) => [
        product.id,
        product,
      ]) ?? [],
    );

    const userIds = Array.from(
      new Set(
        movements
          .map((movement) => movement.user_id)
          .filter(Boolean),
      ),
    );

    let users: Record<
      string,
      {
        id: string;
        full_name: string | null;
      }
    > = {};

    if (userIds.length > 0) {
      const { data: userProfiles, error: usersError } =
        await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("pharmacy_id", pharmacyId)
          .in("id", userIds);

      if (!usersError && userProfiles) {
        users = Object.fromEntries(
          userProfiles.map((user) => [
            user.id,
            user,
          ]),
        );
      }
    }

    const enrichedMovements = movements.map((movement) => ({
      ...movement,
      product: productMap.get(movement.product_id) ?? null,
      user: movement.user_id
        ? users[movement.user_id] ?? null
        : null,
    }));

    const allProducts = productsResult.data ?? [];

    const totalProducts = allProducts.length;

    const totalUnits = allProducts.reduce(
      (sum, product) =>
        sum + Number(product.stock_quantity ?? 0),
      0,
    );

    const stockValue = allProducts.reduce(
      (sum, product) =>
        sum +
        Number(product.stock_quantity ?? 0) *
          Number(product.purchase_price ?? 0),
      0,
    );

    const sellingValue = allProducts.reduce(
      (sum, product) =>
        sum +
        Number(product.stock_quantity ?? 0) *
          Number(product.selling_price ?? 0),
      0,
    );

    const lowStockProducts = allProducts.filter(
      (product) =>
        Number(product.stock_quantity ?? 0) <=
        Number(product.minimum_stock ?? 0),
    );

    const outOfStockProducts = allProducts.filter(
      (product) =>
        Number(product.stock_quantity ?? 0) <= 0,
    );

    const today = new Date();

    const thirtyDaysFromNow = new Date(today);

    thirtyDaysFromNow.setDate(
      thirtyDaysFromNow.getDate() + 30,
    );

    const expiringProducts = allProducts.filter(
      (product) => {
        if (!product.expiry_date) {
          return false;
        }

        const expiry = new Date(product.expiry_date);

        return (
          expiry >= today &&
          expiry <= thirtyDaysFromNow
        );
      },
    );

    const expiredProducts = allProducts.filter(
      (product) => {
        if (!product.expiry_date) {
          return false;
        }

        return new Date(product.expiry_date) < today;
      },
    );

    const totalEntries = allProducts.length
      ? (movementsResult.data ?? [])
          .filter(
            (movement) => movement.type === "entry",
          )
          .reduce(
            (sum, movement) =>
              sum + Number(movement.quantity ?? 0),
            0,
          )
      : 0;

    const totalExits = allProducts.length
      ? (movementsResult.data ?? [])
          .filter(
            (movement) => movement.type === "exit",
          )
          .reduce(
            (sum, movement) =>
              sum + Number(movement.quantity ?? 0),
            0,
          )
      : 0;

    return NextResponse.json({
      success: true,

      pharmacy: pharmacyResult.data ?? null,

      permissions: {
        canManageStock: canManageStock(
          profile.role,
        ),
        role: profile.role,
      },

      statistics: {
        totalProducts,
        totalUnits,
        stockValue,
        sellingValue,
        potentialMargin: sellingValue - stockValue,
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
        expiringSoon: expiringProducts.length,
        expired: expiredProducts.length,
        totalEntries,
        totalExits,
      },

      products,

      movements: enrichedMovements,
    });
  } catch (error) {
    console.error("Stock GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Une erreur inattendue est survenue.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      supabase,
      profile,
      error: contextError,
    } = await getCurrentUserContext();

    if (contextError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: contextError ?? "Profil introuvable.",
        },
        { status: 401 },
      );
    }

    if (!canManageStock(profile.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vous n'avez pas la permission de modifier le stock.",
        },
        { status: 403 },
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Données invalides.",
        },
        { status: 400 },
      );
    }

    const productId = cleanString(
      body.product_id,
    );

    const type = cleanString(
      body.type,
    ) as StockMovementType | null;

    const quantity = parsePositiveInteger(
      body.quantity,
    );

    const reason =
      cleanString(body.reason) ??
      "Mouvement de stock";

    const reference = cleanString(
      body.reference,
    );

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Le produit est obligatoire.",
        },
        { status: 400 },
      );
    }

    if (type !== "entry" && type !== "exit") {
      return NextResponse.json(
        {
          success: false,
          error: "Le type de mouvement est invalide.",
        },
        { status: 400 },
      );
    }

    if (!quantity) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La quantité doit être un nombre entier supérieur à zéro.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc(
      "pf_stock_move",
      {
        p_product_id: productId,
        p_type: type,
        p_quantity: quantity,
        p_reason: reason,
        p_reference: reference,
      },
    );

    if (error) {
      console.error("Stock movement RPC error:", error);

      return NextResponse.json(
        {
          success: false,
          error:
            error.message ||
            "Impossible d'enregistrer le mouvement.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      movement: data,
    });
  } catch (error) {
    console.error("Stock POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Une erreur inattendue est survenue.",
      },
      { status: 500 },
    );
  }
}