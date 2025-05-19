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
  const spreadsheetId = await ensureMasterSheet();

  // 1) 构造一行：当前日期 + 3 个字段
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-CA'); // e.g. '2025-05-20' (YYYY-MM-DD)
  // 如果你想用其他格式，可自行替换 toLocaleDateString 的参数
  const row = [
    dateStr,
    data.booking,
    data.vessel,
    data.pol
  ];

  // 2) 获取真正的默认工作表名
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const defaultSheetName = metaRes.data.sheets[0].properties.title;
  const sheetId0 = metaRes.data.sheets[0].properties.sheetId;

  // 3) 插入空行到顶部
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        insertDimension: {
          range: {
            sheetId: sheetId0,
            dimension: 'ROWS',
            startIndex: 1,
            endIndex: 2
          },
          inheritFromBefore: false
        }
      }]
    }
  });

  // 4) 写入 A2:D2 （4 列：Date、Booking、Vessel、POL）
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${defaultSheetName}!A2:D2`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  });

  // 5) 公开编辑权限
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
