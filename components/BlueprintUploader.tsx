
import React, { useState } from 'react';

interface BlueprintUploaderProps {
  onUpload: (data: any) => void;
}

const BlueprintUploader: React.FC<BlueprintUploaderProps> = ({ onUpload }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  const handleIntegrate = () => {
    try {
      const data = JSON.parse(text);
      onUpload(data);
      setIsOpen(false);
      setText('');
    } catch (e) {
      alert('Invalid Schema Blueprint Format (JSON Required)');
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 border border-dashed border-white/10 hover:border-blue-500/50 rounded-2xl flex items-center justify-center gap-3 transition-all text-gray-500 hover:text-blue-400 group"
      >
        <i className="fa-solid fa-file-import group-hover:animate-bounce"></i>
        <span className="text-xs font-bold uppercase tracking-widest">Inject Schema Blueprint</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 w-full mb-4 glass p-4 rounded-2xl z-30 shadow-2xl border-blue-500/30">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Schema Integration Portal</h4>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 mono text-[10px] text-emerald-400 outline-none focus:border-blue-500 transition-all"
            placeholder='{ "type": "universal_state_node", "identity": { ... } }'
          />
          <button 
            onClick={handleIntegrate}
            disabled={!text}
            className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
          >
            Integrate with Engine Field
          </button>
        </div>
      )}
    </div>
  );
};

export default BlueprintUploader;
