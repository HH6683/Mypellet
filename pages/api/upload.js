// pages/api/upload.js
import fs from 'fs';
import { IncomingForm } from 'formidable';
import { getSession } from 'next-auth/react';
import { parseFile } require '../../lib/parse';
import { createAndFillSheet } from '../../lib/sheets';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // 1. 验证会话
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
      // 3. 取第一个上传文件（兼容数组）
      const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const filePath = rawFile.filepath || rawFile.path;
      if (!filePath) {
        console.error('找不到上传文件路径：', files);
        return res.status(500).json({ error: 'Uploaded file path not found' });
      }

      // 4. 读文件
      const buffer = await fs.promises.readFile(filePath);

      // 5. 规范 fields.type，确保它是字符串
      console.log('🔍 [upload.js] fields.type 原始值 =', fields.type);
      const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      console.log('🔍 [upload.js] docType =', docType);

      // 6. 调用解析函数，传入 filename 以便分支
      const data = await parseFile(buffer, docType, rawFile.originalFilename);

      // 7. 写入 Google Sheet
      const url = await createAndFillSheet(data, session.user.email);

      // 8. 返回链接
      return res.status(200).json({ url });
    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
