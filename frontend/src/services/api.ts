// src/services/api.ts
import axios from "axios";
import type { BenchmarkRun, BenchmarkConfig } from '../types/benchmark';
import type { OllamaModel, OllamaModelInfo, ModelHealth } from '../types/model';
import type { AutoBenchmarkStatus, AutoBenchmarkRequest } from '../types/autobenchmark';

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

// API Key Management
export const saveApiKey = async (keyType: 'ngc' | 'huggingface', key: string): Promise<{ status: string }> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/api-keys/${keyType}`, { key });
    return response.data;
  } catch (error) {
    console.error(`Error saving ${keyType} key:`, error);
    throw error;
  }
};

export const getApiKey = async (keyType: 'ngc' | 'huggingface'): Promise<{ exists: boolean }> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/api-keys/${keyType}`);
    return response.data;
  } catch (error) {
    console.error(`Error retrieving ${keyType} key:`, error);
    throw error;
  }
};

export const getAllApiKeys = async (): Promise<{ ngc: boolean; huggingface: boolean }> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/api-keys`);
    return response.data;
  } catch (error) {
    console.error("Error retrieving API keys:", error);
    throw error;
  }
};

export const deleteApiKey = async (keyType: 'ngc' | 'huggingface'): Promise<{ status: string }> => {
  try {
    const response = await axios.delete(`${BASE_URL}/api/api-keys/${keyType}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting ${keyType} key:`, error);
    throw error;
  }
};

// Models API - Common
export const getModels = async (backend?: 'ollama' | 'vllm' | 'nim'): Promise<any[]> => {
  try {
    let url = `${BASE_URL}/api/models`;
    if (backend) {
      url += `?backend=${backend}`;
    }
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
};

// Ollama-specific APIs
export const pullOllamaModel = async (name: string): Promise<{ status: string; model: string }> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/models/pull`, { name, backend: 'ollama' });
    return response.data;
  } catch (error) {
    console.error("Error pulling Ollama model:", error);
    throw error;
  }
};

export const deleteOllamaModel = async (modelName: string): Promise<{ status: string; model: string }> => {
  try {
    const response = await axios.delete(`${BASE_URL}/api/models/${modelName}?backend=ollama`);
    return response.data;
  } catch (error) {
    console.error("Error deleting Ollama model:", error);
    throw error;
  }
};

export const getOllamaModelHealth = async (modelName: string): Promise<ModelHealth> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/models/${modelName}/health?backend=ollama`);
    return response.data;
  } catch (error) {
    console.error("Error checking Ollama model health:", error);
    throw error;
  }
};

// vLLM-specific APIs
export const pullVllmModel = async (model: string): Promise<{ status: string; model: string }> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/vllm/pull`, { model });
    return response.data;
  } catch (error) {
    console.error("Error loading vLLM model:", error);
    throw error;
  }
};

export const deleteVllmModel = async (modelName: string): Promise<{ status: string; model: string }> => {
  try {
    const response = await axios.delete(`${BASE_URL}/api/models/${modelName}?backend=vllm`);
    return response.data;
  } catch (error) {
    console.error("Error deleting vLLM model:", error);
    throw error;
  }
};

// NIM-specific APIs
export const pullNimModel = async (model: string): Promise<{ status: string; model: string }> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/nim/pull`, { model });
    return response.data;
  } catch (error) {
    console.error("Error pulling NIM model:", error);
    throw error;
  }
};

export const deleteNimModel = async (modelName: string): Promise<{ status: string; model: string }> => {
  try {
    const response = await axios.delete(`${BASE_URL}/api/models/${modelName}?backend=nim`);
    return response.data;
  } catch (error) {
    console.error("Error deleting NIM model:", error);
    throw error;
  }
};

// Auto-Benchmark API Functions
export const startAutoBenchmark = async (request: AutoBenchmarkRequest & { backend: string }): Promise<{status: string; message: string}> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/autobenchmark/start`, request);
    return response.data;
  } catch (error) {
    console.error("Error starting auto-benchmark:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to start auto-benchmark');
    }
    throw error;
  }
};

export const stopAutoBenchmark = async (): Promise<{status: string}> => {
  try {
    const response = await axios.post(`${BASE_URL}/api/autobenchmark/stop`);
    return response.data;
  } catch (error) {
    console.error("Error stopping auto-benchmark:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to stop auto-benchmark');
    }
    throw error;
  }
};

export const getAutoBenchmarkStatus = async (): Promise<AutoBenchmarkStatus> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/autobenchmark/status`);
    return response.data;
  } catch (error) {
    console.error("Error getting auto-benchmark status:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to get auto-benchmark status');
    }
    throw error;
  }
};

export const getAutoBenchmarkHistory = async (): Promise<any[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/autobenchmark/history`);
    return response.data;
  } catch (error) {
    console.error("Error getting auto-benchmark history:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to get auto-benchmark history');
    }
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

// WebSocket connection for live logs
export const createLogStream = (containerId: string, onMessage: (log: string) => void) => {
  const ws = new WebSocket(`${WS_BASE}/ws/logs/${containerId}`);
  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data).log);
  };
  return ws;
};

// WebSocket connection for benchmark progress
export const createBenchmarkStream = (onMessage: (data: any) => void) => {
  const ws = new WebSocket(`${WS_BASE}/ws/benchmark`);
  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data));
  };
  return ws;
};
