/**
 * Google Gemini Provider
 *
 * Server-side only. Never import this in client components.
 * All calls go through /api/ai/* routes.
 *
 * Uses GOOGLE_GENERATIVE_AI_API_KEY from environment (set in .env.local).
 */

import { GoogleGenAI } from '@google/genai';
import type { AIProvider, GenerateParams, StreamParams, AnalyzeParams, AIResponse } from '../types';
import { AIError } from '../types';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_MAX_TOKENS = 2048;

function createClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new AIError({
      code: 'PROVIDER_NOT_CONFIGURED',
      message: 'GOOGLE_GENERATIVE_AI_API_KEY is not set',
      userMessage: 'Google Gemini is not configured. Add your API key in Settings → AI Models.',
      provider: 'google',
      retryable: false,
    });
  }
  return new GoogleGenAI({ apiKey });
}

function mapGeminiError(err: unknown): AIError {
  if (err instanceof AIError) return err;

  const error = err as { status?: number; message?: string; code?: number };
  const message = error.message ?? 'Unknown Gemini error';
  const status = error.status ?? error.code;

  if (status === 401 || status === 403 || (message.includes('API_KEY') || message.includes('invalid'))) {
    return new AIError({
      code: 'INVALID_API_KEY',
      message,
      userMessage: 'Your Google API key is invalid. Check Settings → AI Models.',
      provider: 'google',
      retryable: false,
    });
  }
  if (status === 429 || message.includes('RESOURCE_EXHAUSTED')) {
    return new AIError({
      code: 'RATE_LIMIT',
      message,
      userMessage: 'Google Gemini rate limit reached. Please wait a moment and try again.',
      provider: 'google',
      retryable: true,
    });
  }
  if (status === 503 || status === 502) {
    return new AIError({
      code: 'PROVIDER_UNAVAILABLE',
      message,
      userMessage: 'Google Gemini is temporarily unavailable. Please try again shortly.',
      provider: 'google',
      retryable: true,
    });
  }

  return new AIError({
    code: 'UNKNOWN',
    message,
    userMessage: 'Something went wrong with Google Gemini. Please try again.',
    provider: 'google',
    retryable: true,
  });
}

export const GeminiProvider: AIProvider = {
  provider: 'google',
  defaultModel: DEFAULT_MODEL,

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
  },

  async generate(params: GenerateParams): Promise<AIResponse> {
    const client = createClient();
    const modelId = params.model ?? DEFAULT_MODEL;

    // Build contents array (Gemini format)
    const contents = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    try {
      const response = await client.models.generateContent({
        model: modelId,
        contents,
        config: {
          maxOutputTokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: params.temperature ?? 0.7,
          systemInstruction: params.systemPrompt ? { parts: [{ text: params.systemPrompt }] } : undefined,
        },
      });

      const text = response.text ?? '';
      return {
        content: text,
        provider: 'google',
        model: modelId,
      };
    } catch (err) {
      throw mapGeminiError(err);
    }
  },

  async stream(params: StreamParams): Promise<void> {
    const client = createClient();
    const modelId = params.model ?? DEFAULT_MODEL;

    const contents = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    try {
      let fullText = '';

      const streamResponse = await client.models.generateContentStream({
        model: modelId,
        contents,
        config: {
          maxOutputTokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: params.temperature ?? 0.7,
          systemInstruction: params.systemPrompt ? { parts: [{ text: params.systemPrompt }] } : undefined,
        },
      });

      for await (const chunk of streamResponse) {
        if (params.signal?.aborted) break;

        const delta = chunk.text ?? '';
        if (delta) {
          fullText += delta;
          params.onChunk(delta);
        }
      }

      params.onComplete?.(fullText);
    } catch (err) {
      const aiError = mapGeminiError(err);
      params.onError?.(aiError);
      throw aiError;
    }
  },

  async analyze(params: AnalyzeParams): Promise<string> {
    const result = await GeminiProvider.generate({
      messages: [{ role: 'user', content: params.content }],
      systemPrompt: params.task,
      model: params.model ?? DEFAULT_MODEL,
    });
    return result.content;
  },
};
