/**
 * AI Provider Abstraction Layer
 *
 * The entire application communicates with AIService — never directly
 * with OpenAI, Anthropic, or Google SDKs. This ensures providers can
 * be swapped or added without changing application logic.
 */

import type { ModelProvider } from '@/lib/types/model';

// ─── Core Types ────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateParams {
  messages: AIMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface StreamParams extends GenerateParams {
  onChunk: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: AIError) => void;
  signal?: AbortSignal;
}

export interface AnalyzeParams {
  content: string;
  task: string;
  model?: string;
}

export interface AIResponse {
  content: string;
  provider: ModelProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}

export type AIErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT'
  | 'INSUFFICIENT_QUOTA'   // billing/credit exhausted — waiting will NOT fix this
  | 'TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'MALFORMED_RESPONSE'
  | 'NETWORK_ERROR'
  | 'CONTEXT_LIMIT_EXCEEDED'
  | 'UNKNOWN';

export class AIError extends Error {
  code: AIErrorCode;
  provider?: ModelProvider;
  retryable: boolean;
  userMessage: string;

  constructor(opts: {
    code: AIErrorCode;
    message: string;
    userMessage: string;
    provider?: ModelProvider;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = 'AIError';
    this.code = opts.code;
    this.provider = opts.provider;
    this.retryable = opts.retryable ?? false;
    this.userMessage = opts.userMessage;
  }
}

// ─── Provider Interface ─────────────────────────────────────────────────────

export interface AIProvider {
  readonly provider: ModelProvider;
  readonly defaultModel: string;
  isConfigured(): boolean;

  generate(params: GenerateParams): Promise<AIResponse>;
  stream(params: StreamParams): Promise<void>;
  analyze(params: AnalyzeParams): Promise<string>;

  // Prepared for future phases:
  // embed(text: string): Promise<number[]>;
  // compare(params: CompareParams): Promise<ComparisonResult>;
}

// ─── Provider Status ─────────────────────────────────────────────────────────

export interface ProviderConfigStatus {
  provider: ModelProvider;
  name: string;
  configured: boolean;
  defaultModel: string;
}
