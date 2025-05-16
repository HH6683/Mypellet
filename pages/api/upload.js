// pages/api/upload.js
import fs from 'fs';
import formidable from 'formidable';
import { getSession } from 'next-auth/react';
import { parseFile } from '../../lib/parse';
import { createAndFillSheet } from '../../lib/sheets';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // 1. 验证登录
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. 解析 multipart 表单
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Form parse error' });
    }
    try {
      // 3. 读取文件内容
      const type = fields.type;
      const file = files.file;
      const buffer = await fs.promises.readFile(file.filepath);

      // 4. 调用解析逻辑
      const data = await parseFile(buffer, type);

      // 5. 创建并写入 Google Sheet
      const url = await createAndFillSheet(data, session.user.email);

      // 6. 返回 Sheet 链接
      return res.status(200).json({ url });
    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
