import React from 'react';
import { CrisisSignal, Severity } from '../types';
import { AlertTriangle, TrendingUp, Radio, Activity, MapPin } from 'lucide-react';
import clsx from 'clsx';

interface AlertFeedProps {
  signals: CrisisSignal[];
  loading: boolean;
  onScan: () => void;
  onSelect: (signal: CrisisSignal) => void;
  selectedId?: string;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ signals, loading, onScan, onSelect, selectedId }) => {
  
  const sortedSignals = [...signals].sort((a, b) => {
    // Critical first
    const sevScore = (s: string) => s === 'CRITICAL' ? 4 : s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1;
    return sevScore(b.severity) - sevScore(a.severity);
  });

  return (
    <div className="flex flex-col h-full bg-aid-panel border-r border-gray-700 w-full md:w-96 shrink-0">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-aid-dark/50">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <Radio className="w-4 h-4 text-aid-accent" />
          Signal Stream
        </h2>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-700 font-mono">
            {signals.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && signals.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
             <div className="w-8 h-8 border-2 border-aid-accent border-t-transparent rounded-full animate-spin"></div>
             <p className="text-sm">Scanning public frequencies...</p>
           </div>
        ) : (
          sortedSignals.map((signal) => (
            <div 
              key={signal.id}
              onClick={() => onSelect(signal)}
              className={clsx(
                "p-3 rounded-lg border cursor-pointer transition-all hover:translate-x-1 group relative overflow-hidden",
                selectedId === signal.id 
                  ? "bg-aid-accent/10 border-aid-accent shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                  : "bg-gray-800/40 border-gray-700 hover:border-gray-500 hover:bg-gray-800"
              )}
            >
              {/* Severity Strip */}
              <div className={clsx(
                "absolute left-0 top-0 bottom-0 w-1",
                signal.severity === Severity.CRITICAL ? "bg-red-500 animate-pulse" :
                signal.severity === Severity.HIGH ? "bg-orange-500" :
                signal.severity === Severity.MEDIUM ? "bg-yellow-500" : "bg-blue-500"
              )} />

              <div className="pl-3">
                <div className="flex justify-between items-start mb-1">
                  <span className={clsx(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider",
                    signal.severity === Severity.CRITICAL ? "bg-red-500/20 text-red-400" :
                    signal.severity === Severity.HIGH ? "bg-orange-500/20 text-orange-400" :
                    "bg-blue-500/20 text-blue-400"
                  )}>
                    {signal.severity}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">{new Date(signal.timestamp).toLocaleTimeString()}</span>
                </div>
                
                <h3 className="text-sm font-medium text-gray-200 leading-tight mb-1 line-clamp-2">
                  {signal.summary}
                </h3>
                
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[80px]">{signal.location.country}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span>{signal.confidenceScore}% Conf.</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {!loading && signals.length === 0 && (
            <div className="text-center p-8 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No active signals detected.</p>
                <p className="text-xs mt-1">System monitoring is active.</p>
            </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 bg-aid-dark/50">
        <button 
          onClick={onScan}
          disabled={loading}
          className="w-full bg-aid-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          {loading ? (
             <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning...</>
          ) : (
             <><TrendingUp className="w-4 h-4" /> Scan Public Sources</>
          )}
        </button>
      </div>
    </div>
  );
};