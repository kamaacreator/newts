
import React from 'react';
import { EngineMode } from '../types';

interface HeaderProps {
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  engineMode: EngineMode;
  logicalTime: number;
  coherence: number;
}

const Header: React.FC<HeaderProps> = ({ isRunning, setIsRunning, engineMode, logicalTime, coherence }) => {
  return (
    <header className="h-16 glass border-t-0 border-x-0 flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <i className="fa-solid fa-microchip text-white text-xl"></i>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight">AETHERIS</h1>
          <p className="text-[10px] text-cyan-500/80 uppercase tracking-widest mono">Deterministic Intel Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex flex-col items-center">
          <span className="text-[10px] text-gray-500 uppercase mono">Logical Transition Order</span>
          <span className="text-lg font-bold text-white mono">T-{logicalTime.toString().padStart(6, '0')}</span>
        </div>

        <div className="h-8 w-px bg-white/10 hidden md:block"></div>

        <a 
          href="https://colab.research.google.com/" 
          target="_blank" 
          rel="noreferrer"
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 transition-all"
        >
          <i className="fa-solid fa-flask text-[10px]"></i>
          <span className="text-[9px] uppercase tracking-widest mono font-bold">Layer 3: Colab</span>
        </a>

        <div className="h-8 w-px bg-white/10 hidden lg:block"></div>

        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] text-gray-500 uppercase mono">Global Coherence</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-1000" 
                style={{ width: `${coherence * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold mono">{(coherence * 100).toFixed(1)}%</span>
          </div>
        </div>

        <button 
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
            isRunning 
              ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
          }`}
        >
          <i className={`fa-solid ${isRunning ? 'fa-pause' : 'fa-play'}`}></i>
          <span className="text-xs uppercase tracking-widest">{isRunning ? 'Halt Loop' : 'Initiate Loop'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
