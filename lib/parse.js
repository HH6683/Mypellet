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
      // 读 Excel 第一张表
      if (ext === '.xlsx' || ext === '.xls') {
    const wb = XLSX.read(buffer, { type:'buffer' });
    const sh = wb.Sheets[wb.SheetNames[0]];

    // 1) 整个 description 区 A1:C5
    const descTable = XLSX.utils.sheet_to_json(sh, {
      header:1,
      range: 'B24:G52',
      defval:''
    });

    // 2) Total Net Weight 在第 6 行的 A6:B6
    const totalRow = XLSX.utils.sheet_to_json(sh, {
      header:1,
      range: 'H24:H52',
      defval:''
    })[0] || [];

    // 3) 容器明细在 A8:F21
    const detailTable = XLSX.utils.sheet_to_json(sh, {
      header:1,
      range: 'H17',
      defval:''
    });

    return {
      descTable,        // 二维数组，5×3
      totalRow,         // 一维数组，像 ['Total Net Weight', '268.80']
      detailTable       // 2D 数组，14×6
    };
  }

  throw new Error(`Unsupported type/extension combination: ${type} / ${ext}`);
