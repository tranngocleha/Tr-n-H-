import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [totalCandidates, openJobs, totalJobs, stageGroups, recentCandidates] = await Promise.all([
    prisma.candidate.count(),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.job.count(),
    prisma.application.groupBy({ by: ["stage"], _count: { _all: true } }),
    prisma.candidate.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const stageCounts = Object.fromEntries(stageGroups.map((g) => [g.stage, g._count._all]));

  const stats = [
    { label: "Tổng ứng viên", value: totalCandidates },
    { label: "Tin đang tuyển", value: openJobs },
    { label: "Tổng tin tuyển dụng", value: totalJobs },
    { label: "Đang phỏng vấn", value: stageCounts.INTERVIEW ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tổng quan</h1>
        <p className="text-sm text-slate-500">Tình hình tuyển dụng hiện tại.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium text-slate-900">Ứng viên mới nhất</p>
          <Link href="/candidates" className="text-sm text-brand-600 hover:underline">
            Xem tất cả
          </Link>
        </div>
        {recentCandidates.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có ứng viên nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentCandidates.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <Link href={`/candidates/${c.id}`} className="text-sm text-slate-900 hover:text-brand-700">
                  {c.fullName}
                </Link>
                <span className="text-xs text-slate-400">{c.industry || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <Link href="/candidates/new" className="btn-primary">
          + Thêm ứng viên
        </Link>
        <Link href="/jobs/new" className="btn-secondary">
          + Đăng tin tuyển dụng
        </Link>
      </div>
    </div>
  );
}
