
// App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EngineMode, UniversalStateObject, EngineState, ScientificDomain, GlobalObjective, StatePoint, TerminalEntry, ResolutionData, MutationalImpact } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StateGraph from './components/StateGraph';
import DetailsPanel from './components/DetailsPanel';
import ExecutionLoopUI from './components/ExecutionLoopUI';
import ObjectiveHub from './components/ObjectiveHub';
import DomainNavigator from './components/DomainNavigator';
import ComputationalTerminal from './components/ComputationalTerminal';

const App: React.FC = () => {
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const CHAT_STORAGE_KEY = 'aetheris_conversations_chat_history';

  // Load from local storage immediately on mount so conversations are never lost during server reboot
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CHAT_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          fetch('/api/agent/sync-storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terminalHistory: parsed })
          }).then(res => res.json()).then(data => {
            if (data?.engine) setEngine(data.engine);
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Local storage restore notice:', e);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/agent/telemetry');
        const data = await res.json();
        setEngine(prev => {
          // If server history is populated, mirror to local storage
          if (data.engine?.terminalHistory && data.engine.terminalHistory.length > 0) {
            try {
              localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data.engine.terminalHistory));
            } catch (e) {}
          } else {
            // If server rebooted with blank history, try restoring cached local storage
            try {
              const cached = localStorage.getItem(CHAT_STORAGE_KEY);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  data.engine.terminalHistory = parsed;
                  fetch('/api/agent/sync-storage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ terminalHistory: parsed })
                  }).catch(() => {});
                }
              }
            } catch (e) {}
          }
          return data.engine;
        });
        setIsRunning(data.isRunning);
      } catch(e) {}
    };
    
    fetchTelemetry();
    interval = setInterval(fetchTelemetry, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleRunning = async (running: boolean) => {
    setIsRunning(running);
    await fetch('/api/agent/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRunning: running })
    });
  };

  const handleTerminalCommand = async (command: string) => {
    setIsResolving(true);
    await fetch('/api/agent/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    setIsResolving(false);
  };

  const setEnvValue = async (key: 'temperature' | 'znConcentration', val: number) => {
    if (!engine) return;
    const globalEnv = { ...engine.globalEnv, [key]: val };
    setEngine({ ...engine, globalEnv });
    await fetch('/api/agent/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ globalEnv })
    });
  };

  const activeEntity = engine?.entities.find(e => e.id === engine.activeEntityId) || null;

  const handleAddObjective = async (label: string) => {
    if (!engine) return;
    const newObj: GlobalObjective = {
      id: `obj-${Date.now()}`,
      label: label.toUpperCase(),
      status: 'ACTIVE',
      priority: engine.objectives.length + 1
    };
    const objectives = [newObj, ...engine.objectives];
    const logs = [`[STRATEGY] New Priority Injected: ${label.toUpperCase()}`, ...engine.logs];
    setEngine({ ...engine, objectives, logs });
    await fetch('/api/agent/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectives, logs })
    });
  };

  const handleReset = () => {
    // We could add an endpoint if we wanted, for now just reload
    window.location.reload();
  };

  if (!engine) return <div className="flex h-screen items-center justify-center bg-black text-white">Loading Command Control...</div>;

  return (
    <div className="flex h-screen w-screen bg-[#020617] overflow-hidden select-none text-slate-200 font-inter">
      <Sidebar 
        entities={engine.entities} 
        activeId={engine.activeEntityId} 
        setActiveId={async (id) => {
            const e = engine.entities.find(ent => ent.id === id);
            const activeDomain = e?.identity.domain || engine.activeDomain;
            setEngine(p => {
               if(!p) return p;
               return { ...p, activeEntityId: id, activeDomain };
            });
            await fetch('/api/agent/state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activeEntityId: id, activeDomain })
            });
        }}
        activeDomain={engine.activeDomain}
        onReset={handleReset}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden border-l border-slate-800">
        <Header 
          isRunning={isRunning} 
          setIsRunning={handleToggleRunning} 
          engineMode={engine.mode} 
          logicalTime={engine.logicalTime}
          coherence={engine.systemCoherence}
        />
        
        <div className="bg-slate-900/90 border-b border-white/5 px-6 py-2 flex items-center justify-between backdrop-blur-md z-30">
          <div className="flex items-center gap-10">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase text-slate-500 mono font-bold tracking-widest mb-1">Temperature Manifold</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="4" max="60" step="0.1" 
                  value={engine.globalEnv.temperature} 
                  onChange={(e) => setEnvValue('temperature', parseFloat(e.target.value))}
                  className="w-48 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-600"
                />
                <span className={`text-sm mono font-bold w-16 text-center ${engine.globalEnv.temperature > 42 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                  {engine.globalEnv.temperature.toFixed(1)}°C
                </span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[8px] uppercase text-slate-500 mono font-bold tracking-widest mb-1">Cation Buffer ([Zn])</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={engine.globalEnv.znConcentration} 
                  onChange={(e) => setEnvValue('znConcentration', parseFloat(e.target.value))}
                  className="w-48 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className={`text-sm mono font-bold w-12 text-center ${engine.globalEnv.znConcentration < 0.4 ? 'text-orange-500' : 'text-blue-400'}`}>
                  {(engine.globalEnv.znConcentration * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          
          <DomainNavigator 
            activeDomain={engine.activeDomain} 
            onDomainChange={async (d) => {
                const firstEntityInDomain = engine.entities.find(e => e.identity.domain === d);
                const activeEntityId = firstEntityInDomain ? firstEntityInDomain.id : engine.activeEntityId;
                setEngine(p => {
                    if(!p) return p;
                    return { ...p, activeDomain: d, activeEntityId };
                });
                await fetch('/api/agent/state', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ activeDomain: d, activeEntityId })
                });
            }} 
          />
        </div>

        <main className="flex-1 overflow-hidden p-4 bg-slate-950/50 flex flex-col gap-4">
          <div className="flex flex-1 gap-4 overflow-hidden">
            <div className="flex-[2.2] flex flex-col gap-4 overflow-hidden">
              <ObjectiveHub 
                objectives={engine.objectives} 
                onAdd={handleAddObjective} 
                systemLogs={engine.logs}
              />
              
              <div className="flex-[3] min-h-0 glass rounded-[2rem] p-4 relative overflow-hidden border-slate-700/50 bg-gradient-to-br from-slate-900/40 to-black/60 shadow-inner">
                <div className="absolute top-4 right-4 z-10 glass px-3 py-1 rounded-lg border-emerald-500/20">
                    <span className="text-[9px] mono text-emerald-400 font-bold uppercase tracking-widest">Attractor Lock: ON</span>
                </div>
                <StateGraph entities={engine.entities} activeId={engine.activeEntityId} activeDomain={engine.activeDomain} mode={engine.mode} />
              </div>

              <div className="flex-1 min-h-[220px] flex gap-4 overflow-hidden">
                <div className="flex-[2] min-h-0">
                  <ComputationalTerminal 
                    history={engine.terminalHistory} 
                    onCommand={handleTerminalCommand} 
                    onClear={async () => {
                         try {
                           const existing = JSON.parse(localStorage.getItem('aetheris_archived_conversations') || '[]');
                           localStorage.setItem('aetheris_archived_conversations', JSON.stringify([...existing, ...(engine.terminalHistory || [])]));
                         } catch (e) {}
                         setEngine(p => { if(!p) return p; return { ...p, terminalHistory: [] }});
                         await fetch('/api/agent/state', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ terminalHistory: [] })
                         });
                    }}
                    isResolving={isResolving} 
                  />
                </div>
                <div className="flex-1 glass rounded-2xl p-4 flex flex-col justify-center bg-slate-900/40 border-slate-800">
                  <ExecutionLoopUI currentMode={engine.mode} />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1">
              <DetailsPanel entity={activeEntity} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

