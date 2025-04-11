import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Terminal, Cpu, HardDrive, Zap, Gauge } from 'lucide-react';
import useWebSocket from '@/hooks/useWebSocket';
import { formatBytes, formatNumber } from '@/utils/format';

interface MetricCardProps {
  title: string;
  value: number | null | undefined;
  unit?: string;
  icon?: React.ElementType;
  precision?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit = '', icon: Icon, precision = 2 }) => (
  <div className="bg-gray-800 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      {Icon && <Icon className="w-5 h-5 text-gray-400" />}
    </div>
    <div className="text-2xl font-semibold">
      {value !== null && value !== undefined ? (
        <>
          {formatNumber(value, precision)}
          {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
        </>
      ) : (
        <span className="text-gray-500">N/A</span>
      )}
    </div>
  </div>
);

const GpuCard: React.FC<{ metrics: any; index: number }> = ({ metrics, index }) => (
  <div className="bg-gray-800 rounded-lg p-4">
    <h3 className="text-sm font-medium mb-3">GPU {index}</h3>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-400">Utilization</span>
        <span>{formatNumber(metrics.gpu_utilization)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Memory</span>
        <span>{formatBytes(metrics.gpu_memory_used * 1024**3)}/{formatBytes(metrics.gpu_memory_total * 1024**3)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Temperature</span>
        <span>{formatNumber(metrics.gpu_temp, 0)}°C</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Power</span>
        <span>{formatNumber(metrics.power_draw)}W</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">SM Clock</span>
        <span>{formatNumber(metrics.sm_clock)}MHz</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Memory Clock</span>
        <span>{formatNumber(metrics.memory_clock)}MHz</span>
      </div>
    </div>
  </div>
);

const TelemetryDisplay: React.FC = () => {
  const { metrics } = useWebSocket('ws://localhost:7000/metrics');
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    if (metrics?.historical_metrics) {
      setHistoricalData(metrics.historical_metrics.map((point: any) => ({
        ...point,
        timestamp: new Date(point.timestamp).toLocaleTimeString(),
      })));
    }
  }, [metrics?.historical_metrics]);

  if (!metrics) {
    return <div className="text-center text-gray-400 py-8">Loading metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance Metrics */}
        <div className="bg-gray-800 rounded-lg p-4 col-span-3">
          <h3 className="text-sm font-medium mb-3">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Current TPS" 
              value={metrics.tokens_per_second}
              unit="t/s"
              icon={Gauge}
            />
            <MetricCard 
              title="Peak TPS" 
              value={metrics.peak_tps}
              unit="t/s"
              icon={Gauge}
            />
            <MetricCard 
              title="Tokens/Watt" 
              value={metrics.tokens_per_watt}
              unit="t/W"
              icon={Zap}
            />
            <MetricCard 
              title="PCIe Throughput" 
              value={metrics.pcie_throughput}
              unit="GB/s"
              icon={Zap}
            />
          </div>
        </div>

        {/* GPU Cards */}
        {metrics.gpu_metrics.map((gpuMetrics: any, index: number) => (
          <GpuCard key={index} metrics={gpuMetrics} index={index} />
        ))}

        {/* System Metrics */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">System Metrics</h3>
          <div className="space-y-4">
            <MetricCard 
              title="CPU Usage" 
              value={metrics.cpu_usage}
              unit="%"
              icon={Cpu}
            />
            <MetricCard 
              title="Memory Usage" 
              value={(metrics.memory_used / metrics.memory_total) * 100}
              unit="%"
              icon={HardDrive}
            />
            <div className="text-sm text-gray-400">
              {formatBytes(metrics.memory_used * 1024**3)} / {formatBytes(metrics.memory_total * 1024**3)}
            </div>
          </div>
        </div>
      </div>

      {/* Performance History */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Performance History</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#9CA3AF' }}
                label={{ value: 'Tokens/s & Utilization %', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#9CA3AF' }}
                label={{ value: 'Power (W)', angle: 90, position: 'insideRight', fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="tokens_per_second" 
                name="Tokens/s" 
                stroke="#10B981"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="gpu_utilization" 
                name="GPU Util %" 
                stroke="#60A5FA"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="power_draw" 
                name="Power (W)" 
                stroke="#F59E0B"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export { TelemetryDisplay };