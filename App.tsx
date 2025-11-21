import React, { useState, useCallback, useEffect } from 'react';
import { ReceiptData, AppState, ChatMessage } from './types';
import { FileUploader } from './components/FileUploader';
import { ReceiptPane } from './components/ReceiptPane';
import { ChatInterface } from './components/ChatInterface';
import { Summary } from './components/Summary';
import { parseReceiptImage, processChatCommand } from './services/geminiService';
import { Split, Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Upload a receipt to get started! I can help you split the bill.',
      timestamp: Date.now(),
    },
  ]);
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize theme based on system preference or local storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDarkMode(true);
    }
  }, []);

  // Apply theme class to document and save to local storage
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
            setAppState('splitting');
            addMessage('model', "I've analyzed the receipt. You can now tell me who had what! (e.g., 'John had the salad')");
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300 text-gray-900 dark:text-gray-100 font-sans">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-4 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
        <div className="flex items-center group cursor-pointer" onClick={() => setAppState('upload')}>
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl mr-3 shadow-lg shadow-indigo-500/20 transform group-hover:scale-105 transition-transform duration-200">
              <Split className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">
            SplitSmart<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
          </h1>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 transition-transform duration-500 rotate-0 hover:rotate-90" />
          ) : (
            <Moon className="w-5 h-5 transition-transform duration-500 rotate-0 hover:-rotate-12" />
          )}
        </button>
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
              {receiptData && <ReceiptPane items={receiptData.items} currency={receiptData.currency} />}
            </div>

            {/* Middle Column: Chat */}
            <div className="lg:col-span-1 h-full overflow-hidden flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isProcessing={isProcessingChat}
              />
            </div>

            {/* Right Column: Summary */}
            <div className="lg:col-span-1 h-full overflow-hidden flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
              {receiptData && <Summary data={receiptData} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;