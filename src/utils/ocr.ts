import { createWorker } from 'tesseract.js';

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface ReceiptData {
  items: ReceiptItem[];
  total: number;
  date: string;
  storeName: string;
}

export async function processReceipt(imageData: string): Promise<ReceiptData> {
  const worker = await createWorker();
  
  try {
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    const { data: { text } } = await worker.recognize(imageData);
    
    // Basic parsing logic - this can be enhanced based on receipt format
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    const items: ReceiptItem[] = [];
    let total = 0;
    let date = '';
    let storeName = lines[0] || ''; // Assume first line is store name
    
    // Simple regex patterns for date and price
    const datePattern = /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;
    const pricePattern = /\$?\d+\.\d{2}/;
    
    for (const line of lines) {
      // Try to find date
      const dateMatch = line.match(datePattern);
      if (dateMatch && !date) {
        date = dateMatch[0];
        continue;
      }
      
      // Try to find items with prices
      const priceMatch = line.match(pricePattern);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace('$', ''));
        const name = line.replace(priceMatch[0], '').trim();
        
        if (line.toLowerCase().includes('total')) {
          total = price;
        } else if (name) {
          items.push({ name, price });
        }
      }
    }
    
    return {
      items,
      total: total || items.reduce((sum, item) => sum + item.price, 0),
      date: date || new Date().toLocaleDateString(),
      storeName
    };
  } finally {
    await worker.terminate();
  }
} 