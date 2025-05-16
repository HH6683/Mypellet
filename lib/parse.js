// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX     from 'xlsx';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  // —— Booking Confirmation —— 
  if (type === 'Booking Confirmation') {
    // PDF 分支
    if (ext === '.pdf') {
      const text    = (await pdfParse(buffer)).text;
      const booking = /Booking\s*No\.?\s*:\s*(\S+)/i.exec(text)?.[1] || '';
      const vessel  = /Vessel\s*\/\s*Voyage\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
      const pol     = /POL\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
      return { booking, vessel, pol };
    }
    // Excel 分支
    if (ext === '.xlsx' || ext === '.xls') {
      const wb          = XLSX.read(buffer, { type: 'buffer' });
      const sh          = wb.Sheets[wb.SheetNames[0]];
      // 1) Description 区域 A1:C5
      const descTable   = XLSX.utils.sheet_to_json(sh, {
        header: 1,
        range: 'A1:C5',
        defval: ''
      });
      // 2) Total Net Weight 区域 A6:B6
      const totalRowArr = XLSX.utils.sheet_to_json(sh, {
        header: 1,
        range: 'A6:B6',
        defval: ''
      });
      const totalRow    = totalRowArr[0] || [];
      // 3) 细节表格 区域 A8:F21
      const detailTable = XLSX.utils.sheet_to_json(sh, {
        header: 1,
        range: 'A8:F21',
        defval: ''
      });
      return { descTable, totalRow, detailTable };
    }
  }

  // —— Packing List —— 
  if (type === 'Packing List') {
    // PDF 分支
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
      // 从 A1:C5 拿 description 原样
      const descTable = XLSX.utils.sheet_to_json(sh, {
        header: 1,
        range: 'B24:G52',
        defval: ''
      });
      // 从 A6:B6 拿 total net row
      const totalRowArr = XLSX.utils.sheet_to_json(sh, {
        header: 1,
        range: 'H24:H52',
        defval: ''
      });
      const totalRow = totalRowArr[0] || [];
      return { descTable, totalRow };
    }
  }

  // 其他情况抛错
  throw new Error(`Unsupported type/extension combination: ${type} / ${ext}`);
}
