import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, Check, AlertTriangle, ExternalLink, Activity } from 'lucide-react';
import { getModels, pullModel, deleteModel, getModelHealth } from '@/services/api';
import { OllamaModel, ModelHealth } from '@/types/model';

const ModelManagement: React.FC = () => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [modelNameInput, setModelNameInput] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [modelHealth, setModelHealth] = useState<Record<string, ModelHealth>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [healthCheckResults, setHealthCheckResults] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const modelList = await getModels();
      setModels(modelList);
      setError(null);
    } catch (err) {
      setError("Failed to load models. Make sure Ollama is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      setRunningHealthCheck(true);
      setHealthCheckResults(null);
      
      const healthChecks: Record<string, ModelHealth> = {};
      let hasIssues = false;
      let errorMessages: string[] = [];
      
      for (const model of models) {
        try {
          const health = await getModelHealth(model.name);
          healthChecks[model.name] = health;
          
          if (health.status !== "healthy") {
            hasIssues = true;
            errorMessages.push(`Model '${model.name}': ${health.error || 'Unknown issue'}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          healthChecks[model.name] = { 
            status: "unhealthy", 
            error: errorMsg
          };
          hasIssues = true;
          errorMessages.push(`Model '${model.name}': ${errorMsg}`);
        }
      }
      
      setModelHealth(healthChecks);
      
      if (hasIssues) {
        setHealthCheckResults(`Issues found: ${errorMessages.join('; ')}`);
      } else {
        setHealthCheckResults(`All models are healthy (${Object.keys(healthChecks).length} checked)`);
      }
    } catch (err) {
      setHealthCheckResults(`Error running health check: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningHealthCheck(false);
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
      // Clear the health status for this model
      setModelHealth(prev => {
        const updated = {...prev};
        delete updated[modelName];
        return updated;
      });
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
        <div className="flex items-center gap-2">
          <button
            onClick={fetchModels}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          
          <button
            onClick={() => setShowHealthCheck(!showHealthCheck)}
            className="flex items-center gap-1 text-sm px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
          >
            <Activity size={14} /> 
            {showHealthCheck ? 'Hide Health Check' : 'Health Check'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 text-sm flex items-center">
          <AlertTriangle size={16} className="mr-2 text-red-400" />
          {error}
        </div>
      )}

      {/* Health Check Section */}
      {showHealthCheck && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-medium mb-3">Model Health Check</h3>
          <p className="text-sm text-gray-400 mb-3">
            Run a health check to verify all models are working properly. This will test each model 
            with a small inference request to ensure it's operational.
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={runHealthCheck}
              disabled={runningHealthCheck || models.length === 0}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm disabled:opacity-50 flex items-center gap-1"
            >
              {runningHealthCheck ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-r-transparent rounded-full mr-1"></div>
                  Checking...
                </>
              ) : (
                <>
                  <Activity size={14} />
                  Run Health Check
                </>
              )}
            </button>
            
            {models.length === 0 && (
              <span className="text-sm text-yellow-400">No models installed</span>
            )}
          </div>
          
          {healthCheckResults && (
            <div className={`mt-3 p-3 rounded text-sm ${
              healthCheckResults.includes('Issues found') 
                ? 'bg-yellow-900/50 border border-yellow-700' 
                : 'bg-green-900/50 border border-green-700'
            }`}>
              {healthCheckResults}
            </div>
          )}
          
          {Object.keys(modelHealth).length > 0 && (
            <div className="mt-3 space-y-2">
              <h4 className="font-medium text-sm">Results</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(modelHealth).map(([modelName, health]) => (
                  <div key={modelName} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <span>{modelName}</span>
                    <div className={`px-2 py-0.5 rounded text-xs ${
                      health.status === 'healthy' 
                        ? 'bg-green-900/50 text-green-300' 
                        : 'bg-yellow-900/50 text-yellow-300'
                    }`}>
                      {health.status === 'healthy' ? (
                        <div className="flex items-center gap-1">
                          <Check size={12} />
                          <span>Healthy</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span>{health.error || 'Issue'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                    {/* Health status is only displayed when health check has been run */}
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
