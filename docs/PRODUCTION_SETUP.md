# Guide de Configuration Production - Hayoss

Ce guide détaille les étapes pour configurer les services externes nécessaires au lancement en production.

---

## Table des matières

1. [AliExpress Open Platform](#1-aliexpress-open-platform)
2. [Meta (Facebook) Conversions API](#2-meta-facebook-conversions-api)
3. [Meta Domain Verification](#3-meta-domain-verification)
4. [Variables d'environnement complètes](#4-variables-denvironnement-complètes)

---

## 1. AliExpress Open Platform

### 1.1 Créer une Application DS Center

1. **Accéder au portail développeur**
   - URL: https://openservice.aliexpress.com/
   - Connectez-vous avec votre compte vendeur AliExpress

2. **Créer une nouvelle application**
   - Allez dans **"My Apps"** > **"Create App"**
   - Type d'application: **"Dropshipping Solution"**
   - Nom de l'application: `Hayoss Production`

3. **Obtenir les identifiants**
   Après validation, vous recevrez:
   - **App Key** (identifiant public)
   - **App Secret** (clé secrète - NE JAMAIS EXPOSER)

### 1.2 Configuration des variables `.env`

```bash
# ============================================================================
# ALIEXPRESS OPEN PLATFORM - Production
# ============================================================================

# App Key - Votre identifiant d'application
ALIEXPRESS_APP_KEY=123456789

# App Secret - Clé secrète (garder confidentiel!)
ALIEXPRESS_APP_SECRET=abcdef1234567890abcdef1234567890

# Tracking ID pour les commissions d'affiliation (optionnel)
ALIEXPRESS_TRACKING_ID=hayoss_affiliate

# URL de callback OAuth - DOIT correspondre à la config dans le portail
# Format: https://votre-domaine.com/api/aliexpress/callback
ALIEXPRESS_CALLBACK_URL=https://api.hayoss.com/api/aliexpress/callback
```

### 1.3 Configurer le Callback OAuth

Dans le portail AliExpress Open Platform:

1. Allez dans **"App Settings"** > **"Authorized callback URL"**
2. Ajoutez l'URL exacte: `https://api.hayoss.com/api/aliexpress/callback`

### 1.4 Obtenir l'Access Token

1. **Initier l'autorisation OAuth**
   ```
   GET https://api.hayoss.com/api/aliexpress/authorize
   ```

2. **Vous serez redirigé vers AliExpress pour autoriser l'accès**

3. **Après autorisation, le token sera automatiquement stocké** dans la base de données (table `aliexpress_credentials`)

4. **Vérifier le token**
   ```
   GET https://api.hayoss.com/api/admin/aliexpress/status
   Authorization: Bearer VOTRE_ADMIN_PASSWORD
   ```

### 1.5 Permissions Requises

Assurez-vous que votre application a les permissions suivantes:
- ✅ `aliexpress.logistics.buyer.freight.calculate`
- ✅ `aliexpress.ds.add.info`
- ✅ `aliexpress.ds.order.create`
- ✅ `aliexpress.ds.order.get`
- ✅ `aliexpress.logistics.ds.trackinginfo.query`
- ✅ `aliexpress.ds.product.get`
- ✅ `aliexpress.ds.feedname.get`

---

## 2. Meta (Facebook) Conversions API

### 2.1 Configurer le Pixel et CAPI

1. **Accéder à Events Manager**
   - URL: https://business.facebook.com/events_manager

2. **Créer ou sélectionner votre Pixel**
   - Data Sources > Web > Facebook Pixel

3. **Activer l'API Conversions**
   - Settings > Conversions API
   - Cliquez sur **"Generate Access Token"**

4. **Copier les identifiants**
   - **Pixel ID**: visible en haut de la page Events Manager
   - **Access Token**: généré à l'étape précédente

### 2.2 Configuration des variables `.env`

```bash
# ============================================================================
# META CONVERSIONS API (CAPI)
# ============================================================================

# Pixel ID - Trouvé dans Events Manager
META_PIXEL_ID=123456789012345

# Access Token CAPI - Généré dans Events Manager > Settings
META_CAPI_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Code de test (optionnel) - UNIQUEMENT pour les tests
# Supprimez cette ligne en production!
# META_TEST_EVENT_CODE=TEST12345
```

### 2.3 Tester l'intégration

1. **Activer le mode test** dans Events Manager
2. **Ajoutez temporairement** `META_TEST_EVENT_CODE=TESTXXXXX` dans `.env`
3. **Effectuez un achat test**
4. **Vérifiez dans Events Manager** que l'événement apparaît
5. **Supprimez** `META_TEST_EVENT_CODE` pour la production

### 2.4 Événements envoyés par Hayoss

| Événement | Déclencheur | Données |
|-----------|-------------|---------|
| `Purchase` | Paiement validé | Valeur, produits, client |
| `AddToCart` | Ajout au panier | Produit, quantité |
| `InitiateCheckout` | Début checkout | Panier complet |
| `ViewContent` | Vue produit | Détails produit |
| `Lead` | Inscription newsletter | Email hashé |

---

## 3. Meta Domain Verification

### 3.1 Pourquoi vérifier le domaine ?

- Requis pour utiliser l'API Conversions
- Améliore l'attribution des conversions
- Nécessaire pour la configuration des événements iOS 14+

### 3.2 Obtenir le code de vérification

1. **Accéder à Business Settings**
   - URL: https://business.facebook.com/settings/

2. **Brand Safety > Domains**
   - Cliquez sur **"Add"**
   - Entrez votre domaine: `hayoss.com`

3. **Choisir la méthode de vérification: DNS TXT Record**
   - Meta vous donnera un enregistrement comme:
   ```
   facebook-domain-verification=abcdef1234567890abcdef1234567890
   ```

### 3.3 Ajouter l'enregistrement DNS TXT

**Chez votre registrar DNS (OVH, Cloudflare, etc.):**

| Type | Nom/Host | Valeur |
|------|----------|--------|
| TXT | @ | `facebook-domain-verification=abcdef1234567890abcdef1234567890` |

**Exemple avec Cloudflare:**
1. Connectez-vous à Cloudflare
2. Sélectionnez votre domaine
3. Allez dans **DNS**
4. Cliquez sur **Add record**
5. Type: `TXT`
6. Name: `@`
7. Content: Le code de vérification Meta
8. TTL: Auto
9. Save

**Exemple avec OVH:**
1. Connectez-vous à OVH
2. Allez dans **Web Cloud** > **Domaines**
3. Sélectionnez votre domaine
4. Onglet **Zone DNS**
5. Cliquez sur **Ajouter une entrée**
6. Type: `TXT`
7. Sous-domaine: (laisser vide pour @)
8. Cible: Le code de vérification Meta
9. Valider

### 3.4 Vérifier la propagation DNS

```bash
# Vérifier que l'enregistrement est propagé
dig TXT hayoss.com +short

# Ou en ligne
# https://mxtoolbox.com/TXTLookup.aspx
```

### 3.5 Finaliser la vérification

1. Retournez dans **Business Settings > Domains**
2. Cliquez sur **"Verify"** à côté de votre domaine
3. ✅ Le statut devrait passer à "Verified"

> **Note:** La propagation DNS peut prendre jusqu'à 48h, mais généralement 15-30 minutes.

---

## 4. Variables d'environnement complètes

### Backend `.env`

```bash
# ============================================================================
# HAYOSS BACKEND - Production Configuration
# ============================================================================

# APPLICATION
NODE_ENV=production
PORT=5000
API_VERSION=v1

# DATABASE
DATABASE_URL=postgresql://user:password@host:5432/hayoss_prod?schema=public

# REDIS
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# ============================================================================
# ALIEXPRESS DS API
# ============================================================================
ALIEXPRESS_APP_KEY=votre_app_key_production
ALIEXPRESS_APP_SECRET=votre_app_secret_production
ALIEXPRESS_TRACKING_ID=hayoss_affiliate
ALIEXPRESS_CALLBACK_URL=https://api.hayoss.com/api/aliexpress/callback

# ============================================================================
# META CONVERSIONS API
# ============================================================================
META_PIXEL_ID=votre_pixel_id
META_CAPI_ACCESS_TOKEN=votre_access_token_capi
# Ne pas définir META_TEST_EVENT_CODE en production

# ============================================================================
# HYP (YAADPAY) PAYMENT
# ============================================================================
HYP_MASOF=votre_terminal_id
HYP_PASSP=votre_terminal_password
HYP_API_SIGNATURE_KEY=votre_cle_signature_hmac
HYP_SUCCESS_URL=https://hayoss.com/checkout/success
HYP_ERROR_URL=https://hayoss.com/checkout/error
HYP_NOTIFY_URL=https://api.hayoss.com/webhooks/hyp

# ============================================================================
# SECURITY
# ============================================================================
ENCRYPTION_KEY=clé_256_bits_hex_64_caracteres
JWT_SECRET=secret_jwt_32_caracteres_minimum
ADMIN_PASSWORD=mot_de_passe_admin_tres_securise

# ============================================================================
# OPENAI (Traductions IA)
# ============================================================================
OPENAI_API_KEY=sk-votre_cle_openai

# ============================================================================
# RESEND (Emails transactionnels)
# ============================================================================
RESEND_API_KEY=re_votre_cle_resend
RESEND_FROM_EMAIL=commandes@hayoss.com
RESEND_FROM_NAME=Hayoss

# ============================================================================
# CORS
# ============================================================================
CORS_ORIGIN=https://hayoss.com
```

### Frontend `.env.local`

```bash
# ============================================================================
# HAYOSS FRONTEND - Production Configuration
# ============================================================================

# API URLs
BACKEND_URL=https://api.hayoss.com
NEXT_PUBLIC_API_URL=https://api.hayoss.com/api/v1
NEXT_PUBLIC_SITE_URL=https://hayoss.com

# ============================================================================
# NEXTAUTH.JS
# ============================================================================
# Générez avec: openssl rand -base64 32
AUTH_SECRET=votre_secret_auth_super_securise

# URL de l'application (production)
NEXTAUTH_URL=https://hayoss.com

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
```

---

## Checklist de Lancement

- [ ] AliExpress App Key et Secret configurés
- [ ] AliExpress OAuth callback URL enregistré
- [ ] AliExpress Access Token obtenu et stocké
- [ ] Meta Pixel ID configuré
- [ ] Meta CAPI Access Token généré
- [ ] DNS TXT record pour Meta ajouté
- [ ] Domaine vérifié dans Meta Business Manager
- [ ] Variables d'environnement backend complètes
- [ ] Variables d'environnement frontend complètes
- [ ] Test d'achat effectué avec succès
- [ ] Événements visibles dans Meta Events Manager

---

## Support

Pour toute question technique:
- Documentation AliExpress: https://openservice.aliexpress.com/doc/
- Documentation Meta CAPI: https://developers.facebook.com/docs/marketing-api/conversions-api
- Support Hayoss: contact@hayoss.com
