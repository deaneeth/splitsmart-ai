import React, { useMemo } from 'react';
import { ReceiptData, PersonTotal } from '../types';
import { PieChart, Wallet } from 'lucide-react';

interface SummaryProps {
  data: ReceiptData;
}

export const Summary: React.FC<SummaryProps> = ({ data }) => {
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-300">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-2.5">
            <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          Cost Breakdown
        </h2>
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
            {breakdown.people.map((person) => (
              <div key={person.name} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-900 dark:text-white text-lg">{person.name}</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400 text-xl">
                    {data.currency}{person.finalTotal.toFixed(2)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3 opacity-80">
                   <div className="flex flex-col">
                      <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Subtotal</span>
                      <span className="text-gray-700 dark:text-gray-300">{data.currency}{person.itemsTotal.toFixed(2)}</span>
                   </div>
                   <div className="flex flex-col text-right">
                      <span className="text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold text-[10px]">Tax & Tip</span>
                      <span className="text-gray-700 dark:text-gray-300">{data.currency}{(person.taxShare + person.tipShare).toFixed(2)}</span>
                   </div>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    <span className="font-medium text-gray-700 dark:text-gray-300">For:</span> {person.items.join(', ')}
                  </p>
                </div>
              </div>
            ))}
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

      <div className="p-5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
         <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Receipt</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">Inc. Tax & Tip</p>
            </div>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{data.currency}{data.total.toFixed(2)}</span>
         </div>
      </div>
    </div>
  );
};