import { google } from 'googleapis';
import { NextResponse } from 'next/server';

interface ReceiptItem {
  name: string;
  price: number;
  category: string;
}

interface ReceiptData {
  storeName: string;
  datetime: string;
  items: ReceiptItem[];
  total: number;
}

// Initialize the Google Sheets API client
const sheets = google.sheets('v4');

// Function to properly format the private key
function formatPrivateKey(key: string | undefined): string {
  if (!key) return '';
  
  // Remove any surrounding quotes
  key = key.replace(/^["']|["']$/g, '');
  
  // Check if the key already has proper line breaks
  if (key.includes('\n')) {
    return key;
  }
  
  // If the key uses \\n, replace with real line breaks
  if (key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  
  // If the key is a single line, try to format it
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    return `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }
  
  return key;
}

// Create JWT client for authentication using environment variables
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim(),
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
    typeof data.datetime === 'string' &&
    Array.isArray(data.items) &&
    data.items.every((item: any) =>
      typeof item.name === 'string' && 
      typeof item.price === 'number' &&
      typeof item.category === 'string'
    ) &&
    typeof data.total === 'number'
  );
}

// Debug function to safely log private key format
function debugPrivateKey(key: string | undefined): string {
  if (!key) return 'No key provided';
  const lines = key.split('\n');
  return `Key starts with: ${lines[0]}\nKey ends with: ${lines[lines.length - 1]}\nNumber of lines: ${lines.length}`;
}

export async function POST(request: Request) {
  try {
    // Log the start of the request
    console.log('Starting Google Sheets API request');

    // Log environment variables check (safely)
    const privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    console.log('Environment variables check:', {
      hasSheetId: !!SPREADSHEET_ID,
      hasEmail: !!email,
      hasKey: !!privateKey,
      keyFormat: debugPrivateKey(privateKey),
      sheetIdLength: SPREADSHEET_ID?.length,
      emailDomain: email.split('@')[1],
      spreadsheetIdPreview: SPREADSHEET_ID ? `${SPREADSHEET_ID.substring(0, 5)}...` : 'not set'
    });

    // Validate environment variables
    if (!SPREADSHEET_ID) {
      throw new Error('Google Sheets ID not configured');
    }

    if (!email) {
      throw new Error('Google Service Account Email not configured');
    }

    if (!privateKey) {
      throw new Error('Google Private Key not configured');
    }

    // First, try to get the spreadsheet metadata to verify access
    try {
      const metadataResponse = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        auth: auth,
      });
      
      console.log('Successfully accessed spreadsheet:', {
        title: metadataResponse.data.properties?.title,
        sheets: metadataResponse.data.sheets?.length,
        url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`
      });
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(`Spreadsheet not found or not accessible. Please verify:\n1. Sheet ID (${SPREADSHEET_ID?.substring(0, 5)}...) is correct\n2. Service account (${email}) has Editor access to the sheet`);
      }
      throw error;
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

    const formattedDate = formatDate(receiptData.datetime);
    console.log('Formatted date:', formattedDate);

    // Prepare the rows to append
    const rows = receiptData.items.map((item: ReceiptItem) => [
      receiptData.datetime,
      receiptData.storeName,
      item.name,
      item.category,
      item.price.toFixed(2)
    ]);

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
          range: 'Sheet1!A:E',  // Updated to include all 5 columns
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