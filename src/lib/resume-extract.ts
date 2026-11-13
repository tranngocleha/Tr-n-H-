export async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf-8");
  }

  throw new Error(
    `Định dạng file .${ext} chưa được hỗ trợ. Vui lòng dùng PDF, DOCX hoặc TXT.`
  );
}
