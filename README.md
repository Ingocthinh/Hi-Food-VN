# Hi Food VN - Ứng dụng Quản lý Nhà hàng
<img width="1898" height="732" alt="image" src="https://github.com/user-attachments/assets/c27ccbd1-ab0e-40e7-b43c-2583aeb9cb02" />
<img width="1907" height="900" alt="image" src="https://github.com/user-attachments/assets/aba8e474-f228-4cc4-9311-0bcd671ed6f8" />
<img width="1904" height="815" alt="image" src="https://github.com/user-attachments/assets/772cb715-de7f-4d83-8cb4-eeff705f80d5" />
<img width="1902" height="783" alt="image" src="https://github.com/user-attachments/assets/a279ec90-8cf0-45c4-a992-1ad81c93d688" />
<img width="1903" height="763" alt="image" src="https://github.com/user-attachments/assets/2cea5245-3c2f-4e4e-9904-e350be026eb6" />
<img width="1907" height="967" alt="image" src="https://github.com/user-attachments/assets/60d09cbd-42ab-4b2b-afcb-6ab6f9e2e8c3" />
<img width="1902" height="908" alt="image" src="https://github.com/user-attachments/assets/dbd0edfa-915e-4dcf-8e46-f665ad596658" />
<img width="1919" height="968" alt="image" src="https://github.com/user-attachments/assets/83770e8e-ccf6-4ba5-ab58-677c70fa74be" />
<img width="1904" height="967" alt="image" src="https://github.com/user-attachments/assets/4de6f347-d89b-4676-b613-188be00ba230" />










## Mô tả dự án

Hi Food là một ứng dụng web toàn diện dành cho việc quản lý nhà hàng, bao gồm bán đồ ăn và đồ uống trực tuyến. Dự án cung cấp giao diện cho khách hàng, nhân viên và quản trị viên, với các tính năng như đặt hàng, quản lý sản phẩm, thanh toán qua QR code và quản lý phiên làm việc.

## Tính năng chính

- **Đặt hàng trực tuyến**: Khách hàng có thể xem menu, thêm sản phẩm vào giỏ hàng và đặt hàng.
- **Quản lý sản phẩm**: Quản trị viên có thể thêm, sửa, xóa sản phẩm với hình ảnh.
- **Thanh toán đa dạng**: Hỗ trợ thanh toán qua QR code (Momo, ZaloPay, VNPAY, Ngân hàng).
- **Quản lý nhân viên**: Giao diện dành cho nhân viên để xử lý đơn hàng.
- **Quản lý người dùng**: Đăng ký, đăng nhập và quản lý phiên làm việc.
- **API RESTful**: Cung cấp các API để tương tác với dữ liệu.

## Công nghệ sử dụng

- **Backend**: Node.js với Express.js
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
- **Dữ liệu**: JSON files (orders.json, products.json, sessions.json, users.json)
- **Ảnh sản phẩm**: Lưu trữ trong thư mục `img_sanpham/`
- **QR code thanh toán**: Lưu trữ trong thư mục `img_qr/`

## Cài đặt và chạy

### Yêu cầu hệ thống

- Node.js LTS (phiên bản 14 trở lên)
- Trình duyệt web hiện đại

### Hướng dẫn cài đặt

1. **Tải dự án**:
   ```bash
   git clone <repository-url>
   cd "Hi Food VN"
   ```

2. **Cài đặt dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Chạy server**:
   ```bash
   node server.js
   ```

4. **Truy cập ứng dụng**:
   - Mở trình duyệt và truy cập `http://localhost:3000`
   - Giao diện khách hàng: `http://localhost:3000/index.html`
   - Giao diện quản trị viên: `http://localhost:3000/admin.html`
   - Giao diện nhân viên: `http://localhost:3000/staff.html`

## Cấu trúc dự án

```
Hi Food VN/
├── README.md
├── backend/
│   ├── package.json
│   └── server.js
├── data/
│   ├── orders.json
│   ├── products.json
│   ├── sessions.json
│   └── users.json
├── img_qr/
│   └── zalo/
├── img_sanpham/
└── public/
    ├── admin.css
    ├── admin.html
    ├── admin.js
    ├── app.js
    ├── config.js
    ├── index.html
    ├── staff.html
    ├── staff.js
    └── styles.css
```

## API Endpoints

### Authentication
- `POST /api/register` - Đăng ký tài khoản mới
- `POST /api/login` - Đăng nhập
- `POST /api/logout` - Đăng xuất
- `GET /api/me` - Lấy thông tin người dùng hiện tại

### Products
- `GET /api/products` - Lấy danh sách sản phẩm

### Orders
- `POST /api/calc-total` - Tính tổng tiền đơn hàng

### QR Codes
- `GET /api/qr-list` - Lấy danh sách QR code thanh toán

## Thư mục ảnh

- **Ảnh sản phẩm**: Đặt trong `img_sanpham/`, truy cập qua `/products/...`
- **Ảnh QR thanh toán**: Đặt trong `img_qr/`, truy cập qua `/qr/...`

## Đóng góp

Nếu bạn muốn đóng góp cho dự án, vui lòng tạo issue hoặc pull request trên repository.

## Liên hệ

Để biết thêm thông tin, vui lòng liên hệ với đội ngũ phát triển Email:ic.lengocthinh@gmail.com

---

*Hi Food - Nâng tầm trải nghiệm ẩm thực của bạn!*


