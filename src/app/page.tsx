"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Locale = "fr" | "en";
type BillingCycle = "monthly" | "yearly";

const TEXT = {
  fr: {
    navHome: "Accueil",
    navFeatures: "Fonctionnalités",
    navSolutions: "Solutions",
    navPricing: "Tarifs",
    navSupport: "Support",
    login: "Se connecter",
    start: "Commencer gratuitement",
    badge: "7 jours gratuits • Sans engagement",
    heroTitle1: "La gestion intelligente",
    heroTitle2: "de votre pharmacie.",
    heroText:
      "PharmaFlow centralise vos produits, votre stock, vos ventes, vos équipes, vos rapports et vos paiements dans une seule plateforme moderne.",
    heroPrimary: "Démarrer mon essai gratuit",
    heroSecondary: "Découvrir PharmaFlow",
    trusted: "Conçu pour les pharmacies modernes",
    dashboardLabel: "Tableau de bord",
    todaySales: "Ventes aujourd'hui",
    revenue: "Chiffre d'affaires",
    lowStock: "Stock faible",
    expiring: "Expirations proches",
    recentActivity: "Activité récente",
    seeDashboard: "Voir la plateforme",
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
    monthlyPrice: "8 500",
    yearlyPrice: "85 000",
    xaf: "XAF",
    perMonth: "/ mois",
    perYear: "/ an",
    monthlyPlan: "Formule mensuelle",
    yearlyPlan: "Formule annuelle",
    choosePlan: "Choisir cette formule",
    popular: "RECOMMANDÉ",
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
      "© 2026 PharmaFlow. Tous droits réservés.",
    close: "Fermer",
  },

  en: {
    navHome: "Home",
    navFeatures: "Features",
    navSolutions: "Solutions",
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
    dashboardLabel: "Dashboard",
    todaySales: "Today's sales",
    revenue: "Revenue",
    lowStock: "Low stock",
    expiring: "Expiring soon",
    recentActivity: "Recent activity",
    seeDashboard: "Explore the platform",
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
    monthlyPrice: "8,500",
    yearlyPrice: "85,000",
    xaf: "XAF",
    perMonth: "/ month",
    perYear: "/ year",
    monthlyPlan: "Monthly plan",
    yearlyPlan: "Yearly plan",
    choosePlan: "Choose this plan",
    popular: "RECOMMENDED",
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
      "© 2026 PharmaFlow. All rights reserved.",
    close: "Close",
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
  document.cookie = `pf_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
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

  useEffect(() => {
    const detected =
      getInitialLocale();

    setLocale(detected);
    saveLocale(detected);
  }, []);

  const t = TEXT[locale];

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

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <main className="pf-home">
      {/* =========================
          NAVBAR
      ========================== */}

      <header className="pf-home-header">
        <div className="pf-home-header-inner">
          <Link
            href="/"
            className="pf-home-logo"
            aria-label="PharmaFlow"
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
          >
            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "accueil",
                )
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
                  "tarifs",
                )
              }
            >
              {t.navPricing}
            </button>

            <Link
              href="/support"
              onClick={() =>
                setMobileMenu(false)
              }
            >
              {t.navSupport}
            </Link>
          </nav>

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
              >
                EN
              </button>
            </div>

            <Link
              href="/login"
              className="pf-home-login"
            >
              {t.login}
            </Link>

            <Link
              href="/register"
              className="pf-home-header-cta"
            >
              {t.start}
            </Link>

            <button
              type="button"
              className="pf-home-menu-button"
              onClick={() =>
                setMobileMenu(
                  (value) =>
                    !value,
                )
              }
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* =========================
          HERO
      ========================== */}

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
                  setShowDemo(
                    true,
                  )
                }
              >
                <span className="pf-home-play">
                  ▶
                </span>

                {t.heroSecondary}
              </button>
            </div>

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

          {/* Dashboard preview */}

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
                    produits
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
                    produits
                  </small>
                </div>
              </div>

              <div className="pf-home-dashboard-chart">
                <div className="pf-home-chart-heading">
                  <strong>
                    {t.recentActivity}
                  </strong>

                  <span>
                    7 jours
                  </span>
                </div>

                <div className="pf-home-chart">
                  <span
                    style={{
                      height:
                        "38%",
                    }}
                  />
                  <span
                    style={{
                      height:
                        "54%",
                    }}
                  />
                  <span
                    style={{
                      height:
                        "45%",
                    }}
                  />
                  <span
                    style={{
                      height:
                        "68%",
                    }}
                  />
                  <span
                    style={{
                      height:
                        "58%",
                    }}
                  />
                  <span
                    style={{
                      height:
                        "82%",
                    }}
                  />
                  <span
                    style={{
                      height:
                        "74%",
                    }}
                  />
                </div>
              </div>

              <div className="pf-home-dashboard-bottom">
                <div>
                  <span className="pf-home-live-dot" />
                  Système opérationnel
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDemo(
                      true,
                    )
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

      {/* =========================
          FEATURES
      ========================== */}

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
      {/* =========================
          SOLUTIONS
      ========================== */}

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

      {/* =========================
          GLOBAL
      ========================== */}

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

      {/* =========================
          SECURITY
      ========================== */}

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
                <span>
                  ✓
                </span>

                <strong>
                  {t.securityItem1}
                </strong>
              </div>

              <div>
                <span>
                  ✓
                </span>

                <strong>
                  {t.securityItem2}
                </strong>
              </div>

              <div>
                <span>
                  ✓
                </span>

                <strong>
                  {t.securityItem3}
                </strong>
              </div>

              <div>
                <span>
                  ✓
                </span>

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

      {/* =========================
          SUPPORT
      ========================== */}

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

      {/* =========================
          PRICING
      ========================== */}

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
                {t.monthlyPrice}
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
                {t.yearlyPrice}
                <small>
                  {t.xaf}
                </small>
              </h3>

              <p>
                {t.perYear}
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
              href="/register?plan=yearly"
              className="pf-home-price-button"
            >
              {t.choosePlan}
              <span>→</span>
            </Link>
          </article>
        </div>
      </section>

      {/* =========================
          FINAL CTA
      ========================== */}

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

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="pf-home-footer">
        <div className="pf-home-footer-main">
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
              Plateforme opérationnelle
            </div>
          </div>

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
                scrollToSection(
                  "solutions",
                )
              }
            >
              {t.footerSolutions}
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "tarifs",
                )
              }
            >
              {t.footerPricing}
            </button>
          </div>

          <div className="pf-home-footer-column">
            <h3>
              {t.footerCompany}
            </h3>

            <Link href="/support">
              {t.footerAbout}
            </Link>

            <Link href="/support">
              {t.footerContact}
            </Link>

            <Link href="/register">
              {t.start}
            </Link>
          </div>

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
                scrollToSection(
                  "securite",
                )
              }
            >
              {t.footerSecurity}
            </button>
          </div>
        </div>

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

      {/* =========================
          DEMO MODAL
      ========================== */}

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