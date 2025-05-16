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

// 2. 确保有主表，若未配置则新建
async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    const resp = await sheets.spreadsheets.create({
      resource: { properties: { title: 'Mypellet Master Data' } }
    });
    id = resp.data.spreadsheetId;
    console.log('🆕 Created MASTER_SHEET_ID =', id);
    // 部署后请手动在 Vercel Settings 填入 MASTER_SHEET_ID
  }
  return id;
}

/**
 * 将一次上传的数据写入同一个主表：
 * - 第一行：根据文件类型写表头
 * - 第二行：写入这一批的对应值
 */
export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  // 3. 准备表头和单行数据
  let headers, row;
  if (data.__type === 'Booking Confirmation') {
    headers = ['Booking No', 'Vessel/Voyage', 'POL'];
    row     = [data.booking, data.vessel, data.pol];
  } else if (data.__type === 'Packing List') {
    headers = ['Description', 'Total Net Weight (MT)'];
    row     = [data.description, data.totalNetWeight];
  } else {
    // 兜底：动态 header
    headers = Object.keys(data);
    row     = Object.values(data);
  }

  // 4. 写表头到 A1 开始的一行
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [headers] }
  });

  // 5. 追加这行数据到表头下方
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A2',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });

  // 6. 设置“Anyone with link can edit”
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
      allowFileDiscovery: false
    }
  });

  // 7. 返回可访问链接
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
