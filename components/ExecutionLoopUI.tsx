import React from 'react';
import { EngineMode } from '../types';
import { ShieldCheck, GitBranch, Compass, Brain, CheckCheck } from 'lucide-react';

interface ExecutionLoopUIProps {
  currentMode: EngineMode;
}

const ExecutionLoopUI: React.FC<ExecutionLoopUIProps> = ({ currentMode }) => {
  const steps = [
    { 
      mode: EngineMode.COHERENCE_AUDIT, 
      label: 'Audit', 
      icon: ShieldCheck, 
      activeClass: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
    },
    { 
      mode: EngineMode.PREDICTIVE_BRANCHING, 
      label: 'Sim', 
      icon: GitBranch, 
      activeClass: 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
    },
    { 
      mode: EngineMode.STABILITY_STEERING, 
      label: 'Steer', 
      icon: Compass, 
      activeClass: 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
    },
    { 
      mode: EngineMode.STRATEGIC_REASONING, 
      label: 'Think', 
      icon: Brain, 
      activeClass: 'bg-purple-500/10 border-purple-500/40 text-purple-400' 
    },
    { 
      mode: EngineMode.STATE_COMMIT, 
      label: 'Apply', 
      icon: CheckCheck, 
      activeClass: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
    },
  ];

  return (
    <div className="h-full flex flex-col justify-between py-1">
      <h4 className="text-[8px] uppercase tracking-widest text-slate-400 mono font-bold text-center mb-2">Phase Vector</h4>
      <div className="flex-1 flex flex-col gap-2">
        {steps.map((step) => {
          const isActive = currentMode === step.mode;
          const Icon = step.icon;
          return (
            <div 
              key={step.mode}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                isActive 
                  ? `${step.activeClass} shadow-sm` 
                  : 'bg-transparent border-transparent text-slate-500'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-widest mono">{step.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-current animate-ping"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExecutionLoopUI;
