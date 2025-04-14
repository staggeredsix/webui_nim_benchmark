// src/utils/chartHelpers.ts
import type { BenchmarkTestResult, AutoBenchmarkResults, AutoBenchmarkChartData } from '@/types/autobenchmark';

/**
 * Maps a benchmark test result to chart data format
 */
export function mapTestToChartData(test: BenchmarkTestResult): AutoBenchmarkChartData {
  return {
    name: `C${test.concurrency}:B${test.batch_size}`,
    concurrency: test.concurrency,
    tokens_per_second: test.tokens_per_second,
    latency: test.latency,
    config: test.streaming ? 'Streaming' : `Batch:${test.batch_size}`
  };
}

/**
 * Converts benchmark results to chart-friendly data format
 */
export function getChartDataFromResults(results: AutoBenchmarkResults): AutoBenchmarkChartData[] {
  if (!results || !results.tests) return [];
  return results.tests
    .filter(test => !test.error)
    .map(test => mapTestToChartData(test));
}
