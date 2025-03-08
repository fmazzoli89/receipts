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
    // Basic validation of image data
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Invalid image data provided');
    }

    // Ensure the image data is not too large (max 10MB)
    const approximateSizeInBytes = (imageData.length * 3) / 4; // Approximate size of base64 data
    if (approximateSizeInBytes > 10 * 1024 * 1024) {
      throw new Error('Image size too large. Please use an image under 10MB.');
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
      throw new Error(errorData.error || 'Failed to process receipt');
    }

    const data = await response.json();
    
    // Validate the response data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response data');
    }

    if (!data.storeName || !data.date || !Array.isArray(data.items) || typeof data.total !== 'number') {
      throw new Error('Invalid receipt data structure');
    }

    return data;
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw error;
  }
} 