// App.tsx
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Monitor, Settings as SettingsIcon, History as HistoryIcon, Home as HomeIcon } from 'lucide-react';
import Home from '@/routes/Home';
import Benchmarks from '@/routes/Benchmarks';
import Settings from '@/routes/Settings';
import useWebSocket from '@/hooks/useWebSocket';
const WS_BASE = `ws://${window.location.hostname}:7000`;

const NavLink = ({ to, children, icon: Icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-green-600 text-white' 
          : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <Icon className="w-5 h-5 mr-2" />
      <span>{children}</span>
    </Link>
  );
};

const MainLayout = () => {
  const { metrics, error: wsError } = useWebSocket(`${WS_BASE}/ws/metrics`);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 p-4 flex flex-col">
        <div className="mb-8">
          <Link to="/" className="flex items-center space-x-2">
            <Monitor className="w-8 h-8 text-green-500" />
            <span className="text-xl font-bold">Ollama Bench</span>
          </Link>
        </div>
        
        <nav className="space-y-2">
          <NavLink to="/" icon={HomeIcon}>Dashboard</NavLink>
          <NavLink to="/benchmarks" icon={Monitor}>Benchmarks</NavLink>
          <NavLink to="/settings" icon={SettingsIcon}>Settings</NavLink>
        </nav>

        <div className="mt-auto">
          {metrics && (
            <div className="p-4 bg-gray-900 rounded-lg space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                {metrics.gpu_metrics?.map((gpu, index) => (
                  <div key={index} className="p-2 bg-gray-800 rounded">
                    <div className="text-xs text-gray-400">GPU {index}</div>
                    <div className="font-medium">{gpu.gpu_utilization?.toFixed(1)}%</div>
                    <div className="text-xs text-gray-400">{gpu.gpu_memory_used?.toFixed(1)} GB</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                TPS: {metrics.tokens_per_second?.toFixed(1)} | Peak: {metrics.peak_tps?.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-gray-950 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Ollama Benchmark Manager</h1>
            <div className="flex items-center space-x-4">
              <div className="text-gray-400">
                <span>TPS: </span>
                <span className="text-white font-medium">
                  {metrics?.tokens_per_second?.toFixed(1) || '0.0'}
                </span>
              </div>
              <div className="text-gray-400">
                <span>Peak: </span>
                <span className="text-white font-medium">
                  {metrics?.peak_tps?.toFixed(1) || '0.0'}
                </span>
              </div>
              <Link 
                to="/benchmarks" 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                New Benchmark
              </Link>
            </div>
          </div>
          
          {metrics && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              {metrics.gpu_metrics.map((gpu, index) => (
                <div key={index} className="bg-gray-900 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">GPU {index}</div>
                  <div className="grid grid-cols-2 gap-x-4 text-sm mt-1">
                    <div>Util:</div>
                    <div>{gpu.gpu_utilization?.toFixed(1) || '0.0'}%</div>
                    <div>Mem:</div>
                    <div>{gpu.gpu_memory_used?.toFixed(1) || '0.0'} GB</div>
                    <div>Temp:</div>
                    <div>{gpu.gpu_temp?.toFixed(0) || '0'}°C</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </header>

        <main className="p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/benchmarks" element={<Benchmarks />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
};

export default App;
