# Dropship Luxe (Hayoss) - Guide Complet

## Regles Importantes

### Produits
- **UNIQUEMENT des cosmetiques** : maquillage, soins peau, yeux, corps, parfums
- **ZERO trace AliExpress** visible pour le client : pas de nom, pas d'URL, supplierName = "Hayoss"
- Filtrer les produits non-cosmetiques avant import
- Prix = (cout AliExpress + livraison) x 2.5 minimum (marge 35%+)

### Pipeline d'Import Automatique (UN SEUL FLUX)
Le script `scripts/import-real-products.ts` fait TOUT en un seul passage pour chaque produit :

```
1. Recherche AliExpress (Affiliate API 530878 - recherche + hot products)
   ↓
2. Dedoublonnage: si existe deja → verifier prix, mettre a jour si moins cher (URL seulement)
   ↓
3. Filtre: rejeter produits hommes, non-cosmetiques
   ↓
4. Categorisation: AliExpress category → mapper vers nos sous-categories, sinon Gemini decide
   ↓
5. Image: TOUJOURS generer avec Imagen AI (gemini-2.5-flash-image) — produit seul sur fond luxe
   ↓
6. DS API (530400 - OAuth): details complets, variantes, stock reel, description, specifications
   ↓
7. Nom FR: Gemini genere nom luxe = produit + marque + categorie
   ↓
8. Description: Gemini genere description courte. Details produit (specs, ingredients) = bruts de DS API
   ↓
9. Variantes: DS API (couleurs, tailles, volumes) avec prix et stock reels. Fallback: Gemini detection
   ↓
10. Sauvegarde DB: sous-categorie + image locale + nom FR + description + variantes + stock reel
```

### 2 APIs AliExpress utilisees ensemble
| API | AppKey | Usage |
|-----|--------|-------|
| **Affiliate** | 530878 | Recherche produits, best-sellers, hot products |
| **DS (Dropshipping)** | 530400 | Details complets, variantes, stock, descriptions, commandes |

### Categories et Sous-categories
```
Soins (parent)
├── Hydratants & Serums
├── Soins des Yeux
├── Solaires & Autobronzants
├── Demaquillants
├── Masques pour le Visage
└── Soins des Mains et du Corps

Maquillage (parent)
├── Visage (fond de teint, poudre, concealer)
├── Yeux (mascara, eyeshadow, eyeliner)
└── Levres (lipstick, gloss, liner)

Parfums (parent, pas de sous-categories)
```

## Commandes Import

### Import standard (toutes categories)
```bash
npx tsx scripts/import-real-products.ts
```

### Import par mot-cle specifique
```bash
npx tsx scripts/import-real-products.ts --keywords "vitamin c serum face"
npx tsx scripts/import-real-products.ts --keywords "lipstick matte long lasting"
npx tsx scripts/import-real-products.ts --keywords "perfume women luxury"
```

### Import Hot Products (produits tendance)
```bash
npx tsx scripts/import-real-products.ts --hot
```

### Import par categorie
```bash
npx tsx scripts/import-real-products.ts --category soins
npx tsx scripts/import-real-products.ts --category maquillage
npx tsx scripts/import-real-products.ts --category parfums
```

## AliExpress APIs

### Credentials (App 530878)
- **AppKey**: 530878
- **Gateway**: https://api-sg.aliexpress.com/sync
- **Signature**: HMAC-MD5

### Methodes disponibles
| Methode | Description | Usage |
|---------|-------------|-------|
| `aliexpress.affiliate.product.query` | Recherche par mots-cles | Import principal |
| `aliexpress.affiliate.productdetail.get` | Details d'un produit | Enrichissement |
| `aliexpress.affiliate.hotproduct.query` | Produits tendance (Advanced API) | Import `--hot` |
| `aliexpress.affiliate.product.smartmatch` | Recommandations IA (Advanced API) | Futur: produits similaires |
| `aliexpress.affiliate.category.get` | Liste categories | Mapping categories |

### IDs Categories AliExpress
| ID | Categorie |
|----|-----------|
| **66** | Beauty & Health (parent) |
| **3306** | Skin Care |
| **660103** | Makeup |
| **200001147** | Nails |
| **100000616** | Perfume |
| **200001168** | Hair |
| **200001355** | Eyes |

## AI Pipeline

### Gemini Vision (gemini-2.5-flash)
- Analyse les images AliExpress, score 0-100
- Score >= 60: image propre utilisable
- Score < 60: necessite generation Imagen

### Imagen (gemini-2.5-flash-image)
- Genere images luxueuses sur fonds adaptes par categorie
- Fonds: marble, silk, wood, ceramic selon la categorie
- SDK: `@google/genai` avec `responseModalities: ['IMAGE', 'TEXT']`

### Gemini Content (gemini-2.5-flash)
- Genere noms FR luxe (produit + marque + categorie)
- Genere descriptions detaillees (bienfaits, ingredients, utilisation)
- Pour parfums: garde le nom/marque originale

## Base de Donnees
- **PostgreSQL**: postgres:elish26@localhost:5432/dropship_luxe
- **Redis**: D:\redis\redis-server.exe (port 6379)

## Demarrage

### Backend
```bash
cd D:\dropship-luxe && npm run dev
```

### Frontend
```bash
cd D:\dropship-luxe\frontend && npm run dev
```

### Redis
```bash
D:\redis\redis-server.exe --port 6379
```

## Stack Technique
- **Backend**: Express + Prisma + PostgreSQL + BullMQ/Redis
- **Frontend**: Next.js 14 + React 18 + Tailwind + Zustand
- **AI**: Gemini 2.5 Flash (vision + content) + Gemini 2.5 Flash Image (generation)
- **Paiement**: Hyp/YaadPay
- **i18n**: next-intl (FR, EN, ES, IT, DE)
