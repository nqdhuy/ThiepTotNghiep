# Đưa thiệp lên mạng bằng Railway

Hướng dẫn này tạo link công khai dạng `https://ten-app.up.railway.app`. App gồm trang thiệp, API RSVP và trang quản trị `/admin`.

## Trước khi bắt đầu

- Tạo tài khoản GitHub và Railway.
- Tạo một repository **Private** trên GitHub để giữ mã nguồn riêng tư.
- Không tải `.env` hoặc `data/rsvps.json` lên GitHub. Hai file này đã được thêm vào `.gitignore`; `.env.example` chỉ chứa giá trị mẫu.

## 1. Đưa mã nguồn lên GitHub

Mở PowerShell tại thư mục dự án, chạy lần lượt:

```powershell
git init
git add .
git status
```

Trong danh sách của `git status`, xác nhận **không có** `.env` và `data/rsvps.json`. Sau đó tạo commit và nối repository GitHub (thay URL bằng URL repository của bạn):

```powershell
git commit -m "Prepare graduation invitation"
git branch -M main
git remote add origin https://github.com/TEN-TK-GITHUB/TEN-REPOSITORY.git
git push -u origin main
```

Nếu Git yêu cầu thông tin người tạo commit, dùng tên và email GitHub của bạn:

```powershell
git config user.name "Tên của bạn"
git config user.email "email-github-cua-ban@example.com"
```

## 2. Tạo dịch vụ Railway

1. Vào [Railway](https://railway.com/new), đăng nhập bằng GitHub và chọn **Deploy from GitHub repo**.
2. Chọn repository vừa tải lên. Railway sẽ nhận diện đây là ứng dụng Node.js.
3. Trong trang dịch vụ, mở **Settings** và đặt **Start Command** thành:

   ```text
   npm run start:production
   ```

   Lệnh này chạy server mà không cần file `.env`; các giá trị bí mật sẽ được nhập trực tiếp trên Railway.

## 3. Thêm nơi lưu RSVP bền vững

1. Trong project Railway, thêm một **Volume** và gắn vào đúng dịch vụ web.
2. Đặt **Mount Path** là:

   ```text
   /app/data
   ```

   Server ghi vào thư mục `data` của project, vì vậy mount path này giúp `data/rsvps.json` tồn tại sau khi app restart hoặc deploy lại.

## 4. Thêm biến môi trường

Trong tab **Variables** của dịch vụ, thêm:

```text
NODE_ENV=production
ADMIN_PASSWORD=mật-khẩu-admin-riêng-và-dài
```

Đặt mật khẩu riêng, không dùng lại mật khẩu GitHub. Không chia sẻ mật khẩu này cho khách mời. `ADMIN_SESSION_SECRET` được app tự tạo nếu chưa đặt; có thể thêm một chuỗi ngẫu nhiên dài để giữ cố định khóa phiên đăng nhập giữa các lần restart.

Sau khi thêm biến, Railway sẽ deploy lại dịch vụ.

## 5. Tạo link công khai

1. Mở **Settings → Networking** của dịch vụ.
2. Chọn **Generate Domain**.
3. Mở domain Railway tạo ra để xem thiệp. Trang quản trị ở cùng domain, thêm `/admin` ở cuối.

Ví dụ:

- Thiệp: `https://ten-app.up.railway.app/`
- Admin: `https://ten-app.up.railway.app/admin`

## 6. Kiểm tra hoạt động

1. Mở link thiệp bằng điện thoại và gửi một RSVP thử.
2. Mở `/admin`, đăng nhập bằng `ADMIN_PASSWORD` để xem RSVP.
3. Sau này, khi push commit mới lên nhánh `main`, Railway có thể tự deploy lại repository đã kết nối.

## Lưu ý về dữ liệu cũ và chi phí

- Các RSVP hiện có trên máy của bạn nằm trong `data/rsvps.json` cục bộ và sẽ không tự chuyển lên Railway. Repository không đưa file này lên để bảo vệ email/lời nhắn. Hãy giữ bản sao lưu file cục bộ.
- Railway có mức dùng thử/chi phí theo gói và tài nguyên; volume lưu trữ cũng được tính theo gói. Xem [bảng giá Railway](https://railway.com/pricing) trước khi deploy để biết mức phí hiện hành.
- Railway Volume giữ file qua restart/deploy. Nếu sau này cần nhiều instance chạy đồng thời, nên chuyển RSVP sang database thay vì file JSON.
