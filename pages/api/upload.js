import fs from 'fs';
import { IncomingForm } from 'formidable';
import { getSession } from 'next-auth/react';
import { parseFile } from '../../lib/parse';
import { createAndFillSheet } from '../../lib/sheets';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Form parse error' });
    }
    try {
      const type = fields.type;

      // 1. 兼容 files.file 可能为数组或单个对象
      const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;

      // 2. 支持 filepath / path
      const filePath = rawFile.filepath || rawFile.path;
      if (!filePath) {
        console.error('找不到上传文件路径：', files);
        return res.status(500).json({ error: 'Uploaded file path not found' });
      }

      // 3. 读取文件 buffer
      const buffer = await fs.promises.readFile(filePath);

      // 4. 解析 & 写表
      const data = await parseFile(buffer, type);
      const url = await createAndFillSheet(data, session.user.email);

      return res.status(200).json({ url });
    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
