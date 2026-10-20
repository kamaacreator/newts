
import React from 'react';
import { ScientificDomain } from '../types';

interface DomainNavigatorProps {
  activeDomain: ScientificDomain;
  onDomainChange: (d: ScientificDomain) => void;
}

const DomainNavigator: React.FC<DomainNavigatorProps> = ({ activeDomain, onDomainChange }) => {
  const domains: { id: ScientificDomain; label: string; icon: string; color: string }[] = [
    { id: 'BIOLOGY', label: 'Biology', icon: 'fa-dna', color: 'text-emerald-400' },
    { id: 'PHYSICS', label: 'Physics', icon: 'fa-atom', color: 'text-pink-400' },
    { id: 'ENGINEERING', label: 'Engineering', icon: 'fa-bridge', color: 'text-blue-400' },
    { id: 'AI', label: 'Intelligence', icon: 'fa-brain', color: 'text-purple-400' }
  ];

  return (
    <div className="px-6 py-2 flex items-center gap-2 border-b border-white/5">
      {domains.map((d) => (
        <button
          key={d.id}
          onClick={() => onDomainChange(d.id)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all border ${
            activeDomain === d.id 
              ? 'bg-white/5 border-white/20' 
              : 'border-transparent hover:bg-white/5 opacity-50 hover:opacity-100'
          }`}
        >
          <i className={`fa-solid ${d.icon} ${activeDomain === d.id ? d.color : 'text-gray-500'}`}></i>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${activeDomain === d.id ? 'text-white' : 'text-gray-500'}`}>
            {d.label}
          </span>
        </button>
      ))}
      <div className="flex-1"></div>
      <div className="text-[10px] mono text-gray-600 bg-white/5 px-2 py-1 rounded">
        DOMAIN_PIVOT_ENABLED: TRUE
      </div>
    </div>
  );
};

export default DomainNavigator;
