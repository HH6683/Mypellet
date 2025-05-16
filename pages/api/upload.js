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

    // 打印类型和文件名
    console.log('🛠 [upload.js] fields.type 原始值 =', fields.type);
    const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;
    console.log('🛠 [upload.js] docType =', docType);
    console.log('🛠 [upload.js] originalFilename =', rawFile.originalFilename);

    // 直接输出 PDF 文本前 1000 字符看看长什么样
    const text = (await import('pdf-parse')).default(buffer).then(r => r.text);
    console.log('🛠 [upload.js] raw PDF text:', (await text).slice(0, 1000));

    // 再走解析逻辑
    const data = await parseFile(buffer, docType, rawFile.originalFilename);
    console.log('✅ Parsed data:', data);

    // 写入 Master Sheet
    const url = await appendToMasterSheet(
      { __type: docType, ...data },
      session.user.email
    );
    console.log('✅ appendToMasterSheet returned URL =', url);

    return res.status(200).json({ url });
  } catch (e) {
    console.error('❌ [upload handler error]', e);
    return res.status(500).json({ error: e.message });
  }
});

    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
