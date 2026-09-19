import { NextResponse } from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperAdminApi } from "@/app/lib/super-admin/auth";

/**
 * ============================================================
 * PHARMAFLOW — SUPER ADMIN IA
 * API D'ANALYSE DE LA PLATEFORME
 * ============================================================
 *
 * Cette API fournit au Centre IA des indicateurs réels :
 *
 * - pharmacies
 * - statuts des pharmacies
 * - abonnements
 * - paiements
 * - ventes
 * - actions administratives
 *
 * IMPORTANT :
 *
 * L'IA peut analyser ces informations.
 * Elle ne modifie aucune donnée depuis cette API.
 *
 * Toute action administrative reste effectuée par les
 * interfaces Super Admin existantes.
 * ============================================================
 */

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type PharmacyRow = {
  id: string;
  name: string;
  status: string | null;
  city: string | null;
  country_code: string | null;
  currency_code: string | null;
  created_at: string;
};

type SubscriptionRow = {
  id: string;
  pharmacy_id: string;
  status: string | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  pharmacy_id: string;
  amount: number | null;
  method: string | null;
  created_at: string;
};

type SaleRow = {
  id: string;
  pharmacy_id: string;
  total: number | null;
  status: string | null;
  created_at: string;
};

type AdminActionRow = {
  id: string;
  pharmacy_id: string;
  action: string;
  reason: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
};

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function isFuture(
  value: string | null,
): boolean {
  if (!value) {
    return false;
  }

  const timestamp =
    new Date(value).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp > Date.now()
  );
}

function isToday(
  value: string,
): boolean {
  const date =
    new Date(value);

  const now =
    new Date();

  return (
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getDate() ===
      now.getDate()
  );
}

function isCurrentMonth(
  value: string,
): boolean {
  const date =
    new Date(value);

  const now =
    new Date();

  return (
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth()
  );
}

function normalizeStatus(
  value: string | null,
): string {
  return String(
    value || "",
  )
    .trim()
    .toLowerCase();
}

/**
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET() {
  try {
    /**
     * --------------------------------------------------------
     * 1. AUTHENTIFICATION SUPER ADMIN
     * --------------------------------------------------------
     */

    const superAdmin =
      await requireSuperAdminApi();

    if (!superAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Accès Super Admin requis.",
        },
        {
          status: 401,
        },
      );
    }

    /**
     * --------------------------------------------------------
     * 2. CLIENT ADMIN SUPABASE
     * --------------------------------------------------------
     */

    const supabase =
      createAdminClient();

    /**
     * --------------------------------------------------------
     * 3. CHARGEMENT DES DONNÉES
     * --------------------------------------------------------
     *
     * Les données sont récupérées côté serveur avec le client
     * administrateur.
     */

    const [
      pharmaciesResult,
      subscriptionsResult,
      paymentsResult,
      salesResult,
      actionsResult,
    ] = await Promise.all([
      supabase
        .from("pharmacies")
        .select(
          `
            id,
            name,
            status,
            city,
            country_code,
            currency_code,
            created_at
          `,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from("subscriptions")
        .select(
          `
            id,
            pharmacy_id,
            status,
            trial_ends_at,
            expires_at,
            created_at
          `,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from("payments")
        .select(
          `
            id,
            pharmacy_id,
            amount,
            method,
            created_at
          `,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(5000),

      supabase
        .from("sales")
        .select(
          `
            id,
            pharmacy_id,
            total,
            status,
            created_at
          `,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(5000),

      supabase
        .from("pharmacy_admin_actions")
        .select(
          `
            id,
            pharmacy_id,
            action,
            reason,
            old_status,
            new_status,
            created_at
          `,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(100),
    ]);

    /**
     * --------------------------------------------------------
     * 4. VÉRIFICATION DES ERREURS
     * --------------------------------------------------------
     */

    if (pharmaciesResult.error) {
      console.error(
        "Super Admin IA pharmacies error:",
        pharmaciesResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer les pharmacies.",
          details:
            pharmaciesResult.error.message,
        },
        {
          status: 500,
        },
      );
    }

    if (subscriptionsResult.error) {
      console.error(
        "Super Admin IA subscriptions error:",
        subscriptionsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer les abonnements.",
          details:
            subscriptionsResult.error.message,
        },
        {
          status: 500,
        },
      );
    }

    if (paymentsResult.error) {
      console.error(
        "Super Admin IA payments error:",
        paymentsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer les paiements.",
          details:
            paymentsResult.error.message,
        },
        {
          status: 500,
        },
      );
    }

    if (salesResult.error) {
      console.error(
        "Super Admin IA sales error:",
        salesResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer les ventes.",
          details:
            salesResult.error.message,
        },
        {
          status: 500,
        },
      );
    }

    if (actionsResult.error) {
      console.error(
        "Super Admin IA actions error:",
        actionsResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de récupérer le journal administratif.",
          details:
            actionsResult.error.message,
        },
        {
          status: 500,
        },
      );
    }

    /**
     * --------------------------------------------------------
     * 5. NORMALISATION
     * --------------------------------------------------------
     */

    const pharmacies =
      (pharmaciesResult.data ||
        []) as PharmacyRow[];

    const subscriptions =
      (subscriptionsResult.data ||
        []) as SubscriptionRow[];

    const payments =
      (paymentsResult.data ||
        []) as PaymentRow[];

    const sales =
      (salesResult.data ||
        []) as SaleRow[];

    const adminActions =
      (actionsResult.data ||
        []) as AdminActionRow[];

    /**
     * --------------------------------------------------------
     * 6. PHARMACIES
     * --------------------------------------------------------
     */

    const activePharmacies =
      pharmacies.filter(
        (pharmacy) =>
          normalizeStatus(
            pharmacy.status,
          ) === "active",
      );

    const inactivePharmacies =
      pharmacies.filter(
        (pharmacy) =>
          normalizeStatus(
            pharmacy.status,
          ) === "inactive",
      );

    const suspendedPharmacies =
      pharmacies.filter(
        (pharmacy) =>
          normalizeStatus(
            pharmacy.status,
          ) === "suspended",
      );

    /**
     * --------------------------------------------------------
     * 7. ABONNEMENTS
     * --------------------------------------------------------
     */

    const activeSubscriptions =
      subscriptions.filter(
        (subscription) => {
          const status =
            normalizeStatus(
              subscription.status,
            );

          if (
            status === "trial" ||
            status === "trialing"
          ) {
            return (
              isFuture(
                subscription.trial_ends_at,
              ) ||
              isFuture(
                subscription.expires_at,
              )
            );
          }

          if (
            status === "active" ||
            status === "paid"
          ) {
            return isFuture(
              subscription.expires_at,
            );
          }

          return false;
        },
      );

    const trialSubscriptions =
      subscriptions.filter(
        (subscription) => {
          const status =
            normalizeStatus(
              subscription.status,
            );

          return (
            status === "trial" ||
            status === "trialing"
          );
        },
      );

    const expiredSubscriptions =
      subscriptions.filter(
        (subscription) => {
          const status =
            normalizeStatus(
              subscription.status,
            );

          if (
            status === "cancelled" ||
            status === "suspended" ||
            status === "past_due"
          ) {
            return true;
          }

          if (
            status === "trial" ||
            status === "trialing"
          ) {
            return (
              !isFuture(
                subscription.trial_ends_at,
              ) &&
              !isFuture(
                subscription.expires_at,
              )
            );
          }

          if (
            status === "active" ||
            status === "paid"
          ) {
            return !isFuture(
              subscription.expires_at,
            );
          }

          return true;
        },
      );

    /**
     * --------------------------------------------------------
     * 8. PAIEMENTS
     * --------------------------------------------------------
     */

    const paymentsToday =
      payments.filter(
        (payment) =>
          isToday(
            payment.created_at,
          ),
      );

    const paymentsThisMonth =
      payments.filter(
        (payment) =>
          isCurrentMonth(
            payment.created_at,
          ),
      );

    const paymentAmountToday =
      paymentsToday.reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount || 0,
          ),
        0,
      );

    const paymentAmountThisMonth =
      paymentsThisMonth.reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount || 0,
          ),
        0,
      );

    /**
     * --------------------------------------------------------
     * 9. VENTES
     * --------------------------------------------------------
     */

    const salesToday =
      sales.filter(
        (sale) =>
          isToday(
            sale.created_at,
          ),
      );

    const salesThisMonth =
      sales.filter(
        (sale) =>
          isCurrentMonth(
            sale.created_at,
          ),
      );

    const salesAmountToday =
      salesToday.reduce(
        (total, sale) =>
          total +
          Number(
            sale.total || 0,
          ),
        0,
      );

    const salesAmountThisMonth =
      salesThisMonth.reduce(
        (total, sale) =>
          total +
          Number(
            sale.total || 0,
          ),
        0,
      );

    /**
     * --------------------------------------------------------
     * 10. MÉTHODES DE PAIEMENT
     * --------------------------------------------------------
     */

    const paymentMethods =
      payments.reduce<
        Record<string, number>
      >(
        (
          accumulator,
          payment,
        ) => {
          const method =
            String(
              payment.method ||
                "unknown",
            )
              .trim()
              .toLowerCase();

          accumulator[method] =
            (accumulator[method] ||
              0) + 1;

          return accumulator;
        },
        {},
      );

    /**
     * --------------------------------------------------------
     * 11. PHARMACIES PAR PAYS
     * --------------------------------------------------------
     */

    const pharmaciesByCountry =
      pharmacies.reduce<
        Record<string, number>
      >(
        (
          accumulator,
          pharmacy,
        ) => {
          const country =
            String(
              pharmacy.country_code ||
                "unknown",
            )
              .trim()
              .toUpperCase();

          accumulator[country] =
            (accumulator[country] ||
              0) + 1;

          return accumulator;
        },
        {},
      );

    /**
     * --------------------------------------------------------
     * 12. PHARMACIES PAR VILLE
     * --------------------------------------------------------
     */

    const pharmaciesByCity =
      pharmacies.reduce<
        Record<string, number>
      >(
        (
          accumulator,
          pharmacy,
        ) => {
          const city =
            String(
              pharmacy.city ||
                "Non renseignée",
            ).trim();

          accumulator[city] =
            (accumulator[city] ||
              0) + 1;

          return accumulator;
        },
        {},
      );

    /**
     * --------------------------------------------------------
     * 13. ACTIONS ADMINISTRATIVES RÉCENTES
     * --------------------------------------------------------
     */

    const recentAdminActions =
      adminActions
        .slice(0, 20)
        .map(
          (action) => ({
            id: action.id,
            pharmacy_id:
              action.pharmacy_id,
            action:
              action.action,
            reason:
              action.reason,
            old_status:
              action.old_status,
            new_status:
              action.new_status,
            created_at:
              action.created_at,
          }),
        );

    /**
     * --------------------------------------------------------
     * 14. PHARMACIES À SURVEILLER
     * --------------------------------------------------------
     */

    const pharmaciesToMonitor =
      pharmacies
        .filter((pharmacy) => {
          const status =
            normalizeStatus(
              pharmacy.status,
            );

          return (
            status === "inactive" ||
            status === "suspended"
          );
        })
        .slice(0, 20)
        .map(
          (pharmacy) => ({
            id: pharmacy.id,
            name: pharmacy.name,
            status:
              normalizeStatus(
                pharmacy.status,
              ),
            city: pharmacy.city,
            country_code:
              pharmacy.country_code,
            currency_code:
              pharmacy.currency_code,
          }),
        );

    /**
     * --------------------------------------------------------
     * 15. RÉSUMÉ POUR L'IA
     * --------------------------------------------------------
     */

    const aiContext = {
      platform: {
        totalPharmacies:
          pharmacies.length,

        activePharmacies:
          activePharmacies.length,

        inactivePharmacies:
          inactivePharmacies.length,

        suspendedPharmacies:
          suspendedPharmacies.length,
      },

      subscriptions: {
        total:
          subscriptions.length,

        active:
          activeSubscriptions.length,

        trials:
          trialSubscriptions.length,

        expired:
          expiredSubscriptions.length,
      },

      payments: {
        totalLoaded:
          payments.length,

        today:
          paymentsToday.length,

        thisMonth:
          paymentsThisMonth.length,

        amountToday:
          paymentAmountToday,

        amountThisMonth:
          paymentAmountThisMonth,

        methods:
          paymentMethods,
      },

      sales: {
        totalLoaded:
          sales.length,

        today:
          salesToday.length,

        thisMonth:
          salesThisMonth.length,

        amountToday:
          salesAmountToday,

        amountThisMonth:
          salesAmountThisMonth,
      },

      geography: {
        countries:
          pharmaciesByCountry,

        cities:
          pharmaciesByCity,
      },

      monitoring: {
        pharmacies:
          pharmaciesToMonitor,

        recentAdminActions:
          recentAdminActions,
      },
    };

    /**
     * --------------------------------------------------------
     * 16. RÉPONSE
     * --------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        generatedAt:
          new Date().toISOString(),

        overview: {
          pharmacies: {
            total:
              pharmacies.length,

            active:
              activePharmacies.length,

            inactive:
              inactivePharmacies.length,

            suspended:
              suspendedPharmacies.length,
          },

          subscriptions: {
            total:
              subscriptions.length,

            active:
              activeSubscriptions.length,

            trials:
              trialSubscriptions.length,

            expired:
              expiredSubscriptions.length,
          },

          payments: {
            today: {
              count:
                paymentsToday.length,

              amount:
                paymentAmountToday,
            },

            month: {
              count:
                paymentsThisMonth.length,

              amount:
                paymentAmountThisMonth,
            },
          },

          sales: {
            today: {
              count:
                salesToday.length,

              amount:
                salesAmountToday,
            },

            month: {
              count:
                salesThisMonth.length,

              amount:
                salesAmountThisMonth,
            },
          },
        },

        monitoring: {
          pharmacies:
            pharmaciesToMonitor,

          recentAdminActions:
            recentAdminActions,
        },

        aiContext,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Super Admin IA overview error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Une erreur interne est survenue lors de l'analyse de PharmaFlow.",
      },
      {
        status: 500,
      },
    );
  }
}