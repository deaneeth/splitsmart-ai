import React from 'react';
import { ReceiptItem } from '../types';
import { User, Users, Receipt } from 'lucide-react';

interface ReceiptPaneProps {
  items: ReceiptItem[];
  currency: string;
}

export const ReceiptPane: React.FC<ReceiptPaneProps> = ({ items, currency }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-300">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-2.5">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          Receipt Items
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-10">
          {items.length} items detected
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-xl border transition-all duration-200 group ${
              item.assignedTo.length > 0
                ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10'
                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex justify-between items-start mb-2.5">
              <span className="font-medium text-gray-800 dark:text-gray-200 leading-snug">{item.name}</span>
              <span className="font-bold text-gray-900 dark:text-white ml-3 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-sm whitespace-nowrap">
                {currency}{item.price.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
               {item.assignedTo.length === 0 ? (
                 <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center italic">
                   <User className="w-3 h-3 mr-1.5" />
                   Unassigned
                 </span>
               ) : (
                 <div className="flex flex-wrap gap-1.5">
                   {item.assignedTo.map((person, idx) => (
                     <span
                       key={idx}
                       className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30"
                     >
                       {person}
                     </span>
                   ))}
                 </div>
               )}
               
               {item.assignedTo.length > 1 && (
                  <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                    <Users className="w-3 h-3 mr-1" />
                    <span>{item.assignedTo.length}</span>
                  </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};