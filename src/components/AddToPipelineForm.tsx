"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AddToPipelineForm({
  candidateId,
  jobs,
}: {
  candidateId: string;
  jobs: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có tin tuyển dụng nào đang mở.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.title}
          </option>
        ))}
      </select>
      <button type="submit" disabled={loading} className="btn-secondary whitespace-nowrap">
        Thêm vào pipeline
      </button>
      {error && <p className="text-sm text-red-600 self-center">{error}</p>}
    </form>
  );
}
