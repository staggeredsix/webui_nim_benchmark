// src/types/metrics.ts
export interface GpuMetrics {
  gpu_utilization: number;
  gpu_memory_used: number;
  gpu_memory_total: number;
  gpu_temp: number;
  power_draw: number;
  sm_clock: number;
  memory_clock: number;
  gpu_memory_free: number;
}

export interface HistoricalMetric {
  timestamp: string;
  tokens_per_second: number;
  gpu_utilization: number;
  power_draw: number;
}

export interface BenchmarkCounts {
  [key: string]: number;
}

export interface MetricsData {
  gpu_count: number;
  gpu_metrics: GpuMetrics[];
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  timestamp: number;
  pcie_throughput: number | null;
  uptime: number;
  tokens_per_second: number;
  peak_tps: number;
  avg_gpu_utilization: number;
  peak_gpu_util: number;
  avg_gpu_memory: number;
  peak_gpu_mem: number;
  power_draw: number;
  tokens_per_watt: number;
  historical_metrics: HistoricalMetric[];
  benchmark_counts?: BenchmarkCounts;

}