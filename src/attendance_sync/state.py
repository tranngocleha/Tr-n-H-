from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional


class SyncState:
    """Lưu checkpoint (thời điểm bản ghi cuối đã đồng bộ) để tránh gửi trùng dữ liệu."""

    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load_last_checktime(self) -> Optional[datetime]:
        if not self.path.exists():
            return None
        data = json.loads(self.path.read_text(encoding="utf-8"))
        value = data.get("last_checktime")
        return datetime.fromisoformat(value) if value else None

    def save_last_checktime(self, value: datetime) -> None:
        data = {"last_checktime": value.isoformat(), "updated_at": datetime.now().isoformat()}
        # Ghi ra file tạm rồi rename để tránh hỏng state nếu tiến trình bị
        # dừng đột ngột giữa chừng khi đang ghi.
        fd, tmp_path = tempfile.mkstemp(dir=self.path.parent)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp_path, self.path)
