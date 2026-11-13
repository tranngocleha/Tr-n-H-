import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StageSelect from "@/components/StageSelect";
import MatchPanel from "@/components/MatchPanel";

const stageColumns = [
  { value: "SOURCED", label: "Mới tìm thấy" },
  { value: "SCREENING", label: "Sàng lọc" },
  { value: "INTERVIEW", label: "Phỏng vấn" },
  { value: "OFFER", label: "Đề nghị offer" },
  { value: "HIRED", label: "Đã tuyển" },
  { value: "REJECTED", label: "Từ chối" },
] as const;

const statusLabel: Record<string, string> = {
  DRAFT: "Nháp",
  OPEN: "Đang tuyển",
  CLOSED: "Đã đóng",
};

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      applications: { include: { candidate: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!job) notFound();

  const byStage = Object.fromEntries(stageColumns.map((s) => [s.value, [] as typeof job.applications]));
  for (const app of job.applications) {
    byStage[app.stage]?.push(app);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{job.title}</h1>
          <p className="text-sm text-slate-500">
            {job.department || "—"}
            {job.location && ` · ${job.location}`} · {statusLabel[job.status]}
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-700 whitespace-pre-line">{job.description}</p>
        {job.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.map((skill) => (
              <span key={skill} className="badge bg-brand-50 text-brand-700">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      <MatchPanel jobId={job.id} alreadyInPipeline={job.applications.map((a) => a.candidateId)} />

      <div>
        <p className="font-medium text-slate-900 mb-3">Pipeline ứng viên</p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stageColumns.map((col) => (
            <div key={col.value} className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {col.label} ({byStage[col.value].length})
              </p>
              <div className="space-y-2">
                {byStage[col.value].map((app) => (
                  <div key={app.id} className="card p-3 space-y-2">
                    <Link
                      href={`/candidates/${app.candidateId}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-700 block truncate"
                    >
                      {app.candidate.fullName}
                    </Link>
                    <StageSelect applicationId={app.id} currentStage={app.stage} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
