// src/components/PerformanceTips.tsx
import React from 'react';
import { Zap, Layers, ArrowUp, ArrowDown, Cpu, HardDrive, AlertCircle } from 'lucide-react';

const PerformanceTips: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold"></h2>
      
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
            <p>Best for: Chatbots, real-time applications, user-facing interactions where response time is critical.</p>
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <Layers className="w-6 h-6 text-green-400 mr-2" />
            <h3 className="text-lg font-medium">Batch Mode</h3>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-start">
              <ArrowUp className="w-4 h-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Higher overall throughput (tokens/sec)</p>
            </div>
            <div className="flex items-start">
              <ArrowUp className="w-4 h-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Better GPU utilization</p>
            </div>
            <div className="flex items-start">
              <ArrowDown className="w-4 h-4 text-red-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Slower time to first token</p>
            </div>
            <div className="flex items-start">
              <ArrowDown className="w-4 h-4 text-red-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Higher memory usage at larger batch sizes</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-400 border-t border-gray-700 pt-3">
            <p>Best for: Batch processing, content generation tasks, API services optimized for throughput rather than latency.</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Context Size Impact */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <HardDrive className="w-6 h-6 text-yellow-400 mr-2" />
            <h3 className="text-lg font-medium">Context Size</h3>
          </div>
          
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-300">
              The context size determines how much of the prompt and previous tokens the model can "see".
            </p>
            
            <p className="text-sm text-gray-300 mt-2 ml-2">
              <strong>Smaller contexts (1K - 2K tokens)</strong>:
            </p>
            <div className="flex items-start ml-4">
              <ArrowUp className="w-4 h-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Faster inference</p>
            </div>
            <div className="flex items-start ml-4">
              <ArrowUp className="w-4 h-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Less VRAM usage</p>
            </div>
            
            <p className="text-sm text-gray-300 mt-2 ml-2">
              <strong>Larger contexts (8K+ tokens)</strong>:
            </p>
            <div className="flex items-start ml-4">
              <ArrowUp className="w-4 h-4 text-green-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Better comprehension of long inputs</p>
            </div>
            <div className="flex items-start ml-4">
              <ArrowDown className="w-4 h-4 text-red-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Slower inference, especially on lower-end GPUs</p>
            </div>
            <div className="flex items-start ml-4">
              <ArrowDown className="w-4 h-4 text-red-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">Significantly higher VRAM usage</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-400 border-t border-gray-700 pt-3">
            <p>Recommendation: Only use larger context sizes when you actually need them for your specific task.</p>
          </div>
        </div>
        
        {/* Concurrency Optimization */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center mb-3">
            <Cpu className="w-6 h-6 text-purple-400 mr-2" />
            <h3 className="text-lg font-medium">Concurrency Optimization</h3>
          </div>
          
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-300">
              Finding the optimal concurrency level is crucial for maximizing throughput.
            </p>
            
            <div className="flex items-start mt-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                <strong>Too low concurrency</strong>: Underutilizes GPU, resulting in lower throughput
              </p>
            </div>
            
            <div className="flex items-start mt-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-1 mr-2 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                <strong>Too high concurrency</strong>: Can cause OOM errors or system instability
              </p>
            </div>
            
            <p className="text-sm text-gray-300 mt-3">
              <strong>Strategies:</strong>
            </p>
            
            <ul className="list-disc list-inside text-sm text-gray-300 ml-2">
              <li>Start with concurrency = 1, then increase gradually</li>
              <li>In streaming mode, higher concurrency helps compensate for slower throughput</li>
              <li>In batch mode, use (concurrency ÷ batch_size) to determine request count</li>
              <li>For smaller models (7B), higher concurrency often works well</li>
              <li>For larger models (70B+), lower concurrency may be necessary</li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-400 border-t border-gray-700 pt-3">
            <p>Benchmark different settings to find the sweet spot for your hardware and model.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-3">Benchmark Guidelines</h3>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            For the most accurate benchmarks, follow these guidelines:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 p-3 rounded-lg">
              <h4 className="font-medium text-green-400">For Maximum Throughput</h4>
              <ul className="list-disc list-inside text-sm text-gray-300 ml-2 mt-2">
                <li>Disable streaming</li>
                <li>Use batch size of 4-8</li>
                <li>Set concurrency to 8-16</li>
                <li>Use smaller context size if possible</li>
                <li>Increase max_tokens for longer generations</li>
              </ul>
            </div>
            
            <div className="bg-gray-700 p-3 rounded-lg">
              <h4 className="font-medium text-blue-400">For Lowest Latency</h4>
              <ul className="list-disc list-inside text-sm text-gray-300 ml-2 mt-2">
                <li>Enable streaming</li>
                <li>Use concurrency of 1-4</li>
                <li>Minimize context size</li>
                <li>Keep prompts short and focused</li>
                <li>Consider using a smaller model</li>
              </ul>
            </div>
          </div>
          
          <p className="text-sm text-gray-300 mt-4">
            Remember to run multiple benchmarks and average the results for more reliable measurements. 
            Different models may respond differently to the same settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTips;
