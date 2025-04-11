// src/components/LogViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Download, X, ChevronDown, ChevronUp } from 'lucide-react';

interface LogViewerProps {
  containerId: string | null;
  isContainerRunning: boolean;
  onSaveLogs?: (filename: string) => void;
  gpuInfo?: Array<{
    name?: string;
    gpu_utilization: number;
    gpu_memory_used: number;
    gpu_temp: number;
    power_draw: number;
  }>;
}

const LogViewer: React.FC<LogViewerProps> = ({ containerId, isContainerRunning, onSaveLogs, gpuInfo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [logFilename, setLogFilename] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;

    if (isOpen && containerId && isContainerRunning) {
      ws = new WebSocket(`ws://localhost:7000/ws/logs/${containerId}`);
      wsRef.current = ws;
      
      ws.onmessage = (event) => {
        const logData = JSON.parse(event.data);
        setLogs(prev => [...prev, logData.log]);
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setLogs(prev => [...prev, 'Error connecting to log stream']);
      };
    }

    return () => {
      if (ws) {
        ws.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, containerId, isContainerRunning]);

  const handleSaveLogs = async () => {
    if (!logFilename.trim() || !onSaveLogs) return;
    setIsSaving(true);
    await onSaveLogs(logFilename);
    setIsSaving(false);
    setLogFilename('');
  };

  if (!containerId || !isContainerRunning) {
    return null;
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-300 hover:text-white"
      >
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        <span>Live Logs Available...</span>
      </button>

      {isOpen && (
        <div className="mt-2 bg-gray-900 rounded-lg border border-gray-700">
          {/* GPU Info Section */}
          {gpuInfo && gpuInfo.length > 0 && (
            <div className="p-2 border-b border-gray-700">
              <div className="text-sm font-medium text-gray-400">
                GPUs used in this benchmark:
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {gpuInfo.map((gpu, index) => (
                  <div key={index} className="text-sm text-gray-300">
                    GPU {index}: {gpu.name || 'Unknown'}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-2 border-b border-gray-700 flex justify-between items-center">
            <span className="text-sm font-medium">Container Logs</span>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Log filename"
                value={logFilename}
                onChange={(e) => setLogFilename(e.target.value)}
                className="px-2 py-1 text-sm bg-gray-800 rounded border border-gray-600"
              />
              <button
                onClick={handleSaveLogs}
                disabled={!logFilename.trim() || isSaving}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="h-64 overflow-y-auto p-2 font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-300 whitespace-pre-wrap">
                {log}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;