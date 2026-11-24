# PharmaFlow

Plateforme SaaS de gestion de pharmacies : produits, stock, ventes, caisse,
utilisateurs, rapports, paiements, abonnements, support et espaces
d'administration (Super Admin / Agents plateforme).

- **Framework** : Next.js 16 (App Router, Turbopack)
- **UI** : React 19 + CSS global
- **Base de données / Auth** : Supabase (SSR)
- **i18n** : next-intl (FR / EN, langue pilotée par la pharmacie)
- **Paiements** : Moko Afrika, GoFreshPay, Yabetoo, PayPal
- **Support IA** : OpenAI Responses API

---

## 1. Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run dev                  # http://localhost:3000
```

Scripts :

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm run lint` | ESLint (flat config) |
| `npx tsc --noEmit` | Vérification TypeScript |

Les variables d'environnement attendues sont documentées dans
[`.env.example`](./.env.example) : Supabase (URL + clé publique + clé secrète),
OpenAI, clé de chiffrement des intégrations, et identifiants des prestataires
de paiement.

---

## 2. Architecture

```
src/
  app/
    lib/
      auth/route-access.ts     # SOURCE UNIQUE : rôles, accueil par rôle, accès
      supabase/               # clients navigateur / serveur / admin
      agent/                  # garde-fous espace Agent plateforme
      super-admin/            # garde-fous espace Super Admin
      payments/               # moteur + adaptateurs de paiement
    (pages)                   # /dashboard, /produits, /caisse, /super-admin…
    api/                      # routes API (auth gérée par chaque route)
src/proxy.ts                  # Proxy global Next.js 16 (session, rôles, abonnement)
```

### Contrôle d'accès

1. `src/proxy.ts` intercepte toutes les pages (les `/api` sont exclues : les
   webhooks de paiement ne doivent pas être redirigés vers `/login`).
2. Il vérifie : session Supabase → profil → rôle → pharmacie →
   accès manuel → abonnement.
3. Les rôles et les pages d'accueil sont définis **une seule fois** dans
   `src/app/lib/auth/route-access.ts` (utilisé par le Proxy **et** par la page
   de connexion).

| Rôle | Accueil | Espaces autorisés |
| --- | --- | --- |
| `owner` | `/dashboard` | tout |
| `admin` | `/dashboard` | dashboard, admin, modules |
| `pharmacist` | `/pharmacien` | pharmacien, produits, stock, ventes, rapports, paramètres |
| `cashier` | `/caisse` | caisse, produits, ventes, paramètres |
| `employee` | `/caisse` | caisse, produits, ventes, paramètres |

---

## 3. Corrections apportées lors de l'audit

### Bloquant

1. **Le proxy n'était jamais exécuté.** `middleware.ts` et `proxy.ts` étaient
   placés à la racine alors que le projet utilise un dossier `src/` : Next.js
   les ignorait purement et simplement. Toute la protection (session, rôles,
   abonnement) était donc inactive. Le fichier est désormais `src/proxy.ts`.
2. **`middleware.ts` + `proxy.ts` en doublon.** Next.js 16 refuse la
   coexistence des deux conventions. Les deux implémentations ont été
   fusionnées en un seul Proxy (la plus complète), `middleware.ts` supprimé.
3. **Build impossible sans variables d'environnement.** `supabaseAdmin` était
   instancié à l'import (`export const supabaseAdmin = createAdminClient()`),
   ce qui faisait échouer `next build` (`NEXT_PUBLIC_SUPABASE_URL est
   manquante`). Le client est maintenant créé paresseusement (Proxy).
4. **`npm run lint` ne fonctionnait pas.** Aucun `eslint.config.*` n'existait
   pour ESLint 9. Un `eslint.config.mjs` (flat config) a été ajouté.

### Fonctionnel

5. **404 après connexion.** `ROLE_HOME` envoyait `admin` vers `/admin` et
   `employee` vers `/employe` : aucune de ces pages n'existe. Les deux rôles
   sont redirigés vers `/dashboard` et `/caisse`, et les gardes des pages
   (`caisse`, `dashboard`, `parametres`, `pharmacien`, `produits`…) ont été
   alignées pour éviter les boucles de redirection.
6. **Déconnexion cassée.** `/abonnement` appelait `POST /api/auth/logout`, qui
   n'existait pas (404 silencieux). La route a été créée.
7. **Liens légaux morts.** La page `/register` pointait vers
   `/conditions-utilisation`, `/politique-confidentialite`, `/terms-of-use` et
   `/privacy-policy` : ces pages n'existent pas. Redirigés vers `/conditions`
   et `/confidentialite`.
8. **Support IA inutilisable.** Le modèle par défaut était `gpt-5.6-luna`
   (inexistant) : l'API OpenAI répondait toujours par une erreur 400.
   Remplacé par `gpt-4.1-mini`, surchargeable via `OPENAI_MODEL`.
9. **Invitations inaccessibles.** `/invitation` n'était pas publique : le
   jeton d'invitation Supabase (dans le fragment d'URL) n'avait pas encore créé
   de session, l'utilisateur était renvoyé vers `/login`.
10. **`/produits` non protégé.** Les règles d'accès utilisaient le préfixe
    `/products` (inexistant) : le module Produits échappait au contrôle de rôle
    et d'abonnement.
11. **Webhooks de paiement.** Le matcher du Proxy incluait `/api`, ce qui
    redirigeait les notifications des prestataires (sans cookie de session)
    vers `/login`. Les `/api` sont maintenant exclues du matcher.
12. **Clés Supabase incohérentes.** `lib/supabase/server.ts` et
    `api/admin/support` exigeaient uniquement la clé « publishable » (sans
    repli sur l'ancienne clé anon), et `api/payments/webhook` exigeait
    `SUPABASE_SERVICE_ROLE_KEY` alors que le reste de l'application utilise
    `SUPABASE_SECRET_KEY`. Les deux nomenclatures sont désormais acceptées.
13. **`formatPrice` dans `/abonnement`** utilisait `t` avant sa déclaration et
    omettait la dépendance dans le `useCallback`.
14. **Dépendances d'effets manquantes** (`react-hooks/exhaustive-deps`) sur
    `/produits`, `/caisse/produits`, `/caisse/rapports`, `/utilisateurs`,
    `/ventes`, `/support` et `/paiements` : les chargeurs sont désormais des
    `useCallback` déclarés avant leur `useEffect`, avec des dépendances
    explicites (`loadUsers`, `methodLabels`, `getMethodLabel`, `t` stabilisé
    via `useCallback`…). Aucun rechargement supplémentaire n'est déclenché.
15. **`Date.now()` pendant le rendu** (`react-hooks/purity`) : ajout du hook
    `useNow()` (`src/app/lib/use-now.ts`) utilisé par `/dashboard` et
    `PharmacyActions`, et de `getCurrentTimestamp()`
    (`src/app/lib/current-time.ts`) pour le composant serveur
    `/super-admin/pharmacies/[id]`.

### Nettoyage

16. Suppression de 18 fichiers vides issus d'un envoi corrompu (`ccc`, `cc`,
    `CCC` dans `src/app/…`), de `src/app/ventes.zip` (ancienne sauvegarde de la
    page Ventes), de `index.html` (maquette statique obsolète), de
    `tsconfig.tsbuildinfo` (artefact de build) et des doublons morts :
    `src/app/proxy.ts`, `src/app/support/ai/route.ts`,
    `src/app/support/tickets/route.ts`, `src/app/api/agent/support/page.tsx`,
    `src/app/lib/agent/access.ts`, `src/app/lib/supabase/proxy.ts`.
17. `.gitignore` complété (`*.tsbuildinfo`, `.env*`) et `.env.example` ajouté.

---

## 4. Vérifications

```bash
npx tsc --noEmit   # ✔ aucune erreur
npm run lint       # ✔ 0 erreur, 0 avertissement
npm run build      # ✔ build de production, Proxy détecté
```

Pages publiques testées : `/`, `/login`, `/register`, `/conditions`,
`/confidentialite`, `/comment-ca-marche`, `/support`, `/invitation`,
`/abonnement`, `/forgot-password`, `/reset-password` → `200`.

Pages protégées (`/dashboard`, `/produits`, `/ventes`, `/super-admin`,
`/agent`…) → redirection `307` vers `/login?redirect=…` sans session.
Routes API (`/api/*`) et webhooks → non interceptés par le Proxy.

---

## 5. Déploiement

| Élément | Valeur |
| --- | --- |
| Plateforme | Vercel (projet `pharmaflow.africa`, team *PharmaFlow*) |
| Environnement | **Production** (`--prod`) |
| Déploiement | `dpl_DnaPp2gwN7T3zao4rrJZJMUuJtbV` — état `READY` (promu) |
| Commit déployé | `f060386` — `main` (fusion de la PR #1, branche `arena/0def7daf-pharmaflow`) |
| Build | Node 24.x, 2 cœurs / 8 Go, Next.js 16.3.5, ~56 s |
| URL de déploiement | <https://pharmaflowafrica-n2or8dshx-pharma-flow1.vercel.app> |
| Déploiement précédent | `dpl_G1WAi4Fm5YuzbJXG8Jn1EtczCpoT` (commit `34eae19`), conservé comme rollback |
| URL publique | <https://pharmaflow.africa> — alias `www.pharmaflow.africa`, `pharmaflowafrica.vercel.app` |

Le code est fusionné dans `main` sur GitHub via la
[PR #1](https://github.com/businesscongoinfo-star/pharmaflow/pull/1) ;
l'intégration Git Vercel reconstruit automatiquement la production à chaque
push sur `main`.

Les variables d'environnement de production (Supabase + Postgres) étaient déjà
présentes sur le projet : aucune variable n'a été créée ni modifiée.

Vérifications effectuées sur l'URL publique après déploiement :

- `/` → `200`, page marketing complète (FR/EN, tarifs, sections produit) ;
- `/login` et `/register` → `200`, formulaires rendus en français ;
- `/dashboard` sans session → redirection vers `/login?redirect=%2Fdashboard`
  (le `Proxy` `src/proxy.ts` est bien actif en production) ;
- assets statiques et `og-image.png` servis par le CDN Vercel.

---

## 6. Améliorations de la page publique (`/`)

1. **FAQ bilingue** : nouvelle section `#faq` (7 questions FR/EN) en
   `<details>` natifs — aucun JavaScript supplémentaire, comportement
   accessible et refermable au clavier.
2. **Données structurées `FAQPage`** injectées par la page (schema.org), pour
   l'affichage des questions directement dans les résultats Google. Les
   descriptions `Organization` / `WebSite` / `SoftwareApplication` restent
   émises une seule fois par `layout.tsx` (pas de doublon).
3. **Tarifs unifiés et corrigés** : nouveau module `src/app/lib/pricing.ts`,
   source unique des prix (8 500 XAF/mois, 85 000 XAF/an, 7 jours d'essai).
   Il corrige une incohérence réelle : la version française affichait
   `20 000` / `200 000` XAF alors que la version anglaise affichait
   `8,500` / `85,000` XAF. Les données structurées du layout utilisent
   désormais la même source.
4. **Clarté commerciale** : badge « ≈ 2 mois offerts » sur la formule annuelle
   et note sous la grille tarifaire (essai, moyens de paiement, sans
   engagement).
5. **Argumentaire du hero** : trois points clés (aucune installation, données
   isolées par pharmacie, interface et support FR/EN) et une mention d'essai
   « 7 jours • sans carte bancaire • sans engagement ».
6. **Accessibilité** : lien d'évitement « Aller au contenu principal »,
   contours de focus visibles (`:focus-visible`) sur liens, boutons et
   questions de la FAQ, `aria-hidden` sur les glyphes décoratifs.
7. **Mouvement réduit** : les animations/transitions de la page d'accueil sont
   neutralisées lorsque `prefers-reduced-motion: reduce` est actif.

Vérifications : `npx tsc --noEmit` ✔, `npx eslint .` ✔ (0 erreur, 0
avertissement), `npm run build` ✔, rendu serveur contrôlé (`#faq` présent,
7 questions, prix FR corrigés, JSON-LD valide).
