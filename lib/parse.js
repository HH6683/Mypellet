// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX     from 'xlsx';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  // —— Booking Confirmation (PDF only) —— 
  if (type === 'Booking Confirmation' && ext === '.pdf') {
    const text = (await pdfParse(buffer)).text;

    // —— Booking No —— 
    let booking = text.match(/^[ \t]*Booking\s+No\.?\s*:\s*(\S+)/im)?.[1] || '';
    if (!booking) {
      // 备用：有时格式是 “Booking No  XXXXXX”
      booking = text.match(/^[ \t]*Booking\s+No\s+([A-Z0-9]+)/im)?.[1] || '';
    }

    // —— Vessel / Voyage —— 
    let vessel = text.match(/^[ \t]*(?:Vessel\s*\/\s*Voyage|VSL\s*Name\s*\/\s*Voy)\s*[:\-]?\s*(.+)$/im)?.[1].trim() || '';
    if (vessel) {
      // 取到行尾，不要跨行
      vessel = vessel.split(/[\r\n]/)[0].trim();
    }

    // —— POL —— 
    let pol = text.match(/^[ \t]*(?:POL|Port\s+of\s+Loading)\s*[:\-]?\s*([^\r\n]+)/im)?.[1].trim() || '';
    if (pol) {
      pol = pol.split(/[\r\n]/)[0].trim();
    }

    return { booking, vessel, pol };
  }

  // … 其它类型分支保持不变 …
  throw new Error(`Unsupported type/extension: ${type}/${ext}`);
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
