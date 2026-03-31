<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->

# Hayoss Frontend - Guide

## Structure Categories (Menu Navigation)

Le menu principal dans `src/components/navigation/navigation-data.ts` :
```
Nouveautes → /new-arrivals
Best Sellers → /collections?sort=best-sellers
Soins → /collections/soins
  ├── Hydratants & Serums
  ├── Soins des Yeux
  ├── Solaires & Autobronzants
  ├── Demaquillants
  ├── Masques pour le Visage
  └── Soins des Mains et du Corps
Maquillage → /collections/maquillage
  ├── Visage
  ├── Yeux
  └── Levres
Parfums → /collections/parfums
```

## Pages principales

| Route | Fichier | Description |
|-------|---------|-------------|
| `/` | `app/[locale]/page.tsx` | Homepage avec produits par categorie (tabs Soins/Maquillage/Parfums) |
| `/collections` | `app/[locale]/collections/page.tsx` | Cartes de categories, pas "Tous les produits" |
| `/collections/soins` | `app/[locale]/collections/[category]/page.tsx` | Produits soins avec sous-categories |
| `/products/[slug]` | `app/[locale]/products/[slug]/page.tsx` | Detail produit avec accordeons (description, ingredients, mode emploi) |

## Regles STRICTES

### Produits
- **UNIQUEMENT femmes** — pas de produits hommes (beard, men, grooming)
- **ZERO trace AliExpress** visible : pas de nom AliExpress, pas d'URL, pas de noms de stores
- **Brand = marque du produit** (BIOAQUA, KAYALI, LAIKOU...), PAS "Hayoss"
- **Nom = Marque + Nom du produit** en francais (ex: "BIOAQUA Serum Vitamine C")
- **Pas de "Tous"** dans les collections — afficher des cartes de categories a choisir

### Images
- **TOUJOURS Imagen AI** (gemini-2.5-flash-image) — jamais d'image AliExpress directe
- Prompt: produit SEUL sur fond luxe, PAS de mannequins, PAS de texte
- Images sauvees dans `/frontend/public/products/{aliexpressId}-luxe.png`
- Next.js remote patterns: `**.aliexpress-media.com`, `**.alicdn.com`

### Details produit
- Description courte: Gemini genere en francais luxe
- Ingredients: bruts de la DS API AliExpress (PAS de reecriture Gemini)
- Mode d'emploi: brut de la DS API (PAS de reecriture)
- Specifications: brutes de la DS API
- Bienfaits: Gemini genere 3-4 points

### Variantes
- Source prioritaire: DS API (couleurs, tailles, volumes reels avec prix/stock)
- Fallback: Gemini detecte depuis le titre ("19 colors", "1/2/3pcs")
- Affichees dans la page produit comme options selectionnables

### Categories
- Categories dynamiques depuis la DB (pas hardcodees)
- Sous-categories dans la barre sticky quand une categorie est selectionnee
- Chaque produit doit etre dans une sous-categorie precise

## API Backend

- `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1` (dev)
- `GET /products` — liste tous les produits avec category.parent
- `GET /products/:slug` — detail produit avec variantes, description, ingredients
- Les categories viennent de l'API, pas de `catalog-structure.ts`

## Env Variables (frontend/.env.local)
```
BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3001
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:elish26@localhost:5432/dropship_luxe
```
