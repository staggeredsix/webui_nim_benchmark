import React from 'react';
import { MetricsData } from '@/types/metrics';

interface SystemMetricsProps {
  metrics: MetricsData;
}

const SystemMetrics: React.FC<SystemMetricsProps> = ({ metrics }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">System Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.gpu_metrics.map((gpuMetric, index) => (
          <div key={`gpu-${index}`} className="bg-gray-800 p-4 rounded">
            <h3 className="font-medium mb-2">GPU {index}</h3>
            <p>Utilization: {gpuMetric.gpu_utilization}%</p>
            <p>Memory: {gpuMetric.gpu_memory_used}GB / {gpuMetric.gpu_memory_total}GB</p>
            <p>Temperature: {gpuMetric.gpu_temp}°C</p>
          </div>
        ))}
      </div>

      {metrics.benchmark_counts && Object.keys(metrics.benchmark_counts).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Benchmark Runs per NIM</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(metrics.benchmark_counts).map(([nim, count]) => (
                <div key={nim} className="flex items-center justify-between">
                  <span className="text-gray-300">{nim}</span>
                  <span className="text-green-400 font-semibold">{count as number} runs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemMetrics;