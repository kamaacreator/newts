// App.tsx
import React, { useState, useEffect } from 'react';
import { EngineState, GlobalObjective, TerminalEntry } from './types';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const CHAT_STORAGE_KEY = 'aetheris_conversations_chat_history';

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setAuthenticated(Boolean(data?.authenticated));
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthenticated(false);
          setAuthChecked(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/agent/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ isRunning: false }),
      });
    } catch {}
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setAuthenticated(false);
      setEngine(null);
      setIsRunning(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Login failed');
      setAuthenticated(true);
      setLoginPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

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
        if (res.status === 401 || res.status === 503) {
          setAuthenticated(false);
          setEngine(null);
          return;
        }
        const data = await res.json();
        setEngine(prev => {
          // If server history is populated, mirror to local storage
          if (data.engine?.terminalHistory && data.engine.terminalHistory.length > 0) {
            try {
              localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data.engine.terminalHistory));
            } catch (e) {}
          } else {
            // If server rebooted with blank history, restore cached local storage
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
    try {
      const res = await fetch('/api/agent/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      if (data?.engine) {
        setEngine(data.engine);
        try {
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data.engine.terminalHistory));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Command execution error:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleStructureFile = async (file: File) => {
    const addLocalError = (message: string) => {
      const entry: TerminalEntry = {
        id: `pdb-error-${Date.now()}`,
        type: 'ERROR',
        content: message,
        timestamp: new Date(),
      };
      setEngine((prev) => prev ? { ...prev, terminalHistory: [entry, ...prev.terminalHistory] } : prev);
    };

    if (file.size > 2_000_000) {
      addLocalError('PDB file exceeds the 2 MB upload limit.');
      return;
    }

    setIsResolving(true);
    try {
      const pdbText = await file.text();
      const response = await fetch('/api/agent/protein/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ pdbText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'PDB analysis failed');
      if (data?.engine) {
        setEngine(data.engine);
        try {
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data.engine.terminalHistory));
        } catch {}
      }
    } catch (error) {
      addLocalError(error instanceof Error ? error.message : 'PDB analysis failed');
    } finally {
      setIsResolving(false);
    }
  };

  const setEnvValue = async (key: 'temperature' | 'znConcentration', val: number) => {
    if (!engine) return;
    const globalEnv = { ...engine.globalEnv, [key]: val };
    
    // Optimistic local update
    setEngine(prev => {
      if (!prev) return prev;
      return { ...prev, globalEnv };
    });

    try {
      const res = await fetch('/api/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalEnv })
      });
      const data = await res.json();
      if (data?.engine) {
        setEngine(data.engine);
      }
    } catch (e) {}
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
    window.location.reload();
  };

  if (!authChecked) return <div className="flex h-screen items-center justify-center bg-black text-white mono text-sm">Checking access...</div>;

  if (!authenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-200 p-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-cyan-900/50 bg-slate-950 p-6 shadow-2xl space-y-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 mono font-bold">Aetheris · Secure Access</div>
        <h1 className="text-xl font-semibold text-white">Sign in to the engine</h1>
        <p className="text-xs text-slate-400 leading-relaxed">Production API access requires configured server credentials. Sessions expire after eight hours.</p>
        <label className="block text-xs text-slate-400">Username
          <input autoComplete="username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" required />
        </label>
        <label className="block text-xs text-slate-400">Password
          <input type="password" autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" required />
        </label>
        {loginError && <p role="alert" className="text-xs text-red-400">{loginError}</p>}
        <button type="submit" disabled={isLoggingIn} className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50">
          {isLoggingIn ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );

  if (!engine) return <div className="flex h-screen items-center justify-center bg-black text-white mono text-sm">Loading Command Control...</div>;

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
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden border-l border-slate-800">
        <Header 
          isRunning={isRunning} 
          setIsRunning={handleToggleRunning} 
          engineMode={engine.mode} 
          logicalTime={engine.logicalTime}
          coherence={engine.systemCoherence}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        {/* Environment Sliders and Domain Navigator Bar */}
        <div className="bg-slate-900/90 border-b border-white/5 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md z-30 shrink-0">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase text-slate-400 mono font-bold tracking-widest mb-1">Temperature Manifold</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="4" max="60" step="0.1" 
                  value={engine.globalEnv.temperature} 
                  onChange={(e) => setEnvValue('temperature', parseFloat(e.target.value))}
                  className="w-36 sm:w-44 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <span className={`text-xs mono font-bold w-14 text-center ${engine.globalEnv.temperature > 42 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
                  {engine.globalEnv.temperature.toFixed(1)}°C
                </span>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[8px] uppercase text-slate-400 mono font-bold tracking-widest mb-1">Cation Buffer ([Zn])</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={engine.globalEnv.znConcentration} 
                  onChange={(e) => setEnvValue('znConcentration', parseFloat(e.target.value))}
                  className="w-36 sm:w-44 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className={`text-xs mono font-bold w-12 text-center ${engine.globalEnv.znConcentration < 0.4 ? 'text-orange-400' : 'text-blue-400'}`}>
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

        <main className="flex-1 overflow-hidden p-3 sm:p-4 bg-slate-950/50 flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-1 gap-3 sm:gap-4 overflow-hidden">
            <div className="flex-[2.2] flex flex-col gap-3 sm:gap-4 overflow-hidden">
              <ObjectiveHub 
                objectives={engine.objectives} 
                onAdd={handleAddObjective} 
                systemLogs={engine.logs}
              />
              
              <div className="flex-[3] min-h-0 glass rounded-[1.5rem] p-4 relative overflow-hidden border-slate-700/50 bg-gradient-to-br from-slate-900/40 to-black/60 shadow-inner">
                <div className="absolute top-4 right-4 z-10 glass px-3 py-1 rounded-lg border-emerald-500/30">
                    <span className="text-[9px] mono text-emerald-400 font-bold uppercase tracking-widest">Attractor Lock: ON</span>
                </div>
                <StateGraph entities={engine.entities} activeId={engine.activeEntityId} activeDomain={engine.activeDomain} mode={engine.mode} />
              </div>

              <div className="flex-1 min-h-[220px] flex gap-3 sm:gap-4 overflow-hidden">
                <div className="flex-[2] min-h-0">
                  <ComputationalTerminal 
                    history={engine.terminalHistory} 
                    onCommand={handleTerminalCommand} 
                    onClear={() => {}}
                    isResolving={isResolving}
                    onStructureFile={handleStructureFile}
                  />
                </div>
                <div className="flex-1 glass rounded-2xl p-4 flex flex-col justify-center bg-slate-900/40 border-slate-800 hidden md:flex">
                  <ExecutionLoopUI currentMode={engine.mode} />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1 hidden xl:flex">
              <DetailsPanel entity={activeEntity} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
