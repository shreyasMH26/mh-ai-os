/**
 * OpenAI Provider Implementation
 *
 * Server-side only. Never import this in client components.
 * All calls go through /api/ai/* routes.
 */

import OpenAI from 'openai';
import type { AIProvider, GenerateParams, StreamParams, AnalyzeParams, AIResponse } from '../types';
import { AIError } from '../types';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIError({
      code: 'PROVIDER_NOT_CONFIGURED',
      message: 'OPENAI_API_KEY is not set',
      userMessage: 'OpenAI is not configured. Add your API key in Settings → AI Models.',
      provider: 'openai',
      retryable: false,
    });
  }
  return new OpenAI({ apiKey });
}

function mapOpenAIError(err: unknown): AIError {
  if (err instanceof AIError) return err;

  const error = err as { status?: number; code?: string; message?: string };
  const message = error.message ?? 'Unknown OpenAI error';
  const status = error.status;

  if (status === 401 || error.code === 'invalid_api_key') {
    return new AIError({
      code: 'INVALID_API_KEY',
      message,
      userMessage: 'Your OpenAI API key is invalid. Check Settings → AI Models.',
      provider: 'openai',
      retryable: false,
    });
  }
  if (status === 429) {
    // insufficient_quota = billing exhausted; waiting will NOT fix this
    if (error.code === 'insufficient_quota') {
      return new AIError({
        code: 'INSUFFICIENT_QUOTA',
        message,
        userMessage: 'Your OpenAI billing quota is exhausted. Add credits at platform.openai.com/settings/billing.',
        provider: 'openai',
        retryable: false,
      });
    }
    return new AIError({
      code: 'RATE_LIMIT',
      message,
      userMessage: 'OpenAI rate limit reached. Please wait a moment and try again.',
      provider: 'openai',
      retryable: true,
    });
  }
  if (status === 503 || status === 502) {
    return new AIError({
      code: 'PROVIDER_UNAVAILABLE',
      message,
      userMessage: 'OpenAI is temporarily unavailable. Please try again shortly.',
      provider: 'openai',
      retryable: true,
    });
  }
  if (error.code === 'context_length_exceeded') {
    return new AIError({
      code: 'CONTEXT_LIMIT_EXCEEDED',
      message,
      userMessage: 'Your message is too long for this model. Try shortening your prompt.',
      provider: 'openai',
      retryable: false,
    });
  }

  return new AIError({
    code: 'UNKNOWN',
    message,
    userMessage: 'Something went wrong with OpenAI. Please try again.',
    provider: 'openai',
    retryable: true,
  });
}

export const OpenAIProvider: AIProvider = {
  provider: 'openai',
  defaultModel: DEFAULT_MODEL,

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  },

  async generate(params: GenerateParams): Promise<AIResponse> {
    const client = createClient();
    const model = params.model ?? DEFAULT_MODEL;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push(
      ...params.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }))
    );

    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: params.temperature ?? DEFAULT_TEMPERATURE,
      });

      const choice = response.choices[0];
      return {
        content: choice.message.content ?? '',
        provider: 'openai',
        model: response.model,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        finishReason:
          choice.finish_reason === 'stop'
            ? 'stop'
            : choice.finish_reason === 'length'
              ? 'length'
              : undefined,
      };
    } catch (err) {
      throw mapOpenAIError(err);
    }
  },

  async stream(params: StreamParams): Promise<void> {
    const client = createClient();
    const model = params.model ?? DEFAULT_MODEL;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push(
      ...params.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }))
    );

    try {
      const stream = await client.chat.completions.create({
        model,
        messages,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: params.temperature ?? DEFAULT_TEMPERATURE,
        stream: true,
      });

      let fullText = '';

      for await (const chunk of stream) {
        if (params.signal?.aborted) {
          stream.controller.abort();
          break;
        }
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          fullText += delta;
          params.onChunk(delta);
        }
      }

      params.onComplete?.(fullText);
    } catch (err) {
      const aiError = mapOpenAIError(err);
      params.onError?.(aiError);
      throw aiError;
    }
  },

  async analyze(params: AnalyzeParams): Promise<string> {
    const result = await OpenAIProvider.generate({
      messages: [{ role: 'user', content: params.content }],
      systemPrompt: params.task,
      model: params.model ?? DEFAULT_MODEL,
    });
    return result.content;
  },
};
