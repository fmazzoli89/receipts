import { google } from 'googleapis';
import { ReceiptData } from './ocr';

// Load the service account key
const serviceAccountKey = require('../config/service-account.json');

// Initialize the Google Sheets API client
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

export async function appendToSheet(receiptData: ReceiptData) {
  if (!SPREADSHEET_ID) {
    throw new Error('Google Sheets ID not configured');
  }

  const authClient = await auth.getClient();

  // Prepare the rows to append
  const rows = receiptData.items.map(item => [
    receiptData.date,
    receiptData.storeName,
    item.name,
    item.price.toString(),
  ]);

  try {
    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:D', // Assumes first sheet with columns: Date, Store, Item, Price
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    return true;
  } catch (error) {
    console.error('Error appending to sheet:', error);
    throw error;
  }
} 