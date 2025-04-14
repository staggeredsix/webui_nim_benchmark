// src/components/MetricsDisplay.tsx

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatBytes, formatNumber } from '@/utils/format';
import { Zap, Layers, ArrowDown, ArrowUp } from 'lucide-react';

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
  const [selectedMetricView, setSelectedMetricView] = useState<'throughput' | 'latency' | 'comparison'>('throughput');
  
  // Helper function to convert MB to GB with proper formatting
  const formatMemory = (mb: number): string => {
    return `${formatNumber(mb / 1024, 2)} GB`;
  };
  
  // Group benchmarks by stream vs batch for comparison
  const groupedBenchmarks = React.useMemo(() => {
    const streamed = benchmarkHistory
      .filter(b => b.streaming_enabled)
      .map(b => ({
        name: b.model_name,
        tokens_per_second: b.tokens_per_second,
        category: 'Streaming',
        time_to_first_token: b.time_to_first_token
      }));
      
    const batched = benchmarkHistory
      .filter(b => !b.streaming_enabled)
      .map(b => ({
        name: b.model_name,
        tokens_per_second: b.tokens_per_second,
        category: `Batch ${b.batch_size || 1}`,
        time_to_first_token: b.time_to_first_token
      }));
      
    return [...streamed, ...batched];
  }, [benchmarkHistory]);

  return (
    <div className="space-y-6">
      {/* View selector */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setSelectedMetricView('throughput')}
            className={`py-1 px-3 rounded-md ${
              selectedMetricView === 'throughput' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Throughput
          </button>
          <button
            onClick={() => setSelectedMetricView('latency')}
            className={`py-1 px-3 rounded-md ${
              selectedMetricView === 'latency' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Latency
          </button>
          <button
            onClick={() => setSelectedMetricView('comparison')}
            className={`py-1 px-3 rounded-md ${
              selectedMetricView === 'comparison' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Stream vs Batch
          </button>
        </div>
        
        {selectedMetricView === 'throughput' && (
          <>
            <h2 className="text-xl font-bold mb-4">Throughput Over Time</h2>
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
                {benchmarkHistory.some(b => b.model_tokens_per_second) && (
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="model_tokens_per_second" 
                    name="Model-only TPS" 
                    stroke="#60A5FA"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
        
        {selectedMetricView === 'latency' && (
          <>
            <h2 className="text-xl font-bold mb-4">Latency Metrics</h2>
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
                  label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelFormatter={(val) => new Date(val).toLocaleString()}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="latency" 
                  name="Avg Latency" 
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="p95_latency" 
                  name="P95 Latency" 
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="time_to_first_token" 
                  name="Time to First Token" 
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
        
        {selectedMetricView === 'comparison' && groupedBenchmarks.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4">Stream vs Batch Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Throughput</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={groupedBenchmarks}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      label={{ value: 'Tokens/s', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="tokens_per_second" 
                      name="Tokens/s" 
                      fill="#10B981"
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Time to First Token</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={groupedBenchmarks}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="time_to_first_token" 
                      name="TTFT (ms)" 
                      fill="#8B5CF6"
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-medium mb-2">Performance Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-2">
                  <Zap className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-400">Streaming Mode</h4>
                    <p className="text-sm text-gray-300">
                      <span className="flex items-center text-red-400 my-1">
                        <ArrowDown className="w-4 h-4 mr-1" /> Lower throughput
                      </span>
                      <span className="flex items-center text-green-400 my-1">
                        <ArrowUp className="w-4 h-4 mr-1" /> Faster first token
                      </span>
                      Best for interactive use cases requiring immediate feedback.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Layers className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-400">Batch Mode</h4>
                    <p className="text-sm text-gray-300">
                      <span className="flex items-center text-green-400 my-1">
                        <ArrowUp className="w-4 h-4 mr-1" /> Higher throughput
                      </span>
                      <span className="flex items-center text-red-400 my-1">
                        <ArrowDown className="w-4 h-4 mr-1" /> Slower first token
                      </span>
                      Best for batch processing and maximum throughput scenarios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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
                  <span>{formatMemory(gpu.gpu_memory_used)}/{formatMemory(gpu.gpu_memory_total)}</span>
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
