# Receipt Scanner

A modern web application for scanning receipts and storing their data in Google Sheets. Built with Next.js, TypeScript, and TailwindCSS.

## Features

- 📸 Capture receipts using device camera
- 📤 Upload existing receipt images
- 🔍 OCR processing to extract receipt data
- 📊 Automatic storage in Google Sheets
- 📱 Mobile-first, responsive design

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd receipt-scanner
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with your Google credentials:
```
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
```

4. Place your Google service account key in `src/config/service-account.json`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Google Sheets Setup

1. Create a new Google Sheet
2. Share the sheet with your service account email (with editor permissions)
3. Create the following columns in the first sheet:
   - Date
   - Store
   - Item
   - Price

## Technologies Used

- Next.js 14
- TypeScript
- TailwindCSS
- Tesseract.js for OCR
- Google Sheets API
- React Webcam

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

## License

MIT
