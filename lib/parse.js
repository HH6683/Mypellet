// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX     from 'xlsx';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  // —— Booking Confirmation (PDF only) —— 
 if (type === 'Booking Confirmation' && ext === '.pdf') {
    const text = (await pdfParse(buffer)).text;

    // 原有严格匹配
    let booking = text.match(/^[ \t]*Booking\s+No\.?\s*:\s*(\S+)/im)?.[1] || '';
    let vessel  = text.match(/^[ \t]*(?:Vessel\s*\/\s*Voyage)\s*[:\-]?\s*([^\r\n]+)/im)?.[1]?.trim() || '';
    let pol     = text.match(/^[ \t]*POL\s*[:\-]?\s*([^\r\n]+)/im)?.[1]?.trim() || '';

    // 如果已匹配到就直接返回
    if (booking && vessel && pol) {
      return { booking, vessel, pol };
    }

    // 兜底：把 BOOKING CONFIRMATION 下方的几行切出来
    const afterHeader = text.split(/BOOKING\s+CONFIRMATION/i)[1] || '';
    const linesAfter  = afterHeader
      .split(/[\r\n]+/)
      .map(l => l.trim())
      .filter(l => l);
    console.log('🧪 [BC] linesAfter =', linesAfter);

    // 先按最简单的策略：第一行第一个词，第二行分两半
    if (!booking && linesAfter[0]) {
      booking = linesAfter[0].split(/\s+/)[0];
    }
    if (!vessel && linesAfter[1]) {
      vessel = linesAfter[1].split(/\s{2,}/)[0];
    }
    if (!pol && linesAfter[1]) {
      const parts = linesAfter[1].split(/\s{2,}/);
      pol = parts[1] || '';
    }

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
