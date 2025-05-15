/* pages/api/upload.js */
import formidable from 'formidable';
import { getSession } from 'next-auth/react';
import { parseFile } from '../../lib/parse';
import { createAndFillSheet } from '../../lib/sheets';

export const config = { api: { bodyParser: false }};

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).send('Upload error');
    const type = fields.type;
    const file = files.file;
    const buffer = await fs.promises.readFile(file.filepath);
    const data = await parseFile(buffer, type);
    const url = await createAndFillSheet(data, session.user.email);
    res.status(200).json({ url });
  });
}
