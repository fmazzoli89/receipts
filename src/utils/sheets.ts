import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ReceiptData } from './ocr';

// Load the service account key
const serviceAccountKey = require('../config/service-account.json');

// Initialize the Google Sheets API client
const sheets = google.sheets('v4');

// Create JWT client for authentication
const auth = new google.auth.JWT({
  email: serviceAccountKey.client_email,
  key: serviceAccountKey.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

export async function appendToSheet(receiptData: ReceiptData) {
  if (!SPREADSHEET_ID) {
    throw new Error('Google Sheets ID not configured');
  }

  // Prepare the rows to append
  const rows = receiptData.items.map(item => [
    receiptData.date,
    receiptData.storeName,
    item.name,
    item.price.toString(),
  ]);

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

    return true;
  } catch (error) {
    console.error('Error appending to sheet:', error);
    throw error;
  }
} 