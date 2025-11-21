import React, { useState, useRef, useEffect } from 'react';
import { ReceiptItem } from '../types';
import { User, Users, Receipt, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface ReceiptPaneProps {
  items: ReceiptItem[];
  currency: string;
  onAddItem: () => void;
  onUpdateItem: (item: ReceiptItem) => void;
  onDeleteItem: (id: number) => void;
}

export const ReceiptPane: React.FC<ReceiptPaneProps> = ({ 
  items, 
  currency, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem 
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; price: string }>({ name: '', price: '' });
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleStartEdit = (item: ReceiptItem) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, price: item.price.toString() });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', price: '' });
  };

  const handleSaveEdit = (originalItem: ReceiptItem) => {
    const price = parseFloat(editForm.price);
    if (!editForm.name.trim() || isNaN(price)) return;

    onUpdateItem({
      ...originalItem,
      name: editForm.name,
      price: price
    });
    setEditingId(null);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Removed window.confirm to ensure instant deletion
    onDeleteItem(id);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-300">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
        <div>
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
        <button 
          onClick={onAddItem}
          className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg transition-colors"
          title="Add new item"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {items.map((item) => (
          <div
            key={item.id}
            className={`relative p-3.5 rounded-xl border transition-all duration-200 group ${
              editingId === item.id 
                ? 'border-indigo-500 ring-1 ring-indigo-500 bg-white dark:bg-gray-800'
                : item.assignedTo.length > 0
                  ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10'
                  : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {editingId === item.id ? (
              // EDIT MODE
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input 
                    ref={editInputRef}
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Item name"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">{currency}</span>
                    <input 
                      type="number" 
                      value={editForm.price}
                      onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg pl-6 pr-2 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <button 
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-md shadow-sm"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCancelEdit}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleSaveEdit(item)}
                      className="p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // VIEW MODE
              <>
                <div className="flex justify-between items-start mb-2.5">
                  <span className="font-medium text-gray-800 dark:text-gray-200 leading-snug flex-1 pr-2">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-sm whitespace-nowrap">
                      {currency}{item.price.toFixed(2)}
                    </span>
                    
                    {/* Action Buttons (Visible on Hover) */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 absolute top-2 right-2 md:static md:opacity-0 md:group-hover:opacity-100 bg-white dark:bg-gray-800 md:bg-transparent shadow-sm md:shadow-none rounded-lg p-1 md:p-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        title="Edit item"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};