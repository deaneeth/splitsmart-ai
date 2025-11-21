import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 transition-colors duration-300 relative overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-2.5">
             <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          AI Assistant
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-10">
          Tell me who ordered what
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50/50 dark:bg-gray-950/50 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex justify-start animate-pulse">
             <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-none shadow-sm p-4 flex items-center space-x-2">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., 'Tom had the burger'"
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full pl-5 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};