import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * ============================================================
 * PHARMAFLOW — API SUPER ADMIN — PAIEMENTS
 * ============================================================
 *
 * GET /api/admin/payments
 *
 * Cette API récupère les paiements des abonnements
 * PharmaFlow pour le tableau de bord Super Admin.
 *
 * ============================================================
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type PaymentRow = {
  id?: string | null;

  pharmacy_id?: string | null;

  subscription_id?: string | null;

  amount?: number | string | null;

  currency?: string | null;

  currency_code?: string | null;

  status?: string | null;

  payment_status?: string | null;

  method?: string | null;

  payment_method?: string | null;

  provider?: string | null;

  transaction_id?: string | null;

  reference?: string | null;

  payment_reference?: string | null;

  customer_name?: string | null;

  customer_email?: string | null;

  plan_name?: string | null;

  created_at?: string | null;

  paid_at?: string | null;

  metadata?: Record<
    string,
    unknown
  > | null;

  [key: string]: unknown;
};

/**
 * ============================================================
 * NORMALISATION
 * ============================================================
 */

function toNumber(
  value: unknown,
): number {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function toStringOrNull(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const valueString =
    String(value).trim();

  return valueString || null;
}

/**
 * ============================================================
 * GET
 * ============================================================
 */

export async function GET(
  request: NextRequest,
) {
  try {
    /**
     * --------------------------------------------------------
     * CLIENT ADMIN SUPABASE
     * --------------------------------------------------------
     */

    const supabaseAdmin =
      createAdminClient();

    /**
     * --------------------------------------------------------
     * PARAMÈTRES
     * --------------------------------------------------------
     */

    const searchParams =
      request.nextUrl.searchParams;

    const status =
      searchParams.get(
        "status",
      );

    const limitParam =
      searchParams.get(
        "limit",
      );

    const limit =
      Math.min(
        Math.max(
          Number(limitParam) ||
            100,
          1,
        ),
        500,
      );

    /**
     * --------------------------------------------------------
     * TABLE PRINCIPALE
     * --------------------------------------------------------
     *
     * La plateforme utilise la table "payments".
     *
     * --------------------------------------------------------
     */

    let query =
      supabaseAdmin
        .from("payments")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(limit);

    /**
     * --------------------------------------------------------
     * FILTRE STATUT
     * --------------------------------------------------------
     */

    if (
      status &&
      status !== "all"
    ) {
      query =
        query.eq(
          "status",
          status,
        );
    }

    const {
      data,
      error,
    } = await query;

    /**
     * --------------------------------------------------------
     * ERREUR SUPABASE
     * --------------------------------------------------------
     */

    if (error) {
      console.error(
        "[PHARMAFLOW PAYMENTS API] DATABASE_ERROR:",
        {
          message:
            error.message,

          details:
            error.details,

          hint:
            error.hint,

          code:
            error.code,
        },
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "Impossible de charger les paiements.",

          details:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        },
        {
          status: 500,
        },
      );
    }

    /**
     * --------------------------------------------------------
     * NORMALISATION DES PAIEMENTS
     * --------------------------------------------------------
     */

    const rows =
      Array.isArray(data)
        ? (data as PaymentRow[])
        : [];

    /**
     * --------------------------------------------------------
     * RÉCUPÉRATION DES PHARMACIES
     * --------------------------------------------------------
     */

    const pharmacyIds =
      Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.pharmacy_id,
            )
            .filter(
              (
                id,
              ): id is string =>
                Boolean(id),
            ),
        ),
      );

    const pharmacyMap =
      new Map<
        string,
        {
          name: string | null;
          owner_id: string | null;
        }
      >();

    if (
      pharmacyIds.length > 0
    ) {
      const {
        data:
          pharmacies,
        error:
          pharmaciesError,
      } =
        await supabaseAdmin
          .from("pharmacies")
          .select(
            "id, name, owner_id",
          )
          .in(
            "id",
            pharmacyIds,
          );

      if (
        pharmaciesError
      ) {
        console.error(
          "[PHARMAFLOW PAYMENTS API] PHARMACIES_ERROR:",
          pharmaciesError,
        );
      } else {
        (
          pharmacies || []
        ).forEach(
          (pharmacy) => {
            pharmacyMap.set(
              pharmacy.id,
              {
                name:
                  pharmacy.name ??
                  null,

                owner_id:
                  pharmacy.owner_id ??
                  null,
              },
            );
          },
        );
      }
    }

    /**
     * --------------------------------------------------------
     * RÉCUPÉRATION DES PLANS
     * --------------------------------------------------------
     */

    const planIds =
      Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.subscription_id,
            )
            .filter(
              (
                id,
              ): id is string =>
                Boolean(id),
            ),
        ),
      );

    const subscriptionMap =
      new Map<
        string,
        {
          plan_id:
            | string
            | null;
        }
      >();

    if (
      planIds.length > 0
    ) {
      const {
        data:
          subscriptions,
        error:
          subscriptionsError,
      } =
        await supabaseAdmin
          .from(
            "subscriptions",
          )
          .select(
            "id, plan_id",
          )
          .in(
            "id",
            planIds,
          );

      if (
        subscriptionsError
      ) {
        console.error(
          "[PHARMAFLOW PAYMENTS API] SUBSCRIPTIONS_ERROR:",
          subscriptionsError,
        );
      } else {
        (
          subscriptions || []
        ).forEach(
          (
            subscription,
          ) => {
            subscriptionMap.set(
              subscription.id,
              {
                plan_id:
                  subscription.plan_id ??
                  null,
              },
            );
          },
        );
      }
    }

    /**
     * --------------------------------------------------------
     * RÉCUPÉRATION DES PLANS
     * --------------------------------------------------------
     */

    const subscriptionPlanIds =
      Array.from(
        new Set(
          Array.from(
            subscriptionMap.values(),
          )
            .map(
              (
                subscription,
              ) =>
                subscription.plan_id,
            )
            .filter(
              (
                id,
              ): id is string =>
                Boolean(id),
            ),
        ),
      );

    const planMap =
      new Map<
        string,
        {
          name: string | null;
        }
      >();

    if (
      subscriptionPlanIds.length >
      0
    ) {
      const {
        data: plans,
        error: plansError,
      } =
        await supabaseAdmin
          .from(
            "subscription_plans",
          )
          .select(
            "id, name",
          )
          .in(
            "id",
            subscriptionPlanIds,
          );

      if (plansError) {
        console.error(
          "[PHARMAFLOW PAYMENTS API] PLANS_ERROR:",
          plansError,
        );
      } else {
        (
          plans || []
        ).forEach(
          (plan) => {
            planMap.set(
              plan.id,
              {
                name:
                  plan.name ??
                  null,
              },
            );
          },
        );
      }
    }

    /**
     * --------------------------------------------------------
     * RÉCUPÉRATION DES PROPRIÉTAIRES
     * --------------------------------------------------------
     */

    const ownerIds =
      Array.from(
        new Set(
          Array.from(
            pharmacyMap.values(),
          )
            .map(
              (
                pharmacy,
              ) =>
                pharmacy.owner_id,
            )
            .filter(
              (
                id,
              ): id is string =>
                Boolean(id),
            ),
        ),
      );

    const profileMap =
      new Map<
        string,
        {
          full_name:
            | string
            | null;

          email:
            | string
            | null;
        }
      >();

    if (
      ownerIds.length > 0
    ) {
      const {
        data: profiles,
        error:
          profilesError,
      } =
        await supabaseAdmin
          .from("profiles")
          .select(
            "id, full_name, phone",
          )
          .in(
            "id",
            ownerIds,
          );

      if (
        profilesError
      ) {
        console.error(
          "[PHARMAFLOW PAYMENTS API] PROFILES_ERROR:",
          profilesError,
        );
      } else {
        (
          profiles || []
        ).forEach(
          (profile) => {
            profileMap.set(
              profile.id,
              {
                full_name:
                  profile.full_name ??
                  null,

                email:
                  null,
              },
            );
          },
        );
      }
    }

    /**
     * --------------------------------------------------------
     * CONSTRUCTION DES DONNÉES
     * --------------------------------------------------------
     */

    const payments =
      rows.map(
        (row) => {
          const pharmacy =
            row.pharmacy_id
              ? pharmacyMap.get(
                  row.pharmacy_id,
                )
              : undefined;

          const subscription =
            row.subscription_id
              ? subscriptionMap.get(
                  row.subscription_id,
                )
              : undefined;

          const plan =
            subscription?.plan_id
              ? planMap.get(
                  subscription.plan_id,
                )
              : undefined;

          const profile =
            pharmacy?.owner_id
              ? profileMap.get(
                  pharmacy.owner_id,
                )
              : undefined;

          const amount =
            toNumber(
              row.amount,
            );

          const currency =
            toStringOrNull(
              row.currency ||
                row.currency_code,
            ) ||
            "XAF";

          const normalizedStatus =
            toStringOrNull(
              row.status ||
                row.payment_status,
            );

          const normalizedMethod =
            toStringOrNull(
              row.method ||
                row.payment_method,
            );

          const reference =
            toStringOrNull(
              row.reference ||
                row.payment_reference,
            );

          const transactionId =
            toStringOrNull(
              row.transaction_id,
            );

          return {
            id:
              toStringOrNull(
                row.id,
              ) ||
              crypto.randomUUID(),

            pharmacy_id:
              row.pharmacy_id ??
              null,

            subscription_id:
              row.subscription_id ??
              null,

            amount,

            currency,

            status:
              normalizedStatus,

            method:
              normalizedMethod,

            provider:
              toStringOrNull(
                row.provider,
              ),

            transaction_id:
              transactionId,

            reference,

            customer_name:
              toStringOrNull(
                row.customer_name,
              ) ||
              profile?.full_name ||
              null,

            customer_email:
              toStringOrNull(
                row.customer_email,
              ),

            pharmacy_name:
              pharmacy?.name ||
              null,

            plan_name:
              toStringOrNull(
                row.plan_name,
              ) ||
              plan?.name ||
              null,

            created_at:
              toStringOrNull(
                row.created_at,
              ),

            paid_at:
              toStringOrNull(
                row.paid_at,
              ),

            metadata:
              row.metadata ??
              null,
          };
        },
      );

    /**
     * --------------------------------------------------------
     * STATISTIQUES
     * --------------------------------------------------------
     */

    const successfulPayments =
      payments.filter(
        (payment) =>
          [
            "paid",
            "successful",
          ].includes(
            String(
              payment.status ||
                "",
            )
              .trim()
              .toLowerCase(),
          ),
      );

    const pendingPayments =
      payments.filter(
        (payment) =>
          [
            "pending",
            "processing",
          ].includes(
            String(
              payment.status ||
                "",
            )
              .trim()
              .toLowerCase(),
          ),
      );

    const totalAmount =
      successfulPayments.reduce(
        (
          total,
          payment,
        ) =>
          total +
          payment.amount,
        0,
      );

    /**
     * --------------------------------------------------------
     * RÉPONSE
     * --------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        payments,

        total:
          payments.length,

        statistics: {
          total:
            payments.length,

          successful:
            successfulPayments.length,

          pending:
            pendingPayments.length,

          totalAmount,
        },
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
    /**
     * --------------------------------------------------------
     * ERREUR INATTENDUE
     * --------------------------------------------------------
     */

    console.error(
      "[PHARMAFLOW PAYMENTS API] UNEXPECTED_ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Une erreur interne est survenue lors du chargement des paiements.",
      },
      {
        status: 500,
      },
    );
  }
}