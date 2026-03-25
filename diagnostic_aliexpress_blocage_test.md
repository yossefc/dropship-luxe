# Diagnostic blocage AliExpress OAuth

Date: 2026-03-24

## Etat actuel

Ce qui est confirme:
- le backend local fonctionne sur `http://localhost:5000`
- `http://localhost:5000/health` repond correctement
- la route locale OAuth fonctionne:
  - `http://localhost:5000/api/aliexpress/authorize`
- ngrok est correctement connecte au backend:
  - domaine public: `https://unreciprocated-coffered-maren.ngrok-free.dev`
  - tunnel vers: `http://localhost:5000`
- la variable `.env` est correcte:
  - `ALIEXPRESS_CALLBACK_URL=https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/callback`

## Ce qui ne fonctionne pas encore

Le flux OAuth n'arrive pas jusqu'au callback.

Verification faite:
- des requetes arrivent bien sur `/api/aliexpress/authorize`
- aucune requete n'arrive sur `/api/aliexpress/callback`
- donc AliExpress casse le flux avant le retour vers le backend

Etat du backend:
- `/api/aliexpress/status` indique encore:
  - `configured: false`
  - `active: false`

Conclusion:
- aucun token n'a encore ete enregistre

## Erreurs observees

Erreur 1:
- `param-appkey.not.exists`

Erreur 2:
- `The request has failed due to a temporary failure of the server`

## Interpretation

Le probleme restant est tres probablement cote AliExpress Open Platform.

Le point le plus suspect est:
- `App Status = Test`

Inference probable:
- l'application AliExpress est encore en mode test
- l'autorisation seller n'est peut-etre pas disponible pour un compte standard
- ou bien l'app exige un compte test/whitelist/validation supplementaire

## Infos connues sur l'application

D'apres les informations fournies:
- App Category: `Drop Shipping`
- AppKey: `530400`
- App Secret: present
- App Status: `Test`
- Permission Group:
  - `System Tool` active
  - `AliExpress-dropship` active

## Ce qu'il faut verifier dans le portail AliExpress

1. Verifier si une application en statut `Test` peut autoriser un vrai compte vendeur/utilisateur
2. Verifier si le compte utilise pour se connecter est autorise pour les apps en mode test
3. Verifier s'il faut une whitelist ou un compte sandbox
4. Verifier si l'application doit etre soumise/publiee/approuvee avant OAuth complet
5. Verifier que le callback enregistre dans le portail est exactement:

```text
https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/callback
```

6. Verifier qu'il n'existe pas une configuration supplementaire pour `Drop Shipping` sur l'autorisation seller

## Resume court

Ce qui est OK:
- backend
- ngrok
- callback URL locale
- route authorize

Ce qui bloque encore:
- AliExpress refuse ou echoue pendant l'autorisation avant de revenir au callback

Cause la plus probable:
- limitations ou configuration incomplete de l'application AliExpress en statut `Test`
