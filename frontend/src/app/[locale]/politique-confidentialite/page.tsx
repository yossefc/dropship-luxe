// ============================================================================
// Politique de Confidentialité
// ============================================================================
// Page de conformité RGPD pour la protection des données personnelles
// ============================================================================

import { Metadata } from 'next';
import { Link } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | Hayoss',
  description: 'Découvrez comment Hayoss protège vos données personnelles conformément au RGPD.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b">
            Politique de Confidentialité
          </h1>

          <p className="text-sm text-gray-500 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          {/* Introduction */}
          <section className="mb-8">
            <p className="text-gray-600 leading-relaxed">
              Chez Hayoss, nous accordons une importance capitale à la protection de vos données personnelles.
              Cette politique de confidentialité vous informe sur la manière dont nous collectons, utilisons
              et protégeons vos informations conformément au Règlement Général sur la Protection des Données
              (RGPD) et à la loi Informatique et Libertés.
            </p>
          </section>

          {/* Article 1 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              1. Responsable du traitement
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Le responsable du traitement des données personnelles collectées sur ce site est Hayoss,
              dont le siège social est situé en France.
            </p>
            <p className="text-gray-600 leading-relaxed mt-2">
              Contact : <a href="mailto:privacy@hayoss.com" className="text-pink-600 hover:underline">privacy@hayoss.com</a>
            </p>
          </section>

          {/* Article 2 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              2. Données collectées
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Nous collectons les données suivantes :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Données d'identification :</strong> nom, prénom, adresse email</li>
              <li><strong>Données de livraison :</strong> adresse postale, numéro de téléphone</li>
              <li><strong>Données de transaction :</strong> historique de commandes, montants</li>
              <li><strong>Données de navigation :</strong> adresse IP, cookies, pages visitées</li>
              <li><strong>Données de communication :</strong> messages envoyés via le formulaire de contact</li>
            </ul>
          </section>

          {/* Article 3 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              3. Finalités du traitement
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Vos données sont utilisées pour :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Traiter et livrer vos commandes</li>
              <li>Gérer votre compte client</li>
              <li>Vous informer sur l'état de vos commandes</li>
              <li>Répondre à vos demandes de contact</li>
              <li>Améliorer notre site et nos services</li>
              <li>Vous envoyer notre newsletter (avec votre consentement)</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </section>

          {/* Article 4 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              4. Base légale du traitement
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Le traitement de vos données repose sur :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>L'exécution du contrat :</strong> pour traiter vos commandes</li>
              <li><strong>Votre consentement :</strong> pour l'envoi de communications marketing</li>
              <li><strong>Notre intérêt légitime :</strong> pour améliorer nos services</li>
              <li><strong>Obligations légales :</strong> pour conserver les factures</li>
            </ul>
          </section>

          {/* Article 5 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              5. Durée de conservation
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-600 mt-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Type de données</th>
                    <th className="px-4 py-3 text-left font-medium">Durée de conservation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3">Données de compte client</td>
                    <td className="px-4 py-3">3 ans après dernière activité</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Données de commande</td>
                    <td className="px-4 py-3">10 ans (obligation légale)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Données de prospection</td>
                    <td className="px-4 py-3">3 ans après dernier contact</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Cookies</td>
                    <td className="px-4 py-3">13 mois maximum</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Article 6 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              6. Destinataires des données
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Vos données peuvent être partagées avec :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Nos prestataires de paiement sécurisé</li>
              <li>Nos partenaires logistiques pour la livraison</li>
              <li>Nos prestataires d'hébergement et de maintenance</li>
              <li>Les autorités compétentes en cas d'obligation légale</li>
            </ul>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
              <p className="text-blue-700 text-sm">
                Nous ne vendons jamais vos données à des tiers. Tous nos prestataires sont soumis
                à des obligations contractuelles strictes de confidentialité.
              </p>
            </div>
          </section>

          {/* Article 7 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              7. Vos droits
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
              <li><strong>Droit à la limitation :</strong> restreindre le traitement de vos données</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
              <li><strong>Droit de retirer votre consentement :</strong> à tout moment pour le marketing</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:privacy@hayoss.com" className="text-pink-600 hover:underline">privacy@hayoss.com</a>
            </p>
          </section>

          {/* Article 8 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              8. Cookies
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Notre site utilise des cookies pour :
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Cookies essentiels :</strong> fonctionnement du site, panier d'achat</li>
              <li><strong>Cookies de performance :</strong> analyse du trafic et amélioration</li>
              <li><strong>Cookies de préférences :</strong> mémorisation de vos choix</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Vous pouvez gérer vos préférences de cookies à tout moment via les paramètres de votre navigateur.
            </p>
          </section>

          {/* Article 9 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              9. Sécurité des données
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger
              vos données contre tout accès non autorisé, modification, divulgation ou destruction.
              Cela inclut le chiffrement SSL/TLS, la sécurisation des serveurs et des contrôles d'accès stricts.
            </p>
          </section>

          {/* Article 10 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              10. Transferts internationaux
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Certaines de vos données peuvent être transférées vers des pays situés en dehors de l'Espace
              Économique Européen. Dans ce cas, nous veillons à ce que ces transferts soient encadrés par
              des garanties appropriées (clauses contractuelles types de la Commission européenne, etc.).
            </p>
          </section>

          {/* Article 11 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              11. Réclamation
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Si vous estimez que le traitement de vos données ne respecte pas la réglementation,
              vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de
              l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline">www.cnil.fr</a>
            </p>
          </section>

          {/* Article 12 */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              12. Modifications
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Cette politique de confidentialité peut être mise à jour à tout moment. Les modifications
              importantes vous seront notifiées par email ou via une notification sur notre site.
            </p>
          </section>

          {/* Contact */}
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Contact
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Pour toute question concernant cette politique de confidentialité ou vos données personnelles :
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Email :</strong>{' '}
                <a href="mailto:privacy@hayoss.com" className="text-pink-600 hover:underline">privacy@hayoss.com</a>
              </p>
              <p className="text-gray-700 mt-2">
                <Link href="/contact" className="text-pink-600 hover:underline">
                  Formulaire de contact →
                </Link>
              </p>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
