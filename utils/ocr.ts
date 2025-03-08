import { createWorker, Worker } from 'tesseract.js';

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
  try {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
    });

    if (!response.ok) {
      throw new Error('Failed to process receipt');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw error;
  }
} 