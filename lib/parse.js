// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX     from 'xlsx';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  // —— Booking Confirmation —— 
  if (type === 'Booking Confirmation') {
    if (ext === '.pdf') {
      const text    = (await pdfParse(buffer)).text;
      const booking = /Booking\s*No\.?\s*:\s*(\S+)/i.exec(text)?.[1] || '';
      const vessel  = /Vessel\s*\/\s*Voyage\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
      const pol     = /POL\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
      return { booking, vessel, pol };
    }
    throw new Error(`Unsupported extension for Booking Confirmation: ${ext}`);
  }

  // —— Packing List —— 
  if (type === 'Packing List') {
    // PDF 分支（如仍需支持）
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;
      const descMatch = /Description([\s\S]*?)Total\s+Net\s+Weight/i.exec(text);
      const description = descMatch
        ? descMatch[1].replace(/\r?\n+/g, ' ').trim()
        : '';
      const wtMatch = /Total\s+Net\s+Weight\s*[:\-]?\s*([\d.]+)/i.exec(text);
      const totalNetWeight = wtMatch
        ? `${wtMatch[1]} (MT)`
        : '';
      return { description, totalNetWeight };
    }

    // Excel 分支
    if (ext === '.xlsx' || ext === '.xls') {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sh = wb.Sheets[wb.SheetNames[0]];

      // 1) Description: B24:G52
      const descTable = XLSX.utils.sheet_to_json(sh, {
        header: 1,
        range: 'B24:G52',
        defval: ''
      });
      // 拼成多行文本
      const description = descTable
        .map(row => row.join(' ').trim())
        .filter(line => line)
        .join('\n');

      // 2) Total Net Weight: H23:H52
      const totalCol = XLSX.utils.sheet_to_json(sh, {
        header: 1,
        range: 'H23:H52',
        defval: ''
      });
      // 拼接所有非空值，加上 (MT) 单位
      const weights = totalCol
        .map(r => r[0]?.toString().trim())
        .filter(v => v);
      const totalNetWeight = weights.length
        ? weights.map(v => `${v} (MT)`).join(', ')
        : '';

      return { description, totalNetWeight };
    }

    throw new Error(`Unsupported extension for Packing List: ${ext}`);
  }

  throw new Error(`Unsupported type/extension combination: ${type} / ${ext}`);
}
