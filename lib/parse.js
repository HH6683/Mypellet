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
    // 1) 抓 Description 到表格头 “No. Container No.” 之间所有行
    const lines = text.split(/\r?\n/);
    let inDesc = false;
    const descLines = [];
    for (let line of lines) {
      if (/Description/i.test(line)) {
        inDesc = true;
        continue;
      }
      if (inDesc && /No\.\s*Container No\./i.test(line)) {
        break;
      }
      if (inDesc) {
        descLines.push(line.trim());
      }
    }
    const description = descLines
      .filter(l => l)             // 去掉空行
      .join(' ')                  // 用空格拼成一行
      .replace(/\s{2,}/g, ' ')    // 压缩多空格
      .trim();

    // 2) 抓最上面那个 NET WEIGHT: 268.80 MT OF WOOD PELLET
    const wtMatch = /NET\s+WEIGHT\s*[:\-]?\s*([\d.]+)/i.exec(text);
    const totalNetWeight = wtMatch
      ? `${wtMatch[1]} (MT)`
      : '';

    return { description, totalNetWeight };
  }

  throw new Error(`Unknown type: ${type}`);
}
