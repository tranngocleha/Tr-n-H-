# Nền tảng Quản lý & Tìm kiếm Ứng viên (Tuyển dụng CV)

Công cụ nội bộ giúp đội ngũ tuyển dụng thu thập, tìm kiếm và quản lý hồ sơ ứng viên thuộc mọi ngành nghề, kèm gợi ý ứng viên phù hợp bằng AI.

## Về nguồn dữ liệu CV — lưu ý quan trọng

Nền tảng **không crawl/thu thập hàng loạt** CV từ các trang khác (LinkedIn, Facebook, TopCV, VietnamWorks...). Việc này vi phạm điều khoản dịch vụ của các nền tảng đó và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (thu thập, xử lý dữ liệu cá nhân của người khác cần có sự đồng ý).

Thay vào đó, hệ thống hỗ trợ 3 cách đưa CV vào hệ thống một cách hợp lệ:

1. **Upload CV** (PDF/DOCX/TXT) — ứng viên hoặc HR tải file lên, hệ thống tự trích xuất thông tin bằng AI.
2. **Import theo từng link cụ thể** — khi HR đã biết một link công khai cụ thể của một ứng viên (ví dụ trang cá nhân họ chia sẻ), có thể dán link để import. Đây là thao tác lấy **một trang đơn lẻ, theo yêu cầu thủ công của con người**, có kiểm tra `robots.txt`, khác về bản chất với crawler tự động quét hàng loạt nhiều trang/nhiều ứng viên.
3. **Nhập thủ công** — HR gõ tay thông tin ứng viên đã có sẵn.

## Tính năng

- **Xác thực nội bộ**: đăng nhập bằng tài khoản HR (NextAuth, credentials).
- **Trích xuất CV bằng AI**: tự động nhận diện họ tên, email, điện thoại, kỹ năng, số năm kinh nghiệm, tóm tắt từ nội dung CV (dùng Claude API nếu có `ANTHROPIC_API_KEY`; nếu không, dùng bộ trích xuất theo từ khóa/regex dự phòng).
- **Tìm kiếm & lọc ứng viên**: theo từ khóa, ngành nghề, số năm kinh nghiệm.
- **Quản lý tin tuyển dụng (ATS cơ bản)**: đăng tin, pipeline theo từng vòng (Mới tìm thấy → Sàng lọc → Phỏng vấn → Đề nghị offer → Đã tuyển / Từ chối).
- **Gợi ý ứng viên phù hợp bằng AI**: so khớp mô tả công việc với toàn bộ hồ sơ, chấm điểm 0–100 kèm lý do (dùng AI nếu có API key; nếu không, chấm theo mức trùng khớp kỹ năng).
- **Ghi chú ứng viên**: lưu lại nhận xét trong quá trình phỏng vấn/đánh giá.

## Công nghệ

- Next.js 16 (App Router, TypeScript) + Tailwind CSS
- PostgreSQL + Prisma ORM
- NextAuth (credentials provider)
- Anthropic Claude API (tùy chọn, cho parse CV & matching)
- `pdf-parse`, `mammoth` (trích xuất text từ PDF/DOCX), `cheerio` (parse HTML khi import theo link)

## Cài đặt & chạy thử (development)

### 1. Yêu cầu

- Node.js 20.9+ (khuyến nghị 22+)
- PostgreSQL đang chạy (local hoặc Docker)

### 2. Cài dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

```bash
cp .env.example .env
```

Cập nhật `.env`:

- `DATABASE_URL`: chuỗi kết nối PostgreSQL.
- `NEXTAUTH_SECRET`: chuỗi ngẫu nhiên bí mật (dùng `openssl rand -base64 32` để tạo).
- `ANTHROPIC_API_KEY`: (tuỳ chọn) bật AI parse CV & AI matching. Nếu để trống, hệ thống vẫn hoạt động với chế độ trích xuất/chấm điểm theo từ khóa.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: tài khoản HR quản trị đầu tiên.

### 4. Khởi tạo database

```bash
npx prisma migrate dev
npm run db:seed
```

### 5. Chạy dev server

```bash
npm run dev
```

Truy cập http://localhost:3000, đăng nhập bằng tài khoản seed ở bước 3.

### Các script khác

- `npm run build` / `npm run start`: build & chạy bản production.
- `npm run typecheck`: kiểm tra kiểu TypeScript.
- `npm run prisma:migrate`: tạo/áp dụng migration mới sau khi sửa `prisma/schema.prisma`.

## Cấu trúc thư mục chính

```
prisma/schema.prisma        Mô hình dữ liệu (User, Candidate, Job, Application, Note)
src/lib/ai.ts                Gọi Claude API để parse CV & chấm điểm matching (có fallback)
src/lib/resume-extract.ts    Trích xuất text từ PDF/DOCX/TXT
src/lib/fetch-url.ts         Import một trang CV công khai theo link cụ thể (tôn trọng robots.txt)
src/app/(dashboard)/...      Giao diện: Tổng quan, Ứng viên, Tin tuyển dụng
src/app/api/...              API routes cho candidates, jobs, applications, notes
```

## Giới hạn đã biết (MVP)

- Chưa có phân quyền nhiều vai trò chi tiết (mới có ADMIN/RECRUITER ở mức dữ liệu).
- File CV lưu trên đĩa cục bộ (`UPLOAD_DIR`); triển khai production nên đổi sang lưu trữ object storage (S3-compatible).
- Import theo link chỉ lấy được nội dung dạng HTML tĩnh; các trang yêu cầu đăng nhập hoặc render bằng JavaScript phía client sẽ không trích xuất được — trong trường hợp đó, hãy dùng cách upload file.
