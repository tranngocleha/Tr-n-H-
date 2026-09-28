-- =====================================================================
-- Script khảo sát cấu trúc DB của phần mềm chấm công (chạy TRƯỚC khi
-- cấu hình tool đồng bộ, để xác nhận đúng tên bảng/cột thực tế).
--
-- Viết cho SQL Server. Nếu phần mềm dùng MS Access (.mdb/.accdb), mở
-- file bằng MS Access hoặc DB Browser for SQLite/Access tương đương và
-- xem các bảng có tên gần giống (thường cũng theo quy ước CHECKINOUT/
-- USERINFO vì phần lớn phần mềm chấm công vân tay ở VN dùng chung gốc
-- schema của ZKTeco).
-- =====================================================================

-- 1) Liệt kê toàn bộ bảng trong DB để tìm bảng log chấm công
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- 2) Xem cấu trúc cột của bảng log chấm công (đổi tên bảng nếu khác)
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'CHECKINOUT'
ORDER BY ORDINAL_POSITION;

-- 3) Xem thử 20 bản ghi mới nhất để hiểu định dạng dữ liệu thực tế
--    (mã nhân viên, định dạng giờ, mã loại chấm công vào/ra...)
SELECT TOP 20 *
FROM CHECKINOUT
ORDER BY CHECKTIME DESC;

-- 4) Bảng danh sách nhân viên khai báo trên máy chấm công - đối chiếu
--    xem mã nhân viên ở đây có khớp mã nhân viên bên HRM không. Đây là
--    điểm hay gây lỗi/sai lệch nhất khi đồng bộ 2 hệ thống độc lập.
SELECT TOP 20 *
FROM USERINFO;

-- 5) Đếm số lượt chấm công theo ngày trong 7 ngày gần nhất, để ước
--    lượng khối lượng dữ liệu mỗi lần tool cần đồng bộ
SELECT CAST(CHECKTIME AS DATE) AS ngay, COUNT(*) AS so_luot_cham_cong
FROM CHECKINOUT
WHERE CHECKTIME >= DATEADD(DAY, -7, GETDATE())
GROUP BY CAST(CHECKTIME AS DATE)
ORDER BY ngay DESC;
