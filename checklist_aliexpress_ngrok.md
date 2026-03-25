# Checklist AliExpress + ngrok

Date: 2026-03-24

## 1. Verifier les services locaux

Frontend:
- URL locale: `http://localhost:3000`

Backend API:
- URL locale: `http://localhost:5000`
- Test sante:
  - `http://localhost:5000/health`

## 2. Configurer ngrok sur le bon port

Important:
- ngrok doit pointer vers le backend API
- ne pas pointer ngrok vers `3000`
- utiliser le port `5000`

Commande:

```bash
ngrok http 5000
```

## 3. Verifier le callback dans `.env`

La bonne valeur est:

```env
ALIEXPRESS_CALLBACK_URL=https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/callback
```

Ne pas ecrire:

```env
ALIEXPRESS_CALLBACK_URL=https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/callback/localhost:5000
```

`localhost:5000` ne doit pas etre ajoute dans l'URL de callback.

## 4. Verifier que ngrok pointe bien sur le backend

Tester dans le navigateur:

- `https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/status`

Si tout va bien, tu dois obtenir une reponse JSON du backend.

## 5. Lancer l'autorisation AliExpress

Ouvrir cette URL:

- `https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/authorize`

Flux attendu:
1. Ouverture de la page AliExpress
2. Validation de l'autorisation
3. Redirection automatique vers:

```text
https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/callback?code=...
```

4. Echange automatique du code contre un token
5. Stockage securise du token en base

## 6. Verifier le resultat

Verifier ensuite:

- `https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/status`

Tu dois voir un etat indiquant que la configuration est active, ou au minimum que les credentials ont ete enregistres.

## 7. Si ca ne marche pas

Verifier dans cet ordre:
1. Le frontend tourne sur `3000`
2. Le backend tourne sur `5000`
3. ngrok est lance avec `ngrok http 5000`
4. `ALIEXPRESS_CALLBACK_URL` est exactement:
   `https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/callback`
5. L'URL ouverte pour demarrer OAuth est:
   `https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/authorize`

## Resume court

Ce qu'il faut faire:
1. Lancer ou verifier le backend sur `5000`
2. Lancer `ngrok http 5000`
3. Garder `ALIEXPRESS_CALLBACK_URL` sans `/localhost:5000`
4. Ouvrir `https://unreciprocated-coffered-maren.ngrok-free.dev/api/aliexpress/authorize`
