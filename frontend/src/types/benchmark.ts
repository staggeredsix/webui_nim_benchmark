// src/types/benchmark.ts
export interface BenchmarkConfig {
  total_requests: number;
  concurrency_level: number;
  max_tokens?: number;
  prompt: string;
  name: string;
  model_id?: string;  // For Ollama models
  nim_id?: string;    // For NIM containers
  gpu_count?: number; // For NIM GPU allocation
  
  // New streaming/batching options
  stream?: boolean;
  batch_size?: number;
  context_size?: string | number;
  
  // Generation parameters
  temperature?: number;
  top_p?: number;
  top_k?: number;
  description?: string;
}

export interface BenchmarkMetrics {
  tokens_per_second: number;
  peak_tps: number;
  latency: number;
  p95_latency: number;
  time_to_first_token: number;
  inter_token_latency: number;
  
  // System metrics
  average_gpu_utilization: number;
  peak_gpu_utilization: number;
  average_gpu_memory: number;
  peak_gpu_memory: number;
  gpu_power_draw: number;
  gpu_metrics: Array<{
    gpu_utilization: number;
    gpu_memory_used: number;
    gpu_temp: number;
    power_draw: number;
  }>;
  
  // New performance metrics
  model_tokens_per_second?: number;  // Model-only TPS (without overhead)
  total_tokens: number;
  tokens_per_watt: number;
  successful_requests: number;
  failed_requests: number;
  
  // Execution info
  wall_clock_duration?: number;
  streaming_enabled?: boolean;
  batch_size?: number;
}

export interface BenchmarkRun {
  id: number;
  name: string;
  model_name: string;
  status: string;
  start_time: string;
  end_time?: string;
  config: BenchmarkConfig;
  metrics: BenchmarkMetrics;
}

export type Run = BenchmarkRun;
