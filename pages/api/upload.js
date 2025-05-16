// pages/api/upload.js
import fs from 'fs';
import { IncomingForm } from 'formidable';
import { getSession } from 'next-auth/react';
import { parseFile } from '../../lib/parse';
import { appendToMasterSheet } from '../../lib/sheets';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // 1. 验证登录
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. 解析 multipart/form-data
  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Form parse error' });
    }

    try {
      // 3. 取上传文件
      const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const filePath = rawFile.filepath || rawFile.path;
      if (!filePath) {
        console.error('找不到上传文件路径：', files);
        return res.status(500).json({ error: 'Uploaded file path not found' });
      }

      // 4. 读取文件 Buffer
      const buffer = await fs.promises.readFile(filePath);

      // 5. 打印调试信息：type 和文件名
      console.log('🛠 [upload] fields.type 原始值 =', fields.type);
      const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      console.log('🛠 [upload] docType =', docType);
      console.log('🛠 [upload] originalFilename =', rawFile.originalFilename);

      // 6. 打印前 1000 字符的原始 PDF 文本
      const pdfParse = (await import('pdf-parse')).default;
      const textResult = await pdfParse(buffer);
      console.log('🛠 [upload] raw PDF text:', textResult.text.slice(0, 1000));

      // 7. 调用解析逻辑
      const data = await parseFile(buffer, docType, rawFile.originalFilename);
      console.log('✅ Parsed data:', data);

      // 8. 写入主表并获取链接
      const url = await appendToMasterSheet({ __type: docType, ...data }, session.user.email);
      console.log('✅ appendToMasterSheet returned URL =', url);

      // 9. 返回给前端
      return res.status(200).json({ url });
    } catch (e) {
      console.error('❌ [upload handler error]', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
