//src/routes/Home.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import useWebSocket from '@/hooks/useWebSocket';
import { fetchBenchmarkHistory } from "@/services/api";
import type { BenchmarkRun } from "@/types/benchmark";
const WS_BASE = `ws://${window.location.hostname}:7000`;

const Home: React.FC = () => {
  const { metrics, error: wsError, isConnected } = useWebSocket(`${WS_BASE}/ws/metrics`);
  const [history, setHistory] = useState<BenchmarkRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoricalData();
    const interval = setInterval(fetchHistoricalData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHistoricalData = async () => {
    try {
      const data = await fetchBenchmarkHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch benchmark history:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {wsError && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span>{wsError}</span>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold mb-4">System Metrics</h2>
        {metrics && metrics.gpu_metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.gpu_metrics.map((gpu, index) => (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <h3 className="text-sm font-medium mb-2">GPU {index}</h3>
                <p>Utilization: {gpu?.gpu_utilization?.toFixed(1) || '0.0'}%</p>
                <p>Memory: {(gpu?.gpu_memory_used || 0).toFixed(1)}MB</p>
                <p>Temperature: {gpu?.gpu_temp?.toFixed(0) || '0'}°C</p>
                <p>Power: {gpu?.power_draw?.toFixed(1) || '0.0'}W</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No metrics available</p>
        )}
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Recent Benchmarks</h2>
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-400">No benchmarks available.</p>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="p-2">Name</th>
                    <th className="p-2">Model</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Started</th>
                    <th className="p-2">Duration</th>
                    <th className="p-2">Avg TPS</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((run) => (
                    <tr key={run.id} className="border-b border-gray-700">
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
                        {run.end_time ? 
                          Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000) + 's'
                          : '-'
                        }
                      </td>
                      <td className="p-2">
                        {run.metrics?.tokens_per_second?.toFixed(2) || 'N/A'} t/s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
