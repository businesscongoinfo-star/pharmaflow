"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PHARMAFLOW_PRICING } from "./lib/pricing";

type Locale = "fr" | "en";
type BillingCycle = "monthly" | "yearly";

const CONTACT = {
  email: "pharmaflowafrica@gmail.com",
  phone: "+242044177909",
  phoneDisplay: "+242 04 417 79 09",
  whatsapp: "https://wa.me/242044177909",
};

const TEXT = {
  fr: {
    navHome: "Accueil",
    navFeatures: "Fonctionnalités",
    navSolutions: "Solutions",
    navHowItWorks: "Comment ça marche ?",
    navPricing: "Tarifs",
    navSupport: "Support",
    login: "Se connecter",
    start: "Commencer gratuitement",

    badge: "7 jours gratuits • Sans engagement",

    heroTitle1: "La gestion intelligente",
    heroTitle2: "de votre pharmacie.",
    heroText:
      "PharmaFlow centralise vos produits, votre stock, vos ventes, votre équipe, vos rapports et vos paiements dans une seule plateforme moderne.",

    heroPrimary: "Démarrer mon essai gratuit",
    heroSecondary: "Découvrir PharmaFlow",

    trusted: "Conçu pour les pharmacies modernes",

    heroPoint1: "Aucune installation, tout se passe en ligne",
    heroPoint2: "Données isolées pour chaque pharmacie",
    heroPoint3: "Interface et support en français",

    heroNote:
      "Essai de 7 jours • Sans carte bancaire • Sans engagement",

    faqEyebrow: "QUESTIONS FRÉQUENTES",
    faqTitle:
      "Tout ce qu'il faut savoir avant de commencer.",
    faqText:
      "Les réponses aux questions les plus fréquentes des pharmacies qui découvrent PharmaFlow.",
    faqContactText: "Une autre question ?",
    faqContactLink: "Parler à notre équipe",
    faq: [
      {
        q: "Combien de temps dure l'essai gratuit ?",
        a: "L'essai dure 7 jours, sans paiement et sans engagement. Vous accédez à toute la plateforme : produits, stock, ventes, caisse, rapports, équipe et paiements. À la fin de l'essai, vous choisissez librement un abonnement mensuel ou annuel.",
      },
      {
        q: "Faut-il installer un logiciel ?",
        a: "Non. PharmaFlow fonctionne directement dans votre navigateur, sur ordinateur, tablette ou téléphone. Aucune installation, aucune sauvegarde manuelle et aucune mise à jour à gérer.",
      },
      {
        q: "Où sont stockées les données de ma pharmacie ?",
        a: "Dans une base de données hébergée de façon sécurisée. Chaque pharmacie dispose de son propre espace isolé : les données d'une pharmacie ne sont jamais visibles par une autre. L'accès est contrôlé par rôle et par permission.",
      },
      {
        q: "Puis-je créer des comptes pour mon équipe ?",
        a: "Oui. Vous créez un compte par collaborateur et choisissez son rôle : propriétaire, administrateur, pharmacien, caissier ou employé. Chaque rôle ne voit que les écrans et les actions auxquels il a droit.",
      },
      {
        q: "Quels moyens de paiement puis-je enregistrer ?",
        a: "Espèces, mobile money, carte bancaire et virement. Les encaissements sont horodatés, rattachés à la vente et exportables en CSV depuis les rapports et le relevé de paiements.",
      },
      {
        q: "Dans quelles langues et devises PharmaFlow fonctionne-t-il ?",
        a: "L'interface est disponible en français et en anglais. La devise (XAF, CDF, XOF, GNF, RWF, KES, UGX, TZS, ZAR, USD…) est choisie à la création de la pharmacie.",
      },
      {
        q: "Comment joindre le support ?",
        a: "Le centre de support combine un assistant IA qui répond immédiatement et un conseiller humain qui prend le relais si nécessaire. Vous pouvez aussi nous écrire à pharmaflowafrica@gmail.com ou sur WhatsApp au +242 04 417 79 09.",
      },
    ],

    dashboardLabel: "Tableau de bord",
    todaySales: "Ventes aujourd'hui",
    revenue: "Chiffre d'affaires",
    lowStock: "Stock faible",
    expiring: "Expirations proches",
    recentActivity: "Activité récente",
    seeDashboard: "Voir la plateforme",

    liveSystem: "Système opérationnel",
    pharmacies: "Pharmacies",
    products: "Produits",
    sales: "Ventes",
    reports: "Rapports",

    advertisingBadge: "PHARMAFLOW AFRICA",
    advertisingTitle:
      "Votre pharmacie mérite une gestion plus simple, plus rapide et plus professionnelle.",
    advertisingText:
      "Passez d'une gestion dispersée à une plateforme centralisée conçue pour accompagner votre pharmacie au quotidien.",
    advertisingButton: "Créer ma pharmacie",
    advertisingSecondary: "Parler au support",

    featuresEyebrow: "UNE PLATEFORME COMPLÈTE",
    featuresTitle: "Tout ce dont votre pharmacie a besoin.",
    featuresText:
      "Une solution pensée pour simplifier le travail quotidien et donner au pharmacien une vision claire de son activité.",

    featureStock: "Gestion du stock",
    featureStockText:
      "Suivez les entrées, sorties, niveaux de stock et produits nécessitant votre attention.",

    featureSales: "Ventes & caisse",
    featureSalesText:
      "Enregistrez vos ventes, gérez votre caisse et gardez une trace précise de vos opérations.",

    featureProducts: "Produits",
    featureProductsText:
      "Centralisez vos produits, prix, codes-barres, catégories et dates d'expiration.",

    featureUsers: "Équipe & permissions",
    featureUsersText:
      "Créez des comptes pour vos employés et contrôlez précisément leurs permissions.",

    featureReports: "Rapports",
    featureReportsText:
      "Analysez vos ventes, votre stock et les performances de votre pharmacie.",

    featurePayments: "Paiements",
    featurePaymentsText:
      "Suivez vos paiements et préparez votre pharmacie à différents moyens de paiement.",

    solutionsEyebrow: "POUR CHAQUE BESOIN",
    solutionsTitle: "Une seule plateforme. Plusieurs usages.",

    solutionsPharmacist: "Pour le pharmacien",
    solutionsPharmacistText:
      "Une vision complète de votre pharmacie depuis un tableau de bord unique.",

    solutionsCashier: "Pour la caisse",
    solutionsCashierText:
      "Des opérations de vente simples, rapides et traçables.",

    solutionsTeam: "Pour votre équipe",
    solutionsTeamText:
      "Chaque collaborateur dispose uniquement des accès nécessaires à son rôle.",

    solutionsOwner: "Pour le propriétaire",
    solutionsOwnerText:
      "Suivez les performances, les ventes, le stock et l'activité de vos établissements.",

    howItWorksEyebrow: "DÉMARRER AVEC PHARMAFLOW",
    howItWorksTitle: "Votre pharmacie en quelques étapes.",
    howItWorksText:
      "Découvrez comment créer votre espace PharmaFlow, configurer votre pharmacie, ajouter vos produits et commencer à vendre.",

    step1Title: "Créez votre compte",
    step1Text:
      "Inscrivez votre pharmacie en quelques minutes et profitez de votre période d'essai gratuite.",
    step1Button: "Créer mon compte",

    step2Title: "Configurez votre pharmacie",
    step2Text:
      "Renseignez les informations de votre pharmacie et préparez votre espace de gestion.",

    step3Title: "Ajoutez vos produits",
    step3Text:
      "Enregistrez vos produits, prix, codes-barres, catégories, stocks et informations importantes.",

    step4Title: "Ajoutez votre équipe",
    step4Text:
      "Créez les accès de vos pharmaciens, caissiers et employés avec les permissions adaptées à chaque rôle.",

    step5Title: "Commencez à vendre",
    step5Text:
      "Sélectionnez directement un produit ou utilisez un scanner de code-barres pour l'ajouter automatiquement au panier.",

    step6Title: "Gérez votre activité",
    step6Text:
      "Suivez vos ventes, votre stock, vos mouvements et vos rapports depuis votre tableau de bord.",

    howItWorksCta: "Commencer maintenant",
    howItWorksGuide: "Voir le guide complet",

    globalEyebrow: "PENSÉ POUR L'AFRIQUE ET L'INTERNATIONAL",
    globalTitle: "Une pharmacie connectée, où que vous soyez.",
    globalText:
      "PharmaFlow est conçu pour évoluer avec les pharmacies de différents pays, devises, langues et moyens de paiement.",

    country: "Multi-pays",
    currency: "Multi-devises",
    language: "Français & English",
    paymentMethods: "Paiements adaptés aux marchés locaux",

    securityEyebrow: "SÉCURITÉ",
    securityTitle: "Vos données méritent une vraie protection.",
    securityText:
      "PharmaFlow est construit autour d'une architecture multi-tenant avec séparation des données de chaque pharmacie et gestion des permissions.",

    securityItem1: "Isolation des données par pharmacie",
    securityItem2: "Permissions par rôle",
    securityItem3: "Authentification sécurisée",
    securityItem4: "Traçabilité des opérations",

    supportEyebrow: "ASSISTANCE",
    supportTitle: "Une aide quand vous en avez besoin.",
    supportText:
      "Notre Centre d'assistance combine un assistant intelligent et l'intervention de notre équipe lorsque votre demande nécessite un conseiller.",

    supportAi: "Assistant IA",
    supportAiText:
      "Obtenez rapidement une première orientation.",

    supportHuman: "Support humain",
    supportHumanText:
      "Un conseiller peut prendre le relais.",

    supportPayment: "Problème de paiement",
    supportPaymentText:
      "Signalez un paiement débité, en attente ou non reconnu.",

    openSupport: "Ouvrir le Centre d'assistance",

    pricingEyebrow: "TARIFS SIMPLES",
    pricingTitle: "Commencez gratuitement.",
    pricingText:
      "Testez PharmaFlow pendant 7 jours avant de choisir votre formule.",

    monthly: "Mensuel",
    yearly: "Annuel",

    xaf: "XAF",
    perMonth: "/ mois",
    perYear: "/ an",

    monthlyPlan: "Formule mensuelle",
    yearlyPlan: "Formule annuelle",

    choosePlan: "Choisir cette formule",
    popular: "RECOMMANDÉ",

    yearlySaving: "≈ 2 mois offerts",

    pricingNote:
      "7 jours gratuits • Paiement par mobile money ou carte bancaire • Sans engagement",

    pricingFeature1: "Accès complet à la plateforme",
    pricingFeature2: "Gestion des produits et du stock",
    pricingFeature3: "Ventes et rapports",
    pricingFeature4: "Gestion des utilisateurs",
    pricingFeature5: "Support PharmaFlow",

    ctaTitle: "Prêt à moderniser votre pharmacie ?",
    ctaText:
      "Créez votre compte et profitez de 7 jours gratuits pour découvrir PharmaFlow.",

    ctaButton: "Commencer mon essai gratuit",

    contact: "Nous contacter",
    emailLabel: "E-mail",
    phoneLabel: "Téléphone",
    whatsappLabel: "WhatsApp",
    socialTitle: "Suivez PharmaFlow Africa",

    footerProduct: "Produit",
    footerCompany: "Entreprise",
    footerSupport: "Assistance",
    footerLegal: "Légal",

    footerFeatures: "Fonctionnalités",
    footerSolutions: "Solutions",
    footerPricing: "Tarifs",

    footerAbout: "À propos",
    footerContact: "Contact",

    footerHelp: "Centre d'assistance",
    footerPayments: "Paiements",
    footerComplaints: "Réclamations",

    footerPrivacy: "Confidentialité",
    footerTerms: "Conditions d'utilisation",
    footerSecurity: "Sécurité",

    footerCopyright:
      "©️ 2026 PharmaFlow Africa. Tous droits réservés.",

    close: "Fermer",
    menu: "Menu",
  },

  en: {
    navHome: "Home",
    navFeatures: "Features",
    navSolutions: "Solutions",
    navHowItWorks: "How it works?",
    navPricing: "Pricing",
    navSupport: "Support",
    login: "Log in",
    start: "Start for free",

    badge: "7 days free • No commitment",

    heroTitle1: "Smart management",
    heroTitle2: "for your pharmacy.",
    heroText:
      "PharmaFlow brings products, inventory, sales, teams, reports and payments together in one modern platform.",

    heroPrimary: "Start my free trial",
    heroSecondary: "Discover PharmaFlow",

    trusted: "Built for modern pharmacies",

    heroPoint1: "No installation, everything runs online",
    heroPoint2: "Data isolated for each pharmacy",
    heroPoint3: "Interface and support in French and English",

    heroNote:
      "7-day trial • No credit card • No commitment",

    faqEyebrow: "FREQUENTLY ASKED QUESTIONS",
    faqTitle: "Everything you need to know before starting.",
    faqText:
      "Answers to the questions pharmacies ask most often when discovering PharmaFlow.",
    faqContactText: "Another question?",
    faqContactLink: "Talk to our team",
    faq: [
      {
        q: "How long does the free trial last?",
        a: "The trial lasts 7 days, with no payment and no commitment. You get the whole platform: products, inventory, sales, cashier, reports, team and payments. At the end you freely choose a monthly or yearly plan.",
      },
      {
        q: "Do I need to install any software?",
        a: "No. PharmaFlow runs directly in your browser, on desktop, tablet or phone. No installation, no manual backups and no updates to manage.",
      },
      {
        q: "Where is my pharmacy data stored?",
        a: "In a securely hosted database. Each pharmacy has its own isolated workspace: one pharmacy's data is never visible to another. Access is controlled by role and by permission.",
      },
      {
        q: "Can I create accounts for my team?",
        a: "Yes. You create one account per team member and pick their role: owner, administrator, pharmacist, cashier or employee. Each role only sees the screens and actions it is allowed to use.",
      },
      {
        q: "Which payment methods can I record?",
        a: "Cash, mobile money, card and bank transfer. Payments are timestamped, linked to the sale and can be exported to CSV from reports and the payment statement.",
      },
      {
        q: "Which languages and currencies are supported?",
        a: "The interface is available in French and English. The currency (XAF, CDF, XOF, GNF, RWF, KES, UGX, TZS, ZAR, USD…) is selected when the pharmacy is created.",
      },
      {
        q: "How do I reach support?",
        a: "The support centre combines an AI assistant that answers immediately with a human agent who takes over when needed. You can also email pharmaflowafrica@gmail.com or message us on WhatsApp at +242 04 417 79 09.",
      },
    ],

    dashboardLabel: "Dashboard",
    todaySales: "Today's sales",
    revenue: "Revenue",
    lowStock: "Low stock",
    expiring: "Expiring soon",
    recentActivity: "Recent activity",
    seeDashboard: "Explore the platform",

    liveSystem: "System operational",
    pharmacies: "Pharmacies",
    products: "Products",
    sales: "Sales",
    reports: "Reports",

    advertisingBadge: "PHARMAFLOW AFRICA",
    advertisingTitle:
      "Your pharmacy deserves simpler, faster and more professional management.",
    advertisingText:
      "Move from scattered management to one centralized platform designed to support your pharmacy every day.",
    advertisingButton: "Create my pharmacy",
    advertisingSecondary: "Contact support",

    featuresEyebrow: "A COMPLETE PLATFORM",
    featuresTitle: "Everything your pharmacy needs.",
    featuresText:
      "A solution designed to simplify daily work and give pharmacists a clear view of their business.",

    featureStock: "Inventory management",
    featureStockText:
      "Track stock entries, exits, levels and products requiring attention.",

    featureSales: "Sales & cashier",
    featureSalesText:
      "Record sales, manage your cashier and keep accurate operational records.",

    featureProducts: "Products",
    featureProductsText:
      "Centralize products, prices, barcodes, categories and expiry dates.",

    featureUsers: "Team & permissions",
    featureUsersText:
      "Create employee accounts and precisely control their permissions.",

    featureReports: "Reports",
    featureReportsText:
      "Analyze sales, inventory and pharmacy performance.",

    featurePayments: "Payments",
    featurePaymentsText:
      "Track payments and prepare your pharmacy for multiple payment methods.",

    solutionsEyebrow: "FOR EVERY NEED",
    solutionsTitle: "One platform. Multiple uses.",

    solutionsPharmacist: "For pharmacists",
    solutionsPharmacistText:
      "A complete view of your pharmacy from one dashboard.",

    solutionsCashier: "For cashiers",
    solutionsCashierText:
      "Simple, fast and traceable sales operations.",

    solutionsTeam: "For your team",
    solutionsTeamText:
      "Each employee gets only the access required for their role.",

    solutionsOwner: "For owners",
    solutionsOwnerText:
      "Track performance, sales, inventory and activity across your business.",

    howItWorksEyebrow: "GET STARTED WITH PHARMAFLOW",
    howItWorksTitle: "Your pharmacy in a few simple steps.",
    howItWorksText:
      "Discover how to create your PharmaFlow account, set up your pharmacy, add your products and start selling.",

    step1Title: "Create your account",
    step1Text:
      "Register your pharmacy in just a few minutes and enjoy your free trial.",
    step1Button: "Create my account",

    step2Title: "Set up your pharmacy",
    step2Text:
      "Enter your pharmacy information and prepare your management workspace.",

    step3Title: "Add your products",
    step3Text:
      "Register your products, prices, barcodes, categories, stock and important information.",

    step4Title: "Add your team",
    step4Text:
      "Create access for pharmacists, cashiers and employees with permissions adapted to each role.",

    step5Title: "Start selling",
    step5Text:
      "Select a product directly or scan its barcode to automatically add it to the cart.",

    step6Title: "Manage your business",
    step6Text:
      "Track your sales, inventory, stock movements and reports from your dashboard.",

    howItWorksCta: "Get started",
    howItWorksGuide: "View the complete guide",

    globalEyebrow: "BUILT FOR AFRICA AND THE WORLD",
    globalTitle: "A connected pharmacy, wherever you are.",
    globalText:
      "PharmaFlow is designed to evolve across countries, currencies, languages and local payment methods.",

    country: "Multi-country",
    currency: "Multi-currency",
    language: "French & English",
    paymentMethods: "Payment methods adapted to local markets",

    securityEyebrow: "SECURITY",
    securityTitle: "Your data deserves real protection.",
    securityText:
      "PharmaFlow is built around multi-tenant architecture with pharmacy-level data separation and permission management.",

    securityItem1: "Pharmacy-level data isolation",
    securityItem2: "Role-based permissions",
    securityItem3: "Secure authentication",
    securityItem4: "Operational traceability",

    supportEyebrow: "SUPPORT",
    supportTitle: "Help when you need it.",
    supportText:
      "Our Support Center combines an intelligent assistant with human support whenever your request requires an agent.",

    supportAi: "AI assistant",
    supportAiText:
      "Get immediate initial guidance.",

    supportHuman: "Human support",
    supportHumanText:
      "A support agent can take over.",

    supportPayment: "Payment issue",
    supportPaymentText:
      "Report a charged, pending or unrecognized payment.",

    openSupport: "Open Support Center",

    pricingEyebrow: "SIMPLE PRICING",
    pricingTitle: "Start for free.",
    pricingText:
      "Try PharmaFlow for 7 days before choosing your plan.",

    monthly: "Monthly",
    yearly: "Yearly",

    xaf: "XAF",
    perMonth: "/ month",
    perYear: "/ year",

    monthlyPlan: "Monthly plan",
    yearlyPlan: "Yearly plan",

    choosePlan: "Choose this plan",
    popular: "RECOMMENDED",

    yearlySaving: "≈ 2 months free",

    pricingNote:
      "7-day free trial • Pay by mobile money or card • No commitment",

    pricingFeature1: "Full platform access",
    pricingFeature2: "Product and inventory management",
    pricingFeature3: "Sales and reports",
    pricingFeature4: "User management",
    pricingFeature5: "PharmaFlow support",

    ctaTitle: "Ready to modernize your pharmacy?",
    ctaText:
      "Create your account and enjoy 7 free days to discover PharmaFlow.",

    ctaButton: "Start my free trial",

    contact: "Contact us",
    emailLabel: "Email",
    phoneLabel: "Phone",
    whatsappLabel: "WhatsApp",
    socialTitle: "Follow PharmaFlow Africa",

    footerProduct: "Product",
    footerCompany: "Company",
    footerSupport: "Support",
    footerLegal: "Legal",

    footerFeatures: "Features",
    footerSolutions: "Solutions",
    footerPricing: "Pricing",

    footerAbout: "About",
    footerContact: "Contact",

    footerHelp: "Support Center",
    footerPayments: "Payments",
    footerComplaints: "Complaints",

    footerPrivacy: "Privacy",
    footerTerms: "Terms of use",
    footerSecurity: "Security",

    footerCopyright:
      "©️ 2026 PharmaFlow Africa. All rights reserved.",

    close: "Close",
    menu: "Menu",
  },
} as const;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "fr";
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) =>
      item.startsWith("pf_locale="),
    );

  if (cookie?.split("=")[1] === "en") {
    return "en";
  }

  return navigator.language
    ?.toLowerCase()
    .startsWith("en")
    ? "en"
    : "fr";
}

function saveLocale(locale: Locale) {
  document.cookie = [
    `pf_locale=${locale}`,
    "path=/",
    "max-age=31536000",
    "samesite=lax",
  ].join("; ");
}

export default function HomePage() {
  const [locale, setLocale] =
    useState<Locale>("fr");

  const [billing, setBilling] =
    useState<BillingCycle>("monthly");

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [showDemo, setShowDemo] =
    useState(false);

  const [slide, setSlide] =
    useState(0);

  const t = TEXT[locale];

  const priceLabels =
    PHARMAFLOW_PRICING.labels[locale];

  /*
   * Données structurées (schema.org) : FAQ de la page publique.
   * L'organisation et l'application sont déjà décrites dans le layout.
   */

  const faqStructuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": "https://pharmaflow.africa/#faq",
      mainEntity: t.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    }),
    [t],
  );

  const advertisingSlides = useMemo(
    () =>
      locale === "fr"
        ? [
            {
              icon: "💊",
              title:
                "Gérez votre pharmacie avec intelligence.",
              text:
                "Stock, ventes, produits, équipe et rapports réunis dans un seul espace.",
            },
            {
              icon: "📊",
              title:
                "Gardez une vision claire de votre activité.",
              text:
                "Consultez rapidement vos performances et les éléments qui nécessitent votre attention.",
            },
            {
              icon: "🚀",
              title:
                "Faites évoluer votre pharmacie.",
              text:
                "Une plateforme moderne conçue pour accompagner votre croissance.",
            },
          ]
        : [
            {
              icon: "💊",
              title:
                "Manage your pharmacy intelligently.",
              text:
                "Inventory, sales, products, team and reports in one place.",
            },
            {
              icon: "📊",
              title:
                "Keep a clear view of your business.",
              text:
                "Quickly understand performance and the areas that need attention.",
            },
            {
              icon: "🚀",
              title:
                "Grow your pharmacy.",
              text:
                "A modern platform designed to support your growth.",
            },
          ],
    [locale],
  );

  useEffect(() => {
    const detected =
      getInitialLocale();

    setLocale(detected);
    saveLocale(detected);
  }, []);

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setSlide(
          (current) =>
            (current + 1) %
            advertisingSlides.length,
        );
      }, 5000);

    return () =>
      window.clearInterval(timer);
  }, [advertisingSlides.length]);

  useEffect(() => {
    if (!mobileMenu) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mobileMenu]);

  function changeLocale(
    nextLocale: Locale,
  ) {
    setLocale(nextLocale);
    saveLocale(nextLocale);
  }

  function scrollToSection(
    id: string,
  ) {
    setMobileMenu(false);

    window.setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
  }

  function closeMenu() {
    setMobileMenu(false);
  }

  return (
    <main className="pf-home">

      <a
        href="#accueil"
        className="pf-home-skip-link"
      >
        {locale === "fr"
          ? "Aller au contenu principal"
          : "Skip to main content"}
      </a>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />

      {/* =====================================================
          HEADER / NAVIGATION
      ====================================================== */}

      <header className="pf-home-header">
        <div className="pf-home-header-inner">

          <Link
            href="/"
            className="pf-home-logo"
            aria-label="PharmaFlow"
            onClick={closeMenu}
          >
            <span className="pf-home-logo-mark">
              +
            </span>

            <span>
              PharmaFlow
            </span>
          </Link>

          <nav
            className={`pf-home-nav ${
              mobileMenu
                ? "is-open"
                : ""
            }`}
            aria-label="Navigation principale"
          >
            <button
              type="button"
              onClick={() =>
                scrollToSection("accueil")
              }
            >
              {t.navHome}
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "fonctionnalites",
                )
              }
            >
              {t.navFeatures}
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "solutions",
                )
              }
            >
              {t.navSolutions}
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "comment-ca-marche",
                )
              }
            >
              {t.navHowItWorks}
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection("tarifs")
              }
            >
              {t.navPricing}
            </button>

            <Link
              href="/support"
              onClick={closeMenu}
            >
              {t.navSupport}
            </Link>
          </nav>

          {mobileMenu && (
            <button
              type="button"
              className="pf-home-mobile-overlay"
              onClick={closeMenu}
              aria-label={t.close}
            />
          )}

          <div className="pf-home-actions">

            <div className="pf-home-language">

              <button
                type="button"
                className={
                  locale === "fr"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  changeLocale("fr")
                }
                aria-pressed={
                  locale === "fr"
                }
              >
                FR
              </button>

              <button
                type="button"
                className={
                  locale === "en"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  changeLocale("en")
                }
                aria-pressed={
                  locale === "en"
                }
              >
                EN
              </button>

            </div>

            <Link
              href="/login"
              className="pf-home-login"
              onClick={closeMenu}
            >
              {t.login}
            </Link>

            <Link
              href="/register"
              className="pf-home-header-cta"
              onClick={closeMenu}
            >
              {t.start}
            </Link>

            <button
              type="button"
              className="pf-home-menu-button"
              onClick={() =>
                setMobileMenu(
                  (value) => !value,
                )
              }
              aria-label={t.menu}
              aria-expanded={mobileMenu}
            >
              {mobileMenu ? "×" : "☰"}
            </button>

          </div>
        </div>
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section
        id="accueil"
        className="pf-home-hero"
      >
        <div className="pf-home-hero-glow" />

        <div className="pf-home-hero-inner">

          <div className="pf-home-hero-copy">

            <div className="pf-home-badge">
              <span>✦</span>
              {t.badge}
            </div>

            <h1>
              {t.heroTitle1}
              <br />
              <span>
                {t.heroTitle2}
              </span>
            </h1>

            <p>
              {t.heroText}
            </p>

            <ul className="pf-home-hero-points">

              <li>
                <span aria-hidden="true">✓</span>
                {t.heroPoint1}
              </li>

              <li>
                <span aria-hidden="true">✓</span>
                {t.heroPoint2}
              </li>

              <li>
                <span aria-hidden="true">✓</span>
                {t.heroPoint3}
              </li>

            </ul>

            <div className="pf-home-hero-buttons">

              <Link
                href="/register"
                className="pf-home-primary-button"
              >
                {t.heroPrimary}
                <span>→</span>
              </Link>

              <button
                type="button"
                className="pf-home-secondary-button"
                onClick={() =>
                  setShowDemo(true)
                }
              >
                <span className="pf-home-play">
                  ▶️
                </span>

                {t.heroSecondary}
              </button>

            </div>

            <p className="pf-home-hero-note">
              {t.heroNote}
            </p>

            <div className="pf-home-trust-line">

              <span className="pf-home-check">
                ✓
              </span>

              <span>
                {t.trusted}
              </span>

              <span className="pf-home-trust-divider" />

              <span>
                🔐
              </span>

              <span>
                {t.securityItem1}
              </span>

            </div>

          </div>

          <div className="pf-home-dashboard-wrap">

            <div className="pf-home-dashboard-shadow" />

            <div className="pf-home-dashboard">

              <div className="pf-home-dashboard-top">

                <div>
                  <span>
                    {t.dashboardLabel}
                  </span>

                  <strong>
                    PharmaFlow
                  </strong>
                </div>

                <div className="pf-home-dashboard-avatar">
                  P
                </div>

              </div>

              <div className="pf-home-dashboard-grid">

                <div className="pf-home-stat-card">
                  <span>
                    {t.todaySales}
                  </span>

                  <strong>
                    127
                  </strong>

                  <small>
                    +12.8%
                  </small>
                </div>

                <div className="pf-home-stat-card">
                  <span>
                    {t.revenue}
                  </span>

                  <strong>
                    486 500
                  </strong>

                  <small>
                    XAF
                  </small>
                </div>

                <div className="pf-home-stat-card warning">
                  <span>
                    {t.lowStock}
                  </span>

                  <strong>
                    08
                  </strong>

                  <small>
                    {locale === "fr"
                      ? "produits"
                      : "products"}
                  </small>
                </div>

                <div className="pf-home-stat-card">
                  <span>
                    {t.expiring}
                  </span>

                  <strong>
                    04
                  </strong>

                  <small>
                    {locale === "fr"
                      ? "produits"
                      : "products"}
                  </small>
                </div>

              </div>

              <div className="pf-home-dashboard-chart">

                <div className="pf-home-chart-heading">

                  <strong>
                    {t.recentActivity}
                  </strong>

                  <span>
                    {locale === "fr"
                      ? "7 jours"
                      : "7 days"}
                  </span>

                </div>

                <div className="pf-home-chart">
                  <span style={{ height: "38%" }} />
                  <span style={{ height: "54%" }} />
                  <span style={{ height: "45%" }} />
                  <span style={{ height: "68%" }} />
                  <span style={{ height: "58%" }} />
                  <span style={{ height: "82%" }} />
                  <span style={{ height: "74%" }} />
                </div>

              </div>

              <div className="pf-home-dashboard-bottom">

                <div>
                  <span className="pf-home-live-dot" />

                  {t.liveSystem}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDemo(true)
                  }
                >
                  {t.seeDashboard}
                  →
                </button>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* =====================================================
          BANDEAU PUBLICITAIRE
      ====================================================== */}

      <section className="pf-home-ad-section">

        <div className="pf-home-ad-slider">

          <div className="pf-home-ad-content">

            <span className="pf-home-ad-badge">
              {t.advertisingBadge}
            </span>

            <div className="pf-home-ad-icon">
              {advertisingSlides[slide].icon}
            </div>

            <h2>
              {advertisingSlides[slide].title}
            </h2>

            <p>
              {advertisingSlides[slide].text}
            </p>

            <div className="pf-home-ad-buttons">

              <Link
                href="/register"
                className="pf-home-primary-button"
              >
                {t.advertisingButton}
                <span>→</span>
              </Link>

              <Link
                href="/support"
                className="pf-home-final-support"
              >
                {t.advertisingSecondary}
                <span>→</span>
              </Link>

            </div>

          </div>

          <div className="pf-home-ad-visual">

            <div className="pf-home-ad-mockup">

              <div className="pf-home-ad-mockup-header">
                <span />
                <span />
                <span />
              </div>

              <div className="pf-home-ad-mockup-content">

                <div className="pf-home-ad-mockup-card">
                  <small>
                    {t.products}
                  </small>

                  <strong>
                    1 248
                  </strong>
                </div>

                <div className="pf-home-ad-mockup-card">
                  <small>
                    {t.sales}
                  </small>

                  <strong>
                    127
                  </strong>
                </div>

                <div className="pf-home-ad-mockup-chart">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>

              </div>
            </div>
          </div>

        </div>

        <div className="pf-home-ad-dots">

          {advertisingSlides.map(
            (_, index) => (
              <button
                key={index}
                type="button"
                className={
                  slide === index
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSlide(index)
                }
                aria-label={`Slide ${
                  index + 1
                }`}
              />
            ),
          )}

        </div>
      </section>

      {/* =====================================================
          STATISTIQUES
      ====================================================== */}

      <section className="pf-home-metrics">

        <div className="pf-home-metric">
          <strong>7</strong>

          <span>
            {locale === "fr"
              ? "jours gratuits"
              : "free days"}
          </span>
        </div>

        <div className="pf-home-metric">
          <strong>24/7</strong>

          <span>
            {locale === "fr"
              ? "plateforme accessible"
              : "platform access"}
          </span>
        </div>

        <div className="pf-home-metric">
          <strong>5</strong>

          <span>
            {locale === "fr"
              ? "rôles professionnels"
              : "professional roles"}
          </span>
        </div>

        <div className="pf-home-metric">
          <strong>∞</strong>

          <span>
            {locale === "fr"
              ? "possibilités de croissance"
              : "growth possibilities"}
          </span>
        </div>

      </section>

      {/* =====================================================
          FONCTIONNALITÉS
      ====================================================== */}

      <section
        id="fonctionnalites"
        className="pf-home-section pf-home-features"
      >

        <div className="pf-home-section-heading">

          <span>
            {t.featuresEyebrow}
          </span>

          <h2>
            {t.featuresTitle}
          </h2>

          <p>
            {t.featuresText}
          </p>

        </div>

        <div className="pf-home-feature-grid">

          <article className="pf-home-feature-card">

            <div className="pf-home-feature-icon">
              📦
            </div>

            <h3>
              {t.featureStock}
            </h3>

            <p>
              {t.featureStockText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

          <article className="pf-home-feature-card featured">

            <div className="pf-home-feature-icon">
              🧾
            </div>

            <h3>
              {t.featureSales}
            </h3>

            <p>
              {t.featureSalesText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

          <article className="pf-home-feature-card">

            <div className="pf-home-feature-icon">
              💊
            </div>

            <h3>
              {t.featureProducts}
            </h3>

            <p>
              {t.featureProductsText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

          <article className="pf-home-feature-card">

            <div className="pf-home-feature-icon">
              👥
            </div>

            <h3>
              {t.featureUsers}
            </h3>

            <p>
              {t.featureUsersText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

          <article className="pf-home-feature-card">

            <div className="pf-home-feature-icon">
              📊
            </div>

            <h3>
              {t.featureReports}
            </h3>

            <p>
              {t.featureReportsText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

          <article className="pf-home-feature-card">

            <div className="pf-home-feature-icon">
              💳
            </div>

            <h3>
              {t.featurePayments}
            </h3>

            <p>
              {t.featurePaymentsText}
            </p>

            <Link href="/support?category=payment">
              {t.supportPayment} →
            </Link>

          </article>

        </div>
      </section>

      {/* =====================================================
          SOLUTIONS
      ====================================================== */}

      <section
        id="solutions"
        className="pf-home-section pf-home-solutions"
      >

        <div className="pf-home-section-heading">

          <span>
            {t.solutionsEyebrow}
          </span>

          <h2>
            {t.solutionsTitle}
          </h2>

        </div>

        <div className="pf-home-solutions-grid">

          <article className="pf-home-solution-card">

            <div className="pf-home-solution-number">
              01
            </div>

            <div className="pf-home-solution-icon">
              👨‍⚕️
            </div>

            <h3>
              {t.solutionsPharmacist}
            </h3>

            <p>
              {t.solutionsPharmacistText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

          <article className="pf-home-solution-card">

            <div className="pf-home-solution-number">
              02
            </div>

            <div className="pf-home-solution-icon">
              🧾
            </div>

            <h3>
              {t.solutionsCashier}
            </h3>

            <p>
              {t.solutionsCashierText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

          <article className="pf-home-solution-card">

            <div className="pf-home-solution-number">
              03
            </div>

            <div className="pf-home-solution-icon">
              👥
            </div>

            <h3>
              {t.solutionsTeam}
            </h3>

            <p>
              {t.solutionsTeamText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

          <article className="pf-home-solution-card solution-dark">

            <div className="pf-home-solution-number">
              04
            </div>

            <div className="pf-home-solution-icon">
              📈
            </div>

            <h3>
              {t.solutionsOwner}
            </h3>

            <p>
              {t.solutionsOwnerText}
            </p>

            <Link href="/register">
              {t.start} →
            </Link>

          </article>

        </div>
      </section>

      {/* =====================================================
          COMMENT ÇA MARCHE
      ====================================================== */}

      <section
        id="comment-ca-marche"
        className="pf-home-section pf-home-how"
      >

        <div className="pf-home-section-heading">

          <span>
            {t.howItWorksEyebrow}
          </span>

          <h2>
            {t.howItWorksTitle}
          </h2>

          <p>
            {t.howItWorksText}
          </p>

        </div>

        <div className="pf-home-how-grid">

          <article className="pf-home-how-card">

            <div className="pf-home-how-number">
              01
            </div>

            <div className="pf-home-how-icon">
              👤
            </div>

            <h3>
              {t.step1Title}
            </h3>

            <p>
              {t.step1Text}
            </p>

            <Link
              href="/register"
              className="pf-home-how-link"
            >
              {t.step1Button}
              <span>→</span>
            </Link>

          </article>

          <article className="pf-home-how-card">

            <div className="pf-home-how-number">
              02
            </div>

            <div className="pf-home-how-icon">
              🏥
            </div>

            <h3>
              {t.step2Title}
            </h3>

            <p>
              {t.step2Text}
            </p>

            <span className="pf-home-how-link">
              {locale === "fr"
                ? "Votre espace pharmacie"
                : "Your pharmacy workspace"}

              <span>→</span>
            </span>

          </article>

          <article className="pf-home-how-card">

            <div className="pf-home-how-number">
              03
            </div>

            <div className="pf-home-how-icon">
              💊
            </div>

            <h3>
              {t.step3Title}
            </h3>

            <p>
              {t.step3Text}
            </p>

            <span className="pf-home-how-link">
              {locale === "fr"
                ? "Produits & stock"
                : "Products & inventory"}

              <span>→</span>
            </span>

          </article>

          <article className="pf-home-how-card">

            <div className="pf-home-how-number">
              04
            </div>

            <div className="pf-home-how-icon">
              👥
            </div>

            <h3>
              {t.step4Title}
            </h3>

            <p>
              {t.step4Text}
            </p>

            <span className="pf-home-how-link">
              {locale === "fr"
                ? "Gestion de l'équipe"
                : "Team management"}

              <span>→</span>
            </span>

          </article>

          <article className="pf-home-how-card featured">

            <div className="pf-home-how-number">
              05
            </div>

            <div className="pf-home-how-icon">
              🛒
            </div>

            <h3>
              {t.step5Title}
            </h3>

            <p>
              {t.step5Text}
            </p>

            <span className="pf-home-how-link">
              {locale === "fr"
                ? "Scanner → Panier → Vente"
                : "Scan → Cart → Sale"}

              <span>→</span>
            </span>

          </article>

          <article className="pf-home-how-card">

            <div className="pf-home-how-number">
              06
            </div>

            <div className="pf-home-how-icon">
              📊
            </div>

            <h3>
              {t.step6Title}
            </h3>

            <p>
              {t.step6Text}
            </p>

            <span className="pf-home-how-link">
              {locale === "fr"
                ? "Tableau de bord"
                : "Dashboard"}

              <span>→</span>
            </span>

          </article>

        </div>

        <div className="pf-home-how-bottom">

          <div className="pf-home-how-bottom-copy">

            <span className="pf-home-how-bottom-icon">
              🚀
            </span>

            <div>

              <strong>
                {t.howItWorksCta}
              </strong>

              <p>
                {t.howItWorksText}
              </p>

            </div>

          </div>

          <div className="pf-home-how-bottom-actions">

            <Link
              href="/register"
              className="pf-home-primary-button"
            >
              {t.howItWorksCta}
              <span>→</span>
            </Link>

            <Link
              href="/comment-ca-marche"
              className="pf-home-secondary-button"
            >
              📖 {t.howItWorksGuide}
            </Link>

          </div>

        </div>
      </section>

      {/* =====================================================
          INTERNATIONAL
      ====================================================== */}

      <section className="pf-home-global">

        <div className="pf-home-global-inner">

          <div className="pf-home-global-copy">

            <span>
              {t.globalEyebrow}
            </span>

            <h2>
              {t.globalTitle}
            </h2>

            <p>
              {t.globalText}
            </p>

            <Link
              href="/register"
              className="pf-home-white-button"
            >
              {t.start}
              <span>→</span>
            </Link>

          </div>

          <div className="pf-home-global-grid">

            <div className="pf-home-global-card">
              <span>🌍</span>

              <strong>
                {t.country}
              </strong>
            </div>

            <div className="pf-home-global-card">
              <span>💱</span>

              <strong>
                {t.currency}
              </strong>
            </div>

            <div className="pf-home-global-card">
              <span>🌐</span>

              <strong>
                {t.language}
              </strong>
            </div>

            <div className="pf-home-global-card">
              <span>💳</span>

              <strong>
                {t.paymentMethods}
              </strong>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          SÉCURITÉ
      ====================================================== */}

      <section
        id="securite"
        className="pf-home-section pf-home-security"
      >

        <div className="pf-home-security-grid">

          <div className="pf-home-security-visual">

            <div className="pf-home-security-orbit">

              <div className="pf-home-security-lock">
                🔐
              </div>

              <span className="orbit-one">
                ✓
              </span>

              <span className="orbit-two">
                ✓
              </span>

              <span className="orbit-three">
                ✓
              </span>

            </div>

          </div>

          <div className="pf-home-security-copy">

            <span>
              {t.securityEyebrow}
            </span>

            <h2>
              {t.securityTitle}
            </h2>

            <p>
              {t.securityText}
            </p>

            <div className="pf-home-security-list">

              <div>
                <span>✓</span>

                <strong>
                  {t.securityItem1}
                </strong>
              </div>

              <div>
                <span>✓</span>

                <strong>
                  {t.securityItem2}
                </strong>
              </div>

              <div>
                <span>✓</span>

                <strong>
                  {t.securityItem3}
                </strong>
              </div>

              <div>
                <span>✓</span>

                <strong>
                  {t.securityItem4}
                </strong>
              </div>

            </div>

            <Link
              href="/support"
              className="pf-home-text-button"
            >
              {t.navSupport}
              <span>→</span>
            </Link>

          </div>

        </div>
      </section>

      {/* =====================================================
          SUPPORT
      ====================================================== */}

      <section
        id="support"
        className="pf-home-section pf-home-support"
      >

        <div className="pf-home-section-heading">

          <span>
            {t.supportEyebrow}
          </span>

          <h2>
            {t.supportTitle}
          </h2>

          <p>
            {t.supportText}
          </p>

        </div>

        <div className="pf-home-support-grid">

          <article className="pf-home-support-card ai">

            <div className="pf-home-support-icon">
              ✨
            </div>

            <div>

              <h3>
                {t.supportAi}
              </h3>

              <p>
                {t.supportAiText}
              </p>

            </div>

            <Link href="/support">
              {t.openSupport}
              <span>→</span>
            </Link>

          </article>

          <article className="pf-home-support-card human">

            <div className="pf-home-support-icon">
              👨‍💼
            </div>

            <div>

              <h3>
                {t.supportHuman}
              </h3>

              <p>
                {t.supportHumanText}
              </p>

            </div>

            <Link href="/support">
              {t.openSupport}
              <span>→</span>
            </Link>

          </article>

          <article className="pf-home-support-card payment">

            <div className="pf-home-support-icon">
              💳
            </div>

            <div>

              <h3>
                {t.supportPayment}
              </h3>

              <p>
                {t.supportPaymentText}
              </p>

            </div>

            <Link href="/support?category=payment">
              {t.supportPayment}
              <span>→</span>
            </Link>

          </article>

        </div>

        <div className="pf-home-support-cta">

          <div>

            <strong>
              {t.supportTitle}
            </strong>

            <span>
              {t.supportText}
            </span>

          </div>

          <Link
            href="/support"
            className="pf-home-primary-button"
          >
            {t.openSupport}
            <span>→</span>
          </Link>

        </div>

      </section>

      {/* =====================================================
          TARIFS
      ====================================================== */}

      <section
        id="tarifs"
        className="pf-home-section pf-home-pricing"
      >

        <div className="pf-home-section-heading">

          <span>
            {t.pricingEyebrow}
          </span>

          <h2>
            {t.pricingTitle}
          </h2>

          <p>
            {t.pricingText}
          </p>

        </div>

        <div className="pf-home-billing-switch">

          <button
            type="button"
            className={
              billing === "monthly"
                ? "active"
                : ""
            }
            onClick={() =>
              setBilling("monthly")
            }
          >
            {t.monthly}
          </button>

          <button
            type="button"
            className={
              billing === "yearly"
                ? "active"
                : ""
            }
            onClick={() =>
              setBilling("yearly")
            }
          >
            {t.yearly}
          </button>

        </div>

        <div className="pf-home-pricing-grid">

          {/* PLAN MENSUEL */}

          <article
            className={`pf-home-price-card ${
              billing === "monthly"
                ? "selected"
                : ""
            }`}
          >

            <div className="pf-home-price-top">

              <span>
                {t.monthlyPlan}
              </span>

              <h3>
                {priceLabels.monthly}

                <small>
                  {t.xaf}
                </small>
              </h3>

              <p>
                {t.perMonth}
              </p>

            </div>

            <div className="pf-home-price-features">

              <div>
                ✓ {t.pricingFeature1}
              </div>

              <div>
                ✓ {t.pricingFeature2}
              </div>

              <div>
                ✓ {t.pricingFeature3}
              </div>

              <div>
                ✓ {t.pricingFeature4}
              </div>

              <div>
                ✓ {t.pricingFeature5}
              </div>

            </div>

            <Link
              href="/register?plan=monthly"
              className="pf-home-price-button"
            >
              {t.choosePlan}
              <span>→</span>
            </Link>

          </article>

          {/* PLAN ANNUEL */}

          <article
            className={`pf-home-price-card popular ${
              billing === "yearly"
                ? "selected"
                : ""
            }`}
          >

            <div className="pf-home-popular">
              {t.popular}
            </div>

            <div className="pf-home-price-top">

              <span>
                {t.yearlyPlan}
              </span>

              <h3>
                {priceLabels.yearly}

                <small>
                  {t.xaf}
                </small>
              </h3>

              <p>
                {t.perYear}
              </p>

              <span className="pf-home-price-saving">
                {t.yearlySaving}
              </span>

            </div>

            <div className="pf-home-price-features">

              <div>
                ✓ {t.pricingFeature1}
              </div>

              <div>
                ✓ {t.pricingFeature2}
              </div>

              <div>
                ✓ {t.pricingFeature3}
              </div>

              <div>
                ✓ {t.pricingFeature4}
              </div>

              <div>
                ✓ {t.pricingFeature5}
              </div>

            </div>

            <Link
              href="/register?plan=yearly"
              className="pf-home-price-button"
            >
              {t.choosePlan}
              <span>→</span>
            </Link>

          </article>

        </div>

        <p className="pf-home-pricing-note">
          {t.pricingNote}
        </p>

      </section>

      {/* =====================================================
          FAQ
      ====================================================== */}

      <section
        id="faq"
        className="pf-home-section pf-home-faq"
      >

        <div className="pf-home-section-heading">

          <span>
            {t.faqEyebrow}
          </span>

          <h2>
            {t.faqTitle}
          </h2>

          <p>
            {t.faqText}
          </p>

        </div>

        <div className="pf-home-faq-list">

          {t.faq.map((item) => (
            <details
              key={item.q}
              className="pf-home-faq-item"
            >

              <summary>

                <span className="pf-home-faq-question">
                  {item.q}
                </span>

                <span
                  className="pf-home-faq-icon"
                  aria-hidden="true"
                >
                  +
                </span>

              </summary>

              <p>
                {item.a}
              </p>

            </details>
          ))}

        </div>

        <div className="pf-home-faq-foot">

          <span>
            {t.faqContactText}
          </span>

          <Link href="/support">
            {t.faqContactLink}
            <span aria-hidden="true">→</span>
          </Link>

        </div>

      </section>

      {/* =====================================================
          CONTACT
      ====================================================== */}

      <section className="pf-home-contact-section">

        <div className="pf-home-contact-inner">

          <div className="pf-home-contact-heading">

            <span>
              {t.contact}
            </span>

            <h2>
              PharmaFlow Africa
            </h2>

            <p>
              {t.heroText}
            </p>

          </div>

          <div className="pf-home-contact-grid">

            <a
              href={`mailto:${CONTACT.email}`}
              className="pf-home-contact-card"
            >
              <span>✉️</span>

              <strong>
                {t.emailLabel}
              </strong>

              <small>
                {CONTACT.email}
              </small>
            </a>

            <a
              href={`tel:${CONTACT.phone}`}
              className="pf-home-contact-card"
            >
              <span>📞</span>

              <strong>
                {t.phoneLabel}
              </strong>

              <small>
                {CONTACT.phoneDisplay}
              </small>
            </a>

            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="pf-home-contact-card"
            >
              <span>💬</span>

              <strong>
                {t.whatsappLabel}
              </strong>

              <small>
                {CONTACT.phoneDisplay}
              </small>
            </a>

          </div>
        </div>
      </section>

      {/* =====================================================
          CTA FINAL
      ====================================================== */}

      <section className="pf-home-final-cta">

        <div className="pf-home-final-cta-glow" />

        <div className="pf-home-final-cta-content">

          <div className="pf-home-final-badge">
            ✦ 7 JOURS GRATUITS
          </div>

          <h2>
            {t.ctaTitle}
          </h2>

          <p>
            {t.ctaText}
          </p>

          <div className="pf-home-final-buttons">

            <Link
              href="/register"
              className="pf-home-white-button"
            >
              {t.ctaButton}
              <span>→</span>
            </Link>

            <Link
              href="/support"
              className="pf-home-final-support"
            >
              {t.contact}
              <span>→</span>
            </Link>

          </div>

        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="pf-home-footer">

        <div className="pf-home-footer-main">

          {/* MARQUE */}

          <div className="pf-home-footer-brand">

            <Link
              href="/"
              className="pf-home-logo"
            >
              <span className="pf-home-logo-mark">
                +
              </span>

              <span>
                PharmaFlow
              </span>
            </Link>

            <p>
              {t.heroText}
            </p>

            <div className="pf-home-footer-status">
              <span />
              {t.liveSystem}
            </div>

          </div>

          {/* PRODUIT */}

          <div className="pf-home-footer-column">

            <h3>
              {t.footerProduct}
            </h3>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "fonctionnalites",
                )
              }
            >
              {t.footerFeatures}
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection("solutions")
              }
            >
              {t.footerSolutions}
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "comment-ca-marche",
                )
              }
            >
              {t.navHowItWorks}
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection("tarifs")
              }
            >
              {t.footerPricing}
            </button>

          </div>

          {/* ENTREPRISE */}

          <div className="pf-home-footer-column">

            <h3>
              {t.footerCompany}
            </h3>

            <Link href="/support">
              {t.footerAbout}
            </Link>

            <a
              href={`mailto:${CONTACT.email}`}
            >
              {t.footerContact}
            </a>

            <Link href="/register">
              {t.start}
            </Link>

          </div>

          {/* ASSISTANCE */}

          <div className="pf-home-footer-column">

            <h3>
              {t.footerSupport}
            </h3>

            <Link href="/support">
              {t.footerHelp}
            </Link>

            <Link href="/support?category=payment">
              {t.footerPayments}
            </Link>

            <Link href="/support?category=complaint">
              {t.footerComplaints}
            </Link>

          </div>

          {/* LÉGAL */}

          <div className="pf-home-footer-column">

            <h3>
              {t.footerLegal}
            </h3>

            <Link href="/confidentialite">
              {t.footerPrivacy}
            </Link>

            <Link href="/conditions">
              {t.footerTerms}
            </Link>

            <button
              type="button"
              onClick={() =>
                scrollToSection("securite")
              }
            >
              {t.footerSecurity}
            </button>

          </div>

        </div>

        {/* CONTACT FOOTER */}

        <div className="pf-home-footer-contact">

          <div>

            <strong>
              {t.contact}
            </strong>

            <a
              href={`mailto:${CONTACT.email}`}
            >
              {CONTACT.email}
            </a>

            <a
              href={`tel:${CONTACT.phone}`}
            >
              {CONTACT.phoneDisplay}
            </a>

          </div>

          <div>

            <strong>
              {t.socialTitle}
            </strong>

            <span>
              TikTok · Facebook · Instagram · LinkedIn · X · YouTube
            </span>

          </div>

        </div>

        {/* FOOTER BOTTOM */}

        <div className="pf-home-footer-bottom">

          <span>
            {t.footerCopyright}
          </span>

          <div>

            <button
              type="button"
              onClick={() =>
                changeLocale("fr")
              }
              className={
                locale === "fr"
                  ? "active"
                  : ""
              }
            >
              FR
            </button>

            <button
              type="button"
              onClick={() =>
                changeLocale("en")
              }
              className={
                locale === "en"
                  ? "active"
                  : ""
              }
            >
              EN
            </button>

          </div>

        </div>

      </footer>

      {/* =====================================================
          MODALE DÉMO
      ====================================================== */}

      {showDemo && (
        <div
          className="pf-home-modal-overlay"
          role="presentation"
          onClick={() =>
            setShowDemo(false)
          }
        >

          <div
            className="pf-home-demo-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              t.heroSecondary
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="pf-home-modal-close"
              onClick={() =>
                setShowDemo(false)
              }
              aria-label={t.close}
            >
              ×
            </button>

            <div className="pf-home-demo-icon">
              ✨
            </div>

            <span>
              PharmaFlow
            </span>

            <h2>
              {t.heroSecondary}
            </h2>

            <p>
              {t.heroText}
            </p>

            <div className="pf-home-demo-preview">

              <div>
                <span />
                <span />
                <span />
              </div>

              <div className="pf-home-demo-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>

              <div className="pf-home-demo-row">
                <span />
                <span />
                <span />
              </div>

            </div>

            <Link
              href="/register"
              className="pf-home-primary-button"
              onClick={() =>
                setShowDemo(false)
              }
            >
              {t.start}
              <span>→</span>
            </Link>

          </div>
        </div>
      )}

    </main>
  );
}