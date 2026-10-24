# Student Management System

Hệ thống quản lý sinh viên được xây dựng và triển khai bằng Docker Compose, phục vụ học phần **Triển khai và Quản trị Hệ thống Phần mềm**.

**Đề tài 02:** Xây dựng và triển khai hệ thống quản lý sinh viên bằng Docker Compose.

**Sinh viên thực hiện:** Mã Hoàng Lai

## 1. Giới thiệu

Dự án cung cấp ứng dụng web quản lý sinh viên với các chức năng đăng nhập, phân quyền, quản lý sinh viên, lớp học, môn học, điểm số và tài khoản.

Hệ thống sử dụng Node.js, Express và MySQL, kết hợp Nginx Reverse Proxy, Prometheus, Grafana, Loki và Grafana Alloy để triển khai, giám sát và quản lý nhật ký.

## 2. Cấu trúc dự án

```text
student-management-system/
├── backend/
├── frontend/
├── database/
├── nginx/
├── monitoring/
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 3. Các dịch vụ Docker

| Dịch vụ | Chức năng | Cổng localhost |
|---|---|---|
| nginx | Frontend và Reverse Proxy | 8080 |
| backend | Node.js / Express API | 3000 |
| mysql | Cơ sở dữ liệu MySQL 8.4 | Không công khai |
| phpmyadmin | Quản trị MySQL | 8081 |
| prometheus | Thu thập metrics | 9090 |
| grafana | Dashboard giám sát | 3001 |
| loki | Lưu trữ và truy vấn logs | 3100 |
| alloy | Thu thập logs từ Docker | Không công khai |

## 4. Yêu cầu

- Git
- Docker Desktop hoặc Docker Engine
- Docker Compose V2

## 5. Hướng dẫn triển khai

### Bước 1: Clone repository

```bash
git clone https://github.com/gamevndogs2-tech/student-management-system.git
cd student-management-system
```

### Bước 2: Tạo tệp .env

Tạo tệp `.env` trong thư mục gốc và thiết lập các biến môi trường:

```dotenv
MYSQL_ROOT_PASSWORD=replace_with_strong_root_password
MYSQL_DATABASE=student_management
MYSQL_USER=student_app
MYSQL_PASSWORD=replace_with_strong_database_password
SESSION_SECRET=replace_with_long_random_secret
SESSION_COOKIE_SECURE=false
GRAFANA_ADMIN_PASSWORD=replace_with_strong_grafana_password
```

Các giá trị trên là ví dụ cấu hình. Cần thay mật khẩu và `SESSION_SECRET` bằng giá trị riêng, đủ mạnh.

`SESSION_COOKIE_SECURE=false` chỉ dành cho môi trường thử nghiệm HTTP trên localhost.

**Không commit tệp `.env` chứa thông tin bí mật lên GitHub.**

### Bước 3: Khởi động hệ thống

```bash
docker compose up -d --build
```

### Bước 4: Kiểm tra container

```bash
docker compose ps -a
```

Kiểm tra nhật ký:

```bash
docker compose logs --tail=100
```

## 6. Truy cập hệ thống

| Thành phần | Địa chỉ |
|---|---|
| Ứng dụng web | http://localhost:8080 |
| Backend trực tiếp | http://localhost:3000 |
| phpMyAdmin | http://localhost:8081 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |
| Loki | http://localhost:3100 |

Các cổng được cấu hình chỉ lắng nghe trên `127.0.0.1`, phù hợp với môi trường demo cục bộ.

## 7. Kiểm tra hoạt động

Kiểm tra Backend thông qua Nginx:

```bash
curl -i http://localhost:8080/api/health
```

Kiểm tra kết nối MySQL:

```bash
curl -i http://localhost:8080/api/health/db
```

Kiểm tra trạng thái các dịch vụ bằng:

```bash
docker compose ps
```

## 8. Monitoring và Logging

**Prometheus** thu thập metrics phục vụ giám sát.

**Grafana** hiển thị dashboard và hỗ trợ truy vấn dữ liệu giám sát.

**Loki** lưu trữ nhật ký tập trung.

**Grafana Alloy** thu thập nhật ký Docker và chuyển đến Loki.

Ví dụ truy vấn LogQL trong Grafana Explore:

```logql
{container=~".+"}
```

```logql
{container=~".+"} |= "error"
```

```logql
sum(count_over_time({container=~".+"}[5m])) by (container)
```

Các truy vấn sử dụng nhãn `container` và có thể điều chỉnh theo dữ liệu thực tế.

## 9. Mạng và lưu trữ

Dự án sử dụng ba Docker Network:

- `frontend_network`: kết nối Nginx, Backend và Prometheus.
- `database_network`: kết nối MySQL, Backend và phpMyAdmin; được cấu hình `internal: true`.
- `monitoring_network`: kết nối các dịch vụ giám sát và logging.

Các Docker Volume gồm:

- `mysql_data`
- `prometheus_data`
- `grafana_data`
- `loki_data`
- `alloy_data`

Các volume giúp duy trì dữ liệu khi container được tạo lại.

## 10. Các biện pháp bảo mật

- Phân tách mạng giữa các nhóm dịch vụ.
- Không công khai cổng MySQL ra máy chủ.
- Giới hạn các cổng truy cập trên localhost.
- Sử dụng biến môi trường để cấu hình mật khẩu và session.
- Backend thực hiện xác thực và phân quyền người dùng.
- Sử dụng HTTP Security Headers và mã hóa một chiều mật khẩu ở tầng ứng dụng.

Hệ thống được thiết kế cho môi trường học tập và demo cục bộ, chưa phải cấu hình triển khai Internet công khai hoàn chỉnh.

## 11. Lệnh quản trị

Dừng container:

```bash
docker compose stop
```

Khởi động lại:

```bash
docker compose start
```

Xây dựng lại và chạy:

```bash
docker compose up -d --build
```

Tắt và gỡ container:

```bash
docker compose down
```

Không sử dụng `docker compose down -v` nếu muốn giữ lại dữ liệu trong các Docker Volume.

## 12. Thông tin

**Repository:** https://github.com/gamevndogs2-tech/student-management-system

**Học phần:** Triển khai và Quản trị Hệ thống Phần mềm

**Mục đích:** Học tập, thực hành triển khai và quản trị hệ thống bằng Docker Compose.
