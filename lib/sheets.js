// lib/sheets.js
import { google } from 'googleapis';

// 1) Service Account 凭据
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

const auth   = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});
const sheets = google.sheets({ version: 'v4', auth });
const drive  = google.drive({ version: 'v3', auth });

// 2) 确保主表存在，并且只在首次创建时写入表头
async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    const resp = await sheets.spreadsheets.create({
      resource: { properties: { title: 'Mypellet Master Data' } }
    });
    id = resp.data.spreadsheetId;
    console.log('🆕 Created MASTER_SHEET_ID =', id);

    // 写入统一表头
    const header = [
      'Type',
      'Operator Email',
      'Booking No',
      'Vessel/Voyage',
      'POL',
      'Description',
      'Total Net Weight (MT)',
      'Items (JSON)'
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [header] }
    });

    // 部署后请在 Vercel Settings → ENVIRONMENT VARIABLES 手动设置 MASTER_SHEET_ID
  }
  return id;
}

/**
 * 追加一行到主表，不覆盖历史
 */
export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  // 根据类型创建对应那一行的数据
  const row = [
    data.__type || 'Unknown',
    ownerEmail,
    data.booking || '',
    data.vessel  || '',
    data.pol     || '',
    data.description || '',
    data.totalNetWeight || '',
    JSON.stringify(data.items || [])
  ];

  // 追加到表头下方
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A2',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });

  // 3) Anyone-with-link 可编辑
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
      allowFileDiscovery: false
    }
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
