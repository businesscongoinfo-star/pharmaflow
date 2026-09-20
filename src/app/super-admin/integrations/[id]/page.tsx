import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import { requireSuperAdmin } from "@/app/lib/super-admin/auth";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ProviderConfig = {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  environment: "sandbox" | "production";
  variables: {
    name: string;
    label: string;
    type: "text" | "password" | "url";
    description: string;
    required: boolean;
  }[];
};

const providers: Record<
  string,
  ProviderConfig
> = {
  "moko-afrika": {
    id: "moko-afrika",
    name: "Moko Afrika",
    icon: "💳",
    category: "Paiements",
    description:
      "Configuration du fournisseur Moko Afrika.",
    environment: "sandbox",
    variables: [
      {
        name: "MOKO_AFRIKA_MODE",
        label: "Mode",
        type: "text",
        description:
          "sandbox ou production.",
        required: true,
      },
      {
        name: "MOKO_AFRIKA_BASE_URL",
        label: "URL API",
        type: "url",
        description:
          "URL de base de l'API Moko Afrika.",
        required: true,
      },
      {
        name: "MOKO_AFRIKA_MERCHANT_ID",
        label: "Merchant ID",
        type: "text",
        description:
          "Identifiant marchand.",
        required: true,
      },
      {
        name: "MOKO_AFRIKA_MERCHANT_SECRET",
        label: "Merchant Secret",
        type: "password",
        description:
          "Secret marchand.",
        required: true,
      },
      {
        name: "MOKO_AFRIKA_CALLBACK_URL",
        label: "Callback URL",
        type: "url",
        description:
          "URL utilisée pour les callbacks.",
        required: true,
      },
      {
        name: "MOKO_AFRIKA_WEBHOOK_AES_KEY",
        label: "Webhook AES Key",
        type: "password",
        description:
          "Clé AES utilisée pour les callbacks.",
        required: false,
      },
      {
        name: "MOKO_AFRIKA_WEBHOOK_HMAC_KEY",
        label: "Webhook HMAC Key",
        type: "password",
        description:
          "Clé HMAC utilisée pour vérifier les callbacks.",
        required: false,
      },
    ],
  },

  yabetoo: {
    id: "yabetoo",
    name: "Yabétoo",
    icon: "📱",
    category: "Paiements",
    description:
      "Configuration du fournisseur Yabétoo.",
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
          "URL de callback.",
        required: false,
      },
    ],
  },

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
          "URL de base de l'API.",
        required: true,
      },
      {
        name: "GOFRESHPAY_MERCHANT_ID",
        label: "Merchant ID",
        type: "text",
        description:
          "Identifiant marchand.",
        required: true,
      },
      {
        name: "GOFRESHPAY_MERCHANT_SECRET",
        label: "Merchant Secret",
        type: "password",
        description:
          "Secret marchand.",
        required: true,
      },
      {
        name: "GOFRESHPAY_CALLBACK_URL",
        label: "Callback URL",
        type: "url",
        description:
          "URL callback.",
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
          "Clé HMAC.",
        required: false,
      },
    ],
  },

  supabase: {
    id: "supabase",
    name: "Supabase",
    icon: "⚡",
    category: "Infrastructure",
    description:
      "Configuration de l'infrastructure Supabase.",
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
          "Clé serveur extrêmement sensible.",
        required: true,
      },
    ],
  },

  nextjs: {
    id: "nextjs",
    name: "Next.js",
    icon: "▲",
    category: "Infrastructure",
    description:
      "Configuration générale de l'application Next.js.",
    environment: "production",
    variables: [
      {
        name: "NEXT_PUBLIC_APP_URL",
        label: "URL de l'application",
        type: "url",
        description:
          "URL publique de PharmaFlow.",
        required: true,
      },
    ],
  },
};

export default async function IntegrationConfigurationPage({
  params,
}: PageProps) {
  const admin =
    await requireSuperAdmin();

  const {
    id,
  } = await params;

  const provider =
    providers[id];

  if (!provider) {
    notFound();
  }

  return (
    <main className="configuration-page">

      {/* HEADER */}

      <header className="configuration-header">

        <div>

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

            <div>
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

          <div>
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

      {/* CONTENU */}

      <section className="configuration-content">

        <div className="configuration-grid">

          {/* FORMULAIRE */}

          <section className="configuration-card">

            <div className="card-heading">

              <div>
                <h2>
                  Paramètres
                </h2>

                <p>
                  Variables nécessaires à cette
                  intégration.
                </p>
              </div>

              <span className="environment-badge">
                {provider.environment ===
                "sandbox"
                  ? "Sandbox"
                  : "Production"}
              </span>

            </div>

            <div className="notice">

              <span>
                🔐
              </span>

              <div>
                <strong>
                  Informations sensibles
                </strong>

                <p>
                  Les secrets de paiement ne doivent
                  jamais être exposés au navigateur.
                  Utilisez les variables d'environnement
                  du serveur pour les secrets.
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

              {provider.variables.map(
                (variable) => (
                  <div
                    key={variable.name}
                    className="field"
                  >

                    <label
                      htmlFor={
                        variable.name
                      }
                    >
                      {variable.label}

                      {variable.required && (
                        <span className="required">
                          *
                        </span>
                      )}
                    </label>

                    <input
                      id={
                        variable.name
                      }
                      name={
                        variable.name
                      }
                      type={
                        variable.type
                      }
                      placeholder={
                        variable.name
                      }
                      autoComplete="off"
                    />

                    <small>
                      {variable.description}
                    </small>

                    <code>
                      {variable.name}
                    </code>

                  </div>
                ),
              )}

              <div className="form-actions">

                <button
                  type="submit"
                  className="save-button"
                >
                  💾 Enregistrer la configuration
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

          {/* INFORMATIONS */}

          <aside>

            <section className="side-card">

              <div className="side-icon">
                🔌
              </div>

              <h2>
                {provider.name}
              </h2>

              <p>
                {provider.description}
              </p>

              <div className="side-status">
                <span />
                Intégration active
              </div>

            </section>

            <section className="side-card">

              <h3>
                Bonnes pratiques
              </h3>

              <ul>
                <li>
                  🔐 Ne partagez jamais vos secrets.
                </li>

                <li>
                  🧪 Testez d'abord en Sandbox.
                </li>

                <li>
                  🔄 Vérifiez les callbacks.
                </li>

                <li>
                  🧾 Conservez les références de paiement.
                </li>

                <li>
                  🛡️ Ne mettez jamais une clé secrète
                  dans le code client.
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
                Après modification des variables
                d'environnement, le serveur doit
                généralement être redémarré ou
                redéployé pour charger les nouvelles
                valeurs.
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
          min-height: 84px;
          padding: 18px 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 10px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
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
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          font-size: 25px;
        }

        .title-row h1 {
          margin: 0 0 5px;
          font-size: 24px;
        }

        .title-row p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .admin-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 13px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }

        .admin-avatar {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #0f172a;
          color: #fff;
          font-weight: 800;
        }

        .admin-box strong {
          display: block;
          font-size: 13px;
        }

        .admin-box span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
        }

        .configuration-content {
          max-width: 1250px;
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
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow:
            0 8px 28px
            rgba(15, 23, 42, .04);
        }

        .configuration-card {
          padding: 26px;
        }

        .card-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .card-heading h2 {
          margin: 0 0 5px;
          font-size: 19px;
        }

        .card-heading p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .environment-badge {
          padding: 7px 10px;
          border-radius: 999px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .notice {
          display: flex;
          gap: 12px;
          padding: 15px;
          margin-bottom: 24px;
          border: 1px solid #dbeafe;
          border-radius: 14px;
          background: #eff6ff;
        }

        .notice > span {
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
          font-size: 11px;
          line-height: 1.6;
        }

        .configuration-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field {
          display: flex;
          flex-direction: column;
        }

        .field label {
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 800;
        }

        .required {
          margin-left: 4px;
          color: #dc2626;
        }

        .field input {
          width: 100%;
          height: 44px;
          padding: 0 13px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: #0f172a;
          font-size: 13px;
          transition: .2s;
        }

        .field input:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px
            rgba(37,99,235,.10);
        }

        .field small {
          margin-top: 6px;
          color: #64748b;
          font-size: 10px;
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
          font-size: 9px;
        }

        .form-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
        }

        .save-button {
          min-height: 44px;
          padding: 0 17px;
          border: none;
          border-radius: 10px;
          background: #2563eb;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .save-button:hover {
          background: #1d4ed8;
        }

        .cancel-button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        aside {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .side-card {
          padding: 21px;
        }

        .side-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          border-radius: 14px;
          background: #eff6ff;
          font-size: 22px;
        }

        .side-card h2 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .side-card h3 {
          margin: 0 0 15px;
          font-size: 14px;
        }

        .side-card p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.7;
        }

        .side-status {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 17px;
          color: #047857;
          font-size: 11px;
          font-weight: 800;
        }

        .side-status span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
        }

        .side-card ul {
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .side-card li {
          color: #475569;
          font-size: 11px;
          line-height: 1.5;
        }

        .warning-card {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .warning-icon {
          margin-bottom: 10px;
          font-size: 22px;
        }

        .warning-card strong {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
        }

        .warning-card p {
          color: #92400e;
        }

        @media (max-width: 900px) {
          .configuration-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .configuration-header {
            align-items: flex-start;
            flex-direction: column;
            padding: 18px;
          }

          .configuration-content {
            padding: 20px 16px 40px;
          }

          .configuration-card {
            padding: 20px;
          }

          .card-heading {
            flex-direction: column;
          }

          .form-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .save-button,
          .cancel-button {
            width: 100%;
          }
        }

      `}</style>

    </main>
  );
}