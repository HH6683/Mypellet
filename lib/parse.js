// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import path from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename).toLowerCase(); // ".pdf" 或 ".xlsx"

  // Booking Confirmation
  if (type === 'Booking Confirmation') {
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;
      const booking = /Booking No\. ?: *(\S+)/.exec(text)?.[1] || '';
      const vessel = /Vessel \/ Voyage ?: *(.+)/.exec(text)?.[1].trim() || '';
      const pol = /POL ?: *(.+)/.exec(text)?.[1].trim() || '';
      return { booking, vessel, pol };
    } else if (ext === '.xlsx') {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // 假设第一行是 ['Booking No', 'Vessel/Voyage', 'POL']
      const headers = data[0];
      const values = data[1];
      const idxBooking = headers.indexOf('Booking No');
      const idxVessel  = headers.indexOf('Vessel/Voyage');
      const idxPOL     = headers.indexOf('POL');
      return {
        booking: values[idxBooking] || '',
        vessel:  values[idxVessel]  || '',
        pol:     values[idxPOL]     || ''
      };
    }
  }

  // Packing List
  if (type === 'Packing List') {
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;
      const desc = text.split('Description')[1]?.split('Total Net Weight')[0].trim() || '';
      const wt   = /Total Net Weight.*?(\d+(\.\d+)?)/.exec(text)?.[1] || '';
      return { description: desc, totalNetWeight: wt };
    } else if (ext === '.xlsx') {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // 假设 Description 在第 2 列，Total Net Weight 在第 3 列
      const description = rows.slice(1).map(r => r[1]).join('\n');
      const totalNetWeight = rows.find(r => r[0] === 'Total Net Weight')?.[1] || '';
      return { description, totalNetWeight };
    }
  }

  throw new Error(`Unknown type: ${type}`);
}
