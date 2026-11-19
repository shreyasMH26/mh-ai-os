/**
 * GET /api/ai/status
 *
 * Returns the configuration status of all AI providers.
 * Does NOT expose API keys — only reports configured/not-configured.
 * Safe to call from the client.
 */

import { getAllProviderStatuses } from '@/lib/ai/registry';

export async function GET() {
  const statuses = getAllProviderStatuses();

  return Response.json({
    providers: statuses,
    anyConfigured: statuses.some((s) => s.configured),
  });
}
