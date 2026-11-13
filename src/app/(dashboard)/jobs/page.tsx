import Link from "next/link";
import { prisma } from "@/lib/prisma";

const statusLabel: Record<string, string> = {
  DRAFT: "Nháp",
  OPEN: "Đang tuyển",
  CLOSED: "Đã đóng",
};

const statusColor: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  OPEN: "bg-green-50 text-green-700",
  CLOSED: "bg-slate-200 text-slate-600",
};

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tin tuyển dụng</h1>
          <p className="text-sm text-slate-500">{jobs.length} tin</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          + Đăng tin mới
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">Chưa có tin tuyển dụng nào.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="card p-4 block hover:border-brand-300 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{job.title}</p>
                  <p className="text-sm text-slate-500">
                    {job.department || "—"}
                    {job.location && ` · ${job.location}`}
                  </p>
                </div>
                <span className={`badge whitespace-nowrap ${statusColor[job.status]}`}>
                  {statusLabel[job.status]}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{job.description}</p>
              <p className="text-xs text-slate-400 mt-3">
                {job._count.applications} ứng viên trong pipeline
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
