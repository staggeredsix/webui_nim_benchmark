// src/utils/chartHelpers.ts - Fixed version
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
 * with improved null checking
 */
export function getChartDataFromResults(results: AutoBenchmarkResults | null | undefined): AutoBenchmarkChartData[] {
  // Added extra null checks to prevent errors
  if (!results) return [];
  if (!results.tests || !Array.isArray(results.tests)) return [];
  
  return results.tests
    .filter(test => test && !test.error)  // Check if test is defined before accessing properties
    .map(test => mapTestToChartData(test));
}
