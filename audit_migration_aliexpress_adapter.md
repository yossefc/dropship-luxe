# Audit migration AliExpress adapter

Date: 2026-03-24

## Situation actuelle

Ce qui fonctionne:
- OAuth AliExpress
- echange du code contre token
- stockage chiffre du token en base
- lecture du token via `/api/aliexpress/status`

Etat verifie:
- `configured: true`
- `active: true`
- `expired: false`

## Ce qui a ete branche

Le code a ete adapte pour que `AliExpressAdapter` puisse recuperer le token OAuth stocke en base au lieu de dependre uniquement de `ALIEXPRESS_ACCESS_TOKEN`.

Fichiers touches:
- `src/infrastructure/adapters/outbound/external-apis/aliexpress.adapter.ts`
- `src/index.ts`
- `src/infrastructure/http/controllers/aliexpress-oauth.controller.ts`

## Test ajoute

Endpoint de test non destructif:

```text
GET /api/aliexpress/test?keyword=beauty
```

But:
- verifier qu'un appel AliExpress reel passe depuis le backend

## Resultat du test reel

Le test sort bien vers AliExpress, mais l'appel echoue avec:

```text
AliExpress: 29: Invalid app Key
```

Avant cela, d'autres essais ont montre:
- `IncompleteSignature`

## Conclusion technique

Le blocage restant n'est plus l'OAuth.

Le blocage est l'ancien protocole/API metier utilise par `aliexpress.adapter.ts`.

En pratique, cet adapter utilise encore une logique heritee basee sur des anciennes methodes comme:
- `aliexpress.affiliate.product.query`
- `aliexpress.trade.buy.placeorder`
- `aliexpress.trade.order.get`
- `aliexpress.logistics.tracking.query`

Or, la doc AliExpress Open Platform actuelle indique un modele REST officiel distinct pour les APIs oversea:
- endpoint REST oversea:
  `https://api-sg.aliexpress.com/rest`
- OAuth vendeur:
  `https://api-sg.aliexpress.com/oauth/authorize`

La doc montre aussi que:
- certaines APIs historiques sont obsoletes
- certaines APIs TOP/affiliate ne correspondent plus au mode d'autorisation actuel de ton application

## Diagnostic

Inference forte:
- l'application OAuth actuelle est valide
- mais l'adapter metier historique n'est pas aligne avec la famille d'APIs autorisee pour cette app

En clair:
- token vendeur valide: oui
- couche API metier historique compatible: non

## Direction correcte

Il faut migrer progressivement `AliExpressAdapter` vers les endpoints REST officiels compatibles avec l'application OAuth actuelle, au lieu de continuer a corriger l'ancienne couche `affiliate.*` / `trade.*`.

## Strategie recommandee

1. Identifier les operations vraiment necessaires a court terme
   - profil marchand
   - liste/lecture produits
   - details commande
   - suivi logistique

2. Associer chacune a une API officielle actuelle dans la doc AliExpress Open Platform

3. Remplacer les anciennes methodes une par une
   - d'abord un endpoint de lecture simple
   - ensuite les lectures commande/logistique
   - enfin seulement les actions d'ecriture sensibles

4. Garder le token OAuth stocke en base comme source unique d'authentification

## References officielles consultees

- API calling process:
  https://developer.alibaba.com/docs/doc.htm?articleId=120688&docType=1&treeId=727

- OAuth seller authorization:
  https://developer.alibaba.com/docs/doc.htm?articleId=120687&docType=1&treeId=727

- API endpoint URLs:
  https://developer.alibaba.com/docs/doc.htm?articleId=120689&docType=1&treeId=727

- HTTP request sample:
  https://developer.alibaba.com/docs/doc.htm?articleId=120693&docType=1&treeId=727

- Example of current oversea merchant API:
  https://developer.alibaba.com/docs/api.htm?apiId=46616

## Resume court

Etat final de l'audit:
- OAuth: OK
- token stocke: OK
- recuperation du token en base: OK
- adapter metier historique: incompatible avec l'app/API actuelle

Prochaine vraie etape:
- migrer l'adapter vers les endpoints REST officiels AliExpress Open Platform
