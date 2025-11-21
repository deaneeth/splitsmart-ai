import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ReceiptItem } from '../types';
import { User, Users, Receipt, Plus, Pencil, Trash2, Check, X, UserPlus } from 'lucide-react';

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
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; price: string }>({ name: '', price: '' });
  const [newAssigneeName, setNewAssigneeName] = useState('');
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const assignInputRef = useRef<HTMLInputElement>(null);

  // Derive a list of all unique people currently assigned to any item
  const allParticipants = useMemo(() => {
    const people = new Set<string>();
    items.forEach(item => item.assignedTo.forEach(p => people.add(p)));
    return Array.from(people).sort();
  }, [items]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  // Focus input when assigning starts
  useEffect(() => {
    if (assigningId !== null && assignInputRef.current) {
      assignInputRef.current.focus();
    }
  }, [assigningId]);

  const handleStartEdit = (item: ReceiptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssigningId(null);
    setEditingId(item.id);
    setEditForm({ name: item.name, price: item.price.toString() });
  };

  const handleStartAssign = (item: ReceiptItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editingId !== null) return; // Don't open if editing
    setEditingId(null);
    setAssigningId(assigningId === item.id ? null : item.id);
    setNewAssigneeName('');
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
    onDeleteItem(id);
  };

  const toggleAssignment = (item: ReceiptItem, person: string) => {
    const currentAssignments = item.assignedTo;
    let newAssignments;
    
    if (currentAssignments.includes(person)) {
      newAssignments = currentAssignments.filter(p => p !== person);
    } else {
      newAssignments = [...currentAssignments, person];
    }
    
    onUpdateItem({ ...item, assignedTo: newAssignments });
  };

  const handleAddNewAssignee = (item: ReceiptItem) => {
    if (!newAssigneeName.trim()) return;
    
    // Capitalize first letter for consistency
    const name = newAssigneeName.trim();
    
    if (!item.assignedTo.includes(name)) {
      onUpdateItem({
        ...item,
        assignedTo: [...item.assignedTo, name]
      });
    }
    setNewAssigneeName('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-300 relative">
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
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pb-32">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={(e) => !editingId && handleStartAssign(item, e)}
            className={`relative p-3.5 rounded-xl border transition-all duration-200 group ${
              editingId === item.id 
                ? 'border-indigo-500 ring-1 ring-indigo-500 bg-white dark:bg-gray-800'
                : assigningId === item.id
                  ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/20 bg-white dark:bg-gray-800 z-20 shadow-lg'
                  : item.assignedTo.length > 0
                    ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10 cursor-pointer hover:border-indigo-300'
                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
            }`}
          >
            {editingId === item.id ? (
              // EDIT MODE
              <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
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
              // VIEW / ASSIGN MODE
              <>
                <div className="flex justify-between items-start mb-2.5">
                  <span className="font-medium text-gray-800 dark:text-gray-200 leading-snug flex-1 pr-2 select-none">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-sm whitespace-nowrap">
                      {currency}{item.price.toFixed(2)}
                    </span>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 absolute top-2 right-2 md:static md:opacity-0 md:group-hover:opacity-100 bg-white dark:bg-gray-800 md:bg-transparent shadow-sm md:shadow-none rounded-lg p-1 md:p-0 z-10">
                      <button 
                        onClick={(e) => handleStartAssign(item, e)}
                        className={`p-1.5 rounded-md transition-colors ${
                          assigningId === item.id 
                          ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title="Assign people"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleStartEdit(item, e)}
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
                     <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center italic select-none">
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

                {/* POPUP MENU FOR ASSIGNMENT */}
                {assigningId === item.id && (
                  <div 
                    className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in-up overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assign To</span>
                      <button onClick={() => setAssigningId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="max-h-56 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {allParticipants.length > 0 ? (
                         allParticipants.map(person => {
                           const isAssigned = item.assignedTo.includes(person);
                           return (
                             <div 
                               key={person}
                               onClick={() => toggleAssignment(item, person)}
                               className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all duration-200 ${
                                 isAssigned 
                                   ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                                   : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                               }`}
                             >
                               <span className="truncate max-w-[190px]">{person}</span>
                               {isAssigned && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                             </div>
                           );
                         })
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-4 italic">No people added yet</p>
                      )}
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <div className="flex gap-2">
                        <input
                          ref={assignInputRef}
                          type="text"
                          value={newAssigneeName}
                          onChange={(e) => setNewAssigneeName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddNewAssignee(item)}
                          placeholder="Add new person..."
                          className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-all"
                        />
                        <button 
                          onClick={() => handleAddNewAssignee(item)}
                          disabled={!newAssigneeName.trim()}
                          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      
      {/* Overlay to close popover when clicking outside */}
      {assigningId !== null && (
        <div 
          className="fixed inset-0 z-0 bg-transparent" 
          onClick={() => setAssigningId(null)}
        />
      )}
    </div>
  );
};
