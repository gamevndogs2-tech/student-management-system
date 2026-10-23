
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const db = require('./config/database');

// Import Routes
const classRoutes = require('./routes/classRoutes');
const studentRoutes = require('./routes/studentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const gradeRoutes = require('./routes/gradeRoutes');

// Import Prometheus Metrics
const {
  metricsMiddleware,
  metricsHandler
} = require('./middleware/metrics');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json());

// Prometheus: Theo dõi HTTP requests
app.use(metricsMiddleware);

// Prometheus: Endpoint thu thập metrics
app.get('/metrics', metricsHandler);

// API quản lý lớp học
app.use('/api/classes', classRoutes);

// API quản lý sinh viên
app.use('/api/students', studentRoutes);

// API quản lý môn học
app.use('/api/subjects', subjectRoutes);

// API quản lý điểm số
app.use('/api/grades', gradeRoutes);

// API kiểm tra Backend
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    application: 'Student Management System',
    timestamp: new Date().toISOString()
  });
});

// API kiểm tra kết nối MySQL
app.get('/api/health/db', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT 1 AS connected'
    );

    res.status(200).json({
      status: 'ok',
      database: 'connected',
      result: rows[0]
    });
  } catch (error) {
    console.error(
      'Database connection failed:',
      error.message
    );

    res.status(503).json({
      status: 'error',
      database: 'disconnected'
    });
  }
});

// Xử lý đường dẫn không tồn tại
app.use((req, res) => {
  res.status(404).json({
    message: 'Không tìm thấy đường dẫn'
  });
});

// Khởi động Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Student Management API running on port ${PORT}`
  );
});
