// lib/sheets.js
import { google } from 'googleapis';

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
const auth   = new google.auth.GoogleAuth({ credentials, scopes: [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
]});
const sheets = google.sheets({ version:'v4', auth });
const drive  = google.drive({ version:'v3', auth });

// 确保 MASTER_SHEET_ID 不变
async function ensureMasterSheet() {
  let id = process.env.MASTER_SHEET_ID;
  if (!id) {
    const resp = await sheets.spreadsheets.create({
      resource:{properties:{title:'Mypellet Master Data'}}
    });
    id = resp.data.spreadsheetId;
    console.log('🆕 MASTER_SHEET_ID =', id);
    // 手动把它填到 Vercel ENV 里
  }
  return id;
}

export async function appendToMasterSheet(data, ownerEmail) {
  const spreadsheetId = await ensureMasterSheet();

  // 1) 为本次上传新建一个工作表，名字用时间戳或 Booking No
  const title = data.booking
    ? `BC-${data.booking}`
    : `PL-${Date.now()}`;
  const addRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody:{
      requests:[{
        addSheet:{properties:{title}}
      }]
    }
  });
  const newSheetId = addRes.data.replies[0].addSheet.properties.sheetId;

  // 2) 写入 Description 区 A1:C5
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1:C5`,
    valueInputOption:'USER_ENTERED',
    requestBody:{ values: data.descTable }
  });

  // 3) 写入 Total Net Weight 到 A6:B6
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A6:B6`,
    valueInputOption:'USER_ENTERED',
    requestBody:{ values: [ data.totalRow ] }
  });

  // 4) 写入明细 Table 在 A8:F少行
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A8:F${8 + data.detailTable.length - 1}`,
    valueInputOption:'USER_ENTERED',
    requestBody:{ values: data.detailTable }
  });

  // 5) 公开编辑权限
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody:{
      role:'writer', type:'anyone', allowFileDiscovery:false
    }
  });

  // 6) 返回新子表的 URL（带 gid 可直接跳过去）
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${newSheetId}`;
}
