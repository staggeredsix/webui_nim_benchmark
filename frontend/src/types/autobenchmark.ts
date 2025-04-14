// src/types/autobenchmark.ts

export interface AutoBenchmarkRequest {
  model_id: string;
  prompt: string;
  description?: string;
}

export interface BenchmarkTestResult {
  name: string;
  model_id: string;
  concurrency: number;
  streaming: boolean;
  batch_size: number;
  token_size: number;
  tokens_per_second: number;
  latency: number;
  p95_latency?: number;
  time_to_first_token?: number;
  gpu_utilization?: number;
  gpu_memory?: number;
  total_duration?: number;
  timestamp: string;
  error?: string;
}

export interface OptimalConfig {
  name: string;
  model_id: string;
  concurrency: number;
  streaming: boolean;
  batch_size: number;
  token_size: number;
  tokens_per_second: number;
  latency: number;
}

export interface AutoBenchmarkResults {
  model_id: string;
  timestamp: string;
  tests: BenchmarkTestResult[];
  optimal_config: OptimalConfig | null;
  status: 'running' | 'completed' | 'error' | 'stopping';
  error?: string;
}

export interface AutoBenchmarkStatus {
  is_running: boolean;
  current_results: AutoBenchmarkResults;
}

export interface AutoBenchmarkChartData {
  name: string;
  concurrency: number;
  tokens_per_second: number;
  latency: number;
  config: string;
}

