"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "upload" | "url" | "manual";

export default function NewCandidatePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");

  const [manual, setManual] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    industry: "",
    yearsOfExperience: "",
    skills: "",
    summary: "",
  });

  async function afterCreate(res: Response) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Có lỗi xảy ra.");
    }
    router.push(`/candidates/${data.candidate.id}`);
    router.refresh();
  }

  async function handleUploadSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn file CV.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("mode", "file");
      formData.set("file", file);
      const res = await fetch("/api/candidates/import", { method: "POST", body: formData });
      await afterCreate(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUrlSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Vui lòng nhập link.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("mode", "url");
      formData.set("url", url.trim());
      const res = await fetch("/api/candidates/import", { method: "POST", body: formData });
      await afterCreate(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    if (!manual.fullName.trim()) {
      setError("Vui lòng nhập họ tên.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...manual,
          skills: manual.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      await afterCreate(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Thêm ứng viên</h1>
        <p className="text-sm text-slate-500">
          Upload CV, import từ một link công khai cụ thể, hoặc nhập tay thông tin ứng viên.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {(
          [
            { id: "upload", label: "Upload CV" },
            { id: "url", label: "Import từ link" },
            { id: "manual", label: "Nhập thủ công" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="card p-3 text-sm text-red-600 border-red-200">{error}</div>}

      {tab === "upload" && (
        <form onSubmit={handleUploadSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">File CV (PDF, DOCX hoặc TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <p className="text-xs text-slate-500">
            Hệ thống sẽ tự động trích xuất họ tên, kỹ năng, kinh nghiệm bằng AI.
          </p>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Đang xử lý..." : "Tải lên & phân tích"}
          </button>
        </form>
      )}

      {tab === "url" && (
        <form onSubmit={handleUrlSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Link CV / trang hồ sơ công khai của ứng viên</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">
            Chỉ dùng cho một link cụ thể mà bạn đã biết là hồ sơ công khai của ứng viên (ví dụ trang
            cá nhân họ chia sẻ). Hệ thống không thu thập hàng loạt từ các nền tảng khác.
          </p>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Đang xử lý..." : "Import & phân tích"}
          </button>
        </form>
      )}

      {tab === "manual" && (
        <form onSubmit={handleManualSubmit} className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Họ tên *</label>
              <input
                className="input"
                value={manual.fullName}
                onChange={(e) => setManual({ ...manual, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                value={manual.email}
                onChange={(e) => setManual({ ...manual, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Điện thoại</label>
              <input
                className="input"
                value={manual.phone}
                onChange={(e) => setManual({ ...manual, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Địa điểm</label>
              <input
                className="input"
                value={manual.location}
                onChange={(e) => setManual({ ...manual, location: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Ngành nghề</label>
              <input
                className="input"
                value={manual.industry}
                onChange={(e) => setManual({ ...manual, industry: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Số năm kinh nghiệm</label>
              <input
                type="number"
                step={0.5}
                className="input"
                value={manual.yearsOfExperience}
                onChange={(e) => setManual({ ...manual, yearsOfExperience: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Kỹ năng (phân tách bằng dấu phẩy)</label>
            <input
              className="input"
              placeholder="Sales B2B, CRM, Đàm phán"
              value={manual.skills}
              onChange={(e) => setManual({ ...manual, skills: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Tóm tắt</label>
            <textarea
              className="input"
              rows={3}
              value={manual.summary}
              onChange={(e) => setManual({ ...manual, summary: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Đang lưu..." : "Lưu ứng viên"}
          </button>
        </form>
      )}
    </div>
  );
}
