
import React, { useCallback } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isAnalyzing }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (isAnalyzing) return;
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    },
    [onFileSelect, isAnalyzing]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full h-[50vh] md:h-80 rounded-2xl transition-all duration-300 overflow-hidden ${
        isAnalyzing
          ? 'bg-indigo-50 dark:bg-indigo-900/20 cursor-wait'
          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {isAnalyzing ? (
        <div className="flex flex-col items-center z-10 p-6 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
            <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-spin relative z-10" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Analyzing Receipt</p>
          <p className="text-base text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
            Gemini is extracting items & prices...
          </p>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group">
          <div className="flex flex-col items-center justify-center p-6 text-center transition-transform group-hover:scale-105 duration-300">
            <div className="p-6 bg-white dark:bg-gray-700 rounded-full mb-6 shadow-sm group-hover:shadow-md group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 transition-all duration-300">
              <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              Tap to Upload Receipt
            </h3>
            <p className="text-base text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
              Take a photo or select from library (PNG, JPG)
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
              <ImageIcon className="w-3 h-3" />
              <span>Supports clear receipt images</span>
            </div>
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleChange} />
        </label>
      )}
    </div>
  );
};
