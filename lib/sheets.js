// lib/sheets.js
import { google } from 'googleapis';

// 解析环境变量中的 Service Account JSON
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});

export async function createAndFillSheet(data, ownerEmail) {
  const client = await auth.getClient();
  // …其余逻辑保持不变…
}
