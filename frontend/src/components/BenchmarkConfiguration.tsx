import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startBenchmark, getModels } from '@/services/api';
import { AlertCircle } from 'lucide-react';
import type { BenchmarkConfig } from '@/types/benchmark';
import type { OllamaModel } from '@/types/model';

const BenchmarkConfiguration = () => {
  const [formData, setFormData] = useState({
    name: '',
    prompt: 'Write a short story about a robot who discovers emotions.',
    total_requests: 100,
    concurrency_level: 10,
    max_tokens: 50,
    model_id: '',
    stream: true,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40
  });
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const modelList = await getModels();
      setModels(modelList);
    } catch (err) {
      setError('Failed to load models. Make sure Ollama is running.');
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (!formData.name.trim()) {
        setError('Please provide a benchmark name');
        return;
      }

      if (!formData.model_id) {
        setError('Please select a model');
        return;
      }

      if (!formData.prompt.trim()) {
        setError('Please provide a prompt');
        return;
      }

      setIsRunning(true);
      const config: BenchmarkConfig = {
        ...formData,
      };
      
      const result = await startBenchmark(config);
      console.log('Benchmark started:', result);
      
      // Navigate to benchmark history or show success message
    } catch (err) {
      setError(err.message || 'Failed to start benchmark');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Benchmark Configuration</h2>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded p-3 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Benchmark Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-700 rounded p-2"
              placeholder="My benchmark run"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">Model</label>
            <select 
              value={formData.model_id}
              onChange={e => setFormData({...formData, model_id: e.target.value})}
              className="w-full bg-gray-700 rounded p-2"
            >
              <option value="">Select a model</option>
              {models.map(model => (
                <option key={model.model_id} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            
            {models.length === 0 && (
              <p className="text-sm text-yellow-400 mt-1">
                No models available. Install models in the Model Management section.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">Prompt Template</label>
            <textarea
              value={formData.prompt}
              onChange={e => setFormData({...formData, prompt: e.target.value})}
              className="w-full bg-gray-700 rounded p-2"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Total Requests</label>
              <input
                type="number"
                value={formData.total_requests}
                onChange={e => setFormData({...formData, total_requests: Number(e.target.value)})}
                className="w-full bg-gray-700 rounded p-2"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Concurrency</label>
              <input
                type="number"
                value={formData.concurrency_level}
                onChange={e => setFormData({...formData, concurrency_level: Number(e.target.value)})}
                className="w-full bg-gray-700 rounded p-2"
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Max Tokens per Request</label>
            <input
              type="number"
              value={formData.max_tokens}
              onChange={e => setFormData({...formData, max_tokens: Number(e.target.value)})}
              className="w-full bg-gray-700 rounded p-2"
              min={1}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="streaming"
              checked={formData.stream}
              onChange={e => setFormData({...formData, stream: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="streaming" className="text-sm">Enable streaming</label>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showAdvanced ? "Hide advanced options" : "Show advanced options"}
            </button>
            
            {showAdvanced && (
              <div className="mt-2 space-y-4 p-3 bg-gray-700/50 rounded">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.temperature}
                      onChange={e => setFormData({...formData, temperature: Number(e.target.value)})}
                      className="w-full bg-gray-700 rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Top P</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.top_p}
                      onChange={e => setFormData({...formData, top_p: Number(e.target.value)})}
                      className="w-full bg-gray-700 rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Top K</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.top_k}
                      onChange={e => setFormData({...formData, top_k: Number(e.target.value)})}
                      className="w-full bg-gray-700 rounded p-2"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  These parameters affect the model's inference behavior. Temperature controls randomness, 
                  with higher values producing more varied outputs. Top P and Top K restrict token selection 
                  to the most likely candidates.
                </p>
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={isRunning}
            className="w-full bg-green-600 hover:bg-green-700 py-2 px-4 rounded disabled:opacity-50"
          >
            {isRunning ? "Running Benchmark..." : "Start Benchmark"}
          </button>
        </form>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">What is Being Tested</h2>
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
            <li><strong>Power Efficiency</strong>: Tokens generated per watt of power</li>
          </ul>
          
          <p className="text-sm text-gray-400 mt-4">
            Running multiple requests in parallel (concurrency) can help identify the optimal 
            batch size for your hardware. The results will show you the most efficient configuration 
            for your specific model and system.
          </p>

          {models.length > 0 && formData.model_id && (
            <div className="mt-6 p-4 bg-gray-700 rounded">
              <h3 className="font-medium">Selected Model: {formData.model_id}</h3>
              <p className="text-sm mt-2">
                {models.find(m => m.name === formData.model_id)?.description || 
                  "This benchmark will measure how efficiently this model performs on your hardware."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BenchmarkConfiguration;
