"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function CandidateFilters({ industries }: { industries: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [industry, setIndustry] = useState(searchParams.get("industry") ?? "");
  const [minExperience, setMinExperience] = useState(searchParams.get("minExperience") ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (industry) params.set("industry", industry);
    if (minExperience) params.set("minExperience", minExperience);
    router.push(`/candidates?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="label">Từ khóa</label>
        <input
          className="input"
          placeholder="Tên, kỹ năng, tóm tắt..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="w-48">
        <label className="label">Ngành nghề</label>
        <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">Tất cả</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      <div className="w-40">
        <label className="label">Số năm KN tối thiểu</label>
        <input
          type="number"
          min={0}
          step={0.5}
          className="input"
          value={minExperience}
          onChange={(e) => setMinExperience(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-primary">
        Tìm kiếm
      </button>
    </form>
  );
}
