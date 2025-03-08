import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Initialize the Google Sheets API client
const sheets = google.sheets('v4');

// Create JWT client for authentication using environment variables
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Replace escaped newlines
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

export async function POST(request: Request) {
  try {
    const receiptData = await request.json();

    if (!SPREADSHEET_ID) {
      return NextResponse.json({ error: 'Google Sheets ID not configured' }, { status: 500 });
    }

    // Prepare the rows to append
    const rows = receiptData.items.map((item: any) => [
      receiptData.date,
      receiptData.storeName,
      item.name,
      item.price.toString(),
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:D', // Assumes first sheet with columns: Date, Store, Item, Price
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
      auth: auth,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error appending to sheet:', error);
    return NextResponse.json({ error: 'Failed to append to sheet' }, { status: 500 });
  }
} 