// ============================================================================
// NEXTAUTH API ROUTE - /api/auth/*
// ============================================================================

import { handlers } from '@/lib/auth/auth';

export const { GET, POST } = handlers;
