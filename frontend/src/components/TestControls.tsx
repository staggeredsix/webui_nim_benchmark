// src/components/TestControls.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Plus, X } from 'lucide-react';
import LogViewer from '@/components/LogViewer';
import { startBenchmark, getNims, saveLogs, fetchBenchmarkHistory } from "@/services/api";
import { formatNumber } from '@/utils/format';
import type { BenchmarkConfig, BenchmarkRun } from '@/types/benchmark';
import BenchmarkHistory from '@/components/BenchmarkHistory';

interface NimConfig {
  nim_id: string;
  gpu_count: number;
  customPrompt?: string;
  streaming: boolean;
}

const TestControls = () => {
  const [baseConfig, setBaseConfig] = useState({
    name: '',
    description: '',
    total_requests: 100,
    concurrency_level: 10,
    max_tokens: 50,
    prompt: '',
  });

  const [nimConfigs, setNimConfigs] = useState<NimConfig[]>([{
    nim_id: '',
    gpu_count: 1,
    streaming: true,
  }]);

  const [nims, setNims] = useState([]);
  const [error, setError] = useState('');
  const [containerStatus, setContainerStatus] = useState('');
  const [activeContainer, setActiveContainer] = useState<string | null>(null);
  const [isContainerRunning, setIsContainerRunning] = useState(false);
  const [currentBenchmark, setCurrentBenchmark] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkRun[]>([]);

  useEffect(() => {
    loadNims();
    loadBenchmarkHistory();
    const interval = setInterval(loadNims, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNims = async () => {
    try {
      const nimData = await getNims();
      setNims(nimData);
      if (activeContainer) {
        const activeNim = nimData.find(nim => nim.container_id === activeContainer);
        setIsContainerRunning(activeNim?.status === 'running');
      }
    } catch (err) {
      console.error("Error loading NIMs:", err);
      setError("Failed to load NIMs");
    }
  };

  const loadBenchmarkHistory = async () => {
    try {
      const history = await fetchBenchmarkHistory();
      setBenchmarkHistory(history);
    } catch (err) {
      console.error("Error loading benchmark history:", err);
    }
  };

  const addNim = () => {
    setNimConfigs([...nimConfigs, {
      nim_id: '',
      gpu_count: 1,
      streaming: true,
    }]);
  };

  const updateNim = (index: number, config: Partial<NimConfig>) => {
    const newConfigs = [...nimConfigs];
    newConfigs[index] = { ...newConfigs[index], ...config };
    setNimConfigs(newConfigs);
  };

  const removeNim = (index: number) => {
    setNimConfigs(nimConfigs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setContainerStatus('Starting benchmarks...');

    for (const nimConfig of nimConfigs) {
      try {
        if (!baseConfig.name.trim()) {
          setError('Please provide a benchmark name');
          return;
        }

        if (!nimConfig.nim_id) {
          setError('Please select a NIM');
          return;
        }

        const fullConfig: BenchmarkConfig = {
          ...baseConfig,
          nim_id: nimConfig.nim_id,
          gpu_count: nimConfig.gpu_count,
          prompt: nimConfig.customPrompt || baseConfig.prompt,
          name: `${baseConfig.name}_${nims.find(n => n.container_id === nimConfig.nim_id)?.image_name.split('/').pop()}`,
          stream: nimConfig.streaming,
        };

        setCurrentBenchmark(fullConfig);
        setContainerStatus(`Running benchmark for ${fullConfig.name}...`);
        
        const response = await startBenchmark(fullConfig);
        setActiveContainer(response.container_id);

        await new Promise(resolve => setTimeout(resolve, 30000));
        setContainerStatus('Waiting for GPU memory to clear...');
        
        await loadBenchmarkHistory();

      } catch (err) {
        console.error("Error starting benchmark:", err);
        setError(err instanceof Error ? err.message : 'Failed to start benchmark');
        break;
      }
    }

    setContainerStatus('');
    setCurrentBenchmark(null);
  };

  const handleSaveLogs = async (filename: string) => {
    if (!activeContainer) return;
    try {
      await saveLogs(activeContainer, filename);
    } catch (err) {
      console.error("Error saving logs:", err);
      setError("Failed to save logs");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Run a Benchmark</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Benchmark Configuration</h2>
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded p-3 flex items-center mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                type="text"
                value={baseConfig.name}
                onChange={e => setBaseConfig({...baseConfig, name: e.target.value})}
                className="w-full bg-gray-700 rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Default Prompt Template</label>
              <textarea
                value={baseConfig.prompt}
                onChange={e => setBaseConfig({...baseConfig, prompt: e.target.value})}
                className="w-full bg-gray-700 rounded p-2"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Total Requests</label>
                <input
                  type="number"
                  value={baseConfig.total_requests}
                  onChange={e => setBaseConfig({...baseConfig, total_requests: Number(e.target.value)})}
                  className="w-full bg-gray-700 rounded p-2"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Concurrency</label>
                <input
                  type="number"
                  value={baseConfig.concurrency_level}
                  onChange={e => setBaseConfig({...baseConfig, concurrency_level: Number(e.target.value)})}
                  className="w-full bg-gray-700 rounded p-2"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={baseConfig.max_tokens}
                  onChange={e => setBaseConfig({...baseConfig, max_tokens: Number(e.target.value)})}
                  className="w-full bg-gray-700 rounded p-2"
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-4">
              {nimConfigs.map((nim, index) => (
                <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm mb-1">Select NIM</label>
                      <select 
                        value={nim.nim_id}
                        onChange={e => updateNim(index, { nim_id: e.target.value })}
                        className="w-full bg-gray-700 rounded p-2"
                      >
                        <option value="">Select NIM</option>
                        {nims.map(n => (
                          <option key={n.container_id} value={n.container_id}>
                            {n.image_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm mb-1">GPUs</label>
                      <select
                        value={nim.gpu_count}
                        onChange={e => updateNim(index, { gpu_count: Number(e.target.value) })}
                        className="w-full bg-gray-700 rounded p-2"
                      >
                        {[1,2,3,4].map(num => (
                          <option key={num} value={num}>{num} GPU{num > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>

                    {nimConfigs.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeNim(index)}
                        className="mt-6 text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`streaming-${index}`}
                        checked={nim.streaming}
                        onChange={e => updateNim(index, { streaming: e.target.checked })}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      <label htmlFor={`streaming-${index}`} className="text-sm">Enable streaming</label>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateNim(index, { 
                        customPrompt: nim.customPrompt === undefined ? baseConfig.prompt : undefined 
                      })}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      {nim.customPrompt === undefined ? "Add custom prompt" : "Remove custom prompt"}
                    </button>

                    {nim.customPrompt !== undefined && (
                      <textarea
                        value={nim.customPrompt}
                        onChange={e => updateNim(index, { customPrompt: e.target.value })}
                        placeholder="Enter custom prompt for this NIM..."
                        className="w-full bg-gray-700 rounded p-2 text-sm"
                        rows={3}
                      />
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addNim}
                className="flex items-center text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add another NIM to test
              </button>
            </div>

            <button 
              type="submit"
              disabled={!!containerStatus || !!activeContainer}
              className="w-full bg-green-600 hover:bg-green-700 py-2 px-4 rounded disabled:opacity-50"
            >
              {containerStatus || (activeContainer ? "Benchmark Running..." : "Start Benchmarks")}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Recent Benchmarks</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={benchmarkHistory.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="start_time"
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
                  dataKey="metrics.tokens_per_second" 
                  name="Tokens/s" 
                  stroke="#10B981"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="metrics.latency" 
                  name="Latency" 
                  stroke="#60A5FA"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {metrics && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">System Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                {metrics.gpu_metrics.map((gpu, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">GPU {index}</h3>
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Benchmark History Section */}
      <BenchmarkHistory />

      {activeContainer && (
        <LogViewer 
          containerId={activeContainer}
          isContainerRunning={isContainerRunning}
          onSaveLogs={handleSaveLogs}
          gpuInfo={metrics?.gpu_metrics}
        />
      )}
    </div>
  );
};

export default TestControls;