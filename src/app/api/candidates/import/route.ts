import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { extractTextFromFile } from "@/lib/resume-extract";
import { fetchSinglePageText } from "@/lib/fetch-url";
import { parseResumeText } from "@/lib/ai";
import { saveResumeFile } from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const formData = await request.formData();
  const mode = formData.get("mode");

  let rawText: string;
  let sourceType: "UPLOAD" | "URL_IMPORT";
  let sourceUrl: string | undefined;
  let resumeFileName: string | undefined;
  let resumeFilePath: string | undefined;

  try {
    if (mode === "file") {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Vui lòng chọn file CV." }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      rawText = await extractTextFromFile(buffer, file.name);
      sourceType = "UPLOAD";

      const saved = await saveResumeFile(buffer, file.name);
      resumeFileName = saved.fileName;
      resumeFilePath = saved.filePath;
    } else if (mode === "url") {
      const url = formData.get("url");
      if (typeof url !== "string" || !url.trim()) {
        return NextResponse.json({ error: "Vui lòng nhập link CV/hồ sơ công khai." }, { status: 400 });
      }
      const page = await fetchSinglePageText(url.trim());
      rawText = page.text;
      sourceType = "URL_IMPORT";
      sourceUrl = url.trim();
    } else {
      return NextResponse.json({ error: "Thiếu tham số mode (file/url)." }, { status: 400 });
    }

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "Không trích xuất được nội dung CV. Vui lòng thử file/link khác." },
        { status: 422 }
      );
    }

    const parsed = await parseResumeText(rawText);

    const candidate = await prisma.candidate.create({
      data: {
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        industry: parsed.industry,
        yearsOfExperience: parsed.yearsOfExperience,
        skills: parsed.skills,
        summary: parsed.summary,
        rawText,
        sourceType,
        sourceUrl,
        resumeFileName,
        resumeFilePath,
        createdById: user.id,
      },
    });

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Có lỗi xảy ra khi import CV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
