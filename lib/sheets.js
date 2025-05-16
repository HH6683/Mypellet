// lib/sheets.js
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  // 如果你在方案 A 用的是 Service Account，就直接用 credentials
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});

const sheets = google.sheets({ version: 'v4', auth });
const drive  = google.drive({ version: 'v3', auth });

// 只做一次：若 MASTER_SHEET_ID 不存在，就创建一张新表
async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    console.log('🔄 MASTER_SHEET_ID not set, creating a new master sheet');
    const resp = await sheets.spreadsheets.create({
      resource: { properties: { title: 'Mypellet Master Data' } }
    });
    id = resp.data.spreadsheetId;
    console.log('🆕 New MASTER_SHEET_ID =', id);
    // 注意：环境变量还是不会自动更新，日志里看过后手动在 Vercel 再设一次
  }
  return id;
}

/**
 * 把一次上传的数据追加到同一个 Sheet
 * @param {Object} data            parseFile 返回的字段对象
 * @param {string} ownerEmail      当前用户邮箱（可选，用来做 Audit）
 */
export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  // 组合一行：第一列是类型标记，后面跟 data 里的所有字段
  const row = [
    data.__type || 'Unknown', // Booking Confirmation 或 Packing List
    ownerEmail,
    ...Object.values(data)
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',                 // 如果想插到其他行/工作表自行调整
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [ row ] }
  });

  // （可选）也可以给 ownerEmail 加个权限
  // await drive.permissions.create({ ... });

  // 返回主表链接
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
