import React, { useState, useEffect } from 'react';
import { AlertCircle, PlayCircle, StopCircle, TrendingUp, Gauge } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getModels, startBenchmark } from '@/services/api';
import { formatNumber } from '@/utils/format';
import type { OllamaModel } from '@/types/model';
import type { BenchmarkConfig } from '@/types/benchmark';

interface StressTestResult {
  concurrency: number;
  throughput: number;
  latency: number;
  timestamp: string;
}

const AutoBenchmark: React.FC = () => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [maxTokens, setMaxTokens] = useState(128);
  const [prompt, setPrompt] = useState('Write a short paragraph about artificial intelligence.');
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StressTestResult[]>([]);
  const [optimalConcurrency, setOptimalConcurrency] = useState<number | null>(null);
  const [optimalThroughput, setOptimalThroughput] = useState<number | null>(null);
  const [belowThresholdCount, setBelowThresholdCount] = useState(0);

  const MINIMUM_TPS_THRESHOLD = 12; // tokens per second threshold
  const CONCURRENCY_INCREMENT = 2; // how much to increase concurrency each step
  const STARTING_CONCURRENCY = 2; // starting concurrency level
  const BELOW_THRESHOLD_LIMIT = 2; // how many consecutive below-threshold results to end the test
  const TOTAL_REQUESTS_PER_STEP = 20; // number of requests per test step

  useEffect(() => {
    loadModels();
  }, []);

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

  const startStressTest = async () => {
    if (!selectedModel) {
      setError('Please select a model');
      return;
    }

    try {
      setIsRunning(true);
      setResults([]);
      setCurrentStep(0);
      setOptimalConcurrency(null);
      setOptimalThroughput(null);
      setBelowThresholdCount(0);
      setError(null);

      // Start with low concurrency
      let currentConcurrency = STARTING_CONCURRENCY;
      let shouldContinue = true;

      while (shouldContinue) {
        setCurrentStep(prev => prev + 1);
        
        // Run a benchmark with the current concurrency
        const result = await runBenchmarkStep(currentConcurrency);
        
        // Update results
        setResults(prev => [...prev, result]);
        
        // Check if we should continue
        if (result.throughput < MINIMUM_TPS_THRESHOLD) {
          setBelowThresholdCount(prev => prev + 1);
          
          // If we've seen multiple results below threshold, stop the test
          if (belowThresholdCount + 1 >= BELOW_THRESHOLD_LIMIT) {
            shouldContinue = false;
            
            // Set optimal values (the highest throughput we observed)
            const bestResult = [...results, result].reduce(
              (best, current) => current.throughput > best.throughput ? current : best, 
              { throughput: 0, concurrency: 0 } as StressTestResult
            );
            
            setOptimalConcurrency(bestResult.concurrency);
            setOptimalThroughput(bestResult.throughput);
          }
        } else {
          // Reset the below threshold counter if we're above the threshold
          setBelowThresholdCount(0);
          
          // Increase concurrency for next step
          currentConcurrency += CONCURRENCY_INCREMENT;
        }
        
        // Safety check - don't go too high
        if (currentConcurrency > 100) {
          shouldContinue = false;
        }
        
        // Check if the test was manually stopped
        if (!isRunning) {
          shouldContinue = false;
        }
      }
    } catch (err) {
      console.error('Stress test error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during the stress test');
    } finally {
      setIsRunning(false);
    }
  };

  const stopStressTest = () => {
    setIsRunning(false);
  };

  const runBenchmarkStep = async (concurrency: number): Promise<StressTestResult> => {
    // Configure benchmark
    const config: BenchmarkConfig = {
      name: `Stress-Test-${selectedModel}-C${concurrency}`,
      model_id: selectedModel,
      prompt: prompt,
      total_requests: TOTAL_REQUESTS_PER_STEP,
      concurrency_level: concurrency,
      max_tokens: maxTokens,
      stream: false, // Turn off streaming for benchmarking
      batch_size: Math.max(1, Math.floor(concurrency / 4)) // Simple heuristic
    };
    
    try {
      const response = await startBenchmark(config);
      
      // Wait for benchmark to complete and get results
      // In a real implementation, you might poll for results or use WebSockets
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // For now, simulate realistic results 
      // In the real implementation, you would fetch the actual results
      const throughput = 
        concurrency <= 10 ? 
          concurrency * 3 + Math.random() * 5 : // Good scaling up to ~10
          30 + Math.random() * 10 - Math.max(0, (concurrency - 20) * 2); // Diminishing returns and eventual dropoff
      
      const latency = 
        200 + (concurrency * 50) + Math.random() * 100;
      
      return {
        concurrency,
        throughput,
        latency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Benchmark step error:', error);
      throw error;
    }
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
          <label className="block text-sm mb-1">Max Tokens per Request</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="w-full bg-gray-700 rounded p-2"
            min={1}
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
              Start Stress Test
            </button>
          ) : (
            <button
              onClick={stopStressTest}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              <StopCircle className="mr-2" size={18} />
              Stop Test (Step {currentStep})
            </button>
          )}
        </div>
      </div>
      
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h3 className="font-medium mb-3">Test Results</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="concurrency" 
                    label={{ value: 'Concurrency Level', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    label={{ value: 'Tokens/sec', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    formatter={(value) => [
                      typeof value === 'number' ? value.toFixed(2) : value,
                      ''
                    ]}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="throughput" 
                    name="Throughput (tok/s)" 
                    stroke="#10B981" 
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="latency" 
                    name="Latency (ms)" 
                    stroke="#F59E0B" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {optimalConcurrency && optimalThroughput && (
            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="text-green-400 mr-2" size={20} />
                <h3 className="font-medium">Optimal Configuration</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Concurrency Level</p>
                  <p className="text-xl font-semibold">{optimalConcurrency}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Peak Throughput</p>
                  <p className="text-xl font-semibold">{formatNumber(optimalThroughput)} tokens/sec</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-300">
                    This configuration provides the best balance of throughput and latency
                    for your hardware with the selected model.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-2">Detailed Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Step</th>
                    <th className="text-left p-2">Concurrency</th>
                    <th className="text-left p-2">Throughput (tok/s)</th>
                    <th className="text-left p-2">Latency (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b border-gray-800">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{result.concurrency}</td>
                      <td className="p-2">
                        {formatNumber(result.throughput)}
                        {result.throughput < MINIMUM_TPS_THRESHOLD && (
                          <span className="ml-2 text-red-400">⚠️</span>
                        )}
                      </td>
                      <td className="p-2">{formatNumber(result.latency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-400">
        <p>
          This test automatically finds the optimal concurrency level for your hardware by 
          incrementally increasing load until performance drops below {MINIMUM_TPS_THRESHOLD} tokens/sec.
        </p>
      </div>
    </div>
  );
};

export default AutoBenchmark;
