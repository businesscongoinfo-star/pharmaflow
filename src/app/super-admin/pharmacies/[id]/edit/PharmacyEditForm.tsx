"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type Pharmacy = {
  id: string;
  name: string;
  country_code: string;
  city: string;
  address: string | null;
  currency_code: string;
  owner_id: string | null;
  status: string;
  language: string;
};

type Props = {
  pharmacy: Pharmacy;
};

export default function PharmacyEditForm({
  pharmacy,
}: Props) {
  const router = useRouter();

  const [name, setName] =
    useState(pharmacy.name);

  const [countryCode, setCountryCode] =
    useState(pharmacy.country_code);

  const [city, setCity] =
    useState(pharmacy.city);

  const [address, setAddress] =
    useState(pharmacy.address || "");

  const [currencyCode, setCurrencyCode] =
    useState(pharmacy.currency_code);

  const [language, setLanguage] =
    useState(pharmacy.language || "fr");

  const [status, setStatus] =
    useState(pharmacy.status);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const response = await fetch(
        "/api/super-admin/pharmacies/update",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            pharmacyId: pharmacy.id,
            name: name.trim(),
            country_code:
              countryCode.trim().toUpperCase(),
            city: city.trim(),
            address: address.trim(),
            currency_code:
              currencyCode.trim().toUpperCase(),
            language,
            status,
          }),
        }
      );

      /*
       * On essaie d'abord de récupérer
       * la réponse JSON de notre API.
       */
      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Impossible d'enregistrer les modifications."
        );
      }

      setSuccess(true);

      /*
       * Redirection vers la fiche de la pharmacie.
       */
      setTimeout(() => {
        router.replace(
          `/super-admin/pharmacies/${pharmacy.id}`
        );

        router.refresh();
      }, 600);

    } catch (err) {

      console.error(
        "Erreur modification pharmacie:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );

      setSaving(false);
    }
  }

  function handleCancel() {
    if (saving) {
      return;
    }

    router.push(
      `/super-admin/pharmacies/${pharmacy.id}`
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pharmacy-form"
    >

      {/* ERREUR */}
      {error && (
        <div className="alert error">

          <div className="alert-icon">
            !
          </div>

          <div>
            <strong>
              Erreur
            </strong>

            <p>
              {error}
            </p>
          </div>

        </div>
      )}

      {/* SUCCÈS */}
      {success && (
        <div className="alert success">

          <div className="alert-icon">
            ✓
          </div>

          <div>
            <strong>
              Modification enregistrée
            </strong>

            <p>
              Redirection vers la fiche
              de la pharmacie...
            </p>
          </div>

        </div>
      )}

      {/* NOM */}
      <div className="form-group">

        <label htmlFor="pharmacy-name">
          Nom de la pharmacie
        </label>

        <input
          id="pharmacy-name"
          type="text"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="Nom de la pharmacie"
          required
          disabled={saving}
        />

      </div>

      {/* PAYS + VILLE */}
      <div className="form-row">

        <div className="form-group">

          <label htmlFor="country-code">
            Code pays
          </label>

          <input
            id="country-code"
            type="text"
            value={countryCode}
            onChange={(event) =>
              setCountryCode(
                event.target.value.toUpperCase()
              )
            }
            placeholder="CG"
            maxLength={5}
            required
            disabled={saving}
          />

        </div>

        <div className="form-group">

          <label htmlFor="pharmacy-city">
            Ville
          </label>

          <input
            id="pharmacy-city"
            type="text"
            value={city}
            onChange={(event) =>
              setCity(event.target.value)
            }
            placeholder="Brazzaville"
            required
            disabled={saving}
          />

        </div>

      </div>

      {/* ADRESSE */}
      <div className="form-group">

        <label htmlFor="pharmacy-address">
          Adresse
        </label>

        <textarea
          id="pharmacy-address"
          value={address}
          onChange={(event) =>
            setAddress(event.target.value)
          }
          placeholder="Adresse complète"
          rows={4}
          disabled={saving}
        />

      </div>

      {/* DEVISE + LANGUE */}
      <div className="form-row">

        <div className="form-group">

          <label htmlFor="currency-code">
            Devise
          </label>

          <input
            id="currency-code"
            type="text"
            value={currencyCode}
            onChange={(event) =>
              setCurrencyCode(
                event.target.value.toUpperCase()
              )
            }
            placeholder="XAF"
            required
            disabled={saving}
          />

        </div>

        <div className="form-group">

          <label htmlFor="pharmacy-language">
            Langue
          </label>

          <select
            id="pharmacy-language"
            value={language}
            onChange={(event) =>
              setLanguage(
                event.target.value
              )
            }
            disabled={saving}
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

      {/* STATUT */}
      <div className="form-group">

        <label htmlFor="pharmacy-status">
          Statut
        </label>

        <select
          id="pharmacy-status"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value
            )
          }
          disabled={saving}
        >
          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>

          <option value="suspended">
            Suspendue
          </option>
        </select>

        <small>
          Le statut administratif de la pharmacie.
        </small>

      </div>

      {/* BOUTONS */}
      <div className="form-actions">

        <button
          type="button"
          className="btn cancel"
          onClick={handleCancel}
          disabled={saving}
        >
          Annuler
        </button>

        <button
          type="submit"
          className="btn save"
          disabled={saving}
        >

          {saving ? (
            <>
              <span className="spinner" />
              Enregistrement...
            </>
          ) : (
            <>
              💾 Enregistrer
            </>
          )}

        </button>

      </div>

      <style jsx>{`

        .pharmacy-form {
          padding: 26px;
        }

        .alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          margin-bottom: 22px;
          border-radius: 10px;
        }

        .alert-icon {
          width: 25px;
          height: 25px;
          min-width: 25px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .alert strong {
          display: block;
          margin-bottom: 3px;
          font-size: 13px;
        }

        .alert p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
        }

        .alert.error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
        }

        .alert.error .alert-icon {
          background: #be123c;
          color: white;
        }

        .alert.success {
          background: #ecfdf3;
          border: 1px solid #bbf7d0;
          color: #047857;
        }

        .alert.success .alert-icon {
          background: #10b981;
          color: white;
        }

        .form-row {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #374151;
          font-size: 13px;
          font-weight: 700;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d9dfe8;
          border-radius: 9px;
          background: #ffffff;
          color: #111827;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: 0.2s ease;
        }

        .form-group input,
        .form-group select {
          height: 44px;
          padding: 0 13px;
        }

        .form-group textarea {
          padding: 12px 13px;
          resize: vertical;
          min-height: 100px;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, 0.1);
        }

        .form-group input:disabled,
        .form-group textarea:disabled,
        .form-group select:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .form-group small {
          display: block;
          margin-top: 7px;
          color: #8a94a6;
          font-size: 11px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          padding-top: 20px;
          border-top: 1px solid #edf0f4;
        }

        .btn {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 10px;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn.cancel {
          background: #ffffff;
          border: 1px solid #dbe1ea;
          color: #374151;
        }

        .btn.cancel:hover:not(:disabled) {
          background: #f8fafc;
        }

        .btn.save {
          background: #2563eb;
          color: #ffffff;
        }

        .btn.save:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .spinner {
          width: 15px;
          height: 15px;
          border: 2px solid
            rgba(255,255,255,0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {

          .pharmacy-form {
            padding: 20px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .form-actions .btn {
            width: 100%;
          }

        }

      `}</style>
    </form>
  );
}