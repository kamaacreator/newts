
import React, { useState, useEffect, useRef } from 'react';
import { GlobalObjective } from '../types';

interface ObjectiveHubProps {
  objectives: GlobalObjective[];
  onAdd: (label: string) => void;
  systemLogs: string[];
}

const ObjectiveHub: React.FC<ObjectiveHubProps> = ({ objectives, onAdd, systemLogs }) => {
  const [input, setInput] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [systemLogs]);

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  };

  return (
    <div className="glass rounded-2xl border-slate-700/30 bg-slate-950/40 overflow-hidden flex flex-col h-[180px]">
      {/* Header Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-black/40 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="w-1 h-3 bg-emerald-500/40 rounded-full"></span>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mono">
            Systems Response Terminal // Objective_Plane
          </h3>
        </div>
        <div className="flex gap-4 text-[8px] mono text-slate-500 items-center">
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-satellite-dish text-emerald-500/50"></i>
            TELEMETRY: ACTIVE
          </span>
          <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">
            FIELD_SYNC: OK
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Live Logs */}
        <div className="flex-[1.5] border-r border-slate-800/50 flex flex-col min-w-0">
          <div 
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar scroll-smooth"
          >
            {systemLogs.map((log, idx) => (
              <div key={idx} className="flex gap-2 text-[9px] mono items-start animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}]</span>
                <span className={`${log.includes('[SYSTEM]') ? 'text-cyan-400' : log.includes('[COMMIT]') ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {log}
                </span>
              </div>
            ))}
            {systemLogs.length === 0 && (
              <div className="h-full flex items-center justify-center opacity-10">
                <span className="text-[10px] mono">ESTABLISHING STREAM...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Priorities */}
        <div className="flex-1 flex flex-col bg-black/20">
          <div className="px-3 py-1.5 border-b border-slate-800/50 bg-slate-900/30">
            <span className="text-[8px] font-bold uppercase text-slate-500 tracking-tighter mono">Active Priorities</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {objectives.map(obj => (
              <div key={obj.id} className="group relative">
                <div className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-all ${
                  obj.status === 'ACTIVE' 
                    ? 'bg-emerald-500/5 border-emerald-500/20' 
                    : 'bg-slate-800/20 border-slate-800 opacity-60'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    obj.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-600'
                  }`}></div>
                  <span className="text-[9px] font-bold text-slate-300 mono truncate">{obj.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Input Area */}
      <div className="p-2 border-t border-slate-800/50 bg-black/40">
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 mono font-bold pointer-events-none group-focus-within:text-emerald-400 transition-colors">
            STRATEGY_INJECT_&gt;
          </div>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') handleAdd(); }}
            placeholder=""
            className="w-full bg-slate-900/40 border border-slate-800/80 rounded-lg py-1.5 pl-24 pr-10 text-[10px] mono text-emerald-400 outline-none focus:border-emerald-500/30 focus:bg-slate-900/60 transition-all shadow-inner"
          />
          <button 
            onClick={handleAdd}
            className="absolute right-1 top-1 bottom-1 px-3 bg-emerald-600/10 text-emerald-400 rounded-md hover:bg-emerald-600/20 border border-emerald-600/20 transition-all flex items-center justify-center"
          >
            <i className="fa-solid fa-arrow-right-to-bracket text-[10px]"></i>
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(52, 211, 153, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default ObjectiveHub;
