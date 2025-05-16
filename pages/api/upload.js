form.parse(req, async (err, fields, files) => {
  // …前面不变…
  try {
    const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
    const filePath = rawFile.filepath || rawFile.path;
    const buffer = await fs.promises.readFile(filePath);

    // 统一取第一个元素，确保是字符串
    const docType = Array.isArray(fields.type) ? fields.type[0] : fields.type;

    // 传入 string 类型的 docType
    const data = await parseFile(buffer, docType, rawFile.originalFilename);

    const url = await createAndFillSheet(data, session.user.email);
    return res.status(200).json({ url });
  } catch (e) {
    // …
  }
});
