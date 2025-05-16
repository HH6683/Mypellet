// lib/sheets.js
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});

/**
 * 创建新的 Google Sheet 并写入数据
 * @param {{[key:string]: any}} data   从 parseFile 拿到的字段对象
 * @param {string} ownerEmail          授权用户的 email（表格拥有者）
 * @returns {Promise<string>}          创建好的 sheet URL
 */
export async function createAndFillSheet(data, ownerEmail) {
  // 1. 获取客户端
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 2. 创建新表，以 booking 编号命名
  const resource = { properties: { title: data.booking || 'Untitled' } };
  const sheetRes = await sheets.spreadsheets.create({ resource });
  const sheetId = sheetRes.data.spreadsheetId;

  // 3. 写入表头 + 数据行
  const headers = Object.keys(data);
  const values  = [headers, headers.map(h => data[h])];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });

  // 4. 设置权限：默认编辑名单
  const drive = google.drive({ version: 'v3', auth: client });
  const editors = process.env.DEFAULT_EDITORS.split(',').map(e => e.trim());
  for (const email of editors) {
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: { role: 'writer', type: 'user', emailAddress: email }
    });
  }

  // 5. 返回可访问链接
  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}
