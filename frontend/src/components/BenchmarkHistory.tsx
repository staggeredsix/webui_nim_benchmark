// src/components/BenchmarkHistory.tsx
import React, { useState, useEffect } from "react";
import { Download, ChevronDown, ChevronRight, Zap, Layers } from "lucide-react";
import { fetchBenchmarkHistory } from "@/services/api";
import { formatNumber } from "@/utils/format";
import type { BenchmarkRun } from "@/types/benchmark";

const BenchmarkHistory = () => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<BenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await fetchBenchmarkHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to load benchmark history:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exportResults = async (run: BenchmarkRun) => {
    const benchmarkData = {
      id: run.id,
      name: run.name,
      model_name: run.model_name,
      status: run.status,
      start_time: run.start_time,
      end_time: run.end_time,
      metrics: run.metrics,
    };

    const blob = new Blob([JSON.stringify(benchmarkData, null, 2)], {
      type: "application/json",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benchmark_${run.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${run.id}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return <div>Loading benchmark history...</div>;
  }

  return (
    <div className="space-y-4 bg-gray-900 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Benchmark History</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-800">
              <th className="p-2"></th>
              <th className="p-2">Name</th>
              <th className="p-2">Model</th>
              <th className="p-2">Status</th>
              <th className="p-2">Started</th>
              <th className="p-2">Duration</th>
              <th className="p-2">Avg TPS</th>
              <th className="p-2">Mode</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {history.map((run) => (
              <React.Fragment key={run.id}>
                <tr 
                  className="border-b border-gray-800 cursor-pointer hover:bg-gray-800"
                  onClick={() => toggleRow(run.id)}
                >
                  <td className="p-2">
                    {expandedRows.has(run.id) ? <ChevronDown /> : <ChevronRight />}
                  </td>
                  <td className="p-2">{run.name}</td>
                  <td className="p-2">{run.model_name}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      run.status === 'completed' ? 'bg-green-900 text-green-300' :
                      'bg-yellow-900 text-yellow-300'
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="p-2">{new Date(run.start_time).toLocaleString()}</td>
                  <td className="p-2">
                    {run.metrics?.wall_clock_duration ? 
                      `${Math.round(run.metrics.wall_clock_duration)}s` :
                      (run.end_time ? 
                        Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000) + 's'
                        : '-'
                      )
                    }
                  </td>
                  <td className="p-2">
                    {formatNumber(run.metrics?.tokens_per_second || 0)} t/s
                  </td>
                  <td className="p-2">
                    {run.metrics?.streaming_enabled ? 
                      <span className="flex items-center text-blue-400">
                        <Zap className="w-4 h-4 mr-1" />Stream
                      </span> : 
                      <span className="flex items-center text-green-400">
                        <Layers className="w-4 h-4 mr-1" />
                        Batch {run.metrics?.batch_size || 1}
                      </span>
                    }
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportResults(run);
                      }}
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </button>
                  </td>
                </tr>
                {expandedRows.has(run.id) && (
                  <tr>
                    <td colSpan={9} className="bg-gray-800 p-4">
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Performance Metrics</h4>
                          <dl className="space-y-2">
                            <div>
                              <dt className="text-gray-400">Throughput (Wall Clock)</dt>
                              <dd>{formatNumber(run.metrics.tokens_per_second)} t/s</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Model-only TPS</dt>
                              <dd>{formatNumber(run.metrics.model_tokens_per_second || 0)} t/s</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Peak TPS</dt>
                              <dd>{formatNumber(run.metrics.peak_tps)} t/s</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">P95 Latency</dt>
                              <dd>{formatNumber(run.metrics.p95_latency)} ms</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Time to First Token</dt>
                              <dd>{formatNumber(run.metrics.time_to_first_token)} ms</dd>
                            </div>
                          </dl>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">GPU Metrics</h4>
                          <dl className="space-y-2">
                            <div>
                              <dt className="text-gray-400">GPU Utilization</dt>
                              <dd>{formatNumber(run.metrics.average_gpu_utilization || 0)}%</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Peak GPU Memory</dt>
                              <dd>{formatNumber(run.metrics.peak_gpu_memory || 0)} GB</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Power Draw</dt>
                              <dd>{formatNumber(run.metrics.gpu_power_draw || 0)} W</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Tokens/Watt</dt>
                              <dd>{formatNumber(run.metrics.tokens_per_watt || 0)}</dd>
                            </div>
                          </dl>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Request Statistics</h4>
                          <dl className="space-y-2">
                            <div>
                              <dt className="text-gray-400">Total Tokens</dt>
                              <dd>{run.metrics.total_tokens.toLocaleString()}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Successful Requests</dt>
                              <dd>{run.metrics.successful_requests.toLocaleString()}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Failed Requests</dt>
                              <dd>{run.metrics.failed_requests.toLocaleString()}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Execution Mode</dt>
                              <dd>
                                {run.metrics.streaming_enabled ? 
                                  'Streaming' : 
                                  `Batched (${run.metrics.batch_size || 1})`
                                }
                              </dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Concurrency</dt>
                              <dd>{run.config?.concurrency_level || "N/A"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BenchmarkHistory;
