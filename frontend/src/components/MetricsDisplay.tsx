// src/components/MetricsDisplay.tsx

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GPUMetric {
  name?: string;
  gpu_temp: number;
  gpu_utilization: number;
  gpu_memory_used: number;
  gpu_memory_total: number;
  power_draw: number;
}

interface HistoricalMetric {
  timestamp: string;
  tokens_per_second: number;
  latency: number;
}

interface MetricsDisplayProps {
  benchmarkHistory: HistoricalMetric[];
  currentMetrics: {
    gpu_metrics: GPUMetric[];
  } | null;
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ benchmarkHistory, currentMetrics }) => {
  return (
    <div className="space-y-6">
      {/* Recent Benchmarks */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Most Recent Benchmarks</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={benchmarkHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp"
              tick={{ fill: '#9CA3AF' }}
              tickFormatter={(val) => new Date(val).toLocaleTimeString()}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#9CA3AF' }}
              label={{ value: 'Tokens/s', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#9CA3AF' }}
              label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              labelFormatter={(val) => new Date(val).toLocaleString()}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="tokens_per_second" 
              name="Tokens/s" 
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="latency" 
              name="Latency" 
              stroke="#60A5FA"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Current System Conditions */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Current System Conditions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentMetrics?.gpu_metrics?.map((gpu, index) => (
            <div key={index} className="bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium mb-2">GPU {index} - {gpu.name || 'Unknown'}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Temperature</span>
                  <span>{gpu.gpu_temp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Utilization</span>
                  <span>{gpu.gpu_utilization}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Memory</span>
                  <span>{gpu.gpu_memory_used}/{gpu.gpu_memory_total} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Power</span>
                  <span>{gpu.power_draw}W</span>
                </div>
              </div>
              
              {/* Utilization Bar */}
              <div className="mt-3">
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${gpu.gpu_utilization}%` }}
                  />
                </div>
                <div className="mt-2 h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(gpu.gpu_memory_used / gpu.gpu_memory_total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsDisplay;