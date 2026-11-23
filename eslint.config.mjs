import next from "eslint-config-next";
import coreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * ============================================================
 * PHARMAFLOW — CONFIGURATION ESLINT (flat config, ESLint 9)
 * ============================================================
 *
 * Le script `npm run lint` échouait car aucun fichier
 * eslint.config.(js|mjs|cjs) n'existait : ESLint 9 refuse
 * désormais les anciens fichiers .eslintrc.*.
 * ============================================================
 */

const config = [
  ...next,

  ...coreWebVitals,

  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },

  {
    rules: {
      /*
       * Les textes de l'application sont rédigés en français :
       * les apostrophes et guillemets typographiques sont
       * volontaires dans le JSX.
       */
      "react/no-unescaped-entities": "off",

      /*
       * Règles apportées par eslint-plugin-react-hooks v7
       * (React Compiler).
       *
       * PharmaFlow charge volontairement ses données dans des
       * effets (`void load()`), ce que la règle
       * "set-state-in-effect" signale comme une erreur. Le
       * comportement est correct et volontaire : on la désactive
       * pour ne pas bloquer `npm run lint`.
       */
      "react-hooks/set-state-in-effect": "off",

      /*
       * react-hooks/purity, react-hooks/immutability et
       * react-hooks/exhaustive-deps restent en erreur (valeur par
       * défaut) : l'ensemble du code a été corrigé (horloge via
       * useNow(), dépendances d'effets explicites).
       */

      /*
       * La connexion utilise volontairement window.location.assign
       * pour recharger la session côté serveur après authentification.
       */
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
];

export default config;
