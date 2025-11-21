export interface ReceiptItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // List of names sharing this item
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