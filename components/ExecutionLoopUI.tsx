
import React from 'react';
import { EngineMode } from '../types';

interface ExecutionLoopUIProps {
  currentMode: EngineMode;
}

const ExecutionLoopUI: React.FC<ExecutionLoopUIProps> = ({ currentMode }) => {
  const steps = [
    { mode: EngineMode.COHERENCE_AUDIT, label: 'Audit', icon: 'fa-shield-halved', color: 'emerald' },
    { mode: EngineMode.PREDICTIVE_BRANCHING, label: 'Sim', icon: 'fa-diagram-project', color: 'blue' },
    { mode: EngineMode.STABILITY_STEERING, label: 'Steer', icon: 'fa-compass', color: 'amber' },
    { mode: EngineMode.STRATEGIC_REASONING, label: 'Think', icon: 'fa-brain', color: 'purple' },
    { mode: EngineMode.STATE_COMMIT, label: 'Apply', icon: 'fa-check-double', color: 'cyan' },
  ];

  return (
    <div className="h-full flex flex-col justify-between py-1">
      <h4 className="text-[8px] uppercase tracking-widest text-slate-500 mono font-bold text-center mb-2">Phase Vector</h4>
      <div className="flex-1 flex flex-col gap-2">
        {steps.map((step) => {
          const isActive = currentMode === step.mode;
          return (
            <div 
              key={step.mode}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                isActive 
                  ? `bg-${step.color}-500/10 border-${step.color}-500/40 text-${step.color}-400 shadow-sm` 
                  : 'bg-transparent border-transparent text-slate-600'
              }`}
            >
              <i className={`fa-solid ${step.icon} text-xs w-4 text-center`}></i>
              <span className="text-[9px] font-bold uppercase tracking-widest mono">{step.label}</span>
              {isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-current animate-ping"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExecutionLoopUI;
