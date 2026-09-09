import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { createClient } from "../app/lib/supabase/server";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  /*
   * La langue de la pharmacie est la source principale.
   *
   * Le cookie pf_locale reste utilisé comme solution de secours
   * lorsqu'aucun utilisateur connecté / aucune pharmacie n'est trouvé.
   */

  let locale: "fr" | "en" = "fr";

  try {
    const supabase = await createClient();

    /*
     * Récupération de l'utilisateur actuellement connecté.
     */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      /*
       * Récupération du profil de l'utilisateur.
       */
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("pharmacy_id")
          .eq("id", user.id)
          .maybeSingle();

      if (!profileError && profile?.pharmacy_id) {
        /*
         * Récupération de la langue de sa pharmacie.
         */
        const { data: pharmacy, error: pharmacyError } =
          await supabase
            .from("pharmacies")
            .select("language")
            .eq("id", profile.pharmacy_id)
            .maybeSingle();

        if (
          !pharmacyError &&
          (pharmacy?.language === "fr" ||
            pharmacy?.language === "en")
        ) {
          locale = pharmacy.language;

          /*
           * Synchronisation du cookie.
           *
           * Le cookie ne devient pas la source principale :
           * il reflète simplement la langue de la pharmacie.
           */
          try {
            cookieStore.set("pf_locale", locale, {
              path: "/",
              maxAge: 60 * 60 * 24 * 365,
              sameSite: "lax",
            });
          } catch {
            /*
             * Dans certains contextes Server Components,
             * l'écriture des cookies peut être impossible.
             * Ce n'est pas bloquant : locale est déjà déterminée.
             */
          }
        }
      }
    }
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la langue de la pharmacie :",
      error
    );
  }

  /*
   * Si aucun utilisateur connecté ou aucune pharmacie
   * n'a permis de déterminer la langue, on utilise le cookie.
   */
  if (locale === "fr") {
    const savedLocale = cookieStore.get("pf_locale")?.value;

    if (savedLocale === "en") {
      locale = "en";
    }
  }

  /*
   * Chargement des traductions.
   */
  const messages =
    locale === "en"
      ? (await import("../../messages/en.json")).default
      : (await import("../../messages/fr.json")).default;

  return {
    locale,
    messages,
  };
});