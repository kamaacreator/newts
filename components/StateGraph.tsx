import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { UniversalStateObject, ScientificDomain, EngineMode } from '../types';

interface StateGraphProps {
  entities: UniversalStateObject[];
  activeId: string | null;
  activeDomain: ScientificDomain;
  mode: EngineMode;
}

const StateGraph: React.FC<StateGraphProps> = ({ entities, activeId, activeDomain, mode }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    const g = svg.append('g');
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));

    const scale = 5;

    // Background field effects
    const grid = g.append('g').attr('opacity', 0.04);
    for (let i = -2000; i < 2000; i += 80) {
      grid.append('line').attr('x1', i).attr('y1', -2000).attr('x2', i).attr('y2', 2000).attr('stroke', '#64748b');
      grid.append('line').attr('y1', i).attr('x1', -2000).attr('y2', i).attr('x2', 2000).attr('stroke', '#64748b');
    }

    // Gradient Definitions
    const defs = svg.append('defs');
    
    // Sovereign Gravity Well Gradient
    const wellGradient = defs.append('radialGradient')
      .attr('id', 'sovereignWell')
      .selectAll('stop')
      .data([
        { offset: '0%', color: activeDomain === 'BIOLOGY' ? 'rgba(16, 185, 129, 0.4)' : (activeDomain === 'PHYSICS' ? 'rgba(236, 72, 153, 0.4)' : (activeDomain === 'ENGINEERING' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(168, 85, 247, 0.4)')) },
        { offset: '60%', color: activeDomain === 'BIOLOGY' ? 'rgba(16, 185, 129, 0.05)' : (activeDomain === 'PHYSICS' ? 'rgba(236, 72, 153, 0.05)' : (activeDomain === 'ENGINEERING' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(168, 85, 247, 0.05)')) },
        { offset: '100%', color: 'transparent' }
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    // Color mapper based on domain
    const getDomainColor = (domain: ScientificDomain, isActive: boolean) => {
      switch (domain) {
        case 'BIOLOGY':
          return isActive ? { fill: '#10b981', stroke: '#34d399', glow: 'rgba(16,185,129,0.8)' } : { fill: '#064e3b', stroke: '#065f46', glow: 'none' };
        case 'PHYSICS':
          return isActive ? { fill: '#ec4899', stroke: '#f472b6', glow: 'rgba(236,72,153,0.8)' } : { fill: '#831843', stroke: '#9d174d', glow: 'none' };
        case 'ENGINEERING':
          return isActive ? { fill: '#3b82f6', stroke: '#60a5fa', glow: 'rgba(59,130,246,0.8)' } : { fill: '#1e3a8a', stroke: '#1e40af', glow: 'none' };
        case 'AI':
          return isActive ? { fill: '#a855f7', stroke: '#c084fc', glow: 'rgba(168,85,247,0.8)' } : { fill: '#581c87', stroke: '#6b21a8', glow: 'none' };
      }
    };

    // Nodes
    const nodes = g.selectAll('.node')
      .data(entities)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.currentPosition.coordinates.x * scale}, ${d.currentPosition.coordinates.y * scale})`);

    // Gravity Well for Active Node
    nodes.filter(d => d.id === activeId)
      .insert('circle', ':first-child')
      .attr('r', 85)
      .attr('fill', 'url(#sovereignWell)')
      .attr('class', 'gravity-well');

    // Node Circle Body (Rendered for ALL entities and domains!)
    nodes.append('circle')
      .attr('r', 13)
      .attr('fill', d => getDomainColor(d.identity.domain, d.id === activeId).fill)
      .attr('stroke', d => getDomainColor(d.identity.domain, d.id === activeId).stroke)
      .attr('stroke-width', 2)
      .style('filter', d => d.id === activeId ? `drop-shadow(0 0 16px ${getDomainColor(d.identity.domain, true).glow})` : 'none');

    // Pulse Ring for Active Node
    nodes.filter(d => d.id === activeId)
      .append('circle')
      .attr('r', 13)
      .attr('fill', 'none')
      .attr('stroke', d => getDomainColor(d.identity.domain, true).stroke)
      .attr('stroke-width', 1.5)
      .attr('class', 'pulse-ring');

    // Node Name Label
    nodes.append('text')
      .text(d => d.identity.name)
      .attr('dy', 34)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('letter-spacing', '0.04em');

    // Status Sublabel
    nodes.append('text')
      .text(d => d.id === activeId ? 'ACTIVE_MANIFOLD' : '')
      .attr('dy', 48)
      .attr('text-anchor', 'middle')
      .attr('fill', d => getDomainColor(d.identity.domain, true).stroke)
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono, monospace');

  }, [entities, activeId, activeDomain, mode]);

  const getDomainBadges = () => {
    switch (activeDomain) {
      case 'BIOLOGY':
        return {
          primary: 'SOVEREIGN BASIN (ΔG -7.5 kcal/mol)',
          secondary: 'KINETIC CONFORMATIONAL VECTORS',
          color: 'emerald'
        };
      case 'ENGINEERING':
        return {
          primary: 'SIMP OPTIMAL TOPOLOGY (Vf 40%)',
          secondary: 'ELASTIC STRAIN LOAD PATHS',
          color: 'blue'
        };
      case 'PHYSICS':
        return {
          primary: 'MAGNETIC CONFINEMENT WELL (β 3.96%)',
          secondary: 'GRAD-SHAFRANOV EQUILIBRIUM FLUX',
          color: 'pink'
        };
      case 'AI':
        return {
          primary: 'CONVERGED MINIMUM (0.048 nats)',
          secondary: 'MINIMAX GRADIENT TRAJECTORY',
          color: 'purple'
        };
    }
  };

  const badges = getDomainBadges();

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full cursor-move" />
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex flex-col gap-2 pointer-events-none">
         <div className={`flex items-center gap-2.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-${badges.color}-500/30 text-[9px] mono text-${badges.color}-400 shadow-2xl backdrop-blur-md`}>
           <span className={`w-2 h-2 rounded-full bg-${badges.color}-400 animate-pulse`}></span> 
           {badges.primary}
         </div>
         <div className="flex items-center gap-2.5 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-700/50 text-[9px] mono text-slate-400 backdrop-blur-md">
           <div className="w-2 h-2 rounded-full border border-cyan-500/50 flex items-center justify-center">
             <div className="w-0.5 h-0.5 bg-cyan-400 rounded-full"></div>
           </div>
           {badges.secondary}
         </div>
      </div>
      <style>{`
        .pulse-ring {
          animation: ring-pulse 2s infinite ease-out;
        }
        @keyframes ring-pulse {
          0% { transform: scale(1); opacity: 0.9; stroke-width: 2px; }
          100% { transform: scale(2.8); opacity: 0; stroke-width: 0.5px; }
        }
        .gravity-well {
          animation: well-pulse 3.5s infinite alternate ease-in-out;
        }
        @keyframes well-pulse {
          from { transform: scale(0.92); opacity: 0.35; }
          to { transform: scale(1.1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default StateGraph;
