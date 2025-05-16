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
        console.error('Missing uploaded file path', files);
        return res.status(500).json({ error: 'Uploaded file path not found' });
      }

      const buffer = await fs.promises.readFile(filePath);
      const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;

      // 只调用解析和写表，不再打印 raw PDF 文本
      const data = await parseFile(buffer, docType, rawFile.originalFilename);
      const url  = await appendToMasterSheet(
        { __type: docType, ...data },
        session.user.email
      );

      return res.status(200).json({ url });
    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
