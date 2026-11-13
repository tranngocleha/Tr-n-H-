"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface MatchCandidate {
  id: string;
  fullName: string;
  industry: string | null;
  yearsOfExperience: number | null;
  skills: string[];
}

interface MatchResult {
  candidateId: string;
  score: number;
  rationale: string;
  candidate: MatchCandidate;
}

export default function MatchPanel({
  jobId,
  alreadyInPipeline,
}: {
  jobId: string;
  alreadyInPipeline: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function runMatch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/match`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  async function addToPipeline(candidateId: string) {
    const res = await fetch(`/api/jobs/${jobId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId }),
    });
    if (res.ok) {
      setAddedIds((prev) => new Set(prev).add(candidateId));
      router.refresh();
    }
  }

  const excludeSet = new Set(alreadyInPipeline);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">Gợi ý ứng viên phù hợp (AI)</p>
          <p className="text-xs text-slate-500">
            So khớp mô tả công việc với toàn bộ hồ sơ ứng viên hiện có.
          </p>
        </div>
        <button onClick={runMatch} disabled={loading} className="btn-secondary">
          {loading ? "Đang phân tích..." : matches ? "Chạy lại" : "Tìm ứng viên phù hợp"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {matches && matches.length === 0 && (
        <p className="text-sm text-slate-500">Chưa có ứng viên nào trong hệ thống để so khớp.</p>
      )}

      {matches && matches.length > 0 && (
        <ul className="space-y-2">
          {matches
            .filter((m) => !excludeSet.has(m.candidateId))
            .map((m) => (
              <li
                key={m.candidateId}
                className="flex items-center justify-between gap-3 border border-slate-200 rounded-md px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/candidates/${m.candidateId}`}
                    className="font-medium text-slate-900 hover:text-brand-700"
                  >
                    {m.candidate.fullName}
                  </Link>
                  <p className="text-xs text-slate-500 truncate">{m.rationale}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="badge bg-brand-50 text-brand-700">{m.score}%</span>
                  <button
                    onClick={() => addToPipeline(m.candidateId)}
                    disabled={addedIds.has(m.candidateId)}
                    className="btn-secondary text-xs py-1"
                  >
                    {addedIds.has(m.candidateId) ? "Đã thêm" : "Thêm vào pipeline"}
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
