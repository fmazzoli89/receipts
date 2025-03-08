export interface ReceiptItem {
  name: string;
  price: number;
  category: string;
}

export interface ReceiptData {
  items: ReceiptItem[];
  total: number;
  datetime: string;
  storeName: string;
}

export async function processReceipt(imageData: string): Promise<ReceiptData> {
  try {
    // Basic validation of image data
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Invalid image data provided');
    }

    // Extract the base64 data from the Data URL if present
    const base64Data = imageData.split(',')[1] || imageData;

    // Validate base64 string
    if (!base64Data.match(/^[A-Za-z0-9+/=]+$/)) {
      throw new Error('Invalid image format');
    }

    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Failed to process receipt';
      console.error('OCR API Error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Validate the response data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response data');
    }

    if (!data.storeName || !data.datetime || !Array.isArray(data.items) || typeof data.total !== 'number') {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid receipt data structure');
    }

    // Validate items array
    for (const item of data.items) {
      if (!item.name || typeof item.price !== 'number') {
        console.error('Invalid item structure:', item);
        throw new Error('Invalid item data structure');
      }
    }

    return data;
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw error;
  }
} 