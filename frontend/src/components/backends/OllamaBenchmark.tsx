import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, RefreshCw, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getModels } from '@/services/api';
import { BackendModel } from '@/types/backend';
import { BenchmarkConfig } from '@/types/benchmark';

interface OllamaBenchmarkProps {
  onSubmit: (config: BenchmarkConfig) => Promise<any>;
  isRunning: boolean;
}

const OllamaBenchmark: React.FC<OllamaBenchmarkProps> = ({ onSubmit, isRunning }) => {
  const [baseConfig, setBaseConfig] = useState({
    name: '',
    description: '',
    total_requests: 100,
    concurrency_level: 10,
    max_tokens: 50,
    prompt: 'Write a short story about artificial intelligence.',
  });

  const [modelConfigs, setModelConfigs] = useState<Array<{
    model_id: string;
    streaming: boolean;
    customPrompt?: string;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    batch_size?: number;
    context_size?: string;
  }>>([{
    model_id: '',
    streaming: true,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    batch_size: 4,
    context_size: 'auto',
  }]);

  const [models, setModels] = useState<BackendModel[]>([]);
  const [error, setError] = useState('');
  const [runningStatus, setRunningStatus] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPerformanceInfo, setShowPerformanceInfo] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const modelList = await getModels('ollama');
      setModels(modelList);
    } catch (err) {
      setError('Failed to load Ollama models. Make sure Ollama is running.');
      console.error(err);
    }
  };

  const addModel = () => {
    setModelConfigs([...modelConfigs, {
      model_id: '',
      streaming: true,
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      batch_size: 4,
      context_size: 'auto',
    }]);
  };

  const updateModel = (index: number, config: Partial<typeof modelConfigs[0]>) => {
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

        const fullConfig: BenchmarkConfig = {
          ...baseConfig,
          model_id: modelConfig.model_id,
          prompt: modelConfig.customPrompt || baseConfig.prompt,
          name: `${baseConfig.name}_${models.find(m => m.id === modelConfig.model_id)?.name || modelConfig.model_id}`,
          stream: modelConfig.streaming,
          temperature: modelConfig.temperature,
          top_p: modelConfig.top_p,
          top_k: modelConfig.top_k,
          batch_size: modelConfig.batch_size,
          context_size: modelConfig.context_size,
          backend: 'ollama',
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
        <h2 className="text-xl font-bold mb-4">Ollama Benchmark Configuration</h2>
        
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
              placeholder="My Ollama benchmark run"
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
                    <label className="block text-sm mb-1">Select Ollama Model</label>
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

                  {!model.streaming && (
                    <div>
                      <label className="block text-sm mb-1">Batch Size</label>
                      <input
                        type="number"
                        value={model.batch_size}
                        onChange={e => updateModel(index, { batch_size: Number(e.target.value) })}
                        className="w-full bg-gray-700 rounded p-2"
                        min={1}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm mb-1">Context Size</label>
                    <select 
                      value={model.context_size}
                      onChange={e => updateModel(index, { context_size: e.target.value })}
                      className="w-full bg-gray-700 rounded p-2"
                    >
                      <option value="auto">Auto (use model default)</option>
                      <option value="1024">Small (1K, fastest)</option>
                      <option value="2048">Medium (2K)</option>
                      <option value="4096">Large (4K)</option>
                      <option value="8192">XL (8K)</option>
                      <option value="16384">XXL (16K, most VRAM)</option>
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
              <p className="mb-2"><strong>For maximum throughput:</strong> Disable streaming and use batching.</p>
              <p className="mb-2"><strong>For lowest latency:</strong> Enable streaming when you need immediate first token response.</p>
              <p><strong>For memory efficiency:</strong> Set a smaller context size if your GPU has limited VRAM.</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={isRunning}
            className="w-full bg-green-600 hover:bg-green-700 py-2 px-4 rounded disabled:opacity-50"
          >
            {runningStatus || (isRunning ? "Benchmark Running..." : "Start Ollama Benchmark")}
          </button>
        </form>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Ollama Benchmark Information</h2>
        <div className="space-y-4">
          <p>
            This benchmark tool measures the performance of Ollama models by running a configurable 
            number of inference requests and measuring various metrics:
          </p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Throughput</strong>: How many tokens per second the model generates</li>
            <li><strong>Latency</strong>: Time to first token and inter-token latency</li>
            <li><strong>GPU Utilization</strong>: How efficiently the hardware is being used</li>
            <li><strong>Memory Usage</strong>: Peak memory consumption during inference</li>
          </ul>
          
          <div className="mt-4 p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2">Ollama-Specific Options</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-green-400">Streaming vs. Non-Streaming</h4>
                <p className="text-gray-300">
                  Non-streaming mode has higher throughput but higher time-to-first-token.
                  Streaming mode has lower throughput but delivers the first token faster.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-400">Batching (Non-Streaming Only)</h4>
                <p className="text-gray-300">
                  Batching groups multiple requests together, improving GPU utilization and throughput.
                  Larger batch sizes generally improve performance up to a point, then may cause increased latency or OOM errors.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-400">Context Size</h4>
                <p className="text-gray-300">
                  Smaller context sizes use less GPU memory and often have faster inference speed.
                  Only use large context sizes if you need long context in your application.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2">Model Selection Tips</h3>
            <p className="text-sm">
              When testing Ollama models, consider:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Smaller models (2B-7B) will typically be faster but less capable</li>
              <li>Quantized models (Q4_K_M) use less memory than higher precision (Q5_K_M, Q6_K, Q8_0)</li>
              <li>Testing multiple quantization levels of the same model helps identify optimal speed/quality tradeoffs</li>
              <li>Models with GGUF format typically perform better than older GGML format</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OllamaBenchmark;
