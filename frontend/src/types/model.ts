// src/types/model.ts
export interface OllamaModel {
  model_id: string;
  name: string;
  size: number;
  modified_at?: string;
  status: "available" | "remote" | "downloading";
  is_running?: boolean;
  parameters?: Record<string, any>;
  description?: string;
  tags?: string[];
  downloads?: number;
}

export interface OllamaModelInfo extends OllamaModel {
  created_at?: string;
  format?: string;
  family?: string;
  parameter_size?: string;
  quantization_level?: string;
}

export interface OllamaSearchResults {
  models: OllamaModel[];
}

export interface OllamaGenerationOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;  // max_tokens
  stop?: string[];
  repeat_penalty?: number;
  seed?: number;
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: OllamaGenerationOptions;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ModelHealth {
  status: "healthy" | "unhealthy";
  response_time?: number;
  tokens_per_second?: number;
  error?: string;
}
