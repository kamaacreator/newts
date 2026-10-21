import React, { useState, useRef, useEffect } from 'react';
import { TerminalEntry, ResolutionData } from '../types';
import Markdown from 'react-markdown';
import { 
  Code2, 
  ChevronRight, 
  Check, 
  Copy, 
  Terminal as TerminalIcon, 
  Cpu, 
  ListChecks, 
  Download, 
  Eye, 
  EyeOff,
  Sparkles,
  Upload
} from 'lucide-react';

interface ComputationalTerminalProps {
  history: TerminalEntry[];
  onCommand: (cmd: string) => void;
  onClear: () => void;
  isResolving: boolean;
  onStructureFile: (file: File) => void;
}

const ComputationalTerminal: React.FC<ComputationalTerminalProps> = ({ 
  history, 
  onCommand, 
  isResolving,
  onStructureFile,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCodeId, setExpandedCodeId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'latest'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const structureFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [history, isResolving]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isResolving) {
      onCommand(input.trim());
      setInput('');
    }
  };

  const handleChipClick = (cmd: string) => {
    if (!isResolving) {
      onCommand(cmd);
    }
  };

  const handleExportHistory = () => {
    window.location.href = '/api/agent/export';
  };

  const copyToClipboard = async (id: string, data: ResolutionData) => {
    const formattedText = `
--- AETHERIS PROTOTYPE CALCULATION REPORT (NOT SCIENTIFICALLY VALIDATED) ---
SUMMARY: ${data.summary}
STATES:
${data.states.map(s => {
  const metricsStr = s.metrics.map(m => `${m.name}: ${m.value} ${m.unit}`).join(', ');
  return `- ${s.label}: [${metricsStr}]`;
}).join('\n')}
${data.transitions ? `TRANSITIONS:\n${data.transitions.map(t => `- ${t.from} → ${t.to}: P = ${t.probability}`).join('\n')}` : ''}
${data.deterministicCode ? `ILLUSTRATIVE CODE (not executed by this app):\n${data.deterministicCode}` : ''}
------------------------------------------------
    `.trim();

    try {
      await navigator.clipboard.writeText(formattedText);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const renderResolution = (entry: TerminalEntry) => {
    const data = entry.content as ResolutionData;
    const isCopied = copiedId === entry.id;
    const isExpanded = expandedCodeId === entry.id;
    const isPending = data.status === 'PENDING_COMPUTATION';

    return (
      <div className="mt-2 space-y-3 relative group/res">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <div className={`text-[8px] uppercase tracking-widest mono ${isPending ? 'text-amber-500/70' : 'text-emerald-400 font-bold'}`}>
              {isPending ? 'Awaiting Deterministic Input' : 'Prototype Calculation Output'}
            </div>
            {data.deterministicCode && (
              <div className="text-[8px] uppercase tracking-widest text-cyan-400/80 mono flex items-center gap-1 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                <Cpu size={8} /> Local Formula Path
              </div>
            )}
          </div>
          <button 
            onClick={() => copyToClipboard(entry.id, data)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all text-[8px] mono uppercase ${
              isCopied 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-cyan-400'
            }`}
          >
            {isCopied ? <Check size={8} /> : <Copy size={8} />}
            {isCopied ? 'Copied' : 'Copy Report'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {data.states.slice(0, 4).map((s, i) => (
            <div key={i} className={`bg-slate-900/80 p-2.5 rounded-xl border ${isPending ? 'border-amber-900/20' : 'border-slate-800'}`}>
              <div className="text-[8px] uppercase text-slate-400 mono font-bold mb-1">{s.label}</div>
              {s.metrics.map((m, j) => (
                <div key={j} className={j === 0 ? `text-[10px] font-bold mono ${isPending ? 'text-amber-500/60 italic' : 'text-cyan-300'}` : "text-[8px] text-slate-400 mono pt-1"}>
                  <span className="text-slate-500">{m.name}:</span> <span className="text-white font-medium">{typeof m.value === 'number' ? m.value.toFixed(2) : m.value}</span> <span className="text-cyan-400/90">{m.unit}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="text-[9px] border border-amber-500/30 bg-amber-500/5 text-amber-200/90 rounded-lg px-2.5 py-2 leading-relaxed">
          Prototype output only. Scientific validity has not been independently established; displayed metrics may be heuristic estimates. Generated Python snippets are illustrative and are not executed by this application.
        </div>

        <div className={`text-[9px] border-l-2 pl-2.5 py-1 rounded-r leading-relaxed ${isPending ? 'text-amber-300/80 border-amber-500/50 bg-amber-500/5' : 'text-slate-300 border-slate-500/50 bg-slate-500/5'}`}>
          {data.summary}
        </div>

        {data.deterministicSteps && data.deterministicSteps.length > 0 && (
          <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/50">
            <div className="flex items-center gap-1.5 text-[8px] uppercase text-slate-400 mono mb-1.5 font-bold">
              <ListChecks size={10} className="text-cyan-400" />
              Reported Calculation Steps
            </div>
            <div className="space-y-1">
              {data.deterministicSteps.map((step, i) => (
                <div key={i} className="text-[8px] text-slate-300 mono flex gap-2">
                  <span className="text-cyan-500/70 font-bold">0{i+1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.deterministicCode && (
          <div className="bg-slate-950 rounded-xl border border-cyan-900/30 overflow-hidden">
            <button 
              onClick={() => setExpandedCodeId(isExpanded ? null : entry.id)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/50 hover:bg-slate-900 transition-all border-b border-cyan-900/20"
            >
              <div className="flex items-center gap-2 text-[8px] uppercase text-cyan-400 mono font-bold">
                <Code2 size={11} />
                Illustrative Python Code (not executed here)
              </div>
              <ChevronRight size={10} className={`text-cyan-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
            {isExpanded && (
              <div className="p-3 text-[9px] mono text-cyan-100/90 bg-black/60 overflow-x-auto max-h-64 custom-scrollbar">
                <Markdown>{`\`\`\`python\n${data.deterministicCode}\n\`\`\``}</Markdown>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const displayedHistory = viewFilter === 'latest' ? history.slice(0, 2) : history;

  const quickChips = [
    { label: 'CRISPR PAM Kinetics', cmd: 'Model Cas9 PAM recognition kinetics (guide=20)' },
    { label: 'SIMP Topology FEA', cmd: 'FEA beam cantilever topology optimization (volfrac=0.35 penal=3.0)' },
    { label: 'Tokamak Plasma', cmd: 'Compute tokamak plasma beta limit (B=5.3 T, Ip=15 MA)' },
    { label: 'Transformer Loss', cmd: 'Analyze transformer loss manifold (steps=1500)' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950/90 rounded-2xl border border-cyan-900/30 shadow-inner overflow-hidden">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-900 bg-black/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mono">Layer 2: Logic Controller</h3>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[8px] mono text-emerald-400 uppercase flex items-center gap-1.5 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
            Chat Saved ({history.length})
          </span>

          <button 
            onClick={() => setViewFilter(viewFilter === 'all' ? 'latest' : 'all')}
            className="flex items-center gap-1 text-[8px] mono text-slate-400 hover:text-cyan-300 transition-colors uppercase tracking-wider bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800"
            title="Toggle between showing all conversations or just the recent one"
          >
            {viewFilter === 'all' ? <EyeOff size={9} /> : <Eye size={9} />}
            <span>{viewFilter === 'all' ? 'Focus View' : 'Show All'}</span>
          </button>

          <button 
            onClick={handleExportHistory}
            className="flex items-center gap-1 text-[8px] mono text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-800/30"
            title="Download complete conversation history as JSON"
          >
            <Download size={9} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="px-3 py-1.5 bg-slate-900/30 border-b border-slate-900/70 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
        <span className="text-[8px] uppercase mono text-slate-500 font-bold flex items-center gap-1 shrink-0">
          <Sparkles size={9} className="text-cyan-400" /> Quick Primitives:
        </span>
        <input
          ref={structureFileRef}
          type="file"
          accept=".pdb,.ent,.txt"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onStructureFile(file);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={isResolving}
          onClick={() => structureFileRef.current?.click()}
          className="text-[8px] mono px-2 py-0.5 rounded-full bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 transition-all shrink-0 disabled:opacity-50 flex items-center gap-1"
          title="Analyze C-alpha geometry from a PDB structure file"
        >
          <Upload size={9} /> Analyze PDB
        </button>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            disabled={isResolving}
            onClick={() => handleChipClick(chip.cmd)}
            className="text-[8px] mono px-2 py-0.5 rounded-full bg-slate-800/50 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 border border-slate-700/50 hover:border-cyan-500/40 transition-all shrink-0 disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* History Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
        {isResolving && (
          <div className="flex items-center gap-2 text-cyan-400 mono text-[9px] animate-pulse bg-cyan-950/30 p-2 rounded-lg border border-cyan-800/30">
            <Cpu size={12} className="animate-spin" />
            <span>RUNNING REQUESTED CALCULATION PATH...</span>
          </div>
        )}

        {displayedHistory.map((entry) => (
          <div key={entry.id} className="border-b border-slate-900/80 pb-3 last:border-0">
            <div className="flex gap-2 text-[10px] mono">
              <span className={`font-bold shrink-0 ${
                entry.type === 'COMMAND' ? 'text-cyan-500' : 
                entry.type === 'RESOLUTION' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {entry.type === 'COMMAND' ? '>' : entry.type === 'RESOLUTION' ? 'RES:' : 'ERR:'}
              </span>
              <div className="flex-1 min-w-0">
                {entry.type === 'COMMAND' && (
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">{entry.content as string}</span>
                    <span className="text-[8px] text-slate-600">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                )}
                {entry.type === 'RESOLUTION' && renderResolution(entry)}
                {entry.type === 'ERROR' && <span className="text-red-400">{entry.content as string}</span>}
              </div>
            </div>
          </div>
        ))}

        {history.length === 0 && !isResolving && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 py-8">
            <TerminalIcon size={24} className="mb-2 text-cyan-400" />
            <p className="text-[9px] mono italic">Awaiting Deterministic Query...</p>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="px-3 pb-3 pt-1 shrink-0 bg-black/30">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isResolving}
            placeholder="Command or SEQUENCE: paste amino-acid sequence / FASTA"
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-3 text-[10px] mono text-cyan-300 outline-none focus:border-cyan-500/50 transition-all pr-10 shadow-inner"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isResolving}
            className="absolute right-1 top-1 bottom-1 px-2.5 bg-cyan-600/20 text-cyan-400 rounded hover:bg-cyan-600/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
            title="Execute Command"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ComputationalTerminal;
