// ============================================================================
// Mentions Légales
// ============================================================================
// Page obligatoire pour tout site e-commerce français
// Conforme à la LCEN et au RGPD
// ============================================================================

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions Légales | Dropship Luxe',
  description: 'Mentions légales et informations juridiques de Dropship Luxe.',
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b">
            Mentions Légales
          </h1>

          <p className="text-sm text-gray-500 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          {/* Section 1 - Éditeur */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              1. Éditeur du site
            </h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Raison sociale :</strong> Dropship Luxe
              </p>
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Forme juridique :</strong> [À compléter - SAS/SARL/Auto-entrepreneur]
              </p>
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Capital social :</strong> [À compléter]
              </p>
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Siège social :</strong> [Adresse à compléter]
              </p>
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>SIRET :</strong> [À compléter]
              </p>
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>RCS :</strong> [À compléter]
              </p>
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Numéro de TVA intracommunautaire :</strong> [À compléter]
              </p>
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Email :</strong> contact@dropship-luxe.com
              </p>
              <p className="text-gray-600 leading-relaxed">
                <strong>Directeur de la publication :</strong> [Nom à compléter]
              </p>
            </div>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
              <p className="text-amber-800 text-sm">
                <strong>Note :</strong> Les informations entre crochets doivent être complétées
                avec vos données d'entreprise réelles avant mise en production.
              </p>
            </div>
          </section>

          {/* Section 2 - Hébergeur */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              2. Hébergement
            </h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Hébergeur :</strong> [Nom de l'hébergeur - ex: Vercel, OVH, AWS]
              </p>
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Adresse :</strong> [Adresse de l'hébergeur]
              </p>
              <p className="text-gray-600 leading-relaxed">
                <strong>Contact :</strong> [Contact de l'hébergeur]
              </p>
            </div>
          </section>

          {/* Section 3 - Activité */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              3. Activité
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Dropship Luxe est une boutique en ligne spécialisée dans la vente de produits
              cosmétiques. Notre activité consiste en la commercialisation de produits
              cosmétiques conformes à la réglementation européenne en vigueur.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Nos produits sont conformes au Règlement (CE) n°1223/2009 du Parlement européen
              et du Conseil relatif aux produits cosmétiques.
            </p>
          </section>

          {/* Section 4 - Propriété intellectuelle */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              4. Propriété intellectuelle
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              L'ensemble du contenu de ce site (textes, images, vidéos, logos, icônes, sons,
              logiciels, etc.) est protégé par le droit d'auteur, le droit des marques et/ou
              tout autre droit de propriété intellectuelle.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Ce contenu est la propriété exclusive de Dropship Luxe ou de ses partenaires.
              Toute reproduction, représentation, modification, publication, transmission,
              dénaturation, totale ou partielle du site ou de son contenu, par quelque procédé
              que ce soit, et sur quelque support que ce soit est interdite sans autorisation
              écrite préalable.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Toute exploitation non autorisée du site ou de son contenu serait constitutive
              d'une contrefaçon et sanctionnée par les articles L.335-2 et suivants du Code
              de la propriété intellectuelle.
            </p>
          </section>

          {/* Section 5 - RGPD */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              5. Protection des données personnelles (RGPD)
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la
              loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez des droits
              suivants concernant vos données personnelles :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
              <li><strong>Droit d'accès :</strong> obtenir la confirmation du traitement de vos données et en obtenir une copie</li>
              <li><strong>Droit de rectification :</strong> demander la correction de données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
              <li><strong>Droit à la limitation :</strong> demander la limitation du traitement</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-4">
              Pour exercer ces droits, vous pouvez nous contacter à l'adresse :
              <a href="mailto:rgpd@dropship-luxe.com" className="text-pink-600 hover:text-pink-700 ml-1">
                rgpd@dropship-luxe.com
              </a>
            </p>
            <p className="text-gray-600 leading-relaxed">
              Pour plus d'informations sur la gestion de vos données, consultez notre{' '}
              <a href="/politique-confidentialite" className="text-pink-600 hover:text-pink-700">
                Politique de Confidentialité
              </a>.
            </p>
          </section>

          {/* Section 6 - Cookies */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              6. Cookies
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Notre site utilise des cookies pour améliorer votre expérience de navigation.
              Les cookies sont de petits fichiers texte stockés sur votre appareil qui nous
              permettent de :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
              <li>Mémoriser vos préférences et paramètres</li>
              <li>Analyser le trafic et l'utilisation du site (cookies analytiques)</li>
              <li>Vous proposer des publicités personnalisées (cookies publicitaires)</li>
              <li>Assurer le fonctionnement du site (cookies techniques essentiels)</li>
            </ul>
            <p className="text-gray-600 leading-relaxed">
              Vous pouvez gérer vos préférences de cookies à tout moment via le bandeau
              de consentement ou les paramètres de votre navigateur.
            </p>
          </section>

          {/* Section 7 - Responsabilité */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              7. Limitation de responsabilité
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Dropship Luxe s'efforce d'assurer au mieux de ses possibilités l'exactitude
              et la mise à jour des informations diffusées sur ce site. Toutefois, Dropship Luxe
              ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations
              mises à disposition sur ce site.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              En conséquence, Dropship Luxe décline toute responsabilité :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur le site</li>
              <li>Pour tous dommages résultant d'une intrusion frauduleuse d'un tiers</li>
              <li>Pour tous dommages, directs ou indirects, quelles qu'en soient les causes, origines, natures ou conséquences</li>
            </ul>
          </section>

          {/* Section 8 - Liens */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              8. Liens hypertextes
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Le site peut contenir des liens hypertextes vers d'autres sites. Dropship Luxe
              n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à
              leur contenu.
            </p>
            <p className="text-gray-600 leading-relaxed">
              La création de liens hypertextes vers le site Dropship Luxe est soumise à
              autorisation préalable et écrite.
            </p>
          </section>

          {/* Section 9 - Droit applicable */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              9. Droit applicable et juridiction
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Les présentes mentions légales sont régies par le droit français.
            </p>
            <p className="text-gray-600 leading-relaxed">
              En cas de litige, et après échec de toute tentative de recherche d'une solution
              amiable, les tribunaux français seront seuls compétents pour connaître de ce litige.
            </p>
          </section>

          {/* Section 10 - Médiation */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              10. Médiation de la consommation
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Conformément aux articles L611-1 et R612-1 et suivants du Code de la consommation,
              nous proposons aux consommateurs, dans le cadre de litiges, un dispositif de
              médiation. Pour accéder au médiateur, le consommateur doit adresser sa demande :
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600 leading-relaxed mb-2">
                <strong>Par courrier :</strong> [Adresse du médiateur à compléter]
              </p>
              <p className="text-gray-600 leading-relaxed">
                <strong>Par voie électronique :</strong> [Site du médiateur à compléter]
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed mt-4">
              Vous pouvez également recourir à la plateforme européenne de règlement en ligne
              des litiges (RLL) :{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:text-pink-700"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
          </section>

          {/* Section 11 - Contact */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              11. Contact
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Pour toute question relative aux présentes mentions légales, vous pouvez nous
              contacter :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>
                <strong>Par email :</strong>{' '}
                <a href="mailto:contact@dropship-luxe.com" className="text-pink-600 hover:text-pink-700">
                  contact@dropship-luxe.com
                </a>
              </li>
              <li>
                <strong>Par courrier :</strong> [Adresse à compléter]
              </li>
              <li>
                <strong>Via le formulaire de contact</strong> sur notre site
              </li>
            </ul>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
            <p>Dropship Luxe - Cosmétiques de Luxe</p>
            <p className="mt-1">© {new Date().getFullYear()} Tous droits réservés</p>
          </div>
        </article>
      </div>
    </main>
  );
}
