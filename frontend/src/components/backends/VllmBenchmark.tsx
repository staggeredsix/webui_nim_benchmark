import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, RefreshCw, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getModels, pullVllmModel, getAllApiKeys } from '@/services/api';
import { BackendModel } from '@/types/backend';
import { BenchmarkConfig } from '@/types/benchmark';

interface VllmBenchmarkProps {
  onSubmit: (config: BenchmarkConfig) => Promise<any>;
  isRunning: boolean;
}

const VllmBenchmark: React.FC<VllmBenchmarkProps> = ({ onSubmit, isRunning }) => {
  const [baseConfig, setBaseConfig] = useState({
    name: '',
    description: '',
    total_requests: 100,
    concurrency_level: 6,
    max_tokens: 50,
    prompt: 'Write a short story about artificial intelligence.',
  });

  const [modelConfigs, setModelConfigs] = useState<Array<{
    model_id: string;
    customPrompt?: string;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_batch_size?: number;
    quantization?: string;
  }>>([{
    model_id: '',
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    max_batch_size: 8,
    quantization: 'auto'
  }]);

  const [models, setModels] = useState<BackendModel[]>([]);
  const [apiKeysStatus, setApiKeysStatus] = useState<{ huggingface: boolean }>({ huggingface: false });
  const [error, setError] = useState('');
  const [runningStatus, setRunningStatus] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPerformanceInfo, setShowPerformanceInfo] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [loadingModel, setLoadingModel] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([
    { id: 'mistralai/Mistral-7B-v0.1', name: 'Mistral 7B' },
    { id: 'meta-llama/Llama-2-7b-hf', name: 'Llama 2 7B' },
    { id: 'meta-llama/Llama-2-13b-hf', name: 'Llama 2 13B' },
    { id: 'meta-llama/Llama-2-70b-hf', name: 'Llama 2 70B' },
    { id: 'facebook/opt-1.3b', name: 'OPT 1.3B' },
    { id: 'facebook/opt-6.7b', name: 'OPT 6.7B' },
    { id: 'tiiuae/falcon-7b', name: 'Falcon 7B' },
    { id: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0', name: 'TinyLlama 1.1B' }
  ]);

  useEffect(() => {
    loadModels();
    checkApiKeys();
  }, []);

  const checkApiKeys = async () => {
    try {
      const status = await getAllApiKeys();
      setApiKeysStatus({ huggingface: status.huggingface });
    } catch (err) {
      console.error("Error checking API keys:", err);
    }
  };

  const loadModels = async () => {
    try {
      const modelList = await getModels('vllm');
      setModels(modelList);
    } catch (err) {
      setError('Failed to load vLLM models. Make sure the vLLM service is running.');
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
      await pullVllmModel(modelSearch.trim());
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
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      max_batch_size: 8,
      quantization: 'auto'
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
          temperature: modelConfig.temperature,
          top_p: modelConfig.top_p,
          top_k: modelConfig.top_k,
          batch_size: modelConfig.max_batch_size,
          quantization: modelConfig.quantization,
          backend: 'vllm',
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
        <h2 className="text-xl font-bold mb-4">vLLM Benchmark Configuration</h2>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded p-3 flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {!apiKeysStatus.huggingface && (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded p-3 flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
            <span>No Hugging Face API key configured. You'll need to add your HF API key in Settings to use gated models.</span>
          </div>
        )}

        <div className="mb-6 bg-gray-700 p-4 rounded">
          <h3 className="text-sm font-medium mb-2">Load vLLM Model</h3>
          <div className="flex gap-2">
            <select
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="flex-1 bg-gray-600 rounded p-2"
              disabled={loadingModel}
            >
              <option value="">Select a model to load</option>
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadModel}
              disabled={loadingModel || !modelSearch.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white disabled:opacity-50"
            >
              {loadingModel ? "Loading..." : "Load Model"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Select a model to load into vLLM. Gated models require a Hugging Face API key.
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
              placeholder="My vLLM benchmark run"
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
                    <label className="block text-sm mb-1">Select vLLM Model</label>
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
                    <label className="block text-sm mb-1">Max Batch Size</label>
                    <input
                      type="number"
                      value={model.max_batch_size}
                      onChange={e => updateModel(index, { max_batch_size: Number(e.target.value) })}
                      className="w-full bg-gray-700 rounded p-2"
                      min={1}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Quantization</label>
                    <select 
                      value={model.quantization}
                      onChange={e => updateModel(index, { quantization: e.target.value })}
                      className="w-full bg-gray-700 rounded p-2"
                    >
                      <option value="auto">Auto (No Quantization)</option>
                      <option value="awq">AWQ</option>
                      <option value="gptq">GPTQ</option>
                      <option value="int8">Int8</option>
                      <option value="int4">Int4</option>
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
              <p className="mb-2"><strong>For maximum throughput:</strong> Use larger batch sizes (8-32) and increase concurrency.</p>
              <p className="mb-2"><strong>For memory efficiency:</strong> Use quantized models (AWQ, GPTQ, Int8) to reduce VRAM usage.</p>
              <p><strong>For optimal performance:</strong> Tune batch size based on your GPU memory and model size.</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={isRunning}
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded disabled:opacity-50"
          >
            {runningStatus || (isRunning ? "Benchmark Running..." : "Start vLLM Benchmark")}
          </button>
        </form>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">vLLM Benchmark Information</h2>
        <div className="space-y-4">
          <p>
            This benchmark tool measures the performance of vLLM models by running a configurable 
            number of inference requests and measuring various metrics:
          </p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Throughput</strong>: How many tokens per second the model generates</li>
            <li><strong>Latency</strong>: Time to first token and inter-token latency</li>
            <li><strong>GPU Utilization</strong>: How efficiently the hardware is being used</li>
            <li><strong>Memory Usage</strong>: Peak memory consumption during inference</li>
          </ul>
          
          <div className="mt-4 p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2">vLLM-Specific Options</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-blue-400">Continuous Batching</h4>
                <p className="text-gray-300">
                  vLLM uses continuous batching to maximize throughput by dynamically grouping
                  requests as they arrive. This leads to significantly higher throughput compared 
                  to traditional batching methods.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-400">PagedAttention</h4>
                <p className="text-gray-300">
                  vLLM implements PagedAttention, a memory management technique that reduces memory fragmentation
                  and allows larger batch sizes and context lengths without running out of VRAM.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-400">Quantization</h4>
                <p className="text-gray-300">
                  vLLM supports various quantization methods (AWQ, GPTQ, Int8) to reduce model size and
                  memory footprint while maintaining performance. This is especially useful for larger models.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2">Model Selection Tips</h3>
            <p className="text-sm">
              When testing vLLM models, consider:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Models with 7B parameters or fewer will typically be faster but less capable</li>
              <li>Quantized models use less memory with a small performance trade-off</li>
              <li>Adjust batch sizes based on model size (larger models need smaller batch sizes)</li>
              <li>For multi-GPU deployments, larger models can be sharded across GPUs</li>
              <li>Some models perform better with vLLM than with other inference engines</li>
            </ul>
          </div>
          
          <div className="mt-6 p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2">vLLM vs Ollama vs NIM</h3>
            <p className="text-sm">
              vLLM offers several advantages:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
              <li>Higher throughput due to continuous batching and optimized attention</li>
              <li>More efficient memory usage with PagedAttention</li>
              <li>Direct access to Hugging Face models</li>
              <li>More flexible deployment options and scaling</li>
              <li>Open-source architecture with active development</li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-400 mt-4">
            <p>
              <strong>Note:</strong> To use gated models from Hugging Face, you'll need to configure your HF 
              API key in the Settings page before loading models.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VllmBenchmark;
