import Link from "next/link";

import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ProviderVariable = {
  name: string;
  label: string;
  type: "text" | "password" | "url";
  description: string;
  required: boolean;
};

type ProviderConfig = {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  environment: "sandbox" | "production";
  variables: ProviderVariable[];
};

const providers: Record<string, ProviderConfig> = {
  /*
  |--------------------------------------------------------------------------
  | MOKO AFRIKA
  |--------------------------------------------------------------------------
  */

  "moko-afrika": {
    id: "moko-afrika",
    name: "Moko Afrika",
    icon: "💳",
    category: "Paiements",
    description:
      "Configuration complète de Moko Afrika pour les paiements Mobile Money et par carte.",
    environment: "sandbox",

    variables: [
      {
        name: "MOKO_AFRIKA_MODE",
        label: "Mode",
        type: "text",
        description:
          "Utilisez sandbox pour les tests ou production pour les paiements réels.",
        required: true,
      },

      {
        name: "MOKO_AFRIKA_BASE_URL",
        label: "URL API Mobile Money",
        type: "url",
        description:
          "URL de base utilisée par l'API Moko Afrika Mobile Money.",
        required: true,
      },

      {
        name: "MOKO_AFRIKA_MERCHANT_ID",
        label: "Merchant ID",
        type: "text",
        description:
          "Identifiant marchand Moko Afrika utilisé pour les paiements Mobile Money.",
        required: true,
      },

      {
        name: "MOKO_AFRIKA_MERCHANT_SECRET",
        label: "Merchant Secret",
        type: "password",
        description:
          "Secret marchand Moko Afrika utilisé pour authentifier les paiements Mobile Money.",
        required: true,
      },

      {
        name: "MOKO_AFRIKA_CALLBACK_URL",
        label: "Callback URL Mobile Money",
        type: "url",
        description:
          "URL publique utilisée pour recevoir les notifications Mobile Money.",
        required: false,
      },

      {
        name: "MOKO_AFRIKA_WEBHOOK_AES_KEY",
        label: "Webhook AES Key",
        type: "password",
        description:
          "Clé AES utilisée pour sécuriser ou déchiffrer certains callbacks Moko Afrika.",
        required: false,
      },

      {
        name: "MOKO_AFRIKA_WEBHOOK_HMAC_KEY",
        label: "Webhook HMAC Key",
        type: "password",
        description:
          "Clé HMAC utilisée pour vérifier certains callbacks.",
        required: false,
      },

      {
        name: "MOKO_AFRIKA_CARD_BASE_URL",
        label: "URL API Carte",
        type: "url",
        description:
          "URL de base de l'API Moko Afrika Card Payments.",
        required: true,
      },

      {
        name: "MOKO_AFRIKA_CARD_API_KEY",
        label: "Card API Key",
        type: "password",
        description:
          "Clé API utilisée pour authentifier les paiements par carte.",
        required: true,
      },

      {
        name: "MOKO_AFRIKA_CARD_API_SECRET",
        label: "Card API Secret",
        type: "password",
        description:
          "Secret utilisé pour générer la signature HMAC des requêtes carte.",
        required: true,
      },

      {
        name: "MOKO_AFRIKA_CARD_CALLBACK_SECRET",
        label: "Card Callback Secret",
        type: "password",
        description:
          "Secret utilisé pour vérifier les callbacks provenant du système de paiement carte.",
        required: false,
      },

      {
        name: "MOKO_AFRIKA_CARD_CALLBACK_URL",
        label: "Card Callback URL",
        type: "url",
        description:
          "URL publique appelée par Moko Afrika après le traitement d'un paiement carte.",
        required: false,
      },

      {
        name: "MOKO_AFRIKA_CARD_RETURN_URL",
        label: "Card Return URL",
        type: "url",
        description:
          "URL vers laquelle le client revient après un paiement carte réussi.",
        required: false,
      },

      {
        name: "MOKO_AFRIKA_CARD_CANCEL_URL",
        label: "Card Cancel URL",
        type: "url",
        description:
          "URL vers laquelle le client est redirigé lorsqu'il annule un paiement carte.",
        required: false,
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | YABETOO
  |--------------------------------------------------------------------------
  */

  yabetoo: {
    id: "yabetoo",
    name: "Yabétoo",
    icon: "📱",
    category: "Paiements",
    description:
      "Configuration du fournisseur de paiement Yabétoo.",
    environment: "sandbox",

    variables: [
      {
        name: "YABETOO_MODE",
        label: "Mode",
        type: "text",
        description:
          "sandbox ou production.",
        required: true,
      },

      {
        name: "YABETOO_BASE_URL",
        label: "URL API",
        type: "url",
        description:
          "URL de base de l'API Yabétoo.",
        required: true,
      },

      {
        name: "YABETOO_API_KEY",
        label: "API Key",
        type: "password",
        description:
          "Clé API Yabétoo.",
        required: true,
      },

      {
        name: "YABETOO_SECRET_KEY",
        label: "Secret Key",
        type: "password",
        description:
          "Clé secrète Yabétoo.",
        required: true,
      },

      {
        name: "YABETOO_CALLBACK_URL",
        label: "Callback URL",
        type: "url",
        description:
          "URL utilisée pour recevoir les callbacks Yabétoo.",
        required: false,
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | GOFRESHPAY
  |--------------------------------------------------------------------------
  */

  gofreshpay: {
    id: "gofreshpay",
    name: "GoFreshPay",
    icon: "💰",
    category: "Paiements",
    description:
      "Configuration du fournisseur GoFreshPay / FreshPay.",
    environment: "sandbox",

    variables: [
      {
        name: "GOFRESHPAY_MODE",
        label: "Mode",
        type: "text",
        description:
          "sandbox ou production.",
        required: true,
      },

      {
        name: "GOFRESHPAY_BASE_URL",
        label: "URL API",
        type: "url",
        description:
          "URL de base de l'API GoFreshPay.",
        required: true,
      },

      {
        name: "GOFRESHPAY_MERCHANT_ID",
        label: "Merchant ID",
        type: "text",
        description:
          "Identifiant marchand GoFreshPay.",
        required: true,
      },

      {
        name: "GOFRESHPAY_MERCHANT_SECRET",
        label: "Merchant Secret",
        type: "password",
        description:
          "Secret marchand GoFreshPay.",
        required: true,
      },

      {
        name: "GOFRESHPAY_CALLBACK_URL",
        label: "Callback URL",
        type: "url",
        description:
          "URL utilisée pour recevoir les callbacks.",
        required: true,
      },

      {
        name: "FRESHPAY_SECRET_KEY",
        label: "Webhook Secret Key",
        type: "password",
        description:
          "Clé utilisée pour sécuriser les callbacks.",
        required: false,
      },

      {
        name: "FRESHPAY_HMAC_KEY",
        label: "Webhook HMAC Key",
        type: "password",
        description:
          "Clé HMAC utilisée pour les callbacks.",
        required: false,
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | SUPABASE
  |--------------------------------------------------------------------------
  */

  supabase: {
    id: "supabase",
    name: "Supabase",
    icon: "⚡",
    category: "Infrastructure",
    description:
      "Configuration de l'infrastructure Supabase de PharmaFlow.",
    environment: "production",

    variables: [
      {
        name: "NEXT_PUBLIC_SUPABASE_URL",
        label: "Supabase URL",
        type: "url",
        description:
          "URL publique du projet Supabase.",
        required: true,
      },

      {
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        label: "Supabase Anon Key",
        type: "password",
        description:
          "Clé publique utilisée côté client.",
        required: true,
      },

      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        label: "Service Role Key",
        type: "password",
        description:
          "Clé serveur extrêmement sensible. Ne jamais l'exposer côté navigateur.",
        required: true,
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | NEXT.JS
  |--------------------------------------------------------------------------
  */

  nextjs: {
    id: "nextjs",
    name: "Next.js",
    icon: "▲",
    category: "Infrastructure",
    description:
      "Configuration générale de l'application PharmaFlow.",
    environment: "production",

    variables: [
      {
        name: "NEXT_PUBLIC_APP_URL",
        label: "URL de l'application",
        type: "url",
        description:
          "URL publique officielle de PharmaFlow.",
        required: true,
      },
    ],
  },
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default async function IntegrationConfigurationPage({
  params,
}: PageProps) {
  const admin =
    await requireSuperAdmin();

  const { id } =
    await params;

  const provider =
    providers[id];

  if (!provider) {
    notFound();
  }

  const isMoko =
    provider.id ===
    "moko-afrika";

  const isPaymentProvider =
    provider.category ===
    "Paiements";

  return (
    <main className="configuration-page">
      <header className="configuration-header">
        <div className="header-main">
          <Link
            href="/super-admin/integrations"
            className="back-link"
          >
            ← Retour aux intégrations
          </Link>

          <div className="title-row">
            <div className="provider-icon">
              {provider.icon}
            </div>

            <div className="title-content">
              <div className="title-meta">
                <span className="category-badge">
                  {provider.category}
                </span>

                <span
                  className={`environment-badge ${
                    provider.environment ===
                    "sandbox"
                      ? "sandbox"
                      : "production"
                  }`}
                >
                  {provider.environment ===
                  "sandbox"
                    ? "🧪 Sandbox"
                    : "🟢 Production"}
                </span>
              </div>

              <h1>
                Configuration —{" "}
                {provider.name}
              </h1>

              <p>
                {provider.description}
              </p>
            </div>
          </div>
        </div>

        <div className="admin-box">
          <div className="admin-avatar">
            {(admin.full_name ??
              "SA")
              .trim()
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="admin-information">
            <strong>
              {admin.full_name ??
                "Super Administrateur"}
            </strong>

            <span>
              Super Administrateur
            </span>
          </div>
        </div>
      </header>

      <section className="configuration-content">
        <div className="configuration-grid">
          <section className="configuration-card">
            <div className="card-heading">
              <div>
                <span className="section-kicker">
                  CONFIGURATION
                </span>

                <h2>
                  Paramètres de
                  l'intégration
                </h2>

                <p>
                  Renseignez les informations
                  nécessaires au fonctionnement
                  de {provider.name}.
                </p>
              </div>

              <div className="provider-status">
                <span className="status-dot" />
                Configuration serveur
              </div>
            </div>

            {isMoko && (
              <div className="moko-overview">
                <div className="moko-overview-header">
                  <div className="moko-logo">
                    💳
                  </div>

                  <div>
                    <strong>
                      Moko Afrika
                    </strong>

                    <span>
                      Paiements Mobile Money +
                      Carte bancaire
                    </span>
                  </div>
                </div>

                <div className="moko-services">
                  <div className="service-item">
                    <span className="service-icon">
                      📱
                    </span>

                    <div>
                      <strong>
                        Mobile Money
                      </strong>

                      <small>
                        Merchant ID + Merchant
                        Secret
                      </small>
                    </div>
                  </div>

                  <div className="service-item">
                    <span className="service-icon">
                      💳
                    </span>

                    <div>
                      <strong>
                        Carte bancaire
                      </strong>

                      <small>
                        API Key + API Secret
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="notice">
              <div className="notice-icon">
                🔐
              </div>

              <div>
                <strong>
                  Informations sensibles
                </strong>

                <p>
                  Les clés API, secrets marchands
                  et clés de signature sont traités
                  côté serveur. Ne les partagez
                  jamais dans le code client,
                  WhatsApp ou un dépôt Git.
                </p>
              </div>
            </div>

            <form
              className="configuration-form"
              action="/api/super-admin/integrations/configuration"
              method="POST"
            >
              <input
                type="hidden"
                name="provider"
                value={provider.id}
              />

              <input
                type="hidden"
                name="environment"
                value={
                  provider.environment
                }
              />

              <input
                type="hidden"
                name="isEnabled"
                value="true"
              />

              {isMoko && (
                <>
                  <div className="form-section">
                    <div className="form-section-title">
                      <span>
                        📱
                      </span>

                      <div>
                        <h3>
                          Mobile Money
                        </h3>

                        <p>
                          Configuration utilisée
                          pour les paiements
                          Mobile Money.
                        </p>
                      </div>
                    </div>
                  </div>

                  {provider.variables
                    .filter(
                      (variable) =>
                        !variable.name.includes(
                          "_CARD_",
                        ),
                    )
                    .map(
                      (
                        variable,
                      ) => (
                        <ConfigurationField
                          key={
                            variable.name
                          }
                          variable={
                            variable
                          }
                        />
                      ),
                    )}

                  <div className="form-section card-section">
                    <div className="form-section-title">
                      <span>
                        💳
                      </span>

                      <div>
                        <h3>
                          Paiement par carte
                        </h3>

                        <p>
                          Configuration de
                          l'API Moko Afrika
                          Card Payments.
                        </p>
                      </div>
                    </div>
                  </div>

                  {provider.variables
                    .filter(
                      (variable) =>
                        variable.name.includes(
                          "_CARD_",
                        ),
                    )
                    .map(
                      (
                        variable,
                      ) => (
                        <ConfigurationField
                          key={
                            variable.name
                          }
                          variable={
                            variable
                          }
                        />
                      ),
                    )}
                </>
              )}

              {!isMoko &&
                provider.variables.map(
                  (variable) => (
                    <ConfigurationField
                      key={
                        variable.name
                      }
                      variable={
                        variable
                      }
                    />
                  ),
                )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="save-button"
                >
                  <span>💾</span>
                  Enregistrer la configuration
                </button>

                <Link
                  href="/super-admin/integrations"
                  className="cancel-button"
                >
                  Annuler
                </Link>
              </div>
            </form>
          </section>

          <aside>
            <section className="side-card provider-card">
              <div className="side-provider-icon">
                {provider.icon}
              </div>

              <div className="side-category">
                {provider.category}
              </div>

              <h2>
                {provider.name}
              </h2>

              <p>
                {provider.description}
              </p>

              <div className="side-status">
                <span />
                Intégration disponible
              </div>
            </section>

            {isPaymentProvider && (
              <section className="side-card">
                <div className="side-card-heading">
                  <span>
                    🧾
                  </span>

                  <h3>
                    Parcours du paiement
                  </h3>
                </div>

                <div className="flow-list">
                  <FlowItem
                    number="01"
                    title="Client"
                    text="Le client choisit son moyen de paiement."
                  />

                  <FlowItem
                    number="02"
                    title="PharmaFlow"
                    text="Le Payment Engine sélectionne et appelle le fournisseur."
                  />

                  <FlowItem
                    number="03"
                    title={provider.name}
                    text="Le fournisseur traite la transaction."
                  />

                  <FlowItem
                    number="04"
                    title="Webhook"
                    text="PharmaFlow reçoit et vérifie le résultat."
                  />

                  <FlowItem
                    number="05"
                    title="Abonnement"
                    text="Le statut de l'abonnement est mis à jour."
                  />
                </div>
              </section>
            )}

            <section className="side-card">
              <div className="side-card-heading">
                <span>
                  🛡️
                </span>

                <h3>
                  Bonnes pratiques
                </h3>
              </div>

              <ul className="best-practices">
                <li>
                  <span>✓</span>
                  <p>
                    Ne partagez jamais vos
                    secrets.
                  </p>
                </li>

                <li>
                  <span>✓</span>
                  <p>
                    Testez d'abord en
                    Sandbox.
                  </p>
                </li>

                <li>
                  <span>✓</span>
                  <p>
                    Vérifiez les callbacks
                    et webhooks.
                  </p>
                </li>

                <li>
                  <span>✓</span>
                  <p>
                    Conservez les références
                    de paiement.
                  </p>
                </li>

                <li>
                  <span>✓</span>
                  <p>
                    Ne mettez jamais une clé
                    secrète dans le navigateur.
                  </p>
                </li>
              </ul>
            </section>

            <section className="side-card warning-card">
              <div className="warning-icon">
                ⚠️
              </div>

              <strong>
                Attention
              </strong>

              <p>
                Les informations saisies ici
                sont utilisées côté serveur.
                Vérifiez vos identifiants avant
                de passer en production.
              </p>
            </section>
          </aside>
        </div>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .configuration-page {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .configuration-header {
          min-height: 90px;
          padding: 18px 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }

        .header-main {
          min-width: 0;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          margin-bottom: 12px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: .2s ease;
        }

        .back-link:hover {
          color: #2563eb;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .provider-icon {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          font-size: 25px;
        }

        .title-content {
          min-width: 0;
        }

        .title-meta {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .category-badge {
          padding: 4px 8px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .environment-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
        }

        .environment-badge.sandbox {
          background: #fff7ed;
          color: #c2410c;
        }

        .environment-badge.production {
          background: #ecfdf5;
          color: #047857;
        }

        .title-content h1 {
          margin: 0 0 4px;
          font-size: 23px;
          line-height: 1.2;
          letter-spacing: -.02em;
        }

        .title-content p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .admin-box {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
        }

        .admin-avatar {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #0f172a;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
        }

        .admin-information strong {
          display: block;
          font-size: 12px;
          white-space: nowrap;
        }

        .admin-information span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 10px;
        }

        .configuration-content {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px;
        }

        .configuration-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            330px;
          gap: 24px;
          align-items: start;
        }

        .configuration-card,
        .side-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow:
            0 8px 28px
            rgba(15, 23, 42, .045);
        }

        .configuration-card {
          padding: 27px;
        }

        .card-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .section-kicker {
          display: block;
          margin-bottom: 7px;
          color: #2563eb;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .card-heading h2 {
          margin: 0 0 5px;
          font-size: 19px;
          letter-spacing: -.02em;
        }

        .card-heading p {
          max-width: 600px;
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        .provider-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 10px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
        }

        .moko-overview {
          margin-bottom: 22px;
          padding: 18px;
          border: 1px solid #dbeafe;
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              #eff6ff,
              #f8fbff
            );
        }

        .moko-overview-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
        }

        .moko-logo {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #ffffff;
          border: 1px solid #dbeafe;
          font-size: 21px;
        }

        .moko-overview-header strong {
          display: block;
          font-size: 14px;
        }

        .moko-overview-header span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 10px;
        }

        .moko-services {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .service-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #ffffff;
        }

        .service-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f8fafc;
          font-size: 16px;
        }

        .service-item strong {
          display: block;
          font-size: 11px;
        }

        .service-item small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .notice {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          padding: 15px;
          border: 1px solid #dbeafe;
          border-radius: 14px;
          background: #eff6ff;
        }

        .notice-icon {
          flex: 0 0 auto;
          font-size: 20px;
        }

        .notice strong {
          display: block;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .notice p {
          margin: 0;
          color: #475569;
          font-size: 10px;
          line-height: 1.65;
        }

        .configuration-form {
          display: flex;
          flex-direction: column;
          gap: 19px;
        }

        .form-section {
          margin-top: 3px;
          margin-bottom: 1px;
          padding-bottom: 13px;
          border-bottom: 1px solid #e2e8f0;
        }

        .form-section.card-section {
          margin-top: 12px;
        }

        .form-section-title {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .form-section-title > span {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #f1f5f9;
          font-size: 18px;
        }

        .form-section-title h3 {
          margin: 0 0 3px;
          font-size: 14px;
        }

        .form-section-title p {
          margin: 0;
          color: #64748b;
          font-size: 10px;
          line-height: 1.5;
        }

        .field {
          display: flex;
          flex-direction: column;
        }

        .field label {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 800;
        }

        .required {
          margin-left: 4px;
          color: #dc2626;
          font-size: 12px;
        }

        .field input {
          width: 100%;
          height: 45px;
          padding: 0 13px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          outline: none;
          background: #ffffff;
          color: #0f172a;
          font-size: 12px;
          transition:
            border-color .2s ease,
            box-shadow .2s ease;
        }

        .field input::placeholder {
          color: #94a3b8;
        }

        .field input:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, .10);
        }

        .field small {
          margin-top: 6px;
          color: #64748b;
          font-size: 9px;
          line-height: 1.5;
        }

        .field code {
          display: inline-block;
          width: fit-content;
          margin-top: 6px;
          padding: 4px 6px;
          border-radius: 6px;
          background: #f1f5f9;
          color: #475569;
          font-family: monospace;
          font-size: 8px;
        }

        .form-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 7px;
          padding-top: 19px;
          border-top: 1px solid #e2e8f0;
        }

        .save-button {
          min-height: 45px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 17px;
          border: none;
          border-radius: 10px;
          background: #2563eb;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background .2s ease,
            transform .2s ease;
        }

        .save-button:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .cancel-button {
          min-height: 45px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #ffffff;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          transition: .2s ease;
        }

        .cancel-button:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        aside {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .side-card {
          padding: 21px;
        }

        .provider-card {
          position: relative;
          overflow: hidden;
        }

        .provider-card::after {
          content: "";
          position: absolute;
          width: 120px;
          height: 120px;
          right: -45px;
          top: -45px;
          border-radius: 50%;
          background: #eff6ff;
          z-index: 0;
        }

        .side-provider-icon,
        .side-category,
        .side-card h2,
        .side-card > p,
        .side-status {
          position: relative;
          z-index: 1;
        }

        .side-provider-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          border-radius: 14px;
          background: #eff6ff;
          font-size: 22px;
        }

        .side-category {
          margin-bottom: 6px;
          color: #2563eb;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .side-card h2 {
          margin: 0 0 8px;
          font-size: 18px;
          letter-spacing: -.02em;
        }

        .side-card > p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.7;
        }

        .side-status {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 16px;
          color: #047857;
          font-size: 10px;
          font-weight: 800;
        }

        .side-status span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
        }

        .side-card-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 17px;
        }

        .side-card-heading > span {
          font-size: 18px;
        }

        .side-card-heading h3 {
          margin: 0;
          font-size: 13px;
        }

        .flow-list {
          display: flex;
          flex-direction: column;
        }

        .flow-item {
          display: flex;
          gap: 10px;
          position: relative;
          padding-bottom: 15px;
        }

        .flow-item:last-child {
          padding-bottom: 0;
        }

        .flow-item:not(:last-child)::after {
          content: "";
          position: absolute;
          left: 12px;
          top: 26px;
          bottom: 0;
          width: 1px;
          background: #e2e8f0;
        }

        .flow-number {
          width: 25px;
          height: 25px;
          flex: 0 0 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-size: 8px;
          font-weight: 900;
          z-index: 1;
        }

        .flow-content strong {
          display: block;
          margin: 2px 0 3px;
          font-size: 10px;
        }

        .flow-content p {
          margin: 0;
          color: #64748b;
          font-size: 9px;
          line-height: 1.5;
        }

        .best-practices {
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .best-practices li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .best-practices li > span {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #ecfdf5;
          color: #059669;
          font-size: 9px;
          font-weight: 900;
        }

        .best-practices p {
          margin: 2px 0 0;
          color: #475569;
          font-size: 10px;
          line-height: 1.5;
        }

        .warning-card {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .warning-icon {
          margin-bottom: 9px;
          font-size: 21px;
        }

        .warning-card strong {
          display: block;
          margin-bottom: 6px;
          color: #92400e;
          font-size: 12px;
        }

        .warning-card p {
          margin: 0;
          color: #92400e;
          font-size: 10px;
          line-height: 1.6;
        }

        @media (max-width: 1000px) {
          .configuration-grid {
            grid-template-columns: 1fr;
          }

          aside {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .warning-card {
            grid-column: span 2;
          }
        }

        @media (max-width: 720px) {
          .configuration-header {
            align-items: flex-start;
            flex-direction: column;
            padding: 18px;
          }

          .admin-box {
            width: 100%;
          }

          .configuration-content {
            padding: 20px 16px 40px;
          }

          .configuration-card {
            padding: 20px;
            border-radius: 16px;
          }

          .card-heading {
            flex-direction: column;
          }

          .provider-status {
            align-self: flex-start;
          }

          .moko-services {
            grid-template-columns: 1fr;
          }

          aside {
            display: flex;
          }

          .warning-card {
            grid-column: auto;
          }
        }

        @media (max-width: 520px) {
          .title-row {
            align-items: flex-start;
          }

          .provider-icon {
            width: 45px;
            height: 45px;
            flex-basis: 45px;
            border-radius: 13px;
            font-size: 21px;
          }

          .title-content h1 {
            font-size: 19px;
          }

          .title-content p {
            font-size: 10px;
          }

          .configuration-content {
            padding: 15px 11px 30px;
          }

          .configuration-card {
            padding: 17px;
          }

          .form-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .save-button,
          .cancel-button {
            width: 100%;
          }

          .notice {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| COMPOSANTS
|--------------------------------------------------------------------------
*/

function ConfigurationField({
  variable,
}: {
  variable: ProviderVariable;
}) {
  return (
    <div className="field">
      <label
        htmlFor={variable.name}
      >
        {variable.label}

        {variable.required && (
          <span className="required">
            *
          </span>
        )}
      </label>

      <input
        id={variable.name}
        name={variable.name}
        type={variable.type}
        placeholder={
          variable.type ===
          "password"
            ? "••••••••••••••••"
            : variable.name
        }
        autoComplete="off"
        spellCheck={false}
      />

      <small>
        {variable.description}
      </small>

      <code>
        {variable.name}
      </code>
    </div>
  );
}

function FlowItem({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flow-item">
      <div className="flow-number">
        {number}
      </div>

      <div className="flow-content">
        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>
      </div>
    </div>
  );
}