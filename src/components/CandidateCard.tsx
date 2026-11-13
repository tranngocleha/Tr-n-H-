import Link from "next/link";
import type { Candidate } from "@prisma/client";

const sourceLabel: Record<string, string> = {
  UPLOAD: "Upload CV",
  URL_IMPORT: "Import từ link",
  MANUAL: "Nhập thủ công",
};

export default function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <Link
      href={`/candidates/${candidate.id}`}
      className="card p-4 block hover:border-brand-300 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{candidate.fullName}</p>
          <p className="text-sm text-slate-500">
            {candidate.industry || "Chưa rõ ngành"}
            {candidate.yearsOfExperience != null && ` · ${candidate.yearsOfExperience} năm KN`}
            {candidate.location && ` · ${candidate.location}`}
          </p>
        </div>
        <span className="badge bg-slate-100 text-slate-600 whitespace-nowrap">
          {sourceLabel[candidate.sourceType] ?? candidate.sourceType}
        </span>
      </div>

      {candidate.summary && (
        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{candidate.summary}</p>
      )}

      {candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {candidate.skills.slice(0, 6).map((skill) => (
            <span key={skill} className="badge bg-brand-50 text-brand-700">
              {skill}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
