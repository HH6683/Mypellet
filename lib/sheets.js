// lib/sheets.js
import { google } from 'googleapis';

// Service Account JSON from env
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

// Excel 列索引转换
function colLetter(idx) {
  let s = '';
  while (idx > 0) {
    const m = (idx - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    idx = Math.floor((idx - 1) / 26);
  }
  return s;
}

async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    const r = await sheets.spreadsheets.create({
      resource: { properties: { title: 'Mypellet Master Data' } }
    });
    id = r.data.spreadsheetId;
    console.log('🆕 MASTER_SHEET_ID =', id);
    // 请手动填回 Vercel ENV MASTER_SHEET_ID
  }
  return id;
}

/**
 * 主入口：Booking Confirmation 写入主表首行，Packing List 建新子表
 */
export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  if (data.__type === 'Booking Confirmation') {
    // —— 插入到 Master Sheet (Sheet1) 第 2 行 —— 
    // 收集值
    const row = [ 'Booking Confirmation', data.booking, data.vessel, data.pol ];
    // 插入空行
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId0 = meta.data.sheets[0].properties.sheetId;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests:[{
          insertDimension:{
            range:{
              sheetId:sheetId0,
              dimension:'ROWS',
              startIndex:1,
              endIndex:2
            },
            inheritFromBefore:false
          }
        }]
      }
    });
    // 写入 A2:E2
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A2:E2',
      valueInputOption:'USER_ENTERED',
      requestBody:{ values:[row] }
    });
    // 公开编辑
    await drive.permissions.create({
      fileId:spreadsheetId,
      requestBody:{ role:'writer', type:'anyone', allowFileDiscovery:false }
    });
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  }

  if (data.__type === 'Packing List') {
    // —— 为 Packing List 创建/复用一个子表 —— 
    const title = data.sheetName;
    const { data:meta } = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.sheets.find(s=>s.properties.title===title);
    let sheetId;
    if (!exists) {
      const add = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody:{ requests:[{ addSheet:{properties:{title}}}] }
      });
      sheetId = add.data.replies[0].addSheet.properties.sheetId;
    } else {
      sheetId = exists.properties.sheetId;
    }

    // 写 descTable 到 A1
    if (data.descTable) {
      const rows = data.descTable.length;
      const cols = data.descTable[0].length;
      const last = colLetter(cols);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${title}!A1:${last}${rows}`,
        valueInputOption:'USER_ENTERED',
        requestBody:{ values:data.descTable }
      });
    }

    // 6) 在 H14 固定写入标题 “Total Net Weight (MT)”
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: `${title}!H14`,
  valueInputOption: 'RAW',
  requestBody: {
    values: [['Total Net Weight (MT)']]
  }
});

// 7) 写 totalNetWeightArr 到 H23 开始的列
if (data.totalNetWeightArr) {
  // 单列二维数组，每一行一个值
  const arr = data.totalNetWeightArr.map(v => [`${v} (MT)`]);
  const startRow = 23; 
  const endRow   = startRow + arr.length - 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!H${startRow}:H${endRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: arr }
  });
}


    // 公开编辑
    await drive.permissions.create({
      fileId:spreadsheetId,
      requestBody:{ role:'writer', type:'anyone', allowFileDiscovery:false }
    });

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
  }

  throw new Error(`Unknown type in sheets.js: ${data.__type}`);
}
