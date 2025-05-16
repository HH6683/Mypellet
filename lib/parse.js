// lib/parse.js
export async function parseFile(buffer, type, filename) {
  console.log('🔍 [parseFile] type=', type, 'typeof type=', typeof type, 'filename=', filename);
  const ext = path.extname(filename || '').toLowerCase();
  console.log('🔍 [parseFile] ext=', ext);
  // …剩下的逻辑…

import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import path from 'path';

export async function parseFile(buffer, type, filename) {
  // —— 在这里打印日志，检查传进来的参数 —— 
  console.log('🔍 parseFile called with:', { type, filename });
  const ext = path.extname(filename || '').toLowerCase();
  console.log('🔍 detected extension:', ext);

  // 下面保持你原来的逻辑不变
  // Booking Confirmation
  if (type === 'Booking Confirmation') {
    if (ext === '.pdf') {
      /* … 省略原有 PDF 解析代码 … */
    } else if (ext === '.xlsx' || ext === '.xls') {
      /* … 省略原有 Excel 解析代码 … */
    }
  }
  // Packing List
  if (type === 'Packing List') {
    if (ext === '.pdf') {
      /* … */
    } else if (ext === '.xlsx' || ext === '.xls') {
      /* … */
    }
  }

  throw new Error(`Unknown type: ${type}`);
}
