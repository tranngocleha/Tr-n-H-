from __future__ import annotations

import logging

from .config import AppConfig
from .db_source import AttendanceSource
from .hrm_client import HrmClient
from .state import SyncState

logger = logging.getLogger(__name__)


def run_once(config: AppConfig) -> int:
    """Chạy 1 lượt đồng bộ. Trả về số bản ghi đã đồng bộ thành công."""

    source = AttendanceSource(config.source)
    hrm = HrmClient(config.hrm)
    state = SyncState(config.sync.state_file)

    since = state.load_last_checktime()
    logs = source.fetch_new_logs(since=since)

    if not logs:
        logger.info("Không có bản ghi mới cần đồng bộ.")
        return 0

    synced = 0
    batch_size = config.hrm.batch_size
    for i in range(0, len(logs), batch_size):
        batch = logs[i : i + batch_size]
        try:
            hrm.push_batch(batch)
        except Exception:
            logger.exception(
                "Đẩy dữ liệu lên HRM thất bại ở batch bắt đầu từ bản ghi thứ %d. "
                "Dừng lại tại đây - các batch trước đó đã lưu checkpoint nên "
                "lần chạy sau sẽ tiếp tục đúng chỗ, không gửi trùng.",
                i,
            )
            break

        synced += len(batch)
        state.save_last_checktime(batch[-1].checktime)

    logger.info("Hoàn tất: đã đồng bộ %d/%d bản ghi.", synced, len(logs))
    return synced
