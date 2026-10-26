# Hướng dẫn deploy thiệp lên Render

Render sẽ chạy cả trang thiệp, backend RSVP và trang admin. Sau khi deploy, bạn sẽ nhận được link dạng `https://ten-app.onrender.com`.

## Chuẩn bị

- Tạo tài khoản [GitHub](https://github.com/) và [Render](https://render.com/).
- Tạo một repository **Private** trên GitHub.
- Không tải `.env` hoặc `data/rsvps.json` lên GitHub. Hai file này đã nằm trong `.gitignore`; file RSVP có thể chứa email và lời nhắn riêng của khách.

## 1. Đẩy mã nguồn lên GitHub

Mở PowerShell tại thư mục dự án và chạy:

```powershell
git init
git add .
git status
```

Kiểm tra danh sách: bảo đảm **không có** `.env` và `data/rsvps.json`. Sau đó commit và kết nối repository (thay URL mẫu bằng URL repo của bạn):

```powershell
git commit -m "Prepare graduation invitation"
git branch -M main
git remote add origin https://github.com/TEN-TK-GITHUB/TEN-REPOSITORY.git
git push -u origin main
```

Nếu Git chưa biết tên/email người tạo commit, đặt thông tin của bạn trước rồi chạy lại lệnh commit:

```powershell
git config user.name "Tên của bạn"
git config user.email "email-github-cua-ban@example.com"
```

## 2. Tạo Web Service trên Render

1. Mở Render Dashboard, chọn **New → Web Service**.
2. Kết nối GitHub nếu được yêu cầu, chọn repository vừa tải lên.
3. Điền cấu hình:

   | Mục | Giá trị |
   | --- | --- |
   | Language | `Node` |
   | Branch | `main` |
   | Build Command | `npm install` |
   | Start Command | `npm run start:production` |

4. Chọn gói chạy. Để giữ file RSVP bằng JSON qua các lần restart/deploy, cần chọn gói có hỗ trợ Persistent Disk.
5. Chưa cần bấm deploy cho đến khi hoàn tất biến môi trường và ổ đĩa ở các bước dưới.

## 3. Tạo ổ lưu RSVP bền vững

Trong cấu hình dịch vụ, thêm **Persistent Disk** với:

```text
Mount Path: /opt/render/project/src/data
```

Server ghi RSVP vào thư mục `data`, nên mount path này sẽ giữ `rsvps.json` qua các lần khởi động và deploy. Render mặc định dùng ổ đĩa tạm; nếu không gắn Persistent Disk thì dữ liệu file có thể mất.

## 4. Cài biến môi trường

Trong mục **Environment**, thêm:

```text
NODE_ENV=production
ADMIN_PASSWORD=đặt-mật-khẩu-admin-riêng-và-dài
ADMIN_SESSION_SECRET=chuỗi-ngẫu-nhiên-dài-và-bí-mật
```

Đặt mật khẩu khác với mật khẩu GitHub. Không gửi các giá trị này cho khách mời và không ghi chúng vào repository. Nếu chưa đặt `ADMIN_SESSION_SECRET`, ứng dụng tự sinh khóa khi khởi động; việc đặt biến cố định giúp giữ ổn định phiên admin sau khi service restart.

Lưu cấu hình để Render bắt đầu deploy.

## 5. Lấy link và mở trang admin

Khi trạng thái deploy là **Live**, Render cấp cho dịch vụ một domain `onrender.com`.

- Thiệp: `https://ten-app.onrender.com/`
- Admin: `https://ten-app.onrender.com/admin`
- Kiểm tra server: `https://ten-app.onrender.com/api/health`

Đăng nhập admin bằng `ADMIN_PASSWORD` đã đặt ở bước 4. Không chia sẻ mật khẩu với khách mời.

## 6. Kiểm tra RSVP

1. Mở link thiệp bằng điện thoại.
2. Gửi một RSVP thử.
3. Mở `/admin` và xác nhận phản hồi xuất hiện.
4. Thử mở lại link `/api/health`; kết quả mong đợi là `{"status":"ok"}`.

Sau này, khi bạn push commit mới lên nhánh `main`, Render có thể tự deploy phiên bản mới từ repository đã kết nối.

## Lưu ý về chi phí và dữ liệu

- Render Free không hỗ trợ Persistent Disk cho Web Service. Web Service miễn phí cũng có thể tạm dừng khi không có truy cập; lần mở tiếp theo có thể phải chờ khởi động. Xem [gói Render](https://render.com/pricing) và [giới hạn Free](https://render.com/docs/free) trước khi chọn.
- Persistent Disk là phần trả phí và chỉ dữ liệu nằm dưới mount path mới được giữ lại. Xem [tài liệu Persistent Disk](https://render.com/docs/disks).
- Các RSVP đã lưu trên máy của bạn **không tự chuyển** lên Render. Hãy giữ bản sao `data/rsvps.json` ở máy cá nhân; file này được loại khỏi Git để bảo vệ thông tin khách.
