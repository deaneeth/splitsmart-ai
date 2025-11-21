
import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData, ReceiptItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseReceiptImage = async (base64Image: string): Promise<ReceiptData> => {
  const modelId = 'gemini-3-pro-preview';
  
  // Define schema for strict JSON output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            price: { type: Type.NUMBER, description: "Total price for this line item (unit price * quantity)" },
            quantity: { type: Type.NUMBER, description: "Quantity of the item, default to 1" },
            box_2d: { 
              type: Type.ARRAY, 
              items: { type: Type.NUMBER },
              description: "Bounding box [ymin, xmin, ymax, xmax] in 1000x1000 normalized coordinates." 
            }
          },
          required: ["name", "price"],
        },
      },
      subtotal: { type: Type.NUMBER },
      tax: { type: Type.NUMBER },
      tip: { type: Type.NUMBER },
      total: { type: Type.NUMBER },
      currency: { type: Type.STRING, description: "Currency symbol, e.g., $, £, €" },
    },
    required: ["items", "total"],
  };

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png', // Assuming PNG/JPEG, API handles conversion often
            data: base64Image.split(',')[1], // Remove header
          },
        },
        {
          text: "Analyze this receipt. Extract all items, their prices, tax, tip, and the total. If tax or tip is not explicitly listed, set them to 0. Ensure prices are numbers. Also identify the bounding box for each item."
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      systemInstruction: "You are an expert receipt parser. Precision is key. Locate items on the image.",
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  const data = JSON.parse(text);
  
  // Add IDs and empty assignments to items
  const itemsWithIds: ReceiptItem[] = data.items.map((item: any, index: number) => ({
    ...item,
    id: index + 1,
    quantity: item.quantity || 1,
    assignedTo: [],
  }));

  return {
    items: itemsWithIds,
    subtotal: data.subtotal || itemsWithIds.reduce((acc: number, curr: ReceiptItem) => acc + curr.price, 0),
    tax: data.tax || 0,
    tip: data.tip || 0,
    total: data.total || 0,
    currency: data.currency || '$',
    imageUrl: base64Image, // Store the image for overlays
  };
};

export const identifyDietaryRestrictions = async (items: ReceiptItem[]): Promise<{id: number, tags: string[]}[]> => {
  const modelId = 'gemini-2.5-flash';
  
  const itemNames = items.map(i => ({ id: i.id, name: i.name }));
  
  const prompt = `
    Analyze these food items and identify dietary tags.
    Tags to look for: "Vegan", "Gluten-Free", "Spicy", "Alcohol", "Nuts", "Dairy".
    Return a JSON list of objects with 'id' and 'tags'.
    Items: ${JSON.stringify(itemNames)}
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  const text = response.text;
  if (!text) return [];
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Dietary analysis failed", e);
    return [];
  }
};

export const generateRoast = async (receiptData: ReceiptData, breakdown: any): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  
  const prompt = `
    Here is a bill breakdown:
    ${JSON.stringify(breakdown)}
    
    The total bill was ${receiptData.currency}${receiptData.total}.
    
    Generate a funny, short "roast" of the group's spending habits. 
    Make fun of who spent the most, or specific expensive items, or if someone only bought salad while others drank alcohol. 
    Keep it lighthearted and under 50 words.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
  });

  return response.text || "Wow, big spenders!";
};

export interface ChatActionResponse {
  updates: { itemId: number; assignedTo: string[] }[];
  reply: string;
}

export const processChatCommand = async (
  currentItems: ReceiptItem[],
  userMessage: string
): Promise<ChatActionResponse> => {
  // Use Flash Lite for low latency responses
  const modelId = 'gemini-flash-lite-latest';

  // Simplified item list for the prompt to save tokens and reduce noise
  const simplifiedItems = currentItems.map(i => ({
    id: i.id,
    name: i.name,
    price: i.price,
    current_assignees: i.assignedTo
  }));

  const prompt = `
    Current Receipt State:
    ${JSON.stringify(simplifiedItems, null, 2)}

    User Message: "${userMessage}"

    Task:
    1. Interpret the user's message to update who is assigned to which item.
    2. Users might say "Tom had the burger" or "Share the pizza between Alice and Bob".
    3. If the user says "Everyone shared the appetizers", assign all appetizers to all known names or just return the logic. 
    4. However, for this specific task, return EXACT updates for specific item IDs.
    5. If a user assigns an item to someone new, just add their name.
    6. If "split" or "shared", replace the 'assignedTo' array with the new list of names.
    7. If the user adds someone to an existing share, include previous names + new name.
    
    Return JSON format:
    {
      "updates": [
        { "itemId": 1, "assignedTo": ["Alice"] },
        { "itemId": 2, "assignedTo": ["Alice", "Bob"] }
      ],
      "reply": "A natural language confirmation of what was done."
    }
    
    If the user message is just chitchat, return empty updates and a polite reply.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are a billing assistant. You strictly manage assignments of receipt items.",
    },
  });

  const text = response.text;
  if (!text) return { updates: [], reply: "I didn't understand that." };

  try {
    return JSON.parse(text) as ChatActionResponse;
  } catch (e) {
    console.error("Failed to parse chat response", e);
    return { updates: [], reply: "Error processing your request." };
  }
};
