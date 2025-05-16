// lib/parse.js
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import path from 'path';

export async function parseFile(buffer, type, filename) {
  const ext = path.extname(filename || '').toLowerCase();

  // 实用的通用抓组函数
  const grab = (text, label) => {
    const re = new RegExp(label + '\\W*([\\w-]+)', 'i');
    return re.exec(text)?.[1]?.trim() || '';
  };

  // Booking Confirmation
  if (type === 'Booking Confirmation') {
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;

      // 抓 Booking No  
      const booking = grab(text, 'Booking No');
      // 抓 Vessel 或 Voyage 中间可能有“/”“-”“ ” 
      const vessel  = grab(text, 'Vessel\\s*/\\s*Voyage');
      // 抓 POL
      const pol     = grab(text, 'POL');

      return { booking, vessel, pol };
    }
    // Excel 分支可类似调整，如果需要再告诉我
  }

  // Packing List
  if (type === 'Packing List') {
    if (ext === '.pdf') {
      const text = (await pdfParse(buffer)).text;
      // 取 Description 到出现 Total Net Weight 之间的所有字符
      const desc = text.split(/Description/i)[1]
                       ?.split(/Total Net Weight/i)[0]
                       .trim() || '';
      // 抓最后一个数字块
      const wtMatch = text.match(/Total Net Weight\D*(\d+(\.\d+)?)/i);
      const totalNetWeight = wtMatch?.[1] || '';
      return { description: desc, totalNetWeight };
    }
    // Excel 分支同理
  }

  throw new Error(`Unknown type: ${type}`);
}
