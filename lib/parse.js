// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX     from 'xlsx';
import path     from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  // 工具：根据标签抓一整段文字，直到换行或下一个关键字
  const grab = (text, label) => {
    const re = new RegExp(label + '\\s*[:\\-]?\\s*([\\w\\s\\-\\/\\(\\)]+)', 'i');
    return re.exec(text)?.[1]?.trim() || '';
  };

  // —— Booking Confirmation —— 
  if (type === 'Booking Confirmation') {
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;

      // 1. Booking No
      const booking = grab(text, 'Booking No');
      // 2. Vessel/Voyage
      const vessel  = grab(text, 'Vessel\\s*/\\s*Voyage');
      // 3. POL
      const pol     = grab(text, 'POL');

      return { booking, vessel, pol };
    }
    // 如果也要支持 Excel，可在此处添加
  }

  // —— Packing List —— 
  if (type === 'Packing List') {
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;

      // 描述：从“Description”开始，到表格头“No. Container No.”为止
      const afterDesc = text.split(/Description/i)[1] || '';
      const description = afterDesc
        .split(/No\.\s*Container No\./i)[0]
        .trim();

      // 重量：取“NET WEIGHT: 268.80”中的数字，再加上“ (MT)”
      const wtMatch = /NET WEIGHT\s*[:\-]?\s*([\d.]+)/i.exec(text);
      const totalNetWeight = wtMatch
        ? `${wtMatch[1]} (MT)`
        : '';

      return { description, totalNetWeight };
    }
    // 如果也要支持 Excel，可在此处添加
  }

  throw new Error(`Unknown type: ${type}`);
}
