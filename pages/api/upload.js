// pages/api/upload.js
import fs from 'fs';
import { IncomingForm } from 'formidable';
import { getSession } from 'next-auth/react';
import { parseFile } from '../../lib/parse';
import { appendToMasterSheet } from '../../lib/sheets';

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
      const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const filePath = rawFile.filepath || rawFile.path;
      if (!filePath) {
        console.error('找不到上传文件路径：', files);
        return res.status(500).json({ error: 'Uploaded file path not found' });
      }
      const buffer = await fs.promises.readFile(filePath);

      console.log('🔍 [upload.js] fields.type 原始值 =', fields.type);
      const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      console.log('🔍 [upload.js] docType =', docType);

            // 解析完数据
      const data = await parseFile(buffer, docType, rawFile.originalFilename);
      console.log('✅ Parsed data:', data);

      // 调用 Sheets API
      const url = await appendToMasterSheet(
  { __type: docType, …data },   // 在 data 里加个 __type 字段
  session.user.email
      console.log('✅ appendToMasterSheet returned URL =', url);

      // 返回给前端
      return res.status(200).json({ url });

    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
