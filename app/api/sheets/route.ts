import { google } from 'googleapis';
import { NextResponse } from 'next/server';

interface ReceiptItem {
  name: string;
  price: number;
}

interface ReceiptData {
  storeName: string;
  date: string;
  items: ReceiptItem[];
  total: number;
}

// Initialize the Google Sheets API client
const sheets = google.sheets('v4');

// Create JWT client for authentication using environment variables
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Replace escaped newlines
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Format date to a consistent format (YYYY-MM-DD)
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original string if parsing fails
  }
}

// Validate the receipt data structure
function validateReceiptData(data: any): data is ReceiptData {
  return (
    data &&
    typeof data.storeName === 'string' &&
    typeof data.date === 'string' &&
    Array.isArray(data.items) &&
    data.items.every((item: any) =>
      typeof item.name === 'string' && typeof item.price === 'number'
    ) &&
    typeof data.total === 'number'
  );
}

export async function POST(request: Request) {
  try {
    // Validate environment variables
    if (!SPREADSHEET_ID) {
      console.error('Google Sheets ID not configured');
      return NextResponse.json({ error: 'Google Sheets ID not configured' }, { status: 500 });
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Google Sheets credentials not configured');
      return NextResponse.json({ error: 'Google Sheets credentials not configured' }, { status: 500 });
    }

    const receiptData = await request.json();

    // Validate receipt data
    if (!validateReceiptData(receiptData)) {
      console.error('Invalid receipt data structure:', receiptData);
      return NextResponse.json({ error: 'Invalid receipt data structure' }, { status: 400 });
    }

    const formattedDate = formatDate(receiptData.date);

    // Prepare the rows to append
    const rows = [
      // Header row with receipt info
      [formattedDate, receiptData.storeName, 'RECEIPT TOTAL', receiptData.total.toFixed(2)],
      // Empty row for spacing
      ['', '', '', ''],
      // Individual items
      ...receiptData.items.map((item: ReceiptItem) => [
        formattedDate,
        receiptData.storeName,
        item.name,
        item.price.toFixed(2),
      ])
    ];

    // Try to append data with retries
    let retries = 3;
    while (retries > 0) {
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Sheet1!A:D', // Assumes first sheet with columns: Date, Store, Item, Price
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: rows,
          },
          auth: auth,
        });
        break; // Success, exit loop
      } catch (error) {
        retries--;
        if (retries === 0) throw error; // Throw if all retries failed
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Receipt data saved successfully',
      rowsAdded: rows.length
    });
  } catch (error: any) {
    console.error('Error appending to sheet:', error);
    return NextResponse.json({ 
      error: 'Failed to append to sheet',
      details: error.message
    }, { status: 500 });
  }
} 