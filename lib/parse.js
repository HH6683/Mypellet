// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX     from 'xlsx';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  // —— Booking Confirmation (PDF only) —— 
  if (type === 'Booking Confirmation') {
    if (ext !== '.pdf') {
      throw new Error(`Booking Confirmation only supports PDF, got ${ext}`);
    }
    const text    = (await pdfParse(buffer)).text;
    const booking = /Booking\s*No\.?\s*:\s*(\S+)/i.exec(text)?.[1] || '';
    const vessel  = /Vessel\s*\/\s*Voyage\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
    const pol     = /POL\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
    return { booking, vessel, pol };
  }

  // —— Packing List (Excel only) —— 
  if (type === 'Packing List') {
    if (ext !== '.xlsx' && ext !== '.xls') {
      throw new Error(`Packing List only supports Excel, got ${ext}`);
    }

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sh = wb.Sheets[wb.SheetNames[0]];

    // 1) Sheet name from H17
    const sheetNameCell = sh['H17'];
    const sheetName = sheetNameCell?.v?.toString().trim() || `PL-${Date.now()}`;

    // 2) Description B24:G52 as 2D array
    const descTable = XLSX.utils.sheet_to_json(sh, {
      header: 1,
      range: 'B24:G52',
      defval: ''
    });

    // 3) Total Net Weight H23:H52 as 1D array
    const totalColArr = XLSX.utils.sheet_to_json(sh, {
      header: 1,
      range: 'H23:H52',
      defval: ''
    });
    // flatten column
    const totalNetWeightArr = totalColArr.map(r => r[0]?.toString().trim()).filter(v=>v);

    return { sheetName, descTable, totalNetWeightArr };
  }

  throw new Error(`Unsupported type: ${type}`);
}
