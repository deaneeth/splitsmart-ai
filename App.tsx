
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ReceiptData, AppState, ChatMessage, ReceiptItem, SessionMeta, SessionData } from './types';
import { FileUploader } from './components/FileUploader';
import { ReceiptPane } from './components/ReceiptPane';
import { ChatInterface } from './components/ChatInterface';
import { Summary } from './components/Summary';
import { Sidebar } from './components/Sidebar';
import { parseReceiptImage, processChatCommand } from './services/geminiService';
import { Split, Sun, Moon, Trash2, Menu } from 'lucide-react';

const App: React.FC = () => {
  // --- Session Management & Migration ---
  const [sessions, setSessions] = useState<SessionMeta[]>(() => {
    if (typeof window === 'undefined') return [];
    
    const savedSessions = localStorage.getItem('splitSmart_sessions');
    if (savedSessions) {
      return JSON.parse(savedSessions);
    }

    // Check for legacy data to migrate
    const oldData = localStorage.getItem('splitSmart_receiptData');
    if (oldData) {
      try {
        const data = JSON.parse(oldData);
        const id = Date.now().toString();
        const oldMessages = localStorage.getItem('splitSmart_messages');
        const oldAppState = localStorage.getItem('splitSmart_appState');
        
        // Create payload for the new session structure
        const sessionData: SessionData = {
          receiptData: data,
          messages: oldMessages ? JSON.parse(oldMessages) : [],
          appState: (oldAppState as AppState) || 'upload'
        };
        
        // Save to new key
        localStorage.setItem(`splitSmart_session_${id}`, JSON.stringify(sessionData));
        
        // Create meta
        const meta: SessionMeta = {
          id,
          name: 'Previous Session',
          date: Date.now(),
          total: data.total || 0,
          currency: data.currency || '$'
        };
        
        // Clean up legacy keys
        localStorage.removeItem('splitSmart_receiptData');
        localStorage.removeItem('splitSmart_messages');
        localStorage.removeItem('splitSmart_appState');
        
        return [meta];
      } catch (e) {
        console.error("Migration failed", e);
      }
    }

    // Default initial session
    const initialId = Date.now().toString();
    return [{ 
      id: initialId, 
      name: 'New Receipt', 
      date: Date.now(), 
      total: 0, 
      currency: '$' 
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const savedId = localStorage.getItem('splitSmart_activeSessionId');
    if (savedId && sessions.find(s => s.id === savedId)) return savedId;
    return sessions.length > 0 ? sessions[0].id : '';
  });

  // --- Application State (Derived from Active Session) ---
  // We initialize these by reading the active session from LS to prevent flash
  const getInitialSessionData = (): SessionData => {
    const defaultData: SessionData = {
      receiptData: null,
      messages: [{
        id: 'welcome',
        role: 'model',
        text: 'Upload a receipt to get started! I can help you split the bill.',
        timestamp: Date.now(),
      }],
      appState: 'upload'
    };
    
    if (!activeSessionId) return defaultData;
    
    const stored = localStorage.getItem(`splitSmart_session_${activeSessionId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return defaultData;
      }
    }
    
    // Fallback: If session exists in list but no data (e.g. new session created but not saved yet)
    return defaultData;
  };

  const initialData = getInitialSessionData();

  const [appState, setAppState] = useState<AppState>(initialData.appState);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(initialData.receiptData);
  const [messages, setMessages] = useState<ChatMessage[]>(initialData.messages);

  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [isAppending, setIsAppending] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Track if we are currently switching sessions to prevent auto-save overwriting
  const isSwitchingRef = useRef(false);

  // --- Persistence Effects ---

  // 1. Save Active Session ID
  useEffect(() => {
    localStorage.setItem('splitSmart_activeSessionId', activeSessionId);
  }, [activeSessionId]);

  // 2. Save Sessions Index
  useEffect(() => {
    localStorage.setItem('splitSmart_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // 3. Auto-save Current Session Data
  useEffect(() => {
    if (!activeSessionId || isSwitchingRef.current) return;

    const sessionPayload: SessionData = {
      receiptData,
      messages,
      appState
    };
    localStorage.setItem(`splitSmart_session_${activeSessionId}`, JSON.stringify(sessionPayload));

    // Update metadata (Total/Currency) if changed
    setSessions(prev => {
      const session = prev.find(s => s.id === activeSessionId);
      if (session && receiptData && (session.total !== receiptData.total || session.currency !== receiptData.currency)) {
        return prev.map(s => s.id === activeSessionId ? { ...s, total: receiptData.total, currency: receiptData.currency } : s);
      }
      return prev;
    });

  }, [receiptData, messages, appState, activeSessionId]);

  // --- Theme Management ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // --- Session Actions ---

  const handleNewSession = () => {
    const newId = Date.now().toString();
    const newSession: SessionMeta = {
      id: newId,
      name: `Receipt ${sessions.length + 1}`,
      date: Date.now(),
      total: 0,
      currency: '$'
    };
    
    setSessions(prev => [newSession, ...prev]); // Add to top
    handleSwitchSession(newId);
  };

  const handleSwitchSession = (id: string) => {
    isSwitchingRef.current = true;
    
    // 1. Load new data
    const stored = localStorage.getItem(`splitSmart_session_${id}`);
    if (stored) {
      const data: SessionData = JSON.parse(stored);
      setReceiptData(data.receiptData);
      setMessages(data.messages);
      setAppState(data.appState);
    } else {
      // Fresh session
      setReceiptData(null);
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: 'Upload a receipt to get started! I can help you split the bill.',
        timestamp: Date.now(),
      }]);
      setAppState('upload');
    }

    setActiveSessionId(id);
    setIsSidebarOpen(false);
    
    // Allow state to settle before enabling auto-save again
    setTimeout(() => {
      isSwitchingRef.current = false;
    }, 100);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    localStorage.removeItem(`splitSmart_session_${id}`);

    if (activeSessionId === id) {
      if (newSessions.length > 0) {
        handleSwitchSession(newSessions[0].id);
      } else {
        // If deleted last session, create a new empty one
        handleNewSession();
      }
    }
  };

  const handleRenameSession = (id: string, newName: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  // --- Core Features ---

  const handleFileSelect = async (file: File) => {
    setAppState('analyzing');
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          try {
            const data = await parseReceiptImage(base64);
            setReceiptData(data);
            
            // Update session name based on date maybe? Or just keep "Receipt N"
            // Optional: Auto-name session based on first item or something? For now keep generic.

            const newMessages: ChatMessage[] = [
              {
                id: 'welcome',
                role: 'model',
                text: 'Upload a receipt to get started! I can help you split the bill.',
                timestamp: Date.now(),
              },
              {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "I've analyzed the receipt. You can now tell me who had what! (e.g., 'John had the salad')",
                timestamp: Date.now() + 1,
              }
            ];
            setMessages(newMessages);
            setAppState('splitting');
          } catch (error) {
            console.error(error);
            addMessage('model', "Sorry, I couldn't analyze that receipt. Please try again.");
            setAppState('upload');
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setAppState('upload');
    }
  };

  const handleAppendReceipt = async (file: File) => {
    setIsAppending(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          try {
            const newData = await parseReceiptImage(base64);
            
            setReceiptData(prev => {
              if (!prev) return newData;
              
              const maxId = prev.items.reduce((max, item) => Math.max(max, item.id), 0);
              const newItemsWithIds = newData.items.map((item, index) => ({
                ...item,
                id: maxId + index + 1
              }));

              return {
                ...prev,
                items: [...prev.items, ...newItemsWithIds],
                subtotal: prev.subtotal + newData.subtotal,
                tax: prev.tax + newData.tax,
                tip: prev.tip + newData.tip,
                total: prev.total + newData.total
              };
            });
            
            addMessage('model', `I've added ${newData.items.length} items from the new receipt to your list.`);
          } catch (error) {
            console.error(error);
            addMessage('model', "Sorry, I couldn't analyze the additional receipt. Please try again.");
          } finally {
            setIsAppending(false);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsAppending(false);
      addMessage('model', "Sorry, I encountered an error processing the file.");
    }
  };

  const handleResetSession = () => {
    // In new model, reset is effectively just clearing the data of current session
    setReceiptData(null);
    setMessages([{
      id: 'welcome',
      role: 'model',
      text: 'Upload a receipt to get started! I can help you split the bill.',
      timestamp: Date.now(),
    }]);
    setAppState('upload');
  };

  const addMessage = (role: 'user' | 'model', text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, text, timestamp: Date.now() },
    ]);
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (!receiptData) return;

    addMessage('user', text);
    setIsProcessingChat(true);

    try {
      const result = await processChatCommand(receiptData.items, text);
      
      // Apply updates
      if (result.updates.length > 0) {
        setReceiptData((prev) => {
          if (!prev) return null;
          const newItems = [...prev.items];
          
          result.updates.forEach(update => {
            const itemIndex = newItems.findIndex(item => item.id === update.itemId);
            if (itemIndex !== -1) {
              newItems[itemIndex] = {
                ...newItems[itemIndex],
                assignedTo: update.assignedTo
              };
            }
          });

          return { ...prev, items: newItems };
        });
      }

      addMessage('model', result.reply);

    } catch (error) {
      console.error(error);
      addMessage('model', "I encountered an error processing that command.");
    } finally {
      setIsProcessingChat(false);
    }
  }, [receiptData]);

  // --- Item/Tax/Tip Handlers ---

  const handleAddItem = () => {
    setReceiptData(prev => {
      if (!prev) return null;
      const newItem: ReceiptItem = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        name: "New Item",
        price: 0,
        quantity: 1,
        assignedTo: []
      };
      const updatedItems = [newItem, ...prev.items];
      const newSubtotal = updatedItems.reduce((acc, item) => acc + item.price, 0);
      return {
        ...prev,
        items: updatedItems,
        subtotal: newSubtotal,
        total: newSubtotal + prev.tax + prev.tip 
      };
    });
  };

  const handleUpdateItem = (updatedItem: ReceiptItem) => {
    setReceiptData(prev => {
      if (!prev) return null;
      const updatedItems = prev.items.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      );
      const newSubtotal = updatedItems.reduce((acc, item) => acc + item.price, 0);
      return {
        ...prev,
        items: updatedItems,
        subtotal: newSubtotal,
        total: newSubtotal + prev.tax + prev.tip
      };
    });
  };

  const handleDeleteItem = (itemId: number) => {
    setReceiptData(prev => {
      if (!prev) return null;
      const updatedItems = prev.items.filter(item => item.id !== itemId);
      const newSubtotal = updatedItems.reduce((acc, item) => acc + item.price, 0);
      return {
        ...prev,
        items: updatedItems,
        subtotal: newSubtotal,
        total: newSubtotal + prev.tax + prev.tip
      };
    });
  };

  const handleUpdateTax = (newTax: number) => {
    setReceiptData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tax: newTax,
        total: prev.subtotal + newTax + prev.tip
      };
    });
  };

  const handleUpdateTip = (newTip: number) => {
    setReceiptData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tip: newTip,
        total: prev.subtotal + prev.tax + newTip
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300 text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSwitchSession={handleSwitchSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
      />

      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-4 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center group cursor-pointer" onClick={() => setAppState('upload')}>
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl mr-3 shadow-lg shadow-indigo-500/20 transform group-hover:scale-105 transition-transform duration-200">
                <Split className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight hidden sm:block">
              SplitSmart<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
            </h1>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight sm:hidden">
              SplitSmart
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {receiptData && (
            <button
              onClick={handleResetSession}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Clear Current Receipt"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 transition-transform duration-500 rotate-0 hover:rotate-90" />
            ) : (
              <Moon className="w-5 h-5 transition-transform duration-500 rotate-0 hover:-rotate-12" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 transition-colors duration-300">
        {appState === 'upload' || appState === 'analyzing' ? (
          <div className="max-w-3xl mx-auto mt-16 md:mt-24 px-4 animate-fade-in-up">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Bill splitting, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">reimagined.</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
                Upload a receipt, chat with our AI, and split costs in seconds. No more spreadsheets.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-indigo-100/50 dark:shadow-none p-2">
              <FileUploader onFileSelect={handleFileSelect} isAnalyzing={appState === 'analyzing'} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-7rem)]">
            {/* Left Column: Receipt */}
            <div className="lg:col-span-1 h-full overflow-hidden flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
              {receiptData && (
                <ReceiptPane 
                  items={receiptData.items} 
                  currency={receiptData.currency}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                  onAddReceipt={handleAppendReceipt}
                  isScanning={isAppending}
                />
              )}
            </div>

            {/* Middle Column: Chat */}
            <div className="lg:col-span-1 h-full overflow-hidden flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 order-3 lg:order-2">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isProcessing={isProcessingChat}
              />
            </div>

            {/* Right Column: Summary */}
            <div className="lg:col-span-1 h-full overflow-hidden flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 order-2 lg:order-3">
              {receiptData && (
                <Summary 
                  data={receiptData} 
                  onUpdateTax={handleUpdateTax}
                  onUpdateTip={handleUpdateTip}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
