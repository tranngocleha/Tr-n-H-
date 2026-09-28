from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

from .config import load_config
from .db_source import AttendanceSource
from .state import SyncState
from .sync import run_once


def setup_logging(log_file: str) -> None:
    Path(log_file).parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.FileHandler(log_file, encoding="utf-8"), logging.StreamHandler(sys.stdout)],
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Đồng bộ dữ liệu chấm công vân tay lên HRM")
    parser.add_argument("--config", default="config.yaml", help="Đường dẫn file cấu hình")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("run-once", help="Chạy đồng bộ 1 lần (dùng cho cron/Task Scheduler)")
    subparsers.add_parser("run-loop", help="Chạy liên tục, lặp lại theo poll_interval_seconds")
    subparsers.add_parser("test-connection", help="Kiểm tra kết nối tới DB máy chấm công")
    subparsers.add_parser("show-state", help="Hiển thị checkpoint đồng bộ hiện tại")

    args = parser.parse_args()
    config = load_config(args.config)
    setup_logging(config.sync.log_file)
    logger = logging.getLogger("attendance_sync.cli")

    if args.command == "run-once":
        run_once(config)
    elif args.command == "run-loop":
        logger.info("Bắt đầu chạy vòng lặp, poll mỗi %d giây.", config.sync.poll_interval_seconds)
        while True:
            try:
                run_once(config)
            except Exception:
                logger.exception("Lỗi không mong muốn trong vòng lặp đồng bộ.")
            time.sleep(config.sync.poll_interval_seconds)
    elif args.command == "test-connection":
        AttendanceSource(config.source).test_connection()
        print("Kết nối OK.")
    elif args.command == "show-state":
        state = SyncState(config.sync.state_file)
        last = state.load_last_checktime()
        print(f"Checkpoint hiện tại (last_checktime): {last}")


if __name__ == "__main__":
    main()
