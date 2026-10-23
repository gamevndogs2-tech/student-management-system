
CREATE DATABASE IF NOT EXISTS student_management
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE student_management;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_code VARCHAR(20) NOT NULL UNIQUE,
    class_name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_code VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender ENUM('Nam', 'Nữ', 'Khác'),
    email VARCHAR(150) UNIQUE,
    class_id INT,
    FOREIGN KEY (class_id) REFERENCES classes(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(20) NOT NULL UNIQUE,
    subject_name VARCHAR(150) NOT NULL,
    credits INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    process_score DECIMAL(4,2),
    exam_score DECIMAL(4,2),
    UNIQUE KEY unique_student_subject (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES students(id)
        ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
        ON DELETE CASCADE,
    CHECK (process_score BETWEEN 0 AND 10),
    CHECK (exam_score BETWEEN 0 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO classes
(id, class_code, class_name, academic_year)
VALUES
(1, 'CNTT-K21A', 'Công nghệ thông tin K21A', '2024-2028'),
(2, 'CNTT-K21B', 'Công nghệ thông tin K21B', '2024-2028');

INSERT IGNORE INTO students
(id, student_code, full_name, date_of_birth, gender, email, class_id)
VALUES
(1, 'SV001', 'Nguyễn Văn An', '2005-03-12', 'Nam', 'an@example.com', 1),
(2, 'SV002', 'Trần Thị Bình', '2005-07-20', 'Nữ', 'binh@example.com', 1),
(3, 'SV003', 'Lê Minh Đức', '2005-11-08', 'Nam', 'duc@example.com', 2);

INSERT IGNORE INTO subjects
(id, subject_code, subject_name, credits)
VALUES
(1, 'CSDL', 'Cơ sở dữ liệu', 3),
(2, 'WEB', 'Lập trình Web', 3),
(3, 'MMT', 'Mạng máy tính', 3);

INSERT IGNORE INTO grades
(id, student_id, subject_id, process_score, exam_score)
VALUES
(1, 1, 1, 8.0, 8.5),
(2, 2, 1, 7.5, 9.0),
(3, 3, 2, 8.0, 7.5);
