from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import pyodbc

from .config import SourceConfig

logger = logging.getLogger(__name__)


@dataclass
class AttendanceLog:
    employee_code: str
    checktime: datetime
    check_type: Optional[str]
    device_id: Optional[str]


class AttendanceSource:
    """Đọc log chấm công từ DB của phần mềm máy chấm công (ZKTeco/Ronald Jack/Wise Eye...)."""

    def __init__(self, config: SourceConfig):
        self.config = config

    def _connection_string(self) -> str:
        cfg = self.config
        if cfg.driver_type == "mssql":
            return (
                "DRIVER={ODBC Driver 17 for SQL Server};"
                f"SERVER={cfg.server};DATABASE={cfg.database};"
                f"UID={cfg.username};PWD={cfg.password};"
                "TrustServerCertificate=yes;"
            )
        if cfg.driver_type == "access":
            return (
                "DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
                f"DBQ={cfg.mdb_path};"
            )
        raise ValueError(f"driver_type không hỗ trợ: {cfg.driver_type}")

    def test_connection(self) -> None:
        with pyodbc.connect(self._connection_string(), timeout=10):
            logger.info("Kết nối tới nguồn dữ liệu chấm công thành công.")

    def fetch_new_logs(self, since: Optional[datetime], limit: int = 5000) -> list[AttendanceLog]:
        cfg = self.config
        cols = cfg.columns
        where_clause = f"WHERE {cfg.cursor_column} > ?" if since else ""
        query = (
            f"SELECT TOP {limit} {cols['employee_code']}, {cols['checktime']}, "
            f"{cols.get('check_type', 'NULL')}, {cols.get('device_id', 'NULL')} "
            f"FROM {cfg.table} "
            f"{where_clause} "
            f"ORDER BY {cfg.cursor_column} ASC"
        )
        params = (since,) if since else ()

        results: list[AttendanceLog] = []
        with pyodbc.connect(self._connection_string(), timeout=15) as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            for row in cursor.fetchall():
                results.append(
                    AttendanceLog(
                        employee_code=str(row[0]).strip(),
                        checktime=row[1],
                        check_type=str(row[2]) if row[2] is not None else None,
                        device_id=str(row[3]) if row[3] is not None else None,
                    )
                )
        logger.info("Đọc được %d bản ghi chấm công mới.", len(results))
        return results
