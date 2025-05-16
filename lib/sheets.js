// lib/sheets.js
import { google } from 'googleapis';

// 1. Service Account 凭据
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});

const sheets = google.sheets({ version: 'v4', auth });
const drive  = google.drive({ version: 'v3', auth });

// 2. 确保 MASTER_SHEET_ID 存在，若无则新建
async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    const resp = await sheets.spreadsheets.create({
      resource: { properties: { title: 'Mypellet Master Data' } }
    });
    id = resp.data.spreadsheetId;
    console.log('🆕 Created MASTER_SHEET_ID =', id);
    // 部署后请将此 ID 手动填到 Vercel 的 MASTER_SHEET_ID 环境变量
  }
  return id;
}

/**
 * 把 data 追加到同一个主表，并设置“Anyone with link can edit”
 * @param {Object} data        parseFile 返回的数据对象，最好含 __type
 * @param {string} ownerEmail  操作员邮箱（可选，用于审计）
 * @returns {Promise<string>}  主表 URL
 */
export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  // 3. 准备一行数据：[类型, 邮箱, ...fields]
  const row = [
    data.__type || 'Unknown',
    ownerEmail,
    ...Object.values(data)
  ];

  // 4. 追加新行
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [ row ] }
  });

  // 5. 设置公开编辑权限
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
      allowFileDiscovery: false
    }
  });

  // 6. 返回链接
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
