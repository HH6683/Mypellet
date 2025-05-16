// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX     from 'xlsx';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext  = path.extname(filename || '').toLowerCase();

  // —— Booking Confirmation —— 
  if (type === 'Booking Confirmation') {
    if (ext === '.pdf') {
      const text   = (await pdfParse(buffer)).text;
      const booking= /Booking\s*No\.?\s*:\s*(\S+)/i.exec(text)?.[1] || '';
      const vessel = /Vessel\s*\/\s*Voyage\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
      const pol    = /POL\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
      return { booking, vessel, pol };
    }
    if (ext === '.xlsx' || ext === '.xls') {
      // 读 Excel 第一张表
      const wb    = XLSX.read(buffer, { type: 'buffer' });
      const sh    = wb.Sheets[wb.SheetNames[0]];
      const rows  = XLSX.utils.sheet_to_json(sh, { header: 1 });
      const hdr   = rows[0].map(h=>h.toString().trim());
      const vals  = rows[1] || [];
      return {
        booking: vals[hdr.indexOf('Booking No')]        || '',
        vessel:  vals[hdr.indexOf('Vessel/Voyage')]     || '',
        pol:     vals[hdr.indexOf('POL')]               || ''
      };
    }
  }

  // —— Packing List —— 
  if (type === 'Packing List') {
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
    if (ext === '.xlsx' || ext === '.xls') {
      // 读 Excel 第一张表
      const wb    = XLSX.read(buffer, { type: 'buffer' });
      const sh    = wb.Sheets[wb.SheetNames[0]];
      const rows  = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });
      // 假设 Description 在第一列，从第 2 行开始拼接
      const descLines = rows.slice(1).map(r => r[0]).filter(Boolean);
      const description = descLines.join(' ');
      // 假设 Total Net Weight 在某固定行／列，比如列 B 第一个数据行
      // 你可以根据实际表格调整下面这行代码：
      const totalNetWeight = rows[1][1] 
        ? `${rows[1][1]} (MT)`
        : '';
      return { description, totalNetWeight };
    }
  }

  throw new Error(`Unsupported type/extension combination: ${type} / ${ext}`);
}
