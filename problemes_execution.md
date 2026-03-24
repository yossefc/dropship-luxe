# Problemes rencontres lors de l'execution

Date: 2026-03-24

## 1. Installation des dependances frontend

Commande:

```powershell
cd frontend
npm install
```

Problemes constates:

- La premiere tentative a expire apres environ 124 secondes.
- `npm install` a ensuite reussi avec un delai plus long.
- `npm` a signale 7 vulnerabilites au total:
  - 6 vulnerabilites `high`
  - 1 vulnerabilite `critical`

Etat final:

- Installation terminee avec succes apres relance.

## 2. Migration Prisma

Commande:

```powershell
cd ..
npx prisma migrate dev --name add-i18n-translations
```

Problemes constates:

- Sous PowerShell, `npx` etait bloque par la policy d'execution des scripts:

```text
File C:\Program Files\nodejs\npx.ps1 cannot be loaded because running scripts is disabled on this system.
```

- Contournement utilise: execution via `cmd /c npx ...`.
- Dans le sandbox, Prisma a ensuite echoue avec une erreur `spawn EPERM` sur `schema-engine-windows.exe`.
- Une fois execute hors sandbox, Prisma a bien atteint PostgreSQL sur `localhost:5432`, mais la migration a echoue avec l'erreur:

```text
P1000: Authentication failed against database server at `localhost`
```

- Cause pratique: les identifiants de base de donnees fournis a Prisma via l'environnement actuel (`.env`) ne sont pas valides pour la base `dropship_luxe`.

Etat final:

- Migration non appliquee.

## 3. Generation du client Prisma

Commande:

```powershell
npx prisma generate
```

Problemes constates:

- Dans le sandbox, la commande a echoue avec `Error: spawn EPERM`.
- La commande a du etre relancee hors sandbox.

Etat final:

- Generation du client Prisma reussie.
- Le client a ete genere dans `node_modules/@prisma/client`.

## Resume des blocages principaux

- Timeout initial pendant `npm install`.
- Vulnerabilites detectees apres installation frontend.
- `npx` bloque par la policy PowerShell.
- Prisma ne peut pas executer ses binaires correctement dans le sandbox sans elevation.
- Echec d'authentification PostgreSQL (`P1000`) empechant l'application de la migration.
