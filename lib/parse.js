/* lib/parse.js */
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
export async function parseFile(buffer, type) {
  if (type === 'Booking Confirmation') {
    const text = (await pdfParse(buffer)).text;
    const booking = /Booking No\. ?: *(\S+)/.exec(text)?.[1] || '';
    const vessel = /Vessel \/ Voyage ?: *(.+)/.exec(text)?.[1].trim() || '';
    const pol = /POL ?: *(.+)/.exec(text)?.[1].trim() || '';
    return { booking, vessel, pol };
  }
  if (type === 'Packing List') {
    // try excel first
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header:1 });
      // custom locate Description & Total Net Weight
      return { description: json.slice(5,15).map(r=>r.join(' ')).join('\n'), totalNetWeight: json.find(r=>r[0]==='Total Net Weight')?.[1]||'' };
    } catch { }
    const text = (await pdfParse(buffer)).text;
    const descMatch = text.split('Description')[1]?.split('Total Net Weight')?.[0].trim() || '';
    const wt = /Total Net Weight\s*\(MT\) ?: *([\d\.]+)/.exec(text)?.[1] || '';
    return { description: descMatch, totalNetWeight: wt };
  }
  throw new Error('Unknown type');
}
