// pages/api/upload.js
import fs from 'fs';
import { IncomingForm } from 'formidable';     // ← 这样引入
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

  // 2. 解析 multipart/form-data
  const form = new IncomingForm();               // ← 用解构后的类
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Form parse error' });
    }
    try {
      // 3. 读取文件 buffer
      const type = fields.type;
      const file = files.file;
      const buffer = await fs.promises.readFile(file.filepath);

      // 4. 调用解析函数
      const data = await parseFile(buffer, type);

      // 5. 创建并写入 Google Sheet
      const url = await createAndFillSheet(data, session.user.email);

      // 6. 返回链接
      return res.status(200).json({ url });
    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
