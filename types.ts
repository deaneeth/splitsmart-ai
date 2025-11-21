
export interface ReceiptItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[]; // List of names sharing this item
  assignmentWeights?: Record<string, number>; // Map of name -> share count (default 1)
  dietaryTags?: string[]; // e.g. 'vegan', 'gluten-free'
  box_2d?: number[]; // [ymin, xmin, ymax, xmax] 1000x1000 normalized
}

export interface ReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
  imageUrl?: string; // Base64 string of the original receipt
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
