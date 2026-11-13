import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NoteForm from "@/components/NoteForm";
import AddToPipelineForm from "@/components/AddToPipelineForm";

const stageLabel: Record<string, string> = {
  SOURCED: "Mới tìm thấy",
  SCREENING: "Sàng lọc",
  INTERVIEW: "Phỏng vấn",
  OFFER: "Đề nghị offer",
  HIRED: "Đã tuyển",
  REJECTED: "Từ chối",
};

const sourceLabel: Record<string, string> = {
  UPLOAD: "Upload CV",
  URL_IMPORT: "Import từ link",
  MANUAL: "Nhập thủ công",
};

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      applications: { include: { job: true }, orderBy: { createdAt: "desc" } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!candidate) notFound();

  const appliedJobIds = new Set(candidate.applications.map((a) => a.jobId));
  const openJobs = await prisma.job.findMany({
    where: { status: "OPEN", id: { notIn: [...appliedJobIds] } },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{candidate.fullName}</h1>
          <p className="text-sm text-slate-500">
            {candidate.industry || "Chưa rõ ngành"}
            {candidate.yearsOfExperience != null && ` · ${candidate.yearsOfExperience} năm kinh nghiệm`}
            {candidate.location && ` · ${candidate.location}`}
          </p>
        </div>
        <span className="badge bg-slate-100 text-slate-600">
          {sourceLabel[candidate.sourceType] ?? candidate.sourceType}
        </span>
      </div>

      <div className="card p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Email</p>
          <p className="text-slate-900">{candidate.email || "—"}</p>
        </div>
        <div>
          <p className="text-slate-500">Điện thoại</p>
          <p className="text-slate-900">{candidate.phone || "—"}</p>
        </div>
        {candidate.sourceUrl && (
          <div className="col-span-2">
            <p className="text-slate-500">Nguồn</p>
            <a
              href={candidate.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 hover:underline break-all"
            >
              {candidate.sourceUrl}
            </a>
          </div>
        )}
        {candidate.resumeFileName && (
          <div className="col-span-2">
            <p className="text-slate-500">File CV</p>
            <p className="text-slate-900">{candidate.resumeFileName}</p>
          </div>
        )}
      </div>

      {candidate.skills.length > 0 && (
        <div className="card p-5">
          <p className="font-medium text-slate-900 mb-2">Kỹ năng</p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map((skill) => (
              <span key={skill} className="badge bg-brand-50 text-brand-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {candidate.summary && (
        <div className="card p-5">
          <p className="font-medium text-slate-900 mb-2">Tóm tắt</p>
          <p className="text-sm text-slate-700 whitespace-pre-line">{candidate.summary}</p>
        </div>
      )}

      <div className="card p-5 space-y-3">
        <p className="font-medium text-slate-900">Pipeline tuyển dụng</p>
        {candidate.applications.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa gắn với tin tuyển dụng nào.</p>
        ) : (
          <ul className="space-y-2">
            {candidate.applications.map((app) => (
              <li
                key={app.id}
                className="flex items-center justify-between text-sm border border-slate-200 rounded-md px-3 py-2"
              >
                <span className="text-slate-900">{app.job.title}</span>
                <span className="badge bg-slate-100 text-slate-600">
                  {stageLabel[app.stage] ?? app.stage}
                </span>
              </li>
            ))}
          </ul>
        )}
        <AddToPipelineForm candidateId={candidate.id} jobs={openJobs} />
      </div>

      <div className="card p-5 space-y-3">
        <p className="font-medium text-slate-900">Ghi chú</p>
        <NoteForm candidateId={candidate.id} />
        {candidate.notes.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có ghi chú.</p>
        ) : (
          <ul className="space-y-3">
            {candidate.notes.map((note) => (
              <li key={note.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                <p className="text-slate-800">{note.body}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {note.author?.name ?? "Ẩn danh"} · {new Date(note.createdAt).toLocaleString("vi-VN")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {candidate.rawText && (
        <details className="card p-5">
          <summary className="font-medium text-slate-900 cursor-pointer">
            Nội dung CV gốc (trích xuất tự động)
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-600 max-h-96 overflow-y-auto">
            {candidate.rawText}
          </pre>
        </details>
      )}
    </div>
  );
}
