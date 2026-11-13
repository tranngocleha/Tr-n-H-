import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import CandidateFilters from "@/components/CandidateFilters";
import CandidateCard from "@/components/CandidateCard";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string; minExperience?: string }>;
}) {
  const { q, industry, minExperience } = await searchParams;

  const where: Prisma.CandidateWhereInput = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { skills: { has: q } },
    ];
  }
  if (industry) {
    where.industry = { equals: industry, mode: "insensitive" };
  }
  if (minExperience) {
    where.yearsOfExperience = { gte: Number(minExperience) };
  }

  const [candidates, industriesRaw] = await Promise.all([
    prisma.candidate.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.candidate.findMany({
      where: { industry: { not: null } },
      select: { industry: true },
      distinct: ["industry"],
    }),
  ]);

  const industries = industriesRaw.map((i) => i.industry).filter((v): v is string => Boolean(v));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Ứng viên</h1>
          <p className="text-sm text-slate-500">{candidates.length} hồ sơ phù hợp bộ lọc</p>
        </div>
        <Link href="/candidates/new" className="btn-primary">
          + Thêm ứng viên
        </Link>
      </div>

      <CandidateFilters industries={industries} />

      {candidates.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          Chưa có ứng viên nào khớp bộ lọc. Hãy thêm ứng viên mới.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
