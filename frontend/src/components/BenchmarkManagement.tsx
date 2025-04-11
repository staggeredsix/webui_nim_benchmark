// src/components/BenchmarkManagement.tsx
import React, { useState } from "react";
import { startBenchmark } from "../services/api";
import type { BenchmarkConfig } from "../types/benchmark";

const BenchmarkManagement: React.FC = () => {
  const [totalRequests, setTotalRequests] = useState(100);
  const [concurrencyLevel, setConcurrencyLevel] = useState(10);
  const [maxTokens, setMaxTokens] = useState(50);
  const [prompt, setPrompt] = useState("Translate the following text:");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartBenchmark = async () => {
    setIsSubmitting(true);
    const config: BenchmarkConfig = {
      total_requests: totalRequests,
      concurrency_level: concurrencyLevel,
      max_tokens: maxTokens,
      name: prompt,
      prompt: prompt,
      nim_id: "",  // This should be selected by the user
      gpu_count: 1,  // Default to 1 GPU
      stream: true   // Default to streaming enabled
    };

    try {
      const response = await startBenchmark(config);
      alert(`Benchmark started with Run ID: ${response.run_id}`);
    } catch (error) {
      console.error("Error starting benchmark:", error);
      alert("Failed to start benchmark. Please check your configuration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-4">
      <h2 className="text-xl font-bold">Benchmark Management</h2>
      <h2 className="text-xl font-bold">Benchmark Management</h2>

      <div className="flex flex-col space-y-2">
        <label className="flex flex-col">
          <span>Total Requests:</span>
          <input
            type="number"
            value={totalRequests}
            onChange={(e) => setTotalRequests(Number(e.target.value))}
            className="p-2 bg-gray-700 rounded"
            min={1}
          />
        </label>

        <label className="flex flex-col">
          <span>Concurrency Level:</span>
          <input
            type="number"
            value={concurrencyLevel}
            onChange={(e) => setConcurrencyLevel(Number(e.target.value))}
            className="p-2 bg-gray-700 rounded"
            min={1}
          />
        </label>

        <label className="flex flex-col">
          <span>Max Tokens:</span>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="p-2 bg-gray-700 rounded"
            min={1}
          />
        </label>

        <label className="flex flex-col">
          <span>Prompt:</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="p-2 bg-gray-700 rounded"
          />
        </label>
      </div>

      <button
        onClick={handleStartBenchmark}
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isSubmitting ? "Starting..." : "Start Benchmark"}
      </button>
    </div>
  );
};

export default BenchmarkManagement;