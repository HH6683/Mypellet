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
    const text = (await pdfParse(buffer)).text;

    let booking = text.match(/^[ \t]*Booking\s+No\.?\s*:\s*(\S+)/im)?.[1] || '';
    if (!booking) {
      booking = text.match(/^[ \t]*Booking\s+No\s+([A-Z0-9]+)/im)?.[1] || '';
    }

    let vessel = text.match(
      /^[ \t]*(?:Vessel\s*\/\s*Voyage|VSL\s*Name\s*\/\s*Voy)\s*[:\-]?\s*(.+)$/im
    )?.[1].trim() || '';
    vessel = vessel.split(/[\r\n]/)[0].trim();

    let pol = text.match(
      /^[ \t]*(?:POL|Port\s+of\s+Loading)\s*[:\-]?\s*([^\r\n]+)/im
    )?.[1].trim() || '';
    pol = pol.split(/[\r\n]/)[0].trim();

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
    const sheetName = sh['H17']?.v?.toString().trim() || `PL-${Date.now()}`;

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
    const totalNetWeightArr = totalColArr
      .map(r => r[0]?.toString().trim())
      .filter(v => v);

    return { sheetName, descTable, totalNetWeightArr };
  }

  // 如果都不匹配，抛出
  throw new Error(`Unsupported type/extension combination: ${type} / ${ext}`);
}
