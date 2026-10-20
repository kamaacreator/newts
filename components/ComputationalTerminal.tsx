
import React, { useState, useRef, useEffect } from 'react';
import { TerminalEntry, ResolutionData } from '../types';
import Markdown from 'react-markdown';
import { Code2, ChevronRight, Check, Copy, Terminal as TerminalIcon, Cpu, ListChecks } from 'lucide-react';

interface ComputationalTerminalProps {
  history: TerminalEntry[];
  onCommand: (cmd: string) => void;
  onClear: () => void;
  isResolving: boolean;
}

const ComputationalTerminal: React.FC<ComputationalTerminalProps> = ({ history, onCommand, onClear, isResolving }) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCodeId, setExpandedCodeId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [history, isResolving]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isResolving) {
      onCommand(input);
      setInput('');
    }
  };

  const copyToClipboard = async (id: string, data: ResolutionData) => {
    const formattedText = `
--- AETHERIS RESOLUTION REPORT ---
SUMMARY: ${data.summary}
STATES:
${data.states.map(s => {
  const metricsStr = s.metrics.map(m => `${m.name}: ${m.value} ${m.unit}`).join(', ');
  return `- ${s.label}: [${metricsStr}]`;
}).join('\n')}
${data.transitions ? `TRANSITIONS:\n${data.transitions.map(t => `- ${t.from} → ${t.to}: P = ${t.probability}`).join('\n')}` : ''}
${data.deterministicCode ? `DETERMINISTIC CODE:\n${data.deterministicCode}` : ''}
----------------------------------
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
            <div className={`text-[8px] uppercase tracking-widest mono ${isPending ? 'text-amber-500/50' : 'text-emerald-500/50'}`}>
              {isPending ? 'Awaiting Deterministic Input' : 'Resolution Path Valid'}
            </div>
            {data.deterministicCode && (
              <div className="text-[8px] uppercase tracking-widest text-blue-500/50 mono flex items-center gap-1">
                <Cpu size={8} /> Deterministic Bridge Active
              </div>
            )}
          </div>
          <button 
            onClick={() => copyToClipboard(entry.id, data)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all text-[8px] mono uppercase ${
              isCopied 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-slate-800/40 border-slate-700/50 text-slate-500 hover:text-cyan-400'
            }`}
          >
            {isCopied ? <Check size={8} /> : <Copy size={8} />}
            {isCopied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {data.states.slice(0, 4).map((s, i) => (
            <div key={i} className={`bg-slate-900/60 p-2 rounded border ${isPending ? 'border-amber-900/20' : 'border-slate-800/50'}`}>
              <div className="text-[7px] uppercase text-slate-500 mono mb-0.5">{s.label}</div>
              {s.metrics.map((m, j) => (
                <div key={j} className={j === 0 ? `text-[9px] font-bold mono ${isPending ? 'text-amber-500/60 italic' : 'text-cyan-400'}` : "text-[7px] text-slate-600 mono pt-1"}>
                  {m.name}: {typeof m.value === 'number' ? m.value.toFixed(2) : m.value} {m.unit}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className={`text-[9px] italic border-l-2 pl-2 py-0.5 ${isPending ? 'text-amber-400/70 border-amber-500/50 bg-amber-500/5' : 'text-slate-400 border-emerald-500/50 bg-emerald-500/5'}`}>
          {data.summary}
        </div>

        {isPending && (
          <div className="bg-blue-900/10 rounded-lg p-3 border border-blue-500/20 space-y-2">
            <div className="flex items-center gap-2 text-[9px] text-blue-400 font-bold uppercase mono">
              <TerminalIcon size={12} />
              Execution Required
            </div>
            <p className="text-[8px] text-slate-400 leading-relaxed">
              To finalize this resolution, copy the generated Python code below and execute it in a deterministic environment (e.g., Google Colab). Paste the resulting raw output back into this terminal to compile the final report.
            </p>
            <div className="flex gap-2">
              <a 
                href="https://colab.research.google.com/" 
                target="_blank" 
                rel="noreferrer"
                className="text-[8px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 hover:bg-blue-600/30 transition-all mono uppercase"
              >
                Open Google Colab
              </a>
            </div>
          </div>
        )}

        {data.deterministicSteps && data.deterministicSteps.length > 0 && (
          <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-800/30">
            <div className="flex items-center gap-1.5 text-[8px] uppercase text-slate-500 mono mb-1.5">
              <ListChecks size={10} className="text-blue-400" />
              Deterministic Validation Steps
            </div>
            <div className="space-y-1">
              {data.deterministicSteps.map((step, i) => (
                <div key={i} className="text-[8px] text-slate-400 mono flex gap-2">
                  <span className="text-blue-500/50">0{i+1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.deterministicCode && (
          <div className="bg-slate-950 rounded-lg border border-blue-900/20 overflow-hidden">
            <button 
              onClick={() => setExpandedCodeId(isExpanded ? null : entry.id)}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-blue-950/20 hover:bg-blue-950/30 transition-all border-b border-blue-900/10"
            >
              <div className="flex items-center gap-2 text-[8px] uppercase text-blue-400 mono">
                <Code2 size={10} />
                Deterministic Logic (Python)
              </div>
              <ChevronRight size={10} className={`text-blue-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
            {isExpanded && (
              <div className="p-3 text-[9px] mono text-blue-100/80 bg-black/40 overflow-x-auto max-h-64 custom-scrollbar">
                <Markdown>{`\`\`\`python\n${data.deterministicCode}\n\`\`\``}</Markdown>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/80 rounded-2xl border border-cyan-900/20 shadow-inner overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-black/40">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Layer 2: Logic Controller</h3>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onClear}
            className="text-[8px] mono text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest"
          >
            [Clear Terminal]
          </button>
          <div className="text-[8px] mono text-slate-600 uppercase">Status: DETERMINISTIC_BRIDGE_ACTIVE</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {isResolving && (
          <div className="flex items-center gap-2 text-cyan-400 mono text-[9px] animate-pulse">
            <Cpu size={12} className="animate-spin" />
            <span>ORCHESTRATING DETERMINISTIC MANIFOLD...</span>
          </div>
        )}

        {history.map((entry) => (
          <div key={entry.id} className="border-b border-slate-900/50 pb-3 last:border-0">
            <div className="flex gap-2 text-[10px] mono">
              <span className={`font-bold ${
                entry.type === 'COMMAND' ? 'text-slate-500' : 
                entry.type === 'RESOLUTION' ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {entry.type === 'COMMAND' ? '>' : entry.type === 'RESOLUTION' ? 'RES:' : 'ERR:'}
              </span>
              <div className="flex-1">
                {entry.type === 'COMMAND' && <span className="text-white">{entry.content as string}</span>}
                {entry.type === 'RESOLUTION' && renderResolution(entry)}
                {entry.type === 'ERROR' && <span className="text-red-400">{entry.content as string}</span>}
              </div>
            </div>
          </div>
        ))}

        {history.length === 0 && !isResolving && (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <TerminalIcon size={24} className="mb-2" />
            <p className="text-[9px] mono italic">Awaiting Deterministic Query...</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="px-3 pb-3 pt-1">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isResolving}
            placeholder="INPUT_RESOLUTION_CMD (e.g. 'Blind Test: Trp-cage')"
            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-2 px-3 text-[10px] mono text-cyan-300 outline-none focus:border-cyan-500/30 transition-all pr-10"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isResolving}
            className="absolute right-1 top-1 bottom-1 px-2 bg-cyan-600/10 text-cyan-500 rounded hover:bg-cyan-600/20 transition-all"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </form>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ComputationalTerminal;
