
import React from 'react';
import { UniversalStateObject } from '../types';

interface DetailsPanelProps {
  entity: UniversalStateObject | null;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ entity }) => {
  if (!entity) return (
    <div className="h-full glass rounded-3xl p-6 flex flex-col items-center justify-center text-slate-600">
      <p className="text-sm mono italic">Select computational node...</p>
    </div>
  );

  const isCritical = entity.metrics.aggregationPropensity > 0.4;
  const isSovereign = entity.metrics.stability > 0.99;
  const isApo = entity.metrics.gibbsFreeEnergy > 1.0;

  return (
    <div className="glass rounded-3xl p-6 flex flex-col gap-6 overflow-hidden border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">{entity.identity.name}</h2>
        <div className="flex gap-2 mt-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 mono uppercase">Resolution: Ultra</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded mono uppercase ${isSovereign ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-red-500/10 text-red-500'}`}>
            {isSovereign ? 'Sovereign Lock' : 'Fluctuating Field'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <p className="text-[9px] text-slate-500 uppercase mono mb-1">Hamiltonian ΔG</p>
          <p className={`text-lg font-bold mono ${entity.metrics.gibbsFreeEnergy > -1.0 ? 'text-red-400' : 'text-cyan-400'}`}>
            {entity.metrics.gibbsFreeEnergy.toFixed(2)} 
            <span className="text-[10px] ml-1">kcal/mol</span>
          </p>
        </div>
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <p className="text-[9px] text-slate-500 uppercase mono mb-1">State Occupancy</p>
          <p className={`text-lg font-bold mono ${entity.metrics.stability < 0.9 ? 'text-orange-500' : 'text-emerald-400'}`}>
            {(entity.metrics.stability * 100).toFixed(6)}%
          </p>
        </div>
      </div>

      <div className={`p-4 rounded-xl border transition-all ${isCritical ? 'bg-red-500/10 border-red-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
        <div className="flex justify-between items-center mb-2">
          <p className={`text-[9px] uppercase mono ${isCritical ? 'text-red-400 font-bold' : 'text-slate-500'}`}>Aggregation Propensity</p>
          <span className={`text-xs font-bold mono ${isCritical ? 'text-red-500' : 'text-slate-400'}`}>
            {(entity.metrics.aggregationPropensity * 100).toFixed(6)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-700 ${isCritical ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-emerald-500/40'}`} 
            style={{ width: `${Math.max(1, entity.metrics.aggregationPropensity * 100)}%` }}
          />
        </div>
        {!isCritical && isSovereign && (
          <p className="text-[8px] text-emerald-400/80 mt-2 mono italic uppercase tracking-tighter leading-tight">
            KINETIC LOCK: Transition barriers toward aggregate states maximized.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">Conformational Status</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 mono">Ion-Coordination</span>
            <span className={`text-[10px] mono ${isApo ? 'text-orange-500' : 'text-blue-400'}`}>
              {isApo ? 'APO-EQUILIBRIUM' : 'HOLO-LOCKED'}
            </span>
          </div>
          <div className="flex justify-between items-center bg-slate-950/40 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 mono">Restorative Force</span>
            <span className={`text-[10px] mono ${entity.metrics.rmsd > 0.1 ? 'text-pink-400' : 'text-emerald-400 font-bold'}`}>
              {entity.metrics.rmsd > 0.1 ? 'ATTENUATING' : 'SOVEREIGN'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">Ensemble Distribution</h3>
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
          <div className="flex justify-between text-[10px] mono mb-2 text-slate-400">
            <span>Basin Identifier</span>
            <span>Probability</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between items-center text-[10px] mono text-emerald-300 mb-1">
                <span>Native Sovereign (S0)</span>
                <span className="text-emerald-400">{(entity.metrics.stability * 100).toFixed(6)}%</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${entity.metrics.stability * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-[10px] mono text-slate-500 mb-1">
                <span>Non-Native Ensemble</span>
                <span className="text-slate-500">{( (1 - entity.metrics.stability) * 100).toFixed(6)}%</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-700" style={{ width: `${(1 - entity.metrics.stability) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsPanel;
