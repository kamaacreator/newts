
import React, { useEffect, useRef } from 'react';

interface DecisionStreamProps {
  logs: string[];
}

const DecisionStream: React.FC<DecisionStreamProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [logs]);

  return (
    <div className="flex-1 glass rounded-3xl p-6 flex flex-col overflow-hidden bg-slate-900/60 border-slate-800">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Resolution Telemetry</h3>
        <div className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[8px] rounded mono uppercase tracking-widest">Live Computation</div>
      </div>
      
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
        {logs.map((log, i) => {
          const isComm = log.includes('[COMMIT]');
          const isSim = log.includes('[SIM]');
          
          return (
            <div 
              key={i} 
              className={`p-2.5 rounded-lg border transition-all text-[10px] mono leading-tight ${
                i === 0 
                  ? 'bg-cyan-600/10 border-cyan-500/30 text-cyan-100' 
                  : 'bg-slate-950/30 border-slate-800/50 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={isComm ? 'text-emerald-400' : isSim ? 'text-blue-400' : 'text-slate-400'}>
                  {log.match(/\[(.*?)\]/)?.[0] || '[CMD]'}
                </span>
                <span className="text-[8px] opacity-40">{new Date().toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="mt-1 font-medium">{log.replace(/\[.*?\]/, '').trim()}</div>
            </div>
          );
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default DecisionStream;
