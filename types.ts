
export interface ReceiptItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // List of names sharing this item
  assignmentWeights?: Record<string, number>; // Map of name -> share count (default 1)
}

export interface ReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

export interface PersonTotal {
  name: string;
  itemsTotal: number;
  taxShare: number;
  tipShare: number;
  finalTotal: number;
  items: string[];
}

export type AppState = 'upload' | 'analyzing' | 'splitting';

export interface SessionMeta {
  id: string;
  name: string;
  date: number;
  total: number;
  currency: string;
}

export interface SessionData {
  receiptData: ReceiptData | null;
  messages: ChatMessage[];
  appState: AppState;
}
