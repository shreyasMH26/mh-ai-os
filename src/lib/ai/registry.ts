/**
 * AI Service Registry
 *
 * Central registry that maps providers to their implementations.
 * Application code uses getProvider() — never imports providers directly.
 *
 * Server-side only.
 */

import type { AIProvider, ProviderConfigStatus } from './types';
import { AIError } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import type { ModelProvider } from '@/lib/types/model';

// ─── Provider Registry ───────────────────────────────────────────────────────

const PROVIDERS: Record<ModelProvider, AIProvider> = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  google: GeminiProvider,
  openrouter: AnthropicProvider, // placeholder — Phase 8+
};

// ─── Service API ─────────────────────────────────────────────────────────────

export function getProvider(provider: ModelProvider): AIProvider {
  const impl = PROVIDERS[provider];
  if (!impl) {
    throw new AIError({
      code: 'PROVIDER_UNAVAILABLE',
      message: `No provider implementation for: ${provider}`,
      userMessage: `Provider "${provider}" is not supported yet.`,
      retryable: false,
    });
  }
  return impl;
}

/** Returns the default/first available configured provider.
 *
 * Priority order (first configured wins):
 *   1. Google  — primary for development (GOOGLE_GENERATIVE_AI_API_KEY)
 *   2. Anthropic — secondary
 *   3. OpenAI  — fallback
 *
 * To change the default, reorder this array.
 * Provider implementations and keys are unchanged.
 */
export function getDefaultProvider(): AIProvider {
  const ordered: ModelProvider[] = ['google', 'anthropic', 'openai'];
  for (const p of ordered) {
    const provider = PROVIDERS[p];
    if (provider?.isConfigured()) return provider;
  }
  throw new AIError({
    code: 'PROVIDER_NOT_CONFIGURED',
    message: 'No AI provider is configured',
    userMessage:
      'No AI provider is configured. Add an API key in Settings → AI Models to get started. Supported: OpenAI, Anthropic Claude, Google Gemini.',
    retryable: false,
  });
}

/** Returns configuration status for all known providers */
export function getAllProviderStatuses(): ProviderConfigStatus[] {
  return [
    {
      provider: 'openai',
      name: 'OpenAI',
      configured: OpenAIProvider.isConfigured(),
      defaultModel: OpenAIProvider.defaultModel,
    },
    {
      provider: 'anthropic',
      name: 'Anthropic',
      configured: AnthropicProvider.isConfigured(),
      defaultModel: AnthropicProvider.defaultModel,
    },
    {
      provider: 'google',
      name: 'Google',
      configured: GeminiProvider.isConfigured(),
      defaultModel: GeminiProvider.defaultModel,
    },
  ];
}

export type { AIProvider, ProviderConfigStatus };
export { AIError };
