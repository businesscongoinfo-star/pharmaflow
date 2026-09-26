import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité | PharmaFlow",
  description:
    "Politique de confidentialité de PharmaFlow Africa. Découvrez comment nous collectons, utilisons et protégeons vos données.",
};

export default function ConfidentialitePage() {
  return (
    <main className="pf-privacy-page">
      <style>{`
        .pf-privacy-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(20, 184, 166, 0.10),
              transparent 30%
            ),
            #f8fafc;
          color: #0f172a;
          font-family: inherit;
        }

        .pf-privacy-container {
          width: min(1080px, calc(100% - 32px));
          margin: 0 auto;
          padding: 32px 0 64px;
        }

        .pf-privacy-header {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          padding: 42px 36px;
          background:
            linear-gradient(
              135deg,
              #064e49 0%,
              #0f766e 55%,
              #115e59 100%
            );
          color: #fff;
          box-shadow:
            0 20px 50px rgba(15, 118, 110, 0.18);
        }

        .pf-privacy-header::after {
          content: "";
          position: absolute;
          width: 240px;
          height: 240px;
          right: -80px;
          top: -100px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
        }

        .pf-privacy-brand {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
          color: #ccfbf1;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .pf-privacy-brand-mark {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.16);
          font-size: 19px;
        }

        .pf-privacy-header h1 {
          position: relative;
          z-index: 1;
          margin: 0;
          max-width: 760px;
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1.08;
          letter-spacing: -0.03em;
          font-weight: 850;
        }

        .pf-privacy-header p {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 16px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 15px;
          line-height: 1.7;
        }

        .pf-privacy-date {
          position: relative;
          z-index: 1;
          margin-top: 20px;
          color: #ccfbf1;
          font-size: 12px;
          font-weight: 650;
        }

        .pf-privacy-layout {
          display: grid;
          grid-template-columns: 250px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
          margin-top: 24px;
        }

        .pf-privacy-nav {
          position: sticky;
          top: 20px;
          padding: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #fff;
          box-shadow:
            0 8px 25px rgba(15, 23, 42, 0.05);
        }

        .pf-privacy-nav-title {
          margin-bottom: 12px;
          color: #0f766e;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .pf-privacy-nav a {
          display: block;
          padding: 9px 10px;
          border-radius: 9px;
          color: #475569;
          text-decoration: none;
          font-size: 12px;
          font-weight: 650;
          line-height: 1.4;
          transition:
            background 0.15s ease,
            color 0.15s ease;
        }

        .pf-privacy-nav a:hover {
          background: #f0fdfa;
          color: #0f766e;
        }

        .pf-privacy-content {
          min-width: 0;
          padding: 30px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 8px 30px rgba(15, 23, 42, 0.05);
        }

        .pf-privacy-section {
          scroll-margin-top: 24px;
          padding: 0 0 30px;
          margin-bottom: 30px;
          border-bottom: 1px solid #e2e8f0;
        }

        .pf-privacy-section:last-child {
          padding-bottom: 0;
          margin-bottom: 0;
          border-bottom: 0;
        }

        .pf-privacy-section h2 {
          margin: 0 0 12px;
          color: #134e4a;
          font-size: 21px;
          line-height: 1.3;
          font-weight: 820;
        }

        .pf-privacy-section h3 {
          margin: 20px 0 8px;
          color: #0f766e;
          font-size: 15px;
          font-weight: 800;
        }

        .pf-privacy-section p {
          margin: 0 0 11px;
          color: #475569;
          font-size: 14px;
          line-height: 1.8;
        }

        .pf-privacy-section ul {
          margin: 10px 0 14px;
          padding-left: 21px;
          color: #475569;
        }

        .pf-privacy-section li {
          margin: 7px 0;
          font-size: 14px;
          line-height: 1.7;
        }

        .pf-privacy-highlight {
          margin: 18px 0;
          padding: 15px 17px;
          border-left: 4px solid #0f766e;
          border-radius: 10px;
          background: #f0fdfa;
          color: #134e4a;
          font-size: 13px;
          line-height: 1.7;
        }

        .pf-privacy-contact {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .pf-privacy-contact-card {
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #f8fafc;
        }

        .pf-privacy-contact-card strong {
          display: block;
          margin-bottom: 5px;
          color: #134e4a;
          font-size: 12px;
        }

        .pf-privacy-contact-card span,
        .pf-privacy-contact-card a {
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
          text-decoration: none;
        }

        .pf-privacy-contact-card a:hover {
          color: #0f766e;
        }

        .pf-privacy-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 24px;
          padding: 20px 4px 0;
          color: #64748b;
          font-size: 12px;
        }

        .pf-privacy-footer a {
          color: #0f766e;
          font-weight: 750;
          text-decoration: none;
        }

        .pf-privacy-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 800px) {
          .pf-privacy-container {
            width: min(100% - 20px, 1080px);
            padding-top: 10px;
          }

          .pf-privacy-header {
            padding: 30px 22px;
            border-radius: 20px;
          }

          .pf-privacy-layout {
            grid-template-columns: 1fr;
          }

          .pf-privacy-nav {
            position: static;
          }

          .pf-privacy-nav-links {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px;
          }

          .pf-privacy-content {
            padding: 22px 18px;
          }
        }

        @media (max-width: 520px) {
          .pf-privacy-header h1 {
            font-size: 30px;
          }

          .pf-privacy-header p {
            font-size: 13px;
          }

          .pf-privacy-nav-links {
            grid-template-columns: 1fr;
          }

          .pf-privacy-contact {
            grid-template-columns: 1fr;
          }

          .pf-privacy-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media print {
          .pf-privacy-nav,
          .pf-privacy-footer {
            display: none;
          }

          .pf-privacy-container {
            width: 100%;
            padding: 0;
          }

          .pf-privacy-header {
            box-shadow: none;
          }

          .pf-privacy-content {
            box-shadow: none;
            border: 0;
          }
        }
      `}</style>

      <div className="pf-privacy-container">
        <header className="pf-privacy-header">
          <div className="pf-privacy-brand">
            <span className="pf-privacy-brand-mark">✚</span>
            PharmaFlow Africa
          </div>

          <h1>Politique de confidentialité</h1>

          <p>
            Cette politique explique de manière claire comment PharmaFlow
            traite les informations utilisées dans le cadre de ses services
            de gestion des pharmacies.
          </p>

          <div className="pf-privacy-date">
            Dernière mise à jour : 25 septembre 2026
          </div>
        </header>

        <div className="pf-privacy-layout">
          <aside className="pf-privacy-nav">
            <div className="pf-privacy-nav-title">
              Sommaire
            </div>

            <div className="pf-privacy-nav-links">
              <a href="#introduction">Introduction</a>
              <a href="#donnees">Données collectées</a>
              <a href="#utilisation">Utilisation des données</a>
              <a href="#securite">Sécurité</a>
              <a href="#partage">Partage des données</a>
              <a href="#conservation">Conservation</a>
              <a href="#droits">Vos droits</a>
              <a href="#cookies">Cookies</a>
              <a href="#modifications">Modifications</a>
              <a href="#contact">Contact</a>
            </div>
          </aside>

          <article className="pf-privacy-content">
            <section
              id="introduction"
              className="pf-privacy-section"
            >
              <h2>1. Introduction</h2>

              <p>
                PharmaFlow Africa fournit une plateforme SaaS destinée à
                accompagner les pharmacies dans la gestion de leurs produits,
                stocks, ventes, utilisateurs, rapports et opérations
                administratives.
              </p>

              <p>
                Nous accordons une importance particulière à la protection
                des informations utilisées dans le cadre de nos services.
              </p>

              <div className="pf-privacy-highlight">
                PharmaFlow ne demande pas plus d'informations que celles
                nécessaires au fonctionnement des fonctionnalités concernées.
              </div>
            </section>

            <section
              id="donnees"
              className="pf-privacy-section"
            >
              <h2>2. Données pouvant être collectées</h2>

              <p>
                Selon les fonctionnalités utilisées, les informations
                suivantes peuvent être enregistrées :
              </p>

              <ul>
                <li>
                  informations de compte telles que le nom et l'adresse
                  e-mail ;
                </li>
                <li>
                  informations relatives à la pharmacie et à son activité ;
                </li>
                <li>
                  informations nécessaires à la gestion des produits et du
                  stock ;
                </li>
                <li>
                  informations relatives aux ventes et opérations enregistrées
                  dans la plateforme ;
                </li>
                <li>
                  informations nécessaires au support et à l'assistance
                  technique ;
                </li>
                <li>
                  informations techniques nécessaires au fonctionnement et à
                  la sécurité du service.
                </li>
              </ul>
            </section>

            <section
              id="utilisation"
              className="pf-privacy-section"
            >
              <h2>3. Utilisation des informations</h2>

              <p>
                Les informations disponibles dans PharmaFlow peuvent être
                utilisées pour :
              </p>

              <ul>
                <li>fournir et maintenir les fonctionnalités de la plateforme ;</li>
                <li>gérer les comptes et les accès utilisateurs ;</li>
                <li>gérer les produits, stocks et ventes ;</li>
                <li>assurer le support client et technique ;</li>
                <li>améliorer la sécurité et la fiabilité du service ;</li>
                <li>détecter et prévenir les utilisations abusives ;</li>
                <li>améliorer progressivement les fonctionnalités de PharmaFlow.</li>
              </ul>
            </section>

            <section
              id="securite"
              className="pf-privacy-section"
            >
              <h2>4. Sécurité des données</h2>

              <p>
                PharmaFlow met en œuvre des mesures techniques et
                organisationnelles destinées à protéger les informations
                contre les accès non autorisés, la perte, l'altération ou
                l'utilisation abusive.
              </p>

              <p>
                Les accès aux différentes fonctionnalités sont notamment
                organisés selon les rôles et les autorisations attribués aux
                utilisateurs.
              </p>

              <div className="pf-privacy-highlight">
                Les utilisateurs sont également responsables de la
                confidentialité de leurs identifiants et doivent éviter de
                partager leur mot de passe avec d'autres personnes.
              </div>
            </section>

            <section
              id="partage"
              className="pf-privacy-section"
            >
              <h2>5. Partage des données</h2>

              <p>
                Les informations enregistrées dans PharmaFlow sont utilisées
                dans le cadre de la fourniture du service.
              </p>

              <p>
                Lorsque certains prestataires techniques sont nécessaires au
                fonctionnement de la plateforme, les informations peuvent être
                traitées par ces prestataires uniquement dans le cadre des
                services concernés et selon les conditions applicables.
              </p>

              <p>
                PharmaFlow ne doit pas être utilisé pour transmettre
                volontairement des informations auxquelles l'utilisateur
                n'est pas autorisé à accéder.
              </p>
            </section>

            <section
              id="conservation"
              className="pf-privacy-section"
            >
              <h2>6. Conservation des données</h2>

              <p>
                Les informations sont conservées pendant la période nécessaire
                au fonctionnement du service, à la gestion du compte, aux
                obligations applicables ou aux besoins légitimes liés à la
                sécurité et à la gestion de la plateforme.
              </p>

              <p>
                Les périodes de conservation peuvent varier selon la nature
                des informations concernées.
              </p>
            </section>

            <section
              id="droits"
              className="pf-privacy-section"
            >
              <h2>7. Vos droits</h2>

              <p>
                Selon les lois et réglementations applicables à votre
                situation, vous pouvez notamment demander l'accès à certaines
                informations vous concernant, leur rectification ou
                communiquer une demande relative à leur traitement.
              </p>

              <p>
                Pour toute demande concernant vos données, vous pouvez
                contacter l'équipe PharmaFlow à l'adresse indiquée dans la
                section Contact.
              </p>
            </section>

            <section
              id="cookies"
              className="pf-privacy-section"
            >
              <h2>8. Cookies et technologies similaires</h2>

              <p>
                PharmaFlow peut utiliser des mécanismes techniques nécessaires
                à l'authentification, au maintien de session, à la sécurité et
                au bon fonctionnement de la plateforme.
              </p>

              <p>
                Les paramètres disponibles dans votre navigateur peuvent
                également permettre de contrôler certains mécanismes de
                stockage utilisés par les sites web.
              </p>
            </section>

            <section
              id="modifications"
              className="pf-privacy-section"
            >
              <h2>9. Modifications de cette politique</h2>

              <p>
                Cette politique peut être mise à jour lorsque les
                fonctionnalités de PharmaFlow, les pratiques de traitement
                des informations ou les exigences applicables évoluent.
              </p>

              <p>
                La date de dernière mise à jour affichée en haut de cette page
                permet de connaître la version actuellement publiée.
              </p>
            </section>

            <section
              id="contact"
              className="pf-privacy-section"
            >
              <h2>10. Contact</h2>

              <p>
                Pour toute question concernant cette politique ou le traitement
                des informations dans PharmaFlow, vous pouvez contacter
                l'équipe PharmaFlow Africa.
              </p>

              <div className="pf-privacy-contact">
                <div className="pf-privacy-contact-card">
                  <strong>E-mail</strong>

                  <a href="mailto:pharmaflowafrica@gmail.com">
                    pharmaflowafrica@gmail.com
                  </a>
                </div>

                <div className="pf-privacy-contact-card">
                  <strong>Téléphone</strong>

                  <a href="tel:+242044177909">
                    +242 04 417 79 09
                  </a>
                </div>

                <div className="pf-privacy-contact-card">
                  <strong>Plateforme</strong>

                  <a
                    href="https://pharmaflow.africa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    pharmaflow.africa
                  </a>
                </div>

                <div className="pf-privacy-contact-card">
                  <strong>Service</strong>

                  <span>
                    PharmaFlow Africa
                  </span>
                </div>
              </div>
            </section>
          </article>
        </div>

        <footer className="pf-privacy-footer">
          <span>
            © {new Date().getFullYear()} PharmaFlow Africa. Tous droits
            réservés.
          </span>

          <Link href="/">
            ← Retour à PharmaFlow
          </Link>
        </footer>
      </div>
    </main>
  );
}