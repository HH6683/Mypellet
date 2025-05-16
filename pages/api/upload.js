// pages/api/upload.js
import fs from 'fs';
import { IncomingForm } from 'formidable';
import { getSession } from 'next-auth/react';
import { parseFile } from '../../lib/parse';
import { appendToMasterSheet } from '../../lib/sheets';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // 校验登录
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Form parse error' });
    }

    try {
      // 获取上传文件信息
      const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const filePath = rawFile.filepath || rawFile.path;
      if (!filePath) {
        console.error('Uploaded file path not found:', files);
        return res.status(500).json({ error: 'Uploaded file path not found' });
      }

      // 读取文件到 Buffer
      const buffer = await fs.promises.readFile(filePath);
      const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;

      // 调用解析逻辑
      const data = await parseFile(buffer, docType, rawFile.originalFilename);
      console.log('🛠 Parsed data =', data);

      // 写入 Google Sheet
      const url = await appendToMasterSheet(
        { __type: docType, ...data },
        session.user.email
      );
      console.log('🛠 Sheet URL =', url);

      // 返回给前端
      return res.status(200).json({ url });
    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
