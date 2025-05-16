// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import path from 'path';

export async function parseFile(buffer, type, filename) {
  // 调试日志：查看传入的 type 和 filename
  console.log('🔍 [parseFile] type =', type, ', typeof type =', typeof type, ', filename =', filename);
  const ext = path.extname(filename || '').toLowerCase();
  console.log('🔍 [parseFile] ext =', ext);

  // Booking Confirmation 分支
  if (type === 'Booking Confirmation') {
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;
      const booking = /Booking No\. ?: *(\S+)/.exec(text)?.[1] || '';
      const vessel  = /Vessel \/ Voyage ?: *(.+)/.exec(text)?.[1].trim() || '';
      const pol     = /POL ?: *(.+)/.exec(text)?.[1].trim() || '';
      return { booking, vessel, pol };
    }
    if (ext === '.xlsx' || ext === '.xls') {
      const wb   = XLSX.read(buffer, { type: 'buffer' });
      const sh   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sh, { header: 1 });
      const hdr  = rows[0].map(h => h.toString().trim());
      const vals = rows[1];
      return {
        booking: vals[hdr.indexOf('Booking No')]    || '',
        vessel:  vals[hdr.indexOf('Vessel/Voyage')] || '',
        pol:     vals[hdr.indexOf('POL')]           || ''
      };
    }
  }

  // Packing List 分支
  if (type === 'Packing List') {
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;
      const desc = text.split('Description')[1]?.split('Total Net Weight')[0].trim() || '';
      const wt   = /Total Net Weight.*?(\d+(\.\d+)?)/.exec(text)?.[1] || '';
      return { description: desc, totalNetWeight: wt };
    }
    if (ext === '.xlsx' || ext === '.xls') {
      const wb   = XLSX.read(buffer, { type: 'buffer' });
      const sh   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sh, { header: 1 });
      const description    = rows.slice(1).map(r => r[0]).join('\n');
      const totalNetWeight = rows.find(r => r[0] === 'Total Net Weight')?.[1] || '';
      return { description, totalNetWeight };
    }
  }

  // 任意不匹配，抛错
  throw new Error(`Unknown type: ${type}`);
}
