# Quản lý lời hồi âm và lời nhắn

Các lời hồi âm được lưu trong `data/rsvps.json` trên máy đang chạy máy chủ.

## Mở trang quản trị

1. Nếu chưa có file `.env`, mở PowerShell tại thư mục dự án và chạy:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Mở `.env`, đặt mật khẩu bạn muốn dùng ở dòng `ADMIN_PASSWORD=...`, rồi lưu.
3. Khởi động máy chủ:

   ```powershell
   npm.cmd start
   ```

4. Mở địa chỉ máy chủ đã in trong terminal và thêm `/admin`, ví dụ `http://localhost:3000/admin`.
5. Đăng nhập bằng mật khẩu trong `.env`.

Trang quản trị có biểu đồ số lời hồi âm, số khách xác nhận đi, tổng số khách dự kiến, cùng lời nhắn của khách. Nút **Xóa** sẽ gỡ phản hồi khỏi `data/rsvps.json` sau khi bạn xác nhận.

Trong thư mời, khách có thể để lại lời nhắn không bắt buộc. Các phản hồi cũ trong `data/rsvps.json` vẫn được giữ nguyên; những phản hồi đó sẽ hiển thị dòng “Không để lại lời nhắn”.

Không chia sẻ file `.env` vì file này chứa mật khẩu quản trị. `.env` đã được thêm vào `.gitignore`.
