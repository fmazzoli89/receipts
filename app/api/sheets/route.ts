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

// Function to properly format the private key
function formatPrivateKey(key: string | undefined): string {
  if (!key) return '';
  // Remove any extra quotes from the beginning and end
  key = key.replace(/^["']|["']$/g, '');
  // Replace literal \n with actual newlines
  return key.replace(/\\n/g, '\n');
}

// Create JWT client for authentication using environment variables
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
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
    // Log the start of the request
    console.log('Starting Google Sheets API request');

    // Log all environment variables (without sensitive data)
    const privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    console.log('Environment variables check:', {
      hasSheetId: !!SPREADSHEET_ID,
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasKey: !!privateKey,
      keyStartsWith: privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),
      keyEndsWith: privateKey.endsWith('-----END PRIVATE KEY-----'),
      sheetIdLength: SPREADSHEET_ID?.length,
      emailDomain: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.split('@')[1],
    });

    // Validate environment variables with detailed logging
    if (!SPREADSHEET_ID) {
      const error = 'Google Sheets ID not configured';
      console.error(error);
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const error = 'Google Service Account Email not configured';
      console.error(error);
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!process.env.GOOGLE_PRIVATE_KEY) {
      const error = 'Google Private Key not configured';
      console.error(error);
      return NextResponse.json({ error }, { status: 500 });
    }

    console.log('Environment variables validated successfully');

    const receiptData = await request.json();
    console.log('Received receipt data:', JSON.stringify(receiptData, null, 2));

    // Validate receipt data
    if (!validateReceiptData(receiptData)) {
      const error = 'Invalid receipt data structure';
      console.error(error, JSON.stringify(receiptData, null, 2));
      return NextResponse.json({ error, receivedData: receiptData }, { status: 400 });
    }

    console.log('Receipt data validated successfully');

    const formattedDate = formatDate(receiptData.date);
    console.log('Formatted date:', formattedDate);

    // Prepare the rows to append
    const rows = [
      [formattedDate, receiptData.storeName, 'RECEIPT TOTAL', receiptData.total.toFixed(2)],
      ['', '', '', ''],
      ...receiptData.items.map((item: ReceiptItem) => [
        formattedDate,
        receiptData.storeName,
        item.name,
        item.price.toFixed(2),
      ])
    ];

    console.log('Prepared rows for Google Sheets:', JSON.stringify(rows, null, 2));

    // Try to append data with retries
    let retries = 3;
    while (retries > 0) {
      try {
        console.log(`Attempting to append data (${retries} retries remaining)`);
        
        // Log auth object (without sensitive data)
        console.log('Auth configuration:', {
          hasEmail: !!auth.email,
          hasKey: !!auth.key,
          scopes: auth.scopes,
        });

        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Sheet1!A:D',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: rows,
          },
          auth: auth,
        });

        console.log('Successfully appended data to Google Sheets', response.data);
        
        return NextResponse.json({ 
          success: true,
          message: 'Receipt data saved successfully',
          rowsAdded: rows.length,
          updatedRange: response.data.updates?.updatedRange
        });
      } catch (error: any) {
        console.error('Detailed error information:', {
          message: error.message,
          code: error.code,
          status: error.status,
          details: error.errors,
          stack: error.stack,
        });
        
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to append to Google Sheets: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error: any) {
    // Log the complete error object
    console.error('Fatal error in Google Sheets API:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      details: error.errors,
    });
    
    return NextResponse.json({ 
      error: 'Failed to append to sheet',
      details: error.message,
      errorCode: error.code,
      errorStatus: error.status,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 