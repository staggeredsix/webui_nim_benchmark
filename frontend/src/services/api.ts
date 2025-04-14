// src/services/api.ts
import axios from "axios";
import type { BenchmarkRun, BenchmarkConfig } from '../types/benchmark';
import type { OllamaModel, OllamaModelInfo, ModelHealth } from '../types/model';

const BASE_URL = `http://${window.location.hostname}:7000`;
const WS_BASE = `ws://${window.location.hostname}:7000`;

// Re-export types
export type { BenchmarkRun, BenchmarkConfig };

// API Functions
export const startBenchmark = async (config: BenchmarkConfig) => {
  console.log("Sending benchmark request:", config);
  try {
    const response = await axios.post(`${BASE_URL}/api/benchmark`, config);
    return response.data;
  } catch (error) {
    console.error("Benchmark request error:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to start benchmark');
    }
    throw error;
  }
};

export const fetchBenchmarkHistory = async (): Promise<BenchmarkRun[]> => {
  const response = await axios.get(`${BASE_URL}/api/benchmark/history`);
  return response.data;
};

// Models API
export const getModels = async (): Promise<OllamaModel[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/models`);
    return response.data;
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
};

// Note: searchModels function is now deprecated but kept for backward compatibility
// The UI now uses the direct Ollama Library URL instead
export const searchModels = async (query: string = ""): Promise<OllamaModel[]> => {
  try {
    // This will return an empty array since we're bypassing the search to use the direct Ollama Library URL
    return [];
  } catch (error) {
    console.error("Error searching models:", error);
    return [];
  }
};

export const pullModel = async (name: string): Promise<{ status: string; model: string }> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/models/pull`, { name });
    return response.data;
  } catch (error) {
    console.error("Error pulling model:", error);
    throw error;
  }
};

export const deleteModel = async (modelName: string): Promise<{ status: string; model: string }> => {
  try {
    const response = await axios.delete(`${BASE_URL}/api/models/${modelName}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting model:", error);
    throw error;
  }
};

export const getModelInfo = async (modelName: string): Promise<OllamaModelInfo> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/models/${modelName}`);
    return response.data;
  } catch (error) {
    console.error("Error getting model info:", error);
    throw error;
  }
};

export const getModelHealth = async (modelName: string): Promise<ModelHealth> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/models/${modelName}/health`);
    return response.data;
  } catch (error) {
    console.error("Error checking model health:", error);
    throw error;
  }
};

export const saveLogs = async (containerId: string, filename: string): Promise<void> => {
  try {
    await axios.post(`${BASE_URL}/api/logs/save`, {
      container_id: containerId,
      filename: filename
    });
  } catch (error) {
    console.error("Error saving logs:", error);
    throw error;
  }
};

// NGC Key Management APIs
export const saveNgcKey = async (key: string): Promise<{ status: string }> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/ngc-key`, { key });
    return response.data;
  } catch (error) {
    console.error("Error saving NGC key:", error);
    throw error;
  }
};

export const getNgcKey = async (): Promise<{ exists: boolean }> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/ngc-key`);
    return response.data;
  } catch (error) {
    console.error("Error retrieving NGC key:", error);
    throw error;
  }
};

export const deleteNgcKey = async (): Promise<{ status: string }> => {
  try {
    const response = await axios.delete(`${BASE_URL}/api/ngc-key`);
    return response.data;
  } catch (error) {
    console.error("Error deleting NGC key:", error);
    throw error;
  }
};

// WebSocket connection for live logs
export const createLogStream = (logId: string, onMessage: (log: string) => void) => {
  const ws = new WebSocket(`${WS_BASE}/ws/logs/${logId}`);
  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data).log);
  };
  return ws;
};
