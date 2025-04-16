import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, RefreshCw, Plus, X, Cloud } from 'lucide-react';
import { getModels, pullNimModel, getAllApiKeys } from '@/services/api';
import { BackendModel } from '@/types/backend';
import { BenchmarkConfig } from '@/types/benchmark';

interface NimBenchmarkProps {
  onSubmit: (config: BenchmarkConfig) => Promise<any>;
  isRunning: boolean;
}

const NimBenchmark: React.FC<NimBenchmarkProps> = ({ onSubmit, isRunning }) => {
  const [baseConfig, setBaseConfig] = useState({
    name: '',
    description: '',
    total_requests: 100,
    concurrency_level: 4,
    max_tokens: 50,
    prompt: 'Write a short story about artificial intelligence.',
  });

  const [modelConfigs, setModelConfigs] = useState<Array<{
    model_id: string;
    nim_id: string;
    customPrompt?: string;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    gpu_count?: number;
  }>>([{
    model_id: '',
    nim_id: '',
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    gpu_count: 1
  }]);

  const [models, setModels] = useState<BackendModel[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([
    { id: 'mistralai/mistral-7b', name: 'Mistral 7B' },
    { id: 'meta-llama/llama-2-7b', name: 'Llama 2 7B' },
    { id: 'meta-llama/llama-2-13b', name: 'Llama 2 13B' },
    { id: 'meta-llama/llama-2-70b', name: 'Llama 2 70B' },
    { id: 'nvidia/nemotron-3-8b', name: 'Nemotron 3 8B' },
    { id: 'nvidia/nemotron-4-340b', name: 'Nemotron 4 340B' }
  ]);
  const [apiKeysStatus, setApiKeysStatus] = useState<{ ngc: boolean }>({ ngc: false });
  const [error, setError] = useState('');
  const [runningStatus, setRunningStatus] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPerformanceInfo, setShowPerformanceInfo] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [loadingModel, setLoadingModel] = useState(false);

  useEffect(() => {
    loadModels();
    checkApiKeys();
  }, []);

  const checkApiKeys = async () => {
    try {
      const status = await getAllApiKeys();
      setApiKeysStatus({ ngc: status.ngc });
    } catch (err) {
      console.error("Error checking API keys:", err);
    }
  };

  const loadModels = async () => {
    try {
      const modelList = await getModels('nim');
      setModels(modelList);
    } catch (err) {
      setError('Failed to load NIM models. Make sure NGC credentials are configured.');
      console.error(err);
    }
  };

  const loadModel = async () => {
    if (!modelSearch.trim()) {
      setError('Please select a model from the dropdown');
      return;
    }

    try {
      setLoadingModel(true);
      setError('');
      await pullNimModel(modelSearch.trim());
      setModelSearch('');
      setTimeout(() => {
        loadModels();
        setLoadingModel(false);
      }, 1000);
    } catch (err) {
      setError(`Failed to load model: ${err instanceof Error ? err.message : String(err)}`);
      setLoadingModel(false);
    }
  };

  const addModel = () => {
    setModelConfigs([...modelConfigs, {
      model_id: '',
      nim_id: '',
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      gpu_count: 1
    }]);
  };

  const updateModel = (index: number, config: Partial<typeof modelConfigs[0]>) => {
    const newConfigs = [...modelConfigs];
    newConfigs[index] = { ...newConfigs[index], ...config };
    
    // Set nim_id from the model if available
    if (config.model_id) {
      const selectedModel = models.find(m => m.id === config.model_id);
      if (selectedModel && selectedModel.nim_id) {
        newConfigs[index].nim_id = selectedModel.nim_id;
      }
    }
    
    setModelConfigs(newConfigs);
  };

  const removeModel = (index: number) => {
    setModelConfigs(modelConfigs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRunningStatus('Starting benchmarks...');

    for (const modelConfig of modelConfigs) {
      try {
        if (!baseConfig.name.trim()) {
          setError('Please provide a benchmark name');
          setRunningStatus('');
          return;
        }

        if (!modelConfig.model_id) {
          setError('Please select a model');
          setRunningStatus('');
          return;
        }

        if (!modelConfig.nim_id) {
          setError('NIM ID not found for this model');
          setRunningStatus('');
          return;
        }

        const fullConfig: BenchmarkConfig = {
          ...baseConfig,
          model_id: modelConfig.model_id,
          nim_id: modelConfig.nim_id,
          prompt: modelConfig.customPrompt || baseConfig.prompt,
          name: `${baseConfig.name}_${models.find(m => m.id === modelConfig.model_id)?.name || modelConfig.model_id}`,
          temperature: modelConfig.temperature,
          top_p: modelConfig.top_p,
          top_k: modelConfig.top_k,
          gpu_count: modelConfig.gpu_count,
          backend: 'nim',
        };

        setRunningStatus(`Running benchmark for ${fullConfig.name}...`);
        
        await onSubmit(fullConfig);

      } catch (err) {
        console.error("Error during benchmark:", err);
        setError(err instanceof Error ? err.message : 'Failed during benchmark');
        break;
      }
    }

    setRunningStatus('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">NVIDIA NIM Benchmark Configuration</h2>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded p-3 flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {!apiKeysStatus.ngc && (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded p-3 flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
            <span>No NGC API key configured. You need to add your NGC API key in Settings to use NIM models.</span>
          </div>
        )}

        <div className="mb-6 bg-gray-700 p-4 rounded">
          <h3 className="text-sm font-medium mb-2">Pull NIM Container</h3>
          <div className="flex gap-2">
            <select
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="flex-1 bg-gray-600 rounded p-2"
              disabled={loadingModel || !apiKeysStatus.ngc}
            >
              <option value="">Select a NIM model</option>
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadModel}
              disabled={loadingModel || !modelSearch.trim() || !apiKeysStatus.ngc}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white disabled:opacity-50"
            >
              {loadingModel ? "Pulling..." : "Pull Container"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Select a NIM model to pull the container from NGC
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Benchmark Name</label>
            <input
              type="text"
              value={baseConfig.name}
              onChange={e => setBaseConfig({...baseConfig, name: e.target.value})}
              className="w-full bg-gray-700 rounded p-2"
              placeholder="My NIM benchmark run"
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
                    <label className="block text-sm mb-1">Select NIM Model</label>
                    <select 
                      value={model.model_id}
                      onChange={e => updateModel(index, { model_id: e.target.value })}
                      className="w-full bg-gray-700 rounded p-2"
                    >
                      <option value="">Select a model</option>
                      {models.map(m => (
                        <option key={m.id} value={m.id}>
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
                  <div>
                    <label className="block text-sm mb-1">GPU Count</label>
                    <select 
                      value={model.gpu_count}
                      onChange={e => updateModel(index, { gpu_count: Number(e.target.value) })}
                      className="w-full bg-gray-700 rounded p-2"
                    >
                      <option value={1}>1 GPU</option>
                      <option value={2}>2 GPUs</option>
                      <option value={4}>4 GPUs</option>
                      <option value={8}>8 GPUs</option>
                    </select>
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

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                type="button"
                onClick={() => setShowPerformanceInfo(!showPerformanceInfo)}
                className="text-blue-400 hover:text-blue-300 flex items-center text-xs"
              >
                <Info className="w-4 h-4 mr-1" />
                Performance tips
              </button>
            </div>
            
            <button
              onClick={loadModels}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
            >
              <RefreshCw size={14} /> Refresh models
            </button>
          </div>
          
          {showPerformanceInfo && (
            <div className="p-3 bg-blue-900/30 border border-blue-800 rounded text-xs">
              <p className="mb-2"><strong>For maximum performance:</strong> Use more GPUs for larger models (70B+).</p>
              <p className="mb-2"><strong>For memory efficiency:</strong> Reduce concurrency to fit large models on your GPU.</p>
              <p><strong>For comparison:</strong> Test with the same model across all three backends.</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={isRunning}
            className="w-full bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded disabled:opacity-50"
          >
            {runningStatus || (isRunning ? "Benchmark Running..." : "Start NIM Benchmark")}
          </button>
        </form>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">NVIDIA NIM Benchmark Information</h2>
        <div className="space-y-4">
          <p>
            This benchmark tool measures the performance of NVIDIA NIM containerized models by running a configurable 
            number of inference requests and measuring various metrics:
          </p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Throughput</strong>: How many tokens per second the model generates</li>
            <li><strong>Latency</strong>: Time to first token and inter-token latency</li>
            <li><strong>GPU Utilization</strong>: How efficiently the hardware is being used</li>
            <li><strong>Memory Usage</strong>: Peak memory consumption during inference</li>
            <li><strong>Multi-GPU Scaling</strong>: Performance scaling with additional GPUs</li>
          </ul>
          
          <div className="mt-4 p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2">NIM-Specific Options</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-purple-400">NVIDIA GPU Optimization</h4>
                <p className="text-gray-300">
                  NIM containers are pre-optimized for NVIDIA GPUs with FasterTransformer, TensorRT-LLM, and 
                  other NVIDIA proprietary optimizations for maximum performance.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-purple-400">Multi-GPU Support</h4>
                <p className="text-gray-300">
                  NIM containers can use multiple GPUs for model parallelism, enabling larger models to run efficiently
                  even when they don't fit on a single GPU.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-purple-400">Container-based Deployment</h4>
                <p className="text-gray-300">
                  NIM uses containerized deployment, allowing consistent performance across different environments
                  without complex setup.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2">NIM vs vLLM vs Ollama</h3>
            <p className="text-sm">
              NVIDIA NIM offers several advantages for production environments:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>NIM containers include NVIDIA's proprietary optimizations for their GPUs</li>
              <li>Multi-GPU scaling enables running larger models (70B+) efficiently</li>
              <li>Containerized deployment ensures consistent performance across environments</li>
              <li>TensorRT-LLM integration provides additional performance optimizations</li>
              <li>NIM containers include health check endpoints and metrics for production monitoring</li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-400 mt-4">
            <p>
              <strong>Note:</strong> To use NVIDIA NIM models, you need an NGC API key. Add it in the Settings page
              before trying to pull or run NIM containers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NimBenchmark;
