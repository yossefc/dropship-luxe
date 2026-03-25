# Analyse des erreurs du code

Date: 2026-03-24

Cette analyse est une revue statique et de compilation. Aucun fichier applicatif n'a ete modifie.

## Findings

### 1. Le flux webhook Stripe est cable pour planter au runtime

- Dans `src/index.ts`, la creation du router webhook injecte `orderRepository: null as never`.
- Ensuite, le handler webhook appelle `deps.orderRepository.findById(...)` et d'autres methodes sur ce repository.
- Consequence: meme si l'application demarre, le premier webhook utile peut provoquer une erreur runtime.

References:

- `src/index.ts:54`
- `src/index.ts:56`
- `src/index.ts:146`
- `src/index.ts:148`
- `src/infrastructure/adapters/inbound/webhooks/stripe.webhook.ts:117`

### 2. Le backend ne compile pas a cause d'un contrat de logging casse

- `src/infrastructure/config/logger.ts` exporte `createLogger` et des types/classes, mais pas de singleton `logger`.
- Plusieurs fichiers importent pourtant `logger` depuis `@infrastructure/config/logger.js`.
- D'autres fichiers importent un module inexistant `@shared/utils/logger.js`.
- Le dossier `src/shared/utils` ne contient aucun fichier `logger.ts`.

References:

- `src/infrastructure/config/logger.ts:118`
- `src/application/use-cases/import-product-with-translations.use-case.ts:12`
- `src/application/use-cases/sync-product-translations.use-case.ts:13`
- `src/infrastructure/adapters/outbound/repositories/product-translation.repository.ts:8`
- `src/infrastructure/adapters/outbound/payment/stripe.adapter.ts:15`
- `src/infrastructure/http/controllers/stripe-webhook.controller.ts:17`
- `src/infrastructure/jobs/tracking-sync.job.ts:14`
- `src/infrastructure/workers/order-fulfillment.worker.ts:17`
- `src/shared/utils/index.ts:1`

### 3. Le client Prisma genere est desynchronise du schema actuel

- Le schema `prisma/schema.prisma` declare bien `WebhookEvent`, `SupplierOrder` et `SupplierOrderStatus`.
- Pourtant, le code TypeScript ne voit pas `prisma.webhookEvent`, `prisma.supplierOrder` ni `SupplierOrderStatus` depuis `@prisma/client`.
- Le schema est valide, mais le client genere dans `node_modules/.prisma/client` ne reflete pas le schema courant.
- C'est un probleme de generation ou de desalignement du client Prisma, pas juste une erreur d'import.

References:

- `prisma/schema.prisma:429`
- `prisma/schema.prisma:457`
- `prisma/schema.prisma:506`
- `src/infrastructure/http/controllers/stripe-webhook.controller.ts:146`
- `src/infrastructure/jobs/tracking-sync.job.ts:120`
- `src/infrastructure/workers/order-fulfillment.worker.ts:149`

### 4. Les contrats entre ports, adapters et use cases ont derive

- Le port AliExpress attend une methode `searchProducts` avec `{ keywords, categoryId, ... }` et un retour pagine.
- L'implementation actuelle lit des champs differents (`query`, `category`, `limit`) et retourne `SupplierProduct[]`.
- Le port AI `LuxuryTranslationParams` attend `originalName`, `originalDescription`, `category`, `targetLocales`, etc.
- Le use case de sync produit envoie au contraire `sourceText`, `sourceDescription`, `targetLocale`, `productCategory`, `attributes`.
- Le meme use case lit ensuite des proprietes absentes du type retourne (`name`, `description`, `benefits`, `seoTitle`, `seoDescription`, `seoKeywords`).

References:

- `src/domain/ports/outbound/aliexpress.port.ts:97`
- `src/infrastructure/adapters/outbound/external-apis/aliexpress.adapter.ts:139`
- `src/domain/ports/outbound/ai-content.port.ts:31`
- `src/application/use-cases/sync-aliexpress-products.use-case.ts:292`
- `src/application/use-cases/sync-aliexpress-products.use-case.ts:301`
- `src/application/use-cases/sync-aliexpress-products.use-case.ts:315`

### 5. Le repository Prisma demande des champs qui n'existent pas dans le schema

- Le modele `Product` du schema n'a pas de champ `sellingCurrency`; il n'a que `currency`.
- Le repository de traductions selectionne pourtant `sellingCurrency`.
- Il suppose ensuite une structure `result.product` pleinement disponible, ce qui casse la lecture des produits localises.

References:

- `prisma/schema.prisma:62`
- `src/infrastructure/adapters/outbound/repositories/product-translation.repository.ts:143`
- `src/infrastructure/adapters/outbound/repositories/product-translation.repository.ts:155`

### 6. `exactOptionalPropertyTypes` est active, mais le code ne respecte pas cette contrainte

- Le projet active `exactOptionalPropertyTypes` dans `tsconfig.json`.
- Une partie importante du code passe explicitement `undefined` au lieu d'omettre les proprietes optionnelles.
- Cela provoque de nombreuses erreurs TypeScript dans les use cases, l'adapter Stripe et les workers.

References:

- `tsconfig.json:17`
- `src/application/use-cases/sync-product-translations.use-case.ts:62`
- `src/infrastructure/adapters/outbound/payment/stripe.adapter.ts:160`
- `src/infrastructure/workers/order-fulfillment.worker.ts:366`

### 7. Le frontend a au moins une vraie erreur TypeScript independante de l'environnement

- Le layout racine frontend retourne directement `children`.
- La signature annonce `JSX.Element`, mais `children` peut etre `undefined`.
- `npx tsc --noEmit` echoue precisement sur ce point.

References:

- `frontend/src/app/layout.tsx:4`
- `frontend/src/app/layout.tsx:9`

### 8. Une partie des chaines frontend est corrompue en source

- Plusieurs textes i18n et contenus UI contiennent du mojibake.
- Cela touche les noms de langues, drapeaux, symboles monetaires et certains textes marketing.
- Ce n'est pas seulement cosmetique: ces chaines peuvent s'afficher incorrectement en production.

References:

- `frontend/src/i18n/config.ts:13`
- `frontend/src/i18n/config.ts:21`
- `frontend/src/i18n/config.ts:37`
- `frontend/src/app/[locale]/page.tsx:18`
- `frontend/src/app/[locale]/page.tsx:242`

## Verifications effectuees

### Build backend

Commande:

```powershell
cmd /c npm run build
```

Resultat:

- Echec avec de nombreuses erreurs TypeScript structurelles.

### Verification TypeScript frontend

Commande:

```powershell
cd frontend
cmd /c npx tsc --noEmit
```

Resultat:

- Echec sur `src/app/layout.tsx` a cause du type de retour du layout racine.

### Build Next.js frontend

Commande:

```powershell
cd frontend
cmd /c npm run build
```

Resultat:

- Echec avant la compilation applicative a cause d'un binaire SWC invalide sur cette machine.
- Ce point ressemble a un probleme d'environnement local, distinct des erreurs de code listees plus haut.

## Resume

Les problemes principaux confirmes sont:

- un bootstrap backend incomplet et dangereux au runtime
- un systeme de logging incoherent
- un client Prisma desynchronise du schema courant
- des contrats de types incompatibles entre ports, adapters et use cases
- des erreurs Prisma/repository
- un non-respect systematique de `exactOptionalPropertyTypes`
- au moins une erreur TypeScript frontend reelle
- des chaines frontend corrompues en source
