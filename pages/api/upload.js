// pages/api/upload.js
import fs from 'fs';
import { IncomingForm } from 'formidable';
import { getSession } from 'next-auth/react';
import { parseFile } from '../../lib/parse';
import { createAndFillSheet } from '../../lib/sheets';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // 1. 验证用户会话
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. 解析 multipart/form-data
  const form = new IncomingForm();
form.parse(req, async (err, fields, files) => {
  // …省略验证与文件读取…

  // 规范下拉值，确保是单个字符串
  const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;
  console.log('🔍 [upload.js] received fields.type=', fields.type, 'docType=', docType);

  // 传入 parseFile
  const data = await parseFile(buffer, docType, rawFile.originalFilename);
  // …
});
    try {
      // 3. 取出上传的文件对象（兼容数组）
      const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const filePath = rawFile.filepath || rawFile.path;
      if (!filePath) {
        console.error('找不到上传文件路径：', files);
        return res.status(500).json({ error: 'Uploaded file path not found' });
      }

      // 4. 读取文件内容
      const buffer = await fs.promises.readFile(filePath);

      // 5. 规范 fields.type，确保是字符串
      const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;

      // 6. 调用解析并传入 filename
      const data = await parseFile(buffer, docType, rawFile.originalFilename);

      // 7. 创建并写入 Google Sheet
      const url = await createAndFillSheet(data, session.user.email);

      // 8. 返回结果
      return res.status(200).json({ url });
    } catch (e) {
      console.error('Upload handler error:', e);
      return res.status(500).json({ error: e.message });
    }
  });
}
