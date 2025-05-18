// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX     from 'xlsx';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  // —— Booking Confirmation (PDF only) —— 
 if (type === 'Booking Confirmation' && ext === '.pdf') {
    const text = (await pdfParse(buffer)).text;

    // 先尝试之前的严格匹配
    let booking = text.match(/^[ \t]*Booking\s+No\.?\s*:\s*(\S+)/im)?.[1] || '';
    let vessel  = text.match(
      /^[ \t]*(?:Vessel\s*\/\s*Voyage)\s*[:\-]?\s*([^\r\n]+)/im
    )?.[1].trim() || '';
    let pol     = text.match(
      /^[ \t]*POL\s*[:\-]?\s*([^\r\n]+)/im
    )?.[1].trim() || '';

    // 如果都有值，直接返回
    if (booking && vessel && pol) {
      return { booking, vessel, pol };
    }

    // 兜底：截取 BOOKING CONFIRMATION 下方的非空行
    const afterHeader = text.split(/BOOKING\s+CONFIRMATION/i)[1] || '';
    const linesAfter  = afterHeader
      .split(/[\r\n]+/)
      .map(l => l.trim())
      .filter(l => l);

    // —— Booking No：取 'Booking No' 之前的那一项 —— 
    const idxBN = linesAfter.findIndex(l => /^Booking\s+No\b/i.test(l));
    if (!booking && idxBN > 0) {
      booking = linesAfter[idxBN - 1];
    }

    // —— Vessel/Voyage：找包含 'VSL Name' 的行，去掉标签部分 —— 
    if (!vessel) {
      const vLine = linesAfter.find(l => /VSL\s*Name\s*\/\s*Voy/i.test(l));
      if (vLine) {
        vessel = vLine.split(/VSL\s*Name\s*\/\s*Voy/i)[0].trim();
      }
    }

    // —— POL：找包含 'Port of Loading' 的行，截断前面 —— 
    if (!pol) {
      const pLine = linesAfter.find(l => /Port\s+of\s+Loading/i.test(l));
      if (pLine) {
        pol = pLine.split(/Port\s+of\s+Loading/i)[0].trim();
      }
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
