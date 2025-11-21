
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ReceiptItem } from '../types';
import { User, Users, Receipt, Plus, Pencil, Trash2, Check, X, UserPlus, ImagePlus, Loader2, Camera, Minus, Leaf, Eye, GripVertical } from 'lucide-react';
import { identifyDietaryRestrictions } from '../services/geminiService';

// Color palette for user avatars and tags
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

interface ReceiptPaneProps {
  items: ReceiptItem[];
  currency: string;
  onAddItem: () => void;
  onUpdateItem: (item: ReceiptItem) => void;
  onDeleteItem: (id: number) => void;
  onAddReceipt: (file: File) => void;
  isScanning: boolean;
  imageUrl?: string;
}

const ReceiptCrop: React.FC<{ imageUrl: string; box: number[]; width?: number }> = ({ imageUrl, box, width = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const [ymin, xmin, ymax, xmax] = box;
      
      // Convert normalized (0-1000) to pixels
      const sx = (xmin / 1000) * img.width;
      const sy = (ymin / 1000) * img.height;
      const sWidth = ((xmax - xmin) / 1000) * img.width;
      const sHeight = ((ymax - ymin) / 1000) * img.height;

      // Aspect ratio
      const aspectRatio = sWidth / sHeight;
      const renderWidth = width;
      const renderHeight = width / aspectRatio;

      canvas.width = renderWidth;
      canvas.height = renderHeight;

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, renderWidth, renderHeight);
    };
  }, [imageUrl, box, width]);

  return <canvas ref={canvasRef} className="rounded-lg shadow-md border border-gray-200 dark:border-gray-700" />;
};

export const ReceiptPane: React.FC<ReceiptPaneProps> = ({ 
  items, 
  currency, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem,
  onAddReceipt,
  isScanning,
  imageUrl
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; price: string }>({ name: '', price: '' });
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [isDietaryLoading, setIsDietaryLoading] = useState(false);
  const [hoveredCropId, setHoveredCropId] = useState<number | null>(null);
  
  const [friends, setFriends] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('splitSmart_friends');
    return saved ? JSON.parse(saved) : [];
  });

  const editInputRef = useRef<HTMLInputElement>(null);
  const assignInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist friends
  useEffect(() => {
    localStorage.setItem('splitSmart_friends', JSON.stringify(friends));
  }, [friends]);

  const allParticipants = useMemo(() => {
    const people = new Set<string>();
    items.forEach(item => item.assignedTo.forEach(p => people.add(p)));
    friends.forEach(f => people.add(f));
    return Array.from(people).sort();
  }, [items, friends]);

  const handleStartEdit = (item: ReceiptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssigningId(null);
    setEditingId(item.id);
    setEditForm({ name: item.name, price: item.price.toString() });
  };

  const handleStartAssign = (item: ReceiptItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editingId !== null) return;
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
    const currentWeights = item.assignmentWeights || {};
    let newAssignments;
    let newWeights = { ...currentWeights };
    
    if (currentAssignments.includes(person)) {
      newAssignments = currentAssignments.filter(p => p !== person);
      delete newWeights[person];
    } else {
      newAssignments = [...currentAssignments, person];
      newWeights[person] = 1;
    }
    
    onUpdateItem({ ...item, assignedTo: newAssignments, assignmentWeights: newWeights });
  };

  const updateWeight = (item: ReceiptItem, person: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentWeights = item.assignmentWeights || {};
    const currentWeight = currentWeights[person] || 1;
    const newWeight = Math.max(1, currentWeight + delta);

    const newWeights = { ...currentWeights, [person]: newWeight };
    onUpdateItem({ ...item, assignmentWeights: newWeights });
  };

  const addFriend = (name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    if (!friends.includes(cleanName)) {
      setFriends(prev => [...prev, cleanName]);
    }
    return cleanName;
  };

  const removeFriend = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFriends(prev => prev.filter(f => f !== name));
  };

  const handleAddNewAssignee = (item: ReceiptItem) => {
    if (!newAssigneeName.trim()) return;
    const name = addFriend(newAssigneeName)!;
    
    if (!item.assignedTo.includes(name)) {
      const newWeights = { ...(item.assignmentWeights || {}) };
      newWeights[name] = 1;
      
      onUpdateItem({
        ...item,
        assignedTo: [...item.assignedTo, name],
        assignmentWeights: newWeights
      });
    }
    setNewAssigneeName('');
  };

  const handleRunDietaryAnalysis = async () => {
    setIsDietaryLoading(true);
    try {
      const results = await identifyDietaryRestrictions(items);
      results.forEach(res => {
        const item = items.find(i => i.id === res.id);
        if (item) {
          onUpdateItem({ ...item, dietaryTags: res.tags });
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsDietaryLoading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, name: string) => {
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, item: ReceiptItem) => {
    e.preventDefault();
    const name = e.dataTransfer.getData('text/plain');
    if (name && !item.assignedTo.includes(name)) {
      toggleAssignment(item, name);
    }
  };

  // Emoji map for tags
  const getTagEmoji = (tag: string) => {
    const lower = tag.toLowerCase();
    if (lower.includes('vegan')) return '🌱';
    if (lower.includes('gluten')) return '🌾';
    if (lower.includes('spicy')) return '🌶️';
    if (lower.includes('alcohol')) return '🍷';
    if (lower.includes('nut')) return '🥜';
    if (lower.includes('dairy')) return '🥛';
    return '🏷️';
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-white dark:bg-gray-900">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => {
          if (e.target.files?.[0]) onAddReceipt(e.target.files[0]);
          if (e.target) e.target.value = '';
        }} 
      />

      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-2.5">
              <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Items
          </h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRunDietaryAnalysis}
            disabled={isDietaryLoading}
            className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 rounded-lg transition-colors disabled:opacity-50"
            title="Auto-tag dietary info"
          >
            {isDietaryLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Leaf className="w-5 h-5" />}
          </button>
          <div className="hidden lg:flex gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            </button>
            <button 
              onClick={onAddItem}
              className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Main List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {items.map((item) => (
            <div
              key={item.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item)}
              onClick={(e) => !editingId && handleStartAssign(item, e)}
              className={`relative p-3.5 rounded-xl border transition-all duration-200 group ${
                editingId === item.id 
                  ? 'border-indigo-500 ring-1 ring-indigo-500 bg-white dark:bg-gray-800'
                  : assigningId === item.id
                    ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-400/20 bg-white dark:bg-gray-800 z-20 shadow-lg'
                    : item.assignedTo.length > 0
                      ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-900/5 cursor-pointer hover:border-indigo-300'
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
                      className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-base md:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Item name"
                    />
                    <div className="relative w-24 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">{currency}</span>
                      <input 
                        type="number" 
                        value={editForm.price}
                        onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg pl-6 pr-2 py-2 text-base md:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <button onClick={(e) => handleDelete(item.id, e)} className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-md shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    <div className="flex gap-2">
                      <button onClick={handleCancelEdit} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><X className="w-4 h-4" /></button>
                      <button onClick={() => handleSaveEdit(item)} className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md"><Check className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <>
                  <div className="flex justify-between items-start mb-2.5 relative">
                    <div className="flex-1 pr-2">
                       <span className="font-medium text-gray-800 dark:text-gray-200 leading-snug select-none">{item.name}</span>
                       {item.dietaryTags && item.dietaryTags.length > 0 && (
                         <div className="flex flex-wrap gap-1 mt-1">
                           {item.dietaryTags.map((tag, idx) => (
                             <span key={idx} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-600" title={tag}>
                               {getTagEmoji(tag)} {tag}
                             </span>
                           ))}
                         </div>
                       )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-sm whitespace-nowrap">
                        {currency}{item.price.toFixed(2)}
                      </span>
                      
                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm md:bg-transparent rounded-lg p-1 md:p-0 z-10">
                        {item.box_2d && imageUrl && (
                          <div className="relative hidden md:block">
                             <button 
                               className="p-1.5 text-gray-400 hover:text-indigo-600"
                               onMouseEnter={() => setHoveredCropId(item.id)}
                               onMouseLeave={() => setHoveredCropId(null)}
                             >
                               <Eye className="w-3.5 h-3.5" />
                             </button>
                             {hoveredCropId === item.id && (
                               <div className="absolute right-full top-0 mr-2 z-50 w-48 pointer-events-none animate-fade-in-up">
                                  <div className="bg-white dark:bg-gray-800 p-1 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                                     <ReceiptCrop imageUrl={imageUrl} box={item.box_2d} />
                                  </div>
                               </div>
                             )}
                          </div>
                        )}
                        <button onClick={(e) => handleStartEdit(item, e)} className="md:hidden p-1.5 text-gray-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={(e) => handleStartAssign(item, e)} className="hidden md:block p-1.5 text-gray-400 hover:text-indigo-600"><UserPlus className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => handleStartEdit(item, e)} className="hidden md:block p-1.5 text-gray-400 hover:text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => handleDelete(item.id, e)} className="hidden md:block p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm min-h-[1.5rem]">
                     {item.assignedTo.length === 0 ? (
                       <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center italic select-none">
                         <User className="w-3 h-3 mr-1.5" />
                         Unassigned <span className="hidden md:inline ml-1">- Drag friend here</span>
                       </span>
                     ) : (
                       <div className="flex flex-wrap gap-1.5">
                         {item.assignedTo.map((person, idx) => {
                           const color = getUserColor(person);
                           const weight = item.assignmentWeights?.[person] || 1;
                           return (
                             <span
                               key={idx}
                               className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}
                             >
                               {person}
                               {weight > 1 && <span className="ml-1 opacity-70 text-[10px]">x{weight}</span>}
                             </span>
                           );
                         })}
                       </div>
                     )}
                  </div>

                  {assigningId === item.id && (
                    <div className="absolute left-0 top-full mt-2 w-full md:w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in-up overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assign To</span>
                        <button onClick={() => setAssigningId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="max-h-56 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {allParticipants.length > 0 ? (
                           allParticipants.map(person => {
                             const isAssigned = item.assignedTo.includes(person);
                             const color = getUserColor(person);
                             const weight = item.assignmentWeights?.[person] || 1;
                             return (
                               <div key={person} onClick={() => toggleAssignment(item, person)} className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-200 ${isAssigned ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
                                 <div className="flex items-center flex-1 overflow-hidden">
                                   <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mr-2.5 shrink-0 ${color.bg} ${color.text} ring-1 ring-inset ring-black/5 dark:ring-white/5`}>{getInitials(person)}</div>
                                   <span className="truncate mr-2">{person}</span>
                                 </div>
                                 {isAssigned && (
                                   <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={(e) => updateWeight(item, person, -1, e)} className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-700 rounded-md text-indigo-600 dark:text-indigo-400"><Minus className="w-3 h-3" /></button>
                                      <span className="text-xs font-bold w-4 text-center select-none">{weight}</span>
                                      <button onClick={(e) => updateWeight(item, person, 1, e)} className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-700 rounded-md text-indigo-600 dark:text-indigo-400"><Plus className="w-3 h-3" /></button>
                                   </div>
                                 )}
                               </div>
                             );
                           })
                        ) : ( <p className="text-xs text-gray-400 text-center py-4 italic">No people added yet</p> )}
                      </div>
                      <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex gap-2">
                          <input ref={assignInputRef} type="text" value={newAssigneeName} onChange={(e) => setNewAssigneeName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNewAssignee(item)} placeholder="Add name..." className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                          <button onClick={() => handleAddNewAssignee(item)} disabled={!newAssigneeName.trim()} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        
        {/* Desktop "Friends" Sidebar (Drag Source) */}
        <div className="hidden xl:flex w-48 border-l border-gray-100 dark:border-gray-800 flex-col bg-gray-50/50 dark:bg-gray-900/50">
           <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Quick Drag
              </h3>
           </div>
           <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              {friends.map(friend => {
                 const color = getUserColor(friend);
                 return (
                   <div
                     key={friend}
                     draggable
                     onDragStart={(e) => handleDragStart(e, friend)}
                     className="group flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
                   >
                      <GripVertical className="w-3 h-3 text-gray-300" />
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${color.bg} ${color.text}`}>
                         {getInitials(friend)}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{friend}</span>
                      <button onClick={(e) => removeFriend(friend, e)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                   </div>
                 )
              })}
              <div className="pt-2">
                 <form onSubmit={(e) => {
                   e.preventDefault();
                   if (newAssigneeName.trim()) {
                     addFriend(newAssigneeName);
                     setNewAssigneeName('');
                   }
                 }}>
                    <input 
                      type="text" 
                      value={newAssigneeName}
                      onChange={(e) => setNewAssigneeName(e.target.value)}
                      placeholder="+ Add friend"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                 </form>
              </div>
           </div>
           <div className="p-3 text-[10px] text-gray-400 text-center">
             Drag friends onto items to assign
           </div>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="lg:hidden flex-none p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-3 z-20">
        <button onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-gray-800 text-indigo-600 border border-indigo-200 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors shadow-sm disabled:opacity-50">
           {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
           <span>Scan</span>
        </button>
        <button onClick={onAddItem} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20">
          <Plus className="w-5 h-5" />
          <span>Add Item</span>
        </button>
      </div>
      
      {/* Overlay for popover */}
      {assigningId !== null && <div className="fixed inset-0 z-0 bg-black/10 backdrop-blur-[1px]" onClick={() => setAssigningId(null)} />}
    </div>
  );
};
