import React, { useState } from 'react';
import { UniversalStateObject, ScientificDomain } from '../types';
import { Download, AlertTriangle, X } from 'lucide-react';

interface SidebarProps {
  entities: UniversalStateObject[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  activeDomain: ScientificDomain;
  onReset: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  entities, 
  activeId, 
  setActiveId, 
  activeDomain, 
  onReset,
  isOpenMobile,
  onCloseMobile
}) => {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const filteredEntities = entities.filter(e => e.identity.domain === activeDomain);
  const otherEntitiesCount = entities.length - filteredEntities.length;

  const handleExport = () => {
    window.location.href = '/api/agent/export';
  };

  const content = (
    <div className="h-full flex flex-col justify-between">
      <div>
        <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
          <div>
            <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">State Manifold</h3>
            <p className="text-[10px] text-emerald-500/70 mono">{activeDomain} Active</p>
          </div>
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[calc(100vh-220px)]">
          {filteredEntities.length > 0 ? filteredEntities.map(entity => (
            <button
              key={entity.id}
              onClick={() => {
                setActiveId(entity.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full text-left p-2.5 rounded-xl transition-all group border ${
                activeId === entity.id 
                  ? 'bg-blue-600/10 border-blue-500/30 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' 
                  : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[8px] px-1 py-0.5 rounded mono bg-white/5 ${activeId === entity.id ? 'text-blue-400' : 'text-slate-500'}`}>
                  {entity.id.slice(0, 8)}
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
              + {otherEntitiesCount} entities in other domains
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white/5 border-t border-white/5 space-y-2">
        <button
          onClick={handleExport}
          className="w-full py-1.5 px-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-900/30 transition-all text-[8px] uppercase tracking-widest mono flex items-center justify-center gap-1.5"
        >
          <Download size={10} />
          Export All Data (JSON)
        </button>

        {!confirmingReset ? (
          <button 
            onClick={() => setConfirmingReset(true)}
            className="w-full py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all text-[8px] uppercase tracking-widest mono"
          >
            System Reload
          </button>
        ) : (
          <div className="space-y-1.5 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
            <div className="flex items-center gap-1 text-[8px] mono text-red-400">
              <AlertTriangle size={10} />
              Confirm reload?
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setConfirmingReset(false);
                  onReset();
                }}
                className="flex-1 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[8px] mono uppercase font-bold"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] mono uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className="w-56 glass border-y-0 border-l-0 flex flex-col hidden lg:flex shrink-0">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative w-64 h-full glass border-r border-slate-800 bg-[#020617] z-50 flex flex-col">
            {content}
          </aside>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </>
  );
};

export default Sidebar;
