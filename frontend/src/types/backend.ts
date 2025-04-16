// src/types/backend.ts
export type BackendType = 'ollama' | 'vllm' | 'nim';

export interface BackendModel {
  id: string;
  name: string;
  backend: BackendType;
  status: 'available' | 'remote' | 'downloading' | 'loading';
  size?: number;
  tags?: string[];
  description?: string;
  modified_at?: string;
  // NIM-specific
  nim_id?: string;
  container_id?: string;
  is_running?: boolean;
  // vLLM-specific
  huggingface_id?: string;
  quantization?: string;
  max_batch_size?: number;
  // Common 
  parameters?: Record<string, any>;
}

export interface BackendModelInfo extends BackendModel {
  created_at?: string;
  format?: string;
  family?: string;
  parameter_size?: string;
  quantization_level?: string;
  max_context_length?: number;
  // NIM-specific properties
  container_image?: string;
  version?: string;
  capabilities?: string[];
}

export interface ApiKeys {
  ngc: boolean;
  huggingface: boolean;
}

export interface BackendConfig {
  // Common
  name: string;
  prompt: string;
  max_tokens: number;
  concurrency_level: number;
  total_requests: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  backend: BackendType;
  model_id: string;
  
  // Ollama-specific
  stream?: boolean;
  batch_size?: number;
  context_size?: string | number;
  
  // vLLM-specific
  quantization?: string;
  max_batch_size?: number;
  
  // NIM-specific
  nim_id?: string;
  gpu_count?: number;
  container_id?: string;
}

export interface BackendStatus {
  ollama: boolean;
  vllm: boolean;
  nim: boolean;
}
