import React, { useState, useEffect } from 'react';
import { AlertCircle, Gauge, Database, Server, Cloud } from 'lucide-react';
import { getModels, startBenchmark, fetchBenchmarkHistory } from '@/services/api';
import { formatNumber } from '@/utils/format';
import type { BenchmarkConfig, BenchmarkRun } from '@/types/benchmark';
import type { BackendType, BackendModel } from '@/types/backend';
import BenchmarkHistory from '@/components/BenchmarkHistory';
import OllamaBenchmark from '@/components/backends/OllamaBenchmark';
import VllmBenchmark from '@/components/backends/VllmBenchmark';
import NimBenchmark from '@/components/backends/NimBenchmark';
import AutoBenchmark from '@/components/AutoBenchmark';

const TestControls = () => {
  const [activeTab, setActiveTab] = useState<'ollama' | 'vllm' | 'nim' | 'auto'>('ollama');
  const [backends, setBackends] = useState<Record<string, boolean>>({
    ollama: true,
    vllm: false,
    nim: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBenchmark, setCurrentBenchmark] = useState(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkRun[]>([]);

  useEffect(() => {
    loadBenchmarkHistory();
    checkBackendStatus();
    const interval = setInterval(loadBenchmarkHistory, 10000); // Refresh history every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkBackendStatus = async () => {
    try {
      // This is a placeholder. In a real implementation, 
      // you would have an endpoint to check which backends are available
      const backendStatus = {
        ollama: true,
        vllm: true,
        nim: true
      };
      
      setBackends(backendStatus);
      
      // If current tab is not available, switch to first available
      if (!backendStatus[activeTab]) {
        if (backendStatus.ollama) setActiveTab('ollama');
        else if (backendStatus.vllm) setActiveTab('vllm');
        else if (backendStatus.nim) setActiveTab('nim');
      }
    } catch (err) {
      console.error("Error checking backend status:", err);
      setError("Failed to connect to backend services.");
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

  const handleStartBenchmark = async (config: BenchmarkConfig) => {
    try {
      setError(null);
      setIsRunning(true);
      setCurrentBenchmark(config);
      
      const response = await startBenchmark(config);
      console.log("Benchmark started:", response);
      
      // Wait for benchmark to complete (in a real app, use WebSockets for progress)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await loadBenchmarkHistory();
      
      setIsRunning(false);
      setCurrentBenchmark(null);
      
      return response;
    } catch (err) {
      console.error("Error starting benchmark:", err);
      setError(err instanceof Error ? err.message : 'Failed to start benchmark');
      setIsRunning(false);
      setCurrentBenchmark(null);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Run a Benchmark</h1>
      
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-700 pb-2 overflow-x-auto">
        {backends.ollama && (
          <button
            onClick={() => setActiveTab('ollama')}
            className={`px-4 py-2 rounded-t-lg flex items-center whitespace-nowrap ${
              activeTab === 'ollama' 
                ? 'bg-gray-800 text-white border-b-2 border-green-500' 
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4 mr-2" />
            Ollama Benchmark
          </button>
        )}
        
        {backends.vllm && (
          <button
            onClick={() => setActiveTab('vllm')}
            className={`px-4 py-2 rounded-t-lg flex items-center whitespace-nowrap ${
              activeTab === 'vllm' 
                ? 'bg-gray-800 text-white border-b-2 border-blue-500' 
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 mr-2" />
            vLLM Benchmark
          </button>
        )}
        
        {backends.nim && (
          <button
            onClick={() => setActiveTab('nim')}
            className={`px-4 py-2 rounded-t-lg flex items-center whitespace-nowrap ${
              activeTab === 'nim' 
                ? 'bg-gray-800 text-white border-b-2 border-purple-500' 
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4 mr-2" />
            NVIDIA NIM Benchmark
          </button>
        )}
        
        <button
          onClick={() => setActiveTab('auto')}
          className={`px-4 py-2 rounded-t-lg flex items-center whitespace-nowrap ${
            activeTab === 'auto' 
              ? 'bg-gray-800 text-white border-b-2 border-yellow-500' 
              : 'bg-gray-900 text-gray-400 hover:text-white'
          }`}
        >
          <Gauge className="w-4 h-4 mr-2" />
          Auto Stress Test
        </button>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'ollama' && (
          <OllamaBenchmark 
            onSubmit={handleStartBenchmark} 
            isRunning={isRunning} 
          />
        )}
        
        {activeTab === 'vllm' && (
          <VllmBenchmark 
            onSubmit={handleStartBenchmark} 
            isRunning={isRunning} 
          />
        )}
        
        {activeTab === 'nim' && (
          <NimBenchmark 
            onSubmit={handleStartBenchmark} 
            isRunning={isRunning} 
          />
        )}
        
        {activeTab === 'auto' && (
          <AutoBenchmark />
        )}
      </div>

      {/* Benchmark History Section */}
      <BenchmarkHistory />
    </div>
  );
};

export default TestControls;
