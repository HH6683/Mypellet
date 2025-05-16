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

// 2) 确保有主表，首次创建时写入表头
async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    const resp = await sheets.spreadsheets.create({
      resource: { properties: { title: 'Mypellet Master Data' } }
    });
    id = resp.data.spreadsheetId;
    console.log('🆕 Created MASTER_SHEET_ID =', id);
    // 首次创建时写表头
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
    // 部署后请把 id 手动填入 Vercel 的 MASTER_SHEET_ID 环境变量
  }
  return id;
}

/**
 * 追加到主表，每次都插入在最上面
 */
export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  // 3) 计算要插入的行
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

  // 4) 先 insertDimension 在第 2 行插入空行
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId0 = meta.data.sheets[0].properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetId0,
              dimension: 'ROWS',
              startIndex: 1,
              endIndex: 2
            },
            inheritFromBefore: false
          }
        }
      ]
    }
  });

  // 5) 再把新行写到 A2
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A2',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  });

  // 6) 公开编辑权限
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
