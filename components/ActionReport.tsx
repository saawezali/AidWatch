import React, { useEffect, useState } from 'react';
import { CrisisSignal, ActionPlan, Severity } from '../types';
import { generateSituationReport } from '../services/geminiService';
import { AlertTriangle, CheckCircle2, ShieldAlert, Truck, FileText, X } from 'lucide-react';
import clsx from 'clsx';

interface ActionReportProps {
  signal: CrisisSignal | null;
  onClose: () => void;
}

export const ActionReport: React.FC<ActionReportProps> = ({ signal, onClose }) => {
  const [report, setReport] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (signal) {
      setLoading(true);
      setError(null);
      setReport(null);
      generateSituationReport(signal)
        .then(setReport)
        .catch(err => setError("Failed to generate report. Please try again."))
        .finally(() => setLoading(false));
    }
  }, [signal]);

  if (!signal) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl h-full bg-aid-dark border-l border-gray-700 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-out">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-aid-dark/95 backdrop-blur border-b border-gray-700 p-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={clsx("px-2 py-0.5 rounded text-xs font-bold tracking-wider", 
                signal.severity === Severity.CRITICAL ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
              )}>
                {signal.severity} INCIDENT
              </span>
              <span className="text-gray-400 text-xs font-mono">ID: {signal.id.substring(0,8)}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{signal.type.replace(/_/g, ' ')}</h2>
            <p className="text-gray-400 text-sm flex items-center gap-1">
              {signal.location.region}, {signal.location.country}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Signal Context */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Raw Signal Data</h3>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">"{signal.originalText}"</p>
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
               <span>Source: {signal.sourceType}</span>
               {signal.affectedPopulationEstimate && <span>Est. Affected: {signal.affectedPopulationEstimate.toLocaleString()}</span>}
            </div>
          </div>

          {loading && (
            <div className="space-y-4 animate-pulse">
               <div className="h-4 bg-gray-700 rounded w-3/4"></div>
               <div className="h-4 bg-gray-700 rounded w-full"></div>
               <div className="h-32 bg-gray-800 rounded border border-gray-700 p-4 flex flex-col items-center justify-center text-gray-500 gap-3">
                  <div className="w-6 h-6 border-2 border-aid-accent border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Gemini AI is analyzing logistical routes and risk factors...</span>
               </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {report && !loading && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Analysis */}
              <section>
                <div className="flex items-center gap-2 mb-3 text-aid-accent">
                  <FileText className="w-5 h-5" />
                  <h3 className="font-bold text-lg">Situation Analysis</h3>
                </div>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {report.situationAnalysis}
                </p>
              </section>

              {/* Grid for Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Immediate Needs */}
                <section className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3 text-blue-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-bold">Immediate Needs</h3>
                  </div>
                  <ul className="space-y-2">
                    {report.immediateNeeds.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Safety Risks */}
                <section className="bg-red-900/10 border border-red-900/30 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3 text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="font-bold">Safety Risks</h3>
                  </div>
                  <ul className="space-y-2">
                    {report.safetyRisks.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Logistics */}
              <section className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                 <div className="flex items-center gap-2 mb-3 text-yellow-500">
                    <Truck className="w-5 h-5" />
                    <h3 className="font-bold">Logistics & Challenges</h3>
                  </div>
                  <p className="text-sm text-gray-300">{report.logisticalChallenges}</p>
              </section>

              {/* Recommended Response */}
              <section>
                 <h3 className="font-bold text-white mb-3 border-b border-gray-700 pb-2">Strategic Response Plan</h3>
                 <div className="space-y-3">
                   {report.recommendedResponse.map((step, i) => (
                     <div key={i} className="flex gap-4 p-3 hover:bg-gray-800 rounded transition-colors">
                       <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center font-bold text-gray-300 border border-gray-600">
                         {i + 1}
                       </div>
                       <p className="text-sm text-gray-300 pt-1">{step}</p>
                     </div>
                   ))}
                 </div>
              </section>

               {/* Sources */}
               {report.sources && report.sources.length > 0 && (
                 <div className="text-xs text-gray-500 mt-8 pt-4 border-t border-gray-800">
                    <span className="font-bold">Cross-Check Sources:</span> {report.sources.join(', ')}
                 </div>
               )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};