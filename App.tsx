import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { AlertFeed } from './components/AlertFeed';
import MapVisualizer from './components/MapVisualizer';
import { ActionReport } from './components/ActionReport';
import { scanPublicSignals } from './services/geminiService';
import { CrisisSignal } from './types';
import { Settings, BarChart3, Database } from 'lucide-react';

const App: React.FC = () => {
  const [signals, setSignals] = useState<CrisisSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<CrisisSignal | null>(null);

  // Initial load
  useEffect(() => {
    handleScan();
  }, []);

  const handleScan = useCallback(async () => {
    setLoading(true);
    // Keep existing signals if any, but ideally we merge or replace. 
    // For demo simplicity, we'll replace or append if distinct IDs were real.
    // Here we just replace to show the "Latest" snapshot.
    try {
      const newSignals = await scanPublicSignals();
      setSignals(newSignals);
      
      // Auto select the first critical one if available
      const critical = newSignals.find(s => s.severity === 'CRITICAL');
      if (critical && !selectedSignal) {
          // Optional: Auto-select behavior
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedSignal]);

  const handleSelectSignal = (signal: CrisisSignal) => {
    setSelectedSignal(signal);
  };

  const handleCloseReport = () => {
    setSelectedSignal(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-aid-dark text-gray-200 overflow-hidden font-sans">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Sidebar Feed */}
        <AlertFeed 
          signals={signals} 
          loading={loading} 
          onScan={handleScan}
          onSelect={handleSelectSignal}
          selectedId={selectedSignal?.id}
        />

        {/* Main Dashboard Area */}
        <main className="flex-1 relative flex flex-col min-w-0">
          
          {/* Dashboard Stats / Filters Bar */}
          <div className="h-14 bg-aid-dark border-b border-gray-700 flex items-center px-6 gap-6 text-sm text-gray-400">
             <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <Database className="w-4 h-4" />
                <span>Sources: 12,403 scanned</span>
             </div>
             <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <BarChart3 className="w-4 h-4" />
                <span>Global Threat Level: MODERATE</span>
             </div>
             <div className="ml-auto flex gap-2">
                <select className="bg-gray-800 border-none text-xs rounded px-2 py-1 focus:ring-1 focus:ring-aid-accent outline-none">
                    <option>View: Global Map</option>
                    <option>View: List Only</option>
                </select>
             </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative bg-gray-900 p-4">
            <MapVisualizer 
              signals={signals} 
              onSelectSignal={handleSelectSignal} 
              selectedSignalId={selectedSignal?.id}
            />
            
            {/* Legend Overlay */}
            <div className="absolute bottom-8 right-8 bg-gray-900/80 backdrop-blur p-4 rounded-lg border border-gray-700 text-xs shadow-xl">
               <h4 className="font-bold mb-2 text-gray-300 uppercase tracking-wider">Severity Index</h4>
               <div className="space-y-2">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Critical</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span> High</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Medium</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Low</div>
               </div>
            </div>
          </div>

        </main>
        
        {/* Report Slide-over */}
        {selectedSignal && (
            <ActionReport 
              signal={selectedSignal} 
              onClose={handleCloseReport} 
            />
        )}

      </div>
    </div>
  );
};

export default App;