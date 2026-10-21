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

  const domain = entity.identity.domain;

  // BIOLOGY DOMAIN
  if (domain === 'BIOLOGY') {
    const isCritical = entity.metrics.aggregationPropensity > 0.4;
    const isSovereign = entity.metrics.stability > 0.99;
    const isApo = entity.metrics.gibbsFreeEnergy > -2.0;

    return (
      <div className="glass rounded-3xl p-6 flex flex-col gap-6 overflow-hidden border-slate-800 bg-slate-900/40">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[8px] mono text-emerald-400 font-bold uppercase tracking-wider">Domain: Biophysics</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest mt-0.5">{entity.identity.name}</h2>
            </div>
            <span className={`text-[8px] px-2 py-0.5 rounded mono uppercase font-bold border ${isSovereign ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
              {isSovereign ? 'Sovereign Lock' : 'Fluctuating Field'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{entity.identity.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[8px] text-slate-500 uppercase mono mb-1 font-bold">Hamiltonian ΔG</p>
            <p className={`text-base font-bold mono ${entity.metrics.gibbsFreeEnergy > -2.0 ? 'text-red-400' : 'text-cyan-400'}`}>
              {entity.metrics.gibbsFreeEnergy.toFixed(2)} 
              <span className="text-[9px] ml-1 text-slate-400">kcal/mol</span>
            </p>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[8px] text-slate-500 uppercase mono mb-1 font-bold">State Occupancy</p>
            <p className={`text-base font-bold mono ${entity.metrics.stability < 0.9 ? 'text-orange-400' : 'text-emerald-400'}`}>
              {(entity.metrics.stability * 100).toFixed(4)}%
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${isCritical ? 'bg-red-500/10 border-red-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
          <div className="flex justify-between items-center mb-2">
            <p className={`text-[8px] uppercase mono font-bold ${isCritical ? 'text-red-400' : 'text-slate-400'}`}>Aggregation Propensity</p>
            <span className={`text-xs font-bold mono ${isCritical ? 'text-red-400' : 'text-slate-300'}`}>
              {(entity.metrics.aggregationPropensity * 100).toFixed(4)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${isCritical ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-emerald-500/50'}`} 
              style={{ width: `${Math.max(1, Math.min(100, entity.metrics.aggregationPropensity * 100))}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">Conformational Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-400 mono">Ion-Coordination</span>
              <span className={`text-[9px] mono font-bold ${isApo ? 'text-orange-400' : 'text-cyan-400'}`}>
                {isApo ? 'APO-EQUILIBRIUM' : 'HOLO-LOCKED'}
              </span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-400 mono">Backbone RMSD</span>
              <span className="text-[9px] mono font-bold text-cyan-300">
                {entity.metrics.rmsd.toFixed(2)} Å
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ENGINEERING DOMAIN
  if (domain === 'ENGINEERING') {
    const compliance = typeof entity.metrics.gibbsFreeEnergy === 'number' ? entity.metrics.gibbsFreeEnergy : 0.12;
    const isOptimal = compliance <= 0.20;

    return (
      <div className="glass rounded-3xl p-6 flex flex-col gap-6 overflow-hidden border-slate-800 bg-slate-900/40">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[8px] mono text-blue-400 font-bold uppercase tracking-wider">Domain: Structural FEA</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest mt-0.5">{entity.identity.name}</h2>
            </div>
            <span className={`text-[8px] px-2 py-0.5 rounded mono uppercase font-bold border ${isOptimal ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
              {isOptimal ? 'SIMP Converged' : 'Coarse Mesh'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{entity.identity.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[8px] text-slate-500 uppercase mono mb-1 font-bold">Strain Energy (Compliance)</p>
            <p className="text-base font-bold mono text-cyan-400">
              {compliance.toFixed(2)} 
              <span className="text-[9px] ml-1 text-slate-400">Joules</span>
            </p>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[8px] text-slate-500 uppercase mono mb-1 font-bold">Volume Fraction</p>
            <p className="text-base font-bold mono text-blue-400">
              40.0%
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[8px] uppercase mono font-bold text-slate-400">Max Von Mises Stress</p>
            <span className="text-xs font-bold mono text-cyan-300">142.5 MPa</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500/60" style={{ width: '45%' }} />
          </div>
          <p className="text-[8px] text-slate-500 mt-2 mono">
            Material: {entity.properties?.material || 'Ti-6Al-4V'} (Yield: 880 MPa)
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">Finite Element Setup</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-400 mono">Boundary Condition</span>
              <span className="text-[9px] mono font-bold text-blue-400">Fixed Cantilever Left Edge</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-400 mono">Penalization (SIMP p)</span>
              <span className="text-[9px] mono font-bold text-cyan-300">3.0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PHYSICS DOMAIN (Tokamak Plasma)
  if (domain === 'PHYSICS') {
    const tauE = entity.properties?.confinementTime || 4.8;

    return (
      <div className="glass rounded-3xl p-6 flex flex-col gap-6 overflow-hidden border-slate-800 bg-slate-900/40">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[8px] mono text-pink-400 font-bold uppercase tracking-wider">Domain: Plasma Physics</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest mt-0.5">{entity.identity.name}</h2>
            </div>
            <span className="text-[8px] px-2 py-0.5 rounded mono uppercase font-bold border bg-pink-500/20 text-pink-400 border-pink-500/40">
              H-Mode Confinement
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{entity.identity.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[8px] text-slate-500 uppercase mono mb-1 font-bold">Confinement Time (τE)</p>
            <p className="text-base font-bold mono text-pink-400">
              {Number(tauE).toFixed(2)} 
              <span className="text-[9px] ml-1 text-slate-400">s</span>
            </p>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <p className="text-[8px] text-slate-500 uppercase mono mb-1 font-bold">Core Ion Temperature</p>
            <p className="text-base font-bold mono text-cyan-300">
              15.2 <span className="text-[9px] ml-1 text-slate-400">keV</span>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[8px] uppercase mono font-bold text-slate-400">Troyon Beta Limit (βN)</p>
            <span className="text-xs font-bold mono text-pink-400">3.96%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-pink-500/60" style={{ width: '65%' }} />
          </div>
          <p className="text-[8px] text-slate-500 mt-2 mono">
            Toroidal Field: 5.3 Tesla | Plasma Current: 15.0 MA
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">Magnetic Equilibrium</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-400 mono">Grad-Shafranov Solver</span>
              <span className="text-[9px] mono font-bold text-emerald-400">Quiescent Stable</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-400 mono">Safety Factor (q95)</span>
              <span className="text-[9px] mono font-bold text-cyan-300">3.12</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AI / STATISTICAL LEARNING DOMAIN
  return (
    <div className="glass rounded-3xl p-6 flex flex-col gap-6 overflow-hidden border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[8px] mono text-purple-400 font-bold uppercase tracking-wider">Domain: Statistical Learning</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mt-0.5">{entity.identity.name}</h2>
          </div>
          <span className="text-[8px] px-2 py-0.5 rounded mono uppercase font-bold border bg-purple-500/20 text-purple-400 border-purple-500/40">
            Minima Converged
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{entity.identity.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <p className="text-[8px] text-slate-500 uppercase mono mb-1 font-bold">Cross-Entropy Loss</p>
          <p className="text-base font-bold mono text-purple-300">
            0.048 <span className="text-[9px] ml-1 text-slate-400">nats</span>
          </p>
        </div>
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <p className="text-[8px] text-slate-500 uppercase mono mb-1 font-bold">Model Accuracy</p>
          <p className="text-base font-bold mono text-emerald-400">
            99.4%
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[8px] uppercase mono font-bold text-slate-400">Inference Latency</p>
          <span className="text-xs font-bold mono text-cyan-300">4.2 ms</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500/60" style={{ width: '85%' }} />
        </div>
        <p className="text-[8px] text-slate-500 mt-2 mono">
          Mutual Information: 14.8 bits | Surface Code Distance d=3
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">Optimization Dynamics</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[9px] text-slate-400 mono">Spectral Norm Condition</span>
            <span className="text-[9px] mono font-bold text-purple-400">1.04 (Bounded)</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[9px] text-slate-400 mono">Physical Qubits</span>
            <span className="text-[9px] mono font-bold text-cyan-300">17 Qubits</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsPanel;
