export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'openrouter';

export type ModelCapability =
  | 'text'
  | 'code'
  | 'vision'
  | 'tools'
  | 'structured_output'
  | 'embedding'
  | 'streaming';

export type CostTier = 'low' | 'medium' | 'high';
export type LatencyTier = 'fast' | 'medium' | 'slow';

export interface ModelDefinition {
  id: string;
  name: string;
  provider: ModelProvider;
  capabilities: ModelCapability[];
  contextLimit: number;
  costTier: CostTier;
  latencyTier: LatencyTier;
  available: boolean;
  description: string;
}

export interface ProviderStatus {
  provider: ModelProvider;
  name: string;
  connected: boolean;
  apiKeyConfigured: boolean;
  defaultModel?: string;
  models: ModelDefinition[];
}

export interface RoutingPreferences {
  defaultMode: 'quality' | 'cost' | 'speed' | 'balanced';
  codingModel?: string;
  planningModel?: string;
  researchModel?: string;
  reviewModel?: string;
  generalModel?: string;
}
