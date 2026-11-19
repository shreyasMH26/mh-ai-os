/**
 * Anthropic Claude Provider
 *
 * Server-side only. Never import this in client components.
 * All calls go through /api/ai/* routes.
 *
 * Uses ANTHROPIC_API_KEY from environment (set in .env.local).
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, GenerateParams, StreamParams, AnalyzeParams, AIResponse } from '../types';
import { AIError } from '../types';

const DEFAULT_MODEL = 'claude-opus-4-5';
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIError({
      code: 'PROVIDER_NOT_CONFIGURED',
      message: 'ANTHROPIC_API_KEY is not set',
      userMessage: 'Anthropic is not configured. Add your API key in Settings → AI Models.',
      provider: 'anthropic',
      retryable: false,
    });
  }
  return new Anthropic({ apiKey });
}

function mapAnthropicError(err: unknown): AIError {
  if (err instanceof AIError) return err;

  const error = err as { status?: number; error?: { type?: string; message?: string }; message?: string };
  const message = error.error?.message ?? error.message ?? 'Unknown Anthropic error';
  const status = error.status;
  const errorType = error.error?.type;

  if (status === 401 || errorType === 'authentication_error') {
    return new AIError({
      code: 'INVALID_API_KEY',
      message,
      userMessage: 'Your Anthropic API key is invalid. Check Settings → AI Models.',
      provider: 'anthropic',
      retryable: false,
    });
  }
  if (status === 429 || errorType === 'rate_limit_error') {
    return new AIError({
      code: 'RATE_LIMIT',
      message,
      userMessage: 'Anthropic rate limit reached. Please wait a moment and try again.',
      provider: 'anthropic',
      retryable: true,
    });
  }
  if (status === 503 || status === 529) {
    return new AIError({
      code: 'PROVIDER_UNAVAILABLE',
      message,
      userMessage: 'Anthropic is temporarily unavailable. Please try again shortly.',
      provider: 'anthropic',
      retryable: true,
    });
  }
  if (errorType === 'invalid_request_error' && message.toLowerCase().includes('context')) {
    return new AIError({
      code: 'CONTEXT_LIMIT_EXCEEDED',
      message,
      userMessage: 'Your message is too long for this model. Try shortening your prompt.',
      provider: 'anthropic',
      retryable: false,
    });
  }
  // Credit balance exhausted — status 400 with "credit" in message
  if (
    (status === 400 || errorType === 'invalid_request_error') &&
    message.toLowerCase().includes('credit')
  ) {
    return new AIError({
      code: 'INSUFFICIENT_QUOTA',
      message,
      userMessage: 'Your Anthropic credit balance is too low. Add credits at console.anthropic.com/settings/plans.',
      provider: 'anthropic',
      retryable: false,
    });
  }

  return new AIError({
    code: 'UNKNOWN',
    message,
    userMessage: 'Something went wrong with Anthropic. Please try again.',
    provider: 'anthropic',
    retryable: true,
  });
}

export const AnthropicProvider: AIProvider = {
  provider: 'anthropic',
  defaultModel: DEFAULT_MODEL,

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  },

  async generate(params: GenerateParams): Promise<AIResponse> {
    const client = createClient();
    const model = params.model ?? DEFAULT_MODEL;

    // Anthropic uses a separate `system` parameter, not a message
    const messages: Anthropic.MessageParam[] = params.messages
      .filter((m) => m.role !== 'system') // exclude system messages from conversation
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      const response = await client.messages.create({
        model,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: params.systemPrompt ?? undefined,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return {
        content: textBlock?.type === 'text' ? textBlock.text : '',
        provider: 'anthropic',
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : undefined,
      };
    } catch (err) {
      throw mapAnthropicError(err);
    }
  },

  async stream(params: StreamParams): Promise<void> {
    const client = createClient();
    const model = params.model ?? DEFAULT_MODEL;

    const messages: Anthropic.MessageParam[] = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      let fullText = '';

      const stream = await client.messages.stream({
        model,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: params.systemPrompt ?? undefined,
        messages,
      });

      for await (const event of stream) {
        if (params.signal?.aborted) {
          stream.abort();
          break;
        }

        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          const delta = event.delta.text;
          if (delta) {
            fullText += delta;
            params.onChunk(delta);
          }
        }
      }

      params.onComplete?.(fullText);
    } catch (err) {
      const aiError = mapAnthropicError(err);
      params.onError?.(aiError);
      throw aiError;
    }
  },

  async analyze(params: AnalyzeParams): Promise<string> {
    const result = await AnthropicProvider.generate({
      messages: [{ role: 'user', content: params.content }],
      systemPrompt: params.task,
      model: params.model ?? DEFAULT_MODEL,
    });
    return result.content;
  },
};
