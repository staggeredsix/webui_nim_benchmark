import React, { useState } from 'react';
import { saveNgcKey, getNgcKey, deleteNgcKey } from "@/services/api"; 

const NgcKeyManagement = () => {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!key.trim()) {
      setStatus('Please enter a key');
      return;
    }

    try {
      setLoading(true);
      await saveNgcKey(key);
      setStatus('NGC key saved successfully');
      setKey('');
    } catch (error) {
      setStatus('Error saving NGC key: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const checkKeyExists = async () => {
    try {
      setLoading(true);
      const result = await getNgcKey();
      setStatus(result.exists ? 'NGC key is set' : 'No NGC key found');
    } catch (error) {
      setStatus('Error checking NGC key: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteNgcKey();
      setStatus('NGC key deleted successfully');
    } catch (error) {
      setStatus('Error deleting NGC key: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">NGC API Key Management</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">NGC API Key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full bg-gray-700 rounded p-2"
            placeholder="Enter your NGC API key"
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded disabled:opacity-50"
          >
            Save Key
          </button>
          
          <button
            onClick={checkKeyExists}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
          >
            Check Key
          </button>
          
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded disabled:opacity-50"
          >
            Delete Key
          </button>
        </div>
        
        {status && (
          <div className="mt-2 p-2 bg-gray-700 rounded text-sm">
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default NgcKeyManagement;
