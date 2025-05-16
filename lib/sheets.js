// lib/sheets.js
import { google } from 'googleapis';

// 从环境变量中解析 Service Account JSON
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

/**
 * 确保有一个主表，若未配置则新建
 */
async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    console.log('🔄 MASTER_SHEET_ID not set, creating a new master sheet');
    const resp = await sheets.spreadsheets.create({
      resource: { properties: { title: 'Mypellet Master Data' } }
    });
    id = resp.data.spreadsheetId;
    console.log('🆕 New MASTER_SHEET_ID =', id);
    // 提示：部署后请将此 ID 设置到 Vercel 的 MASTER_SHEET_ID 环境变量
  }
  return id;
}

/**
 * 将一次上传的数据追加到同一个主表，并设置“任何人可编辑”权限
 * @param {Object} data        parseFile 返回的数据对象，包含 __type
 * @param {string} ownerEmail  操作员邮箱（可用于审计）
 * @returns {Promise<string>}  返回主表的访问链接
 */
export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  // 组合一行：类型标记、操作员邮箱、其余字段
  const row = [
    data.__type || 'Unknown',
    ownerEmail,
    ...Object.values(data)
  ];

  // 1) 将新行追加到 Sheet1
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [ row ] }
  });

  // 2) 方案 B：设为“任何拥有链接的人都可编辑”
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'reader', // 或 'writer,reader'
      type: 'anyone'
    }
  });

  // 3) 返回可访问链接
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
