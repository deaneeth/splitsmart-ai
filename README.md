# SplitSmart AI 🧾🤖

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google%20bard&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

**SplitSmart AI** is an intelligent bill-splitting web application that revolutionizes how groups share costs. By leveraging Google's **Gemini API**, it turns static receipt images into interactive, assignable lists, allowing users to split bills using natural language, drag-and-drop, or manual controls.

---

## ✨ Key Features

### 🧠 AI-Powered Parsing
*   **Instant Digitization**: Upload a photo of your receipt, and Gemini 3 Pro extracts all items, prices, tax, and tip data with high precision.
*   **Visual Grounding**: Hover over items to see a **cropped zoom** of the original receipt line, ensuring you know exactly what you're assigning.

### 💬 Natural Language Assignments
*   **Chat Assistant**: Just type "Tom and Jerry shared the pizza" or "Alice had the salad," and the AI updates the bill in real-time.
*   **Context Aware**: The AI understands context and handles complex splitting logic effortlessly.

### ⚖️ Advanced Splitting Logic
*   **Weighted Splits**: Assign items unevenly (e.g., "Bob ate 3 slices, Alice ate 1"). The math handles the ratios automatically.
*   **Equal Split Mode**: Toggle between itemized breakdowns and a simple "even split" for the whole table.
*   **Dynamic Tax & Tip**: Automatically distributes tax and tip proportionally based on individual sub-totals.

### 🥗 Smart & Fun Extras
*   **Dietary Analysis**: One-click analysis to tag items as 🌱 Vegan, 🌾 Gluten-Free, 🌶️ Spicy, 🍷 Alcohol, etc.
*   **Roast Mode**: Need a laugh? The AI analyzes spending habits and generates a witty "roast" of your group (e.g., mocking the big spender).

### 🛠️ Modern UX/UI
*   **Drag-and-Drop**: (Desktop) Drag friends from your "Frequent Friends" sidebar directly onto items.
*   **Dark Mode**: Fully responsive design with automatic dark mode support.
*   **Session History**: Auto-saves your receipts locally so you never lose track of a bill.
*   **Export**: Copy the summary to clipboard or download it as an image to share in group chats.

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v16+)
*   **Google Gemini API Key** (Get one at [Google AI Studio](https://aistudio.google.com/))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/splitsmart-ai.git
    cd splitsmart-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env` file in the root directory and add your API key:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the application**
    ```bash
    npm start
    ```
    Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

---

## 📖 Usage Guide

### 1. Upload Receipt
Drag and drop an image file or click to use your camera. The app supports standard image formats (JPG, PNG). Wait a moment for Gemini to process the image.

### 2. Assign Items
*   **Click**: Tap an item to open the assignment popup. Select names from the list or add new ones.
*   **Chat**: Type commands like "Add Sarah to the Burger" in the chat box.
*   **Drag (Desktop)**: Drag a user avatar from the right sidebar onto a row.
*   **Weights**: In the assignment popup, use `+` / `-` to adjust shares (e.g., User A pays for 2/3, User B for 1/3).

### 3. Analyze & Roast
*   Click the **Leaf Icon** (🌿) to identify dietary restrictions.
*   In the Summary tab, click the **Flame Icon** (🔥) to generate a funny roast of the bill.

### 4. Settle Up
Go to the **Summary** tab to view the final breakdown.
*   Adjust tax and tip if needed.
*   Click **Copy** to paste the text into WhatsApp/Messenger.
*   Click **Download** to save a receipt image.

---

## 🏗️ Architecture

The project is built with a clean, component-based architecture:

*   **`App.tsx`**: Main state manager handling sessions, receipt data, and global UI state.
*   **`services/geminiService.ts`**: Handles all interactions with the Google GenAI SDK.
    *   `parseReceiptImage`: Vision-to-JSON extraction.
    *   `processChatCommand`: NLP for assignment logic.
    *   `identifyDietaryRestrictions`: Classification task.
    *   `generateRoast`: Creative text generation.
*   **`components/`**:
    *   `ReceiptPane.tsx`: The core list view with complex interactions (drag-n-drop, editing, overlays).
    *   `ChatInterface.tsx`: Chat UI for natural language commands.
    *   `Summary.tsx`: Calculation engine and result visualization.
    *   `FileUploader.tsx`: Drag-and-drop file input with visual feedback.
    *   `Sidebar.tsx`: Session history management.
*   **`types.ts`**: TypeScript definitions for type safety across the app.

---

## 🔧 Tech Stack Details

*   **Frontend**: React 18 with TypeScript.
*   **Styling**: Tailwind CSS for utility-first, responsive styling.
*   **AI Integration**: `@google/genai` SDK.
*   **Models Used**:
    *   `gemini-3-pro-preview`: Complex vision tasks (parsing) and creative writing (roasting).
    *   `gemini-flash-lite-latest` or `gemini-2.5-flash`: Fast, low-latency tasks (chat commands, dietary analysis).
*   **Icons**: `lucide-react`.
*   **Utils**: `html2canvas` for image export.

---

## 📄 License

This project is open source and available under the **MIT License**.

---

*Built with ❤️ and 🤖 by [Your Name]*