export type SupportedLocale = "fr" | "en";

/* ============================================================
   PAYS FRANCOPHONES
============================================================ */

const FRENCH_COUNTRIES = new Set([
  "CG",
  "CD",
  "CM",
  "GA",
  "CI",
  "SN",
  "BJ",
  "TG",
  "BF",
  "ML",
  "NE",
  "GN",
  "RW",
  "BI",
  "DJ",
  "KM",
  "MG",
  "MU",
  "SC",
  "TD",
  "CF",
  "GQ",
]);

/* ============================================================
   PAYS ANGLOPHONES
============================================================ */

const ENGLISH_COUNTRIES = new Set([
  "GH",
  "NG",
  "KE",
  "UG",
  "TZ",
  "ZA",
  "ZM",
  "ZW",
  "MW",
  "SL",
  "LR",
  "GM",
  "BW",
  "NA",
  "LS",
  "SZ",
  "SS",
  "ET",
  "ER",
  "US",
  "GB",
  "CA",
  "AU",
  "NZ",
]);

/* ============================================================
   DÉTERMINER LA LANGUE À PARTIR DU PAYS
============================================================ */

export function getLocaleFromCountry(
  countryCode:
    | string
    | null
    | undefined,
): SupportedLocale {
  const country =
    (countryCode ?? "")
      .trim()
      .toUpperCase();

  if (
    FRENCH_COUNTRIES.has(
      country,
    )
  ) {
    return "fr";
  }

  if (
    ENGLISH_COUNTRIES.has(
      country,
    )
  ) {
    return "en";
  }

  /*
   * Pour les pays non configurés,
   * PharmaFlow utilise l'anglais
   * comme langue par défaut.
   */

  return "en";
}

/* ============================================================
   ENREGISTRER LA LANGUE DANS LE COOKIE
============================================================ */

export function setLocaleCookie(
  locale: SupportedLocale,
): void {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  document.cookie = [
    `pf_locale=${locale}`,
    "path=/",
    "max-age=31536000",
    "samesite=lax",
  ].join("; ");
}

/* ============================================================
   LIRE LA LANGUE DU COOKIE
============================================================ */

export function getLocaleCookie():
  | SupportedLocale
  | null {
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  const cookies =
    document.cookie
      .split(";")
      .map(
        (cookie) =>
          cookie.trim(),
      );

  const localeCookie =
    cookies.find(
      (cookie) =>
        cookie.startsWith(
          "pf_locale=",
        ),
    );

  if (!localeCookie) {
    return null;
  }

  const value =
    localeCookie
      .split("=")[1]
      ?.trim();

  if (
    value === "fr" ||
    value === "en"
  ) {
    return value;
  }

  return null;
}

/* ============================================================
   CHANGER LA LANGUE
============================================================ */

export function changeLocale(
  locale: SupportedLocale,
): void {
  setLocaleCookie(
    locale,
  );

  if (
    typeof window !==
    "undefined"
  ) {
    window.location.reload();
  }
}