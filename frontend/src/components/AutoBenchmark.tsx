import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, PlayCircle, StopCircle, TrendingUp, Gauge, BarChart2, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
         BarChart, Bar, ScatterChart, Scatter, ZAxis } from 'recharts';
import { getModels, startAutoBenchmark, stopAutoBenchmark, getAutoBenchmarkStatus, getAutoBenchmarkHistory } from '@/services/api';
import { formatNumber } from '@/utils/format';
import { getChartDataFromResults } from '@/utils/chartHelpers'; // Fixed import from utils instead of types
import type { OllamaModel } from '@/types/model';
import type { AutoBenchmarkRequest, AutoBenchmarkStatus, AutoBenchmarkResults, 
              BenchmarkTestResult, AutoBenchmarkChartData } from '@/types/autobenchmark';

const POLL_INTERVAL = 3000; // Poll for status updates every 3 seconds

const AutoBenchmark: React.FC = () => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [prompt, setPrompt] = useState('Write a short paragraph about artificial intelligence.');
  const [description, setDescription] = useState('');
  
  const [isRunning, setIsRunning] = useState(false);
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [benchmarkStatus, setBenchmarkStatus] = useState<AutoBenchmarkStatus | null>(null);
  const [history, setHistory] = useState<AutoBenchmarkResults[]>([]);
  const [chartData, setChartData] = useState<AutoBenchmarkChartData[]>([]);
  const [selectedView, setSelectedView] = useState<'throughput' | 'latency' | 'comparison'>('throughput');

  // Automatically poll for updates when a benchmark is running
  useEffect(() => {
    loadModels();
    checkStatus();
    loadHistory();

    return () => {
      if (statusPolling) {
        clearInterval(statusPolling);
      }
    };
  }, []);

  useEffect(() => {
    // Convert benchmark results to chart data
    if (benchmarkStatus?.current_results?.tests) {
      setChartData(getChartDataFromResults(benchmarkStatus.current_results));
    }
  }, [benchmarkStatus]);

  const loadModels = async () => {
    try {
      const modelList = await getModels();
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0].name);
      }
    } catch (err) {
      setError('Failed to load models. Make sure Ollama is running.');
      console.error(err);
    }
  };

  const loadHistory = async () => {
    try {
      const historyData = await getAutoBenchmarkHistory();
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load auto-benchmark history:', err);
    }
  };

  const checkStatus = async () => {
    try {
      const status = await getAutoBenchmarkStatus();
      setBenchmarkStatus(status);
      setIsRunning(status.is_running);
      
      // If a benchmark is running, start polling for updates
      if (status.is_running && !statusPolling) {
        const interval = setInterval(async () => {
          try {
            const updatedStatus = await getAutoBenchmarkStatus();
            setBenchmarkStatus(updatedStatus);
            setIsRunning(updatedStatus.is_running);
            
            // If the benchmark is no longer running, stop polling and refresh history
            if (!updatedStatus.is_running) {
              clearInterval(interval);
              setStatusPolling(null);
              loadHistory();
            }
          } catch (e) {
            console.error('Error polling status:', e);
          }
        }, POLL_INTERVAL);
        
        setStatusPolling(interval);
      } else if (!status.is_running && statusPolling) {
        clearInterval(statusPolling);
        setStatusPolling(null);
      }
    } catch (err) {
      console.error('Failed to check auto-benchmark status:', err);
    }
  };

  const startStressTest = async () => {
    if (!selectedModel) {
      setError('Please select a model');
      return;
    }

    try {
      setError(null);
      
      const request: AutoBenchmarkRequest = {
        model_id: selectedModel,
        prompt,
        description
      };
      
      const response = await startAutoBenchmark(request);
      setIsRunning(true);
      
      // Start polling for updates
      await checkStatus();
      
    } catch (err) {
      console.error('Error starting auto-benchmark:', err);
      setError(err instanceof Error ? err.message : 'An error occurred starting the benchmark');
    }
  };

  const stopStressTest = async () => {
    try {
      await stopAutoBenchmark();
      setError(null);
    } catch (err) {
      console.error('Error stopping auto-benchmark:', err);
      setError(err instanceof Error ? err.message : 'An error occurred stopping the benchmark');
    }
  };

  // Format the streaming/batch description
  const formatConfigLabel = (test: BenchmarkTestResult): string => {
    return test.streaming 
      ? `Streaming (C:${test.concurrency})` 
      : `Batch ${test.batch_size} (C:${test.concurrency})`;
  };

  // Get appropriate UI colors based on performance
  const getPerformanceColor = (tps: number): string => {
    if (tps >= 30) return '#10B981'; // Green
    if (tps >= 12) return '#3B82F6'; // Blue
    return '#F59E0B'; // Amber
  };

  // Format test status tag
  const getTestStatusTag = (test: BenchmarkTestResult) => {
    if (test.error) {
      return (
        <span className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded-full text-xs">
          Failed
        </span>
      );
    }
    
    if (test.tokens_per_second < 12) {
      return (
        <span className="px-2 py-0.5 bg-amber-900/50 text-amber-300 rounded-full text-xs">
          Below threshold
        </span>
      );
    }
    
    return (
      <span className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded-full text-xs">
        Good
      </span>
    );
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center mb-4">
        <Gauge className="text-blue-400 mr-2" size={24} />
        <h2 className="text-xl font-bold">Auto-Benchmark Stress Test</h2>
      </div>
      
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm mb-1">Select Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-gray-700 rounded p-2"
            disabled={isRunning}
          >
            <option value="">Select a model</option>
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1">Prompt Template</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-gray-700 rounded p-2"
            rows={2}
            disabled={isRunning}
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1">Description (Optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-gray-700 rounded p-2"
            placeholder="Benchmark description for your reference"
            disabled={isRunning}
          />
        </div>
        
        <div className="flex justify-between pt-2">
          {!isRunning ? (
            <button
              onClick={startStressTest}
              disabled={!selectedModel}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              <PlayCircle className="mr-2" size={18} />
              Start Auto-Benchmark
            </button>
          ) : (
            <button
              onClick={stopStressTest}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              <StopCircle className="mr-2" size={18} />
              Stop Benchmark
            </button>
          )}
        </div>
      </div>
      
      {/* Status and Progress Display */}
      {isRunning && benchmarkStatus && (
        <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Benchmark In Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Model:</span>
              <span className="font-medium">{benchmarkStatus.current_results.model_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Status:</span>
              <span className="font-medium capitalize">{benchmarkStatus.current_results.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Tests completed:</span>
              <span className="font-medium">{benchmarkStatus.current_results.tests.length}</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm text-gray-300">
              Testing different configurations to find the optimal settings for your hardware.
              This process may take several minutes. You can stop it at any time.
            </p>
          </div>
        </div>
      )}

      {/* View selectors for test results */}
      {(benchmarkStatus?.current_results?.tests?.length > 0 || chartData.length > 0) && (
        <div className="mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedView('throughput')}
              className={`px-3 py-1 rounded text-sm ${
                selectedView === 'throughput' ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              Throughput
            </button>
            <button
              onClick={() => setSelectedView('latency')}
              className={`px-3 py-1 rounded text-sm ${
                selectedView === 'latency' ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              Latency
            </button>
            <button
              onClick={() => setSelectedView('comparison')}
              className={`px-3 py-1 rounded text-sm ${
                selectedView === 'comparison' ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              Streaming vs Batch
            </button>
          </div>
        </div>
      )}
      
      {/* Results Display */}
      {chartData.length > 0 && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-medium mb-3">Test Results</h3>
            <div className="h-64">
              {selectedView === 'throughput' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="concurrency" 
                      label={{ value: 'Concurrency Level', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Tokens/sec', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => [
                        typeof value === 'number' ? value.toFixed(2) : value,
                        ''
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="tokens_per_second" 
                      name="Throughput (tok/s)" 
                      stroke="#10B981" 
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {selectedView === 'latency' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="concurrency" 
                      label={{ value: 'Concurrency Level', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => [
                        typeof value === 'number' ? value.toFixed(2) : value,
                        ''
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="latency" 
                      name="Latency (ms)" 
                      stroke="#F59E0B" 
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {selectedView === 'comparison' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Tokens/sec', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => [
                        typeof value === 'number' ? value.toFixed(2) : value,
                        ''
                      ]}
                    />
                    <Legend />
                    <Bar 
                      dataKey="tokens_per_second" 
                      name="Throughput" 
                      fill="#10B981" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          
          {/* Optimal Configuration Display */}
          {benchmarkStatus?.current_results?.optimal_config && (
            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="text-green-400 mr-2" size={20} />
                <h3 className="font-medium">Optimal Configuration</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Mode</p>
                  <p className="text-xl font-semibold">
                    {benchmarkStatus.current_results.optimal_config.streaming ? 'Streaming' : 'Batch'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Concurrency Level</p>
                  <p className="text-xl font-semibold">{benchmarkStatus.current_results.optimal_config.concurrency}</p>
                </div>
                {!benchmarkStatus.current_results.optimal_config.streaming && (
                  <div>
                    <p className="text-gray-400 text-sm">Batch Size</p>
                    <p className="text-xl font-semibold">{benchmarkStatus.current_results.optimal_config.batch_size}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-400 text-sm">Token Size</p>
                  <p className="text-xl font-semibold">{benchmarkStatus.current_results.optimal_config.token_size}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Peak Throughput</p>
                  <p className="text-xl font-semibold">{formatNumber(benchmarkStatus.current_results.optimal_config.tokens_per_second)} tokens/sec</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Latency</p>
                  <p className="text-xl font-semibold">{formatNumber(benchmarkStatus.current_results.optimal_config.latency)} ms</p>
                </div>
              </div>
              
              <div className="mt-4 border-t border-blue-800 pt-3">
                <p className="text-sm text-gray-300">
                  This configuration provides the best balance of throughput and latency
                  for your hardware with the selected model. The recommended settings are
                  optimal for production deployments.
                </p>
              </div>
            </div>
          )}
          
          {/* Test Details Table */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Detailed Test Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Mode</th>
                    <th className="text-left p-2">Concurrency</th>
                    <th className="text-left p-2">Batch Size</th>
                    <th className="text-left p-2">Token Size</th>
                    <th className="text-left p-2">Throughput</th>
                    <th className="text-left p-2">Latency</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkStatus?.current_results?.tests?.map((test, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-600">
                      <td className="p-2">{test.streaming ? 'Streaming' : 'Batch'}</td>
                      <td className="p-2">{test.concurrency}</td>
                      <td className="p-2">{test.batch_size}</td>
                      <td className="p-2">{test.token_size}</td>
                      <td className="p-2">
                        {test.error ? 'N/A' : `${formatNumber(test.tokens_per_second)} tok/s`}
                      </td>
                      <td className="p-2">
                        {test.error ? 'N/A' : `${formatNumber(test.latency)} ms`}
                      </td>
                      <td className="p-2">
                        {getTestStatusTag(test)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {(!benchmarkStatus || benchmarkStatus.current_results.tests.length === 0) && !isRunning && (
        <div className="bg-gray-700 p-6 text-center rounded-lg">
          <BarChart2 className="mx-auto mb-3 text-gray-400" size={40} />
          <p className="text-lg mb-1">No benchmark data yet</p>
          <p className="text-sm text-gray-400">
            Start an auto-benchmark to find the optimal configuration for your model and hardware.
          </p>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-400">
        <p>
          This automated test systematically evaluates different configurations to find the
          optimal settings for running your model. It tests both streaming and batch modes
          with various concurrency levels and batch sizes until it finds the best performance.
        </p>
        <p className="mt-2">
          Performance is measured in tokens per second (throughput) and latency (milliseconds).
          The test identifies the configuration that provides the best balance.
        </p>
      </div>
    </div>
  );
};

export default AutoBenchmark;
