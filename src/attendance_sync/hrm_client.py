from __future__ import annotations

import logging
from typing import Iterable

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .config import HrmConfig
from .db_source import AttendanceLog

logger = logging.getLogger(__name__)


class HrmClient:
    """Gọi API của HRM để đẩy dữ liệu chấm công lên."""

    def __init__(self, config: HrmConfig):
        self.config = config
        self.session = requests.Session()
        retries = Retry(
            total=config.max_retries,
            backoff_factor=2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST"],
        )
        self.session.mount("https://", HTTPAdapter(max_retries=retries))
        self.session.mount("http://", HTTPAdapter(max_retries=retries))

        if config.auth_type == "api_key":
            self.session.headers[config.auth_header] = config.api_key
        elif config.auth_type == "bearer":
            self.session.headers["Authorization"] = f"Bearer {config.api_key}"
        else:
            raise ValueError(f"auth_type không hỗ trợ: {config.auth_type}")

    def push_batch(self, logs: Iterable[AttendanceLog]) -> None:
        records = [
            {
                "employee_code": log.employee_code,
                "check_time": log.checktime.isoformat(),
                "check_type": log.check_type,
                "device_id": log.device_id,
                # idempotency_key giúp HRM chống ghi trùng nếu tool gửi lại
                # do lỗi mạng (retry) hoặc chạy lại thủ công.
                "idempotency_key": f"{log.employee_code}:{log.checktime.isoformat()}:{log.device_id}",
            }
            for log in logs
        ]

        url = f"{self.config.base_url}{self.config.endpoint}"
        response = self.session.post(url, json={"records": records}, timeout=self.config.timeout_seconds)
        response.raise_for_status()
        logger.info("Đẩy thành công %d bản ghi lên HRM.", len(records))
