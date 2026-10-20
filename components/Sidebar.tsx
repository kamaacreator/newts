
import React from 'react';
import { UniversalStateObject, ScientificDomain } from '../types';

interface SidebarProps {
  entities: UniversalStateObject[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  activeDomain: ScientificDomain;
  onReset: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ entities, activeId, setActiveId, activeDomain, onReset }) => {
  const filteredEntities = entities.filter(e => e.identity.domain === activeDomain);
  const otherEntitiesCount = entities.length - filteredEntities.length;

  return (
    <aside className="w-56 glass border-y-0 border-l-0 flex flex-col hidden lg:flex">
      <div className="p-4 border-b border-white/5 bg-black/20">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">State Manifold</h3>
        <p className="text-[10px] text-emerald-500/70 mono">{activeDomain} Active</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filteredEntities.length > 0 ? filteredEntities.map(entity => (
          <button
            key={entity.id}
            onClick={() => setActiveId(entity.id)}
            className={`w-full text-left p-2.5 rounded-xl transition-all group border ${
              activeId === entity.id 
                ? 'bg-blue-600/10 border-blue-500/30 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' 
                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-[8px] px-1 py-0.5 rounded mono bg-white/5 ${activeId === entity.id ? 'text-blue-400' : 'text-slate-500'}`}>
                {entity.id.slice(0, 6)}
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className={`w-1 h-1 rounded-full ${i <= (entity.metrics.stability * 3) ? 'bg-emerald-400' : 'bg-white/10'}`} 
                  />
                ))}
              </div>
            </div>
            <h4 className={`text-[11px] font-bold truncate ${activeId === entity.id ? 'text-white' : 'text-slate-400'}`}>
              {entity.identity.name}
            </h4>
          </button>
        )) : (
          <div className="p-4 text-center opacity-30 mt-10">
            <i className="fa-solid fa-ghost text-2xl mb-2"></i>
            <p className="text-[9px] mono italic">No entities detected in {activeDomain}</p>
          </div>
        )}

        {otherEntitiesCount > 0 && (
          <div className="p-3 text-[9px] text-slate-600 mono italic border-t border-white/5 mt-4 text-center">
            + {otherEntitiesCount} entities in background
          </div>
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/5 space-y-3">
        <div className="flex items-center gap-3 text-slate-500">
          <i className="fa-solid fa-circle-nodes text-[10px]"></i>
          <span className="text-[8px] uppercase tracking-[0.2em] mono">Engine Locked</span>
        </div>
        <button 
          onClick={() => {
            if (confirm('Are you sure you want to reset the entire AETHERIS engine? All local history will be purged.')) {
              onReset();
            }
          }}
          className="w-full py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all text-[8px] uppercase tracking-widest mono"
        >
          System Reset
        </button>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </aside>
  );
};

export default Sidebar;
