// lib/parse.js
import pdfParse from 'pdf-parse';
import path     from 'path';

/**
 * 解析上传文件，根据 type 和扩展名分别处理
 */
export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();
  const text = (await pdfParse(buffer)).text;

  if (type === 'Booking Confirmation' && ext === '.pdf') {
    // Booking No：后面跟着不含空格的编号
    const booking = /Booking\s*No\.?\s*:\s*(\S+)/i.exec(text)?.[1] || '';

    // Vessel/Voyage：匹配冒号后到行尾，不含下一个关键字
    const vessel = /Vessel\s*\/\s*Voyage\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';

    // POL：匹配冒号后到行尾
    const pol = /POL\s*:\s*([^\r\n]+)/i.exec(text)?.[1].trim() || '';

    return { booking, vessel, pol };
  }

  if (type === 'Packing List' && ext === '.pdf') {
    // Description：从“Description”到“Total Net Weight”之间的所有文字
    const descMatch = /Description([\s\S]*?)Total\s+Net\s+Weight/i.exec(text);
    // 把换行折叠成空格，去掉首尾空白
    const description = descMatch
      ? descMatch[1].replace(/\r?\n+/g, ' ').trim()
      : '';

    // Total Net Weight：抓数字，再加 (MT)
    const wtMatch = /Total\s+Net\s+Weight\s*[:\-]?\s*([\d.]+)/i.exec(text);
    const totalNetWeight = wtMatch
      ? `${wtMatch[1]} (MT)`
      : '';

    return { description, totalNetWeight };
  }

  throw new Error(`Unknown type: ${type}`);
}
