
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
    const grid = g.append('g').attr('opacity', 0.03);
    for(let i=-2000; i<2000; i+=80) {
      grid.append('line').attr('x1', i).attr('y1', -2000).attr('x2', i).attr('y2', 2000).attr('stroke', '#475569');
      grid.append('line').attr('y1', i).attr('x1', -2000).attr('y2', i).attr('x2', 2000).attr('stroke', '#475569');
    }

    // Gradient Definitions
    const defs = svg.append('defs');
    
    // Sovereign Gravity Well Gradient
    const sovereignGrad = defs.append('radialGradient')
      .attr('id', 'sovereignWell')
      .selectAll('stop')
      .data([
        { offset: '0%', color: 'rgba(16, 185, 129, 0.4)' },
        { offset: '60%', color: 'rgba(16, 185, 129, 0.05)' },
        { offset: '100%', color: 'transparent' }
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    // Nodes
    const nodes = g.selectAll('.node')
      .data(entities)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.currentPosition.coordinates.x * scale}, ${d.currentPosition.coordinates.y * scale})`);

    // Sovereign Gravity Well (Visible only for active sovereign nodes)
    nodes.filter(d => d.id === activeId && d.properties.foldingState === 'Sovereign_Locked')
      .insert('circle', ':first-child')
      .attr('r', 80)
      .attr('fill', 'url(#sovereignWell)')
      .attr('class', 'gravity-well');

    if (activeDomain === 'BIOLOGY') {
      nodes.append('path')
        .attr('d', d3.arc()({ innerRadius: 0, outerRadius: 12, startAngle: 0, endAngle: 2 * Math.PI }))
        .attr('fill', d => d.id === activeId ? '#10b981' : '#064e3b')
        .attr('stroke', d => d.id === activeId ? '#34d399' : '#065f46')
        .attr('stroke-width', 2)
        .style('filter', d => d.id === activeId ? 'drop-shadow(0 0 20px rgba(16,185,129,0.8))' : 'none');
        
      // Pulse ring for sovereign lock
      nodes.filter(d => d.id === activeId)
        .append('circle')
        .attr('r', 12)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 1)
        .attr('class', 'pulse-ring');
    }

    nodes.append('text')
      .text(d => d.identity.name)
      .attr('dy', 34)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono')
      .attr('letter-spacing', '0.05em');

    nodes.append('text')
      .text(d => d.id === activeId ? 'SOVEREIGN_LOCK: SECURED' : '')
      .attr('dy', 48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#10b981')
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono');

  }, [entities, activeId, activeDomain, mode]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full cursor-move" />
      <div className="absolute bottom-8 left-8 flex flex-col gap-3">
         <div className="flex items-center gap-3 bg-slate-950/90 px-4 py-2 rounded-xl border border-emerald-500/30 text-[10px] mono text-emerald-400 shadow-2xl">
           <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></span> 
           SOVEREIGN BASIN (ΔG -7.5)
         </div>
         <div className="flex items-center gap-3 bg-slate-950/90 px-4 py-2 rounded-xl border border-slate-700/50 text-[10px] mono text-slate-400">
           <div className="w-2.5 h-2.5 rounded-full border border-blue-500/50 flex items-center justify-center">
             <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
           </div>
           KINETIC RETURN VECTORS
         </div>
      </div>
      <style>{`
        .pulse-ring {
          animation: ring-pulse 2s infinite ease-out;
        }
        @keyframes ring-pulse {
          0% { transform: scale(1); opacity: 0.8; stroke-width: 2px; }
          100% { transform: scale(3); opacity: 0; stroke-width: 0.5px; }
        }
        .gravity-well {
          animation: well-pulse 4s infinite alternate ease-in-out;
        }
        @keyframes well-pulse {
          from { transform: scale(0.9); opacity: 0.4; }
          to { transform: scale(1.1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default StateGraph;
