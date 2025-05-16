// lib/sheets.js
import { google } from 'googleapis';

// 1. 从环境变量中解析 Service Account JSON
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});

/**
 * 创建新的 Google Sheet 并写入 data，然后返回可访问的链接
 * @param {Object} data           从 parseFile 得到的数据对象
 * @param {string} ownerEmail     （可选）用户邮箱，不一定需要，因为我们用 Service Account
 * @returns {Promise<string>}     新表的 URL
 */
export async function createAndFillSheet(data, ownerEmail) {
  // 2. 获取授权后的客户端
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 3. 用 data.booking 作为表名（若无则用 Untitled）
  const spreadsheet = await sheets.spreadsheets.create({
    resource: { properties: { title: data.booking || 'Untitled' } }
  });
  const sheetId = spreadsheet.data.spreadsheetId;

  // 4. 准备要写入的内容：第一行为 key，第二行为对应的 value
  const headers = Object.keys(data);
  const values  = [headers, headers.map(h => data[h])];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });

  // 5. （可选）设置谁可以编辑——这里我们用 DEFAULT_EDITORS 环境变量
  const drive = google.drive({ version: 'v3', auth: client });
  const editors = (process.env.DEFAULT_EDITORS || '')
    .split(',')
    .map(e => e.trim())
    .filter(e => e);

  for (const email of editors) {
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: { role: 'writer', type: 'user', emailAddress: email }
    });
  }

  // 6. 返回用户可以打开的 URL
  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}
