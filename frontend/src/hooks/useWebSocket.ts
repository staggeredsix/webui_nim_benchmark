// src/hooks/useWebSocket.ts
import { useState, useEffect } from 'react';
import type { MetricsData } from '@/types/metrics';

export interface WebSocketState {
  metrics: MetricsData | null;
  isConnected: boolean;
  error: string | null;
}

const useWebSocket = (url: string): WebSocketState => {
  const [state, setState] = useState<WebSocketState>({
    metrics: null,
    isConnected: false,
    error: null
  });

  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'metrics_update' && data.metrics) {
          setState(prev => ({ 
            ...prev, 
            metrics: data.metrics,
            error: null
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to parse metrics data'
        }));
      }
    };

    ws.onopen = () => {
      setState(prev => ({ 
        ...prev, 
        isConnected: true,
        error: null
      }));
    };

    ws.onclose = () => {
      setState(prev => ({ 
        ...prev, 
        isConnected: false,
        error: 'Connection lost'
      }));
    };

    ws.onerror = () => {
      setState(prev => ({ 
        ...prev,
        error: 'Failed to connect to metrics service'
      }));
    };

    return () => ws.close();
  }, [url]);

  return state;
};

export default useWebSocket;