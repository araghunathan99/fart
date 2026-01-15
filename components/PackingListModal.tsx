
import React from 'react';
import { PackingList, PackingItem } from '../types';

interface PackingListModalProps {
  packingList: PackingList;
  onToggleItem: (itemId: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const PackingListModal: React.FC<PackingListModalProps> = ({ 
  packingList, 
  onToggleItem, 
  onClose,
  isLoading 
}) => {
  const totalItems = packingList.categories.reduce((acc, cat) => acc + cat.items.length, 0);
  const packedItems = packingList.categories.reduce((acc, cat) => acc + cat.items.filter(i => i.isPacked).length, 0);
  const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div 
        className="bg-slate-950 w-full max-w-3xl h-[85vh] rounded-[3rem] shadow-[0_40px_120px_rgba(0,0,0,1)] border-4 border-slate-900 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 bg-slate-900/50 border-b border-slate-900">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-3xl font-black text-white italic tracking-tighter">Packing List</h3>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mt-2">AI-optimized for your adventure</p>
            </div>
            <button onClick={onClose} className="bg-slate-800 p-2.5 rounded-2xl text-slate-500 hover:text-white transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">PROGRESS: {progress}%</span>
              <span className="text-slate-500 text-[10px] font-bold">{packedItems} / {totalItems} ITEMS</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-8 space-y-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="w-16 h-16 border-4 border-slate-900 border-t-orange-500 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] animate-pulse">Building your checklist...</p>
            </div>
          ) : (
            packingList.categories.map((category, catIdx) => (
              <div key={catIdx} className="space-y-5">
                <div className="flex items-center gap-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest italic">{category.name}</h4>
                  <div className="h-0.5 flex-grow bg-slate-900"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => onToggleItem(item.id)}
                      className={`group flex items-center gap-4 p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                        item.isPacked 
                        ? 'bg-slate-900/40 border-slate-900 opacity-50' 
                        : 'bg-slate-900 border-slate-800 hover:border-orange-500 shadow-xl'
                      }`}
                    >
                      <div className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center border-2 transition-all ${
                        item.isPacked 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-slate-950 border-slate-700 text-transparent group-hover:border-orange-500'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className={`text-sm font-black truncate ${item.isPacked ? 'text-slate-600 line-through' : 'text-white'}`}>
                          {item.name}
                        </p>
                        {item.reason && (
                          <p className="text-[9px] font-bold text-slate-500 mt-1 italic leading-tight truncate">
                            {item.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-900/50 border-t border-slate-900 flex justify-center">
          <button 
            onClick={onClose}
            className="px-14 py-5 bg-white text-slate-950 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-orange-500 hover:text-white transition-all shadow-2xl active:scale-95"
          >
            LET'S GO
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackingListModal;
