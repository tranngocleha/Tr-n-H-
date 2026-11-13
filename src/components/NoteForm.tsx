"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NoteForm({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setBody("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="input"
        placeholder="Thêm ghi chú về ứng viên..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button type="submit" disabled={loading} className="btn-secondary whitespace-nowrap">
        Thêm ghi chú
      </button>
    </form>
  );
}
