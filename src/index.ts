// ============================================================================
// Dropship Luxe API - Entry Point
// ============================================================================
// Point d'entrée unique de l'application.
// Toute la logique d'initialisation est dans bootstrap.ts
// ============================================================================

import { bootstrap } from './infrastructure/bootstrap.js';

bootstrap().catch((error) => {
  console.error('========================================');
  console.error('FATAL: Failed to start application');
  console.error('========================================');
  console.error(error);
  process.exit(1);
});
