import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { getModels, pullModel, deleteModel, getModelHealth } from '@/services/api';
import { OllamaModel, ModelHealth } from '@/types/model';

const ModelManagement: React.FC = () => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [modelNameInput, setModelNameInput] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [modelHealth, setModelHealth] = useState<Record<string, ModelHealth>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const modelList = await getModels();
      setModels(modelList);
      
      // Check health for each model
      const healthChecks: Record<string, ModelHealth> = {};
      for (const model of modelList) {
        try {
          const health = await getModelHealth(model.name);
          healthChecks[model.name] = health;
        } catch (err) {
          healthChecks[model.name] = { status: "unhealthy", error: "Could not check health" };
        }
      }
      setModelHealth(healthChecks);
      
      setError(null);
    } catch (err) {
      setError("Failed to load models. Make sure Ollama is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallModel = async () => {
    if (!modelNameInput.trim()) {
      setError("Please enter a model name");
      return;
    }

    // Extract just the model name/tag from input
    // This can handle formats like "ollama pull llama2" or just "llama2"
    const modelParts = modelNameInput.trim().split(' ');
    const modelName = modelParts[modelParts.length - 1];

    try {
      setDownloading(modelName);
      await pullModel(modelName);
      setModelNameInput('');
      setTimeout(() => {
        fetchModels();
        setDownloading(null);
      }, 2000);
    } catch (err) {
      setError(`Failed to download model: ${modelName}`);
      console.error(err);
      setDownloading(null);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete the model ${modelName}?`)) return;
    
    try {
      await deleteModel(modelName);
      fetchModels();
    } catch (err) {
      setError(`Failed to delete model: ${modelName}`);
      console.error(err);
    }
  };

  // Format file size to human readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Model Management</h2>
        <button
          onClick={fetchModels}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 text-sm flex items-center">
          <AlertTriangle size={16} className="mr-2 text-red-400" />
          {error}
        </div>
      )}

      {/* Install New Model Section */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-medium mb-4">Install New Model</h3>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={modelNameInput}
              onChange={(e) => setModelNameInput(e.target.value)}
              placeholder="Enter model name (e.g., llama2, mistral, gemma)"
              className="w-full bg-gray-700 rounded-lg p-2 pr-4"
              onKeyDown={(e) => e.key === 'Enter' && handleInstallModel()}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleInstallModel}
              disabled={downloading !== null || !modelNameInput.trim()}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white disabled:opacity-50 flex-1"
            >
              {downloading ? "Installing..." : "Install Model"}
            </button>
            
            <a
              href="https://ollama.com/library"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Browse Ollama Library
            </a>
          </div>
          
          <p className="text-sm text-gray-400">
            Enter the model name you want to install, or check the Ollama Library for available models.
            You can enter just the model name (e.g., "llama2") or the full command (e.g., "ollama pull llama2").
          </p>
        </div>
      </div>

      {/* Installed Models */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-medium mb-4">Installed Models</h3>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Download size={24} className="mx-auto mb-2" />
            <p>No models installed</p>
            <p className="text-sm text-gray-500">Install models using the form above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map(model => (
              <div key={model.model_id} className="bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-gray-400">
                      {model.modified_at && `Modified: ${new Date(model.modified_at).toLocaleString()}`}
                    </div>
                    {model.size > 0 && (
                      <div className="text-xs text-gray-400">Size: {formatFileSize(model.size)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {modelHealth[model.name] && (
                      <div className={`px-2 py-1 rounded text-xs ${
                        modelHealth[model.name].status === 'healthy' 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {modelHealth[model.name].status === 'healthy' ? (
                          <div className="flex items-center gap-1">
                            <Check size={12} />
                            <span>Healthy</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertTriangle size={12} />
                            <span>Issue</span>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteModel(model.name)}
                      className="p-1 text-gray-400 hover:text-red-400"
                      title="Delete model"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Health details if available */}
                {modelHealth[model.name]?.status === 'healthy' && modelHealth[model.name]?.tokens_per_second && (
                  <div className="mt-2 text-xs text-gray-400">
                    Performance: ~{modelHealth[model.name].tokens_per_second?.toFixed(1)} tokens/sec
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelManagement;
