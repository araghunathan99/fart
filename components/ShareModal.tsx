
import React, { useState } from 'react';

interface ShareModalProps {
  url: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Our FART Itinerary!");
    const body = encodeURIComponent(`Check out our family road trip: ${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="bg-slate-950 w-full max-w-md rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,1)] border-4 border-slate-900 overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-10 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-black text-white italic tracking-tighter">Share Trip</h3>
            <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors p-2">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-6">
            <p className="text-slate-500 text-xs font-bold leading-relaxed">
              Anyone with this link can view the full itinerary, real-time weather, and saved stops.
            </p>

            <div className="relative group">
              <input 
                type="text" 
                readOnly 
                value={url}
                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-5 py-5 text-[10px] font-mono text-slate-500 outline-none truncate"
              />
              <button 
                onClick={handleCopy}
                className={`absolute right-2 top-2 bottom-2 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  copied ? 'bg-green-500 text-white' : 'bg-white text-slate-900 hover:bg-orange-500 hover:text-white'
                }`}
              >
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>

            <button 
              onClick={handleEmail}
              className="w-full bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-4 border-2 border-slate-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Email Itinerary
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 flex justify-center border-t border-slate-900">
          <button 
            onClick={onClose}
            className="text-slate-600 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
