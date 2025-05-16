// lib/parse.js
import pdfParse from 'pdf-parse';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext  = path.extname(filename || '').toLowerCase();
  const text = (await pdfParse(buffer)).text;

  // —— Booking Confirmation —— 
  if (type === 'Booking Confirmation' && ext === '.pdf') {
    const booking = /Booking\s*No\.?\s*:\s*(\S+)/i.exec(text)?.[1] || '';
    const vessel  = /Vessel\s*\/\s*Voyage\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
    const pol     = /POL\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';
    return { booking, vessel, pol };
  }

  // —— Packing List —— 
  if (type === 'Packing List' && ext === '.pdf') {
    // 整段Description到Total Net Weight
    const descMatch = /Description([\s\S]*?)Total\s+Net\s+Weight/i.exec(text);
    const description = descMatch
      ? descMatch[1].replace(/\r?\n+/g, ' ').trim()
      : '';

    // 抓重量数字，加 (MT)
    const wtMatch = /Total\s+Net\s+Weight\s*[:\-]?\s*([\d.]+)/i.exec(text);
    const totalNetWeight = wtMatch
      ? `${wtMatch[1]} (MT)`
      : '';

    // 表格行：从“No. Container No.”分割后逐行解析
    const table = text.split(/No\.\s*Container No\./i)[1] || '';
    const lines = table.split(/\r?\n/).slice(1).filter(l => l.trim());
    const items = lines.map(line => {
      // 多空格分隔列
      const cols = line.trim().split(/\s{2,}/);
      if (cols.length >= 5) {
        return {
          containerNo: cols[1],
          sealNo:      cols[2],
          lot:         cols[3],
          netWeight:   cols[4],
          grossWeight: cols[5] || ''
        };
      }
      return null;
    }).filter(x => x);

    return { description, totalNetWeight, items };
  }

  throw new Error(`Unknown type: ${type}`);
}
