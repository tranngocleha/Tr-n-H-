from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import yaml
from dotenv import load_dotenv


@dataclass
class SourceConfig:
    driver_type: str
    table: str
    columns: dict
    cursor_column: str
    server: Optional[str] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    mdb_path: Optional[str] = None


@dataclass
class HrmConfig:
    base_url: str
    endpoint: str
    auth_type: str
    auth_header: str
    api_key: Optional[str]
    timeout_seconds: int
    max_retries: int
    batch_size: int


@dataclass
class SyncConfig:
    state_file: str
    poll_interval_seconds: int
    timezone: str
    log_file: str


@dataclass
class AppConfig:
    source: SourceConfig
    hrm: HrmConfig
    sync: SyncConfig


def load_config(path: str = "config.yaml") -> AppConfig:
    load_dotenv()

    with open(path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    src = raw["source"]
    source = SourceConfig(
        driver_type=src["driver_type"],
        table=src["table"],
        columns=src["columns"],
        cursor_column=src["cursor_column"],
        server=src.get("server"),
        database=src.get("database"),
        username=src.get("username"),
        password=os.environ.get("ATTSYNC_DB_PASSWORD"),
        mdb_path=src.get("mdb_path"),
    )

    h = raw["hrm"]
    hrm = HrmConfig(
        base_url=h["base_url"].rstrip("/"),
        endpoint=h["endpoint"],
        auth_type=h["auth_type"],
        auth_header=h["auth_header"],
        api_key=os.environ.get("ATTSYNC_HRM_API_KEY"),
        timeout_seconds=h.get("timeout_seconds", 15),
        max_retries=h.get("max_retries", 3),
        batch_size=h.get("batch_size", 200),
    )

    s = raw["sync"]
    sync = SyncConfig(
        state_file=s.get("state_file", "./state/sync_state.json"),
        poll_interval_seconds=s.get("poll_interval_seconds", 300),
        timezone=s.get("timezone", "Asia/Ho_Chi_Minh"),
        log_file=s.get("log_file", "./logs/attendance_sync.log"),
    )

    return AppConfig(source=source, hrm=hrm, sync=sync)
