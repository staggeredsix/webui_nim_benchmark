// src/components/PerformanceTips.tsx
import React from 'react';
import { Zap, Layers, ArrowUp, ArrowDown, Cpu, HardDrive, AlertCircle } from 'lucide-react';

const PerformanceTips: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Performance Optimization Guide</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Streaming vs Batching */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <Zap className="w-6 h-6 text-blue-400 mr-2" />
            <h3 className="text-lg font-medium">Streaming Mode</h3>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-start">
              <ArrowUp className="w-4 h-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Faster time to first token</p>
            </div>
            <div className="flex items-start">
              <ArrowUp className="w-4 h-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Better for interactive applications</p>
            </div>
            <div className="flex items-start">
              <ArrowDown className="w-4 h-4 text-red-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Lower overall throughput (tokens/sec)</p>
            </div>
            <div className="flex items-start">
              <ArrowDown className="w-4 h-4 text-red-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Less efficient GPU utilization</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-400 border-t border-gray-700 pt-3">
            <p>Best for:
