// lib/sheets.js
import { google } from 'googleapis';

// Service Account 凭据
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

// 把数字列索引（1-based）转成 Excel 字母
function columnLetter(colIndex) {
  let s = '';
  while (colIndex > 0) {
    const mod = (colIndex - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    colIndex = Math.floor((colIndex - 1) / 26);
  }
  return s;
}

async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    const resp = await sheets.spreadsheets.create({
      resource: { properties: { title: 'Mypellet Master Data' } }
    });
    id = resp.data.spreadsheetId;
    console.log('🆕 Created MASTER_SHEET_ID =', id);
    // 部署后请手动把此 ID 填入 Vercel 环境变量 MASTER_SHEET_ID
  }
  return id;
}

/**
 * 为每次上传新建（或复用）一个子表，并原样写入 Excel 区域
 */
export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  // 1) 子表名称
  const title = data.booking
    ? `BC-${data.booking}`
    : `PL-${Date.now()}`;

  // 2) 取现有所有 sheet
  const { data: meta } = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.sheets.find(s => s.properties.title === title);

  // 3) 如果不存在就创建
  let sheetId;
  if (!existing) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: { properties: { title } }
        }]
      }
    });
    sheetId = addRes.data.replies[0].addSheet.properties.sheetId;
  } else {
    sheetId = existing.properties.sheetId;
  }

  // 4) 写入 descTable（如果有）
  if (data.descTable) {
    const rows = data.descTable.length;
    const cols = data.descTable[0].length;
    const lastCol = columnLetter(cols);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1:${lastCol}${rows}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: data.descTable }
    });
  }

  // 5) 写入 totalRow（如果有）
  if (data.totalRow) {
    const cols = data.totalRow.length;
    const lastCol = columnLetter(cols);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A6:${lastCol}6`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [data.totalRow] }
    });
  }

  // 6) 写入 detailTable（如果有）
  if (data.detailTable) {
    const startRow = 8;
    const rows     = data.detailTable.length;
    const cols     = data.detailTable[0].length;
    const lastCol  = columnLetter(cols);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A${startRow}:${lastCol}${startRow + rows - 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: data.detailTable }
    });
  }

  // 7) 公开编辑权限
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
      allowFileDiscovery: false
    }
  });

  // 8) 返回可直接跳转到新子表的链接
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
}
