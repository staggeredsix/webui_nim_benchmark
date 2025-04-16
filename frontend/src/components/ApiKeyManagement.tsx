import React, { useState, useEffect } from 'react';
import { saveApiKey, getApiKey, deleteApiKey, getAllApiKeys } from "@/services/api";
import { AlertCircle, Key, Check, X, RefreshCw } from 'lucide-react';

const ApiKeyManagement: React.FC = () => {
  const [ngcKey, setNgcKey] = useState('');
  const [hfKey, setHfKey] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ 
    ngc: boolean; 
    huggingface: boolean 
  }>({
    ngc: false,
    huggingface: false
  });
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    checkAllKeys();
  }, []);

  const checkAllKeys = async () => {
    try {
      setLoading(true);
      const result = await getAllApiKeys();
      setKeyStatus(result);
    } catch (error) {
      setStatus('Error checking API keys status');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (keyType: 'ngc' | 'huggingface') => {
    const key = keyType === 'ngc' ? ngcKey : hfKey;
    
    if (!key.trim()) {
      setStatus(`Please enter a ${keyType === 'ngc' ? 'NGC' : 'Hugging Face'} API key`);
      setStatusType('error');
      return;
    }

    try {
      setLoading(true);
      await saveApiKey(keyType, key);
      setStatus(`${keyType === 'ngc' ? 'NGC' : 'Hugging Face'} API key saved successfully`);
      setStatusType('success');
      
      if (keyType === 'ngc') {
        setNgcKey('');
      } else {
        setHfKey('');
      }
      
      // Update key status
      await checkAllKeys();
    } catch (error) {
      setStatus(`Error saving ${keyType === 'ngc' ? 'NGC' : 'Hugging Face'} API key: ${error instanceof Error ? error.message : String(error)}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyType: 'ngc' | 'huggingface') => {
    try {
      setLoading(true);
      await deleteApiKey(keyType);
      setStatus(`${keyType === 'ngc' ? 'NGC' : 'Hugging Face'} API key deleted successfully`);
      setStatusType('success');
      
      // Update key status
      await checkAllKeys();
    } catch (error) {
      setStatus(`Error deleting ${keyType === 'ngc' ? 'NGC' : 'Hugging Face'} API key: ${error instanceof Error ? error.message : String(error)}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">API Key Management</h2>
        <button
          onClick={checkAllKeys}
          disabled={loading}
          className="flex items-center text-gray-300 hover:text-white text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh Status
        </button>
      </div>
      
      {status && (
        <div className={`p-3 rounded flex items-center ${
          statusType === 'success' ? 'bg-green-900/50 border border-green-700' :
          statusType === 'error' ? 'bg-red-900/50 border border-red-700' :
          'bg-blue-900/50 border border-blue-700'
        }`}>
          {statusType === 'success' ? <Check className="w-5 h-5 mr-2 text-green-400" /> :
           statusType === 'error' ? <AlertCircle className="w-5 h-5 mr-2 text-red-400" /> :
           <Key className="w-5 h-5 mr-2 text-blue-400" />}
          <span>{status}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NGC API Key Section */}
        <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <Key className="text-purple-400" size={20} />
            <h3 className="text-lg font-medium">NVIDIA NGC API Key</h3>
            {keyStatus.ngc && (
              <span className="ml-auto bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full text-xs flex items-center">
                <Check className="w-3 h-3 mr-1" />
                Active
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-300">Required for NVIDIA NIM models and containers.</p>
          
          <div className="space-y-2">
            <label className="block text-sm">NGC API Key</label>
            <input
              type="password"
              value={ngcKey}
              onChange={(e) => setNgcKey(e.target.value)}
              className="w-full bg-gray-600 rounded p-2 border border-gray-600"
              placeholder={keyStatus.ngc ? "••••••••••••••••" : "Enter your NGC API key"}
              disabled={loading}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleSaveKey('ngc')}
              disabled={loading || !ngcKey.trim()}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded disabled:opacity-50 flex-1"
            >
              {loading ? "Saving..." : "Save Key"}
            </button>
            
            {keyStatus.ngc && (
              <button
                onClick={() => handleDeleteKey('ngc')}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded disabled:opacity-50"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            <p>Get your API key from <a href="https://ngc.nvidia.com/setup/api-key" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">NVIDIA NGC</a></p>
          </div>
        </div>
        
        {/* Hugging Face API Key Section */}
        <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <Key className="text-blue-400" size={20} />
            <h3 className="text-lg font-medium">Hugging Face API Key</h3>
            {keyStatus.huggingface && (
              <span className="ml-auto bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full text-xs flex items-center">
                <Check className="w-3 h-3 mr-1" />
                Active
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-300">Required for accessing gated models in vLLM.</p>
          
          <div className="space-y-2">
            <label className="block text-sm">Hugging Face API Key</label>
            <input
              type="password"
              value={hfKey}
              onChange={(e) => setHfKey(e.target.value)}
              className="w-full bg-gray-600 rounded p-2 border border-gray-600"
              placeholder={keyStatus.huggingface ? "••••••••••••••••" : "Enter your Hugging Face API key"}
              disabled={loading}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleSaveKey('huggingface')}
              disabled={loading || !hfKey.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50 flex-1"
            >
              {loading ? "Saving..." : "Save Key"}
            </button>
            
            {keyStatus.huggingface && (
              <button
                onClick={() => handleDeleteKey('huggingface')}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded disabled:opacity-50"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            <p>Get your API key from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Hugging Face</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManagement;
