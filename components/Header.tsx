import React from 'react';
import { EngineMode } from '../types';
import { Cpu, Play, Pause, Menu, FlaskConical, LogOut } from 'lucide-react';

interface HeaderProps {
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  engineMode: EngineMode;
  logicalTime: number;
  coherence: number;
  onToggleMobileMenu?: () => void;
  onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  isRunning, 
  setIsRunning, 
  logicalTime, 
  coherence,
  onToggleMobileMenu,
  onSignOut,
}) => {
  return (
    <header className="h-16 glass border-t-0 border-x-0 flex items-center justify-between px-4 sm:px-6 z-20 shrink-0">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button 
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <Cpu className="text-white" size={18} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">AETHERIS</h1>
          <p className="text-[10px] text-cyan-400/90 uppercase tracking-widest mono">Deterministic Intel Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden md:flex flex-col items-center">
          <span className="text-[9px] text-slate-500 uppercase mono">Logical Transition Order</span>
          <span className="text-base font-bold text-white mono">T-{logicalTime.toString().padStart(6, '0')}</span>
        </div>

        <div className="h-8 w-px bg-white/10 hidden md:block"></div>

        <a 
          href="https://colab.research.google.com/" 
          target="_blank" 
          rel="noreferrer"
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 transition-all"
        >
          <FlaskConical size={12} />
          <span className="text-[9px] uppercase tracking-widest mono font-bold">Layer 3: Colab</span>
        </a>

        <div className="h-8 w-px bg-white/10 hidden xl:block"></div>

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[9px] text-slate-500 uppercase mono">Global Coherence</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700" 
                style={{ width: `${coherence * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold mono text-emerald-400">{(coherence * 100).toFixed(1)}%</span>
          </div>
        </div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-[9px] uppercase tracking-wider mono"
            title="Sign out and end this session"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        )}

        <button 
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold transition-all text-xs uppercase tracking-wider mono ${
            isRunning 
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
          }`}
        >
          {isRunning ? <Pause size={12} /> : <Play size={12} />}
          <span>{isRunning ? 'Halt Loop' : 'Initiate Loop'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
