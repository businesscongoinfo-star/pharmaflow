"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Country = {
  code: string;
  name: string;
  currency: string;
};

const COUNTRIES: Country[] = [
  { code: "CG", name: "Congo-Brazzaville", currency: "XAF" },
  { code: "CD", name: "République démocratique du Congo", currency: "CDF" },
  { code: "CM", name: "Cameroun", currency: "XAF" },
  { code: "GA", name: "Gabon", currency: "XAF" },
  { code: "TD", name: "Tchad", currency: "XAF" },
  { code: "CF", name: "République centrafricaine", currency: "XAF" },
  { code: "GQ", name: "Guinée équatoriale", currency: "XAF" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF" },
  { code: "SN", name: "Sénégal", currency: "XOF" },
  { code: "BJ", name: "Bénin", currency: "XOF" },
  { code: "TG", name: "Togo", currency: "XOF" },
  { code: "BF", name: "Burkina Faso", currency: "XOF" },
  { code: "ML", name: "Mali", currency: "XOF" },
  { code: "NE", name: "Niger", currency: "XOF" },
  { code: "GN", name: "Guinée", currency: "GNF" },
  { code: "RW", name: "Rwanda", currency: "RWF" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "TZ", name: "Tanzanie", currency: "TZS" },
  { code: "UG", name: "Ouganda", currency: "UGX" },
  { code: "ZA", name: "Afrique du Sud", currency: "ZAR" },
];

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
  {
    value: "suspended",
    label: "Suspendue",
  },
];

function generatePassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  let password = "";

  for (let i = 0; i < 12; i += 1) {
    password += chars.charAt(
      Math.floor(
        Math.random() * chars.length,
      ),
    );
  }

  return password;
}

export default function NewPharmacyPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [form, setForm] = useState({
    pharmacyName: "",
    countryCode: "CG",
    city: "Brazzaville",
    address: "",
    fullName: "",
    phone: "",
    email: "",
    password: "",
    currencyCode: "XAF",
    language: "fr",
    status: "active",
    manualAccessEnabled: false,
    manualAccessUntil: "",
  });

  const selectedCountry =
    useMemo(
      () =>
        COUNTRIES.find(
          (country) =>
            country.code ===
            form.countryCode,
        ),
      [form.countryCode],
    );

  function updateField(
    name: string,
    value: string | boolean,
  ) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCountryChange(
    countryCode: string,
  ) {
    const country =
      COUNTRIES.find(
        (item) =>
          item.code === countryCode,
      );

    setForm((previous) => ({
      ...previous,
      countryCode,
      currencyCode:
        country?.currency ||
        "USD",
    }));
  }

  function handleGeneratePassword() {
    const password =
      generatePassword();

    setForm((previous) => ({
      ...previous,
      password,
    }));

    setShowPassword(true);
    setCopied(false);
  }

  async function handleCopyPassword() {
    if (!form.password) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        form.password,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  function validateForm(): string | null {
    if (
      !form.pharmacyName.trim()
    ) {
      return "Le nom de la pharmacie est obligatoire.";
    }

    if (!form.countryCode) {
      return "Veuillez sélectionner un pays.";
    }

    if (!form.city.trim()) {
      return "La ville est obligatoire.";
    }

    if (!form.address.trim()) {
      return "L'adresse est obligatoire.";
    }

    if (!form.fullName.trim()) {
      return "Le nom complet du responsable est obligatoire.";
    }

    if (!form.phone.trim()) {
      return "Le numéro de téléphone est obligatoire.";
    }

    if (!form.email.trim()) {
      return "L'adresse e-mail est obligatoire.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim(),
      )
    ) {
      return "Veuillez saisir une adresse e-mail valide.";
    }

    if (
      form.password.length < 8
    ) {
      return "Le mot de passe initial doit contenir au moins 8 caractères.";
    }

    if (
      form.manualAccessEnabled &&
      !form.manualAccessUntil
    ) {
      return "Veuillez indiquer la date de fin de l'accès manuel.";
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/super-admin/pharmacies/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              pharmacyName:
                form.pharmacyName.trim(),

              countryCode:
                form.countryCode,

              city:
                form.city.trim(),

              address:
                form.address.trim(),

              fullName:
                form.fullName.trim(),

              phone:
                form.phone.trim(),

              email:
                form.email.trim().toLowerCase(),

              password:
                form.password,

              currencyCode:
                form.currencyCode,

              language:
                form.language,

              status:
                form.status,

              manualAccessEnabled:
                form.manualAccessEnabled,

              manualAccessUntil:
                form.manualAccessEnabled
                  ? form.manualAccessUntil
                  : null,
            }),
          },
        );

      const contentType =
        response.headers.get(
          "content-type",
        ) || "";

      let data: {
        success?: boolean;
        error?: string;
        message?: string;
        pharmacy?: {
          id?: string;
        };
        credentials?: {
          email?: string;
          password?: string;
        };
      } = {};

      if (
        contentType.includes(
          "application/json",
        )
      ) {
        data =
          await response.json();
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Impossible de créer la pharmacie.",
        );
      }

      setSuccess(
        "La pharmacie et le compte du responsable ont été créés avec succès.",
      );

      const pharmacyId =
        data.pharmacy?.id;

      if (pharmacyId) {
        window.setTimeout(() => {
          router.push(
            `/super-admin/pharmacies/${pharmacyId}`,
          );

          router.refresh();
        }, 1200);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur est survenue lors de la création.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pf-new-page">
      <div className="pf-new-container">

        <header className="pf-header">
          <div>
            <div className="pf-breadcrumb">
              <Link href="/super-admin">
                Super Admin
              </Link>

              <span>/</span>

              <Link href="/super-admin/pharmacies">
                Pharmacies
              </Link>

              <span>/</span>

              <strong>
                Nouvelle pharmacie
              </strong>
            </div>

            <h1>
              Ajouter une pharmacie
            </h1>

            <p>
              Créez une pharmacie et son
              compte responsable en une seule
              opération.
            </p>
          </div>

          <Link
            href="/super-admin/pharmacies"
            className="pf-back-button"
          >
            ← Retour
          </Link>
        </header>

        {error && (
          <div className="pf-alert pf-alert-error">
            <span className="pf-alert-icon">
              !
            </span>

            <div>
              <strong>
                Création impossible
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="pf-alert pf-alert-success">
            <span className="pf-alert-icon">
              ✓
            </span>

            <div>
              <strong>
                Pharmacie créée
              </strong>

              <p>{success}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="pf-form"
        >

          <section className="pf-card">
            <div className="pf-card-header">
              <div className="pf-icon">
                🏥
              </div>

              <div>
                <h2>
                  Informations de la pharmacie
                </h2>

                <p>
                  Informations générales de
                  l'établissement.
                </p>
              </div>
            </div>

            <div className="pf-grid">

              <div className="pf-field pf-field-full">
                <label>
                  Nom de la pharmacie *
                </label>

                <input
                  value={
                    form.pharmacyName
                  }
                  onChange={(event) =>
                    updateField(
                      "pharmacyName",
                      event.target.value,
                    )
                  }
                  placeholder="Ex. Brazza Pharma"
                  autoComplete="organization"
                  required
                />
              </div>

              <div className="pf-field">
                <label>
                  Pays *
                </label>

                <select
                  value={
                    form.countryCode
                  }
                  onChange={(event) =>
                    handleCountryChange(
                      event.target.value,
                    )
                  }
                  required
                >
                  {COUNTRIES.map(
                    (country) => (
                      <option
                        key={
                          country.code
                        }
                        value={
                          country.code
                        }
                      >
                        {country.name} —{" "}
                        {
                          country.currency
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="pf-field">
                <label>
                  Ville *
                </label>

                <input
                  value={form.city}
                  onChange={(event) =>
                    updateField(
                      "city",
                      event.target.value,
                    )
                  }
                  placeholder="Ex. Brazzaville"
                  required
                />
              </div>

              <div className="pf-field pf-field-full">
                <label>
                  Adresse complète *
                </label>

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value,
                    )
                  }
                  placeholder="Quartier, avenue, numéro..."
                  rows={3}
                  required
                />
              </div>

              <div className="pf-field">
                <label>
                  Devise
                </label>

                <input
                  value={
                    selectedCountry?.currency ||
                    form.currencyCode
                  }
                  readOnly
                />
              </div>

              <div className="pf-field">
                <label>
                  Langue du compte
                </label>

                <select
                  value={form.language}
                  onChange={(event) =>
                    updateField(
                      "language",
                      event.target.value,
                    )
                  }
                >
                  <option value="fr">
                    Français
                  </option>

                  <option value="en">
                    English
                  </option>
                </select>
              </div>

            </div>
          </section>

          <section className="pf-card">
            <div className="pf-card-header">
              <div className="pf-icon">
                👤
              </div>

              <div>
                <h2>
                  Compte du responsable
                </h2>

                <p>
                  Ces informations permettront
                  au responsable de se connecter
                  à PharmaFlow.
                </p>
              </div>
            </div>

            <div className="pf-login-notice">
              <div className="pf-notice-icon">
                🔐
              </div>

              <div>
                <strong>
                  Identifiants de connexion
                </strong>

                <p>
                  L'adresse e-mail et le mot de
                  passe ci-dessous seront utilisés
                  pour créer automatiquement son
                  compte PharmaFlow.
                </p>
              </div>
            </div>

            <div className="pf-grid">

              <div className="pf-field">
                <label>
                  Nom complet *
                </label>

                <input
                  value={form.fullName}
                  onChange={(event) =>
                    updateField(
                      "fullName",
                      event.target.value,
                    )
                  }
                  placeholder="Ex. Christian Kufutuka"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="pf-field">
                <label>
                  Téléphone *
                </label>

                <input
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value,
                    )
                  }
                  placeholder="+242 06 000 00 00"
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="pf-field pf-field-full">
                <label>
                  Adresse e-mail de connexion *
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="responsable@pharmacie.com"
                  autoComplete="email"
                  required
                />

                <small>
                  Cette adresse doit être unique
                  dans PharmaFlow.
                </small>
              </div>

              <div className="pf-field pf-field-full">
                <label>
                  Mot de passe initial *
                </label>

                <div className="pf-password-row">
                  <div className="pf-password-input">
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        form.password
                      }
                      onChange={(event) =>
                        updateField(
                          "password",
                          event.target.value,
                        )
                      }
                      placeholder="Minimum 8 caractères"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value,
                        )
                      }
                      className="pf-eye-button"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showPassword
                        ? "🙈"
                        : "👁️"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleGeneratePassword
                    }
                    className="pf-secondary-button"
                  >
                    Générer
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleCopyPassword
                    }
                    className="pf-secondary-button"
                    disabled={
                      !form.password
                    }
                  >
                    {copied
                      ? "Copié ✓"
                      : "Copier"}
                  </button>
                </div>

                <small>
                  Le responsable utilisera ce
                  mot de passe lors de sa première
                  connexion.
                </small>
              </div>

            </div>
          </section>

          <section className="pf-card">
            <div className="pf-card-header">
              <div className="pf-icon">
                ⚙️
              </div>

              <div>
                <h2>
                  Accès et abonnement
                </h2>

                <p>
                  Configurez l'état initial de
                  la pharmacie.
                </p>
              </div>
            </div>

            <div className="pf-grid">

              <div className="pf-field">
                <label>
                  Statut de la pharmacie
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value,
                    )
                  }
                >
                  {STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={
                          status.value
                        }
                        value={
                          status.value
                        }
                      >
                        {status.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="pf-field">
                <label>
                  Essai gratuit
                </label>

                <div className="pf-trial-box">
                  <span>
                    🎁
                  </span>

                  <div>
                    <strong>
                      7 jours gratuits
                    </strong>

                    <small>
                      Création automatique après
                      l'ajout de la pharmacie.
                    </small>
                  </div>
                </div>
              </div>

              <div className="pf-field pf-field-full">

                <label className="pf-checkbox-label">

                  <input
                    type="checkbox"
                    checked={
                      form.manualAccessEnabled
                    }
                    onChange={(event) =>
                      updateField(
                        "manualAccessEnabled",
                        event.target.checked,
                      )
                    }
                  />

                  <span>
                    Accorder un accès manuel
                  </span>

                </label>

                <small>
                  L'accès manuel permet au Super
                  Admin d'autoriser une pharmacie
                  indépendamment de son abonnement.
                </small>
              </div>

              {form.manualAccessEnabled && (
                <div className="pf-field">
                  <label>
                    Accès manuel jusqu'au *
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      form.manualAccessUntil
                    }
                    onChange={(event) =>
                      updateField(
                        "manualAccessUntil",
                        event.target.value,
                      )
                    }
                    required
                  />
                </div>
              )}

            </div>
          </section>

          <div className="pf-actions">

            <Link
              href="/super-admin/pharmacies"
              className="pf-cancel-button"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="pf-submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="pf-spinner" />
                  Création en cours...
                </>
              ) : (
                <>
                  🏥 Créer la pharmacie
                </>
              )}
            </button>

          </div>

        </form>
      </div>

      <style jsx>{`
        .pf-new-page {
          min-height: 100vh;
          background: #f5f8f7;
          padding: 32px;
        }

        .pf-new-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .pf-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 28px;
        }

        .pf-breadcrumb {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #83918e;
          font-size: 13px;
        }

        .pf-breadcrumb a {
          color: #087f70;
          text-decoration: none;
          font-weight: 700;
        }

        .pf-header h1 {
          margin: 0;
          color: #173b37;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.6px;
        }

        .pf-header p {
          margin: 8px 0 0;
          color: #687874;
          font-size: 15px;
        }

        .pf-back-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid #d9e4e1;
          border-radius: 10px;
          background: #ffffff;
          color: #35534f;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .pf-alert {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 15px 17px;
          margin-bottom: 20px;
          border-radius: 12px;
          font-size: 14px;
        }

        .pf-alert-error {
          background: #fff4f3;
          border: 1px solid #f1c8c4;
          color: #9d3029;
        }

        .pf-alert-success {
          background: #eefaf5;
          border: 1px solid #b9e4d0;
          color: #146b4d;
        }

        .pf-alert-icon {
          width: 26px;
          height: 26px;
          flex: 0 0 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 800;
        }

        .pf-alert p {
          margin: 4px 0 0;
        }

        .pf-card {
          background: #ffffff;
          border: 1px solid #e2ebe8;
          border-radius: 16px;
          padding: 26px;
          margin-bottom: 20px;
          box-shadow: 0 8px 25px rgba(22, 55, 50, 0.04);
        }

        .pf-card-header {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-bottom: 24px;
        }

        .pf-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #eaf6f3;
          font-size: 20px;
        }

        .pf-card-header h2 {
          margin: 0;
          color: #193c38;
          font-size: 19px;
          font-weight: 800;
        }

        .pf-card-header p {
          margin: 5px 0 0;
          color: #778782;
          font-size: 13px;
        }

        .pf-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .pf-field {
          min-width: 0;
        }

        .pf-field-full {
          grid-column: 1 / -1;
        }

        .pf-field label {
          display: block;
          margin-bottom: 8px;
          color: #314c48;
          font-size: 13px;
          font-weight: 700;
        }

        .pf-field input,
        .pf-field select,
        .pf-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d8e3e0;
          border-radius: 10px;
          background: #fbfdfc;
          color: #203b37;
          font: inherit;
          font-size: 14px;
          outline: none;
          transition: 0.2s ease;
        }

        .pf-field input,
        .pf-field select {
          height: 46px;
          padding: 0 13px;
        }

        .pf-field textarea {
          min-height: 100px;
          padding: 12px 13px;
          resize: vertical;
        }

        .pf-field input:focus,
        .pf-field select:focus,
        .pf-field textarea:focus {
          border-color: #3a9185;
          box-shadow: 0 0 0 3px rgba(58, 145, 133, 0.1);
          background: #ffffff;
        }

        .pf-field input[readonly] {
          background: #f2f6f5;
          color: #5b706c;
        }

        .pf-field small {
          display: block;
          margin-top: 7px;
          color: #83918e;
          font-size: 11px;
          line-height: 1.5;
        }

        .pf-login-notice {
          display: flex;
          gap: 12px;
          padding: 14px;
          margin-bottom: 22px;
          border-radius: 11px;
          background: #f0f8f6;
          border: 1px solid #d5ebe6;
        }

        .pf-notice-icon {
          font-size: 20px;
        }

        .pf-login-notice strong {
          display: block;
          color: #28524c;
          font-size: 13px;
        }

        .pf-login-notice p {
          margin: 4px 0 0;
          color: #687d78;
          font-size: 12px;
          line-height: 1.5;
        }

        .pf-password-row {
          display: flex;
          gap: 8px;
        }

        .pf-password-input {
          position: relative;
          flex: 1;
        }

        .pf-password-input input {
          padding-right: 46px;
        }

        .pf-eye-button {
          position: absolute;
          right: 7px;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border: 0;
          background: transparent;
          cursor: pointer;
          border-radius: 8px;
        }

        .pf-secondary-button {
          min-height: 46px;
          padding: 0 13px;
          border: 1px solid #d4e2df;
          border-radius: 10px;
          background: #ffffff;
          color: #2f5a54;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .pf-secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pf-trial-box {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 46px;
          padding: 8px 12px;
          border: 1px solid #d8e8e4;
          border-radius: 10px;
          background: #f7fbfa;
        }

        .pf-trial-box > span {
          font-size: 20px;
        }

        .pf-trial-box strong {
          display: block;
          color: #28534d;
          font-size: 13px;
        }

        .pf-trial-box small {
          margin-top: 2px;
        }

        .pf-checkbox-label {
          display: flex !important;
          align-items: center;
          gap: 9px;
          cursor: pointer;
        }

        .pf-checkbox-label input {
          width: 18px;
          height: 18px;
          accent-color: #237c70;
        }

        .pf-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          padding-bottom: 40px;
        }

        .pf-cancel-button,
        .pf-submit-button {
          min-height: 48px;
          padding: 0 20px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .pf-cancel-button {
          border: 1px solid #d8e3e0;
          background: #ffffff;
          color: #45615d;
        }

        .pf-submit-button {
          border: 0;
          background: #18796e;
          color: #ffffff;
          min-width: 210px;
        }

        .pf-submit-button:hover {
          background: #12685e;
        }

        .pf-submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .pf-spinner {
          width: 16px;
          height: 16px;
          margin-right: 9px;
          border: 2px solid rgba(255,255,255,0.45);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: pf-spin 0.7s linear infinite;
        }

        @keyframes pf-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 760px) {
          .pf-new-page {
            padding: 18px;
          }

          .pf-header {
            flex-direction: column;
          }

          .pf-grid {
            grid-template-columns: 1fr;
          }

          .pf-field-full {
            grid-column: auto;
          }

          .pf-password-row {
            flex-wrap: wrap;
          }

          .pf-password-input {
            flex-basis: 100%;
          }

          .pf-secondary-button {
            flex: 1;
          }

          .pf-actions {
            flex-direction: column-reverse;
          }

          .pf-cancel-button,
          .pf-submit-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}