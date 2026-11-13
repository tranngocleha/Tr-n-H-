"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    department: "",
    industry: "",
    location: "",
    employmentType: "",
    description: "",
    requiredSkills: "",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Vui lòng nhập tiêu đề và mô tả công việc.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          requiredSkills: form.requiredSkills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/jobs/${data.job.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Đăng tin tuyển dụng</h1>
      </div>

      {error && <div className="card p-3 text-sm text-red-600 border-red-200">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Tiêu đề vị trí *</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phòng ban</label>
            <input
              className="input"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Ngành nghề</label>
            <input
              className="input"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Địa điểm</label>
            <input
              className="input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Hình thức</label>
            <input
              className="input"
              placeholder="Toàn thời gian, Part-time,..."
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Mô tả công việc *</label>
          <textarea
            className="input"
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Kỹ năng yêu cầu (phân tách bằng dấu phẩy)</label>
          <input
            className="input"
            placeholder="Sales B2B, CRM, Đàm phán"
            value={form.requiredSkills}
            onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Đang lưu..." : "Đăng tin"}
        </button>
      </form>
    </div>
  );
}
