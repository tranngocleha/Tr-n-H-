import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export interface ParsedResume {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  industry?: string;
  yearsOfExperience?: number;
  skills: string[];
  summary: string;
}

const COMMON_SKILLS = [
  "sales b2b", "đàm phán", "crm", "chăm sóc khách hàng", "excel", "sql", "python",
  "javascript", "typescript", "react", "node.js", "quản lý dự án", "kế toán",
  "marketing", "seo", "content", "thiết kế đồ họa", "photoshop", "figma",
  "nhân sự", "tuyển dụng", "logistics", "xuất nhập khẩu", "kỹ thuật cơ khí",
  "điện tử", "xây dựng", "kiến trúc", "y tế", "điều dưỡng", "giáo dục",
  "tiếng anh", "tiếng trung", "tiếng nhật", "phân tích dữ liệu", "excel vba",
];

function fallbackParseResume(rawText: string): ParsedResume {
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = rawText.match(/(0|\+84)(\s?\d){9,10}/);
  const lower = rawText.toLowerCase();

  const skills = COMMON_SKILLS.filter((skill) => lower.includes(skill)).map((s) =>
    s.replace(/\b\w/g, (c) => c.toUpperCase())
  );

  const firstLine = rawText.split("\n").map((l) => l.trim()).find((l) => l.length > 0 && l.length < 60);

  return {
    fullName: firstLine || "Chưa xác định",
    email: emailMatch?.[0],
    phone: phoneMatch?.[0],
    skills,
    summary: rawText.slice(0, 400).replace(/\s+/g, " ").trim(),
  };
}

export async function parseResumeText(rawText: string): Promise<ParsedResume> {
  const client = getClient();
  if (!client) {
    return fallbackParseResume(rawText);
  }

  const prompt = `Bạn là trợ lý trích xuất thông tin CV. Đọc nội dung CV dưới đây và trả về DUY NHẤT một JSON hợp lệ (không thêm giải thích, không markdown) theo schema:
{
  "fullName": string,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "industry": string | null,
  "yearsOfExperience": number | null,
  "skills": string[],
  "summary": string (tóm tắt 2-3 câu về ứng viên)
}

Nội dung CV:
"""
${rawText.slice(0, 12000)}
"""`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return fallbackParseResume(rawText);
  }

  try {
    const json = JSON.parse(extractJson(textBlock.text));
    return {
      fullName: json.fullName || "Chưa xác định",
      email: json.email ?? undefined,
      phone: json.phone ?? undefined,
      location: json.location ?? undefined,
      industry: json.industry ?? undefined,
      yearsOfExperience: typeof json.yearsOfExperience === "number" ? json.yearsOfExperience : undefined,
      skills: Array.isArray(json.skills) ? json.skills : [],
      summary: json.summary || "",
    };
  } catch {
    return fallbackParseResume(rawText);
  }
}

export interface CandidateForMatching {
  id: string;
  fullName: string;
  skills: string[];
  summary?: string | null;
  yearsOfExperience?: number | null;
  industry?: string | null;
}

export interface MatchResult {
  candidateId: string;
  score: number;
  rationale: string;
}

function keywordOverlapScore(jobSkills: string[], candidate: CandidateForMatching): number {
  if (jobSkills.length === 0) return 0;
  const jobSet = new Set(jobSkills.map((s) => s.toLowerCase().trim()));
  const candidateSet = new Set(candidate.skills.map((s) => s.toLowerCase().trim()));
  let overlap = 0;
  for (const skill of jobSet) {
    if (candidateSet.has(skill)) overlap += 1;
  }
  return Math.round((overlap / jobSet.size) * 100);
}

export async function matchCandidatesToJob(
  job: { title: string; description: string; requiredSkills: string[] },
  candidates: CandidateForMatching[],
  topN = 20
): Promise<MatchResult[]> {
  const preRanked = candidates
    .map((c) => ({ candidate: c, score: keywordOverlapScore(job.requiredSkills, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  const client = getClient();
  if (!client) {
    return preRanked.map(({ candidate, score }) => ({
      candidateId: candidate.id,
      score,
      rationale: "Điểm tính theo mức trùng khớp kỹ năng với JD (chưa bật AI matching).",
    }));
  }

  const candidateList = preRanked
    .map(
      ({ candidate }) =>
        `- id: ${candidate.id}\n  tên: ${candidate.fullName}\n  ngành: ${candidate.industry ?? "?"}\n  số năm kinh nghiệm: ${candidate.yearsOfExperience ?? "?"}\n  kỹ năng: ${candidate.skills.join(", ")}\n  tóm tắt: ${candidate.summary ?? ""}`
    )
    .join("\n");

  const prompt = `Bạn là chuyên gia tuyển dụng. Cho vị trí sau:
Tiêu đề: ${job.title}
Mô tả: ${job.description}
Kỹ năng yêu cầu: ${job.requiredSkills.join(", ")}

Danh sách ứng viên:
${candidateList}

Hãy chấm điểm mức độ phù hợp (0-100) của TỪNG ứng viên với vị trí trên, kèm lý do ngắn gọn (1 câu, tiếng Việt).
Trả về DUY NHẤT một JSON array, không markdown, theo schema:
[{ "candidateId": string, "score": number, "rationale": string }]`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return preRanked.map(({ candidate, score }) => ({
      candidateId: candidate.id,
      score,
      rationale: "Điểm tính theo mức trùng khớp kỹ năng với JD.",
    }));
  }

  try {
    const results = JSON.parse(extractJson(textBlock.text)) as MatchResult[];
    return results.sort((a, b) => b.score - a.score);
  } catch {
    return preRanked.map(({ candidate, score }) => ({
      candidateId: candidate.id,
      score,
      rationale: "Điểm tính theo mức trùng khớp kỹ năng với JD.",
    }));
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) return fencedMatch[1].trim();
  return trimmed;
}
