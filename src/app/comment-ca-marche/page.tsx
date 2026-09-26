import Link from "next/link";

export default function CommentCaMarchePage() {
  return (
    <main className="pf-guide-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="pf-guide-header">
        <div className="pf-guide-header-inner">

          <Link
            href="/"
            className="pf-guide-logo"
            aria-label="Retour à l'accueil PharmaFlow"
          >
            <span className="pf-guide-logo-mark">
              +
            </span>

            <span>
              PharmaFlow
            </span>
          </Link>

          <nav className="pf-guide-nav">
            <Link href="/">
              Accueil
            </Link>

            <Link href="/support">
              Support
            </Link>

            <Link
              href="/login"
              className="pf-guide-login"
            >
              Se connecter
            </Link>

            <Link
              href="/register"
              className="pf-guide-register"
            >
              Créer mon compte
            </Link>
          </nav>

        </div>
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="pf-guide-hero">

        <div className="pf-guide-hero-glow" />

        <div className="pf-guide-hero-content">

          <div className="pf-guide-badge">
            ✦ GUIDE PHARMAFLOW
          </div>

          <h1>
            Comment fonctionne
            <span>
              PharmaFlow ?
            </span>
          </h1>

          <p>
            Découvrez étape par étape comment créer votre espace,
            configurer votre pharmacie, ajouter vos produits,
            gérer votre stock et commencer à vendre.
          </p>

          <div className="pf-guide-hero-actions">

            <Link
              href="/register"
              className="pf-guide-primary"
            >
              Commencer gratuitement
              <span>→</span>
            </Link>

            <Link
              href="/"
              className="pf-guide-secondary"
            >
              Retour à l'accueil
            </Link>

          </div>

          <div className="pf-guide-hero-note">
            <span>✓</span>
            7 jours gratuits • Sans engagement
          </div>

        </div>

      </section>

      {/* =====================================================
          INTRODUCTION
      ====================================================== */}

      <section className="pf-guide-intro">

        <div className="pf-guide-container">

          <div className="pf-guide-section-heading">

            <span>
              SIMPLE ET RAPIDE
            </span>

            <h2>
              Votre pharmacie dans un seul espace
            </h2>

            <p>
              PharmaFlow permet de centraliser les opérations
              essentielles de votre pharmacie afin que votre équipe
              puisse travailler depuis une seule plateforme.
            </p>

          </div>

          <div className="pf-guide-benefits">

            <article className="pf-guide-benefit">
              <div>🏥</div>

              <h3>
                Votre pharmacie
              </h3>

              <p>
                Configurez les informations de votre établissement
                et votre espace de travail.
              </p>
            </article>

            <article className="pf-guide-benefit">
              <div>💊</div>

              <h3>
                Vos produits
              </h3>

              <p>
                Ajoutez vos médicaments, produits, prix,
                codes-barres et informations de stock.
              </p>
            </article>

            <article className="pf-guide-benefit">
              <div>🧾</div>

              <h3>
                Vos ventes
              </h3>

              <p>
                Enregistrez rapidement les ventes et gardez
                une trace de vos opérations.
              </p>
            </article>

            <article className="pf-guide-benefit">
              <div>📊</div>

              <h3>
                Vos rapports
              </h3>

              <p>
                Consultez les informations importantes sur
                votre activité depuis votre tableau de bord.
              </p>
            </article>

          </div>

        </div>

      </section>

      {/* =====================================================
          ETAPE 1
      ====================================================== */}

      <section className="pf-guide-step-section">

        <div className="pf-guide-container">

          <div className="pf-guide-step-grid">

            <div className="pf-guide-step-number">
              01
            </div>

            <div className="pf-guide-step-content">

              <span className="pf-guide-eyebrow">
                PREMIÈRE ÉTAPE
              </span>

              <h2>
                Créez votre compte PharmaFlow
              </h2>

              <p>
                Commencez par créer votre compte propriétaire.
                L'inscription permet de créer votre espace et
                de préparer votre pharmacie à l'utilisation de
                la plateforme.
              </p>

              <div className="pf-guide-list">

                <div>
                  <span>✓</span>
                  Ouvrez la page d'inscription.
                </div>

                <div>
                  <span>✓</span>
                  Renseignez les informations demandées.
                </div>

                <div>
                  <span>✓</span>
                  Créez vos identifiants de connexion.
                </div>

                <div>
                  <span>✓</span>
                  Accédez à votre espace PharmaFlow.
                </div>

              </div>

              <Link
                href="/register"
                className="pf-guide-inline-button"
              >
                Créer mon compte
                <span>→</span>
              </Link>

            </div>

            <div className="pf-guide-visual">

              <div className="pf-guide-mockup">

                <div className="pf-guide-mockup-top">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="pf-guide-form-icon">
                  👤
                </div>

                <strong>
                  Créer votre compte
                </strong>

                <div className="pf-guide-input">
                  Nom de la pharmacie
                </div>

                <div className="pf-guide-input">
                  Adresse e-mail
                </div>

                <div className="pf-guide-input">
                  Mot de passe
                </div>

                <div className="pf-guide-mockup-button">
                  Commencer
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ETAPE 2
      ====================================================== */}

      <section className="pf-guide-step-section alternate">

        <div className="pf-guide-container">

          <div className="pf-guide-step-grid reverse">

            <div className="pf-guide-step-number">
              02
            </div>

            <div className="pf-guide-step-content">

              <span className="pf-guide-eyebrow">
                CONFIGURATION
              </span>

              <h2>
                Configurez votre pharmacie
              </h2>

              <p>
                Une fois votre compte créé, vous pouvez préparer
                votre espace de travail avec les informations
                nécessaires au fonctionnement de votre pharmacie.
              </p>

              <div className="pf-guide-list">

                <div>
                  <span>✓</span>
                  Nom de votre pharmacie.
                </div>

                <div>
                  <span>✓</span>
                  Adresse et informations de contact.
                </div>

                <div>
                  <span>✓</span>
                  Ville et pays.
                </div>

                <div>
                  <span>✓</span>
                  Devise utilisée par votre pharmacie.
                </div>

              </div>

            </div>

            <div className="pf-guide-visual">

              <div className="pf-guide-dashboard-mini">

                <div className="pf-guide-mini-header">
                  <strong>
                    PharmaFlow
                  </strong>

                  <span>
                    🏥
                  </span>
                </div>

                <div className="pf-guide-mini-title">
                  Ma pharmacie
                </div>

                <div className="pf-guide-mini-row">
                  <span>
                    Nom
                  </span>

                  <strong>
                    Ma Pharmacie
                  </strong>
                </div>

                <div className="pf-guide-mini-row">
                  <span>
                    Ville
                  </span>

                  <strong>
                    Pointe-Noire
                  </strong>
                </div>

                <div className="pf-guide-mini-row">
                  <span>
                    Devise
                  </span>

                  <strong>
                    XAF
                  </strong>
                </div>

                <div className="pf-guide-success">
                  ✓ Configuration prête
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ETAPE 3 — PRODUITS
      ====================================================== */}

      <section className="pf-guide-step-section">

        <div className="pf-guide-container">

          <div className="pf-guide-step-grid">

            <div className="pf-guide-step-number">
              03
            </div>

            <div className="pf-guide-step-content">

              <span className="pf-guide-eyebrow">
                PRODUITS ET STOCK
              </span>

              <h2>
                Ajoutez vos produits
              </h2>

              <p>
                Enregistrez les produits disponibles dans votre
                pharmacie afin de pouvoir suivre leurs stocks et
                les utiliser lors des ventes.
              </p>

              <div className="pf-guide-list">

                <div>
                  <span>✓</span>
                  Nom du produit.
                </div>

                <div>
                  <span>✓</span>
                  Prix de vente.
                </div>

                <div>
                  <span>✓</span>
                  Code-barres ou référence.
                </div>

                <div>
                  <span>✓</span>
                  Catégorie et quantité en stock.
                </div>

                <div>
                  <span>✓</span>
                  Informations relatives au produit.
                </div>

              </div>

            </div>

            <div className="pf-guide-visual">

              <div className="pf-guide-product-card">

                <div className="pf-guide-product-icon">
                  💊
                </div>

                <div className="pf-guide-product-info">

                  <strong>
                    Paracétamol 500mg
                  </strong>

                  <span>
                    Médicament
                  </span>

                  <small>
                    Code-barres : 123456789
                  </small>

                </div>

                <div className="pf-guide-product-stock">
                  <strong>
                    120
                  </strong>

                  <span>
                    en stock
                  </span>
                </div>

              </div>

              <div className="pf-guide-product-card">

                <div className="pf-guide-product-icon">
                  🧴
                </div>

                <div className="pf-guide-product-info">

                  <strong>
                    Produit pharmacie
                  </strong>

                  <span>
                    Produit
                  </span>

                  <small>
                    Code-barres : 987654321
                  </small>

                </div>

                <div className="pf-guide-product-stock">
                  <strong>
                    45
                  </strong>

                  <span>
                    en stock
                  </span>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ETAPE 4 — EQUIPE
      ====================================================== */}

      <section className="pf-guide-step-section alternate">

        <div className="pf-guide-container">

          <div className="pf-guide-step-grid reverse">

            <div className="pf-guide-step-number">
              04
            </div>

            <div className="pf-guide-step-content">

              <span className="pf-guide-eyebrow">
                VOTRE ÉQUIPE
              </span>

              <h2>
                Ajoutez vos collaborateurs
              </h2>

              <p>
                PharmaFlow permet d'organiser les accès de votre
                équipe selon les responsabilités de chacun.
              </p>

              <div className="pf-guide-role-grid">

                <div>
                  <span>👨‍⚕️</span>
                  <strong>
                    Pharmacien
                  </strong>
                </div>

                <div>
                  <span>🧾</span>
                  <strong>
                    Caissier
                  </strong>
                </div>

                <div>
                  <span>👤</span>
                  <strong>
                    Employé
                  </strong>
                </div>

                <div>
                  <span>⚙️</span>
                  <strong>
                    Administrateur
                  </strong>
                </div>

              </div>

            </div>

            <div className="pf-guide-visual">

              <div className="pf-guide-team-card">

                <div className="pf-guide-team-header">
                  <strong>
                    Équipe
                  </strong>

                  <span>
                    + Ajouter
                  </span>
                </div>

                <div className="pf-guide-team-member">
                  <div>
                    👨‍⚕️
                  </div>

                  <span>
                    Pharmacien
                  </span>

                  <small>
                    Accès pharmacie
                  </small>
                </div>

                <div className="pf-guide-team-member">
                  <div>
                    🧾
                  </div>

                  <span>
                    Caissier
                  </span>

                  <small>
                    Accès ventes
                  </small>
                </div>

                <div className="pf-guide-team-member">
                  <div>
                    👤
                  </div>

                  <span>
                    Employé
                  </span>

                  <small>
                    Accès limité
                  </small>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ETAPE 5 — VENTE / SCANNER
      ====================================================== */}

      <section className="pf-guide-scanner-section">

        <div className="pf-guide-container">

          <div className="pf-guide-section-heading light">

            <span>
              CAISSE ET VENTES
            </span>

            <h2>
              Scannez, ajoutez au panier et vendez.
            </h2>

            <p>
              Le caissier peut sélectionner directement un produit
              ou utiliser un scanner de code-barres pour retrouver
              rapidement le produit et l'ajouter au panier.
            </p>

          </div>

          <div className="pf-guide-scanner-flow">

            <div className="pf-guide-scanner-card">

              <div className="pf-guide-scanner-icon">
                📷
              </div>

              <span className="pf-guide-scanner-number">
                01
              </span>

              <h3>
                Scanner le produit
              </h3>

              <p>
                Le caissier scanne le code-barres du produit.
              </p>

            </div>

            <div className="pf-guide-scanner-arrow">
              →
            </div>

            <div className="pf-guide-scanner-card">

              <div className="pf-guide-scanner-icon">
                🛒
              </div>

              <span className="pf-guide-scanner-number">
                02
              </span>

              <h3>
                Ajout automatique
              </h3>

              <p>
                Le produit reconnu est ajouté au panier.
              </p>

            </div>

            <div className="pf-guide-scanner-arrow">
              →
            </div>

            <div className="pf-guide-scanner-card">

              <div className="pf-guide-scanner-icon">
                ➕
              </div>

              <span className="pf-guide-scanner-number">
                03
              </span>

              <h3>
                Scanner le suivant
              </h3>

              <p>
                Vous pouvez scanner plusieurs produits
                successivement.
              </p>

            </div>

            <div className="pf-guide-scanner-arrow">
              →
            </div>

            <div className="pf-guide-scanner-card">

              <div className="pf-guide-scanner-icon">
                💳
              </div>

              <span className="pf-guide-scanner-number">
                04
              </span>

              <h3>
                Valider la vente
              </h3>

              <p>
                Vérifiez le panier, encaissez et validez la vente.
              </p>

            </div>

          </div>

          <div className="pf-guide-scanner-example">

            <div className="pf-guide-scanner-example-header">

              <div>
                <span>
                  Panier
                </span>

                <strong>
                  Vente en cours
                </strong>
              </div>

              <div className="pf-guide-cart-count">
                4 produits
              </div>

            </div>

            <div className="pf-guide-cart-item">

              <span>
                💊
              </span>

              <div>
                <strong>
                  Paracétamol 500mg
                </strong>

                <small>
                  Quantité : 2
                </small>
              </div>

              <strong>
                2 000 XAF
              </strong>

            </div>

            <div className="pf-guide-cart-item">

              <span>
                🧴
              </span>

              <div>
                <strong>
                  Produit pharmacie
                </strong>

                <small>
                  Quantité : 1
                </small>
              </div>

              <strong>
                3 500 XAF
              </strong>

            </div>

            <div className="pf-guide-cart-total">

              <span>
                Total
              </span>

              <strong>
                5 500 XAF
              </strong>

            </div>

            <div className="pf-guide-cart-button">
              ✓ Valider la vente
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          ETAPE 6 — TABLEAU DE BORD
      ====================================================== */}

      <section className="pf-guide-step-section">

        <div className="pf-guide-container">

          <div className="pf-guide-step-grid">

            <div className="pf-guide-step-number">
              06
            </div>

            <div className="pf-guide-step-content">

              <span className="pf-guide-eyebrow">
                PILOTAGE
              </span>

              <h2>
                Suivez votre activité
              </h2>

              <p>
                Une fois vos opérations enregistrées, votre
                espace permet de suivre les informations
                importantes de votre pharmacie.
              </p>

              <div className="pf-guide-list">

                <div>
                  <span>✓</span>
                  Consultez vos ventes.
                </div>

                <div>
                  <span>✓</span>
                  Suivez votre stock.
                </div>

                <div>
                  <span>✓</span>
                  Identifiez les produits nécessitant votre attention.
                </div>

                <div>
                  <span>✓</span>
                  Consultez vos rapports.
                </div>

              </div>

            </div>

            <div className="pf-guide-visual">

              <div className="pf-guide-stat-dashboard">

                <div className="pf-guide-stat">
                  <span>
                    Ventes
                  </span>

                  <strong>
                    127
                  </strong>

                  <small>
                    Aujourd'hui
                  </small>
                </div>

                <div className="pf-guide-stat">
                  <span>
                    Produits
                  </span>

                  <strong>
                    1 248
                  </strong>

                  <small>
                    Enregistrés
                  </small>
                </div>

                <div className="pf-guide-stat warning">
                  <span>
                    Stock faible
                  </span>

                  <strong>
                    08
                  </strong>

                  <small>
                    À surveiller
                  </small>
                </div>

                <div className="pf-guide-chart-box">

                  <div className="pf-guide-chart-title">
                    Activité récente
                  </div>

                  <div className="pf-guide-chart-bars">
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

        </div>

      </section>

      {/* =====================================================
          RÉSUMÉ
      ====================================================== */}

      <section className="pf-guide-summary">

        <div className="pf-guide-container">

          <div className="pf-guide-summary-card">

            <div className="pf-guide-summary-icon">
              🚀
            </div>

            <div>

              <span>
                EN RÉSUMÉ
              </span>

              <h2>
                Créez votre compte et commencez simplement.
              </h2>

              <p>
                Créez votre pharmacie, ajoutez vos produits,
                configurez votre équipe puis commencez vos
                ventes. Avec le scanner, plusieurs produits
                peuvent être ajoutés rapidement au panier avant
                la validation de la vente.
              </p>

            </div>

            <div className="pf-guide-summary-actions">

              <Link
                href="/register"
                className="pf-guide-primary"
              >
                Créer ma pharmacie
                <span>→</span>
              </Link>

              <Link
                href="/support"
                className="pf-guide-secondary"
              >
                Besoin d'aide ?
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="pf-guide-footer">

        <div className="pf-guide-footer-inner">

          <div>

            <Link
              href="/"
              className="pf-guide-logo"
            >
              <span className="pf-guide-logo-mark">
                +
              </span>

              <span>
                PharmaFlow
              </span>
            </Link>

            <p>
              La gestion intelligente de votre pharmacie.
            </p>

          </div>

          <div className="pf-guide-footer-links">

            <Link href="/">
              Accueil
            </Link>

            <Link href="/register">
              Créer un compte
            </Link>

            <Link href="/login">
              Se connecter
            </Link>

            <Link href="/support">
              Support
            </Link>

          </div>

        </div>

        <div className="pf-guide-footer-bottom">
          ©️ 2026 PharmaFlow Africa. Tous droits réservés.
        </div>

      </footer>

    </main>
  );
}