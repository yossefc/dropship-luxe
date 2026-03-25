// ============================================================================
// Allergy Disclaimer Component
// ============================================================================
// Composant d'avertissement allergies pour les pages produits cosmétiques
// Conforme aux exigences légales françaises et européennes
// ============================================================================

'use client';

import { useState } from 'react';

interface AllergyDisclaimerProps {
  variant?: 'compact' | 'full';
  showPatchTestInfo?: boolean;
  className?: string;
}

export function AllergyDisclaimer({
  variant = 'compact',
  showPatchTestInfo = true,
  className = '',
}: AllergyDisclaimerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (variant === 'compact') {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium">
              Avertissement - Produit cosmétique
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Effectuez un test cutané avant la première utilisation.
              En cas de réaction, cessez l'utilisation et consultez un médecin.
            </p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-amber-600 hover:text-amber-800 mt-2 underline"
            >
              {isExpanded ? 'Voir moins' : 'En savoir plus'}
            </button>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-amber-200 text-sm text-amber-700 space-y-2">
                <p>
                  <strong>Comment faire un test cutané :</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Appliquez une petite quantité de produit sur l'intérieur du poignet ou derrière l'oreille</li>
                  <li>Attendez 24 à 48 heures</li>
                  <li>En l'absence de réaction (rougeur, démangeaison, irritation), vous pouvez utiliser le produit</li>
                </ol>
                <p className="mt-2">
                  <strong>Précautions :</strong> Évitez le contact avec les yeux.
                  Ne pas appliquer sur une peau lésée ou irritée.
                  Tenir hors de portée des enfants.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full variant - pour les pages produit détaillées
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 rounded-t-lg">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-amber-800">
            Informations importantes - Sécurité
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Product Nature */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Nature du produit</h4>
          <p className="text-gray-600 text-sm">
            Ce produit est un cosmétique et non un médicament. Il n'est pas destiné
            à diagnostiquer, traiter, guérir ou prévenir une maladie. Pour toute
            question médicale, consultez un professionnel de santé.
          </p>
        </div>

        {/* Patch Test */}
        {showPatchTestInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Test cutané recommandé
            </h4>
            <p className="text-blue-800 text-sm mb-3">
              Avant la première utilisation, nous vous recommandons d'effectuer un test cutané :
            </p>
            <ol className="list-decimal list-inside text-blue-700 text-sm space-y-1">
              <li>Appliquez une petite quantité sur l'intérieur du poignet</li>
              <li>Attendez 24 à 48 heures</li>
              <li>En cas de réaction (rougeur, démangeaison), n'utilisez pas le produit</li>
            </ol>
          </div>
        )}

        {/* Precautions */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Précautions d'emploi</h4>
          <ul className="text-gray-600 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Éviter tout contact avec les yeux. En cas de contact, rincer abondamment à l'eau claire.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Ne pas appliquer sur une peau lésée, irritée ou présentant des lésions cutanées.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>En cas de réaction allergique (rougeur, gonflement, démangeaison), cesser immédiatement l'utilisation.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Tenir hors de portée des enfants.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              <span>Conserver à l'abri de la lumière et de la chaleur.</span>
            </li>
          </ul>
        </div>

        {/* Allergies */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Allergies et intolérances
          </h4>
          <p className="text-red-800 text-sm">
            Si vous avez des allergies connues ou une peau sensible, veuillez consulter
            attentivement la liste des ingrédients (INCI) avant utilisation. En cas de doute,
            consultez un dermatologue ou un allergologue.
          </p>
        </div>

        {/* Regulation */}
        <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
          <p>
            Ce produit est conforme au Règlement (CE) n°1223/2009 du Parlement européen
            et du Conseil relatif aux produits cosmétiques.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Inline Version (for product cards)
// ============================================================================

export function AllergyBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full ${className}`}
      title="Effectuez un test cutané avant utilisation"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>Test cutané recommandé</span>
    </div>
  );
}

// ============================================================================
// Export default
// ============================================================================

export default AllergyDisclaimer;
