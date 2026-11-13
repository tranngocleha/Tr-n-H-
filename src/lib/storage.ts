import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./storage/uploads";

export async function saveResumeFile(
  buffer: Buffer,
  originalFileName: string
): Promise<{ fileName: string; filePath: string }> {
  const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), UPLOAD_DIR);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(originalFileName) || "";
  const safeName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const absolutePath = path.join(dir, safeName);

  await writeFile(absolutePath, buffer);

  return { fileName: originalFileName, filePath: path.join(UPLOAD_DIR, safeName) };
}
