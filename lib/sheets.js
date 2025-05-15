/* lib/sheets.js */
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});

export async function createAndFillSheet(data, sessionUser) {
  const client = await auth.getClient();
  const sheets = google.sheets({version:'v4', auth: client});

  // Create spreadsheet
  const resource = { properties:{ title: data.booking } };
  const sheet = await sheets.spreadsheets.create({ resource });
  const sheetId = sheet.data.spreadsheetId;

  // Prepare rows
  const headers = Object.keys(data);
  const values = [headers, headers.map(h=>data[h])];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });

  // Set permissions
  const drive = google.drive({version:'v3', auth: client});
  // Owner: sessionUser (already owner)
  // Default editors:
  const editors = process.env.DEFAULT_EDITORS.split(',');
  for (const email of editors) {
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: { role: 'writer', type: 'user', emailAddress: email }
    });
  }

  return `https://docs.google.com/spreadsheets/d/${sheetId}`;
}
