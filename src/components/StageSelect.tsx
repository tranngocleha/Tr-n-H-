"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const stages = [
  { value: "SOURCED", label: "Mới tìm thấy" },
  { value: "SCREENING", label: "Sàng lọc" },
  { value: "INTERVIEW", label: "Phỏng vấn" },
  { value: "OFFER", label: "Đề nghị offer" },
  { value: "HIRED", label: "Đã tuyển" },
  { value: "REJECTED", label: "Từ chối" },
];

export default function StageSelect({
  applicationId,
  currentStage,
}: {
  applicationId: string;
  currentStage: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(stage: string) {
    setLoading(true);
    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      className="input text-xs py-1"
      value={currentStage}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value)}
    >
      {stages.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
