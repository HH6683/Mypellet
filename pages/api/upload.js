// pages/api/upload.js
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
    if (err) return res.status(500).json({ error: 'Form parse error' });

    try {
      const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const filePath = rawFile.filepath || rawFile.path;
      const buffer = await fs.promises.readFile(filePath);

      // ✅ 这里就是关键：给 parseFile 传三个参数
      const data = await parseFile(
        buffer,
        fields.type,
        rawFile.originalFilename
      );

      const url = await createAndFillSheet(data, session.user.email);
      return res.status(200).json({ url });
    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
