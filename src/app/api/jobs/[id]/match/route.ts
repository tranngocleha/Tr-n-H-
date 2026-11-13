import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { matchCandidatesToJob } from "@/lib/ai";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Không tìm thấy tin tuyển dụng." }, { status: 404 });
  }

  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  if (candidates.length === 0) {
    return NextResponse.json({ matches: [] });
  }

  const results = await matchCandidatesToJob(
    { title: job.title, description: job.description, requiredSkills: job.requiredSkills },
    candidates.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      skills: c.skills,
      summary: c.summary,
      yearsOfExperience: c.yearsOfExperience,
      industry: c.industry,
    }))
  );

  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const matches = results
    .map((r) => ({ ...r, candidate: candidateById.get(r.candidateId) }))
    .filter((m) => m.candidate)
    .slice(0, 20);

  return NextResponse.json({ matches });
}
