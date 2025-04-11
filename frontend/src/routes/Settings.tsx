import React, { useState } from 'react';
import { Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import ModelManagement from '@/components/ModelManagement';

const Settings = () => {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSaveSettings = () => {
    // In a real implementation, this would save to local storage or server
    localStorage.setItem('ollamaUrl', ollamaUrl);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {message.text && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
        }`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="card bg-gray-800/50 backdrop-blur">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <SettingsIcon className="w-6 h-6 mr-2 text-green-500" />
          Ollama Server Settings
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

          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Save Settings
          </button>
        </div>
      </div>

      <div className="card bg-gray-800/50 backdrop-blur">
        <ModelManagement />
      </div>

      <div className="card bg-gray-800/50 backdrop-blur">
        <h2 className="text-xl font-bold mb-4">About Ollama Benchmark Tool</h2>
        <p className="mb-2">
          This tool allows you to benchmark LLM performance using Ollama, measuring throughput, 
          latency, and hardware utilization metrics to help you optimize your models.
        </p>
        <p className="text-sm text-gray-400">
          To get started, install models in the Model Management section above, 
          then run benchmarks from the Benchmarks page.
        </p>
      </div>
    </div>
  );
};

export default Settings;
