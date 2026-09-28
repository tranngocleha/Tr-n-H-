# Tool đồng bộ dữ liệu chấm công vân tay lên HRM

Đồng bộ log chấm công từ phần mềm máy chấm công vân tay (ZKTeco / Ronald Jack /
Wise Eye... - các phần mềm dòng này thường dùng chung 1 schema DB) sang hệ
thống HRM nội bộ, thông qua API.

```
[Máy chấm công] -> [Phần mềm kết nối từ xa + DB cục bộ] -> [Tool này] -> [API HRM]
```

Tool đọc bản ghi mới từ DB của phần mềm chấm công, lưu checkpoint để không gửi
trùng, và POST theo batch lên API của HRM. Chạy 1 lần (cron / Task Scheduler)
hoặc chạy vòng lặp liên tục (service).

## 1. Khảo sát dữ liệu trước (bước bắt buộc)

Trước khi cấu hình, hãy xác nhận đúng tên bảng/cột thực tế trong DB của phần
mềm chấm công (mỗi hãng có thể khác chút ít). Chạy các câu lệnh trong
[`sql/explore_attendance_db.sql`](sql/explore_attendance_db.sql) trực tiếp
trên DB đó (SQL Server Management Studio, hoặc mở file `.mdb/.accdb` bằng MS
Access / DB Browser nếu phần mềm dùng Access).

Cần xác nhận:
- Tên bảng chứa log chấm công (mặc định giả định `CHECKINOUT`).
- Tên cột: mã nhân viên, thời gian chấm công, loại vào/ra, mã thiết bị.
- Mã nhân viên trên máy chấm công có khớp mã nhân viên trong HRM không (đây là
  lỗi phổ biến nhất khi đồng bộ 2 hệ thống độc lập).

## 2. Cài đặt

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
```

Cần cài driver ODBC tương ứng:
- SQL Server: "ODBC Driver 17 for SQL Server".
- MS Access: "Microsoft Access Database Engine" (lưu ý: phải cùng bitness
  32/64-bit với Python đang dùng, đây là lỗi hay gặp nhất khi kết nối Access).

## 3. Cấu hình

```bash
cp config.example.yaml config.yaml
cp .env.example .env
```

Chỉnh `config.yaml` theo kết quả khảo sát ở bước 1 (tên bảng, tên cột, thông
tin server). Mật khẩu DB và API key HRM đặt trong `.env`, không lưu trong
`config.yaml`.

Nếu máy chấm công ở xa (khác mạng), đảm bảo tool chạy được ở nơi có thể kết
nối tới DB đó - qua VPN nội bộ là lựa chọn an toàn hơn nhiều so với mở port DB
ra Internet trực tiếp.

## 4. Kiểm tra kết nối

```bash
python -m attendance_sync.cli --config config.yaml test-connection
```

## 5. Chạy đồng bộ

Chạy 1 lần (khuyến nghị cho cron / Windows Task Scheduler):

```bash
python -m attendance_sync.cli --config config.yaml run-once
```

Hoặc chạy liên tục như 1 service, tự lặp theo `poll_interval_seconds` trong
config:

```bash
python -m attendance_sync.cli --config config.yaml run-loop
```

Lên lịch cron (Linux), ví dụ mỗi 10 phút:

```
*/10 * * * * cd /path/to/tool && .venv/bin/python -m attendance_sync.cli run-once >> logs/cron.log 2>&1
```

Trên Windows, dùng Task Scheduler trỏ tới lệnh tương đương, hoặc chạy
`run-loop` như 1 service qua NSSM.

## 6. Hợp đồng dữ liệu (payload) gửi lên HRM

Tool POST JSON theo dạng sau tới endpoint cấu hình trong `hrm.endpoint`:

```json
{
  "records": [
    {
      "employee_code": "NV001",
      "check_time": "2026-09-28T08:02:15+07:00",
      "check_type": "I",
      "device_id": "1",
      "idempotency_key": "NV001:2026-09-28T08:02:15+07:00:1"
    }
  ]
}
```

Phía HRM nên dùng `idempotency_key` để chống ghi trùng nếu tool gửi lại do lỗi
mạng (tool có retry tự động). Xác thực bằng header cấu hình trong
`hrm.auth_type`/`hrm.auth_header` (mặc định kiểu API key).

## 7. Chống trùng / xử lý lỗi

- Checkpoint (thời điểm bản ghi cuối đã đồng bộ) lưu tại `sync.state_file`,
  cập nhật ngay sau mỗi batch gửi thành công - nếu 1 batch giữa chừng lỗi,
  lần chạy sau sẽ tiếp tục từ batch đó, không gửi trùng các batch trước.
- Gọi API HRM có retry tự động (backoff) khi gặp lỗi mạng/5xx.
- Xem checkpoint hiện tại: `python -m attendance_sync.cli show-state`.

## Cấu trúc thư mục

```
src/attendance_sync/   Code tool (config, đọc DB nguồn, gọi API HRM, state, CLI)
sql/                   Script SQL khảo sát DB phần mềm chấm công
config.example.yaml    Mẫu cấu hình
.env.example           Mẫu biến môi trường (mật khẩu, API key)
```
