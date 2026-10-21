import React from 'react';
import { ScientificDomain } from '../types';
import { Dna, Atom, Compass, Brain } from 'lucide-react';

interface DomainNavigatorProps {
  activeDomain: ScientificDomain;
  onDomainChange: (d: ScientificDomain) => void;
}

const DomainNavigator: React.FC<DomainNavigatorProps> = ({ activeDomain, onDomainChange }) => {
  const domains: { id: ScientificDomain; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }[] = [
    { id: 'BIOLOGY', label: 'Biology', icon: Dna, color: 'text-emerald-400' },
    { id: 'PHYSICS', label: 'Physics', icon: Atom, color: 'text-pink-400' },
    { id: 'ENGINEERING', label: 'Engineering', icon: Compass, color: 'text-blue-400' },
    { id: 'AI', label: 'AI Intelligence', icon: Brain, color: 'text-purple-400' }
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {domains.map((d) => {
        const Icon = d.icon;
        const isActive = activeDomain === d.id;
        return (
          <button
            key={d.id}
            onClick={() => onDomainChange(d.id)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-all border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mono ${
              isActive 
                ? 'bg-slate-800/80 border-slate-700 text-white shadow-sm' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Icon size={12} className={isActive ? d.color : 'text-slate-500'} />
            <span>{d.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DomainNavigator;
