import React, { useMemo, useRef, useState } from 'react';
import { ReceiptData, PersonTotal } from '../types';
import { PieChart, Wallet, Copy, Download, Check, Calculator, Percent } from 'lucide-react';

// Duplicate color logic to avoid circular dependencies or complex imports
const USER_COLORS = [
  { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-500/30' },
  { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-500/30' },
  { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-500/30' },
  { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/30' },
  { bg: 'bg-teal-100 dark:bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-500/30' },
  { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-500/30' },
  { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-500/30' },
  { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-500/30' },
  { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-500/30' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-500/20', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-500/30' },
  { bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-500/30' },
  { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-500/30' },
];

const getUserColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

interface SummaryProps {
  data: ReceiptData;
  onUpdateTax: (amount: number) => void;
  onUpdateTip: (amount: number) => void;
}

export const Summary: React.FC<SummaryProps> = ({ data, onUpdateTax, onUpdateTip }) => {
  const summaryRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [isDownloading, setIsDownloading] = useState(false);

  const breakdown = useMemo(() => {
    const peopleMap = new Map<string, PersonTotal>();
    let unassignedTotal = 0;

    // Initialize assigned people
    data.items.forEach(item => {
      if (item.assignedTo.length === 0) {
        unassignedTotal += item.price;
        return;
      }

      const costPerPerson = item.price / item.assignedTo.length;
      
      item.assignedTo.forEach(person => {
        if (!peopleMap.has(person)) {
          peopleMap.set(person, {
            name: person,
            itemsTotal: 0,
            taxShare: 0,
            tipShare: 0,
            finalTotal: 0,
            items: []
          });
        }
        const personData = peopleMap.get(person)!;
        personData.itemsTotal += costPerPerson;
        personData.items.push(item.name);
      });
    });

    // Calculate subtotal of assigned items to distribute tax/tip proportionally
    let totalAssignedSubtotal = 0;
    peopleMap.forEach(p => {
      totalAssignedSubtotal += p.itemsTotal;
    });

    // Add Tax and Tip shares
    const peopleArray = Array.from(peopleMap.values());
    peopleArray.forEach(person => {
      const ratio = totalAssignedSubtotal > 0 ? person.itemsTotal / totalAssignedSubtotal : 0;
      person.taxShare = data.tax * ratio;
      person.tipShare = data.tip * ratio;
      person.finalTotal = person.itemsTotal + person.taxShare + person.tipShare;
    });

    return { people: peopleArray, unassignedTotal };
  }, [data]);

  const handleCopySummary = async () => {
    const lines = [
      `🧾 Bill Split Summary`,
      `----------------`
    ];
    
    breakdown.people.forEach(p => {
      lines.push(`${p.name}: ${data.currency}${p.finalTotal.toFixed(2)}`);
    });
    
    if (breakdown.unassignedTotal > 0) {
      lines.push(`Unassigned: ${data.currency}${breakdown.unassignedTotal.toFixed(2)}`);
    }

    lines.push(`----------------`);
    lines.push(`Total: ${data.currency}${data.total.toFixed(2)}`);
    
    const text = lines.join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const handleDownloadImage = async () => {
    if (!summaryRef.current || isDownloading) return;
    setIsDownloading(true);
    
    try {
      // @ts-ignore
      if (typeof window.html2canvas === 'undefined') {
        console.error("html2canvas not loaded");
        setIsDownloading(false);
        return;
      }

      // @ts-ignore
      const canvas = await window.html2canvas(summaryRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `SplitSmart-Summary-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error("Failed to download image", e);
    } finally {
      setIsDownloading(false);
    }
  };

  const setTipPercentage = (percent: number) => {
    const newTip = data.subtotal * (percent / 100);
    onUpdateTip(Number(newTip.toFixed(2)));
  };

  const currentTipPercentage = data.subtotal > 0 ? Math.round((data.tip / data.subtotal) * 100) : 0;

  return (
    <div 
      ref={summaryRef}
      className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-300"
    >
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-2.5">
            <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          Cost Breakdown
        </h2>
        
        {breakdown.people.length > 0 && (
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
             <button 
               onClick={handleCopySummary}
               className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-indigo-400 rounded-md transition-all duration-200"
               title="Copy summary text"
             >
               {copyStatus === 'copied' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
             </button>
             <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-0.5"></div>
             <button 
               onClick={handleDownloadImage}
               disabled={isDownloading}
               className={`p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-indigo-400 rounded-md transition-all duration-200 ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
               title="Download as image"
             >
               <Download className="w-4 h-4" />
             </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {breakdown.people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
            <Wallet className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No assignments yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Use the chat to tell me who paid for what!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {breakdown.people.map((person) => {
              const color = getUserColor(person.name);
              return (
                <div key={person.name} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${color.bg} ${color.text} border ${color.border}`}>
                         {getInitials(person.name)}
                       </div>
                       <span className="font-bold text-gray-900 dark:text-white text-lg">{person.name}</span>
                    </div>
                    <span className="font-bold text-purple-600 dark:text-purple-400 text-xl">
                      {data.currency}{person.finalTotal.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3 opacity-80 pl-[52px]">
                     <div className="flex flex-col">
                        <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Subtotal</span>
                        <span className="text-gray-700 dark:text-gray-300">{data.currency}{person.itemsTotal.toFixed(2)}</span>
                     </div>
                     <div className="flex flex-col text-right">
                        <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Tax & Tip</span>
                        <span className="text-gray-700 dark:text-gray-300">{data.currency}{(person.taxShare + person.tipShare).toFixed(2)}</span>
                     </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700/50 pl-[52px]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      <span className="font-medium text-gray-700 dark:text-gray-300">For:</span> {person.items.join(', ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {breakdown.unassignedTotal > 0 && (
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl">
            <div className="flex justify-between items-center text-orange-800 dark:text-orange-200 font-semibold">
              <span>Unassigned Leftovers</span>
              <span>{data.currency}{breakdown.unassignedTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400/70 mt-1">
              Tax & Tip for these items are not yet calculated in individual shares.
            </p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
         {/* Adjustments Section */}
         <div className="p-5 pb-2 space-y-4 border-b border-gray-100 dark:border-gray-800/50">
            {/* Tax Row */}
            <div className="flex items-center justify-between gap-4">
               <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  <div className="p-1 bg-gray-200 dark:bg-gray-800 rounded">
                    <Calculator className="w-3.5 h-3.5" />
                  </div>
                  Tax
               </div>
               <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">{data.currency}</span>
                  <input 
                    type="number" 
                    value={data.tax}
                    onChange={(e) => onUpdateTax(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-sm text-right text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    step="0.01"
                  />
               </div>
            </div>

            {/* Tip Row */}
            <div className="space-y-2">
               <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      <div className="p-1 bg-gray-200 dark:bg-gray-800 rounded">
                        <Percent className="w-3.5 h-3.5" />
                      </div>
                      Tip
                  </div>
                  <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">{data.currency}</span>
                      <input 
                        type="number" 
                        value={data.tip}
                        onChange={(e) => onUpdateTip(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-sm text-right text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        step="0.01"
                      />
                  </div>
               </div>
               <div className="flex justify-end gap-1.5 flex-wrap">
                  {[0, 10, 15, 18, 20].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setTipPercentage(pct)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        currentTipPercentage === pct 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
               </div>
            </div>
         </div>

         <div className="p-5 pt-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Receipt</p>
                <p className="text-xs text-gray-400 dark:text-gray-600">Inc. Tax & Tip</p>
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{data.currency}{data.total.toFixed(2)}</span>
            </div>
         </div>
      </div>
    </div>
  );
};