import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import ModelManagement from '@/components/ModelManagement';
import PerformanceTips from '@/components/PerformanceTips';
import ApiKeyManagement from '@/components/ApiKeyManagement';

const Settings = () => {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [vllmUrl, setVllmUrl] = useState('http://localhost:8000');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPerformanceTips, setShowPerformanceTips] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('server');

  useEffect(() => {
    // Load saved settings on component mount
    const savedOllamaUrl = localStorage.getItem('ollamaUrl');
    const savedVllmUrl = localStorage.getItem('vllmUrl');
    
    if (savedOllamaUrl) setOllamaUrl(savedOllamaUrl);
    if (savedVllmUrl) setVllmUrl(savedVllmUrl);
  }, []);

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSaveSettings = () => {
    // Save server URLs to local storage
    localStorage.setItem('ollamaUrl', ollamaUrl);
    localStorage.setItem('vllmUrl', vllmUrl);
    showMessage('success', 'Settings saved successfully');
    
    // Reload the page to apply new settings
    window.location.reload();
  };

  // Check if Ollama server is running
  const checkOllamaServer = async () => {
    try {
      const response = await fetch(ollamaUrl);
      if (response.ok) {
        showMessage('success', 'Successfully connected to Ollama server');
      } else {
        showMessage('error', `Could not connect to Ollama server: ${response.status}`);
      }
    } catch (error) {
      showMessage('error', 'Could not connect to Ollama server. Make sure it is running.');
    }
  };

  // Check if vLLM server is running
  const checkVllmServer = async () => {
    try {
      const response = await fetch(`${vllmUrl}/v1/models`);
      if (response.ok) {
        showMessage('success', 'Successfully connected to vLLM server');
      } else {
        showMessage('error', `Could not connect to vLLM server: ${response.status}`);
      }
    } catch (error) {
      showMessage('error', 'Could not connect to vLLM server. Make sure it is running.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {message.text && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg flex items-center space-x-2 z-50 ${
          message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
        }`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-700 mb-4">
        <button
          onClick={() => setActiveSection('server')}
          className={`px-4 py-2 ${activeSection === 'server' ? 'border-b-2 border-green-500 text-white' : 'text-gray-400'}`}
        >
          Server Settings
        </button>
        <button
          onClick={() => setActiveSection('api-keys')}
          className={`px-4 py-2 ${activeSection === 'api-keys' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}
        >
          API Keys
        </button>
        <button
          onClick={() => setActiveSection('models')}
          className={`px-4 py-2 ${activeSection === 'models' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400'}`}
        >
          Models
        </button>
        <button
          onClick={() => setActiveSection('performance')}
          className={`px-4 py-2 ${activeSection === 'performance' ? 'border-b-2 border-yellow-500 text-white' : 'text-gray-400'}`}
        >
          Performance
        </button>
      </div>

      {/* Server Settings Section */}
      {activeSection === 'server' && (
        <div className="card bg-gray-800/50 backdrop-blur">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <SettingsIcon className="w-6 h-6 mr-2 text-green-500" />
            Server Settings
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Ollama Server URL</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-2"
                />
                <button
                  onClick={checkOllamaServer}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} />
                    Test Connection
                  </div>
                </button>
              </div>
              <p className="text-sm text-gray-400">
                This is the URL where your Ollama server is running. The default is http://localhost:11434.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">vLLM Server URL</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={vllmUrl}
                  onChange={(e) => setVllmUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-2"
                />
                <button
                  onClick={checkVllmServer}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} />
                    Test Connection
                  </div>
                </button>
              </div>
              <p className="text-sm text-gray-400">
                This is the URL where your vLLM OpenAI-compatible API server is running. The default is http://localhost:8000.
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* API Keys Section */}
      {activeSection === 'api-keys' && (
        <div className="card bg-gray-800/50 backdrop-blur">
          <ApiKeyManagement />
        </div>
      )}

      {/* Model Management Section */}
      {activeSection === 'models' && (
        <div className="card bg-gray-800/50 backdrop-blur">
          <ModelManagement />
        </div>
      )}

      {/* Performance Tips Section */}
      {activeSection === 'performance' && (
        <div className="card bg-gray-800/50 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Performance Optimization Guide</h2>
          </div>
          
          <PerformanceTips />
        </div>
      )}

      {/* About Section - Always visible */}
      <div className="card bg-gray-800/50 backdrop-blur">
        <h2 className="text-xl font-bold mb-4">About Benchmark Tool</h2>
        <p className="mb-2">
          This tool allows you to benchmark LLM performance across multiple backends (Ollama, vLLM, and NVIDIA NIM),
          measuring throughput, latency, and hardware utilization metrics to help you optimize your models.
        </p>
        <div className="mt-4 space-y-2">
          <h3 className="font-medium">Features:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>Multi-Backend Support</strong>: Test models on Ollama, vLLM, and NVIDIA NIM to compare performance.
            </li>
            <li>
              <strong>Auto Stress Test</strong>: Automatically finds optimal concurrency and batch settings for your hardware
              by incrementally increasing load until performance plateaus.
            </li>
            <li>
              <strong>Detailed Metrics</strong>: Comprehensive metrics on throughput, latency, GPU utilization, and
              memory usage to help you fine-tune your deployment.
            </li>
            <li>
              <strong>Multi-GPU Support</strong>: Test performance scaling across multiple GPUs with NIM containers.
            </li>
          </ul>
        </div>
        <p className="text-sm text-gray-400 mt-4">
          To get started, configure API keys for gated models, install/load models in the Model Management section, 
          then run benchmarks from the Benchmarks page.
        </p>
      </div>
    </div>
  );
};

export default Settings;
