// src/components/TestControls.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Plus, X } from 'lucide-react';
import LogViewer from '@/components/LogViewer';
import { startBenchmark, getModels, saveLogs, fetchBenchmarkHistory } from "@/services/api";
import { formatNumber } from '@/utils/format';
import type { BenchmarkConfig, BenchmarkRun } from '@/types/benchmark';
import type { OllamaModel } from '@/types/model';
import BenchmarkHistory from '@/components/BenchmarkHistory';

interface ModelConfig {
  model_id: string;
  streaming: boolean;
  customPrompt?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
}

const TestControls = () => {
  const [baseConfig, setBaseConfig] = useState({
    name: '',
    description: '',
    total_requests: 100,
    concurrency_level: 10,
    max_tokens: 50,
    prompt: 'Write a short story about artificial intelligence.',
  });

  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([{
    model_id: '',
    streaming: true,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
  }]);

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [error, setError] = useState('');
  const [runningStatus, setRunningStatus] = useState('');
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBenchmark, setCurrentBenchmark] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkRun[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadModels();
    loadBenchmarkHistory();
    const interval = setInterval(loadBenchmarkHistory, 10000); // Refresh history every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadModels = async () => {
    try {
      const modelList = await getModels();
      setModels(modelList);
    } catch (err) {
      console.error("Error loading models:", err);
      setError("Failed to load models. Make sure Ollama is running.");
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

  const addModel = () => {
    setModelConfigs([...modelConfigs, {
      model_id: '',
      streaming: true,
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
    }]);
  };

  const updateModel = (index: number, config: Partial<ModelConfig>) => {
    const newConfigs = [...modelConfigs];
    newConfigs[index] = { ...newConfigs[index], ...config };
    setModelConfigs(newConfigs);
  };

  const removeModel = (index: number) => {
    setModelConfigs(modelConfigs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRunningStatus('Starting benchmarks...');
    setIsRunning(true);

    for (const modelConfig of modelConfigs) {
      try {
        if (!baseConfig.name.trim()) {
          setError('Please provide a benchmark name');
          setIsRunning(false);
          setRunningStatus('');
          return;
        }

        if (!modelConfig.model_id) {
          setError('Please select a model');
          setIsRunning(false);
          setRunningStatus('');
          return;
        }

        const fullConfig: BenchmarkConfig = {
          ...baseConfig,
          model_id: modelConfig.model_id,
          prompt: modelConfig.customPrompt || baseConfig.prompt,
          name: `${baseConfig.name}_${models.find(m => m.name === modelConfig.model_id)?.name || modelConfig.model_id}`,
          stream: modelConfig.streaming,
          temperature: modelConfig.temperature,
          top_p: modelConfig.top_p,
          top_k: modelConfig.top_k,
        };

        setCurrentBenchmark(fullConfig);
        setRunningStatus(`Running benchmark for ${fullConfig.name}...`);
        
        const response = await startBenchmark(fullConfig);
        setActiveRun(response.run_id);

        // Wait for benchmark to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        setRunningStatus('Processing results...');
        
        await loadBenchmarkHistory();

      } catch (err) {
        console.error("Error starting benchmark:", err);
        setError(err instanceof Error ? err.message : 'Failed to start benchmark');
        break;
      }
    }

    setRunningStatus('');
    setIsRunning(false);
    setCurrentBenchmark(null);
  };

  const handleSaveLogs = async (filename: string) => {
    // For Ollama, we don't have container logs, but we could implement a similar
    // function to save benchmark results to a file
    // This is just a placeholder
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
              <label className="block text-sm mb-1">Benchmark Name</label>
              <input
                type="text"
                value={baseConfig.name}
                onChange={e => setBaseConfig({...baseConfig, name: e.target.value})}
                className="w-full bg-gray-700 rounded p-2"
                placeholder="My benchmark run"
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
              {modelConfigs.map((model, index) => (
                <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm mb-1">Select Model</label>
                      <select 
                        value={model.model_id}
                        onChange={e => updateModel(index, { model_id: e.target.value })}
                        className="w-full bg-gray-700 rounded p-2"
                      >
                        <option value="">Select a model</option>
                        {models.map(m => (
                          <option key={m.name} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {modelConfigs.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeModel(index)}
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
                        checked={model.streaming}
                        onChange={e => updateModel(index, { streaming: e.target.checked })}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      <label htmlFor={`streaming-${index}`} className="text-sm">Enable streaming</label>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateModel(index, { 
                        customPrompt: model.customPrompt === undefined ? baseConfig.prompt : undefined 
                      })}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      {model.customPrompt === undefined ? "Add custom prompt" : "Remove custom prompt"}
                    </button>

                    {model.customPrompt !== undefined && (
                      <textarea
                        value={model.customPrompt}
                        onChange={e => updateModel(index, { customPrompt: e.target.value })}
                        placeholder="Enter custom prompt for this model..."
                        className="w-full bg-gray-700 rounded p-2 text-sm"
                        rows={3}
                      />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                    >
                      {showAdvanced ? "Hide advanced options" : "Show advanced options"}
                    </button>
                    
                    {showAdvanced && (
                      <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-gray-600/50 rounded">
                        <div>
                          <label className="block text-xs mb-1">Temperature</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={model.temperature || 0.7}
                            onChange={e => updateModel(index, { temperature: Number(e.target.value) })}
                            className="w-full bg-gray-700 rounded p-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Top P</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={model.top_p || 0.9}
                            onChange={e => updateModel(index, { top_p: Number(e.target.value) })}
                            className="w-full bg-gray-700 rounded p-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Top K</label>
                          <input
                            type="number"
                            min="1"
                            value={model.top_k || 40}
                            onChange={e => updateModel(index, { top_k: Number(e.target.value) })}
                            className="w-full bg-gray-700 rounded p-1 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addModel}
                className="flex items-center text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add another model to test
              </button>
            </div>

            <button 
              type="submit"
              disabled={isRunning}
              className="w-full bg-green-600 hover:bg-green-700 py-2 px-4 rounded disabled:opacity-50"
            >
              {runningStatus || (isRunning ? "Benchmark Running..." : "Start Benchmarks")}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Recent Benchmarks</h2>
            {benchmarkHistory.length > 0 ? (
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
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p>No benchmark data available yet</p>
                <p className="text-sm">Run a benchmark to see results here</p>
              </div>
            )}
          </div>

          {metrics && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">System Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                {metrics.gpu_metrics && metrics.gpu_metrics.map((gpu, index) => (
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
                        <span>{formatNumber(gpu.gpu_memory_used / 1024, 2)} / {formatNumber(gpu.gpu_memory_total / 1024, 2)} GB</span>
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
    </div>
  );
};

export default TestControls;
